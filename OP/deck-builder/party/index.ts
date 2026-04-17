// ─────────────────────────────────────────────────────────────────────────
// party/index.ts — ONE PIECE カードゲーム PvP 対戦ルームサーバー
//
// 設計方針:
//   - ゲームロジックを持たない「メッセージリレー」専用サーバー
//   - ゲーム状態はクライアント側でのみ管理（ステートレス設計）
//   - JWT 署名検証はクライアントが行う（サーバーは素通し）
//   - 1 ルーム = 2 プレイヤーまで（3人目は拒否）
// ─────────────────────────────────────────────────────────────────────────
import type * as Party from "partykit/server";

/** プレイヤー情報 */
interface PlayerInfo {
  connectionId: string;
  playerId: "host" | "guest" | string;
  joinedAt: number;
}

export default class OnePieceRoom implements Party.Server {
  /** connectionId → PlayerInfo */
  private players: Map<string, PlayerInfo> = new Map();

  constructor(readonly room: Party.Room) {}

  // ─── 接続 ──────────────────────────────────────────────────────────────
  async onConnect(conn: Party.Connection) {
    const playerCount = this.players.size;

    // 3人目以降は拒否
    if (playerCount >= 2) {
      conn.send(
        JSON.stringify({ type: "ROOM_FULL", message: "このルームは満員です" })
      );
      conn.close();
      return;
    }

    console.log(
      `[Room ${this.room.id}] 接続: ${conn.id} (現在 ${playerCount + 1}人)`
    );
  }

  // ─── メッセージ受信 ────────────────────────────────────────────────────
  async onMessage(message: string, sender: Party.Connection) {
    try {
      const msg = JSON.parse(message) as Record<string, unknown>;

      // ── PLAYER_HELLO: プレイヤー登録 ──────────────────────────────────
      if (msg.type === "PLAYER_HELLO") {
        const playerId = (msg.playerId as string) || "unknown";

        // プレイヤー情報を登録
        this.players.set(sender.id, {
          connectionId: sender.id,
          playerId,
          joinedAt: Date.now(),
        });

        // 既存プレイヤー全員に「新しいプレイヤーが参加」を通知
        this.room.broadcast(
          JSON.stringify({
            type: "OPPONENT_JOINED",
            playerId,
            totalPlayers: this.players.size,
          }),
          [sender.id] // 送信者本人には送らない
        );

        // 新規参加者に「現在のルーム状態」を返す
        const others = [...this.room.getConnections()]
          .filter((c) => c.id !== sender.id)
          .map((c) => this.players.get(c.id)?.playerId)
          .filter(Boolean);

        sender.send(
          JSON.stringify({
            type: "ROOM_STATE",
            totalPlayers: this.players.size,
            opponentId: others[0] ?? null,
            roomId: this.room.id,
          })
        );

        console.log(
          `[Room ${this.room.id}] PLAYER_HELLO: ${playerId} (計${this.players.size}人)`
        );
        return;
      }

      // ── PING: 死活確認 ─────────────────────────────────────────────────
      if (msg.type === "PING") {
        sender.send(JSON.stringify({ type: "PONG", ts: Date.now() }));
        return;
      }

      // ── その他（GAME_ACTION など）: 送信者以外の全員にリレー ──────────
      // サーバーはメッセージ内容を解釈しない（JWT 検証もクライアント側）
      this.room.broadcast(message, [sender.id]);
    } catch (e) {
      console.error(`[Room ${this.room.id}] メッセージ解析エラー:`, e);
    }
  }

  // ─── 切断 ──────────────────────────────────────────────────────────────
  async onClose(conn: Party.Connection) {
    const info = this.players.get(conn.id);
    this.players.delete(conn.id);

    console.log(
      `[Room ${this.room.id}] 切断: ${conn.id} (${info?.playerId ?? "unknown"})`
    );

    // 相手に切断を通知
    if (info) {
      this.room.broadcast(
        JSON.stringify({
          type: "OPPONENT_LEFT",
          playerId: info.playerId,
          totalPlayers: this.players.size,
        }),
        [conn.id]
      );
    }
  }

  // ─── エラー ─────────────────────────────────────────────────────────────
  async onError(conn: Party.Connection, err: Error) {
    console.error(`[Room ${this.room.id}] 接続エラー (${conn.id}):`, err);
    this.players.delete(conn.id);
  }
}

// PartyKit に Server クラスを公開
export { OnePieceRoom as default };
