#!/usr/bin/env python3
"""
複数ソースから最新の大会優勝デッキリストとデッキ分布統計を取得して
tournament_stats.json に書き出す。

ソース:
  1. cardrush.media  … JP 大会メタデータ（優勝/準優勝リスト・分布）
  2. gumgum.gg       … 海外大会デッキリスト（East=JP フォーマット優先）
  3. limitless       … 海外大会デッキリスト（補完）

GitHub Actions で毎日自動実行。
手動実行: python deck-builder/scripts/fetch_tournament_data.py
"""

import json
import os
import re
import sys
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

import requests

# ──────────────────────────────────────────────
# 設定
# ──────────────────────────────────────────────
CARDRUSH_BASE  = "https://cardrush.media"
CARDRUSH_LIST  = f"{CARDRUSH_BASE}/onepiece/decks/list"
GUMGUM_BASE    = "https://gumgum.gg"
LIMITLESS_BASE = "https://onepiece.limitlesstcg.com"

# このスクリプトがどこから実行されても正しく出力先を解決する
# deploy.yml / update-meta.yml はリポジトリルートから実行
_SCRIPT_DIR   = Path(__file__).parent          # .../deck-builder/scripts/
_REPO_ROOT    = _SCRIPT_DIR.parent.parent       # リポジトリルート
OUTPUT_FILE   = str(_REPO_ROOT / "deck-builder" / "public" / "tournament_stats.json")

# 取得対象：過去何日分
RECENT_DAYS = 14

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

TARGET_SCORES = {"優勝", "準優勝"}
JST = timezone(timedelta(hours=9))


# ──────────────────────────────────────────────
# ユーティリティ
# ──────────────────────────────────────────────
def fetch_html(url: str, retries: int = 2) -> str:
    for attempt in range(retries + 1):
        try:
            print(f"  GET {url}", flush=True)
            resp = requests.get(url, headers=HEADERS, timeout=25)
            resp.raise_for_status()
            return resp.text
        except Exception as e:
            if attempt == retries:
                print(f"  [WARN] fetch failed: {e}", flush=True)
                return ""
            time.sleep(1.5)
    return ""


def fetch_next_data(url: str) -> dict:
    """ページの __NEXT_DATA__ JSON を取得して返す。"""
    html = fetch_html(url)
    if not html:
        return {}
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        html, re.DOTALL,
    )
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except Exception:
        return {}


def parse_date(raw: str) -> datetime | None:
    for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=JST)
        except ValueError:
            pass
    return None


def is_recent(raw_date: str, days: int = RECENT_DAYS) -> bool:
    dt = parse_date(raw_date)
    if not dt:
        return False
    return dt >= datetime.now(tz=JST) - timedelta(days=days)


def parse_deck_string(deck_str: str) -> list[dict]:
    """
    "4xOP15-053;4xOP15-040;1xOP15-002" 形式を
    [{"cardNumber":"OP15-053","count":4}, ...] に変換。
    リーダーカード（最初の1枚）を含む。
    """
    cards = []
    for part in deck_str.split(";"):
        part = part.strip()
        if not part:
            continue
        # 末尾のバリアント (_p1, _r1 等) を除去
        clean = re.sub(r"_(p|r)\d+$", "", part)
        m = re.match(r"(\d+)x(.+)", clean)
        if m:
            cards.append({"cardNumber": m.group(2), "count": int(m.group(1))})
    return cards


# ──────────────────────────────────────────────
# 1. cardrush.media（JP 大会メタ）
# ──────────────────────────────────────────────
def fetch_cardrush_decks() -> list[dict]:
    """cardrush.media から優勝/準優勝デッキのメタ情報を取得。"""
    cutoff = datetime.now(tz=JST) - timedelta(days=RECENT_DAYS)
    all_decks: list[dict] = []
    page = 1

    while True:
        params = {"page": page, "score[]": list(TARGET_SCORES)}
        url = f"{CARDRUSH_LIST}?{urlencode(params, doseq=True)}"
        data = fetch_next_data(url)
        if not data:
            break

        decks_raw = (
            data.get("props", {})
                .get("pageProps", {})
                .get("dehydratedState", {})
                .get("queries", [{}])[0]
                .get("state", {})
                .get("data", {})
                .get("data", [])
        )
        if not decks_raw:
            break

        page_has_recent = False
        for deck in decks_raw:
            raw_date = deck.get("held_at", "")[:10]
            if not raw_date:
                continue
            dt = parse_date(raw_date)
            if not dt or dt < cutoff:
                continue
            page_has_recent = True

            score_raw = deck.get("score", {}).get("label", "")
            result_jp = "優勝" if "優勝" in score_raw else "準優勝"
            archetype = deck.get("archetype") or {}

            all_decks.append({
                "id":           deck.get("id"),
                "leaderName":   archetype.get("name", "?"),
                "archetypeId":  archetype.get("id"),
                "archetypeImg": archetype.get("image_url", ""),
                "date":         raw_date.replace("-", "/"),
                "rawDate":      raw_date,
                "eventName":    deck.get("event", {}).get("name", ""),
                "result":       result_jp,
                "deckUrl":      f"{CARDRUSH_BASE}/onepiece/decks/{deck.get('id')}",
                "source":       "cardrush",
            })

        if not page_has_recent:
            break
        page += 1
        time.sleep(0.4)

    return all_decks


# ──────────────────────────────────────────────
# 2. gumgum.gg（海外大会フルデッキリスト）
# ──────────────────────────────────────────────
def fetch_gumgum_sample_decks() -> list[dict]:
    """
    gumgum.gg のトップページから East（JP フォーマット）の
    デッキリンクを収集し、各デッキページからカードリストを取得。
    注意: gumgum.gg は Next.js CSR のため、サーバーサイドから
    デッキリンクは取得できない。retries=0 で即失敗させる。
    """
    results: list[dict] = []
    top_html = fetch_html(GUMGUM_BASE, retries=0)
    if not top_html:
        return results

    # /decklists/deck/{region}/{set}/{id} 形式のリンクを収集
    deck_links = re.findall(
        r'href="(/decklists/deck/[^"]+)"', top_html
    )
    # East（JP フォーマット）を優先、重複除去
    seen = set()
    prioritized = []
    for link in deck_links:
        if link not in seen:
            seen.add(link)
            prioritized.append(link)

    # East を先に処理
    east_links  = [l for l in prioritized if "/east/" in l]
    other_links = [l for l in prioritized if "/east/" not in l]
    ordered = east_links + other_links

    print(f"  gumgum: {len(ordered)} デッキリンク取得 (East:{len(east_links)})", flush=True)

    for link in ordered[:30]:  # 最大30件
        url = f"{GUMGUM_BASE}{link}"
        html = fetch_html(url)
        if not html:
            continue

        # deck= パラメータからカード文字列を抽出
        # 例: deck=4xOP15-053;4xOP15-040;...
        deck_match = re.search(r'deck=([^"&\s]+)', html)
        if not deck_match:
            continue
        deck_str = deck_match.group(1)

        # カードリストをパース
        cards = parse_deck_string(deck_str)
        if len(cards) < 10:
            continue

        # リーダーカード（count=1 の最初のカード、またはセグメント先頭）
        leader_card = next(
            (c["cardNumber"] for c in cards if c["count"] == 1),
            cards[0]["cardNumber"] if cards else None
        )

        # メタデータ抽出
        date_match = re.search(
            r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', html
        )
        raw_date = ""
        if date_match:
            y, m, d = date_match.groups()
            raw_date = f"{y}-{int(m):02d}-{int(d):02d}"

        # イベント名（Flagship, Regional 等）
        event_match = re.search(
            r'(Flagship|Regional|Championship|Store\s*Qualifier|CS\s*|Grand\s*Prix)',
            html, re.IGNORECASE
        )
        event_name = event_match.group(0).strip() if event_match else "Tournament"

        # 地域・フォーマット
        parts = link.strip("/").split("/")
        region = parts[2] if len(parts) > 2 else "unknown"
        fmt    = parts[3].upper() if len(parts) > 3 else ""

        # 最近のデータのみ
        if raw_date and not is_recent(raw_date, days=30):
            continue

        deck_id = parts[-1] if parts else link.replace("/", "_")

        results.append({
            "id":          f"gumgum_{deck_id}",
            "leaderName":  leader_card or "?",
            "leaderCard":  leader_card,
            "date":        raw_date.replace("-", "/") if raw_date else "",
            "rawDate":     raw_date,
            "eventName":   event_name,
            "eventRegion": region,
            "format":      fmt,
            "result":      "優勝",
            "source":      "gumgum",
            "sourceUrl":   url,
            "deck":        [c for c in cards if c["count"] > 1 or c["cardNumber"] != leader_card],
        })
        time.sleep(0.5)

    print(f"  gumgum: {len(results)} サンプルデッキ取得", flush=True)
    return results


# ──────────────────────────────────────────────
# 3. Limitless（海外大会フルデッキリスト）
# ──────────────────────────────────────────────
def fetch_limitless_sample_decks() -> list[dict]:
    """
    onepiece.limitlesstcg.com の最新トーナメントから
    上位デッキリストを取得。
    """
    results: list[dict] = []

    # トーナメント一覧
    tour_html = fetch_html(f"{LIMITLESS_BASE}/tournaments?show=25")
    if not tour_html:
        return results

    # トーナメント一覧ページの <tr> 行ごとに日付とIDをペアリング
    date_map: dict[str, str] = {}
    for row in re.split(r'(?=<tr[ >])', tour_html):
        date_m = re.search(r'(\d{4}-\d{2}-\d{2})', row)
        tid_m  = re.search(r'href="/tournaments/(\d+)"', row)
        if date_m and tid_m:
            date_map[tid_m.group(1)] = date_m.group(1)

    # トーナメントIDを抽出（最新8件）
    tour_ids = re.findall(r'/tournaments/(\d+)', tour_html)
    seen_ids = list(dict.fromkeys(tour_ids))[:8]
    print(f"  limitless: {len(seen_ids)} トーナメント取得", flush=True)

    for tid in seen_ids:
        raw_date = date_map.get(tid, "")

        if raw_date and not is_recent(raw_date, days=30):
            continue

        # デッキリスト一覧ページ
        deck_list_html = fetch_html(f"{LIMITLESS_BASE}/tournaments/{tid}?tab=decklists")
        if not deck_list_html:
            continue

        # イベント名
        event_match = re.search(r'<h1[^>]*>([^<]+)</h1>', deck_list_html)
        event_name = event_match.group(1).strip() if event_match else f"Tournament #{tid}"

        # 個別デッキリンク /decks/list/{id} を収集（上位8件）
        deck_list_ids = re.findall(r'/decks/list/(\d+)', deck_list_html)
        deck_list_ids = list(dict.fromkeys(deck_list_ids))[:8]

        for did in deck_list_ids:
            deck_html = fetch_html(f"{LIMITLESS_BASE}/decks/list/{did}")
            if not deck_html:
                continue

            # カード一覧を data-count / data-id 属性から抽出
            # 例: <div class="decklist-card" data-count="4" data-id="OP09-069" ...>
            card_rows = re.findall(
                r'data-count="(\d+)"\s+data-id="([^"]+)"',
                deck_html
            )
            if not card_rows:
                continue

            # card_rows は (count, cardNumber) の順
            cards = [{"cardNumber": cn, "count": int(cnt)} for cnt, cn in card_rows]
            leader_card = next(
                (c["cardNumber"] for c in cards if c["count"] == 1), None
            )

            results.append({
                "id":         f"limitless_{did}",
                "leaderName": leader_card or "?",
                "leaderCard": leader_card,
                "date":       raw_date.replace("-", "/") if raw_date else "",
                "rawDate":    raw_date,
                "eventName":  event_name,
                "result":     "優勝",
                "source":     "limitless",
                "sourceUrl":  f"{LIMITLESS_BASE}/decks/list/{did}",
                "deck":       [c for c in cards if c["count"] > 1],
            })
            time.sleep(0.4)

    print(f"  limitless: {len(results)} サンプルデッキ取得", flush=True)
    return results


# ──────────────────────────────────────────────
# cardrush: 集計
# ──────────────────────────────────────────────
def compute_distribution(decks: list[dict]) -> list[dict]:
    cutoff_7 = datetime.now(tz=JST) - timedelta(days=7)

    wins_14:   defaultdict[str, int] = defaultdict(int)
    wins_7:    defaultdict[str, int] = defaultdict(int)
    runner_14: defaultdict[str, int] = defaultdict(int)
    img_map:   dict[str, str]        = {}

    for d in decks:
        leader = d["leaderName"]
        is_win = d["result"] == "優勝"
        dt     = parse_date(d["rawDate"])

        if d.get("archetypeImg") and leader not in img_map:
            img_map[leader] = d["archetypeImg"]

        if is_win:
            wins_14[leader] += 1
            if dt and dt >= cutoff_7:
                wins_7[leader] += 1
        else:
            runner_14[leader] += 1

    all_leaders = sorted(
        set(list(wins_14.keys()) + list(runner_14.keys())),
        key=lambda l: (wins_14[l] + runner_14[l]),
        reverse=True,
    )

    return [
        {
            "leaderName":   leader,
            "archetypeImg": img_map.get(leader, ""),
            "wins14":       wins_14[leader],
            "wins7":        wins_7[leader],
            "runnerUp14":   runner_14[leader],
            "total14":      wins_14[leader] + runner_14[leader],
        }
        for leader in all_leaders
        if wins_14[leader] + runner_14[leader] > 0
    ]


# ──────────────────────────────────────────────
# メイン
# ──────────────────────────────────────────────
def load_existing(path: str) -> dict:
    """既存 JSON を読み込む（ファイルがなければ空 dict）。"""
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def main() -> None:
    print("=== 大会データ取得 (cardrush + gumgum + limitless) ===", flush=True)

    # ── 既存データをフォールバックとして読み込む ──
    existing = load_existing(OUTPUT_FILE)

    # ── 1. cardrush.media ──
    print("\n[1/3] cardrush.media ...", flush=True)
    cardrush_decks: list[dict] = []
    try:
        cardrush_decks = fetch_cardrush_decks()
    except Exception as e:
        print(f"  [WARN] cardrush 取得エラー: {e}", flush=True)
    print(f"  取得: {len(cardrush_decks)} 件", flush=True)

    # cardrush が取得できなかった場合は既存データを再利用
    if not cardrush_decks:
        print("  cardrush: データなし → 既存 recentWinners を再利用します。", flush=True)
        cardrush_decks = existing.get("recentWinners", [])

    distribution = compute_distribution(cardrush_decks) if cardrush_decks else existing.get("distribution", [])

    # ── 2. gumgum.gg ──
    print("\n[2/3] gumgum.gg ...", flush=True)
    gumgum_decks: list[dict] = []
    try:
        gumgum_decks = fetch_gumgum_sample_decks()
    except Exception as e:
        print(f"  [WARN] gumgum 取得エラー: {e}", flush=True)

    # ── 3. Limitless ──
    print("\n[3/3] Limitless ...", flush=True)
    limitless_decks: list[dict] = []
    try:
        limitless_decks = fetch_limitless_sample_decks()
    except Exception as e:
        print(f"  [WARN] limitless 取得エラー: {e}", flush=True)

    # ── サンプルデッキ結合（日付降順）──
    all_sample = gumgum_decks + limitless_decks
    all_sample.sort(key=lambda d: d.get("rawDate", ""), reverse=True)

    # 重複排除（leaderCard + rawDate が同じものは1つに）
    seen_keys: set[str] = set()
    deduped: list[dict] = []
    for d in all_sample:
        key = f"{d.get('leaderCard','')}_{d.get('rawDate','')}"
        if key not in seen_keys and d.get("deck"):
            seen_keys.add(key)
            deduped.append(d)

    print(f"\n  サンプルデッキ合計: {len(deduped)} 件 "
          f"(gumgum:{len(gumgum_decks)}, limitless:{len(limitless_decks)})", flush=True)

    # ── JSON 出力（常に書き出し）──
    output = {
        "lastUpdated":   datetime.now(tz=JST).strftime("%Y-%m-%dT%H:%M:%S+09:00"),
        "fetchedDays":   RECENT_DAYS,
        "recentWinners": cardrush_decks,
        "distribution":  distribution,
        "sampleDecks":   deduped,
    }

    # 出力先ディレクトリが無ければ作成
    Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n-> {OUTPUT_FILE} 書き出し完了", flush=True)
    if distribution:
        print(f"\n【cardrush 直近{RECENT_DAYS}日 TOP10】")
        for d in distribution[:10]:
            bar = "█" * d["wins14"] + "░" * d["runnerUp14"]
            print(f"  {d['leaderName']:<16} 優勝{d['wins14']} 準{d['runnerUp14']} {bar}")


if __name__ == "__main__":
    main()
