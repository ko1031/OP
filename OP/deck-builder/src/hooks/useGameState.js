import { useState, useCallback } from 'react';
import { SAMPLE_DECKS } from '../utils/deckRules';

// localStorage からデッキ一覧を読み込む
const STORAGE_KEY = 'op_decks';
export function loadSavedDecks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

// 配列をフィッシャー–イェーツでシャッフル（破壊的）
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// デッキエントリ [{card, count}] → カード配列（重複展開）
export function expandDeck(entries) {
  const result = [];
  entries.forEach(({ card, count }) => {
    for (let i = 0; i < count; i++) result.push({ ...card, _uid: `${card.card_number}-${i}` });
  });
  return result;
}

// SAMPLE_DECKS エントリを allCards Map で解決して展開
export function resolveSampleDeck(sampleDeck, cardMap) {
  const entries = sampleDeck.deck
    .map(({ cardNumber, count }) => {
      const card = cardMap[cardNumber];
      return card ? { card, count } : null;
    })
    .filter(Boolean);
  return {
    leader: cardMap[sampleDeck.leaderCard] || null,
    entries,
    name: sampleDeck.name,
  };
}

// ─────────────────────────────────────────────
// 初期ゲーム状態を構築
// ─────────────────────────────────────────────
function buildInitialState(leader, deckCards) {
  // シャッフル済みデッキ
  const shuffled = shuffle([...deckCards]);

  // ライフ枚数 = リーダーの life 値（デフォルト5）
  const lifeCount = leader?.life ?? 5;

  // ライフをデッキ先頭から確保
  const life = shuffled.splice(0, lifeCount).map(c => ({ ...c, faceDown: true }));

  // 手札5枚ドロー
  const hand = shuffled.splice(0, 5);

  return {
    phase: 'mulligan',   // 'mulligan' | 'game'
    turn: 1,
    subPhase: 'main',    // 'refresh' | 'draw' | 'don' | 'main' | 'end'

    leader: { ...leader, tapped: false, donAttached: 0 },
    deck: shuffled,
    hand,
    life,                // [{...card, faceDown: true}]

    // キャラクターゾーン: 最大5スロット
    field: [],           // [{...card, tapped, donAttached}]
    stage: null,         // ステージカード

    // DON!!
    donDeck: 10,         // DON!!デッキ残り枚数
    donActive: 0,        // アクティブ(未タップ) DON!!枚数
    donTapped: 0,        // タップ済み DON!!枚数
    donLeader: 0,        // リーダーに付与した DON!!枚数

    trash: [],
    mulliganCount: 0,

    // ログ
    log: ['ゲーム開始！ マリガンしますか？'],
  };
}

// ─────────────────────────────────────────────
// useGameState フック
// ─────────────────────────────────────────────
export function useGameState() {
  const [state, setState] = useState(null); // null = デッキ未選択

  const addLog = useCallback((msg, prev) => ({
    ...prev,
    log: [`${msg}`, ...prev.log].slice(0, 40),
  }), []);

  // ─── デッキセットアップ ───
  const startGame = useCallback((leader, deckEntries) => {
    const cards = expandDeck(deckEntries);
    setState(buildInitialState(leader, cards));
  }, []);

  // ─── マリガン（何度でも可） ───
  const mulligan = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const lifeCount = prev.leader?.life ?? 5;
      // 手札をデッキに戻してシャッフル
      const combined = shuffle([...prev.hand, ...prev.deck]);
      const hand = combined.splice(0, 5);
      const newState = {
        ...prev,
        deck: combined,
        hand,
        mulliganCount: prev.mulliganCount + 1,
      };
      return addLog(`マリガン（${newState.mulliganCount}回目）`, newState);
    });
  }, [addLog]);

  // ─── ゲーム開始（マリガン確定） ───
  const startMainGame = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      // ターン1 DON!!フェイズ: 最初のターンは1枚
      const donGain = Math.min(1, prev.donDeck);
      return addLog('ゲーム開始！ターン1 — メインフェイズ', {
        ...prev,
        phase: 'game',
        subPhase: 'main',
        donDeck: prev.donDeck - donGain,
        donActive: prev.donActive + donGain,
      });
    });
  }, [addLog]);

  // ─── ターン終了 → 次のターン開始 ───
  const endTurn = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;

      // 全フィールドカードのタップ解除 & リーダーもアンタップ
      const newField = prev.field.map(c => ({ ...c, tapped: false }));
      const newLeader = { ...prev.leader, tapped: false };

      // DON!!: タップ済みをアンタップ（アクティブに戻す）
      const donActive = prev.donActive + prev.donTapped;
      const donTapped = 0;

      const nextTurn = prev.turn + 1;
      // ターン2以降: DON!!を2枚補充（残量と上限10まで）
      const currentTotal = donActive + prev.donLeader;
      const newFieldDon = newField.reduce((s, c) => s + (c.donAttached || 0), 0);
      const totalDonOut = currentTotal + newFieldDon;
      const canGain = Math.min(2, prev.donDeck, Math.max(0, 10 - totalDonOut));
      const newDonActive = donActive + canGain;
      const newDonDeck = prev.donDeck - canGain;

      // ドローフェイズ: 1枚ドロー
      let newDeck = [...prev.deck];
      let newHand = [...prev.hand];
      if (newDeck.length > 0) {
        newHand = [...newHand, newDeck[0]];
        newDeck = newDeck.slice(1);
      }

      return addLog(`ターン${nextTurn} — ドロー＆DON!!+${canGain}`, {
        ...prev,
        turn: nextTurn,
        subPhase: 'main',
        field: newField,
        leader: newLeader,
        donActive: newDonActive,
        donTapped,
        donDeck: newDonDeck,
        deck: newDeck,
        hand: newHand,
      });
    });
  }, [addLog]);

  // ─── 手札からキャラクターをフィールドに出す ───
  const playToField = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      if (prev.field.length >= 5) return addLog('フィールドが満員です（最大5枚）', prev);
      const idx = prev.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = prev.hand[idx];
      if (card.card_type !== 'CHARACTER') return addLog('キャラクターのみフィールドに出せます', prev);
      const newHand = prev.hand.filter((_, i) => i !== idx);
      const newField = [...prev.field, { ...card, tapped: false, donAttached: 0 }];
      return addLog(`「${card.name}」をフィールドに出した`, { ...prev, hand: newHand, field: newField });
    });
  }, [addLog]);

  // ─── ステージをプレイ ───
  const playStage = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const idx = prev.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = prev.hand[idx];
      if (card.card_type !== 'STAGE') return addLog('ステージカードではありません', prev);
      const newHand = prev.hand.filter((_, i) => i !== idx);
      const newTrash = prev.stage ? [...prev.trash, prev.stage] : prev.trash;
      return addLog(`ステージ「${card.name}」をプレイ`, { ...prev, hand: newHand, stage: card, trash: newTrash });
    });
  }, [addLog]);

  // ─── フィールドカードをタップ/アンタップ ───
  const toggleFieldCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const newField = prev.field.map(c =>
        c._uid === cardUid ? { ...c, tapped: !c.tapped } : c
      );
      const card = prev.field.find(c => c._uid === cardUid);
      return addLog(`「${card?.name}」を${card?.tapped ? 'アンタップ' : 'タップ'}`, { ...prev, field: newField });
    });
  }, [addLog]);

  // ─── リーダーをタップ/アンタップ ───
  const toggleLeader = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const tapped = !prev.leader.tapped;
      return addLog(`リーダーを${tapped ? 'タップ' : 'アンタップ'}`, {
        ...prev, leader: { ...prev.leader, tapped },
      });
    });
  }, [addLog]);

  // ─── フィールドカードをトラッシュ ───
  const trashFieldCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const card = prev.field.find(c => c._uid === cardUid);
      if (!card) return prev;
      const newField = prev.field.filter(c => c._uid !== cardUid);
      return addLog(`「${card.name}」をKO → トラッシュ`, {
        ...prev, field: newField, trash: [...prev.trash, card],
      });
    });
  }, [addLog]);

  // ─── 手札カードをトラッシュ ───
  const trashHandCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const idx = prev.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = prev.hand[idx];
      const newHand = prev.hand.filter((_, i) => i !== idx);
      return addLog(`「${card.name}」をトラッシュ（手札から）`, {
        ...prev, hand: newHand, trash: [...prev.trash, card],
      });
    });
  }, [addLog]);

  // ─── デッキからドロー ───
  const drawCard = useCallback((count = 1) => {
    setState(prev => {
      if (!prev || prev.deck.length === 0) return prev;
      const n = Math.min(count, prev.deck.length);
      const drawn = prev.deck.slice(0, n);
      return addLog(`${n}枚ドロー`, {
        ...prev,
        deck: prev.deck.slice(n),
        hand: [...prev.hand, ...drawn],
      });
    });
  }, [addLog]);

  // ─── DON!!をタップ（コスト支払い） ───
  const tapDon = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      const n = Math.min(count, prev.donActive);
      if (n <= 0) return addLog('タップできるDON!!がありません', prev);
      return addLog(`DON!!を${n}枚タップ`, {
        ...prev,
        donActive: prev.donActive - n,
        donTapped: prev.donTapped + n,
      });
    });
  }, [addLog]);

  // ─── DON!!をリーダーにアタッチ ───
  const attachDonToLeader = useCallback(() => {
    setState(prev => {
      if (!prev || prev.donActive <= 0) return prev;
      return addLog('DON!!をリーダーにアタッチ', {
        ...prev,
        donActive: prev.donActive - 1,
        donLeader: prev.donLeader + 1,
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
      const newField = prev.field.map(c =>
        c._uid === cardUid ? { ...c, donAttached: (c.donAttached || 0) + 1 } : c
      );
      return addLog(`「${card.name}」にDON!!アタッチ`, {
        ...prev, donActive: prev.donActive - 1, field: newField,
      });
    });
  }, [addLog]);

  // ─── ライフをめくる（ダメージ処理） ───
  const flipLife = useCallback(() => {
    setState(prev => {
      if (!prev || prev.life.length === 0) return prev;
      const [top, ...rest] = prev.life;
      const flipped = { ...top, faceDown: false };
      // トリガーの場合は手札へ、それ以外もとりあえず手札へ追加
      return addLog(`ライフをめくる →「${top.name}」（残り${rest.length}枚）`, {
        ...prev,
        life: rest,
        hand: [...prev.hand, flipped],
      });
    });
  }, [addLog]);

  // ─── ゲームリセット ───
  const resetGame = useCallback(() => {
    setState(null);
  }, []);

  return {
    state,
    startGame,
    mulligan,
    startMainGame,
    endTurn,
    playToField,
    playStage,
    toggleFieldCard,
    toggleLeader,
    trashFieldCard,
    trashHandCard,
    drawCard,
    tapDon,
    attachDonToLeader,
    attachDonToField,
    flipLife,
    resetGame,
  };
}
