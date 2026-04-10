import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Layers, AlertCircle, Search, Trophy, BarChart2 } from 'lucide-react';
import FilterPanel from './components/FilterPanel';
import CardGrid from './components/CardGrid';
import DeckPanel from './components/DeckPanel';
import SampleDeckPanel from './components/SampleDeckPanel';
import TournamentPanel from './components/TournamentPanel';
import PirateMapBg from './components/PirateMapBg';
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

/** 効果テキストの「」〔〕内の名称をすべて抽出 */
function extractQuotedNames(text) {
  const names = [];
  const re1 = /「([^」]+)」/g;
  const re2 = /〔([^〕]+)〕/g;
  let m;
  while ((m = re1.exec(text)) !== null) names.push(m[1]);
  while ((m = re2.exec(text)) !== null) names.push(m[1]);
  return names;
}

/**
 * リーダーカードが設定されている場合はリーダーの色のみ、未設定なら色制限なし
 */
function getLeaderColors(leader) {
  return leader?.colors?.length > 0 ? [...leader.colors] : undefined;
}

// テキスト内の色名 → データ上の色コード対応表
const COLOR_JP_MAP = {
  '赤': 'RED', '青': 'BLUE', '緑': 'GREEN',
  '紫': 'PURPLE', '黄': 'YELLOW', '黒': 'BLACK',
};
// テキスト内のカード種別 → データ上のカード種別対応表
const TYPE_JP_MAP = {
  'キャラ': 'CHARACTER', 'イベント': 'EVENT', 'ステージ': 'STAGE',
};

/**
 * ① カードテキストに合致するカードを検索
 * 効果テキスト内の「」〔〕に書かれた名称・種族、
 * またはコスト条件・色・カード種別を手がかりに検索
 */
function buildTextSynergyFilter(card, allCards, leaderColors) {
  const allText = (card.effect || '') + ' ' + (card.trigger || '');
  const quotedNames = extractQuotedNames(allText);
  const f = {};
  if (leaderColors) f.colors = leaderColors;

  if (allCards?.length > 0) {
    // コスト制約付きカード検索パターン
    // キャラ / イベント / ステージ すべてに対応し、色の記載も取得する
    // 例: "コスト5以下の紫のイベント", "コスト3以下の赤のキャラ", "コスト4以下のステージ"
    const costPattern = /コスト(\d+)(以下|以上)[^。\n]{0,15}?(赤|青|緑|紫|黄|黒)?[^。\n]{0,5}?(キャラ|イベント|ステージ)/;
    const costMatch = allText.match(costPattern);
    if (costMatch) {
      const costNum  = parseInt(costMatch[1]);
      const isMax    = costMatch[2] === '以下';
      const colorJp  = costMatch[3]; // テキスト内の色（例: "紫"）
      const typeJp   = costMatch[4]; // テキスト内のカード種別（例: "イベント"）

      f.types = [TYPE_JP_MAP[typeJp]];
      if (isMax) f.costMax = costNum; else f.costMin = costNum;
      // テキストに色が明示されている場合はリーダー色より優先する
      if (colorJp) f.colors = [COLOR_JP_MAP[colorJp]];
      return f;
    }

    // パワー制約付きカード検索パターン
    // 例: "パワー4000以下の紫のキャラカード", "パワー5000以下のキャラ"
    const powerPattern = /パワー(\d+)(以下|以上)[^。\n]{0,15}?(赤|青|緑|紫|黄|黒)?[^。\n]{0,5}?(キャラ|イベント|ステージ)/;
    const powerMatch = allText.match(powerPattern);
    if (powerMatch) {
      const powerNum = parseInt(powerMatch[1]);
      const isMax    = powerMatch[2] === '以下';
      const colorJp  = powerMatch[3];
      const typeJp   = powerMatch[4];

      f.types = [TYPE_JP_MAP[typeJp]];
      if (isMax) f.powerMax = powerNum; else f.powerMin = powerNum;
      if (colorJp) f.colors = [COLOR_JP_MAP[colorJp]];
      return f;
    }

    // 効果内の特定種族（特徴）
    const allTraits = new Set(allCards.flatMap(c => c.traits || []));
    const matchedTrait = quotedNames.find(n => allTraits.has(n));
    if (matchedTrait) { f.text = matchedTrait; return f; }

    // 効果内の特定カード名
    const cardNameSet = new Set(
      allCards.filter(c => c.card_number !== card.card_number).map(c => c.name)
    );
    const matchedCardName = quotedNames.find(n => cardNameSet.has(n));
    if (matchedCardName) { f.text = matchedCardName; return f; }

    // このカードの名前が他カードの効果テキストに登場する
    if (card.name) {
      const nameHits = allCards.filter(c =>
        c.card_number !== card.card_number &&
        ((c.effect || '').includes(card.name) || (c.trigger || '').includes(card.name))
      );
      if (nameHits.length > 0) { f.text = card.name; return f; }
    }
  }

  // フォールバック: テキスト検索なし（色だけ）
  return f;
}

/**
 * ② 種族が同じカードを検索
 * 選択カードの特徴（traits）をテキスト検索キーワードに使用
 */
function buildTraitSynergyFilter(card, leaderColors) {
  const f = {};
  if (leaderColors) f.colors = leaderColors;
  if ((card.traits || []).length > 0) {
    f.text = card.traits[0]; // 最初の特徴で検索
  }
  return f;
}

/**
 * ③ カード名が同じカードを検索
 * 選択カードの名前で検索（同キャラの別バージョンを探す）
 */
function buildNameSynergyFilter(card, leaderColors) {
  const f = {};
  if (leaderColors) f.colors = leaderColors;
  if (card.name) f.text = card.name;
  return f;
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
    // ブロックアイコンフィルター
    if (filters.regulations?.length > 0) {
      if (!filters.regulations.includes(card.block_icon ?? '')) return false;
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
    const cost = card.cost != null ? card.cost : (card.life ?? null);
    const hasCostMin = filters.costMin !== '' && filters.costMin != null;
    const hasCostMax = filters.costMax !== '' && filters.costMax != null;
    // コストフィルターが有効な場合、costが不明なカードは除外
    if ((hasCostMin || hasCostMax) && cost == null) return false;
    if (hasCostMin && cost < filters.costMin) return false;
    if (hasCostMax && cost > filters.costMax) return false;
    const power = card.power ?? null;
    const hasPowerMin = filters.powerMin !== '' && filters.powerMin != null;
    const hasPowerMax = filters.powerMax !== '' && filters.powerMax != null;
    // パワーフィルターが有効な場合、powerが不明なカードは除外
    if ((hasPowerMin || hasPowerMax) && power == null) return false;
    if (hasPowerMin && power < filters.powerMin) return false;
    if (hasPowerMax && power > filters.powerMax) return false;
    if (filters.triggerOnly) {
      if (!hasTrigger(card)) return false;
    }
    if (filters.keywords?.length > 0) {
      const effectText = (card.effect || '') + ' ' + (card.trigger || '');
      const allMatch = filters.keywords.every(kw => effectText.includes(kw));
      if (!allMatch) return false;
    }
    return true;
  });
}

export default function App({ onNavigate }) {
  const [allCards, setAllCards] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [toast, setToast] = useState(null);
  const [mobileView, setMobileView] = useState('cards'); // 'cards' | 'deck'
  const [showSampleDecks, setShowSampleDecks] = useState(false);
  const [showTournament, setShowTournament] = useState(false);
  const deck = useDeck();

  // ── リサイズ可能パネル ──
  const [deckWidth, setDeckWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('deckPanelWidth');
      return saved ? Math.max(300, Math.min(900, parseInt(saved, 10))) : 520;
    } catch { return 520; }
  });
  const deckWidthRef = useRef(deckWidth);
  const containerRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMouseMove = (ev) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newW = Math.max(300, Math.min(rect.width - 280, rect.right - ev.clientX));
      deckWidthRef.current = newW;
      setDeckWidth(newW);
    };
    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setIsResizing(false);
      try { localStorage.setItem('deckPanelWidth', String(deckWidthRef.current)); } catch {}
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

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

  const handleFindByText = (card) => {
    setFilters(buildTextSynergyFilter(card, allCards, getLeaderColors(deck.leader)));
    setMobileView('cards');
  };

  const handleFindByTrait = (card) => {
    setFilters(buildTraitSynergyFilter(card, getLeaderColors(deck.leader)));
    setMobileView('cards');
  };

  const handleFindByName = (card) => {
    setFilters(buildNameSynergyFilter(card, getLeaderColors(deck.leader)));
    setMobileView('cards');
  };

  // サンプルデッキの丸ごと差し替え（リセットせず1回のstateで差し替え）
  const handleLoadSampleDeck = (sampleDeck) => {
    const cardMap = {};
    allCards.forEach(c => { cardMap[c.card_number] = c; });

    const leaderCard = cardMap[sampleDeck.leaderCard];
    if (!leaderCard) return;

    // デッキエントリを事前に組み立てて一括差し替え
    const entries = [];
    sampleDeck.deck.forEach(({ cardNumber, count }) => {
      const card = cardMap[cardNumber];
      if (card) entries.push({ card, count });
    });

    deck.replaceDeck(leaderCard, entries, sampleDeck.name);

    setShowSampleDecks(false);
    setMobileView('deck');
    showToast(`「${sampleDeck.name}」をデッキにコピーしました`);
  };

  const isComplete = deck.total === DECK_LIMIT;

  return (
    <div className="flex flex-col h-screen bg-[#06091a] relative overflow-hidden">
      {/* 海賊地図背景 */}
      <PirateMapBg />

      {/* ヘッダー */}
      <header className="flex-shrink-0 relative z-10 px-4 py-2.5 flex items-center gap-3 shadow-lg"
        style={{ background: 'linear-gradient(90deg, #080c1e 0%, #0d1530 50%, #080c1e 100%)', borderBottom: '1px solid rgba(139,105,20,0.35)' }}>
        <div className="flex items-center gap-2.5">
          {onNavigate && (
            <button
              onClick={() => onNavigate('home')}
              className="text-amber-700/60 hover:text-amber-400 transition-colors mr-1 flex-shrink-0"
              title="トップへ"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </button>
          )}
          {/* 海賊旗アイコン */}
          <svg width="20" height="20" viewBox="0 0 100 100" fill="none" className="flex-shrink-0">
            <ellipse cx="50" cy="40" rx="24" ry="22" fill="#c9a227" opacity="0.9"/>
            <circle cx="38" cy="38" r="6" fill="#06091a"/>
            <circle cx="62" cy="38" r="6" fill="#06091a"/>
            <ellipse cx="50" cy="50" rx="4" ry="3" fill="#06091a" opacity="0.5"/>
            <rect x="38" y="56" width="6" height="8" rx="2" fill="#c9a227" opacity="0.8"/>
            <rect x="47" y="56" width="6" height="8" rx="2" fill="#c9a227" opacity="0.8"/>
            <rect x="56" y="56" width="6" height="8" rx="2" fill="#c9a227" opacity="0.8"/>
            <line x1="12" y1="78" x2="88" y2="90" stroke="#c9a227" strokeWidth="7" strokeLinecap="round" opacity="0.7"/>
            <line x1="88" y1="78" x2="12" y2="90" stroke="#c9a227" strokeWidth="7" strokeLinecap="round" opacity="0.7"/>
          </svg>
          <span className="font-black text-sm sm:text-base tracking-wide"
            style={{ background: 'linear-gradient(180deg, #f5d78e 0%, #c9a227 60%, #8b6914 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ONE PIECE デッキビルダー
          </span>
        </div>
        {!loading && (
          <span className="text-amber-800/50 text-xs hidden sm:inline">
            {allCards.length.toLocaleString()}枚収録
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* 大会統計ボタン */}
          {!loading && !error && (
            <button
              onClick={() => setShowTournament(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-600/50 bg-blue-900/30 text-blue-300 hover:bg-blue-800/40 transition-colors"
            >
              <BarChart2 size={12} />
              <span className="hidden sm:inline">大会統計</span>
            </button>
          )}
          {/* サンプルデッキボタン */}
          {!loading && !error && (
            <button
              onClick={() => setShowSampleDecks(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-600/50 bg-amber-900/20 text-amber-300 hover:bg-amber-800/30 transition-colors"
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
                : 'bg-amber-900/30 text-amber-400 border-amber-700/40'
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
        <div ref={containerRef} className="flex flex-1 overflow-hidden relative z-10">
          {/* 左: カード検索エリア — モバイルは 'cards' ビューのみ表示 */}
          <div className={`flex-col flex-1 overflow-hidden
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
                onFindByText={handleFindByText}
                onFindByTrait={handleFindByTrait}
                onFindByName={handleFindByName}
              />
            </div>
          </div>

          {/* ドラッグリサイザー（PCのみ表示） */}
          <div
            onMouseDown={handleDividerMouseDown}
            className={`hidden md:flex flex-shrink-0 w-1.5 cursor-col-resize items-center justify-center
              border-l border-amber-900/30 transition-colors group
              ${isResizing ? 'bg-amber-500/30' : 'bg-transparent hover:bg-amber-800/30'}`}
            title="ドラッグしてパネル幅を調整"
          >
            <div className={`w-0.5 h-10 rounded-full transition-colors
              ${isResizing ? 'bg-amber-400/80' : 'bg-amber-800/40 group-hover:bg-amber-500/70'}`} />
          </div>

          {/* 右: デッキパネル — モバイルは 'deck' ビューのみ表示 */}
          <div
            className={`flex-col overflow-hidden flex-shrink-0
              ${mobileView === 'deck' ? 'flex w-full' : 'hidden'} md:flex`}
            style={{ width: deckWidth }}
          >
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
              onSelectLeader={handleSelectLeader}
              onFindByText={handleFindByText}
              onFindByTrait={handleFindByTrait}
              onFindByName={handleFindByName}
              allCards={allCards}
            />
          </div>
        </div>
      )}

      {/* モバイル用ボトムナビ */}
      {!loading && !error && (
        <nav className="md:hidden flex-shrink-0 flex border-t border-amber-900/30 relative z-10"
          style={{ background: 'linear-gradient(0deg, #060910 0%, #0a1020 100%)' }}>
          <button
            onClick={() => setMobileView('cards')}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors tap-highlight-transparent
              ${mobileView === 'cards'
                ? 'text-amber-400 border-t-2 border-amber-500 -mt-px bg-amber-900/10'
                : 'text-amber-800/60 active:text-amber-400'}`}
          >
            <Search size={19} />
            カード検索
          </button>
          <button
            onClick={() => setMobileView('deck')}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors relative tap-highlight-transparent
              ${mobileView === 'deck'
                ? 'text-amber-400 border-t-2 border-amber-500 -mt-px bg-amber-900/10'
                : 'text-amber-800/60 active:text-amber-400'}`}
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

      {/* 大会統計パネル */}
      {showTournament && (
        <TournamentPanel onClose={() => setShowTournament(false)} />
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
