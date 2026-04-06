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
export const LEADER_EFFECTS = {
  // 紫エネル — DON!!デッキ6枚、起動メインで一括追加
  'OP15-058': {
    donDeckInit: 6,
    donMax: 6,
    note: 'DON!!デッキは6枚。ゾーン最大6枚。',
    activeAbility: '【起動メイン・ターン1回】第2ターン以降: DON!!デッキから1枚アクティブ＋最大4枚レストで追加し、レストDON!!4枚まで自分のキャラに付与',
    hasActiveAbility: true,
  },

  // 赤エドワード・ニューゲート — ターン終了時ライフ上から手札
  'OP02-001': {
    onEndPhase: 'lifeTopToHand',
    note: '自分のターン終了時: ライフ上から1枚を手札に加える',
  },

  // 緑紫ドフラミンゴ — ターン終了時DON!!×2アクティブに（ライフ4）
  'OP04-019': {
    onEndPhase: 'activateDon2',
    note: '自分のターン終了時: DON!!×2までをアクティブにする',
  },

  // 緑黄しらほし — リーダーはアタック不可
  'OP11-022': {
    leaderCannotAttack: true,
    note: 'このリーダーはアタックできない',
    activeAbility: '【起動メイン・ターン1回】DON!!1枚レスト → ライフ上から1枚表向き: 手札からDON!!の枚数以下のコストの《海王類》か「メガロ」1枚まで登場',
    hasActiveAbility: true,
  },

  // 青ナミ — デッキ0枚で勝利（特殊勝利条件）
  'OP03-040': {
    specialWin: 'deckEmpty',
    note: 'デッキが0枚になった時、勝利',
  },

  // 赤ニューゲート（別バージョンがあれば）
  // OP02-001は上で定義済み

  // 緑ミホーク OP14-020 — 手動効果のみ（起動メイン）
  'OP14-020': {
    activeAbility: '【起動メイン・ターン1回】自分のカード1枚レスト: コスト5以上のキャラがいる場合、DON!!×3をアクティブに。その後このターン、キャラカードは登場不可',
    hasActiveAbility: true,
    note: '起動メイン効果あり（カード1枚レスト→DON!!×3アクティブ）',
  },

  // 赤ゾロ OP01-001 — ドン!!×1自分ターン中全キャラ+1000
  'OP01-001': {
    note: '【ドン!!×1】自分のターン中: 自分のキャラすべてパワー+1000',
  },

  // 青黒サカズキ OP05-041 — ライフ4、手動効果
  'OP05-041': {
    activeAbility: '【起動メイン・ターン1回】手札1枚捨て→1枚ドロー | 【アタック時】相手のキャラ1枚コスト-1（このターン）',
    hasActiveAbility: true,
    note: 'ライフ4枚スタート。起動メイン: 手札入替',
  },

  // 赤紫ウタ OP06-001 — ライフ4
  'OP06-001': {
    note: 'ライフ4枚スタート',
  },

  // 黒モリア OP06-080
  'OP06-080': {
    note: '【ドン!!×1・アタック時】手札1枚捨て→デッキ上2枚トラッシュ→《スリラーバーク》コスト4以下キャラ登場',
  },

  // 紫マゼラン OP02-071 — ドンがデッキに戻るとパワー+1000
  'OP02-071': {
    note: '【自分のターン中・ターン1回】DON!!がデッキに戻された時、このターンパワー+1000',
  },

  // 赤青チョッパー OP08-001 — ライフ4
  'OP08-001': {
    note: 'ライフ4枚スタート | 起動メイン: 《動物》か《ドラム王国》キャラ3枚にDON!!1枚ずつ付与',
    hasActiveAbility: true,
    activeAbility: '【起動メイン・ターン1回】《動物》か《ドラム王国》を持つキャラ3枚までに、レストのDON!!1枚ずつを付与',
  },

  // 赤緑スモーカー OP10-001 — ライフ4、起動メイン
  'OP10-001': {
    activeAbility: '【起動メイン・ターン1回】パワー7000以上のキャラがいる場合、DON!!×2をアクティブにできる',
    hasActiveAbility: true,
    note: 'ライフ4枚スタート',
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
    mulliganCount: 0,
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
        const newField = prev.field.map(c => ({ ...c, tapped: false }));
        const newLeader = { ...prev.leader, tapped: false };
        const restored = prev.donTapped;
        return addLog(
          `リフレッシュ: 全カードアンタップ${restored > 0 ? `・DON!!×${restored}アクティブへ` : ''}`,
          { ...prev, subPhase: 'draw', field: newField, leader: newLeader, donActive: prev.donActive + restored, donTapped: 0 }
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
            ...ns, life: rest, hand: [...ns.hand, { ...top, faceDown: false }],
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

  const returnDonToDeck = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      const n = Math.min(count, prev.donActive);
      if (n <= 0) return addLog('返却できるDON!!がありません', prev);
      return addLog(`DON!!×${n}をDON!!デッキに返却`, { ...prev, donActive: prev.donActive - n, donDeck: prev.donDeck + n });
    });
  }, [addLog]);

  const flipLife = useCallback(() => {
    setState(prev => {
      if (!prev || prev.life.length === 0) return prev;
      const [top, ...rest] = prev.life;
      return addLog(`ライフをめくる →「${top.name}」（残り${rest.length}枚）`, {
        ...prev, life: rest, hand: [...prev.hand, { ...top, faceDown: false }],
      });
    });
  }, [addLog]);

  const resetGame = useCallback(() => setState(null), []);

  return {
    state, startGame, mulligan, startMainGame, advancePhase,
    playToField, playStage, toggleFieldCard, toggleLeader,
    trashFieldCard, trashHandCard, drawCard, tapDon,
    attachDonToLeader, attachDonToField, returnDonToDeck, flipLife,
    useEnelAbility, useMihawkAbility,
    resetGame,
  };
}
