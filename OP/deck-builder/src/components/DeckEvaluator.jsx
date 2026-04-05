import { useMemo } from 'react';
import { evaluateDeck } from '../utils/deckRules';

const GRADE_COLOR = {
  S: 'text-yellow-300 border-yellow-400 bg-yellow-400/10',
  A: 'text-green-300 border-green-400 bg-green-400/10',
  B: 'text-blue-300 border-blue-400 bg-blue-400/10',
  C: 'text-orange-300 border-orange-400 bg-orange-400/10',
  D: 'text-red-400 border-red-400 bg-red-400/10',
};

function ScoreBar({ label, score, max, color = 'bg-blue-500' }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300 font-medium">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatRow({ label, value, sub, highlight }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-yellow-300' : 'text-gray-300'}`}>
        {value}{sub && <span className="text-gray-500 ml-1">{sub}</span>}
      </span>
    </div>
  );
}

function CostMiniBar({ lowCost, midCost, highCost }) {
  const total = lowCost + midCost + highCost;
  if (total === 0) return null;
  const lowPct = Math.round((lowCost / total) * 100);
  const midPct = Math.round((midCost / total) * 100);
  const highPct = 100 - lowPct - midPct;
  return (
    <div>
      <div className="flex h-3 rounded overflow-hidden gap-px">
        <div className="bg-green-600 transition-all" style={{ width: `${lowPct}%` }} title={`低コスト ${lowCost}枚`} />
        <div className="bg-blue-500 transition-all" style={{ width: `${midPct}%` }} title={`中コスト ${midCost}枚`} />
        {highPct > 0 && <div className="bg-red-500 transition-all" style={{ width: `${highPct}%` }} title={`高コスト ${highCost}枚`} />}
      </div>
      <div className="flex text-[9px] mt-0.5 gap-2">
        <span className="text-green-400">低(0-3) {lowCost}枚</span>
        <span className="text-blue-400">中(4-6) {midCost}枚</span>
        <span className="text-red-400">高(7+) {highCost}枚</span>
      </div>
    </div>
  );
}

export default function DeckEvaluator({ deck, leader }) {
  const result = useMemo(() => evaluateDeck(deck, leader), [deck, leader]);

  if (!result) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
        カードを追加するとデッキを評価します
      </div>
    );
  }

  const {
    grade, totalScore,
    counterScore, costScore, typeScore,
    charCounterValue, charCounterCards, eventCounterCards, triggerCards,
    lowCost, midCost, highCost, lowPct,
    charCount, eventCount,
    advice,
  } = result;

  const gradeStyle = GRADE_COLOR[grade] || 'text-gray-300 border-gray-500 bg-gray-700/20';

  return (
    <div className="px-3 py-3 space-y-4 text-sm">
      {/* 総合グレード */}
      <div className="flex items-center gap-3">
        <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${gradeStyle}`}>
          <span className="text-3xl font-black">{grade}</span>
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-base">総合スコア {totalScore}/100</div>
          <div className="mt-1 space-y-1">
            <ScoreBar label="カウンター" score={counterScore} max={40} color="bg-orange-500" />
            <ScoreBar label="コスト曲線" score={costScore} max={30} color="bg-green-500" />
            <ScoreBar label="タイプ比率" score={typeScore} max={30} color="bg-blue-500" />
          </div>
        </div>
      </div>

      {/* カウンター詳細 */}
      <div className="bg-gray-800/60 rounded-lg p-2.5">
        <div className="text-xs font-bold text-orange-300 mb-1.5">🛡 カウンター</div>
        <StatRow label="キャラカウンター合計" value={`${(charCounterValue/1000).toFixed(0)}K`} highlight={charCounterValue >= 20000} />
        <StatRow label="カウンターキャラ枚数" value={`${charCounterCards}枚`} highlight={charCounterCards >= 15} />
        <StatRow label="カウンターイベント" value={`${eventCounterCards}枚`} highlight={eventCounterCards >= 3} />
        <StatRow label="トリガー枚数" value={`${triggerCards}枚`} />
      </div>

      {/* コスト分布 */}
      <div className="bg-gray-800/60 rounded-lg p-2.5">
        <div className="text-xs font-bold text-green-300 mb-1.5">📊 コスト曲線</div>
        <CostMiniBar lowCost={lowCost} midCost={midCost} highCost={highCost} />
        <div className="mt-1.5">
          <StatRow label="低コスト比率" value={`${Math.round(lowPct*100)}%`} highlight={lowPct >= 0.55} />
        </div>
      </div>

      {/* タイプ比率 */}
      <div className="bg-gray-800/60 rounded-lg p-2.5">
        <div className="text-xs font-bold text-blue-300 mb-1.5">⚖️ タイプ比率</div>
        <StatRow label="キャラ" value={`${charCount}枚`} sub="(目安32-44)" highlight={charCount >= 32 && charCount <= 44} />
        <StatRow label="イベント" value={`${eventCount}枚`} sub="(目安6-14)" highlight={eventCount >= 6 && eventCount <= 14} />
      </div>

      {/* アドバイス */}
      <div className="bg-gray-800/60 rounded-lg p-2.5">
        <div className="text-xs font-bold text-purple-300 mb-1.5">💡 アドバイス</div>
        <ul className="space-y-1.5">
          {advice.map((a, i) => (
            <li key={i} className="text-xs text-gray-300 flex gap-1.5">
              <span className="text-purple-400 flex-shrink-0">•</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
