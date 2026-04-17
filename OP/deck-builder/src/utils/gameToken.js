// ─────────────────────────────────────────────────────────────────────────
// src/utils/gameToken.js
//
// JWT ライクなメッセージ署名ユーティリティ
// Web Crypto API のみ使用（外部ライブラリ不要）
//
// 設計:
//   - ルームコードを共有シークレットとして HMAC-SHA256 で署名
//   - ホスト・ゲスト双方がルームコードを知っているため検証可能
//   - リプレイ攻撃対策: timestamp + nonce を payload に含める
//   - 5分以上古いメッセージは検証失敗扱い
// ─────────────────────────────────────────────────────────────────────────

const SALT = 'ONEPIECE_CARD_PVP_v1';
const MAX_AGE_MS = 5 * 60 * 1000; // 5分

/**
 * ルームコードから HMAC 署名キーを派生させる
 * @param {string} roomCode
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(roomCode) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`${SALT}_${roomCode}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return keyMaterial;
}

/**
 * ペイロードに署名して返す
 *
 * @param {object} payload - 署名するデータ（任意のオブジェクト）
 * @param {string} roomCode - ルームコード（共有シークレット）
 * @returns {Promise<object>} 署名済みメッセージ { ...payload, _ts, _nonce, _sig }
 *
 * @example
 * const msg = await signMessage({ type: 'PLAY_CARD', cardId: 'OP01-001' }, 'A3F9B2');
 * ws.send(JSON.stringify(msg));
 */
export async function signMessage(payload, roomCode) {
  const _ts    = Date.now();
  const _nonce = crypto.randomUUID();

  // 署名対象は payload + タイムスタンプ + nonce
  const toSign = { ...payload, _ts, _nonce };

  const key  = await deriveKey(roomCode);
  const data = new TextEncoder().encode(JSON.stringify(toSign));
  const sig  = await crypto.subtle.sign('HMAC', key, data);

  const _sig = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return { ...toSign, _sig };
}

/**
 * 受信メッセージの署名を検証する
 *
 * @param {object} signedMessage - 受信した署名済みメッセージ
 * @param {string} roomCode - ルームコード（共有シークレット）
 * @returns {Promise<boolean>} 検証成功なら true
 *
 * @example
 * const valid = await verifyMessage(received, roomCode);
 * if (!valid) return; // 不正メッセージを無視
 */
export async function verifyMessage(signedMessage, roomCode) {
  try {
    const { _sig, ...payload } = signedMessage;
    if (!_sig) return false;

    // タイムスタンプ検証（5分以上古いメッセージは拒否）
    if (!payload._ts || Date.now() - payload._ts > MAX_AGE_MS) return false;

    const key      = await deriveKey(roomCode);
    const sigBytes = Uint8Array.from(atob(_sig), c => c.charCodeAt(0));
    const data     = new TextEncoder().encode(JSON.stringify(payload));

    return await crypto.subtle.verify('HMAC', key, sigBytes, data);
  } catch {
    return false;
  }
}

/**
 * デッキのハッシュを生成（改ざん検知・デッキ一致確認用）
 *
 * @param {Array} cards - カード配列（card_number フィールドを使用）
 * @returns {Promise<string>} 16文字の Base64 ハッシュ
 */
export async function hashDeck(cards) {
  const cardNumbers = (cards || [])
    .map(c => c.card_number || c.id)
    .filter(Boolean)
    .sort()
    .join(',');

  const data = new TextEncoder().encode(cardNumbers);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash))).slice(0, 16);
}

/**
 * ゲームアクションの種別定数
 * クライアント ↔ PartyKit サーバー間で使用するメッセージタイプ
 */
export const ACTION = {
  // ─── ルーム管理 ───────────────────────────────────────────────────────
  PLAYER_HELLO:   'PLAYER_HELLO',   // 接続時の自己紹介
  ROOM_STATE:     'ROOM_STATE',     // サーバーからのルーム状態通知
  OPPONENT_JOINED:'OPPONENT_JOINED',// 相手が参加した
  OPPONENT_LEFT:  'OPPONENT_LEFT',  // 相手が退室した
  ROOM_FULL:      'ROOM_FULL',      // ルーム満員エラー
  PING:           'PING',
  PONG:           'PONG',

  // ─── 対戦準備 ─────────────────────────────────────────────────────────
  GAME_READY:     'GAME_READY',     // 対戦準備完了（デッキハッシュ共有）
  COIN_TOSS:      'COIN_TOSS',      // コイントス結果（先行/後攻決定）

  // ─── ゲームアクション ─────────────────────────────────────────────────
  DRAW:           'DRAW',           // カードをドロー
  PLAY_CARD:      'PLAY_CARD',      // キャラ/イベント/ステージをプレイ
  ATTACH_DON:     'ATTACH_DON',     // DON!!をキャラにアタッチ
  REST_DON:       'REST_DON',       // DON!!をレスト
  ATTACK:         'ATTACK',         // アタック宣言
  COUNTER:        'COUNTER',        // カウンター宣言
  BLOCK:          'BLOCK',          // ブロック宣言
  TRIGGER:        'TRIGGER',        // トリガー発動
  END_TURN:       'END_TURN',       // ターン終了
  SURRENDER:      'SURRENDER',      // 投了

  // ─── 効果処理 ─────────────────────────────────────────────────────────
  TRASH_CARD:     'TRASH_CARD',     // トラッシュに送る
  BOUNCE_CARD:    'BOUNCE_CARD',    // 手札に戻す
  KO_CARD:        'KO_CARD',        // KO処理
  LIFE_DAMAGE:    'LIFE_DAMAGE',    // ライフダメージ
  TRIGGER_REVEAL: 'TRIGGER_REVEAL', // トリガー公開
};
