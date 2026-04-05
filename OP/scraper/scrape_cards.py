#!/usr/bin/env python3
"""
ONE PIECE カードゲーム 公式カードリスト スクレイパー
https://www.onepiece-cardgame.com/cardlist/

全シリーズのカードデータをJSON形式で取得・保存します。
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import os
import re
from datetime import datetime

# ===== 設定 =====
BASE_URL = "https://www.onepiece-cardgame.com/cardlist/"
IMAGE_BASE_URL = "https://www.onepiece-cardgame.com/images/cardlist/card/"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "cards.json")
SERIES_FILE = os.path.join(OUTPUT_DIR, "series.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://www.onepiece-cardgame.com",
    "Referer": "https://www.onepiece-cardgame.com/cardlist/",
}

# リクエスト間のウェイト（秒）- サーバー負荷軽減
REQUEST_DELAY = 1.5


def get_series_list(session: requests.Session) -> list[dict]:
    """利用可能なシリーズ一覧を取得する"""
    print("シリーズ一覧を取得中...")
    resp = session.get(BASE_URL, headers=HEADERS)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    series_select = soup.find("select", {"name": "series"})
    series_list = []

    for opt in series_select.find_all("option"):
        value = opt.get("value", "").strip()
        if not value:
            continue
        # テキストからHTMLタグ（エンコード済みも含む）・余分な空白を除去
        name = opt.get_text(separator="", strip=True)
        name = re.sub(r"<[^>]+>", "", name)       # 通常のHTMLタグ
        name = re.sub(r"&lt;[^&]+&gt;", "", name) # エンコード済みタグ
        name = re.sub(r"\s+", " ", name).strip()
        series_list.append({"id": value, "name": name})

    print(f"  → {len(series_list)} シリーズ取得")
    return series_list


def parse_card(dl_element) -> dict:
    """<dl class="modalCol"> 要素から1枚のカードデータをパースする"""
    card = {}

    # カードID（例: OP15-001, OP15-001_p1）
    card_id = dl_element.get("id", "")
    card["id"] = card_id

    # _p1 などのパラレルバージョンを判定
    if "_p" in card_id:
        base_id, parallel = card_id.rsplit("_p", 1)
        card["card_number"] = base_id
        card["parallel"] = int(parallel)
        card["is_parallel"] = True
    else:
        card["card_number"] = card_id
        card["parallel"] = 0
        card["is_parallel"] = False

    # dt セクション（カード番号・レアリティ・種類・名前）
    dt = dl_element.find("dt")
    if dt:
        spans = dt.find_all("span")
        if len(spans) >= 3:
            card["rarity"] = spans[1].get_text(strip=True)   # L, C, UC, R, SR, etc.
            card["card_type"] = spans[2].get_text(strip=True) # LEADER, CHARACTER, EVENT, STAGE

        name_div = dt.find("div", class_="cardName")
        card["name"] = name_div.get_text(strip=True) if name_div else ""

    # dd セクション（詳細情報）
    dd = dl_element.find("dd")
    if dd:
        # 画像URL
        img = dd.find("img", class_="lazy")
        if img:
            data_src = img.get("data-src", "")
            # 相対パスを絶対パスに変換
            if data_src.startswith("../"):
                data_src = "https://www.onepiece-cardgame.com/" + data_src[3:]
            elif data_src.startswith("/"):
                data_src = "https://www.onepiece-cardgame.com" + data_src
            card["image_url"] = data_src

        back_col = dd.find("div", class_="backCol")
        if back_col:
            # コスト or ライフ
            cost_div = back_col.find("div", class_="cost")
            if cost_div:
                h3 = cost_div.find("h3")
                label = h3.get_text(strip=True) if h3 else "コスト"
                value_text = cost_div.get_text(strip=True).replace(label, "").strip()
                if label == "ライフ":
                    card["life"] = int(value_text) if value_text.isdigit() else None
                    card["cost"] = None
                else:
                    card["cost"] = int(value_text) if value_text.isdigit() else None
                    card["life"] = None

            # 属性
            attr_div = back_col.find("div", class_="attribute")
            if attr_div:
                img_attr = attr_div.find("img")
                card["attribute"] = img_attr.get("alt", "") if img_attr else ""

            # パワー
            power_div = back_col.find("div", class_="power")
            if power_div:
                h3 = power_div.find("h3")
                val = power_div.get_text(strip=True).replace("パワー", "").strip()
                card["power"] = int(val) if val.isdigit() else None

            # カウンター
            counter_div = back_col.find("div", class_="counter")
            if counter_div:
                h3 = counter_div.find("h3")
                val = counter_div.get_text(strip=True).replace("カウンター", "").strip()
                card["counter"] = int(val) if val.isdigit() else None

            # 色
            color_div = back_col.find("div", class_="color")
            if color_div:
                h3 = color_div.find("h3")
                val = color_div.get_text(strip=True).replace("色", "").strip()
                # 赤/緑 など複数色を配列化
                card["colors"] = [c.strip() for c in val.split("/") if c.strip()]

            # ブロックアイコン
            block_div = back_col.find("div", class_="block")
            if block_div:
                val = block_div.get_text(separator="", strip=True).replace("ブロックアイコン", "").strip()
                card["block_icon"] = val

            # 特徴
            feature_div = back_col.find("div", class_="feature")
            if feature_div:
                h3 = feature_div.find("h3")
                val = feature_div.get_text(strip=True).replace("特徴", "").strip()
                # 特徴は / 区切りで複数存在
                card["traits"] = [t.strip() for t in val.split("/") if t.strip()]

            # テキスト（効果）
            text_div = back_col.find("div", class_="text")
            if text_div:
                h3 = text_div.find("h3")
                if h3:
                    h3.extract()
                card["effect"] = text_div.get_text(separator="\n", strip=True)

            # 入手情報
            get_info_div = back_col.find("div", class_="getInfo")
            if get_info_div:
                h3 = get_info_div.find("h3")
                val = get_info_div.get_text(strip=True).replace("入手情報", "").strip()
                card["pack_info"] = val

    return card


def scrape_series(session: requests.Session, series_id: str, series_name: str) -> list[dict]:
    """指定シリーズのカードリストをスクレイピングする"""
    data = {
        "search": "true",
        "series": series_id,
    }
    resp = session.post(BASE_URL, headers=HEADERS, data=data)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    card_elements = soup.find_all("dl", class_="modalCol")

    cards = []
    for el in card_elements:
        try:
            card = parse_card(el)
            card["series_id"] = series_id
            card["series_name"] = series_name
            cards.append(card)
        except Exception as e:
            print(f"    ⚠ カードパース失敗: {el.get('id', '?')} - {e}")

    return cards


def scrape_all(target_series_ids: list[str] = None, skip_parallel: bool = False) -> dict:
    """
    全シリーズ（またはtarget_series_idsで指定したシリーズ）のカードを取得する

    Args:
        target_series_ids: 取得するシリーズIDのリスト。Noneなら全シリーズ。
        skip_parallel: Trueならパラレル版カードをスキップ（_p1, _p2 など）

    Returns:
        {"series": [...], "cards": [...], "scraped_at": "..."} の辞書
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    session = requests.Session()

    # シリーズ一覧取得
    all_series = get_series_list(session)

    # 対象シリーズの絞り込み
    if target_series_ids:
        target = [s for s in all_series if s["id"] in target_series_ids]
    else:
        target = all_series

    print(f"\n対象シリーズ数: {len(target)}")

    all_cards = []
    failed_series = []

    for i, series in enumerate(target, 1):
        print(f"\n[{i}/{len(target)}] {series['name']} (ID={series['id']})")
        try:
            cards = scrape_series(session, series["id"], series["name"])

            if skip_parallel:
                cards = [c for c in cards if not c.get("is_parallel")]

            all_cards.extend(cards)
            print(f"  → {len(cards)} 枚取得")
        except Exception as e:
            print(f"  ✗ 失敗: {e}")
            failed_series.append(series)

        time.sleep(REQUEST_DELAY)

    result = {
        "scraped_at": datetime.now().isoformat(),
        "total_cards": len(all_cards),
        "total_series": len(target),
        "failed_series": failed_series,
        "series": all_series,
        "cards": all_cards,
    }

    # 保存
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    with open(SERIES_FILE, "w", encoding="utf-8") as f:
        json.dump(all_series, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 完了！")
    print(f"  総カード数: {len(all_cards)}")
    print(f"  失敗シリーズ: {len(failed_series)}")
    print(f"  保存先: {OUTPUT_FILE}")

    return result


# ===== メイン =====
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ONE PIECE カードゲーム カードリスト スクレイパー")
    parser.add_argument(
        "--series", nargs="*",
        help="取得するシリーズIDを指定（例: 550101 550102）。省略すると全シリーズ取得。"
    )
    parser.add_argument(
        "--no-parallel", action="store_true",
        help="パラレル版カードをスキップする"
    )
    parser.add_argument(
        "--list-series", action="store_true",
        help="シリーズ一覧を表示して終了"
    )
    args = parser.parse_args()

    session = requests.Session()

    if args.list_series:
        series = get_series_list(session)
        for s in series:
            print(f"  {s['id']}: {s['name']}")
    else:
        scrape_all(
            target_series_ids=args.series,
            skip_parallel=args.no_parallel,
        )
