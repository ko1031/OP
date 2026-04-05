#!/usr/bin/env python3
"""
cardrush.media から最新の大会優勝デッキリストと
デッキ分布統計を取得して tournament_stats.json に書き出す。

GitHub Actions で毎週月曜日に自動実行される。
手動実行: python deck-builder/scripts/fetch_tournament_data.py
"""

import json
import re
import sys
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import requests

# ──────────────────────────────────────────────
# 設定
# ──────────────────────────────────────────────
BASE_URL    = "https://cardrush.media"
LIST_URL    = f"{BASE_URL}/onepiece/decks/list"
OUTPUT_FILE = "deck-builder/public/tournament_stats.json"

# 取得対象：過去何日分を「直近」とするか
RECENT_DAYS = 14   # 2週間

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ja,en-US;q=0.9",
}

# 集計対象スコア（優勝・準優勝のみ）
TARGET_SCORES = {"優勝", "準優勝"}

JST = timezone(timedelta(hours=9))


# ──────────────────────────────────────────────
# ユーティリティ
# ──────────────────────────────────────────────
def fetch_next_data(url: str) -> dict:
    """ページの __NEXT_DATA__ JSON を取得して返す。"""
    print(f"Fetching: {url}", flush=True)
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()

    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        resp.text,
        re.DOTALL,
    )
    if not m:
        raise ValueError(f"__NEXT_DATA__ not found in {url}")
    return json.loads(m.group(1))


def parse_date(date_str: str) -> datetime | None:
    """'2026-04-02' or '2026/4/2' を datetime に変換。"""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(date_str, fmt).replace(tzinfo=JST)
        except ValueError:
            continue
    return None


# ──────────────────────────────────────────────
# メイン処理
# ──────────────────────────────────────────────
def fetch_decks() -> list[dict]:
    """
    cardrush.media/onepiece/decks/list から
    過去 RECENT_DAYS 日以内の優勝・準優勝デッキをすべて取得する。

    正しいエンドポイント: /onepiece/decks/list?is_winning=true&created_at[min]=YYYY-MM-DD
    - 1ページあたり最大30件
    - lastPage で総ページ数がわかる
    """
    cutoff = datetime.now(tz=JST) - timedelta(days=RECENT_DAYS)
    cutoff_str = cutoff.strftime("%Y-%m-%d")

    all_decks: list[dict] = []
    page = 1
    last_page = 1  # 初回フェッチで更新される

    while page <= last_page:
        # URL構築: created_at[min] で日付フィルタ、is_winning=true で入賞デッキのみ
        params = {
            "is_winning": "true",
            "created_at[min]": cutoff_str,
            "page": str(page),
        }
        url = LIST_URL + "?" + urlencode(params)

        try:
            data = fetch_next_data(url)
        except Exception as e:
            print(f"  Warning: failed to fetch page {page}: {e}", flush=True)
            break

        page_props = data.get("props", {}).get("pageProps", {})

        # 初回で総ページ数を取得
        if page == 1:
            last_page = page_props.get("lastPage", 1)
            print(f"  総ページ数: {last_page}", flush=True)

        decks = page_props.get("decks", [])
        if not decks:
            print(f"  page {page}: デッキなし → 終了", flush=True)
            break

        print(f"  page {page}/{last_page}: {len(decks)}件", flush=True)

        for deck in decks:
            score = deck.get("score", "")
            # 優勝・準優勝のみ集計
            if score not in TARGET_SCORES:
                continue

            raw_date = deck.get("tournament_date") or deck.get("created_on", "")
            dt = parse_date(raw_date)
            if dt is None:
                continue

            archetype = deck.get("archetype") or {}
            entry = {
                "id":            deck.get("id"),
                "leaderName":    archetype.get("name", "不明"),
                "archetypeId":   archetype.get("id"),
                "archetypeImg":  archetype.get("image_source", ""),
                "date":          dt.strftime("%Y/%m/%d"),
                "rawDate":       dt.strftime("%Y-%m-%d"),
                "eventName":     deck.get("tournament_name", ""),
                "result":        score,
                "deckUrl":       f"{BASE_URL}/onepiece/decks/{deck.get('id')}",
            }
            all_decks.append(entry)

        page += 1
        time.sleep(0.4)   # サーバー負荷軽減

    return all_decks


def compute_stats(decks: list[dict]) -> list[dict]:
    """
    優勝・準優勝デッキリストから集計データを生成する。
    - リーダー別 wins / runner_up カウント
    - 直近 7 日 / 14 日の内訳
    """
    cutoff_7 = datetime.now(tz=JST) - timedelta(days=7)

    wins_14:   defaultdict[str, int] = defaultdict(int)
    wins_7:    defaultdict[str, int] = defaultdict(int)
    runner_14: defaultdict[str, int] = defaultdict(int)
    img_map:   dict[str, str]        = {}

    for d in decks:
        leader = d["leaderName"]
        is_win = d["result"] == "優勝"
        dt     = parse_date(d["rawDate"])

        # アーキタイプ画像を保持
        if d.get("archetypeImg") and leader not in img_map:
            img_map[leader] = d["archetypeImg"]

        if is_win:
            wins_14[leader] += 1
            if dt and dt >= cutoff_7:
                wins_7[leader] += 1
        else:
            runner_14[leader] += 1

    # 合計入賞数で降順ソート
    all_leaders = sorted(
        set(list(wins_14.keys()) + list(runner_14.keys())),
        key=lambda l: (wins_14[l] + runner_14[l]),
        reverse=True,
    )

    distribution = [
        {
            "leaderName":  leader,
            "archetypeImg": img_map.get(leader, ""),
            "wins14":      wins_14[leader],
            "wins7":       wins_7[leader],
            "runnerUp14":  runner_14[leader],
            "total14":     wins_14[leader] + runner_14[leader],
        }
        for leader in all_leaders
        if wins_14[leader] + runner_14[leader] > 0
    ]

    return distribution


def main() -> None:
    print("=== cardrush.media 大会データ取得 ===", flush=True)
    print(f"  対象期間: 過去{RECENT_DAYS}日間", flush=True)

    # デッキ一覧取得
    decks = fetch_decks()
    print(f"  取得デッキ数 (優勝+準優勝): {len(decks)}", flush=True)

    if not decks:
        print("  取得失敗 or データなし。既存 JSON を保持します。", flush=True)
        sys.exit(0)

    # 集計
    distribution = compute_stats(decks)
    print(f"  リーダー種類: {len(distribution)}", flush=True)

    # 出力 JSON 構築
    output = {
        "lastUpdated":   datetime.now(tz=JST).strftime("%Y-%m-%dT%H:%M:%S+09:00"),
        "fetchedDays":   RECENT_DAYS,
        "recentWinners": decks,           # 直近 RECENT_DAYS 日の優勝/準優勝一覧
        "distribution":  distribution,   # リーダー別集計
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"  -> {OUTPUT_FILE} に書き出し完了", flush=True)

    # サマリ表示
    print(f"\n【直近{RECENT_DAYS}日間 デッキ分布 TOP10】")
    for d in distribution[:10]:
        bar = "█" * d["wins14"] + "░" * d["runnerUp14"]
        print(f"  {d['leaderName']:<16} 優勝{d['wins14']} 準{d['runnerUp14']} {bar}")


if __name__ == "__main__":
    main()
