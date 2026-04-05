import { useState } from 'react';
import { X, Copy, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { SAMPLE_DECKS } from '../utils/deckRules';
import CardImage from './CardImage';

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
  return <span className={`inline-block w-3 h-3 rounded-full ${bg} flex-shrink-0`} />;
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
      <span className="text-sm text-gray-300 flex-1 truncate">{card.name}</span>
      <div className="flex gap-0.5 flex-shrink-0">
        {(card.colors || []).map(c => <ColorDot key={c} color={c} />)}
      </div>
      {card.cost != null && (
        <span className="text-xs text-gray-500 flex-shrink-0 w-7 text-right">C{card.cost}</span>
      )}
      <span className="text-sm font-bold text-white flex-shrink-0 w-6 text-right">×{count}</span>
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

  // 大会種別バッジの色
  const eventBadge = sample.eventType === 'flagship'
    ? { label: '公認', cls: 'text-yellow-300 bg-yellow-900/40 border-yellow-600/60' }
    : sample.eventType === 'nonofficial'
    ? { label: '非公認', cls: 'text-sky-300 bg-sky-900/40 border-sky-600/60' }
    : { label: 'CS', cls: 'text-purple-300 bg-purple-900/40 border-purple-600/60' };

  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700/60 overflow-hidden">
      {/* ヘッダー */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* リーダー画像（大きめ） */}
          {leader && (
            <CardImage
              card={leader}
              className="w-20 h-28 object-cover rounded-xl flex-shrink-0 border border-gray-600/50 shadow-lg"
            />
          )}
          <div className="flex-1 min-w-0">
            {/* バッジ行 */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${eventBadge.cls}`}>
                {eventBadge.label}
              </span>
              <div className="flex gap-1">
                {sample.colors.map(c => <ColorDot key={c} color={c} />)}
              </div>
            </div>
            {/* デッキ名 */}
            <div className="text-base font-bold text-white leading-tight">{sample.name}</div>
            {/* 大会名・日付 */}
            <div className="mt-1.5 space-y-0.5">
              <div className="flex items-center gap-1 text-xs text-yellow-200/80">
                <Trophy size={11} className="flex-shrink-0" />
                <span className="font-medium truncate">{sample.event}</span>
              </div>
              <div className="text-xs text-gray-400 pl-4">{sample.date}</div>
            </div>
            {/* 説明文 */}
            <div className="text-xs text-gray-400 mt-2 leading-relaxed line-clamp-2">{sample.description}</div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            デッキリスト（{total}枚）
          </button>
          <button
            onClick={() => onCopy(sample)}
            className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-blue-700/70 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
          >
            <Copy size={13} />
            このデッキを試す
          </button>
        </div>
      </div>

      {/* カードリスト（展開時）— 2カラム */}
      {expanded && (
        <div className="border-t border-gray-700/50 px-4 py-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {/* 左カラム: キャラクター */}
            <div>
              {charEntries.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-blue-400 mb-1.5 uppercase tracking-wide">
                    👤 キャラクター（{charEntries.reduce((s,e)=>s+e.count,0)}枚）
                  </div>
                  <div className="space-y-0.5">
                    {charEntries.map(e => <DeckCardRow key={e.card.card_number} entry={e} />)}
                  </div>
                </div>
              )}
            </div>
            {/* 右カラム: イベント + ステージ */}
            <div className="space-y-3">
              {eventEntries.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-green-400 mb-1.5 uppercase tracking-wide">
                    📜 イベント（{eventEntries.reduce((s,e)=>s+e.count,0)}枚）
                  </div>
                  <div className="space-y-0.5">
                    {eventEntries.map(e => {
                      const ef = e.card.effect || '';
                      const isCounter = ef.includes('【カウンター】');
                      const isMain = ef.includes('【メイン】');
                      return (
                        <div key={e.card.card_number} className="flex items-center gap-1.5">
                          <span className={`text-[8px] px-1 rounded flex-shrink-0 font-bold
                            ${isCounter && isMain ? 'bg-yellow-900/60 text-yellow-400'
                              : isCounter ? 'bg-orange-900/60 text-orange-300'
                              : 'bg-green-900/60 text-green-300'}`}>
                            {isCounter && isMain ? 'C/M' : isCounter ? '防御' : 'メイン'}
                          </span>
                          <span className="text-sm text-gray-300 flex-1 truncate">{e.card.name}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0 w-7 text-right">
                            C{e.card.cost}
                          </span>
                          <span className="text-sm font-bold text-white flex-shrink-0 w-6 text-right">
                            ×{e.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {stageEntries.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-purple-400 mb-1.5 uppercase tracking-wide">
                    🏟 ステージ（{stageEntries.reduce((s,e)=>s+e.count,0)}枚）
                  </div>
                  <div className="space-y-0.5">
                    {stageEntries.map(e => <DeckCardRow key={e.card.card_number} entry={e} />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SampleDeckPanel({ allCards, onCopy, onClose }) {
  const cardMap = buildCardMap(allCards);

  // 日付降順（新しい順）で全デッキを表示
  const sortedDecks = [...SAMPLE_DECKS].sort((a, b) => {
    const da = a.date.replace(/\//g, '');
    const db = b.date.replace(/\//g, '');
    return db.localeCompare(da);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* パネル本体（max-w-sm → max-w-3xl で約2倍） */}
      <div className="relative flex flex-col w-full max-w-3xl bg-gray-900 shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-700/80 bg-gray-900/90">
          <div>
            <div className="text-white font-bold text-base flex items-center gap-2">
              <Trophy size={17} className="text-yellow-400" />
              優勝サンプルデッキ
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              フラッグシップバトル・非公認大会 2026年3〜4月｜新しい順
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* スクロールコンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sortedDecks.map(s => (
            <SampleDeckCard key={s.id} sample={s} cardMap={cardMap} onCopy={onCopy} />
          ))}
          <div className="text-xs text-gray-600 pb-2 text-center">
            出典: cardrush.media 大会入賞デッキ（2026年3〜4月）
          </div>
        </div>
      </div>
    </div>
  );
}
