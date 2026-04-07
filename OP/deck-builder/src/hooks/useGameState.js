import { useState, useCallback } from 'react';

const STORAGE_KEY = 'op_decks';
export function loadSavedDecks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** カードが【トリガー】効果を持つか判定 */
function hasTrigger(card) {
  if (!card) return false;
  // trigger フィールド（スクレイパーが別途格納）または effect テキスト内の【トリガー】
  return !!(card.trigger) || /【トリガー】/.test(card.effect || '');
}

export function expandDeck(entries) {
  const result = [];
  entries.forEach(({ card, count }) => {
    for (let i = 0; i < count; i++) result.push({ ...card, _uid: `${card.card_number}-${i}` });
  });
  return result;
}

export function resolveSampleDeck(sampleDeck, cardMap) {
  const entries = sampleDeck.deck
    .map(({ cardNumber, count }) => {
      const card = cardMap[cardNumber];
      return card ? { card, count } : null;
    })
    .filter(Boolean);
  return { leader: cardMap[sampleDeck.leaderCard] || null, entries, name: sampleDeck.name };
}

// ─────────────────────────────────────────────────────
// リーダー効果定義
// ─────────────────────────────────────────────────────
//
// 自動適用される効果:
//   donDeckInit    : DON!!デッキの初期枚数（デフォルト10）
//   donMax         : DON!!ゾーンに置ける最大枚数（デフォルトはdonDeckInit）
//   onEndPhase     : エンドフェイズに自動実行するアクション
//     'lifeTopToHand'  → ライフ上から1枚を手札に加える
//     'activateDon2'   → タップ済みDON!!を最大2枚アクティブに戻す
//   leaderCannotAttack: リーダーがアタック不可（しらほしなど）
//   activeAbility  : 起動メイン効果の説明（手動トリガー用の表示テキスト）
//
// ─────────────────────────────────────────────────────
// リーダー効果フィールド一覧
// ─────────────────────────────────────────────────────
//  donDeckInit           : DON!!デッキ初期枚数（デフォルト10）
//  donMax                : DON!!ゾーン最大枚数（デフォルトはdonDeckInit）
//  onEndPhase            : ターン終了時自動実行
//    'lifeTopToHand'       → ライフ上から1枚を手札に
//    'activateDon2'        → タップDON!!×2をアクティブに
//  leaderCannotAttack    : リーダーがアタック不可
//  activeAbility         : 起動メイン効果テキスト（手動トリガー用）
//  hasActiveAbility      : 起動メインボタンを表示
//  hasOpponentAttackAbility : 相手アタック時効果あり（カウンターステップで選択可能）
//  opponentAttackAbility : 相手アタック時効果テキスト
//  opponentAttackCost    : 'discard1' = 手札1枚捨て（デフォルト）
//  opponentAttackEffect  : 'leaderPower+2000' など
//  onLifeLeaveDraw       : 自分ターン中ライフが離れた時に手札≤7なら1ドロー
//  specialWin            : 特殊勝利条件 ('deckEmpty')
export const LEADER_EFFECTS = {

  // ────── OP01 ──────────────────────────────────────────────────────
  // 赤ゾロ OP01-001 — ドン!!×1で自分ターン中キャラ全員+1000
  'OP01-001': {
    note: '【ドン!!×1】自分のターン中: 自分のキャラすべてパワー+1000',
  },
  // 赤緑トラファルガー・ロー OP01-002
  'OP01-002': {
    note: 'ライフ5枚',
    activeAbility: '【起動メイン・ターン1回】②: キャラが5枚いる場合、キャラ1枚を手札に戻し、戻したキャラと異なる色のコスト5以下のキャラ1枚まで登場',
    hasActiveAbility: true,
  },
  // 赤緑ルフィ OP01-003
  'OP01-003': {
    note: 'ライフ5枚',
    activeAbility: '【起動メイン・ターン1回】④: コスト5以下の《超新星》か《麦わらの一味》1枚まで、アクティブにしこのターンパワー+1000',
    hasActiveAbility: true,
  },
  // 青紫カイドウ OP01-061
  'OP01-061': {
    note: '【ドン!!×1】自分のターン中・ターン1回: 相手キャラがKOされた時、DON!!デッキからDON!!1枚アクティブで追加',
  },
  // 青紫クロコダイル OP01-062
  'OP01-062': {
    note: '【ドン!!×1】自分がイベント発動時、手札4枚以下かつ未ドローなら1枚ドロー',
  },

  // ────── OP02 ──────────────────────────────────────────────────────
  // 赤エドワード・ニューゲート OP02-001 — ターン終了時ライフ上から手札
  'OP02-001': {
    onEndPhase: 'lifeTopToHand',
    note: '自分のターン終了時: ライフ上から1枚を手札に加える',
  },
  // 赤黒モンキー・D・ガープ OP02-002
  'OP02-002': {
    note: '【自分のターン中】リーダーかキャラにDON!!が付与された時、相手のコスト7以下のキャラ1枚コスト-1（このターン）',
  },
  // 紫マゼラン OP02-071
  'OP02-071': {
    note: '【自分のターン中・ターン1回】DON!!がデッキに戻された時、このリーダーパワー+1000（このターン）',
  },
  // 紫黒ゼット OP02-072
  'OP02-072': {
    note: '【アタック時】DON!!-4: コスト3以下のキャラ1枚KO & このリーダーパワー+1000（このターン）',
  },

  // ────── OP03 ──────────────────────────────────────────────────────
  // 緑黄アーロン OP03-022
  'OP03-022': {
    note: '【ドン!!×2】【アタック時】①: 手札からコスト4以下の【トリガー】を持つキャラ1枚まで登場',
  },
  // 青ナミ OP03-040 — デッキ0枚で勝利（特殊勝利条件）
  'OP03-040': {
    specialWin: 'deckEmpty',
    note: 'デッキが0枚になった時、勝利 | 【ドン!!×1】アタック時にダメージを与えた時、デッキトップ1枚をトラッシュ（任意）',
  },
  // 黒黄シャーロット・リンリン OP03-077
  'OP03-077': {
    note: '【ドン!!×2】【アタック時】②+手捨て（任意）: ライフ1枚以下の場合、デッキ上から1枚ライフ上に追加',
  },

  // ────── OP04 ──────────────────────────────────────────────────────
  // 赤青ネフェルタリ・ビビ OP04-001 — アタック不可
  'OP04-001': {
    leaderCannotAttack: true,
    note: 'このリーダーはアタックできない',
    activeAbility: '【起動メイン・ターン1回】②: 1枚ドロー & キャラ1枚まで【速攻】を得る（このターン）',
    hasActiveAbility: true,
  },
  // 緑紫ドフラミンゴ OP04-019 — ターン終了時DON!!×2アクティブに
  'OP04-019': {
    onEndPhase: 'activateDon2',
    note: '自分のターン終了時: DON!!×2までをアクティブにする',
  },
  // 緑黒イッショウ OP04-020
  'OP04-020': {
    note: '【ドン!!×1】自分のターン中: 相手キャラすべてコスト-1 | 自分ターン終了時①: コスト5以下のキャラ1枚アクティブ',
  },
  // 青黒レベッカ OP04-039 — アタック不可
  'OP04-039': {
    leaderCannotAttack: true,
    note: 'このリーダーはアタックできない',
    activeAbility: '【起動メイン・ターン1回】①: 手札6枚以下の場合、デッキ上2枚を見て《ドレスローザ》カード1枚まで手札に加え残りトラッシュ',
    hasActiveAbility: true,
  },
  // 青黄クイーン OP04-040
  'OP04-040': {
    note: 'ライフ4枚スタート',
    activeAbility: '【ドン!!×1】【アタック時】: ライフ+手札の合計4枚以下の場合→1枚ドロー。コスト8以上のキャラがいる場合→デッキ上1枚をライフ上に加える（代替可）',
    hasActiveAbility: true,
  },
  // 紫黄クロコダイル OP04-058
  'OP04-058': {
    note: '【相手のターン中・ターン1回】自分の効果でDON!!がデッキに戻された時、DON!!デッキからDON!!1枚アクティブで追加',
  },

  // ────── OP05 ──────────────────────────────────────────────────────
  // 赤黒サボ OP05-001
  'OP05-001': {
    note: '【ドン!!×1】【相手のターン中・ターン1回】自分のパワー5000以上のキャラがKOされる場合、代わりにそのキャラパワー-1000',
  },
  // 赤黄ベロ・ベティ OP05-002
  'OP05-002': {
    note: 'ライフ4枚スタート',
    activeAbility: '【起動メイン・ターン1回】手札から《革命軍》カード1枚を捨てる（任意）: 《革命軍》か【トリガー】持ちキャラ3枚まで、このターンパワー+3000',
    hasActiveAbility: true,
  },
  // 緑青ドンキホーテ・ロシナンテ OP05-022
  'OP05-022': {
    note: '【ブロッカー】 | 自分のターン終了時: 手札6枚以下ならこのリーダーをアクティブに',
    onEndPhase: 'activateLeaderIfHandLow',
  },
  // 青黒サカズキ OP05-041 — ライフ4、手動効果
  'OP05-041': {
    activeAbility: '【起動メイン・ターン1回】手札1枚捨て（任意）→1枚ドロー | 【アタック時】相手のキャラ1枚コスト-1（このターン）',
    hasActiveAbility: true,
    note: 'ライフ4枚スタート。起動メイン: 手札入替',
  },

  // ────── OP06 ──────────────────────────────────────────────────────
  // 赤紫ウタ OP06-001 — ライフ4
  'OP06-001': {
    note: 'ライフ4枚スタート | 【アタック時】《FILM》手捨て（任意）: 相手キャラ1枚パワー-2000+DON!!デッキからDON!!1枚レストで追加',
  },
  // 緑黒ペローナ OP06-021
  'OP06-021': {
    activeAbility: '【起動メイン・ターン1回】以下から1つ選ぶ: ①相手コスト4以下のキャラ1枚レストにする / ②相手キャラ1枚コスト-1（このターン）',
    hasActiveAbility: true,
  },
  // 緑黄ヤマト OP06-022 — ダブルアタックリーダー
  'OP06-022': {
    note: 'ライフ4枚スタート | 【ダブルアタック】このリーダーは2ライフダメージ',
    hasLeaderDoubleAttack: true,
    activeAbility: '【起動メイン・ターン1回】相手のライフが3枚以下の場合、自分のキャラ1枚にレストDON!!×2まで付与',
    hasActiveAbility: true,
  },
  // 青紫ヴィンスモーク・レイジュ OP06-042
  'OP06-042': {
    note: '【自分のターン中・ターン1回】自分の場のDON!!がDON!!デッキに戻された時、1枚ドロー',
  },
  // 黒モリア OP06-080
  'OP06-080': {
    note: '【ドン!!×1・アタック時】手札1枚捨て→デッキ上2枚トラッシュ→《スリラーバーク》コスト4以下キャラ登場',
  },

  // ────── OP08 ──────────────────────────────────────────────────────
  // 赤緑チョッパー OP08-001 — ライフ4
  'OP08-001': {
    note: 'ライフ4枚スタート | 起動メイン: 《動物》か《ドラム王国》キャラ3枚にDON!!1枚ずつ付与',
    hasActiveAbility: true,
    activeAbility: '【起動メイン・ターン1回】自分の《動物》か《ドラム王国》を持つキャラ3枚までに、レストDON!!1枚ずつを付与',
  },
  // 赤青マルコ OP08-002
  'OP08-002': {
    note: 'ライフ4枚スタート',
    activeAbility: '【ドン!!×1】【起動メイン・ターン1回】1枚ドロー&手札1枚デッキ上か下に置く。その後、相手キャラ1枚パワー-2000（このターン）',
    hasActiveAbility: true,
  },
  // 紫黒キング OP08-057
  'OP08-057': {
    activeAbility: '【起動メイン・ターン1回】DON!!-2: 手札5枚以下なら1枚ドロー / 相手キャラ1枚コスト-2（このターン）から1つ選ぶ',
    hasActiveAbility: true,
  },
  // 紫黄シャーロット・プリン OP08-058
  'OP08-058': {
    note: '【アタック時】ライフ上から2枚表向きにできる: DON!!デッキからDON!!1枚レストで追加',
  },

  // ────── OP09 ──────────────────────────────────────────────────────
  // 緑紫リム OP09-022
  'OP09-022': {
    note: '自分のキャラカードはレストで登場する',
    activeAbility: '【起動メイン・ターン1回】DON!!3枚レスト: DON!!デッキからDON!!1枚レストで追加&手札からコスト5以下の《ODYSSEY》キャラ1枚まで登場',
    hasActiveAbility: true,
  },
  // 紫黒ルフィ OP09-061
  'OP09-061': {
    note: '【ドン!!×1】自分のキャラすべてコスト+1 | 自分のターン中・ターン1回: 場のDON!!が2枚以上デッキに戻った時、DON!!デッキからDON!!1枚アクティブ+1枚レストで追加',
    donReturnEffect: { minCount: 2, action: 'don+active+rest' },
  },
  // 紫黄ニコ・ロビン OP09-062 — バニッシュリーダー
  'OP09-062': {
    note: 'ライフ4枚スタート | 【バニッシュ】このリーダーのダメージはトリガー発動せずトラッシュへ',
    hasLeaderBanish: true,
  },

  // ────── OP10 ──────────────────────────────────────────────────────
  // 赤緑スモーカー OP10-001 — ライフ4、起動メイン
  'OP10-001': {
    activeAbility: '【起動メイン・ターン1回】パワー7000以上のキャラがいる場合、DON!!×2をアクティブにできる',
    hasActiveAbility: true,
    note: 'ライフ4枚スタート',
  },
  // 赤青シーザー・クラウン OP10-002
  'OP10-002': {
    note: 'ライフ4枚スタート',
    activeAbility: '【ドン!!×2】【アタック時】コスト2以上の《パンクハザード》キャラ1枚を手札に戻せる: 相手パワー4000以下のキャラ1枚KO',
    hasActiveAbility: true,
  },
  // 赤紫シュガー OP10-003
  'OP10-003': {
    note: '自分のターン終了時: パワー6000以上の《ドンキホーテ海賊団》キャラがいる場合、DON!!1枚アクティブ | 相手のターン中・ターン1回: イベント発動時、DON!!デッキからDON!!1枚アクティブで追加',
  },
  // 緑黄トラファルガー・ロー OP10-022
  'OP10-022': {
    note: 'ライフ4枚スタート',
    activeAbility: '【ドン!!×1】【起動メイン・ターン1回】キャラのコスト合計が5以上の場合、キャラ1枚手札に戻せる: ライフ上から1枚公開し、コスト5以下の《超新星》キャラなら登場',
    hasActiveAbility: true,
  },
  // 青黒ウソップ OP10-042
  'OP10-042': {
    note: '自分のコスト2以上の《ドレスローザ》キャラすべてコスト+1 | 相手ターン中・ターン1回: 《ドレスローザ》キャラがKO/効果で場を離れた時、手札5枚以下なら1ドロー',
  },

  // ────── OP11 ──────────────────────────────────────────────────────
  // 赤黒コビー OP11-001
  'OP11-001': {
    note: '自分の《SWORD》キャラは登場ターンにキャラへアタック可 | ターン1回: 元々パワー7000以下の《海軍》キャラが相手効果で場を離れる場合、代わりにトラッシュからカード3枚デッキ下に置ける',
  },
  // 緑ジンベエ OP11-021 — ターン終了時効果
  'OP11-021': {
    note: '自分のターン終了時: 手札6枚以下の場合、自分の《魚人族》か《人魚族》キャラ1枚までとDON!!1枚までをアクティブにする',
  },
  // 緑黄しらほし OP11-022 — リーダーはアタック不可
  'OP11-022': {
    leaderCannotAttack: true,
    note: 'このリーダーはアタックできない',
    activeAbility: '【起動メイン・ターン1回】DON!!1枚レスト & ライフ上から1枚表向きにできる: 手札からDON!!の枚数以下コストの《海王類》か「メガロ」1枚まで登場',
    hasActiveAbility: true,
  },
  // 青紫モンキー・D・ルフィ OP11-040
  'OP11-040': {
    note: 'ターン開始時: 場のDON!!が8枚以上の場合、デッキ上5枚から《麦わらの一味》カード1枚まで手札に加え残り並び替えデッキに戻す',
  },
  // 青黄ナミ OP11-041 — 相手アタック時リーダー効果
  'OP11-041': {
    note: 'ライフ4枚スタート | 自分ターン中・ターン1回: ライフが離れた時、手札7枚以下なら1ドロー | 相手アタック時・ターン1回: DON!!×1付きで手捨て→パワー+2000',
    hasOpponentAttackAbility: true,
    opponentAttackAbility: '【ドン‼×1】【相手アタック時・ターン1回】手札1枚を捨てる: このリーダーは、このターン中、パワー+2000',
    opponentAttackRequiresDon: 1,
    opponentAttackEffect: 'leaderPower+2000',
    onLifeLeaveDraw: true,
  },

  // 紫カタクリ OP11-062 — アタック時/相手アタック時共通効果
  'OP11-062': {
    note: '【アタック時】/【相手のアタック時】【ターン1回】ドン!!-1: 相手のデッキ上から1枚見る。その後このリーダーパワー+1000（このバトル中）',
    hasOpponentAttackAbility: true,
    opponentAttackAbility: '【相手のアタック時・ターン1回】ドン!!-1: 相手のデッキ上から1枚見る。このリーダーパワー+1000（このバトル中）',
    opponentAttackRequiresDon: 1,
    opponentAttackEffect: 'leaderPower+1000',
  },

  // ────── OP12 ──────────────────────────────────────────────────────
  // 赤シルバーズ・レイリー OP12-001 — デッキ制限+起動メイン
  'OP12-001': {
    note: 'ルール: コスト5以上のカードをデッキに入れられない',
    activeAbility: '【起動メイン・ターン1回】手札からイベント2枚公開できる: 元々パワー4000以下のキャラ1枚までパワー+2000（このターン）',
    hasActiveAbility: true,
  },
  // 緑ロロノア・ゾロ OP12-020 — 起動メイン（ドン!!×3）
  'OP12-020': {
    activeAbility: '【ドン!!×3】【起動メイン・ターン1回】このリーダーをアクティブに。その後このターン中、相手の元々コスト7以下のキャラへアタックできない',
    hasActiveAbility: true,
  },
  // 青クザン OP12-040 — パッシブ
  'OP12-040': {
    note: '自分の《海軍》カードの効果で手札からカードが捨てられた時、捨てた枚数分カードを引く',
  },
  // 青紫サンジ OP12-041
  'OP12-041': {
    note: 'ライフ4枚スタート',
    activeAbility: '【起動メイン・ターン1回】DON!!-1: 手札から元々コスト3以下の《麦わらの一味》イベント1枚まで発動 | 【アタック時】場のDON!!が相手以下なら、DON!!デッキからDON!!1枚レストで追加',
    hasActiveAbility: true,
  },

  // 紫黄ロシナンテ OP12-061 — パッシブ+起動メイン
  'OP12-061': {
    note: 'ターン1回: 自分の「トラファルガー・ロー」がKOされる場合、代わりにライフ上から1枚手札に加えられる',
    activeAbility: '【起動メイン・ターン1回】ドン!!-1: このターン中、次に手札から登場させるコスト4以上の「トラファルガー・ロー」の支払コスト-2',
    hasActiveAbility: true,
  },
  // 黒黄コアラ OP12-081 — パッシブ×2
  'OP12-081': {
    note: '【アタック時】自分のコスト8以上キャラが2枚以上いる場合、1枚ドロー | ターン1回: 相手がコスト8以上キャラを登場させた時かキャラ効果でキャラを登場させた時、相手はライフ上から1枚手札に加える',
  },

  // ────── OP13 ──────────────────────────────────────────────────────
  // 赤緑モンキー・D・ルフィ OP13-001
  'OP13-001': {
    note: 'ライフ5枚 | 【ドン!!×1】【相手アタック時】アクティブDON!!が5枚以下の場合、任意枚数レストに: レスト1枚につき、リーダーか《麦わらの一味》キャラ1枚パワー+2000（このバトル中）',
  },
  // 赤青ポートガス・D・エース OP13-002
  'OP13-002': {
    note: 'ライフ4枚スタート',
    hasOpponentAttackAbility: true,
    opponentAttackAbility: '【相手アタック時・ターン1回】手札1枚を捨てる: 相手のリーダーかキャラ1枚パワー-2000（このバトル中） | 【ドン!!×1・ターン1回】自分がダメージを受けた時か元々パワー6000以上のキャラがKOされた時、1枚ドロー',
    opponentAttackRequiresDon: 0,
    opponentAttackEffect: 'opponentPower-2000',
  },
  // 赤紫ゴール・D・ロジャー OP13-003
  'OP13-003': {
    note: '場のDON!!がある場合: DON!!フェイズに置かれるDON!!1枚はリーダーに付与 | 場のDON!!が9枚以下の場合: このリーダーパワー-2000',
  },

  // 赤黒サボ OP13-004 — ライフ4以上でパワー-1000、コスト8以上キャラがいると全員+1000
  'OP13-004': {
    note: '自分のライフが4枚以上の場合このリーダーパワー-1000 | 【ドン!!×1】自分のコスト8以上のキャラがいる場合、自分のリーダーとキャラすべてパワー+1000',
  },
  // 黒イム OP13-079 — デッキ制限+ステージ+起動メイン
  'OP13-079': {
    note: 'ルール: コスト2以上のイベントをデッキに入れられない。ゲーム開始時、《聖地マリージョア》ステージカード1枚まで登場',
    activeAbility: '【起動メイン・ターン1回】自分の《天竜人》キャラか手札1枚をトラッシュに置ける: 1枚ドロー',
    hasActiveAbility: true,
    // ゲーム開始時にデッキから「聖地マリージョア」ステージカードを場に出す
    setupStageCard: true,
    setupStageName: '聖地マリージョア',
  },
  // 黄ジュエリー・ボニー OP13-100 — トリガーキャラ登場時DON!!付与
  'OP13-100': {
    note: '【自分のターン中・ターン1回】自分の【トリガー】を持つキャラが登場した時: リーダーかキャラ1枚にレストDON!!2枚まで付与',
  },

  // ────── OP14 ──────────────────────────────────────────────────────
  // 赤トラファルガー・ロー OP14-001 — 起動メイン（パワー入れ替え）
  'OP14-001': {
    activeAbility: '【起動メイン・ターン1回】自分の《超新星》か《ハートの海賊団》キャラ2枚を選ぶ: 選んだキャラの元々のパワーをこのターン中入れ替える',
    hasActiveAbility: true,
  },
  // 青ジンベエ OP14-040 — 起動メイン（DON!!付与）
  'OP14-040': {
    activeAbility: '【起動メイン】手札1枚捨てられる: 自分の《魚人族》か《人魚族》リーダーかキャラ1枚にレストDON!!2枚まで付与',
    hasActiveAbility: true,
  },
  // 青黄ボア・ハンコック OP14-041
  'OP14-041': {
    note: 'ライフ4枚スタート',
    activeAbility: '【相手ターン中】自分のキャラが登場した時、1枚ドロー | 【ドン!!×1・ターン1回】元々パワー5000以上の《アマゾン・リリー》か《九蛇海賊団》キャラがKOされた時、相手のライフ上から1枚手札に加える',
    hasActiveAbility: true,
  },
  // 紫ドンキホーテ・ドフラミンゴ OP14-060 — 相手アタック時アタック対象変更
  'OP14-060': {
    note: '【相手のアタック時・ターン1回】ドン!!-1: 自分のリーダーか《ドンキホーテ海賊団》キャラ1枚にアタック対象を変更する',
    hasOpponentAttackAbility: true,
    opponentAttackAbility: '【相手のアタック時・ターン1回】ドン!!-1: 自分のリーダーか《ドンキホーテ海賊団》キャラ1枚にアタック対象を変更する',
    opponentAttackRequiresDon: 1,
    opponentAttackEffect: 'redirectAttack',
  },
  // 黒クロコダイル OP14-079 — パッシブ+起動メイン
  'OP14-079': {
    note: '相手のキャラすべては、自分の効果で場を離れない',
    activeAbility: '【起動メイン・ターン1回】自分の《B・W》キャラ1枚をKOできる: 相手キャラ1枚までコスト-10（このターン）。その後自分のデッキ上2枚をトラッシュに置いてもよい',
    hasActiveAbility: true,
  },
  // 緑ミホーク OP14-020 — 手動効果のみ（起動メイン）
  'OP14-020': {
    activeAbility: '【起動メイン・ターン1回】自分のカード1枚レスト: コスト5以上のキャラがいる場合、DON!!×3をアクティブに。その後このターン、キャラカードは登場不可',
    hasActiveAbility: true,
    note: '起動メイン効果あり（カード1枚レスト→DON!!×3アクティブ）',
  },
  // 黒黄ゲッコー・モリア OP14-080
  'OP14-080': {
    activeAbility: '【起動メイン・ターン1回】《スリラーバーク海賊団》キャラ1枚をKO: リーダーとキャラすべてパワー+1000（このターン） | 【アタック時】手札3枚捨て（任意）: デッキ上1枚ライフ上に追加',
    hasActiveAbility: true,
  },

  // ────── OP15 ──────────────────────────────────────────────────────
  // 赤緑クリーク OP15-001 — 相手ターン中パッシブ+起動メイン
  'OP15-001': {
    note: '【ドン!!×1】【相手のターン中】自分のキャラが《東の海》キャラのみの場合、相手のキャラすべてパワー-2000',
    activeAbility: '【起動メイン・ターン1回】相手のDON!!が2枚以上付与されているキャラ1枚までをレストにする',
    hasActiveAbility: true,
  },
  // 赤青ルーシー OP15-002 — アタック時/相手アタック時+起動メイン
  'OP15-002': {
    note: '【アタック時】/【相手のアタック時】手札からイベントかステージカードを任意枚数捨てられる: 捨てた枚数×パワー+1000（このバトル中）',
    hasOpponentAttackAbility: true,
    opponentAttackAbility: '【相手のアタック時】手札からイベントかステージカードを任意枚数捨てる: 捨てた枚数×パワー+1000（このバトル中）',
    opponentAttackRequiresDon: 0,
    opponentAttackEffect: 'leaderPower+1000perDiscard',
    activeAbility: '【起動メイン・ターン1回】このターン中、コスト3以上のイベントを発動している場合: 1枚ドロー',
    hasActiveAbility: true,
  },
  // 緑黒ブルック OP15-022 — 特殊敗北ルール+起動メイン
  'OP15-022': {
    note: 'ルール: デッキが0枚でも敗北しない。デッキが0枚になったターン終了時に敗北する',
    activeAbility: '【起動メイン・ターン1回】自分のデッキ上4枚をトラッシュに置く。デッキが0枚の場合、自分のキャラ1枚までアクティブに',
    hasActiveAbility: true,
  },
  // 青レベッカ OP15-039 — アタック不可+起動メイン
  'OP15-039': {
    leaderCannotAttack: true,
    note: 'このリーダーはアタックできない',
    activeAbility: '【起動メイン】このリーダーをレスト＆自分の《ドレスローザ》キャラ1枚を手札に戻せる: 手札からコスト3の《ドレスローザ》キャラ1枚まで登場',
    hasActiveAbility: true,
  },
  // 黄モンキー・D・ルフィ OP15-098 — パッシブ保護効果
  'OP15-098': {
    note: '自分の元々パワー6000以上の《空島》キャラが相手によって場を離れる場合、代わりにライフ上から1枚手札に加えられる',
  },
  // 紫エネル OP15-058 — DON!!デッキ6枚、起動メインで一括追加
  'OP15-058': {
    donDeckInit: 6,
    donMax: 6,
    note: 'DON!!デッキは6枚。ゾーン最大6枚。',
    activeAbility: '【起動メイン・ターン1回】第2ターン以降: DON!!デッキから1枚アクティブ＋最大4枚レストで追加し、レストDON!!4枚まで自分のキャラに付与',
    hasActiveAbility: true,
  },

  // ────── EB / ST ───────────────────────────────────────────────────
  // 赤緑光月おでん EB01-001
  'EB01-001': {
    note: '自分の《ワノ国》キャラでカウンターを持たないもの全員カウンター+1000（ルール） | 【ドン!!×1】【アタック時】コスト5以上の《ワノ国》キャラがいる場合、このリーダーパワー+1000（次自分ターン開始時まで）',
  },
  // 青紫ハンニャバル EB01-021
  'EB01-021': {
    note: 'ターン終了時: コスト2以上の《インペルダウン》キャラ1枚を手札に戻せる: DON!!デッキからDON!!1枚アクティブで追加',
    onEndPhase: 'hannibalEffect',
  },
  // 黒黄キュロス EB01-040
  'EB01-040': {
    activeAbility: '【起動メイン・ターン1回】ライフ上から1枚表向きにできる: コスト0のキャラ1枚までKO',
    hasActiveAbility: true,
  },
  // 緑紫モンキー・D・ルフィ EB02-010 — 起動メイン（DON!!返却→アクティブ+パワーバフ）
  'EB02-010': {
    activeAbility: '【起動メイン・ターン1回】ドン!!-2: 自分のキャラが《麦わらの一味》のみの場合、自分のDON!!2枚までをアクティブにする。その後このリーダーは次の相手ターン終了時まで、パワー+1000',
    hasActiveAbility: true,
  },

  // 赤青ネフェルタリ・ビビ EB03-001
  'EB03-001': {
    note: 'ターン1回: 自分のコスト4以上のキャラがKOされる場合、代わりに手札1枚を捨てることができる | 起動メイン: このリーダーをレスト→相手キャラ1枚パワー-2000（このターン）&【アタック時】効果なしキャラ1枚に【速攻】付与',
    activeAbility: '【起動メイン】このリーダーをレスト: 相手キャラ1枚パワー-2000（このターン）＆【アタック時】効果なしキャラ1枚【速攻】獲得',
    hasActiveAbility: true,
  },
  // 赤黄ジュエリー・ボニー EB04-001
  'EB04-001': {
    note: 'ライフ4枚スタート | 相手ターン中: ライフ1枚以下の場合パワー+2000 | 起動メイン・ターン1回: 相手キャラ1枚パワー-1000（このターン）。ライフ2枚以上の場合、ライフ上から1枚手札に加えられる',
    activeAbility: '【起動メイン・ターン1回】相手キャラ1枚パワー-1000（このターン）。自分のライフが2枚以上の場合、ライフ上から1枚手札に加えることができる',
    hasActiveAbility: true,
  },
  // 赤スターター モンキー・D・ルフィ ST21-001 — 起動メイン（キャラにDON!!付与）
  'ST21-001': {
    activeAbility: '【ドン!!×1】【起動メイン・ターン1回】自分のキャラ1枚にレストDON!!2枚まで付与する',
    hasActiveAbility: true,
  },
  // 黒白スターター エース＆ニューゲート ST22-001 — 起動メイン（白ひげ公開→ドロー）
  'ST22-001': {
    activeAbility: '【起動メイン・ターン1回】手札から《白ひげ海賊団》カード1枚を公開できる: 1枚ドローし、公開したカードをデッキ上に置く',
    hasActiveAbility: true,
  },
  // 赤スターター モンキー・D・ルフィ ST29-001 — アタック時ライフ2枚以下でドロー
  'ST29-001': {
    note: '【アタック時】自分のライフが2枚以下の場合、1枚ドローし手札1枚を捨てる',
  },
  // 赤緑スターター ルフィ&エース ST30-001
  'ST30-001': {
    note: '自分のパワー7000以上のキャラがいる場合このリーダーパワー-2000 | 相手のターン中: 自分の「ポートガス・D・エース」と「モンキー・D・ルフィ」すべてパワー+3000',
  },
};

// ─────────────────────────────────────────────────────
// 初期ゲーム状態
// ─────────────────────────────────────────────────────
function buildInitialState(leader, deckCards, playerOrder) {
  const leaderEff = LEADER_EFFECTS[leader?.card_number] || {};
  const donDeckInit = leaderEff.donDeckInit ?? 10;
  const donMax = leaderEff.donMax ?? donDeckInit;

  const shuffled = shuffle([...deckCards]);
  const lifeCount = leader?.life ?? 5;
  const life = shuffled.splice(0, lifeCount).map(c => ({ ...c, faceDown: true }));
  const hand = shuffled.splice(0, 5);

  return {
    phase: 'mulligan',
    turn: 1,
    subPhase: 'refresh',
    playerOrder: playerOrder || 'first',

    leader: { ...leader, tapped: false, donAttached: 0 },
    deck: shuffled,
    hand,
    life,

    field: [],
    stage: null,

    donDeck: donDeckInit,
    donMax,
    donActive: 0,
    donTapped: 0,
    donLeader: 0,

    leaderEffect: leaderEff,

    trash: [],
    searchReveal: [],   // サーチ効果で一時的に公開したカード
    mulliganCount: 0,
    pendingLifeTrigger: null,   // ライフカードがトリガー付きで手札に来た時にセット
    log: [`ゲーム開始！（${leader?.name}）${leaderEff.note ? ' ⚠ ' + leaderEff.note : ''} マリガンしますか？`],
  };
}

// DON!!自動レスト（カードコスト支払い）
function autoTapDon(prev, cost) {
  if (!cost || cost <= 0) return prev;
  const n = Math.min(cost, prev.donActive);
  if (n <= 0) return prev;
  return { ...prev, donActive: prev.donActive - n, donTapped: prev.donTapped + n };
}

// ─────────────────────────────────────────────────────
// useGameState フック
// ─────────────────────────────────────────────────────
export function useGameState() {
  const [state, setState] = useState(null);

  const addLog = useCallback((msg, prev) => ({
    ...prev,
    log: [msg, ...prev.log].slice(0, 60),
  }), []);

  const startGame = useCallback((leader, deckEntries, playerOrder) => {
    const cards = expandDeck(deckEntries);
    setState(buildInitialState(leader, cards, playerOrder));
  }, []);

  const mulligan = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const combined = shuffle([...prev.hand, ...prev.deck]);
      const hand = combined.splice(0, 5);
      const ns = { ...prev, deck: combined, hand, mulliganCount: prev.mulliganCount + 1 };
      return addLog(`マリガン（${ns.mulliganCount}回目）`, ns);
    });
  }, [addLog]);

  const startMainGame = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const label = prev.playerOrder === 'first' ? '先行' : '後攻';
      const effNote = prev.leaderEffect?.note ? ` ⚠ ${prev.leaderEffect.note}` : '';
      return addLog(`ゲーム開始！（${label}）リフレッシュフェイズへ${effNote}`, {
        ...prev, phase: 'game', subPhase: 'refresh',
      });
    });
  }, [addLog]);

  // ─── フェイズ進行 ───
  const advancePhase = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'game') return prev;
      const { subPhase, turn, playerOrder, leaderEffect } = prev;

      // リフレッシュ → ドロー
      if (subPhase === 'refresh') {
        // フィールドのキャラクターからDONを回収
        const donFromField = prev.field.reduce((sum, c) => sum + (c.donAttached || 0), 0);
        const newField = prev.field.map(c => ({ ...c, tapped: false, donAttached: 0 }));
        // リーダーからDONを回収
        const donFromLeader = prev.leader.donAttached || 0;
        const newLeader = { ...prev.leader, tapped: false, donAttached: 0 };
        // レストDON + アタッチDONをすべてアクティブへ
        const restored = prev.donTapped + donFromField + donFromLeader;
        const logs = [];
        if (prev.donTapped > 0)   logs.push(`レストDON!!×${prev.donTapped}`);
        if (donFromField > 0)     logs.push(`キャラアタッチDON!!×${donFromField}`);
        if (donFromLeader > 0)    logs.push(`リーダーアタッチDON!!×${donFromLeader}`);
        return addLog(
          `リフレッシュ: 全カードアンタップ${restored > 0 ? `・DON!!×${restored}アクティブへ（${logs.join('、')}）` : ''}`,
          {
            ...prev,
            subPhase: 'draw',
            field: newField,
            leader: newLeader,
            donActive: prev.donActive + restored,
            donTapped: 0,
            donLeader: 0,
          }
        );
      }

      // ドロー → DON!!
      if (subPhase === 'draw') {
        const skipDraw = turn === 1 && playerOrder === 'first';
        if (skipDraw) {
          return addLog('ドロー: 先行1ターン目はスキップ', { ...prev, subPhase: 'don' });
        }
        if (prev.deck.length === 0) {
          return addLog('デッキ切れ！ドロー不可', { ...prev, subPhase: 'don' });
        }
        const [drawn, ...newDeck] = prev.deck;
        return addLog(`ドロー:「${drawn.name}」`, { ...prev, subPhase: 'don', deck: newDeck, hand: [...prev.hand, drawn] });
      }

      // DON!! → メイン（リーダー効果によるdonMaxを考慮）
      if (subPhase === 'don') {
        const gain = turn === 1 ? 1 : 2;
        // donMaxを超えないように制限（active+tappedの合計がdonMax以下）
        const currentInZone = prev.donActive + prev.donTapped;
        const canAdd = Math.max(0, prev.donMax - currentInZone);
        const actual = Math.min(gain, prev.donDeck, canAdd);
        const limitNote = actual < gain && canAdd < gain ? ` （DON!!最大${prev.donMax}枚制限）` : '';
        return addLog(`DON!!フェイズ: +${actual}枚補充${limitNote}`, {
          ...prev, subPhase: 'main', donDeck: prev.donDeck - actual, donActive: prev.donActive + actual,
        });
      }

      // メイン → エンド
      if (subPhase === 'main') {
        return addLog('エンドフェイズ', { ...prev, subPhase: 'end' });
      }

      // エンド → 次ターンのリフレッシュ（リーダー効果のエンドフェイズ処理）
      if (subPhase === 'end') {
        let ns = prev;
        const eff = leaderEffect?.onEndPhase;

        // ニューゲート効果: ライフ上から1枚→手札
        if (eff === 'lifeTopToHand' && ns.life.length > 0) {
          const [top, ...rest] = ns.life;
          ns = addLog(`【リーダー効果】ライフ上「${top.name}」を手札に加える`, {
            ...ns,
            life: rest,
            hand: [...ns.hand, { ...top, faceDown: false }],
            // ライフカードにトリガーがあれば通知フラグをセット
            pendingLifeTrigger: hasTrigger(top) ? top : ns.pendingLifeTrigger,
          });
        }

        // ドフラミンゴ効果: タップ済みDON!!×2をアクティブに
        if (eff === 'activateDon2' && ns.donTapped > 0) {
          const activate = Math.min(2, ns.donTapped);
          ns = addLog(`【リーダー効果】タップ済みDON!!×${activate}をアクティブに`, {
            ...ns, donTapped: ns.donTapped - activate, donActive: ns.donActive + activate,
          });
        }

        const nextTurn = ns.turn + 1;
        return addLog(`ターン${nextTurn} 開始`, { ...ns, turn: nextTurn, subPhase: 'refresh' });
      }

      return prev;
    });
  }, [addLog]);

  // ─── エネル起動メイン能力（手動トリガー）───
  // 第2ターン以降: DON!!デッキから1枚アクティブ＋最大4枚レストで追加
  const useEnelAbility = useCallback((activeCount, restedCount) => {
    setState(prev => {
      if (!prev || prev.turn < 2) return addLog('エネル効果は第2ターン以降に使用できます', prev);
      const actualActive = Math.min(activeCount, 1, prev.donDeck);
      const remDeck = prev.donDeck - actualActive;
      const currentInZone = prev.donActive + prev.donTapped + actualActive;
      const canRest = Math.max(0, prev.donMax - currentInZone);
      const actualRested = Math.min(restedCount, 4, remDeck, canRest);
      return addLog(
        `【エネル効果】DON!!デッキから+${actualActive}アクティブ、+${actualRested}レストで追加`,
        {
          ...prev,
          donDeck: remDeck - actualRested,
          donActive: prev.donActive + actualActive,
          donTapped: prev.donTapped + actualRested,
        }
      );
    });
  }, [addLog]);

  // ─── ミホーク起動メイン: DON!!×3アクティブ化 ───
  const useMihawkAbility = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      // 自分のカード1枚レスト → DON!!×3アクティブ（フィールドかリーダー）
      const activate = Math.min(3, prev.donTapped);
      let ns = { ...prev, donActive: prev.donActive + activate, donTapped: prev.donTapped - activate };
      if (cardUid === 'leader') {
        ns = { ...ns, leader: { ...ns.leader, tapped: true } };
      } else {
        ns = { ...ns, field: ns.field.map(c => c._uid === cardUid ? { ...c, tapped: true } : c) };
      }
      return addLog(`【ミホーク効果】カードをレスト→DON!!×${activate}アクティブに（このターンキャラ登場不可）`, ns);
    });
  }, [addLog]);

  // ─── フィールドカードにDON!!複数アタッチ（レストDONから）───
  const attachDonToFieldMulti = useCallback((cardUid, count) => {
    setState(prev => {
      if (!prev) return prev;
      const card = prev.field.find(c => c._uid === cardUid);
      if (!card) return prev;
      const actualCount = Math.min(count, prev.donTapped);
      if (actualCount <= 0) return addLog('アタッチできるレストDON!!がありません', prev);
      const newField = prev.field.map(c =>
        c._uid === cardUid ? { ...c, donAttached: (c.donAttached || 0) + actualCount } : c
      );
      return addLog(`「${card.name}」にDON!!×${actualCount}アタッチ（レストから）`, {
        ...prev, donTapped: prev.donTapped - actualCount, field: newField,
      });
    });
  }, [addLog]);

  // ─── スモーカー起動メイン: レストDON!!×2をアクティブ化 ───
  const useSmokerAbility = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const hasPower7k = prev.field.some(c => (c.power || 0) >= 7000);
      if (!hasPower7k) return addLog('パワー7000以上のキャラがいません（スモーカー効果不発）', prev);
      const activate = Math.min(2, prev.donTapped);
      if (activate <= 0) return addLog('レストDON!!がありません（スモーカー効果）', prev);
      return addLog(`【スモーカー効果】レストDON!!×${activate}をアクティブに`, {
        ...prev, donTapped: prev.donTapped - activate, donActive: prev.donActive + activate,
      });
    });
  }, [addLog]);

  // ─── サカズキ起動メイン: 1ドロー（手動で手札1枚トラッシュ）───
  const useAkainuAbility = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      if (prev.deck.length === 0) return addLog('デッキにカードがありません（サカズキ効果）', prev);
      const [drawn, ...newDeck] = prev.deck;
      return addLog(`【サカズキ効果】1枚ドロー「${drawn.name}」→手動で手札1枚をトラッシュしてください`, {
        ...prev, deck: newDeck, hand: [...prev.hand, drawn],
      });
    });
  }, [addLog]);

  // ─── カードプレイ（DON!!自動レスト）───
  const playToField = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      if (prev.field.length >= 5) return addLog('フィールドが満員（最大5枚）', prev);
      const idx = prev.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = prev.hand[idx];
      if (card.card_type !== 'CHARACTER') return addLog('キャラクターのみフィールドに出せます', prev);
      const cost = card.cost || 0;
      const afterDon = autoTapDon(prev, cost);
      const newHand = afterDon.hand.filter((_, i) => i !== idx);
      const newField = [...afterDon.field, { ...card, tapped: false, donAttached: 0 }];
      const donLog = cost > 0 ? `（コスト${cost}→DON!!×${Math.min(cost, prev.donActive)}レスト）` : '';
      return addLog(`「${card.name}」をフィールドに出した${donLog}`, { ...afterDon, hand: newHand, field: newField });
    });
  }, [addLog]);

  const playStage = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const idx = prev.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = prev.hand[idx];
      if (card.card_type !== 'STAGE') return addLog('ステージカードではありません', prev);
      const cost = card.cost || 0;
      const afterDon = autoTapDon(prev, cost);
      const newHand = afterDon.hand.filter((_, i) => i !== idx);
      const newTrash = afterDon.stage ? [...afterDon.trash, afterDon.stage] : afterDon.trash;
      const donLog = cost > 0 ? `（コスト${cost}→DON!!レスト）` : '';
      return addLog(`ステージ「${card.name}」をプレイ${donLog}`, { ...afterDon, hand: newHand, stage: card, trash: newTrash });
    });
  }, [addLog]);

  const toggleFieldCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const card = prev.field.find(c => c._uid === cardUid);
      const newField = prev.field.map(c => c._uid === cardUid ? { ...c, tapped: !c.tapped } : c);
      return addLog(`「${card?.name}」を${card?.tapped ? 'アンタップ' : 'タップ（アタック）'}`, { ...prev, field: newField });
    });
  }, [addLog]);

  const toggleLeader = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      if (prev.leaderEffect?.leaderCannotAttack && !prev.leader.tapped) {
        return addLog(`【${prev.leader.name}】はアタックできません（リーダー効果）`, prev);
      }
      const tapped = !prev.leader.tapped;
      return addLog(`リーダーを${tapped ? 'タップ（アタック）' : 'アンタップ'}`, { ...prev, leader: { ...prev.leader, tapped } });
    });
  }, [addLog]);

  const trashFieldCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const card = prev.field.find(c => c._uid === cardUid);
      if (!card) return prev;
      const attached = card.donAttached || 0;
      const newField = prev.field.filter(c => c._uid !== cardUid);
      return addLog(
        `「${card.name}」をKO→トラッシュ${attached > 0 ? `（DON!!×${attached}アクティブに返還）` : ''}`,
        { ...prev, field: newField, trash: [...prev.trash, card], donActive: prev.donActive + attached }
      );
    });
  }, [addLog]);

  const trashHandCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const idx = prev.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = prev.hand[idx];
      const isEvent = card.card_type === 'EVENT';
      const cost = isEvent ? (card.cost || 0) : 0;
      const afterDon = autoTapDon(prev, cost);
      const newHand = afterDon.hand.filter((_, i) => i !== idx);
      const label = isEvent ? `イベント「${card.name}」使用` : `「${card.name}」を手札からトラッシュ`;
      const donLog = (isEvent && cost > 0) ? `（コスト${cost}→DON!!×${Math.min(cost, prev.donActive)}レスト）` : '';
      return addLog(`${label}${donLog}`, { ...afterDon, hand: newHand, trash: [...afterDon.trash, card] });
    });
  }, [addLog]);

  const drawCard = useCallback((count = 1) => {
    setState(prev => {
      if (!prev || prev.deck.length === 0) return prev;
      const n = Math.min(count, prev.deck.length);
      return addLog(`${n}枚ドロー`, { ...prev, deck: prev.deck.slice(n), hand: [...prev.hand, ...prev.deck.slice(0, n)] });
    });
  }, [addLog]);

  const tapDon = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      const n = Math.min(count, prev.donActive);
      if (n <= 0) return addLog('レストできるDON!!がありません', prev);
      return addLog(`DON!!×${n}をレスト`, { ...prev, donActive: prev.donActive - n, donTapped: prev.donTapped + n });
    });
  }, [addLog]);

  const attachDonToLeader = useCallback(() => {
    setState(prev => {
      if (!prev || prev.donActive <= 0) return addLog('アクティブDON!!がありません', prev || {});
      return addLog('DON!!をリーダーにアタッチ', {
        ...prev, donActive: prev.donActive - 1, donLeader: prev.donLeader + 1,
        leader: { ...prev.leader, donAttached: (prev.leader.donAttached || 0) + 1 },
      });
    });
  }, [addLog]);

  const attachDonToField = useCallback((cardUid) => {
    setState(prev => {
      if (!prev || prev.donActive <= 0) return addLog('アクティブDON!!がありません', prev);
      const card = prev.field.find(c => c._uid === cardUid);
      if (!card) return prev;
      const newField = prev.field.map(c => c._uid === cardUid ? { ...c, donAttached: (c.donAttached || 0) + 1 } : c);
      return addLog(`「${card.name}」にDON!!アタッチ`, { ...prev, donActive: prev.donActive - 1, field: newField });
    });
  }, [addLog]);

  // ─── アクティブDON!!をDON!!デッキに返却 ───
  const returnDonToDeck = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      const n = Math.min(count, prev.donActive);
      if (n <= 0) return addLog('返却できるアクティブDON!!がありません', prev);
      return addLog(`アクティブDON!!×${n}をDON!!デッキに返却`, { ...prev, donActive: prev.donActive - n, donDeck: prev.donDeck + n });
    });
  }, [addLog]);

  // ─── レストDON!!をDON!!デッキに返却 ───
  const returnTappedDonToDeck = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      const n = Math.min(count, prev.donTapped);
      if (n <= 0) return addLog('返却できるレストDON!!がありません', prev);
      return addLog(`レストDON!!×${n}をDON!!デッキに返却`, { ...prev, donTapped: prev.donTapped - n, donDeck: prev.donDeck + n });
    });
  }, [addLog]);

  // ─── DON!!をデッキに戻す（優先度付き）────────────────
  // 優先度: ①レストDON → ②レスト中リーダー/キャラのDON → ③アクティブDON → ④アクティブリーダー/キャラのDON
  const returnDonToDeckPriority = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      let rem = count;
      let ns = { ...prev };
      const logs = [];

      // take: rem減算 & donDeck増加 & ログ追記 をまとめて行うクロージャ
      const take = (n, label) => {
        ns = { ...ns, donDeck: ns.donDeck + n };
        logs.push(`${label}×${n}`);
        rem -= n;
      };

      // ① レストDON
      if (rem > 0 && ns.donTapped > 0) {
        const n = Math.min(rem, ns.donTapped);
        ns = { ...ns, donTapped: ns.donTapped - n };
        take(n, 'レストDON!!');
      }

      // ② レスト中リーダーのDON
      if (rem > 0 && ns.leader.tapped && (ns.leader.donAttached || 0) > 0) {
        const n = Math.min(rem, ns.leader.donAttached);
        ns = { ...ns, leader: { ...ns.leader, donAttached: ns.leader.donAttached - n }, donLeader: ns.donLeader - n };
        take(n, 'レストリーダーのDON!!');
      }

      // ② レスト中キャラのDON
      if (rem > 0) {
        const newField = [...ns.field];
        for (let i = 0; i < newField.length && rem > 0; i++) {
          const c = newField[i];
          if (!c.tapped || (c.donAttached || 0) <= 0) continue;
          const n = Math.min(rem, c.donAttached);
          newField[i] = { ...c, donAttached: c.donAttached - n };
          take(n, `「${c.name}」(レスト)のDON!!`);
        }
        ns = { ...ns, field: newField };
      }

      // ③ アクティブDON
      if (rem > 0 && ns.donActive > 0) {
        const n = Math.min(rem, ns.donActive);
        ns = { ...ns, donActive: ns.donActive - n };
        take(n, 'アクティブDON!!');
      }

      // ④ アクティブ中リーダーのDON
      if (rem > 0 && !ns.leader.tapped && (ns.leader.donAttached || 0) > 0) {
        const n = Math.min(rem, ns.leader.donAttached);
        ns = { ...ns, leader: { ...ns.leader, donAttached: ns.leader.donAttached - n }, donLeader: ns.donLeader - n };
        take(n, 'アクティブリーダーのDON!!');
      }

      // ④ アクティブ中キャラのDON
      if (rem > 0) {
        const newField = [...ns.field];
        for (let i = 0; i < newField.length && rem > 0; i++) {
          const c = newField[i];
          if (c.tapped || (c.donAttached || 0) <= 0) continue;
          const n = Math.min(rem, c.donAttached);
          newField[i] = { ...c, donAttached: c.donAttached - n };
          take(n, `「${c.name}」(アクティブ)のDON!!`);
        }
        ns = { ...ns, field: newField };
      }

      const actual = count - rem;
      if (actual <= 0) return addLog('返却できるDON!!がありません', prev);
      return addLog(`DON!!×${actual}をDON!!デッキに返却（${logs.join('、')}）`, ns);
    });
  }, [addLog]);

  // ─── リーダーのDON!!アタッチを外す ───
  const detachDonFromLeader = useCallback(() => {
    setState(prev => {
      if (!prev || (prev.leader.donAttached || 0) <= 0) return addLog('リーダーにアタッチされたDON!!がありません', prev || {});
      const removed = 1;
      return addLog('リーダーからDON!!を外す（アクティブへ返還）', {
        ...prev,
        donActive: prev.donActive + removed,
        donLeader: prev.donLeader - removed,
        leader: { ...prev.leader, donAttached: prev.leader.donAttached - removed },
      });
    });
  }, [addLog]);

  // ─── フィールドカードのDON!!アタッチを外す ───
  const detachDonFromField = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const card = prev.field.find(c => c._uid === cardUid);
      if (!card || (card.donAttached || 0) <= 0) return addLog('このキャラにアタッチされたDON!!がありません', prev);
      const newField = prev.field.map(c =>
        c._uid === cardUid ? { ...c, donAttached: (c.donAttached || 0) - 1 } : c
      );
      return addLog(`「${card.name}」からDON!!を外す（アクティブへ返還）`, {
        ...prev, field: newField, donActive: prev.donActive + 1,
      });
    });
  }, [addLog]);

  // ─── 手札カードをデッキトップに戻す ───
  const returnHandToTop = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const idx = prev.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = prev.hand[idx];
      const newHand = prev.hand.filter((_, i) => i !== idx);
      return addLog(`「${card.name}」をデッキトップに戻す`, { ...prev, hand: newHand, deck: [card, ...prev.deck] });
    });
  }, [addLog]);

  // ─── 手札カードをデッキボトムに戻す ───
  const returnHandToBottom = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const idx = prev.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = prev.hand[idx];
      const newHand = prev.hand.filter((_, i) => i !== idx);
      return addLog(`「${card.name}」をデッキボトムに戻す`, { ...prev, hand: newHand, deck: [...prev.deck, card] });
    });
  }, [addLog]);

  // ─── フィールドカードをデッキトップに戻す（アタッチDON!!返還）───
  const returnFieldToTop = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const card = prev.field.find(c => c._uid === cardUid);
      if (!card) return prev;
      const attached = card.donAttached || 0;
      const newField = prev.field.filter(c => c._uid !== cardUid);
      const cleanCard = { ...card, tapped: false, donAttached: 0, _uid: card._uid };
      return addLog(
        `「${card.name}」をデッキトップに戻す${attached > 0 ? `（DON!!×${attached}アクティブに返還）` : ''}`,
        { ...prev, field: newField, deck: [cleanCard, ...prev.deck], donActive: prev.donActive + attached }
      );
    });
  }, [addLog]);

  // ─── フィールドカードをデッキボトムに戻す（アタッチDON!!返還）───
  const returnFieldToBottom = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const card = prev.field.find(c => c._uid === cardUid);
      if (!card) return prev;
      const attached = card.donAttached || 0;
      const newField = prev.field.filter(c => c._uid !== cardUid);
      const cleanCard = { ...card, tapped: false, donAttached: 0, _uid: card._uid };
      return addLog(
        `「${card.name}」をデッキボトムに戻す${attached > 0 ? `（DON!!×${attached}アクティブに返還）` : ''}`,
        { ...prev, field: newField, deck: [...prev.deck, cleanCard], donActive: prev.donActive + attached }
      );
    });
  }, [addLog]);

  // ─── サーチ効果：デッキトップN枚を公開 ───────────────────────
  const beginSearch = useCallback((n) => {
    setState(prev => {
      if (!prev) return prev;
      const count = Math.min(n, prev.deck.length);
      if (count === 0) return addLog('デッキにカードがありません', prev);
      const revealed = prev.deck.slice(0, count).map(c => ({ ...c }));
      const remaining = prev.deck.slice(count);
      return addLog(`サーチ：デッキトップ${count}枚を確認`, {
        ...prev, deck: remaining, searchReveal: revealed,
      });
    });
  }, [addLog]);

  // ─── サーチ効果：選択結果を適用 ──────────────────────────────
  // toHand      : 手札に加えるカードの _uid 配列
  // toDeckTop   : デッキトップに戻すカードの _uid 配列（先頭=一番上）
  // toDeckBottom: デッキボトムに戻すカードの _uid 配列
  const resolveSearch = useCallback(({ toHand = [], toDeckTop = [], toDeckBottom = [] }) => {
    setState(prev => {
      if (!prev) return prev;
      const all = prev.searchReveal;
      const pick = (uids) => uids.map(uid => all.find(c => c._uid === uid)).filter(Boolean);
      const handCards   = pick(toHand);
      const topCards    = pick(toDeckTop);    // index 0 が一番上に来る
      const bottomCards = pick(toDeckBottom);
      // 未割り当て（念のため）
      const assigned = new Set([...toHand, ...toDeckTop, ...toDeckBottom]);
      const unassigned = all.filter(c => !assigned.has(c._uid));
      // デッキトップ → 配列の先頭が一番上になるよう reverse して unshift
      const newDeck = [
        ...topCards.slice().reverse(), // topCards[0] が最終的にtopになるよう逆順に積む
        ...prev.deck,
        ...bottomCards,
        ...unassigned,  // 未割り当ては底に
      ];
      const parts = [];
      if (handCards.length)   parts.push(`手札${handCards.length}枚`);
      if (topCards.length)    parts.push(`デッキトップ${topCards.length}枚`);
      if (bottomCards.length) parts.push(`デッキボトム${bottomCards.length}枚`);
      return addLog(`サーチ完了：${parts.join('、')}`, {
        ...prev,
        hand: [...prev.hand, ...handCards],
        deck: newDeck,
        searchReveal: [],
      });
    });
  }, [addLog]);

  // ─── デッキシャッフル ─────────────────────────────────────
  const shuffleDeck = useCallback(() => {
    setState(prev => {
      if (!prev || prev.deck.length === 0) return prev;
      const shuffled = shuffle([...prev.deck]);
      return addLog(`デッキをシャッフル（${shuffled.length}枚）`, { ...prev, deck: shuffled });
    });
  }, [addLog]);

  // ─── DON!!全レスト（相手アタック時など）─────────────────────
  const tapAllDon = useCallback(() => {
    setState(prev => {
      if (!prev || prev.donActive === 0) return addLog('アクティブDON!!がありません', prev || {});
      const n = prev.donActive;
      return addLog(`DON!!×${n}を全てレスト`, {
        ...prev, donActive: 0, donTapped: prev.donTapped + n,
      });
    });
  }, [addLog]);

  // ─── DON!!全アクティブ（手動リフレッシュ）──────────────────
  const activateAllDon = useCallback(() => {
    setState(prev => {
      if (!prev || prev.donTapped === 0) return addLog('レストDON!!がありません', prev || {});
      const n = prev.donTapped;
      return addLog(`DON!!×${n}を全てアクティブ`, {
        ...prev, donTapped: 0, donActive: prev.donActive + n,
      });
    });
  }, [addLog]);

  // ─── トラッシュからデッキに戻す ──────────────────────────
  const returnTrashToDeckTop = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const card = prev.trash.find(c => c._uid === cardUid);
      if (!card) return prev;
      const cleanCard = { ...card, tapped: false, donAttached: 0 };
      return addLog(`「${card.name}」をトラッシュからデッキトップへ`, {
        ...prev, trash: prev.trash.filter(c => c._uid !== cardUid),
        deck: [cleanCard, ...prev.deck],
      });
    });
  }, [addLog]);

  const returnTrashToHand = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const card = prev.trash.find(c => c._uid === cardUid);
      if (!card) return prev;
      const cleanCard = { ...card, tapped: false, donAttached: 0 };
      return addLog(`「${card.name}」をトラッシュから手札へ`, {
        ...prev, trash: prev.trash.filter(c => c._uid !== cardUid),
        hand: [...prev.hand, cleanCard],
      });
    });
  }, [addLog]);

  // ─── ステージをトラッシュ ────────────────────────────────
  const trashStage = useCallback(() => {
    setState(prev => {
      if (!prev || !prev.stage) return prev;
      return addLog(`ステージ「${prev.stage.name}」をトラッシュ`, {
        ...prev, trash: [...prev.trash, prev.stage], stage: null,
      });
    });
  }, [addLog]);

  // ─── 効果でキャラを手札からフィールドに無料登場 ──────────────
  const playFromHandFree = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      if (prev.field.length >= 5) return addLog('フィールドが満員（最大5枚）', prev);
      const idx = prev.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = prev.hand[idx];
      if (card.card_type !== 'CHARACTER') return addLog('キャラクターのみフィールドに出せます', prev);
      const newHand = prev.hand.filter((_, i) => i !== idx);
      const newField = [...prev.field, { ...card, tapped: false, donAttached: 0 }];
      return addLog(`（効果）「${card.name}」をフィールドに登場（コスト無し）`, { ...prev, hand: newHand, field: newField });
    });
  }, [addLog]);

  // ─── 効果でキャラをトラッシュからフィールドに無料登場 ────────
  const playFromTrashFree = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      if (prev.field.length >= 5) return addLog('フィールドが満員（最大5枚）', prev);
      const card = prev.trash.find(c => c._uid === cardUid);
      if (!card) return prev;
      if (card.card_type !== 'CHARACTER') return addLog('キャラクターのみフィールドに出せます', prev);
      const newTrash = prev.trash.filter(c => c._uid !== cardUid);
      const newField = [...prev.field, { ...card, tapped: false, donAttached: 0 }];
      return addLog(`（効果）「${card.name}」をトラッシュからフィールドに登場`, { ...prev, trash: newTrash, field: newField });
    });
  }, [addLog]);

  // ─── 効果でデッキトップをライフに追加 ───────────────────────
  const addLife = useCallback(() => {
    setState(prev => {
      if (!prev || prev.deck.length === 0) return addLog('デッキにカードがありません', prev || {});
      const [top, ...newDeck] = prev.deck;
      return addLog(`（効果）「${top.name}」をライフに追加（ライフ${prev.life.length + 1}枚）`, {
        ...prev, deck: newDeck, life: [...prev.life, { ...top, faceDown: true }],
      });
    });
  }, [addLog]);

  const cancelSearch = useCallback(() => {
    setState(prev => {
      if (!prev || prev.searchReveal.length === 0) return prev;
      // キャンセル時はデッキトップに戻す
      return addLog('サーチをキャンセル（デッキトップに戻す）', {
        ...prev,
        deck: [...prev.searchReveal, ...prev.deck],
        searchReveal: [],
      });
    });
  }, [addLog]);

  const flipLife = useCallback(() => {
    setState(prev => {
      if (!prev || prev.life.length === 0) return prev;
      const [top, ...rest] = prev.life;
      const triggered = hasTrigger(top);
      return addLog(`ライフをめくる →「${top.name}」（残り${rest.length}枚）${triggered ? ' 【トリガー】！' : ''}`, {
        ...prev,
        life: rest,
        hand: [...prev.hand, { ...top, faceDown: false }],
        // トリガー付きのライフカードが手札に来たことを通知
        pendingLifeTrigger: triggered ? top : prev.pendingLifeTrigger,
      });
    });
  }, [addLog]);

  /** トリガートースト表示後にフラグをクリア */
  const clearLifeTrigger = useCallback(() => {
    setState(prev => prev ? { ...prev, pendingLifeTrigger: null } : prev);
  }, []);

  const resetGame = useCallback(() => setState(null), []);

  return {
    state, startGame, mulligan, startMainGame, advancePhase,
    playToField, playStage, toggleFieldCard, toggleLeader,
    trashFieldCard, trashHandCard, drawCard, tapDon,
    attachDonToLeader, attachDonToField,
    returnDonToDeck, returnTappedDonToDeck, returnDonToDeckPriority,
    detachDonFromLeader, detachDonFromField,
    returnHandToTop, returnHandToBottom,
    returnFieldToTop, returnFieldToBottom,
    flipLife, clearLifeTrigger,
    beginSearch, resolveSearch, cancelSearch,
    shuffleDeck, tapAllDon, activateAllDon,
    returnTrashToDeckTop, returnTrashToHand, trashStage,
    useEnelAbility, useMihawkAbility, attachDonToFieldMulti, useSmokerAbility, useAkainuAbility,
    playFromHandFree, playFromTrashFree, addLife,
    resetGame,
  };
}
