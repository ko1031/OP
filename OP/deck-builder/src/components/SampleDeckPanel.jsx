import { useState } from 'react';
import { X, Copy, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { SAMPLE_DECKS } from '../utils/deckRules';
import CardImage from './CardImage';
import ColorBadge from './ColorBadge';

// カード番号→カードオブジェクトのマップ
function buildCardMap(allCards) {
  const map = {};
  allCards.forEach(c => { map[c.card_number] = c; });
  return map;
}

// デッキエントリをカードオブジェクトに解決
function resolveDeck(sampleDeck, cardMap) {
  return sampleDeck.deck
    .map(({ cardNumber, count }) => {
      const card = cardMap[cardNumber];
      return card ? { card, count } : null;
    })
    .filter(Boolean);
}

function ColorDot({ color }) {
  const bg = {
    赤: 'bg-red-500', 青: 'bg-blue-500', 緑: 'bg-green-500',
    黄: 'bg-yellow-400', 黒: 'bg-gray-300', 紫: 'bg-purple-500',
  }[color] || 'bg-gray-500';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${bg} flex-shrink-0`} />;
}

function DeckCardRow({ entry }) {
  const { card, count } = entry;
  const typeLabel = card.card_type === 'CHARACTER' ? 'C' : card.card_type === 'EVENT' ? 'E' : 'S';
  const typeBg = card.card_type === 'CHARACTER' ? 'bg-blue-900/60 text-blue-300'
               : card.card_type === 'EVENT' ? 'bg-green-900/60 text-green-300'
               : 'bg-purple-900/60 text-purple-300';
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={`text-[9px] font-bold px-1 rounded flex-shrink-0 ${typeBg}`}>{typeLabel}</span>
      <span className="text-xs text-gray-300 flex-1 truncate">{card.name}</span>
      <div className="flex gap-0.5 flex-shrink-0">
        {(card.colors || []).map(c => <ColorDot key={c} color={c} />)}
      </div>
      {card.cost != null && (
        <span className="text-[10px] text-gray-500 flex-shrink-0 w-6 text-right">C{card.cost}</span>
      )}
      <span className="text-xs font-bold text-white flex-shrink-0 w-5 text-right">×{count}</span>
    </div>
  );
}

function SampleDeckCard({ sample, cardMap, onCopy }) {
  const [expanded, setExpanded] = useState(false);
  const entries = resolveDeck(sample, cardMap);
  const leader = cardMap[sample.leaderCard];
  const charEntries = entries.filter(e => e.card.card_type === 'CHARACTER');
  const eventEntries = entries.filter(e => e.card.card_type === 'EVENT');
  const stageEntries = entries.filter(e => e.card.card_type === 'STAGE');
  const total = entries.reduce((s, e) => s + e.count, 0);

  const tierColor = sample.tier === 1
    ? 'text-red-400 bg-red-900/30 border-red-700/50'
    : 'text-orange-400 bg-orange-900/30 border-orange-700/50';

  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700/60 overflow-hidden">
      {/* ヘッダー */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {leader && (
            <CardImage
              card={leader}
              className="w-12 h-16 object-cover rounded-lg flex-shrink-0 border border-gray-600/50"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tierColor}`}>
                Tier{sample.tier}
              </span>
              <div className="flex gap-1">
                {sample.colors.map(c => <ColorDot key={c} color={c} />)}
              </div>
            </div>
            <div className="text-sm font-bold text-white">{sample.name}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
              <Trophy size={9} />
              {sample.event}
              <span className="text-gray-600">·</span>
              {sample.date}
            </div>
            <div className="text-[10px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{sample.description}</div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            デッキリスト（{total}枚）
          </button>
          <button
            onClick={() => onCopy(sample)}
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-700/70 hover:bg-blue-600 text-white text-xs font-semibold transition-colors"
          >
            <Copy size={12} />
            このデッキを試す
          </button>
        </div>
      </div>

      {/* カードリスト（展開時） */}
      {expanded && (
        <div className="border-t border-gray-700/50 px-3 py-2 space-y-2">
          {charEntries.length > 0 && (
            <div>
              <div className="text-[9px] font-bold text-blue-400 mb-1">
                👤 キャラクター（{charEntries.reduce((s,e)=>s+e.count,0)}枚）
              </div>
              {charEntries.map(e => <DeckCardRow key={e.card.card_number} entry={e} />)}
            </div>
          )}
          {eventEntries.length > 0 && (
            <div>
              <div className="text-[9px] font-bold text-green-400 mb-1">
                📜 イベント（{eventEntries.reduce((s,e)=>s+e.count,0)}枚）
              </div>
              {eventEntries.map(e => {
                const ef = e.card.effect || '';
                const isCounter = ef.includes('【カウンター】');
                const isMain = ef.includes('【メイン】');
                return (
                  <div key={e.card.card_number} className="flex items-center gap-1">
                    <span className={`text-[8px] px-1 rounded flex-shrink-0 font-bold
                      ${isCounter && isMain ? 'bg-yellow-900/60 text-yellow-400'
                        : isCounter ? 'bg-orange-900/60 text-orange-300'
                        : 'bg-green-900/60 text-green-300'}`}>
                      {isCounter && isMain ? 'C/M' : isCounter ? '防御' : 'メイン'}
                    </span>
                    <span className="text-xs text-gray-300 flex-1 truncate">{e.card.name}</span>
                    <span className="text-[10px] text-gray-500 flex-shrink-0 w-6 text-right">
                      C{e.card.cost}
                    </span>
                    <span className="text-xs font-bold text-white flex-shrink-0 w-5 text-right">
                      ×{e.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {stageEntries.length > 0 && (
            <div>
              <div className="text-[9px] font-bold text-purple-400 mb-1">
                🏟 ステージ（{stageEntries.reduce((s,e)=>s+e.count,0)}枚）
              </div>
              {stageEntries.map(e => <DeckCardRow key={e.card.card_number} entry={e} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SampleDeckPanel({ allCards, onCopy, onClose }) {
  const cardMap = buildCardMap(allCards);
  const tier1 = SAMPLE_DECKS.filter(d => d.tier === 1);
  const tier2 = SAMPLE_DECKS.filter(d => d.tier === 2);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* パネル本体 */}
      <div className="relative flex flex-col w-full max-w-sm bg-gray-900 shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-700/80 bg-gray-900/90">
          <div>
            <div className="text-white font-bold text-sm flex items-center gap-2">
              <Trophy size={15} className="text-yellow-400" />
              優勝サンプルデッキ
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              フラッグシップバトル 2026年2〜4月
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* スクロールコンテンツ */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Tier 1 */}
          <div>
            <div className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1.5">
              ⚡ Tier 1
            </div>
            <div className="space-y-3">
              {tier1.map(s => (
                <SampleDeckCard key={s.id} sample={s} cardMap={cardMap} onCopy={onCopy} />
              ))}
            </div>
          </div>
          {/* Tier 2 */}
          {tier2.length > 0 && (
            <div>
              <div className="text-xs font-bold text-orange-400 mb-2 flex items-center gap-1.5">
                🔸 Tier 2
              </div>
              <div className="space-y-3">
                {tier2.map(s => (
                  <SampleDeckCard key={s.id} sample={s} cardMap={cardMap} onCopy={onCopy} />
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-gray-600 pb-2 text-center">
            出典: cardrush.media 大会入賞デッキ（2026年2〜4月）
          </div>
        </div>
      </div>
    </div>
  );
}
