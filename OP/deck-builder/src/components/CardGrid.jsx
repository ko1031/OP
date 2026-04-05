import { useState, useMemo } from 'react';
import { Eye } from 'lucide-react';
import CardImage from './CardImage';
import CardTooltip from './CardTooltip';
import CardModal from './CardModal';
import ColorBadge from './ColorBadge';
import { hasTrigger } from '../utils/deckRules';

function CardItem({ card, count, isSelected, onOpenModal }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const trigger    = hasTrigger(card);
  const hasCounter = card.counter || (card.card_type === 'EVENT' && card.effect?.includes('【カウンター】'));

  // マウスのみツールチップ表示（タッチは無視）
  const handlePointerEnter = (e) => {
    if (e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top });
    setShowTooltip(true);
  };
  const handlePointerLeave = (e) => {
    if (e.pointerType === 'touch') return;
    setShowTooltip(false);
  };

  return (
    <>
      <div
        className={`relative rounded-lg overflow-hidden cursor-pointer group border-2 transition-all
          ${isSelected ? 'border-yellow-400 shadow-yellow-400/40 shadow-lg' : 'border-transparent'}
          card-hover`}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={() => onOpenModal(card)}
      >
        <CardImage card={card} className="w-full aspect-[63/88] object-cover" />

        {/* デッキ内枚数バッジ */}
        {count > 0 && (
          <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
            {count}
          </div>
        )}

        {/* トリガー・カウンターバッジ */}
        <div className="absolute top-1 left-1 flex flex-col gap-0.5">
          {trigger && (
            <span className="bg-yellow-400 text-gray-900 text-[9px] font-bold px-1 rounded leading-tight shadow">
              TRG
            </span>
          )}
          {hasCounter && (
            <span className="bg-orange-500 text-white text-[9px] font-bold px-1 rounded leading-tight shadow">
              {card.counter ? `+${card.counter / 1000}K` : 'CNT'}
            </span>
          )}
        </div>

        {/* ホバーオーバーレイ（マウスのみ） */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none touch-none">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
            <Eye size={18} className="text-white" />
          </div>
        </div>

        {/* 下部：カード名 + 色・コスト */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
          <div className="text-white text-xs font-bold truncate leading-tight">{card.name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            {(card.colors || []).map(c => <ColorBadge key={c} color={c} small />)}
            {card.cost != null && <span className="text-gray-300 text-xs ml-auto">C:{card.cost}</span>}
          </div>
        </div>
      </div>

      {/* マウスホバー時のツールチップ */}
      {showTooltip && (
        <div
          className="fixed z-40 pointer-events-none"
          style={{
            left: Math.min(tooltipPos.x, window.innerWidth - 300),
            top:  Math.max(0, Math.min(tooltipPos.y, window.innerHeight - 400)),
          }}
        >
          <CardTooltip card={card} />
        </div>
      )}
    </>
  );
}

export default function CardGrid({ cards, deck, leader, onAddCard, onRemoveCard, onSelectLeader }) {
  const [sortBy,    setSortBy]    = useState('cost');
  const [modalCard, setModalCard] = useState(null);

  const deckMap = useMemo(() => {
    const m = {};
    deck.forEach(({ card, count }) => { m[card.card_number] = count; });
    return m;
  }, [deck]);

  const sorted = useMemo(() => [...cards].sort((a, b) => {
    if (sortBy === 'cost')   return (a.cost ?? a.life ?? 0) - (b.cost ?? b.life ?? 0);
    if (sortBy === 'power')  return (b.power || 0) - (a.power || 0);
    if (sortBy === 'name')   return a.name.localeCompare(b.name, 'ja');
    if (sortBy === 'number') return a.card_number.localeCompare(b.card_number);
    return 0;
  }), [cards, sortBy]);

  return (
    <div className="flex flex-col h-full">
      {/* ソートバー */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-gray-900/50 text-xs text-gray-400 flex-shrink-0">
        <span className="text-gray-500">{cards.length}枚</span>
        <div className="ml-auto flex gap-1">
          {[['cost','コスト'],['power','パワー'],['name','名前'],['number','番号']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setSortBy(v)}
              className={`px-2 py-1 rounded transition-colors
                ${sortBy === v ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-400'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* カードグリッド */}
      <div className="flex-1 overflow-y-auto p-2">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            カードが見つかりません
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))' }}>
            {sorted.map(card => (
              <CardItem
                key={card.id}
                card={card}
                count={deckMap[card.card_number] || 0}
                isSelected={leader?.card_number === card.card_number}
                onOpenModal={setModalCard}
              />
            ))}
          </div>
        )}
      </div>

      {/* カード詳細モーダル */}
      {modalCard && (
        <CardModal
          card={modalCard}
          count={deckMap[modalCard.card_number] || 0}
          isSelectedLeader={leader?.card_number === modalCard.card_number}
          onAdd={onAddCard}
          onRemove={onRemoveCard}
          onSelectLeader={onSelectLeader}
          onClose={() => setModalCard(null)}
        />
      )}
    </div>
  );
}
