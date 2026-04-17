// ─────────────────────────────────────────────────────────────────────────
// src/hooks/usePvPConnection.js
//
// PvP WebSocket 接続管理フック
//
// 役割:
//   - PartyKit サーバーへの WebSocket 接続・再接続
//   - ゲームアクションの送信（HMAC署名付き）
//   - 受信メッセージの検証・ディスパッチ
//   - 接続状態・相手の接続状態の管理
// ─────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { signMessage, verifyMessage, ACTION } from '../utils/gameToken';

// PartyKit ホスト（環境変数 or ローカル開発用デフォルト）
const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST
  ?? 'onepiece-card-pvp.ko1031.partykit.dev';

const RECONNECT_DELAY = 2000;   // 再接続までの待機 (ms)
const MAX_RECONNECT   = 5;       // 最大再接続試行回数
const PING_INTERVAL   = 20000;  // PING 送信間隔 (ms)

/**
 * PvP WebSocket 接続フック
 *
 * @param {object} options
 * @param {string|null}   options.roomCode        - ルームコード（接続開始の合図）
 * @param {string}        options.playerId        - 'host' | 'guest'
 * @param {boolean}       options.enabled         - false のときは接続しない
 * @param {function}      options.onGameAction    - ゲームアクション受信コールバック (actionType, payload)
 * @param {function}      options.onOpponentJoin  - 相手接続コールバック (opponentId)
 * @param {function}      options.onOpponentLeave - 相手切断コールバック
 * @param {function}      options.onRoomFull      - ルーム満員コールバック
 *
 * @returns {{
 *   connected: boolean,
 *   opponentConnected: boolean,
 *   sendAction: (actionType: string, payload?: object) => Promise<boolean>,
 *   disconnect: () => void,
 * }}
 */
export function usePvPConnection({
  roomCode,
  playerId,
  enabled = true,
  onGameAction,
  onOpponentJoin,
  onOpponentLeave,
  onRoomFull,
}) {
  const [connected,         setConnected]         = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);

  const wsRef          = useRef(null);
  const reconnectCount = useRef(0);
  const pingTimer      = useRef(null);

  // コールバックを ref で保持（stale closure 防止）
  const onGameActionRef    = useRef(onGameAction);
  const onOpponentJoinRef  = useRef(onOpponentJoin);
  const onOpponentLeaveRef = useRef(onOpponentLeave);
  const onRoomFullRef      = useRef(onRoomFull);

  useEffect(() => { onGameActionRef.current    = onGameAction;    }, [onGameAction]);
  useEffect(() => { onOpponentJoinRef.current  = onOpponentJoin;  }, [onOpponentJoin]);
  useEffect(() => { onOpponentLeaveRef.current = onOpponentLeave; }, [onOpponentLeave]);
  useEffect(() => { onRoomFullRef.current      = onRoomFull;      }, [onRoomFull]);

  // ─── 接続ロジック ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode || !enabled) return;

    let alive = true; // クリーンアップ後にコールバックを呼ばないフラグ

    function connect() {
      if (!alive) return;

      const isLocal = PARTYKIT_HOST.startsWith('localhost');
      const protocol = isLocal ? 'ws' : 'wss';
      const url = `${protocol}://${PARTYKIT_HOST}/parties/main/${roomCode.toUpperCase()}`;

      console.log(`[PvP] 接続中: ${url}`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      // ── 接続成功 ──────────────────────────────────────────────────────
      ws.onopen = () => {
        if (!alive) return;
        console.log(`[PvP] 接続完了 room=${roomCode}`);
        setConnected(true);
        reconnectCount.current = 0;

        // 自己紹介メッセージを送信
        ws.send(JSON.stringify({ type: ACTION.PLAYER_HELLO, playerId }));

        // PING で死活確認
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: ACTION.PING }));
          }
        }, PING_INTERVAL);
      };

      // ── 切断 ──────────────────────────────────────────────────────────
      ws.onclose = () => {
        if (!alive) return;
        clearInterval(pingTimer.current);
        setConnected(false);
        setOpponentConnected(false);
        console.log(`[PvP] 切断 (試行${reconnectCount.current + 1}/${MAX_RECONNECT})`);

        // 自動再接続
        if (reconnectCount.current < MAX_RECONNECT) {
          reconnectCount.current += 1;
          setTimeout(connect, RECONNECT_DELAY);
        }
      };

      // ── エラー ────────────────────────────────────────────────────────
      ws.onerror = (err) => {
        console.error('[PvP] WebSocket エラー:', err);
      };

      // ── メッセージ受信 ─────────────────────────────────────────────────
      ws.onmessage = async (event) => {
        if (!alive) return;
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            // サーバーから: 相手が参加した
            case ACTION.OPPONENT_JOINED:
              setOpponentConnected(true);
              onOpponentJoinRef.current?.(msg.playerId);
              break;

            // サーバーから: 相手が退室した
            case ACTION.OPPONENT_LEFT:
              setOpponentConnected(false);
              onOpponentLeaveRef.current?.();
              break;

            // サーバーから: ルーム状態（自分が後から入った時）
            case ACTION.ROOM_STATE:
              if (msg.opponentId) {
                setOpponentConnected(true);
                onOpponentJoinRef.current?.(msg.opponentId);
              }
              break;

            // サーバーから: ルーム満員
            case ACTION.ROOM_FULL:
              onRoomFullRef.current?.();
              break;

            // PONG は無視
            case ACTION.PONG:
              break;

            // ゲームアクション（HMAC署名付き）
            default: {
              // 自分自身のアクションがリレーされてきた場合は無視
              if (msg.playerId === playerId) break;

              // 署名検証
              const valid = await verifyMessage(msg, roomCode);
              if (valid) {
                onGameActionRef.current?.(msg.type, msg.payload ?? {});
              } else {
                console.warn('[PvP] 署名検証失敗 - メッセージを無視:', msg.type);
              }
              break;
            }
          }
        } catch (e) {
          console.error('[PvP] メッセージ解析エラー:', e);
        }
      };
    }

    connect();

    return () => {
      alive = false;
      clearInterval(pingTimer.current);
      wsRef.current?.close();
    };
  }, [roomCode, playerId, enabled]);

  // ─── アクション送信 ──────────────────────────────────────────────────
  const sendAction = useCallback(async (actionType, payload = {}) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[PvP] 未接続 - アクション送信スキップ:', actionType);
      return false;
    }

    try {
      const signed = await signMessage(
        { type: actionType, payload, playerId },
        roomCode
      );
      ws.send(JSON.stringify(signed));
      return true;
    } catch (e) {
      console.error('[PvP] 送信エラー:', e);
      return false;
    }
  }, [roomCode, playerId]);

  // ─── 手動切断 ────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    clearInterval(pingTimer.current);
    wsRef.current?.close();
  }, []);

  return { connected, opponentConnected, sendAction, disconnect };
}
