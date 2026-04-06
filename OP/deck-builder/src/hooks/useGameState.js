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

// playerOrder: 'first' | 'second'
function buildInitialState(leader, deckCards, playerOrder) {
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
    deck: shuffled, hand, life,
    field: [], stage: null,
    donDeck: 10, donActive: 0, donTapped: 0, donLeader: 0,
    trash: [], mulliganCount: 0,
    log: ['ゲーム開始！ マリガンしますか？'],
  };
}

// DON!!自動レスト: cost分だけdonActiveからdonTappedへ移動
function autoTapDon(prev, cost) {
  if (!cost || cost <= 0) return prev;
  const n = Math.min(cost, prev.donActive);
  if (n <= 0) return prev;
  return { ...prev, donActive: prev.donActive - n, donTapped: prev.donTapped + n };
}

export function useGameState() {
  const [state, setState] = useState(null);

  const addLog = useCallback((msg, prev) => ({
    ...prev,
    log: [msg, ...prev.log].slice(0, 60),
  }), []);

  // ─── デッキセットアップ（先行/後攻込み）───
  const startGame = useCallback((leader, deckEntries, playerOrder) => {
    const cards = expandDeck(deckEntries);
    setState(buildInitialState(leader, cards, playerOrder));
  }, []);

  // ─── マリガン ───
  const mulligan = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const combined = shuffle([...prev.hand, ...prev.deck]);
      const hand = combined.splice(0, 5);
      const ns = { ...prev, deck: combined, hand, mulliganCount: prev.mulliganCount + 1 };
      return addLog(`マリガン（${ns.mulliganCount}回目）`, ns);
    });
  }, [addLog]);

  // ─── ゲーム開始（マリガン確定）→ リフレッシュフェイズから ───
  const startMainGame = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const label = prev.playerOrder === 'first' ? '先行' : '後攻';
      return addLog(`ゲーム開始！（${label}）リフレッシュフェイズへ`, {
        ...prev, phase: 'game', subPhase: 'refresh',
      });
    });
  }, [addLog]);

  // ─── フェイズ進行（各フェイズの自動処理付き）───
  const advancePhase = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'game') return prev;
      const { subPhase, turn, playerOrder } = prev;

      // リフレッシュ → ドロー: 全カードアンタップ、DON!!アクティブに戻す
      if (subPhase === 'refresh') {
        const newField = prev.field.map(c => ({ ...c, tapped: false }));
        const newLeader = { ...prev.leader, tapped: false };
        const restored = prev.donTapped;
        return addLog(
          `リフレッシュ: 全カードアンタップ${restored > 0 ? `、DON!!×${restored}アクティブへ` : ''}`,
          { ...prev, subPhase: 'draw', field: newField, leader: newLeader, donActive: prev.donActive + restored, donTapped: 0 }
        );
      }

      // ドロー → DON!!: 先行1ターン目はスキップ
      if (subPhase === 'draw') {
        const skipDraw = turn === 1 && playerOrder === 'first';
        if (skipDraw) {
          return addLog('ドロー: 先行1ターン目はスキップ', { ...prev, subPhase: 'don' });
        }
        if (prev.deck.length === 0) {
          return addLog('デッキ切れ！ドロー不可', { ...prev, subPhase: 'don' });
        }
        const [drawn, ...newDeck] = prev.deck;
        return addLog(`ドロー:「${drawn.name}」`, {
          ...prev, subPhase: 'don', deck: newDeck, hand: [...prev.hand, drawn],
        });
      }

      // DON!! → メイン: DON!!補充
      if (subPhase === 'don') {
        const gain = turn === 1 ? 1 : 2;
        const actual = Math.min(gain, prev.donDeck);
        return addLog(`DON!!フェイズ: +${actual}枚補充`, {
          ...prev, subPhase: 'main', donDeck: prev.donDeck - actual, donActive: prev.donActive + actual,
        });
      }

      // メイン → エンド
      if (subPhase === 'main') {
        return addLog('エンドフェイズ', { ...prev, subPhase: 'end' });
      }

      // エンド → 次ターンのリフレッシュ
      if (subPhase === 'end') {
        const nextTurn = prev.turn + 1;
        return addLog(`ターン${nextTurn} 開始`, { ...prev, turn: nextTurn, subPhase: 'refresh' });
      }

      return prev;
    });
  }, [addLog]);

  // ─── 手札からキャラクターをプレイ（DON!!自動レスト）───
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

  // ─── ステージをプレイ（DON!!自動レスト）───
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

  // ─── フィールドカードをタップ/アンタップ ───
  const toggleFieldCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const card = prev.field.find(c => c._uid === cardUid);
      const newField = prev.field.map(c => c._uid === cardUid ? { ...c, tapped: !c.tapped } : c);
      return addLog(`「${card?.name}」を${card?.tapped ? 'アンタップ' : 'タップ（アタック）'}`, { ...prev, field: newField });
    });
  }, [addLog]);

  // ─── リーダーをタップ/アンタップ ───
  const toggleLeader = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const tapped = !prev.leader.tapped;
      return addLog(`リーダーを${tapped ? 'タップ（アタック）' : 'アンタップ'}`, { ...prev, leader: { ...prev.leader, tapped } });
    });
  }, [addLog]);

  // ─── フィールドカードをトラッシュ（アタッチDON!!をアクティブへ返還）───
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

  // ─── 手札カードをトラッシュ（イベントはDON!!自動レスト）───
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

  // ─── デッキからドロー ───
  const drawCard = useCallback((count = 1) => {
    setState(prev => {
      if (!prev || prev.deck.length === 0) return prev;
      const n = Math.min(count, prev.deck.length);
      return addLog(`${n}枚ドロー`, { ...prev, deck: prev.deck.slice(n), hand: [...prev.hand, ...prev.deck.slice(0, n)] });
    });
  }, [addLog]);

  // ─── DON!!を手動でレスト ───
  const tapDon = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      const n = Math.min(count, prev.donActive);
      if (n <= 0) return addLog('レストできるDON!!がありません', prev);
      return addLog(`DON!!×${n}をレスト`, { ...prev, donActive: prev.donActive - n, donTapped: prev.donTapped + n });
    });
  }, [addLog]);

  // ─── DON!!をリーダーにアタッチ ───
  const attachDonToLeader = useCallback(() => {
    setState(prev => {
      if (!prev || prev.donActive <= 0) return addLog('アクティブDON!!がありません', prev ?? {});
      return addLog('DON!!をリーダーにアタッチ', {
        ...prev, donActive: prev.donActive - 1, donLeader: prev.donLeader + 1,
        leader: { ...prev.leader, donAttached: (prev.leader.donAttached || 0) + 1 },
      });
    });
  }, [addLog]);

  // ─── DON!!をフィールドカードにアタッチ ───
  const attachDonToField = useCallback((cardUid) => {
    setState(prev => {
      if (!prev || prev.donActive <= 0) return addLog('アクティブDON!!がありません', prev);
      const card = prev.field.find(c => c._uid === cardUid);
      if (!card) return prev;
      const newField = prev.field.map(c => c._uid === cardUid ? { ...c, donAttached: (c.donAttached || 0) + 1 } : c);
      return addLog(`「${card.name}」にDON!!アタッチ`, { ...prev, donActive: prev.donActive - 1, field: newField });
    });
  }, [addLog]);

  // ─── DON!!をアクティブ→DON!!デッキに返却（カード効果）───
  const returnDonToDeck = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      const n = Math.min(count, prev.donActive);
      if (n <= 0) return addLog('返却できるDON!!がありません', prev);
      return addLog(`DON!!×${n}をDON!!デッキに返却`, { ...prev, donActive: prev.donActive - n, donDeck: prev.donDeck + n });
    });
  }, [addLog]);

  // ─── ライフをめくる（ダメージ）───
  const flipLife = useCallback(() => {
    setState(prev => {
      if (!prev || prev.life.length === 0) return prev;
      const [top, ...rest] = prev.life;
      return addLog(`ライフをめくる →「${top.name}」（残り${rest.length}枚）`, {
        ...prev, life: rest, hand: [...prev.hand, { ...top, faceDown: false }],
      });
    });
  }, [addLog]);

  // ─── リセット ───
  const resetGame = useCallback(() => setState(null), []);

  return {
    state, startGame, mulligan, startMainGame, advancePhase,
    playToField, playStage, toggleFieldCard, toggleLeader,
    trashFieldCard, trashHandCard, drawCard, tapDon,
    attachDonToLeader, attachDonToField, returnDonToDeck, flipLife, resetGame,
  };
}
