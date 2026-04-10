#!/usr/bin/env python3
"""
複数ソースから最新の大会優勝デッキリストとデッキ分布統計を取得して
tournament_stats.json に書き出す。

ソース:
  1. cardrush.media  … JP 大会メタデータ（優勝/準優勝リスト・分布）
                       + 各デッキの個別ページからフルカードリストも取得
  2. limitless       … 海外大会デッキリスト（補完）

GitHub Actions で毎日自動実行。
手動実行: python deck-builder/scripts/fetch_tournament_data.py
"""

import json
import re
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
LIMITLESS_BASE = "https://onepiece.limitlesstcg.com"

_SCRIPT_DIR = Path(__file__).parent
_REPO_ROOT  = _SCRIPT_DIR.parent.parent
OUTPUT_FILE = str(_REPO_ROOT / "deck-builder" / "public" / "tournament_stats.json")

# 取得対象：過去何日分
RECENT_DAYS = 14

# cardrush からフルデッキリストを取得する最大件数（優勝のみ）
MAX_FULL_DECKS = 20

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


# ──────────────────────────────────────────────
# 1. cardrush.media（JP 大会メタ + フルデッキリスト）
# ──────────────────────────────────────────────
def fetch_cardrush_meta() -> list[dict]:
    """
    cardrush.media のデッキ一覧ページから
    優勝/準優勝デッキのメタ情報を取得する。
    """
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
            archetype  = deck.get("archetype") or {}

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


def fetch_cardrush_deck_detail(deck_id: int) -> list[dict]:
    """
    cardrush の個別デッキページから __NEXT_DATA__ を解析し、
    カードリスト [{"cardNumber": "OP13-079", "count": 4}, ...] を返す。
    リーダーカードは除外（count=1 かつ deck_type="リーダー"）。
    """
    url = f"{CARDRUSH_BASE}/onepiece/decks/{deck_id}"
    data = fetch_next_data(url)
    if not data:
        return []

    recipes = (
        data.get("props", {})
            .get("pageProps", {})
            .get("deck", {})
            .get("recipes", [])
    )

    result = []
    leader_card = None
    for r in recipes:
        card_num = r.get("card", {}).get("card_number", "")
        count    = r.get("count", 0)
        dtype    = r.get("deck_type", "")
        if not card_num or not count:
            continue
        if dtype == "リーダー":
            leader_card = card_num
        else:
            result.append({"cardNumber": card_num, "count": count})

    return leader_card, result


def fetch_cardrush_sample_decks(meta_decks: list[dict]) -> list[dict]:
    """
    cardrush のメタデッキのうち優勝デッキを対象に、
    個別ページからフルカードリストを取得してサンプルデッキとして返す。
    """
    # 優勝のみ、最大 MAX_FULL_DECKS 件
    targets = [d for d in meta_decks if d["result"] == "優勝"][:MAX_FULL_DECKS]
    results = []

    for d in targets:
        deck_id = d.get("id")
        if not deck_id:
            continue

        leader_card, cards = fetch_cardrush_deck_detail(deck_id)
        if not cards:
            continue

        results.append({
            "id":          f"cardrush_{deck_id}",
            "leaderName":  d["leaderName"],
            "leaderCard":  leader_card,
            "date":        d["date"],
            "rawDate":     d["rawDate"],
            "eventName":   d["eventName"],
            "result":      d["result"],
            "source":      "cardrush",
            "sourceUrl":   d["deckUrl"],
            "deck":        cards,
        })
        time.sleep(0.5)

    print(f"  cardrush: {len(results)} フルデッキリスト取得", flush=True)
    return results


# ──────────────────────────────────────────────
# 2. Limitless（海外大会フルデッキリスト）
# ──────────────────────────────────────────────
def fetch_limitless_sample_decks() -> list[dict]:
    """
    onepiece.limitlesstcg.com の最新トーナメントから
    上位デッキリストを取得。
    """
    results: list[dict] = []

    tour_html = fetch_html(f"{LIMITLESS_BASE}/tournaments?show=25")
    if not tour_html:
        return results

    # トーナメント一覧から日付とIDをペアリング
    date_map: dict[str, str] = {}
    for row in re.split(r'(?=<tr[ >])', tour_html):
        date_m = re.search(r'(\d{4}-\d{2}-\d{2})', row)
        tid_m  = re.search(r'href="/tournaments/(\d+)"', row)
        if date_m and tid_m:
            date_map[tid_m.group(1)] = date_m.group(1)

    tour_ids = re.findall(r'/tournaments/(\d+)', tour_html)
    seen_ids = list(dict.fromkeys(tour_ids))[:8]
    print(f"  limitless: {len(seen_ids)} トーナメント取得", flush=True)

    for tid in seen_ids:
        raw_date = date_map.get(tid, "")
        if raw_date and not is_recent(raw_date, days=30):
            continue

        deck_list_html = fetch_html(f"{LIMITLESS_BASE}/tournaments/{tid}?tab=decklists")
        if not deck_list_html:
            continue

        event_match = re.search(r'<h1[^>]*>([^<]+)</h1>', deck_list_html)
        event_name  = event_match.group(1).strip() if event_match else f"Tournament #{tid}"

        deck_list_ids = re.findall(r'/decks/list/(\d+)', deck_list_html)
        deck_list_ids = list(dict.fromkeys(deck_list_ids))[:8]

        for did in deck_list_ids:
            deck_html = fetch_html(f"{LIMITLESS_BASE}/decks/list/{did}")
            if not deck_html:
                continue

            card_rows = re.findall(
                r'data-count="(\d+)"\s+data-id="([^"]+)"',
                deck_html
            )
            if not card_rows:
                continue

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
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def main() -> None:
    print("=== 大会データ取得 (cardrush + limitless) ===", flush=True)

    existing = load_existing(OUTPUT_FILE)

    # ── 1. cardrush.media（メタ情報） ──
    print("\n[1/3] cardrush.media（メタ情報）...", flush=True)
    cardrush_meta: list[dict] = []
    try:
        cardrush_meta = fetch_cardrush_meta()
    except Exception as e:
        print(f"  [WARN] cardrush メタ取得エラー: {e}", flush=True)
    print(f"  取得: {len(cardrush_meta)} 件", flush=True)

    if not cardrush_meta:
        print("  cardrush: データなし → 既存データを再利用", flush=True)
        cardrush_meta = existing.get("recentWinners", [])

    distribution = compute_distribution(cardrush_meta) if cardrush_meta else existing.get("distribution", [])

    # ── 2. cardrush.media（フルデッキリスト） ──
    print("\n[2/3] cardrush.media（フルデッキリスト）...", flush=True)
    cardrush_decks: list[dict] = []
    try:
        cardrush_decks = fetch_cardrush_sample_decks(cardrush_meta)
    except Exception as e:
        print(f"  [WARN] cardrush デッキ詳細取得エラー: {e}", flush=True)

    # ── 3. Limitless（海外） ──
    print("\n[3/3] Limitless（海外）...", flush=True)
    limitless_decks: list[dict] = []
    try:
        limitless_decks = fetch_limitless_sample_decks()
    except Exception as e:
        print(f"  [WARN] limitless 取得エラー: {e}", flush=True)

    # ── サンプルデッキ結合（cardrush 優先・日付降順）──
    all_sample = cardrush_decks + limitless_decks
    all_sample.sort(key=lambda d: d.get("rawDate", ""), reverse=True)

    # 重複排除（leaderCard + rawDate + source が同じものは1つに）
    seen_keys: set[str] = set()
    deduped: list[dict] = []
    for d in all_sample:
        key = f"{d.get('leaderCard','')}_{d.get('rawDate','')}_{d.get('source','')}"
        if key not in seen_keys and d.get("deck"):
            seen_keys.add(key)
            deduped.append(d)

    print(f"\n  サンプルデッキ合計: {len(deduped)} 件 "
          f"(cardrush:{len(cardrush_decks)}, limitless:{len(limitless_decks)})", flush=True)

    # ── JSON 出力 ──
    output = {
        "lastUpdated":   datetime.now(tz=JST).strftime("%Y-%m-%dT%H:%M:%S+09:00"),
        "fetchedDays":   RECENT_DAYS,
        "recentWinners": cardrush_meta,
        "distribution":  distribution,
        "sampleDecks":   deduped,
    }

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
