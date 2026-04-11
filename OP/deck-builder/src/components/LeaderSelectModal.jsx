import { useState, useEffect, useMemo } from 'react';
import { X, Search, Crown } from 'lucide-react';
import CardImage from './CardImage';
import ColorBadge from './ColorBadge';

const COLOR_LIST = [
  { code: '赤', label: '赤', bg: 'bg-red-700/70',    border: 'border-red-500',    text: 'text-red-200'    },
  { code: '青', label: '青', bg: 'bg-blue-700/70',   border: 'border-blue-500',   text: 'text-blue-200'   },
  { code: '緑', label: '緑', bg: 'bg-green-700/70',  border: 'border-green-500',  text: 'text-green-200'  },
  { code: '紫', label: '紫', bg: 'bg-purple-700/70', border: 'border-purple-500', text: 'text-purple-200' },
  { code: '黄', label: '黄', bg: 'bg-yellow-600/70', border: 'border-yellow-400', text: 'text-yellow-200' },
  { code: '黒', label: '黒', bg: 'bg-gray-700/70',   border: 'border-gray-400',   text: 'text-gray-200'   },
];

function LeaderCard({ card, isSelected, onClick }) {
  return (
    <button
      onClick={() => onClick(card)}
      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all hover:scale-105 active:scale-100 group
        ${isSelected
          ? 'border-yellow-400 bg-yellow-900/30 shadow-lg shadow-yellow-500/20'
          : 'border-amber-900/30 bg-[#0d1530]/60 hover:border-amber-500/60 hover:bg-[#0d1530]/80'}`}
    >
      {isSelected && (
        <div className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
          <Crown size={11} className="text-yellow-900" />
        </div>
      )}
      <CardImage card={card} className="w-full rounded-lg" />
      <div className="w-full text-center">
        <div className="text-[11px] font-bold text-white leading-tight truncate px-0.5">
          {card.name}
        </div>
        <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
          {(card.colors || []).map(c => <ColorBadge key={c} color={c} small />)}
          {card.life != null && (
            <span className="text-[10px] text-red-400/80">♥{card.life}</span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function LeaderSelectModal({ allCards, currentLeader, onSelect, onClose }) {
  const [searchText, setSearchText] = useState('');
  const [selectedColors, setSelectedColors] = useState([]);

  // ESCキーで閉じる
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  // 背景スクロール防止
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const leaderCards = useMemo(() =>
    allCards.filter(c => c.card_type === 'LEADER'),
    [allCards]
  );

  const filtered = useMemo(() => {
    return leaderCards.filter(card => {
      if (searchText) {
        const q = searchText.toLowerCase();
        const match = card.name?.toLowerCase().includes(q)
          || card.traits?.some(t => t.toLowerCase().includes(q))
          || card.card_number?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedColors.length > 0) {
        if (!(card.colors || []).some(c => selectedColors.includes(c))) return false;
      }
      return true;
    });
  }, [leaderCards, searchText, selectedColors]);

  const toggleColor = (code) => {
    setSelectedColors(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col bg-[#080c1e] border border-amber-800/40 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90dvh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-amber-900/30">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-yellow-400" />
            <span className="text-white font-bold text-sm">リーダーカードを選択</span>
            <span className="text-amber-700/60 text-xs">({filtered.length} / {leaderCards.length})</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1a2040] hover:bg-[#232b50] text-amber-700/60 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* 検索・フィルターエリア */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-amber-900/30 space-y-2">
          {/* テキスト検索 */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700/50" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="カード名・特徴・番号で検索…"
              autoFocus
              className="w-full bg-[#0d1530]/80 border border-amber-900/30 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-amber-800/50 focus:outline-none focus:border-blue-500/70"
            />
          </div>
          {/* 色フィルター */}
          <div className="flex flex-wrap gap-1.5">
            {COLOR_LIST.map(({ code, label, bg, border, text }) => (
              <button
                key={code}
                onClick={() => toggleColor(code)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all
                  ${selectedColors.includes(code)
                    ? `${bg} ${border} ${text} shadow-md`
                    : 'bg-[#0d1530]/60 border-amber-900/30 text-amber-700/60 hover:border-amber-700/50'}`}
              >
                {label}
              </button>
            ))}
            {selectedColors.length > 0 && (
              <button
                onClick={() => setSelectedColors([])}
                className="px-3 py-1 rounded-full text-xs font-bold border border-gray-700/50 text-gray-500 hover:text-gray-300 transition-colors"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* カードグリッド */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-amber-800/50 text-sm">
              該当するリーダーカードがありません
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {filtered.map(card => (
                <LeaderCard
                  key={card.card_number}
                  card={card}
                  isSelected={currentLeader?.card_number === card.card_number}
                  onClick={(card) => { onSelect(card); onClose(); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
