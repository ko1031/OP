import { useMemo, useState } from 'react';
import { evaluateDeck, analyzeLeaderSynergy, analyzeMatchups, generateStrategy } from '../utils/deckRules';

// ── スコアタブ ──────────────────────────────────
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
  const lp = Math.round((lowCost / total) * 100);
  const mp = Math.round((midCost / total) * 100);
  const hp = 100 - lp - mp;
  return (
    <div>
      <div className="flex h-3 rounded overflow-hidden gap-px">
        <div className="bg-green-600" style={{ width: `${lp}%` }} />
        <div className="bg-blue-500" style={{ width: `${mp}%` }} />
        {hp > 0 && <div className="bg-red-500" style={{ width: `${hp}%` }} />}
      </div>
      <div className="flex text-[9px] mt-0.5 gap-2">
        <span className="text-green-400">低(0-3) {lowCost}枚</span>
        <span className="text-blue-400">中(4-6) {midCost}枚</span>
        <span className="text-red-400">高(7+) {highCost}枚</span>
      </div>
    </div>
  );
}

function ScoreTab({ result }) {
  if (!result) return <EmptyState />;
  const { grade, totalScore, counterScore, costScore, typeScore,
    charCounterValue, charCounterCards, eventCounterCards, triggerCards,
    lowCost, midCost, highCost, lowPct, charCount, eventCount, advice } = result;
  const gradeStyle = GRADE_COLOR[grade] || 'text-gray-300 border-gray-500 bg-gray-700/20';
  return (
    <div className="space-y-3">
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
      <div className="bg-gray-800/60 rounded-lg p-2.5">
        <div className="text-xs font-bold text-orange-300 mb-1.5">🛡 カウンター</div>
        <StatRow label="キャラカウンター合計" value={`${(charCounterValue/1000).toFixed(0)}K`} highlight={charCounterValue >= 20000} />
        <StatRow label="カウンターキャラ枚数" value={`${charCounterCards}枚`} highlight={charCounterCards >= 15} />
        <StatRow label="カウンターイベント" value={`${eventCounterCards}枚`} highlight={eventCounterCards >= 3} />
        <StatRow label="トリガー枚数" value={`${triggerCards}枚`} />
      </div>
      <div className="bg-gray-800/60 rounded-lg p-2.5">
        <div className="text-xs font-bold text-green-300 mb-1.5">📊 コスト曲線</div>
        <CostMiniBar lowCost={lowCost} midCost={midCost} highCost={highCost} />
        <div className="mt-1.5">
          <StatRow label="低コスト比率" value={`${Math.round(lowPct*100)}%`} highlight={lowPct >= 0.55} />
        </div>
      </div>
      <div className="bg-gray-800/60 rounded-lg p-2.5">
        <div className="text-xs font-bold text-blue-300 mb-1.5">⚖️ タイプ比率</div>
        <StatRow label="キャラ" value={`${charCount}枚`} sub="(目安32-44)" highlight={charCount >= 32 && charCount <= 44} />
        <StatRow label="イベント" value={`${eventCount}枚`} sub="(目安6-14)" highlight={eventCount >= 6 && eventCount <= 14} />
      </div>
      <div className="bg-gray-800/60 rounded-lg p-2.5">
        <div className="text-xs font-bold text-purple-300 mb-1.5">💡 アドバイス</div>
        <ul className="space-y-1.5">
          {advice.map((a, i) => (
            <li key={i} className="text-xs text-gray-300 flex gap-1.5">
              <span className="text-purple-400 flex-shrink-0">•</span><span>{a}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── リーダー相性タブ ──────────────────────────────
function SynergyTab({ synergy, leader }) {
  if (!synergy || !leader) return <EmptyState text="リーダーを選択するとリーダー相性が表示されます" />;
  const gradeStyle = GRADE_COLOR[synergy.grade] || 'text-gray-300 border-gray-500';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${gradeStyle}`}>
          <span className="text-2xl font-black">{synergy.grade}</span>
        </div>
        <div>
          <div className="text-white font-bold">{leader.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            色: {(leader.colors || []).join('・')} ／ ライフ: {leader.life}
          </div>
          {synergy.effectKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {synergy.effectKeywords.map(kw => (
                <span key={kw} className="text-[9px] px-1.5 py-0.5 bg-indigo-800 text-indigo-200 rounded">{kw}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="bg-gray-800/60 rounded-lg p-2.5 space-y-1.5">
        <div className="text-xs font-bold text-indigo-300 mb-1">📋 相性チェック</div>
        {synergy.points.map((p, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs">
            <span className={`flex-shrink-0 mt-0.5 ${p.good === true ? 'text-green-400' : p.good === false ? 'text-red-400' : 'text-gray-500'}`}>
              {p.good === true ? '✓' : p.good === false ? '✗' : '›'}
            </span>
            <span className={p.good === false ? 'text-red-300' : 'text-gray-300'}>{p.text}</span>
          </div>
        ))}
      </div>
      <div className="bg-gray-800/60 rounded-lg p-2.5">
        <div className="text-xs font-bold text-indigo-300 mb-1.5">🎯 主要種族分布</div>
        <div className="space-y-1">
          {synergy.topTraits.map(t => (
            <div key={t.trait} className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5">
                <span className={`text-xs ${t.matchesLeader ? 'text-yellow-300 font-bold' : 'text-gray-400'}`}>
                  {t.trait} {t.matchesLeader && '★'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(t.pct * 2, 100)}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">{t.pct}%</span>
              </div>
            </div>
          ))}
        </div>
        {synergy.topTraits.some(t => t.matchesLeader) && (
          <div className="text-[10px] text-yellow-400 mt-1.5">★ = リーダーと種族一致</div>
        )}
      </div>
    </div>
  );
}

// ── 対面分析タブ ──────────────────────────────────
function MatchupTab({ matchups }) {
  if (!matchups || matchups.length === 0) return <EmptyState />;
  const tier1 = matchups.filter(m => m.tier === 1);
  const tier2 = matchups.filter(m => m.tier === 2);
  const [expanded, setExpanded] = useState(null);

  const MatchupRow = ({ m }) => (
    <div>
      <button
        onClick={() => setExpanded(expanded === m.id ? null : m.id)}
        className={`w-full flex items-center gap-2 p-2 rounded-lg border mb-1 text-left transition-colors hover:brightness-110 ${m.bgColor}`}>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white truncate">{m.name}</div>
          <div className="text-[10px] text-gray-400 truncate">{m.description}</div>
        </div>
        <span className={`text-xs font-black flex-shrink-0 ${m.labelColor}`}>{m.label}</span>
        <span className="text-gray-600 text-[10px]">{expanded === m.id ? '▲' : '▼'}</span>
      </button>
      {expanded === m.id && (
        <div className="mb-2 px-2 pb-2 -mt-1 bg-gray-800/40 rounded-b-lg border border-gray-700 border-t-0 text-xs">
          <div className="pt-2 space-y-1">
            {m.reasons.map((r, i) => (
              <div key={i} className="flex gap-1.5 text-gray-400">
                <span className="text-gray-600 flex-shrink-0">›</span><span>{r}</span>
              </div>
            ))}
            <div className="mt-1.5 pt-1.5 border-t border-gray-700">
              <span className="text-gray-500">弱点: </span>
              <span className="text-gray-400">{m.weakness}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-gray-500">各デッキ名をタップで詳細表示</div>
      <div>
        <div className="text-xs font-bold text-red-300 mb-1.5">⚡ Tier 1</div>
        {tier1.map(m => <MatchupRow key={m.id} m={m} />)}
      </div>
      <div>
        <div className="text-xs font-bold text-orange-300 mb-1.5">🔸 Tier 2</div>
        {tier2.map(m => <MatchupRow key={m.id} m={m} />)}
      </div>
      <div className="text-[10px] text-gray-600 pt-1">
        ※ 対面分析はデッキのコスト曲線・カウンター密度・ライフ等から算出した目安です。実際のプレイングによって変動します。
      </div>
    </div>
  );
}

// ── 立ち回りタブ ──────────────────────────────────
function TurnCardBadges({ charCards, eventCards }) {
  const counterEvts = eventCards.filter(c => c.isCounter);
  const actionEvts  = eventCards.filter(c => !c.isCounter);
  const hasAny = charCards.length > 0 || eventCards.length > 0;
  if (!hasAny) return null;
  return (
    <div className="space-y-1 mb-1.5">
      {/* キャラカード */}
      {charCards.length > 0 && (
        <div>
          <div className="text-[9px] text-blue-400 font-semibold mb-0.5">👤 キャラ（自分ターンに展開）</div>
          <div className="flex flex-wrap gap-1">
            {charCards.map((c, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded leading-tight border border-blue-800/50">
                {c.name}（{c.cost}C×{c.count}）
              </span>
            ))}
          </div>
        </div>
      )}
      {/* カウンターイベント（相手ターン） */}
      {counterEvts.length > 0 && (
        <div>
          <div className="text-[9px] text-orange-400 font-semibold mb-0.5">🛡 カウンターイベント（相手ターンに使用）</div>
          <div className="flex flex-wrap gap-1">
            {counterEvts.map((c, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-orange-900/50 text-orange-300 rounded leading-tight border border-orange-800/50">
                {c.name}（{c.cost}C×{c.count}）
              </span>
            ))}
          </div>
        </div>
      )}
      {/* アクションイベント（自分ターン） */}
      {actionEvts.length > 0 && (
        <div>
          <div className="text-[9px] text-green-400 font-semibold mb-0.5">📜 アクションイベント（自分ターンに使用）</div>
          <div className="flex flex-wrap gap-1">
            {actionEvts.map((c, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded leading-tight border border-green-800/50">
                {c.name}（{c.cost}C×{c.count}）
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StrategyTab({ strategy, leader }) {
  if (!strategy || !leader) return <EmptyState text="リーダーとカードを追加すると定石が表示されます" />;
  const { turns, generalTips } = strategy;
  return (
    <div className="space-y-3">
      {turns.map(t => (
        <div key={t.turn} className="bg-gray-800/60 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-base leading-none">{t.icon}</span>
            <div>
              <span className="text-xs font-bold text-white">{t.turn}</span>
              <span className="text-[10px] text-gray-500 ml-1.5">（{t.don}）</span>
            </div>
            <span className="ml-auto text-[10px] text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">{t.phase}</span>
          </div>
          <TurnCardBadges charCards={t.charCards} eventCards={t.eventCards} />
          <p className="text-xs text-gray-300 leading-relaxed">{t.advice}</p>
        </div>
      ))}
      <div className="bg-gray-800/60 rounded-lg p-2.5">
        <div className="text-xs font-bold text-teal-300 mb-1.5">📌 共通ポイント</div>
        <ul className="space-y-1.5">
          {generalTips.map((tip, i) => (
            <li key={i} className="text-xs text-gray-300 flex gap-1.5">
              <span className="text-teal-500 flex-shrink-0">•</span><span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── 共通 ──────────────────────────────────────────
function EmptyState({ text = 'カードを追加するとデッキを評価します' }) {
  return (
    <div className="flex items-center justify-center h-40 text-gray-600 text-sm text-center px-4">{text}</div>
  );
}

const TABS = [
  { id: 'score',    label: 'スコア',   icon: '📊' },
  { id: 'synergy',  label: '相性',     icon: '🤝' },
  { id: 'matchup',  label: '対面',     icon: '⚔️' },
  { id: 'strategy', label: '立ち回り', icon: '🗺' },
];

export default function DeckEvaluator({ deck, leader }) {
  const [tab, setTab] = useState('score');

  const result   = useMemo(() => evaluateDeck(deck, leader),        [deck, leader]);
  const synergy  = useMemo(() => analyzeLeaderSynergy(deck, leader), [deck, leader]);
  const matchups = useMemo(() => analyzeMatchups(deck, leader),      [deck, leader]);
  const strategy = useMemo(() => generateStrategy(deck, leader),     [deck, leader]);

  const isEmpty = !deck.length;

  return (
    <div className="flex flex-col h-full">
      {/* サブタブ */}
      <div className="flex-shrink-0 flex border-b border-gray-700 bg-gray-900/50">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-1.5 text-[10px] leading-tight transition-colors
              ${tab === t.id ? 'text-white border-b-2 border-purple-500' : 'text-gray-600 hover:text-gray-400'}`}>
            <span className="text-sm leading-tight">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isEmpty && tab !== 'synergy' && <EmptyState />}
        {(!isEmpty || tab === 'synergy') && (
          <>
            {tab === 'score'    && <ScoreTab    result={result} />}
            {tab === 'synergy'  && <SynergyTab  synergy={synergy} leader={leader} />}
            {tab === 'matchup'  && <MatchupTab  matchups={matchups} />}
            {tab === 'strategy' && <StrategyTab strategy={strategy} leader={leader} />}
          </>
        )}
      </div>
    </div>
  );
}
