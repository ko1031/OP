// ─────────────────────────────────────────────────────────────────────
// cpuDecide.js — CPU AI decision engine (純粋関数、状態を持たない)
// ONE PIECE TCG ルールベースAI
// ─────────────────────────────────────────────────────────────────────

/**
 * CPU のメインフェーズでの行動を決定する
 * @returns { playDecisions, donAttachments, attacks }
 */
export function cpuDecide(cpuSide, playerSide, turn) {
  const { hand, field, donActive, leader, leaderEffect } = cpuSide;
  let remainingDon = donActive;

  // ─── 1. 登場するカードを決める ───────────────────────────────
  const playDecisions = [];
  const charInHand = hand
    .filter(c => c.card_type === 'CHARACTER' && (c.cost || 0) <= remainingDon)
    .sort((a, b) => (b.cost || 0) - (a.cost || 0)); // コスト高い順

  for (const card of charInHand) {
    if (field.length + playDecisions.length >= 5) break;
    if ((card.cost || 0) <= remainingDon) {
      playDecisions.push({ type: 'play', uid: card._uid, cost: card.cost || 0 });
      remainingDon -= card.cost || 0;
    }
  }

  // イベント: 基本的に使わない（手動操作が難しいため今回はスキップ）

  // ─── 2. DON!!アタッチ先を決める ──────────────────────────────
  const donAttachments = [];
  if (remainingDon > 0 && (field.length + playDecisions.length > 0)) {
    // 最も強いキャラにDON!!を集中
    const allFieldAfterPlay = [...field]; // 実際のフィールドで判断（play後は仮想）
    if (allFieldAfterPlay.length > 0) {
      const strongest = allFieldAfterPlay.sort((a, b) => (b.power || 0) - (a.power || 0))[0];
      const toAttach = Math.min(remainingDon, 2);
      if (toAttach > 0) {
        donAttachments.push({ uid: strongest._uid, count: toAttach });
        remainingDon -= toAttach;
      }
    }
  }
  // 余ったDON!!をリーダーへ
  if (remainingDon > 0) {
    donAttachments.push({ uid: 'leader', count: remainingDon });
  }

  // ─── 3. アタックを決める ─────────────────────────────────────
  const attacks = [];
  // ターン1は先攻・後攻ともアタック不可
  if (turn <= 1) return { playDecisions, donAttachments, attacks };
  const remainingPlayerTargets = [...playerSide.field];

  // キャラカードでのアタック
  const untappedChars = field.filter(c => !c.tapped);
  for (const attacker of untappedChars) {
    const atkPow = (attacker.power || 0) + (attacker.donAttached || 0) * 1000;

    // レスト状態のキャラのみ攻撃対象（アクティブキャラはアタックできない）
    let beaten = false;
    for (let i = 0; i < remainingPlayerTargets.length; i++) {
      const tgt = remainingPlayerTargets[i];
      if (!tgt.tapped) continue; // アクティブ（起きている）キャラには攻撃不可
      const defPow = (tgt.power || 0) + (tgt.donAttached || 0) * 1000;
      if (atkPow >= defPow) {
        // 同パワーも攻撃側勝利
        attacks.push({
          attackerUid: attacker._uid, attackerType: 'character',
          targetUid: tgt._uid, targetType: 'character',
        });
        remainingPlayerTargets.splice(i, 1);
        beaten = true;
        break;
      }
    }

    // 倒せるキャラがなければリーダーにダメージ（ライフ削り優先）
    if (!beaten && atkPow >= 4000) {
      attacks.push({
        attackerUid: attacker._uid, attackerType: 'character',
        targetUid: 'player-leader', targetType: 'leader',
      });
    }
  }

  // リーダーアタック
  if (!leader.tapped && !leaderEffect?.leaderCannotAttack) {
    const ldrPow = (leader.power || 0) + (leader.donAttached || 0) * 1000;
    // レスト状態で倒せるキャラがあれば狙う（アクティブキャラは攻撃不可）
    const weakChar = remainingPlayerTargets.find(
      t => t.tapped && ldrPow >= ((t.power || 0) + (t.donAttached || 0) * 1000)
    );
    if (weakChar) {
      attacks.push({
        attackerUid: 'leader', attackerType: 'leader',
        targetUid: weakChar._uid, targetType: 'character',
      });
    } else {
      // リーダーへダメージ
      attacks.push({
        attackerUid: 'leader', attackerType: 'leader',
        targetUid: 'player-leader', targetType: 'leader',
      });
    }
  }

  return { playDecisions, donAttachments, attacks };
}

/**
 * ブロッカーを使うかどうか決める
 * @returns blockerUid or null
 */
export function cpuDecideBlocker(blockers, attackPower, leaderLife) {
  if (blockers.length === 0) return null;
  // ライフが1枚以下か、アタック力が高い場合はブロック
  if (leaderLife <= 1 || attackPower >= 7000) {
    // 最も弱いブロッカーで受ける（資源節約）
    const sorted = [...blockers].sort((a, b) => (a.power || 0) - (b.power || 0));
    return sorted[0]._uid;
  }
  return null;
}

/**
 * トリガーを発動するかどうか決める（CPUは基本的に発動する）
 */
export function cpuDecideTrigger(_card) {
  return true; // 常に発動
}
