import { useState, useMemo, useEffect } from 'react';
import { Layers, AlertCircle } from 'lucide-react';
import FilterPanel from './components/FilterPanel';
import CardGrid from './components/CardGrid';
import DeckPanel from './components/DeckPanel';
import { useDeck } from './hooks/useDeck';
import { hasTrigger } from './utils/deckRules';

let cachedCards = null;
async function fetchCards() {
  if (cachedCards) return cachedCards;
  const res = await fetch('./cards.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cachedCards = data;
  return data;
}

function applyFilters(cards, filters) {
  return cards.filter(card => {
    if (filters.text) {
      const q = filters.text.toLowerCase();
      const match = card.name?.toLowerCase().includes(q)
        || card.effect?.toLowerCase().includes(q)
        || card.traits?.some(t => t.toLowerCase().includes(q))
        || card.card_number?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filters.colors?.length > 0) {
      if (!(card.colors||[]).some(c => filters.colors.includes(c))) return false;
    }
    if (filters.types?.length > 0) {
      if (!filters.types.includes(card.card_type)) return false;
    }
    if (filters.series) {
      if (card.series_id !== filters.series) return false;
    }
    const cost = card.cost ?? card.life ?? null;
    if (filters.costMin !== '' && filters.costMin != null && cost != null && cost < filters.costMin) return false;
    if (filters.costMax !== '' && filters.costMax != null && cost != null && cost > filters.costMax) return false;
    if (filters.counterOnly) {
      const hasCounter = card.counter || (card.card_type === 'EVENT' && card.effect?.includes('【カウンター】'));
      if (!hasCounter) return false;
    }
    if (filters.triggerOnly) {
      if (!hasTrigger(card)) return false;
    }
    return true;
  });
}

export default function App() {
  const [allCards, setAllCards] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [toast, setToast] = useState(null);
  const deck = useDeck();

  useEffect(() => {
    fetchCards()
      .then(data => { setAllCards(data.cards||[]); setSeriesList(data.series||[]); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const filteredCards = useMemo(() => applyFilters(allCards, filters), [allCards, filters]);

  const showToast = (msg, type='info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  };

  const handleAddCard = (card) => {
    const result = deck.addCard(card);
    if (result && !result.ok) showToast(result.reason, 'error');
    return result;
  };

  const handleSelectLeader = (card) => {
    deck.selectLeader(card);
    showToast(`リーダー「${card.name}」を選択しました`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <header className="flex-shrink-0 bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center gap-3">
        <Layers size={22} className="text-red-500" />
        <span className="text-white font-bold text-lg tracking-wide">ONE PIECE デッキ構築</span>
        {!loading && <span className="text-gray-500 text-xs ml-2">{allCards.length.toLocaleString()}枚</span>}
      </header>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-gray-400">カードデータを読み込み中…</div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-400">
            <AlertCircle size={40} className="mx-auto mb-3" />
            <div>カードデータの読み込みに失敗しました</div>
            <div className="text-sm text-gray-500 mt-2">scraper/data/cards.json を public/cards.json にコピーしてください</div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1 overflow-hidden border-r border-gray-700">
            <FilterPanel filters={filters} onChange={setFilters} seriesList={seriesList} />
            <div className="flex-1 overflow-hidden">
              <CardGrid cards={filteredCards} deck={deck.deck} leader={deck.leader}
                onAddCard={handleAddCard} onSelectLeader={handleSelectLeader} />
            </div>
          </div>
          <div className="w-72 flex-shrink-0 overflow-hidden">
            <DeckPanel
              leader={deck.leader} deck={deck.deck} total={deck.total}
              deckName={deck.deckName} setDeckName={deck.setDeckName}
              onAddCard={handleAddCard} onRemoveCard={deck.removeCard}
              onRemoveAllCard={deck.removeAllCard} onReset={deck.resetDeck}
              onSave={deck.saveDeck} onLoad={deck.loadDeck}
              onDeleteSaved={deck.deleteSavedDeck} loadDecks={deck.loadDecks}
            />
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium shadow-xl z-50
          ${toast.type==='error' ? 'bg-red-800 text-red-100' : 'bg-gray-700 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
