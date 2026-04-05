import CardImage from './CardImage';
import ColorBadge from './ColorBadge';

export default function CardTooltip({ card }) {
  if (!card) return null;
  return (
    <div className="w-72 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl p-3 text-sm text-left">
      <div className="flex gap-3">
        <CardImage card={card} className="w-24 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-base leading-tight mb-1">{card.name}</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {(card.colors || []).map(c => <ColorBadge key={c} color={c} small />)}
            <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">
              {card.card_type === 'CHARACTER' ? 'キャラ'
               : card.card_type === 'EVENT' ? 'イベント'
               : card.card_type === 'STAGE' ? 'ステージ'
               : card.card_type === 'LEADER' ? 'リーダー' : card.card_type}
            </span>
            <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">{card.rarity}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-gray-300 text-xs mb-2">
            {card.cost != null && <><span className="text-gray-500">コスト</span><span>{card.cost}</span></>}
            {card.life != null && <><span className="text-gray-500">ライフ</span><span>{card.life}</span></>}
            {card.power != null && <><span className="text-gray-500">パワー</span><span>{card.power?.toLocaleString()}</span></>}
            {card.counter != null && <><span className="text-gray-500">カウンター</span><span>+{card.counter?.toLocaleString()}</span></>}
          </div>
          {card.traits?.length > 0 && (
            <div className="text-xs text-gray-400 mb-1">《{card.traits.join(' / ')}》</div>
          )}
        </div>
      </div>
      {card.effect && card.effect !== '-' && (
        <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-300 leading-relaxed whitespace-pre-line">
          {card.effect}
        </div>
      )}
    </div>
  );
}
