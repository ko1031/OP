#!/usr/bin/env python3
"""
ONE PIECE カードゲーム カード画像 一括ダウンロード
cards.json の image_url を読み込み、public/images/ に保存します。
"""

import json
import os
import time
import requests
from pathlib import Path
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

CARDS_JSON   = os.path.join(os.path.dirname(__file__), "data", "cards.json")
OUTPUT_DIR   = os.path.join(os.path.dirname(__file__), "..", "deck-builder", "public", "images")
REQUEST_DELAY = 0.3  # 秒（サーバー負荷軽減）

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.onepiece-cardgame.com/cardlist/",
}

def download_images(force: bool = False):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(CARDS_JSON, encoding="utf-8") as f:
        data = json.load(f)

    cards = data["cards"]
    total = len(cards)
    done = skipped = failed = 0

    session = requests.Session()

    for i, card in enumerate(cards, 1):
        url = card.get("image_url")
        if not url:
            continue

        # ファイル名をURLから取得（クエリパラメータは除去）
        parsed = urlparse(url)
        filename = Path(parsed.path).name  # 例: ST01-001.png
        dest = os.path.join(OUTPUT_DIR, filename)

        if os.path.exists(dest) and not force:
            skipped += 1
            if i % 100 == 0:
                print(f"[{i}/{total}] スキップ済み: {filename}")
            continue

        try:
            resp = session.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
            with open(dest, "wb") as f:
                f.write(resp.content)
            done += 1
            if i % 50 == 0 or i == total:
                print(f"[{i}/{total}] ✓ {filename} ({len(resp.content)//1024}KB)")
        except Exception as e:
            failed += 1
            print(f"[{i}/{total}] ✗ {filename}: {e}")

        time.sleep(REQUEST_DELAY)

    print(f"\n完了: {done}枚ダウンロード / {skipped}枚スキップ / {failed}枚失敗")
    print(f"保存先: {OUTPUT_DIR}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="カード画像 一括ダウンロード")
    parser.add_argument("--force", action="store_true", help="既存ファイルも再ダウンロード")
    args = parser.parse_args()
    download_images(force=args.force)
