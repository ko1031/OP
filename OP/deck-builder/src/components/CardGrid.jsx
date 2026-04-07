import { useState, useMemo } from 'react';
import { Eye } from 'lucide-react';
import CardImage from './CardImage';
import CardTooltip from './CardTooltip';
import CardModal from './CardModal';
import ColorBadge from './ColorBadge';
import { hasTrigger } from '../utils/deckRules';

// マウスが使えるデバイスかどうかを判定（スマホ・タブレットは false）
const HAS_MOUSE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function CardItem({ card, count, isSelected, onOpenModal }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const trigger    = hasTrigger(card);
  const hasCounter = card.counter || (card.card_type === 'EVENT' && card.effect?.includes('【カウンター】'));

  // マウスデバイスのみツールチップ表示
  const handlePointerEnter = (e) => {
    if (!HAS_MOUSE || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top });
    setShowTooltip(true);
  };
  const handlePointerLeave = (e) => {
    if (!HAS_MOUSE || e.pointerType === 'touch') return;
    setShowTooltip(false);
  };

  const handleDragStart = (e) => {
    setShowTooltip(false);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/op-card', JSON.stringify(card));
  };
  const handleDragEnd = () => setIsDragging(false);

  return (
    <>
      <div
        className={`relative rounded-lg overflow-hidden cursor-pointer group border-2 transition-all
          ${isSelected ? 'border-yellow-400 shadow-yellow-400/40 shadow-lg' : 'border-transparent'}
          ${isDragging ? 'opacity-50 scale-95' : ''}
          card-hover`}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={() => onOpenModal(card)}
      >
        <CardImage card={card} className="w-full aspect-[63/88] object-cover" />

        {/* デッキ内枚数バッジ */}
        {count > 0 && (
          <div className="absolute top-1 right-1 bg-amber-700 text-amber-100 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
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

      {/* マウスホバー時のツールチップ（タッチデバイスは非表示） */}
      {HAS_MOUSE && showTooltip && (
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

export default function CardGrid({ cards, deck, leader, onAddCard, onRemoveCard, onSelectLeader, onFindSynergy }) {
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
      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-900/30 bg-[#080c1e]/70 text-xs text-amber-500/70 flex-shrink-0">
        <span className="text-amber-700/60">{cards.length}枚</span>
        <div className="ml-auto flex gap-1">
          {[['cost','コスト'],['power','パワー'],['name','名前'],['number','番号']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setSortBy(v)}
              className={`px-2 py-1 rounded transition-colors
                ${sortBy === v ? 'bg-amber-700 text-amber-100' : 'hover:bg-amber-900/30 text-amber-500/70'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* カードグリッド */}
      <div className="flex-1 overflow-y-auto p-2">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-amber-700/60 text-sm">
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
          onFindSynergy={onFindSynergy ? (card) => { onFindSynergy(card); setModalCard(null); } : null}
        />
      )}
    </div>
  );
}
