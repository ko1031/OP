// ─────────────────────────────────────────────────────────────────────
// useBattleState.js — CPU対戦用ゲーム状態管理フック
// ─────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { LEADER_EFFECTS } from './useGameState';
import { cpuDecide, cpuDecideBlocker, cpuDecideTrigger } from './cpuDecide';

// ─── ユーティリティ ───────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function autoTapDon(side, cost) {
  if (!cost || cost <= 0) return side;
  const n = Math.min(cost, side.donActive);
  return { ...side, donActive: side.donActive - n, donTapped: side.donTapped + n };
}

function hasTrigger(card) {
  return /【トリガー】/.test(card?.effect || '');
}

function parseTriggerActions(card) {
  const eff = card?.effect || '';
  const actions = [];
  const drawM = eff.match(/【トリガー】[^。\n]*?(\d+)枚(?:を)?ドロー/);
  if (drawM) actions.push({ id: 'draw', count: parseInt(drawM[1]) });
  const donM = eff.match(/【トリガー】[^。\n]*?DON!![ーー−-](\d+)/);
  if (donM) actions.push({ id: 'donReturn', count: parseInt(donM[1]) });
  return actions;
}

// ─── モジュールレベルヘルパー ──────────────────────────────────────────
// バトルログ追加（純粋関数）
function addLog(msg, prev) {
  return {
    ...prev,
    battleLog: [{ msg, ts: Date.now() }, ...(prev.battleLog || [])].slice(0, 100),
  };
}

// CPU自動カウンター判断
// ターゲットがリーダーで攻撃が通る場合のみカウンターを使う
function cpuAutoCounter(cpuSide, targetType, attackPower, defensePower) {
  if (targetType !== 'leader' || attackPower < defensePower) {
    return { bonus: 0, cards: [] };
  }
  const needed = attackPower - defensePower + 1;
  const candidates = cpuSide.hand
    .filter(c => c.card_type === 'CHARACTER' && (c.counter || 0) > 0)
    .sort((a, b) => (b.counter || 0) - (a.counter || 0));
  let bonus = 0;
  const used = [];
  for (const card of candidates) {
    if (bonus >= needed) break;
    bonus += card.counter;
    used.push(card);
  }
  // カウンターしても防げない場合は使わない
  if (bonus < needed) return { bonus: 0, cards: [] };
  return { bonus, cards: used };
}

// ダメージステップの解決（プレイヤー/CPU共通）
function resolveDamageOnState(ns, atkKey, defKey, targetType, targetUid, attackPower, defensePower) {
  if (attackPower >= defensePower) {
    if (targetType === 'character') {
      const defSide = ns[defKey];
      const target = defSide.field.find(x => x._uid === targetUid);
      if (!target) return ns;
      const donBack = target.donAttached || 0;
      return addLog(`KO！「${target.name}」（DON!!×${donBack}返還）`, {
        ...ns,
        [defKey]: {
          ...defSide,
          field: defSide.field.filter(x => x._uid !== targetUid),
          trash: [...defSide.trash, target],
          donActive: defSide.donActive + donBack,
        },
      });
    } else {
      // リーダーへダメージ
      const defSide = ns[defKey];
      if (defSide.life.length > 0) {
        const [lifeCard, ...restLife] = defSide.life;
        const triggered = hasTrigger(lifeCard);
        const newNs = addLog(
          `${defKey === 'cpu' ? 'CPU' : 'プレイヤー'}ライフ ${defSide.life.length} → ${restLife.length}枚。「${lifeCard.name}」${triggered ? '【トリガー】！' : ''}`,
          { ...ns, [defKey]: { ...defSide, life: restLife, hand: [...defSide.hand, { ...lifeCard, faceDown: false }] } }
        );
        if (triggered) {
          return { ...newNs, pendingTrigger: { card: lifeCard, owner: defKey } };
        }
        return newNs;
      } else {
        return addLog(`${atkKey === 'player' ? 'プレイヤー' : 'CPU'}の勝利！（ライフ0でリーダーにダメージ）`, { ...ns, winner: atkKey });
      }
    }
  } else {
    return addLog(`アタック失敗（${attackPower} < ${defensePower}）`, ns);
  }
}

// CPU攻撃キューから次のアタックを開始する
// リーダーへの攻撃 → ブロッカーステップ or カウンターステップ（プレイヤー操作）
// キャラへの攻撃 → 自動ダメージ解決（ブロッカー/カウンター不可）
function startCpuAttackOnState(ns, pendingAttacks) {
  let attacks = [...pendingAttacks];
  while (attacks.length > 0) {
    const [attack, ...remaining] = attacks;
    attacks = remaining;

    // ループ内で最新の ns から再取得（auto-resolve後に状態が変わるため）
    const c = ns.cpu;
    const p = ns.player;

    const attacker = attack.attackerType === 'leader'
      ? c.leader
      : c.field.find(x => x._uid === attack.attackerUid);
    if (!attacker || attacker.tapped) continue;

    // アタッカーをタップ
    const newCpu = attack.attackerType === 'leader'
      ? { ...c, leader: { ...c.leader, tapped: true } }
      : { ...c, field: c.field.map(x => x._uid === attack.attackerUid ? { ...x, tapped: true } : x) };

    // ターゲット取得
    let target, targetType, finalTargetUid;
    if (attack.targetType === 'leader') {
      target = p.leader;
      targetType = 'leader';
      finalTargetUid = 'player-leader';
    } else {
      target = p.field.find(x => x._uid === attack.targetUid);
      if (!target) continue; // ターゲットが既にいなければスキップ
      targetType = 'character';
      finalTargetUid = attack.targetUid;
    }

    const attackPower = (attacker.power || 0) + (attacker.donAttached || 0) * 1000;
    const defensePower = (target.power || 0) + (target.donAttached || 0) * 1000;
    const targetName = targetType === 'leader' ? 'プレイヤーリーダー' : `「${target.name}」`;
    const logMsg = `CPU「${attacker.name}」(${attackPower}) が${targetName}(${defensePower})にアタック！`;

    if (targetType === 'leader') {
      // ─ リーダーへの攻撃: ブロッカー/カウンターステップ（プレイヤー操作必要）─
      const newNs = addLog(logMsg, { ...ns, cpu: newCpu, cpuPendingAttacks: remaining });
      const playerBlockers = p.field.filter(x => /【ブロッカー】/.test(x.effect || '') && !x.tapped);
      const step = playerBlockers.length > 0 ? 'blocker' : 'counter';
      return {
        ...newNs,
        attackState: {
          attackerUid: attack.attackerUid,
          attackerType: attack.attackerType,
          owner: 'cpu',
          targetUid: finalTargetUid,
          targetType: 'leader',
          attackPower,
          defensePower,
          counterBonus: 0,
          step,
        },
      };
    } else {
      // ─ キャラへの攻撃: ブロッカー/カウンター不可、自動ダメージ解決 ─
      let newNs = addLog(logMsg, { ...ns, cpu: newCpu, cpuPendingAttacks: remaining });
      newNs = resolveDamageOnState(newNs, 'cpu', 'player', 'character', finalTargetUid, attackPower, defensePower);
      if (newNs.winner || newNs.pendingTrigger) {
        return newNs; // 勝利またはトリガーで一旦停止
      }
      ns = newNs; // 状態更新して次のアタックへ
      // attacks はすでに remaining になっているのでループ継続
    }
  }

  // 全アタック終了
  if (!ns.winner && !ns.pendingTrigger) {
    return addLog('[CPU] エンドフェーズへ', { ...ns, subPhase: 'end', cpuPendingAttacks: [] });
  }
  return { ...ns, cpuPendingAttacks: [] };
}

// 各サイドの初期状態を構築
function buildSide(leader, deckCards, prefix) {
  const leaderEff = LEADER_EFFECTS[leader?.card_number] || {};
  const donDeckInit = leaderEff.donDeckInit ?? 10;
  const donMax = leaderEff.donMax ?? donDeckInit;

  const tagged = deckCards.map((c, i) => ({
    ...c,
    _uid: `${prefix}-${c.card_number}-${i}`,
  }));
  const shuffled = shuffle(tagged);
  const lifeCount = leader?.life ?? 5;
  const life = shuffled.splice(0, lifeCount).map(c => ({ ...c, faceDown: true }));
  const hand = shuffled.splice(0, 5);

  return {
    leader: { ...leader, tapped: false, donAttached: 0, _uid: `${prefix}-leader` },
    deck: shuffled,
    hand,
    life,
    field: [],
    stage: null,
    trash: [],
    donDeck: donDeckInit,
    donMax,
    donActive: 0,
    donTapped: 0,
    donLeader: 0,
    leaderEffect: leaderEff,
    searchReveal: [],
  };
}

// ─── メインフック ─────────────────────────────────────────────────────
export function useBattleState() {
  const [state, setState] = useState(null);

  // ── 対戦開始 ─────────────────────────────────────────────────────
  const startBattle = useCallback((playerLeader, playerDeckEntries, cpuLeader, cpuDeckEntries, playerOrder) => {
    const flatDeck = entries => (entries || []).flatMap(({ card, count }) =>
      Array.from({ length: count }, () => ({ ...card }))
    );
    const pSide = buildSide(playerLeader, flatDeck(playerDeckEntries), 'p');
    const cSide = buildSide(cpuLeader, flatDeck(cpuDeckEntries), 'c');
    const firstPlayer = playerOrder === 'first' ? 'player' : 'cpu';

    setState({
      phase: 'mulligan',
      turn: 1,
      activePlayer: firstPlayer,
      subPhase: 'refresh',
      playerOrder,
      player: pSide,
      cpu: cSide,
      attackState: null,
      pendingTrigger: null,
      cpuPendingAttacks: [],
      cpuThinking: false,
      battleLog: [{ msg: `対戦開始！ ${playerLeader?.name} vs CPU(${cpuLeader?.name})`, ts: Date.now() }],
      winner: null,
    });
  }, []);

  // ── マリガン ─────────────────────────────────────────────────────
  const playerMulligan = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'mulligan') return prev;
      const p = prev.player;
      const combined = shuffle([...p.hand, ...p.deck]);
      const newHand = combined.splice(0, 5);
      return addLog('プレイヤーマリガン', { ...prev, player: { ...p, hand: newHand, deck: combined } });
    });
  }, []);

  const confirmMulligan = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'mulligan') return prev;
      let ns = prev;
      const avgCost = prev.cpu.hand.reduce((s, c) => s + (c.cost || 0), 0) / prev.cpu.hand.length;
      if (avgCost > 4.5) {
        const combined = shuffle([...prev.cpu.hand, ...prev.cpu.deck]);
        const newHand = combined.splice(0, 5);
        ns = addLog('CPUマリガン', { ...ns, cpu: { ...prev.cpu, hand: newHand, deck: combined } });
      }
      return addLog('マリガン確定！ゲーム開始', { ...ns, phase: 'game', subPhase: 'refresh' });
    });
  }, []);

  // ── フェーズ進行 ──────────────────────────────────────────────────
  const advancePhase = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'game') return prev;
      if (prev.pendingTrigger) return prev; // トリガー解決待ち中は進行しない
      const { subPhase, turn, activePlayer, playerOrder } = prev;
      const sideKey = activePlayer;
      const s = prev[sideKey];
      const label = activePlayer === 'player' ? 'プレイヤー' : 'CPU';

      if (subPhase === 'refresh') {
        const donFromField = s.field.reduce((sum, c) => sum + (c.donAttached || 0), 0);
        const donFromLeader = s.leader.donAttached || 0;
        const restored = s.donTapped + donFromField + donFromLeader;
        const newField = s.field.map(c => ({ ...c, tapped: false, donAttached: 0 }));
        const newLeader = { ...s.leader, tapped: false, donAttached: 0 };
        return addLog(`[${label}] リフレッシュ${restored > 0 ? `・DON!!×${restored}回収` : ''}`, {
          ...prev,
          subPhase: 'draw',
          [sideKey]: { ...s, field: newField, leader: newLeader, donActive: s.donActive + restored, donTapped: 0, donLeader: 0 },
        });
      }

      if (subPhase === 'draw') {
        const isFirstPlayer = (activePlayer === 'player' && playerOrder === 'first')
                           || (activePlayer === 'cpu'    && playerOrder === 'second');
        if (turn === 1 && isFirstPlayer) {
          return addLog(`[${label}] 先行1Tドローなし`, { ...prev, subPhase: 'don' });
        }
        if (s.deck.length === 0) {
          return addLog(`[${label}] デッキ切れ → 敗北`, {
            ...prev, winner: activePlayer === 'player' ? 'cpu' : 'player',
          });
        }
        const [drawn, ...rest] = s.deck;
        return addLog(`[${label}] ドロー: ${drawn.name}`, {
          ...prev,
          subPhase: 'don',
          [sideKey]: { ...s, deck: rest, hand: [...s.hand, drawn] },
        });
      }

      if (subPhase === 'don') {
        const isFirstPlayer = (activePlayer === 'player' && playerOrder === 'first')
                           || (activePlayer === 'cpu'    && playerOrder === 'second');
        const gain = (turn === 1 && isFirstPlayer) ? 1 : 2;
        const inZone = s.donActive + s.donTapped;
        const actual = Math.min(gain, s.donDeck, Math.max(0, s.donMax - inZone));
        return addLog(`[${label}] DON!!+${actual}枚`, {
          ...prev,
          subPhase: 'main',
          [sideKey]: { ...s, donDeck: s.donDeck - actual, donActive: s.donActive + actual },
        });
      }

      if (subPhase === 'main') {
        return addLog(`[${label}] エンドフェーズ`, { ...prev, subPhase: 'end' });
      }

      if (subPhase === 'end') {
        let ns = prev;
        const eff = s.leaderEffect?.onEndPhase;
        if (eff === 'lifeTopToHand' && s.life.length > 0) {
          const [top, ...rest] = s.life;
          ns = addLog(`[${label}] リーダー効果: ライフ→手札`, {
            ...ns, [sideKey]: { ...ns[sideKey], life: rest, hand: [...ns[sideKey].hand, { ...top, faceDown: false }] },
          });
        }
        if (eff === 'activateDon2' && s.donTapped > 0) {
          const act = Math.min(2, s.donTapped);
          ns = addLog(`[${label}] リーダー効果: DON!!×${act}アクティブ`, {
            ...ns, [sideKey]: { ...ns[sideKey], donTapped: ns[sideKey].donTapped - act, donActive: ns[sideKey].donActive + act },
          });
        }
        const nextPlayer = activePlayer === 'player' ? 'cpu' : 'player';
        const firstPlayer = playerOrder === 'first' ? 'player' : 'cpu';
        const nextTurn = nextPlayer === firstPlayer ? turn + 1 : turn;
        return addLog(`ターン${nextTurn}: ${nextPlayer === 'player' ? 'プレイヤー' : 'CPU'}のターン`, {
          ...ns, activePlayer: nextPlayer, subPhase: 'refresh', turn: nextTurn,
        });
      }

      return prev;
    });
  }, []);

  // ── プレイヤー: カードプレイ ──────────────────────────────────────
  const playerPlayCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player' || prev.subPhase !== 'main') return prev;
      const p = prev.player;
      const idx = p.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = p.hand[idx];
      if (card.card_type !== 'CHARACTER') return addLog('キャラクターのみ登場できます', prev);
      if (p.field.length >= 5) return addLog('フィールドが満員（最大5枚）', prev);
      const cost = card.cost || 0;
      if (p.donActive < cost) return addLog(`コスト${cost}が足りません（アクティブDON!!: ${p.donActive}）`, prev);
      const afterDon = autoTapDon(p, cost);
      const newField = [...afterDon.field, { ...card, tapped: false, donAttached: 0 }];
      const newHand = afterDon.hand.filter((_, i) => i !== idx);
      return addLog(`「${card.name}」（コスト${cost}）登場`, {
        ...prev, player: { ...afterDon, hand: newHand, field: newField },
      });
    });
  }, []);

  // ── プレイヤー: DON!!アタッチ ─────────────────────────────────────
  const playerAttachDon = useCallback((targetUid) => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player') return prev;
      const p = prev.player;
      if (p.donActive <= 0) return addLog('アクティブDON!!がありません', prev);
      if (targetUid === 'leader') {
        return addLog('DON!!をリーダーにアタッチ', {
          ...prev, player: {
            ...p, donActive: p.donActive - 1, donLeader: p.donLeader + 1,
            leader: { ...p.leader, donAttached: (p.leader.donAttached || 0) + 1 },
          },
        });
      }
      const card = p.field.find(c => c._uid === targetUid);
      if (!card) return prev;
      const newField = p.field.map(c => c._uid === targetUid ? { ...c, donAttached: (c.donAttached || 0) + 1 } : c);
      return addLog(`「${card.name}」にDON!!アタッチ`, {
        ...prev, player: { ...p, donActive: p.donActive - 1, field: newField },
      });
    });
  }, []);

  // ── プレイヤー: アタッカー選択 ────────────────────────────────────
  const playerSelectAttacker = useCallback((attackerUid) => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player' || prev.subPhase !== 'main') return prev;
      const p = prev.player;
      let attacker, attackerType;
      if (attackerUid === 'p-leader') {
        if (p.leader.tapped) return addLog('リーダーはすでにタップ済みです', prev);
        if (p.leaderEffect?.leaderCannotAttack) return addLog('このリーダーはアタックできません', prev);
        attacker = p.leader; attackerType = 'leader';
      } else {
        attacker = p.field.find(c => c._uid === attackerUid);
        if (!attacker) return prev;
        if (attacker.tapped) return addLog('このキャラはタップ済みです', prev);
        attackerType = 'character';
      }
      return addLog(`「${attacker.name}」アタック宣言`, {
        ...prev, attackState: { attackerUid, attackerType, owner: 'player', step: 'select-target' },
      });
    });
  }, []);

  // ── プレイヤー: ターゲット選択 → CPUブロッカー → CPU自動カウンター → 解決待ち
  const playerSelectTarget = useCallback((targetUid) => {
    setState(prev => {
      if (!prev || !prev.attackState || prev.attackState.step !== 'select-target') return prev;
      const { attackerUid, attackerType } = prev.attackState;
      const p = prev.player;
      let c = prev.cpu;

      const attacker = attackerType === 'leader' ? p.leader : p.field.find(x => x._uid === attackerUid);
      if (!attacker) return prev;

      let target, targetType;
      if (targetUid === 'cpu-leader') {
        target = c.leader; targetType = 'leader';
      } else {
        target = c.field.find(x => x._uid === targetUid);
        targetType = 'character';
        if (!target) return prev;
      }

      const attackPower = (attacker.power || 0) + (attacker.donAttached || 0) * 1000;

      // アタッカーをタップ
      let newPlayer = p;
      if (attackerType === 'leader') {
        newPlayer = { ...p, leader: { ...p.leader, tapped: true } };
      } else {
        newPlayer = { ...p, field: p.field.map(x => x._uid === attackerUid ? { ...x, tapped: true } : x) };
      }

      let finalTargetUid = targetUid;
      let finalTargetType = targetType;
      let finalDefensePower = (target.power || 0) + (target.donAttached || 0) * 1000;
      let ns = { ...prev, player: newPlayer };

      // ─ CPUブロッカーステップ（リーダーへの攻撃時のみ）───
      if (targetType === 'leader') {
        const blockers = c.field.filter(x => /【ブロッカー】/.test(x.effect || '') && !x.tapped);
        if (blockers.length > 0) {
          const blockerUid = cpuDecideBlocker(blockers, attackPower, c.life.length);
          if (blockerUid) {
            const blocker = c.field.find(x => x._uid === blockerUid);
            c = { ...c, field: c.field.map(x => x._uid === blockerUid ? { ...x, tapped: true } : x) };
            ns = { ...ns, cpu: c };
            finalTargetUid = blockerUid;
            finalTargetType = 'character';
            finalDefensePower = (blocker.power || 0) + (blocker.donAttached || 0) * 1000;
            ns = addLog(`CPU ブロッカー「${blocker.name}」(${finalDefensePower})で受ける！`, ns);
          }
        }
      }

      // ─ CPUカウンターステップ（自動）─────────────────────────
      const counterResult = cpuAutoCounter(ns.cpu, finalTargetType, attackPower, finalDefensePower);
      if (counterResult.cards.length > 0) {
        const usedUids = new Set(counterResult.cards.map(x => x._uid));
        const newCpuHand = ns.cpu.hand.filter(x => !usedUids.has(x._uid));
        const newCpuTrash = [...ns.cpu.trash, ...counterResult.cards.map(x => ({ ...x, faceDown: false }))];
        ns = addLog(
          `CPU カウンター「${counterResult.cards.map(x => x.name).join('・')}」+${counterResult.bonus}！（防御力: ${finalDefensePower} → ${finalDefensePower + counterResult.bonus}）`,
          { ...ns, cpu: { ...ns.cpu, hand: newCpuHand, trash: newCpuTrash } }
        );
        finalDefensePower += counterResult.bonus;
      }

      const defLabel = finalTargetType === 'leader' ? 'CPUリーダー' : (ns.cpu.field.find(x => x._uid === finalTargetUid)?.name || '');
      return addLog(`「${attacker.name}」(${attackPower}) → ${defLabel}(${finalDefensePower})`, {
        ...ns,
        attackState: {
          attackerUid, attackerType, owner: 'player',
          targetUid: finalTargetUid, targetType: finalTargetType,
          attackPower, defensePower: finalDefensePower,
          counterBonus: counterResult.bonus,
          step: 'resolving',
        },
      });
    });
  }, []);

  // ── アタック解決（プレイヤーが攻撃した場合）────────────────────────
  const resolveAttack = useCallback(() => {
    setState(prev => {
      if (!prev || !prev.attackState || prev.attackState.step !== 'resolving') return prev;
      if (prev.attackState.owner !== 'player') return prev;
      const { attackerUid, attackerType, targetUid, targetType, attackPower, defensePower } = prev.attackState;
      const ns = { ...prev, attackState: null };
      return resolveDamageOnState(ns, 'player', 'cpu', targetType, targetUid, attackPower, defensePower);
    });
  }, []);

  // ── トリガー処理 ─────────────────────────────────────────────────
  const resolveTrigger = useCallback((activate) => {
    setState(prev => {
      if (!prev || !prev.pendingTrigger) return prev;
      const { card, owner } = prev.pendingTrigger;
      const ns = { ...prev, pendingTrigger: null };

      if (!activate) {
        // 発動しない → カードは手札にそのまま（すでにresolveAttack/runCpuMainPhaseで手札に追加済み）
        return addLog(`トリガー「${card.name}」スキップ（手札へ）`, ns);
      }

      // 発動する → カードを手札からトラッシュへ移動
      let applied = {
        ...ns,
        [owner]: {
          ...ns[owner],
          hand: ns[owner].hand.filter(c => c._uid !== card._uid),
          trash: [...ns[owner].trash, { ...card, faceDown: false }],
        },
      };

      const actions = parseTriggerActions(card);
      for (const a of actions) {
        const side = applied[owner];
        if (a.id === 'draw') {
          const n = Math.min(a.count, side.deck.length);
          applied = addLog(`[${owner}] トリガー: ${n}枚ドロー`, {
            ...applied,
            [owner]: { ...side, deck: side.deck.slice(n), hand: [...side.hand, ...side.deck.slice(0, n)] },
          });
        }
        if (a.id === 'donReturn') {
          const n = Math.min(a.count, side.donTapped);
          applied = addLog(`[${owner}] トリガー: DON!!×${n}デッキに返却`, {
            ...applied,
            [owner]: { ...side, donTapped: side.donTapped - n, donDeck: side.donDeck + n },
          });
        }
      }
      return addLog(`トリガー「${card.name}」発動（トラッシュへ）`, applied);
    });
  }, []);

  // ── アタックキャンセル ─────────────────────────────────────────
  const cancelAttack = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      if (prev.attackState?.owner === 'player') {
        const { attackerUid, attackerType } = prev.attackState;
        const p = prev.player;
        let newPlayer = p;
        if (attackerType === 'leader') {
          newPlayer = { ...p, leader: { ...p.leader, tapped: false } };
        } else {
          newPlayer = { ...p, field: p.field.map(x => x._uid === attackerUid ? { ...x, tapped: false } : x) };
        }
        return { ...prev, attackState: null, player: newPlayer };
      }
      return { ...prev, attackState: null };
    });
  }, []);

  // ── プレイヤー: ブロッカーでブロック（CPU攻撃時）─────────────────
  const playerBlock = useCallback((blockerUid) => {
    setState(prev => {
      if (!prev?.attackState || prev.attackState.step !== 'blocker') return prev;
      if (prev.attackState.owner !== 'cpu') return prev;
      const p = prev.player;
      const blocker = p.field.find(x => x._uid === blockerUid);
      if (!blocker || !/【ブロッカー】/.test(blocker.effect || '')) return addLog('このキャラはブロッカーではありません', prev);
      if (blocker.tapped) return addLog('このキャラはすでにタップ済みです', prev);

      const newField = p.field.map(x => x._uid === blockerUid ? { ...x, tapped: true } : x);
      const defensePower = (blocker.power || 0) + (blocker.donAttached || 0) * 1000;

      return addLog(`「${blocker.name}」でブロック！（防御力: ${defensePower}）`, {
        ...prev,
        player: { ...p, field: newField },
        attackState: {
          ...prev.attackState,
          targetUid: blockerUid,
          targetType: 'character',
          defensePower,
          counterBonus: 0,
          step: 'counter',
        },
      });
    });
  }, []);

  // ── プレイヤー: ブロッカーステップスキップ ─────────────────────────
  const playerPassBlock = useCallback(() => {
    setState(prev => {
      if (!prev?.attackState || prev.attackState.step !== 'blocker') return prev;
      return addLog('ブロッカーなし', { ...prev, attackState: { ...prev.attackState, step: 'counter' } });
    });
  }, []);

  // ── プレイヤー: カウンター発動（CPU攻撃時）────────────────────────
  const playerCounter = useCallback((cardUid) => {
    setState(prev => {
      if (!prev?.attackState || prev.attackState.step !== 'counter') return prev;
      if (prev.attackState.owner !== 'cpu') return prev;
      const p = prev.player;
      const card = p.hand.find(c => c._uid === cardUid);
      if (!card) return prev;
      const counterVal = card.counter || 0;
      if (counterVal <= 0) return addLog('このカードにはカウンター値がありません', prev);

      const newHand = p.hand.filter(c => c._uid !== cardUid);
      const newTrash = [...p.trash, { ...card, faceDown: false }];
      const newDefense = prev.attackState.defensePower + counterVal;

      return addLog(`カウンター「${card.name}」+${counterVal}！（防御力: ${newDefense}）`, {
        ...prev,
        player: { ...p, hand: newHand, trash: newTrash },
        attackState: {
          ...prev.attackState,
          defensePower: newDefense,
          counterBonus: (prev.attackState.counterBonus || 0) + counterVal,
        },
      });
    });
  }, []);

  // ── プレイヤー: カウンターステップ確定 → ダメージ解決 → 次のアタックへ
  const playerConfirmCounter = useCallback(() => {
    setState(prev => {
      if (!prev?.attackState || prev.attackState.step !== 'counter') return prev;
      if (prev.attackState.owner !== 'cpu') return prev;
      const { targetUid, targetType, attackPower, defensePower } = prev.attackState;

      let ns = { ...prev, attackState: null };
      ns = resolveDamageOnState(ns, 'cpu', 'player', targetType, targetUid, attackPower, defensePower);

      // トリガーや勝利があれば一旦停止
      if (ns.winner || ns.pendingTrigger) {
        return ns;
      }

      // 次のCPU攻撃へ
      return startCpuAttackOnState(ns, ns.cpuPendingAttacks || []);
    });
  }, []);

  // ── CPU残りアタックを処理（トリガー解決後に呼ばれる）─────────────────
  const processCpuPendingAttack = useCallback(() => {
    setState(prev => {
      if (!prev || prev.winner || prev.pendingTrigger || prev.attackState) return prev;
      const pending = prev.cpuPendingAttacks || [];
      if (pending.length === 0) {
        // 全アタック終了、エンドフェーズへ
        if (prev.subPhase === 'main' && prev.activePlayer === 'cpu') {
          return addLog('[CPU] エンドフェーズへ', { ...prev, subPhase: 'end' });
        }
        return prev;
      }
      return startCpuAttackOnState(prev, pending);
    });
  }, []);

  // ── CPU メインフェーズ全自動実行 ─────────────────────────────────
  const runCpuMainPhase = useCallback(() => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'cpu' || prev.subPhase !== 'main') return prev;
      if (prev.cpuPendingAttacks?.length > 0) return prev; // 既にアタックキュー処理中
      const decisions = cpuDecide(prev.cpu, prev.player, prev.turn);
      let ns = { ...prev };

      // 1. カードプレイ
      for (const play of decisions.playDecisions) {
        const c = ns.cpu;
        const idx = c.hand.findIndex(x => x._uid === play.uid);
        if (idx < 0) continue;
        const card = c.hand[idx];
        if ((card.cost || 0) > c.donActive) continue;
        const afterDon = autoTapDon(c, card.cost || 0);
        const newField = [...afterDon.field, { ...card, tapped: false, donAttached: 0 }];
        const newHand = afterDon.hand.filter((_, i) => i !== idx);
        ns = addLog(`CPU「${card.name}」登場`, { ...ns, cpu: { ...afterDon, hand: newHand, field: newField } });
      }

      // 2. DON!!アタッチ
      for (const att of decisions.donAttachments) {
        const c = ns.cpu;
        if (c.donActive <= 0) break;
        const toAttach = Math.min(att.count, c.donActive);
        if (att.uid === 'leader') {
          ns = addLog(`CPUリーダーにDON!!×${toAttach}アタッチ`, {
            ...ns, cpu: {
              ...c, donActive: c.donActive - toAttach, donLeader: c.donLeader + toAttach,
              leader: { ...c.leader, donAttached: (c.leader.donAttached || 0) + toAttach },
            },
          });
        } else {
          const tgt = c.field.find(x => x._uid === att.uid);
          if (!tgt) continue;
          ns = addLog(`CPU「${tgt.name}」にDON!!×${toAttach}アタッチ`, {
            ...ns, cpu: {
              ...c, donActive: c.donActive - toAttach,
              field: c.field.map(x => x._uid === att.uid ? { ...x, donAttached: (x.donAttached || 0) + toAttach } : x),
            },
          });
        }
      }

      // 3. アタック: 全アタックをキューに入れて順次実行
      const attackQueue = decisions.attacks;
      if (attackQueue.length === 0) {
        return addLog('[CPU] エンドフェーズへ', { ...ns, subPhase: 'end', cpuPendingAttacks: [] });
      }

      return startCpuAttackOnState({ ...ns, cpuPendingAttacks: [] }, attackQueue);
    });
  }, []);

  // ── プレイヤー手動操作 ─────────────────────────────────────────
  const playerDraw = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const n = Math.min(count, p.deck.length);
      if (n === 0) return addLog('デッキにカードがありません', prev);
      return addLog(`${n}枚ドロー`, {
        ...prev, player: { ...p, deck: p.deck.slice(n), hand: [...p.hand, ...p.deck.slice(0, n)] },
      });
    });
  }, []);

  const playerTrashCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const idx = p.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = p.hand[idx];
      return addLog(`「${card.name}」を手札からトラッシュ`, {
        ...prev, player: { ...p, hand: p.hand.filter((_, i) => i !== idx), trash: [...p.trash, card] },
      });
    });
  }, []);

  const playerTapDon = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const n = Math.min(count, p.donActive);
      if (n <= 0) return addLog('アクティブDON!!がありません', prev);
      return addLog(`DON!!×${n}レスト`, {
        ...prev, player: { ...p, donActive: p.donActive - n, donTapped: p.donTapped + n },
      });
    });
  }, []);

  // ── プレイヤー: フィールドカードタップ/アンタップ ────────────────────
  const playerToggleField = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.field.find(c => c._uid === uid);
      if (!card) return prev;
      const next = !card.tapped;
      return addLog(`「${card.name}」を${next ? 'タップ' : 'アンタップ'}`, {
        ...prev, player: { ...p, field: p.field.map(c => c._uid === uid ? { ...c, tapped: next } : c) },
      });
    });
  }, []);

  // ── プレイヤー: リーダータップ/アンタップ ────────────────────────────
  const playerToggleLeader = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const next = !p.leader.tapped;
      return addLog(`リーダーを${next ? 'タップ' : 'アンタップ'}`, {
        ...prev, player: { ...p, leader: { ...p.leader, tapped: next } },
      });
    });
  }, []);

  // ── プレイヤー: フィールドカードKO（トラッシュ）───────────────────────
  const playerTrashFieldCard = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.field.find(c => c._uid === uid);
      if (!card) return prev;
      const donBack = card.donAttached || 0;
      return addLog(`「${card.name}」KO → トラッシュ（DON!!×${donBack}返還）`, {
        ...prev, player: {
          ...p,
          field: p.field.filter(c => c._uid !== uid),
          trash: [...p.trash, card],
          donActive: p.donActive + donBack,
        },
      });
    });
  }, []);

  // ── プレイヤー: DONデタッチ（フィールドカード）────────────────────────
  const playerDetachDon = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.field.find(c => c._uid === uid);
      if (!card || (card.donAttached || 0) <= 0) return prev;
      return addLog(`「${card.name}」からDON!!を外す`, {
        ...prev, player: {
          ...p,
          field: p.field.map(c => c._uid === uid ? { ...c, donAttached: c.donAttached - 1 } : c),
          donActive: p.donActive + 1,
        },
      });
    });
  }, []);

  // ── プレイヤー: DONデタッチ（リーダー）──────────────────────────────
  const playerDetachDonLeader = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      if ((p.leader.donAttached || 0) <= 0) return prev;
      return addLog('リーダーからDON!!を外す', {
        ...prev, player: {
          ...p,
          leader: { ...p.leader, donAttached: p.leader.donAttached - 1 },
          donActive: p.donActive + 1, donLeader: p.donLeader - 1,
        },
      });
    });
  }, []);

  // ── プレイヤー: 手札→デッキトップ/ボトム ─────────────────────────────
  const playerReturnHandToTop = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.hand.find(c => c._uid === uid);
      if (!card) return prev;
      return addLog(`「${card.name}」をデッキトップへ`, {
        ...prev, player: { ...p, hand: p.hand.filter(c => c._uid !== uid), deck: [card, ...p.deck] },
      });
    });
  }, []);

  const playerReturnHandToBottom = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.hand.find(c => c._uid === uid);
      if (!card) return prev;
      return addLog(`「${card.name}」をデッキボトムへ`, {
        ...prev, player: { ...p, hand: p.hand.filter(c => c._uid !== uid), deck: [...p.deck, card] },
      });
    });
  }, []);

  // ── プレイヤー: フィールド→デッキトップ/ボトム ────────────────────────
  const playerReturnFieldToTop = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.field.find(c => c._uid === uid);
      if (!card) return prev;
      const donBack = card.donAttached || 0;
      return addLog(`「${card.name}」をデッキトップへ`, {
        ...prev, player: {
          ...p, field: p.field.filter(c => c._uid !== uid),
          deck: [card, ...p.deck], donActive: p.donActive + donBack,
        },
      });
    });
  }, []);

  const playerReturnFieldToBottom = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.field.find(c => c._uid === uid);
      if (!card) return prev;
      const donBack = card.donAttached || 0;
      return addLog(`「${card.name}」をデッキボトムへ`, {
        ...prev, player: {
          ...p, field: p.field.filter(c => c._uid !== uid),
          deck: [...p.deck, card], donActive: p.donActive + donBack,
        },
      });
    });
  }, []);

  // ── プレイヤー: トラッシュ→手札/デッキトップ ──────────────────────────
  const playerReturnTrashToHand = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.trash.find(c => c._uid === uid);
      if (!card) return prev;
      return addLog(`「${card.name}」をトラッシュから手札へ`, {
        ...prev, player: { ...p, trash: p.trash.filter(c => c._uid !== uid), hand: [...p.hand, card] },
      });
    });
  }, []);

  const playerReturnTrashToDeckTop = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.trash.find(c => c._uid === uid);
      if (!card) return prev;
      return addLog(`「${card.name}」をトラッシュからデッキトップへ`, {
        ...prev, player: { ...p, trash: p.trash.filter(c => c._uid !== uid), deck: [card, ...p.deck] },
      });
    });
  }, []);

  // ── プレイヤー: ステージプレイ ──────────────────────────────────────
  const playerPlayStage = useCallback((cardUid) => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player' || prev.subPhase !== 'main') return prev;
      const p = prev.player;
      const idx = p.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = p.hand[idx];
      if (card.card_type !== 'STAGE') return prev;
      const cost = card.cost || 0;
      if (p.donActive < cost) return addLog(`コスト${cost}が足りません`, prev);
      const afterDon = autoTapDon(p, cost);
      const newHand = afterDon.hand.filter((_, i) => i !== idx);
      const oldStage = afterDon.stage;
      const newTrash = oldStage ? [...afterDon.trash, oldStage] : afterDon.trash;
      return addLog(`ステージ「${card.name}」セット${oldStage ? `（旧「${oldStage.name}」トラッシュ）` : ''}`, {
        ...prev, player: { ...afterDon, hand: newHand, stage: { ...card, tapped: false }, trash: newTrash },
      });
    });
  }, []);

  // ── プレイヤー: イベント使用 ──────────────────────────────────────
  const playerPlayEvent = useCallback((cardUid) => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player' || prev.subPhase !== 'main') return prev;
      const p = prev.player;
      const idx = p.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = p.hand[idx];
      if (card.card_type !== 'EVENT') return prev;
      const cost = card.cost || 0;
      if (p.donActive < cost) return addLog(`コスト${cost}が足りません`, prev);
      const afterDon = autoTapDon(p, cost);
      const newHand = afterDon.hand.filter((_, i) => i !== idx);
      return addLog(`イベント「${card.name}」（コスト${cost}）使用`, {
        ...prev, player: { ...afterDon, hand: newHand, trash: [...afterDon.trash, card] },
      });
    });
  }, []);

  // ── プレイヤー: サーチ ────────────────────────────────────────────
  const playerBeginSearch = useCallback((count) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const n = Math.min(count, p.deck.length);
      if (n <= 0) return addLog('デッキにカードがありません', prev);
      const revealed = p.deck.slice(0, n);
      return addLog(`デッキ上${n}枚を確認`, {
        ...prev, player: { ...p, deck: p.deck.slice(n), searchReveal: revealed },
      });
    });
  }, []);

  const playerResolveSearch = useCallback(({ toHand, toDeckTop, toDeckBottom }) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const rev = p.searchReveal || [];
      if (rev.length === 0) return prev;
      const handCards = rev.filter(c => toHand?.includes(c._uid));
      const topCards = (toDeckTop || []).map(uid => rev.find(c => c._uid === uid)).filter(Boolean);
      const bottomCards = rev.filter(c => toDeckBottom?.includes(c._uid));
      // 未割当カードはデッキボトムへ
      const assignedUids = new Set([...(toHand || []), ...(toDeckTop || []), ...(toDeckBottom || [])]);
      const unassigned = rev.filter(c => !assignedUids.has(c._uid));
      return addLog(`サーチ完了（手札${handCards.length}枚）`, {
        ...prev,
        player: {
          ...p,
          searchReveal: [],
          hand: [...p.hand, ...handCards],
          deck: [...topCards.reverse(), ...p.deck, ...bottomCards, ...unassigned],
        },
      });
    });
  }, []);

  const playerCancelSearch = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const rev = p.searchReveal || [];
      return addLog('サーチキャンセル', {
        ...prev, player: { ...p, searchReveal: [], deck: [...rev, ...p.deck] },
      });
    });
  }, []);

  // ── プレイヤー: DON!!優先返却（効果コスト用）────────────────────────
  const playerReturnDonToDeckPriority = useCallback((count) => {
    setState(prev => {
      if (!prev) return prev;
      let p = { ...prev.player };
      let remaining = count;
      // 優先: タップ済み → アクティブ
      const fromTapped = Math.min(remaining, p.donTapped);
      p.donTapped -= fromTapped; p.donDeck += fromTapped; remaining -= fromTapped;
      if (remaining > 0) {
        const fromActive = Math.min(remaining, p.donActive);
        p.donActive -= fromActive; p.donDeck += fromActive; remaining -= fromActive;
      }
      return addLog(`DON!!×${count - remaining}枚をデッキに返却`, { ...prev, player: p });
    });
  }, []);

  // ── プレイヤー: デッキシャッフル ──────────────────────────────────
  const playerShuffleDeck = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      return addLog('デッキをシャッフル', {
        ...prev, player: { ...prev.player, deck: shuffle(prev.player.deck) },
      });
    });
  }, []);

  // ── プレイヤー: ライフめくり ──────────────────────────────────────
  const playerFlipLife = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      if (p.life.length === 0) return addLog('ライフなし', prev);
      const [top, ...rest] = p.life;
      const triggered = hasTrigger(top);
      const ns = addLog(`ライフめくり: 「${top.name}」${triggered ? '【トリガー】！' : ''}`, {
        ...prev, player: { ...p, life: rest, hand: [...p.hand, { ...top, faceDown: false }] },
      });
      if (triggered) {
        return { ...ns, pendingTrigger: { card: top, owner: 'player' } };
      }
      return ns;
    });
  }, []);

  // ── プレイヤー: ステージトラッシュ ────────────────────────────────
  const playerTrashStage = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      if (!p.stage) return prev;
      return addLog(`ステージ「${p.stage.name}」トラッシュ`, {
        ...prev, player: { ...p, stage: null, trash: [...p.trash, p.stage] },
      });
    });
  }, []);

  const resetBattle = useCallback(() => setState(null), []);

  return {
    state,
    startBattle,
    playerMulligan,
    confirmMulligan,
    advancePhase,
    playerPlayCard,
    playerPlayStage,
    playerPlayEvent,
    playerAttachDon,
    playerDetachDon,
    playerDetachDonLeader,
    playerSelectAttacker,
    playerSelectTarget,
    resolveAttack,
    resolveTrigger,
    cancelAttack,
    playerBlock,
    playerPassBlock,
    playerCounter,
    playerConfirmCounter,
    processCpuPendingAttack,
    runCpuMainPhase,
    playerDraw,
    playerTrashCard,
    playerTrashFieldCard,
    playerTrashStage,
    playerToggleField,
    playerToggleLeader,
    playerReturnHandToTop,
    playerReturnHandToBottom,
    playerReturnFieldToTop,
    playerReturnFieldToBottom,
    playerReturnTrashToHand,
    playerReturnTrashToDeckTop,
    playerBeginSearch,
    playerResolveSearch,
    playerCancelSearch,
    playerReturnDonToDeckPriority,
    playerShuffleDeck,
    playerFlipLife,
    playerTapDon,
    resetBattle,
  };
}
