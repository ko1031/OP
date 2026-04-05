#!/usr/bin/env python3
"""
ONE PIECE 繧ｫ繝ｼ繝峨ご繝ｼ繝 繧ｫ繝ｼ繝臥判蜒・荳諡ｬ繝繧ｦ繝ｳ繝ｭ繝ｼ繝・cards.json 縺ｮ image_url 繧定ｪｭ縺ｿ霎ｼ縺ｿ縲｝ublic/images/ 縺ｫ菫晏ｭ倥＠縺ｾ縺吶・"""

import json
import os
import time
import requests
from pathlib import Path
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
print("--- Python Script Started ---") # 竊・縺薙ｌ繧定ｿｽ險・
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
# cards.json 縺ｯ scraper 繝輔か繝ｫ繝蜀・・ data 繝輔か繝ｫ繝縺ｫ縺ゅｋ
CARDS_JSON   = os.path.join(BASE_DIR, "data", "cards.json")
# 逕ｻ蜒上・菫晏ｭ伜・縺ｯ髫｣縺ｮ deck-builder 繝輔か繝ｫ繝蜀・OUTPUT_DIR   = os.path.join(os.path.dirname(BASE_DIR), "deck-builder", "public", "images")
REQUEST_DELAY = 0.3  # 遘抵ｼ医し繝ｼ繝舌・雋闕ｷ霆ｽ貂幢ｼ・
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.onepiece-cardgame.com/cardlist/",
}

def download_images(force: bool = False):
    # 邨ｶ蟇ｾ繝代せ繧貞叙蠕励＠縺ｦ陦ｨ遉ｺ
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "data", "cards.json")
    
    print("=== DEBUG START ===")
    print(f"1. 螳溯｡御ｸｭ縺ｮ繧ｹ繧ｯ繝ｪ繝励ヨ蝣ｴ謇: {script_dir}")
    print(f"2. 謗｢縺励※縺・ｋJSON繝代せ: {json_path}")
    print(f"3. 繝輔ぃ繧､繝ｫ蟄伜惠繝√ぉ繝・け: {os.path.exists(json_path)}")
    
    if not os.path.exists(json_path):
        print("ERROR: 繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲らｵゆｺ・＠縺ｾ縺吶・)
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
        cards = data.get("cards", [])
        print(f"4. JSON蜀・・繧ｫ繝ｼ繝画椢謨ｰ: {len(cards)}")

    if not cards:
        print("ERROR: 繧ｫ繝ｼ繝峨ョ繝ｼ繧ｿ縺檎ｩｺ縺ｧ縺吶・)
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

        # 繝輔ぃ繧､繝ｫ蜷阪ｒURL縺九ｉ蜿門ｾ暦ｼ医け繧ｨ繝ｪ繝代Λ繝｡繝ｼ繧ｿ縺ｯ髯､蜴ｻ・・        parsed = urlparse(url)
        filename = Path(parsed.path).name  # 萓・ ST01-001.png
        dest = os.path.join(OUTPUT_DIR, filename)

        if os.path.exists(dest) and not force:
            skipped += 1
            if i % 100 == 0:
                print(f"[{i}/{total}] 繧ｹ繧ｭ繝・・貂医∩: {filename}")
            continue

        try:
            resp = session.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
            with open(dest, "wb") as f:
                f.write(resp.content)
            done += 1
            if i % 50 == 0 or i == total:
                print(f"[{i}/{total}] 笨・{filename} ({len(resp.content)//1024}KB)")
        except Exception as e:
            failed += 1
            print(f"[{i}/{total}] 笨・{filename}: {e}")

        time.sleep(REQUEST_DELAY)

    print(f"\n螳御ｺ・ {done}譫壹ム繧ｦ繝ｳ繝ｭ繝ｼ繝・/ {skipped}譫壹せ繧ｭ繝・・ / {failed}譫壼､ｱ謨・)
    print(f"菫晏ｭ伜・: {OUTPUT_DIR}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="繧ｫ繝ｼ繝臥判蜒・荳諡ｬ繝繧ｦ繝ｳ繝ｭ繝ｼ繝・)
    parser.add_argument("--force", action="store_true", help="譌｢蟄倥ヵ繧｡繧､繝ｫ繧ょ・繝繧ｦ繝ｳ繝ｭ繝ｼ繝・)
    args = parser.parse_args()
    download_images(force=args.force)
