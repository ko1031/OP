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
print("--- Python Script Started ---") # ← これを追記

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
# cards.json は scraper フォルダ内の data フォルダにある
CARDS_JSON   = os.path.join(BASE_DIR, "data", "cards.json")
# 画像の保存先は隣の deck-builder フォルダ内
OUTPUT_DIR   = os.path.join(os.path.dirname(BASE_DIR), "deck-builder", "public", "images")
REQUEST_DELAY = 0.3  # 秒（サーバー負荷軽減）

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.onepiece-cardgame.com/cardlist/",
}

def download_images(force: bool = False):
    # 絶対パスを取得して表示
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "data", "cards.json")
    
    print("=== DEBUG START ===")
    print(f"1. 実行中のスクリプト場所: {script_dir}")
    print(f"2. 探しているJSONパス: {json_path}")
    print(f"3. ファイル存在チェック: {os.path.exists(json_path)}")
    
    if not os.path.exists(json_path):
        print("ERROR: ファイルが見つかりません。終了します。")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
        cards = data.get("cards", [])
        print(f"4. JSON内のカード枚数: {len(cards)}")

    if not cards:
        print("ERROR: カードデータが空です。")
        return
        
    print("=== DOWNLOAD START ===")
    
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
