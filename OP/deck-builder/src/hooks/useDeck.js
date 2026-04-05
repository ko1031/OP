import { useState, useCallback } from 'react';
import { canAddCard, deckTotal } from '../utils/deckRules';

const STORAGE_KEY = 'op_decks';

function loadDecks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

export function useDeck() {
  const [leader, setLeader] = useState(null);
  const [deck, setDeck] = useState([]); // [{card, count}]
  const [deckName, setDeckName] = useState('新規デッキ');

  // ---- リーダー選択 ----
  const selectLeader = useCallback((card) => {
    setLeader(card);
    // リーダーの色と合わないカードをデッキから除外
    setDeck(prev => prev.filter(({ card: c }) => {
      const leaderColors = card.colors || [];
      const cardColors = c.colors || [];
      return cardColors.some(col => leaderColors.includes(col));
    }));
  }, []);

  // ---- カード追加 ----
  const addCard = useCallback((card) => {
    const result = canAddCard(deck, card, leader);
    if (!result.ok) return result;

    setDeck(prev => {
      const idx = prev.findIndex(e => e.card.card_number === card.card_number);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], count: next[idx].count + 1 };
        return next;
      }
      return [...prev, { card, count: 1 }];
    });
    return { ok: true };
  }, [deck, leader]);

  // ---- カード削除（1枚ずつ） ----
  const removeCard = useCallback((cardNumber) => {
    setDeck(prev => {
      const idx = prev.findIndex(e => e.card.card_number === cardNumber);
      if (idx < 0) return prev;
      const next = [...prev];
      if (next[idx].count > 1) {
        next[idx] = { ...next[idx], count: next[idx].count - 1 };
      } else {
        next.splice(idx, 1);
      }
      return next;
    });
  }, []);

  // ---- カード全削除 ----
  const removeAllCard = useCallback((cardNumber) => {
    setDeck(prev => prev.filter(e => e.card.card_number !== cardNumber));
  }, []);

  // ---- デッキリセット ----
  const resetDeck = useCallback(() => {
    setLeader(null);
    setDeck([]);
    setDeckName('新規デッキ');
  }, []);

  // ---- 保存 ----
  const saveDeck = useCallback(() => {
    if (!leader) return { ok: false, reason: 'リーダーを選択してください' };
    const decks = loadDecks();
    const id = Date.now().toString();
    decks[id] = { id, name: deckName, leader, deck, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
    return { ok: true, id };
  }, [leader, deck, deckName]);

  // ---- 読み込み ----
  const loadDeck = useCallback((deckId) => {
    const decks = loadDecks();
    const saved = decks[deckId];
    if (!saved) return;
    setLeader(saved.leader);
    setDeck(saved.deck);
    setDeckName(saved.name);
  }, []);

  // ---- 削除 ----
  const deleteSavedDeck = useCallback((deckId) => {
    const decks = loadDecks();
    delete decks[deckId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  }, []);

  return {
    leader, deck, deckName, setDeckName,
    total: deckTotal(deck),
    selectLeader, addCard, removeCard, removeAllCard, resetDeck,
    saveDeck, loadDeck, deleteSavedDeck, loadDecks,
  };
}
