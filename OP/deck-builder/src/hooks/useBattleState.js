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
  // ドロー
  const drawM = eff.match(/【トリガー】[^。\n]*?(\d+)枚(?:を)?ドロー/);
  if (drawM) actions.push({ id: 'draw', count: parseInt(drawM[1]) });
  // DONデッキに戻す
  const donM = eff.match(/【トリガー】[^。\n]*?DON!![ーー−-](\d+)/);
  if (donM) actions.push({ id: 'donReturn', count: parseInt(donM[1]) });
  return actions;
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

  const addLog = useCallback((msg, prev) => ({
    ...prev,
    battleLog: [{ msg, ts: Date.now() }, ...(prev.battleLog || [])].slice(0, 100),
  }), []);

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
  }, [addLog]);

  const confirmMulligan = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'mulligan') return prev;
      // CPU: 平均コストが高ければマリガン
      let ns = prev;
      const avgCost = prev.cpu.hand.reduce((s, c) => s + (c.cost || 0), 0) / prev.cpu.hand.length;
      if (avgCost > 4.5) {
        const combined = shuffle([...prev.cpu.hand, ...prev.cpu.deck]);
        const newHand = combined.splice(0, 5);
        ns = addLog('CPUマリガン', { ...ns, cpu: { ...prev.cpu, hand: newHand, deck: combined } });
      }
      return addLog('マリガン確定！ゲーム開始', { ...ns, phase: 'game', subPhase: 'refresh' });
    });
  }, [addLog]);

  // ── フェーズ進行 ──────────────────────────────────────────────────
  const advancePhase = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'game') return prev;
      if (prev.pendingTrigger) return prev; // トリガー解決待ち中は進行しない
      const { subPhase, turn, activePlayer, playerOrder } = prev;
      const sideKey = activePlayer;
      const s = prev[sideKey];
      const label = activePlayer === 'player' ? 'プレイヤー' : 'CPU';

      // ─── リフレッシュ → ドロー ───
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

      // ─── ドロー → DON!! ───
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

      // ─── DON!! → メイン ───
      if (subPhase === 'don') {
        // 先攻1ターン目のみDON!! +1枚（後攻は1ターン目から+2枚）
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

      // ─── メイン → エンド ───
      if (subPhase === 'main') {
        return addLog(`[${label}] エンドフェーズ`, { ...prev, subPhase: 'end' });
      }

      // ─── エンド → 次ターン ───
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
  }, [addLog]);

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
  }, [addLog]);

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
  }, [addLog]);

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
  }, [addLog]);

  // ── プレイヤー: ターゲット選択 → アタック解決 ─────────────────────
  const playerSelectTarget = useCallback((targetUid) => {
    setState(prev => {
      if (!prev || !prev.attackState || prev.attackState.step !== 'select-target') return prev;
      const { attackerUid, attackerType } = prev.attackState;
      const p = prev.player;
      const c = prev.cpu;

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

      // タップ
      let newPlayer = p;
      if (attackerType === 'leader') {
        newPlayer = { ...p, leader: { ...p.leader, tapped: true } };
      } else {
        newPlayer = { ...p, field: p.field.map(x => x._uid === attackerUid ? { ...x, tapped: true } : x) };
      }

      // ブロッカー確認（リーダーへの攻撃時のみ）
      if (targetType === 'leader') {
        const blockers = c.field.filter(x => /【ブロッカー】/.test(x.effect || '') && !x.tapped);
        if (blockers.length > 0) {
          const blockerUid = cpuDecideBlocker(blockers, attackPower, c.life.length);
          if (blockerUid) {
            const blocker = c.field.find(x => x._uid === blockerUid);
            const newCpuField = c.field.map(x => x._uid === blockerUid ? { ...x, tapped: true } : x);
            const defensePower = (blocker.power || 0) + (blocker.donAttached || 0) * 1000;
            return addLog(`CPU ブロッカー「${blocker.name}」で受ける！`, {
              ...prev,
              player: newPlayer,
              cpu: { ...c, field: newCpuField },
              attackState: {
                attackerUid, attackerType, owner: 'player',
                targetUid: blockerUid, targetType: 'character',
                attackPower, defensePower,
                step: 'resolving',
              },
            });
          }
        }
      }

      const defensePower = (target.power || 0) + (target.donAttached || 0) * 1000;
      return addLog(`「${attacker.name}」(${attackPower}) → ${targetType === 'leader' ? 'CPUリーダー' : target.name}(${defensePower})`, {
        ...prev,
        player: newPlayer,
        attackState: {
          attackerUid, attackerType, owner: 'player',
          targetUid, targetType,
          attackPower, defensePower,
          step: 'resolving',
        },
      });
    });
  }, [addLog]);

  // ── アタック解決 ─────────────────────────────────────────────────
  const resolveAttack = useCallback(() => {
    setState(prev => {
      if (!prev || !prev.attackState || prev.attackState.step !== 'resolving') return prev;
      const { attackerUid, attackerType, targetUid, targetType, owner, attackPower, defensePower } = prev.attackState;
      const atkKey = owner;
      const defKey = owner === 'player' ? 'cpu' : 'player';
      const defSide = prev[defKey];

      let ns = { ...prev, attackState: null };

      if (attackPower >= defensePower) {
        // 攻撃パワー ≧ 防御パワー → 攻撃側が勝つ（Q15/Q16: 同パワーも攻撃側勝利）
        if (targetType === 'character') {
          const target = defSide.field.find(x => x._uid === targetUid);
          const donBack = target?.donAttached || 0;
          ns = addLog(`KO！「${target?.name}」（DON!!×${donBack}返還）`, {
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
          if (defSide.life.length > 0) {
            // ライフがある → 上から1枚めくって手札へ（トリガーあればペンディング）
            const [lifeCard, ...restLife] = defSide.life;
            const triggered = hasTrigger(lifeCard);
            ns = addLog(
              `${defKey === 'cpu' ? 'CPU' : 'プレイヤー'}ライフ ${defSide.life.length} → ${restLife.length}枚。「${lifeCard.name}」${triggered ? '【トリガー】！' : ''}`,
              {
                ...ns,
                [defKey]: { ...defSide, life: restLife, hand: [...defSide.hand, { ...lifeCard, faceDown: false }] },
              }
            );
            if (triggered) {
              return { ...ns, pendingTrigger: { card: lifeCard, owner: defKey } };
            }
            // ライフが0になってもすぐに敗北ではない（次のダメージステップで判定）
          } else {
            // ライフ0の状態でリーダーに攻撃が通った → 敗北
            return addLog(`${atkKey === 'player' ? 'プレイヤー' : 'CPU'}の勝利！`, { ...ns, winner: atkKey });
          }
        }
      } else {
        ns = addLog(`アタック失敗（${attackPower} < ${defensePower}）`, ns);
      }
      return ns;
    });
  }, [addLog]);

  // ── トリガー処理 ─────────────────────────────────────────────────
  const resolveTrigger = useCallback((activate) => {
    setState(prev => {
      if (!prev || !prev.pendingTrigger) return prev;
      const { card, owner } = prev.pendingTrigger;
      const ns = { ...prev, pendingTrigger: null };

      if (!activate) {
        // 発動しない → カードは手札にそのまま（すでにresolveAttackで手札に追加済み）
        return addLog(`トリガー「${card.name}」スキップ（手札へ）`, ns);
      }

      // 発動する → カードを手札からトラッシュへ移動し、効果発動
      // （ライフからめくられたカードはresolveAttackで手札に追加済み）
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
      // ライフが0になってもここで勝敗は決しない（次のダメージステップで判定）
      return addLog(`トリガー「${card.name}」発動（トラッシュへ）`, applied);
    });
  }, [addLog]);

  // ── アタック選択キャンセル ────────────────────────────────────────
  const cancelAttack = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      // アタッカーのタップを戻す
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

  // ── CPU メインフェーズ全自動実行 ─────────────────────────────────
  // BattlePage.jsxのuseEffectから呼ばれる
  const runCpuMainPhase = useCallback(() => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'cpu' || prev.subPhase !== 'main') return prev;
      const decisions = cpuDecide(prev.cpu, prev.player, prev.turn);
      let ns = { ...prev };

      // 1. カードプレイ
      for (const play of decisions.playDecisions) {
        const c = ns.cpu;
        const idx = c.hand.findIndex(x => x._uid === play.uid);
        if (idx < 0) continue;
        const card = c.hand[idx];
        const afterDon = autoTapDon(c, card.cost || 0);
        if (afterDon.donActive < 0 || (card.cost || 0) > c.donActive) continue; // 念のためガード
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

      // 3. アタック
      for (const atk of decisions.attacks) {
        if (ns.winner) break;
        const c = ns.cpu;
        const p = ns.player;

        // アタッカー取得
        const attacker = atk.attackerType === 'leader' ? c.leader : c.field.find(x => x._uid === atk.attackerUid);
        if (!attacker || attacker.tapped) continue;

        // ターゲット取得
        let target, targetType;
        if (atk.targetType === 'leader') {
          target = p.leader; targetType = 'leader';
        } else {
          target = p.field.find(x => x._uid === atk.targetUid);
          targetType = 'character';
          if (!target) continue;
        }

        // アタッカーをタップ
        let newCpu;
        if (atk.attackerType === 'leader') {
          newCpu = { ...c, leader: { ...c.leader, tapped: true } };
        } else {
          newCpu = { ...c, field: c.field.map(x => x._uid === atk.attackerUid ? { ...x, tapped: true } : x) };
        }
        ns = { ...ns, cpu: newCpu };

        const attackPower = (attacker.power || 0) + (attacker.donAttached || 0) * 1000;
        const defensePower = (target.power || 0) + (target.donAttached || 0) * 1000;

        if (attackPower >= defensePower) {
          // 攻撃パワー ≧ 防御パワー → 攻撃側が勝つ（Q15/Q16: 同パワーも攻撃側勝利）
          if (targetType === 'character') {
            const donBack = target.donAttached || 0;
            ns = addLog(`CPU「${attacker.name}」(${attackPower}) が「${target.name}」をKO！`, {
              ...ns,
              player: {
                ...ns.player,
                field: ns.player.field.filter(x => x._uid !== atk.targetUid),
                trash: [...ns.player.trash, target],
                donActive: ns.player.donActive + donBack,
              },
            });
          } else {
            // リーダーへダメージ
            const plr = ns.player;
            if (plr.life.length > 0) {
              // ライフがある → 上から1枚めくって手札へ（トリガーあればペンディング）
              const [lifeCard, ...restLife] = plr.life;
              const triggered = hasTrigger(lifeCard);
              ns = addLog(
                `CPU「${attacker.name}」(${attackPower}) がリーダーにダメージ！ライフ残り${restLife.length}枚${triggered ? '【トリガー】！' : ''}`,
                {
                  ...ns,
                  player: { ...plr, life: restLife, hand: [...plr.hand, { ...lifeCard, faceDown: false }] },
                }
              );
              if (triggered) {
                // プレイヤーのトリガーをペンディング（残りのアタックはスキップ）
                ns = { ...ns, pendingTrigger: { card: lifeCard, owner: 'player' } };
                break;
              }
              // ライフ0になってもすぐに敗北ではない（次のダメージステップで判定）
            } else {
              // ライフ0の状態でリーダーに攻撃が通った → プレイヤー敗北
              ns = addLog('プレイヤーのライフが0の状態でリーダーにダメージ！CPUの勝利！', { ...ns, winner: 'cpu' });
              break;
            }
          }
        } else {
          ns = addLog(`CPU「${attacker.name}」(${attackPower}) のアタック失敗（${attackPower} < ${defensePower}）`, ns);
        }
      }

      // メインフェーズ完了 → トリガーや勝利がなければエンドフェーズへ自動進行
      if (!ns.winner && !ns.pendingTrigger) {
        ns = addLog('[CPU] エンドフェーズへ', { ...ns, subPhase: 'end' });
      }
      return ns;
    });
  }, [addLog]);

  // ── プレイヤー: 手動アクション（ドロー、DONレスト等）────────────
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
  }, [addLog]);

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
  }, [addLog]);

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
  }, [addLog]);

  const resetBattle = useCallback(() => setState(null), []);

  return {
    state,
    startBattle,
    playerMulligan,
    confirmMulligan,
    advancePhase,
    playerPlayCard,
    playerAttachDon,
    playerSelectAttacker,
    playerSelectTarget,
    resolveAttack,
    resolveTrigger,
    cancelAttack,
    runCpuMainPhase,
    playerDraw,
    playerTrashCard,
    playerTapDon,
    resetBattle,
  };
}
