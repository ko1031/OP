import { useState, useMemo, useEffect } from 'react';
import { Layers, AlertCircle, Search, Trophy } from 'lucide-react';
import FilterPanel from './components/FilterPanel';
import CardGrid from './components/CardGrid';
import DeckPanel from './components/DeckPanel';
import SampleDeckPanel from './components/SampleDeckPanel';
import { useDeck } from './hooks/useDeck';
import { hasTrigger, DECK_LIMIT } from './utils/deckRules';

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
  const [mobileView, setMobileView] = useState('cards'); // 'cards' | 'deck'
  const [showSampleDecks, setShowSampleDecks] = useState(false);
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

  // サンプルデッキのコピー（リーダー + デッキ一括セット）
  const handleLoadSampleDeck = (sampleDeck) => {
    const cardMap = {};
    allCards.forEach(c => { cardMap[c.card_number] = c; });

    const leaderCard = cardMap[sampleDeck.leaderCard];
    if (!leaderCard) return;

    // リセットしてからロード
    deck.resetDeck();
    deck.selectLeader(leaderCard);

    // カードを順に追加
    sampleDeck.deck.forEach(({ cardNumber, count }) => {
      const card = cardMap[cardNumber];
      if (card) {
        for (let i = 0; i < count; i++) deck.addCard(card);
      }
    });

    setShowSampleDecks(false);
    setMobileView('deck');
    showToast(`「${sampleDeck.name}」をデッキにコピーしました`);
  };

  const isComplete = deck.total === DECK_LIMIT;

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* ヘッダー */}
      <header className="flex-shrink-0 bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 border-b border-gray-700/80 px-4 py-2.5 flex items-center gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <Layers size={20} className="text-red-400 flex-shrink-0" />
          <span className="text-white font-bold text-sm sm:text-base tracking-wide">
            ONE PIECE デッキビルダー
          </span>
        </div>
        {!loading && (
          <span className="text-gray-600 text-xs hidden sm:inline">
            {allCards.length.toLocaleString()}枚収録
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* サンプルデッキボタン */}
          {!loading && !error && (
            <button
              onClick={() => setShowSampleDecks(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-yellow-600/50 bg-yellow-700/20 text-yellow-300 hover:bg-yellow-700/30 transition-colors"
            >
              <Trophy size={12} />
              <span className="hidden sm:inline">優勝デッキ</span>
            </button>
          )}
          {/* デッキ枚数バッジ */}
          {!loading && !error && deck.total > 0 && (
            <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border transition-all duration-300
              ${isComplete
                ? 'bg-green-700/30 text-green-300 border-green-600/60'
                : 'bg-gray-700/40 text-gray-400 border-gray-600/60'
              }`}>
              {isComplete ? '✓ 完成' : `${deck.total} / ${DECK_LIMIT}`}
            </div>
          )}
        </div>
      </header>

      {/* ローディング */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-gray-400 text-sm">カードデータを読み込み中…</div>
          </div>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-red-400">
            <AlertCircle size={40} className="mx-auto mb-3" />
            <div className="font-medium">カードデータの読み込みに失敗しました</div>
            <div className="text-sm text-gray-500 mt-2">
              scraper/data/cards.json を public/cards.json にコピーしてください
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      {!loading && !error && (
        <div className="flex flex-1 overflow-hidden">
          {/* 左: カード検索エリア — モバイルは 'cards' ビューのみ表示 */}
          <div className={`flex-col flex-1 overflow-hidden border-r border-gray-700/80
            ${mobileView === 'cards' ? 'flex' : 'hidden'} md:flex`}>
            <FilterPanel filters={filters} onChange={setFilters} seriesList={seriesList} />
            <div className="flex-1 overflow-hidden">
              <CardGrid
                cards={filteredCards}
                deck={deck.deck}
                leader={deck.leader}
                onAddCard={handleAddCard}
                onRemoveCard={deck.removeCard}
                onSelectLeader={handleSelectLeader}
              />
            </div>
          </div>

          {/* 右: デッキパネル — モバイルは 'deck' ビューのみ表示 */}
          <div className={`flex-col overflow-hidden md:w-80 md:flex-shrink-0
            ${mobileView === 'deck' ? 'flex w-full' : 'hidden'} md:flex`}>
            <DeckPanel
              leader={deck.leader}
              deck={deck.deck}
              total={deck.total}
              deckName={deck.deckName}
              setDeckName={deck.setDeckName}
              onAddCard={handleAddCard}
              onRemoveCard={deck.removeCard}
              onRemoveAllCard={deck.removeAllCard}
              onReset={deck.resetDeck}
              onSave={deck.saveDeck}
              onLoad={deck.loadDeck}
              onDeleteSaved={deck.deleteSavedDeck}
              loadDecks={deck.loadDecks}
            />
          </div>
        </div>
      )}

      {/* モバイル用ボトムナビ */}
      {!loading && !error && (
        <nav className="md:hidden flex-shrink-0 flex border-t border-gray-700/80 bg-gray-900">
          <button
            onClick={() => setMobileView('cards')}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors tap-highlight-transparent
              ${mobileView === 'cards'
                ? 'text-blue-400 border-t-2 border-blue-400 -mt-px bg-blue-500/5'
                : 'text-gray-500 active:text-gray-300'}`}
          >
            <Search size={19} />
            カード検索
          </button>
          <button
            onClick={() => setMobileView('deck')}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors relative tap-highlight-transparent
              ${mobileView === 'deck'
                ? 'text-blue-400 border-t-2 border-blue-400 -mt-px bg-blue-500/5'
                : 'text-gray-500 active:text-gray-300'}`}
          >
            <div className="relative">
              <Layers size={19} />
              {deck.total > 0 && (
                <span className={`absolute -top-1.5 -right-2.5 text-[9px] font-black px-1 min-w-[16px] h-4 flex items-center justify-center rounded-full
                  ${isComplete ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
                  {deck.total}
                </span>
              )}
            </div>
            デッキ
          </button>
        </nav>
      )}

      {/* サンプルデッキパネル */}
      {showSampleDecks && (
        <SampleDeckPanel
          allCards={allCards}
          onCopy={handleLoadSampleDeck}
          onClose={() => setShowSampleDecks(false)}
        />
      )}

      {/* トースト通知 */}
      {toast && (
        <div className={`fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium shadow-xl z-50 whitespace-nowrap pointer-events-none
          ${toast.type === 'error' ? 'bg-red-800/95 text-red-100' : 'bg-gray-700/95 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
