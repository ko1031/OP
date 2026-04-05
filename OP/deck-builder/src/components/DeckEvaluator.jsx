import { useMemo, useState } from 'react';
import { evaluateDeck, analyzeLeaderSynergy, analyzeMatchups, generateStrategy, getLeaderStrategyHints, generateWinConditions } from '../utils/deckRules';

// ── グレード色定義 ──────────────────────────────────
const GRADE_COLOR = {
  S: 'text-yellow-300 border-yellow-400 bg-yellow-400/10',
  A: 'text-green-300 border-green-400 bg-green-400/10',
  B: 'text-blue-300 border-blue-400 bg-blue-400/10',
  C: 'text-orange-300 border-orange-400 bg-orange-400/10',
  D: 'text-red-400 border-red-400 bg-red-400/10',
};
const GRADE_HEX = {
  S: '#fbbf24', A: '#34d399', B: '#60a5fa', C: '#fb923c', D: '#f87171',
};

// ── SVG ドーナツスコア ──────────────────────────────
function DonutScore({ score, grade }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = GRADE_HEX[grade] || '#6b7280';
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* 背景リング */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1f2937" strokeWidth="12" />
        {/* スコアアーク */}
        <circle cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span style={{ color }} className="text-3xl font-black leading-none">{grade}</span>
        <span className="text-gray-400 text-[10px] mt-0.5">{score}pt</span>
      </div>
    </div>
  );
}

// ── スコアバー（グラデーション付き） ──────────────────
function GradientBar({ label, score, max, fromColor, toColor, suffix = '' }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400 font-medium">{label}</span>
        <span className="text-gray-200 font-bold tabular-nums">{score}<span className="text-gray-500 font-normal">/{max}</span>{suffix}</span>
      </div>
      <div className="h-2 bg-gray-700/80 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${fromColor}, ${toColor})`,
          }}
        />
      </div>
    </div>
  );
}

// ── コスト分布チャート（強化版） ──────────────────────
function CostChart({ distribution, leaderRules = {} }) {
  const costs = Array.from({ length: 11 }, (_, i) => i);
  const vals = costs.map(c => distribution[c] || 0);
  const max = Math.max(...vals, 1);
  const total = vals.reduce((s, v) => s + v, 0);
  return (
    <div className="bg-gray-800/60 rounded-xl p-3">
      <div className="text-xs font-semibold text-gray-300 mb-3">📊 コスト曲線</div>
      <div className="flex items-end gap-1 h-16">
        {costs.map((c, i) => {
          const cnt = vals[i];
          const h = cnt > 0 ? Math.max(Math.round((cnt / max) * 100), 6) : 0;
          const color =
            c <= 3 ? 'bg-emerald-500' :
            c <= 6 ? 'bg-blue-500' : 'bg-rose-500';
          return (
            <div key={c} className="flex-1 flex flex-col items-center gap-0.5">
              {cnt > 0 && <span className="text-[9px] text-gray-400 leading-none font-medium">{cnt}</span>}
              <div className={`w-full rounded-t ${color} transition-all duration-500`} style={{ height: `${h}%`, minHeight: cnt > 0 ? 4 : 0 }} />
              <span className="text-[9px] text-gray-600">{c}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2.5 text-[10px]">
        <span className="text-emerald-400 font-medium">
          低(0-3):{vals.slice(0,4).reduce((s,v)=>s+v,0)}枚
        </span>
        <span className="text-blue-400 font-medium">
          中(4-6):{vals.slice(4,7).reduce((s,v)=>s+v,0)}枚
        </span>
        <span className="text-rose-400 font-medium">
          高(7+):{vals.slice(7).reduce((s,v)=>s+v,0)}枚
        </span>
      </div>
    </div>
  );
}

// ── リーダー効果バッジ ────────────────────────────────
function LeaderRulesBanner({ leaderRules = {} }) {
  const badges = [];
  if (leaderRules.maxDon != null)
    badges.push({ icon: '⚡', text: `ドン!!上限${leaderRules.maxDon}枚`, color: 'bg-yellow-900/50 border-yellow-600 text-yellow-300' });
  if (leaderRules.eventIsStrength)
    badges.push({ icon: '📖', text: `C${leaderRules.eventDrawMinCost ?? 3}+イベントで1ドロー`, color: 'bg-blue-900/50 border-blue-600 text-blue-300' });
  if (leaderRules.eventAsCounter)
    badges.push({ icon: '🛡', text: 'イベント→カウンター化', color: 'bg-green-900/50 border-green-600 text-green-300' });
  if (leaderRules.lifeDrawOnDamage)
    badges.push({ icon: '🃏', text: 'ライフ減少時ドロー', color: 'bg-cyan-900/50 border-cyan-600 text-cyan-300' });
  if (leaderRules.drawOnAttack)
    badges.push({ icon: '⚔️', text: 'アタック時ドロー', color: 'bg-blue-900/50 border-blue-600 text-blue-300' });
  if (leaderRules.donAccelerate)
    badges.push({ icon: '💨', text: 'ドン加速', color: 'bg-orange-900/50 border-orange-600 text-orange-300' });
  if (leaderRules.donOnPlay)
    badges.push({ icon: '🎯', text: '登場時ドン付与', color: 'bg-orange-900/50 border-orange-600 text-orange-300' });
  if (leaderRules.costReduction)
    badges.push({ icon: '💰', text: 'コスト軽減', color: 'bg-purple-900/50 border-purple-600 text-purple-300' });
  if (leaderRules.hasBounce)
    badges.push({ icon: '↩️', text: 'バウンス', color: 'bg-indigo-900/50 border-indigo-600 text-indigo-300' });
  if (leaderRules.givesBlocker)
    badges.push({ icon: '🛡', text: 'ブロッカー付与', color: 'bg-gray-700/60 border-gray-500 text-gray-300' });
  if (leaderRules.givesRush)
    badges.push({ icon: '⚡', text: 'ラッシュ付与', color: 'bg-red-900/50 border-red-600 text-red-300' });
  if (leaderRules.lifeProtect)
    badges.push({ icon: '❤️', text: 'ライフ保護', color: 'bg-pink-900/50 border-pink-600 text-pink-300' });
  if (leaderRules.hasDeckSearch)
    badges.push({ icon: '🔍', text: 'サーチ', color: 'bg-teal-900/50 border-teal-600 text-teal-300' });
  if (leaderRules.hasRemoval)
    badges.push({ icon: '💥', text: 'KO/除去', color: 'bg-red-900/50 border-red-600 text-red-300' });
  if (leaderRules.activeDuringOpponentTurn)
    badges.push({ icon: '⏰', text: '相手ターン発動', color: 'bg-violet-900/50 border-violet-600 text-violet-300' });
  if (leaderRules.attackDiscard)
    badges.push({ icon: '🔄', text: 'アタック時手札捨て', color: 'bg-amber-900/50 border-amber-600 text-amber-300' });

  if (badges.length === 0) return null;
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3">
      <div className="text-xs text-gray-400 mb-2 font-semibold tracking-wide">🌟 リーダー効果</div>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${b.color}`}>
            {b.icon} {b.text}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── スコアタブ ──────────────────────────────────────
function ScoreTab({ result, deck = [] }) {
  if (!result) return <EmptyState />;
  const {
    grade, totalScore, counterScore, costScore, typeScore,
    charCounterValue, charCounterCards, charCounter1000Cards, charCounter2000Cards,
    eventCounterCards, mainEventCards, triggerCards,
    highCostEventCards, lowCost, midCost, highCost, lowPct,
    charCount, eventCount, leaderRules = {}, advice,
  } = result;

  // コスト分布をデッキから直接計算
  const costDist = {};
  deck.forEach(({ card, count }) => {
    const c = card.cost ?? 0;
    costDist[c] = (costDist[c] || 0) + count;
  });
  const isLimitedDon  = (leaderRules.maxDon ?? 10) < 10;
  const eventIsStr    = !!leaderRules.eventIsStrength;
  const eventAsCtr    = !!leaderRules.eventAsCounter;

  return (
    <div className="space-y-3">
      <LeaderRulesBanner leaderRules={leaderRules} />

      {/* スコアヘッダー */}
      <div className="flex items-center gap-4 bg-gray-800/60 rounded-xl p-3">
        <DonutScore score={totalScore} grade={grade} />
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm mb-2">デッキ総合評価</div>
          <GradientBar label="防御力 (カウンター)" score={counterScore} max={40}
            fromColor="#f97316" toColor="#fbbf24" />
          <GradientBar label="テンポ (コスト曲線)" score={costScore} max={30}
            fromColor="#10b981" toColor="#34d399" />
          <GradientBar label="構成比 (タイプ比率)" score={typeScore} max={30}
            fromColor="#3b82f6" toColor="#818cf8" />
        </div>
      </div>

      {/* コスト分布チャート */}
      <CostChart distribution={costDist} leaderRules={leaderRules} />

      {/* カウンター詳細 */}
      <div className="bg-gray-800/60 rounded-xl p-3">
        <div className="text-xs font-semibold text-orange-300 mb-2">🛡 防御リソース</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">カウンター合計</span>
            <span className={charCounterValue >= 20000 ? 'text-yellow-300 font-bold' : 'text-gray-300'}>
              {(charCounterValue/1000).toFixed(0)}K
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">カウンターキャラ計</span>
            <span className={(eventAsCtr ? charCounterCards >= 10 : charCounterCards >= 14) ? 'text-yellow-300 font-bold' : 'text-gray-300'}>
              {charCounterCards}枚
            </span>
          </div>
          <div className="flex justify-between text-xs col-span-2 border-t border-gray-700/40 pt-1 mt-0.5">
            <span className="text-gray-500 pl-2">うち +2000</span>
            <span className={charCounter2000Cards >= 8 ? 'text-yellow-300 font-bold' : 'text-gray-300'}>
              {charCounter2000Cards ?? 0}枚
            </span>
          </div>
          <div className="flex justify-between text-xs col-span-2">
            <span className="text-gray-500 pl-2">うち +1000</span>
            <span className="text-gray-300">
              {charCounter1000Cards ?? 0}枚
            </span>
          </div>
          <div className="flex justify-between text-xs border-t border-gray-700/40 pt-1 mt-0.5">
            <span className="text-gray-500">カウンターイベント</span>
            <span className={eventCounterCards >= 3 ? 'text-yellow-300 font-bold' : 'text-gray-300'}>
              {eventCounterCards}枚
            </span>
          </div>
          <div className="flex justify-between text-xs border-t border-gray-700/40 pt-1 mt-0.5">
            <span className="text-gray-500">メインイベント</span>
            <span className={mainEventCards >= 2 ? 'text-yellow-300 font-bold' : 'text-gray-300'}>
              {mainEventCards}枚
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">トリガーカード</span>
            <span className="text-gray-300">{triggerCards}枚</span>
          </div>
          {eventIsStr && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">C{leaderRules.eventDrawMinCost ?? 3}+イベント</span>
              <span className={highCostEventCards >= 8 ? 'text-yellow-300 font-bold' : 'text-gray-300'}>
                {highCostEventCards}枚
              </span>
            </div>
          )}
        </div>
      </div>

      {/* アドバイス（改善点のみ表示） */}
      {advice.length > 0 && (
        <div className="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-3">
          <div className="text-xs font-semibold text-indigo-300 mb-2">💡 改善ポイント</div>
          <ul className="space-y-2">
            {advice.map((a, i) => (
              <li key={i} className="text-xs text-indigo-100/80 flex gap-2 leading-relaxed">
                <span className="text-indigo-500 flex-shrink-0 mt-0.5">▸</span><span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── リーダー相性タブ ──────────────────────────────────
function SynergyTab({ synergy, leader }) {
  if (!synergy || !leader) return <EmptyState text="リーダーを選択するとシナジー分析が表示されます" />;
  const gradeStyle = GRADE_COLOR[synergy.grade] || 'text-gray-300 border-gray-500';

  // 色一致率などの自明な情報を除外（常に100%のため）
  const meaningfulPoints = synergy.points.filter(p =>
    !p.text.includes('色一致率')
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-gray-800/60 rounded-xl p-3">
        <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${gradeStyle}`}>
          <span className="text-2xl font-black">{synergy.grade}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold">{leader.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {(leader.colors || []).join('・')} ／ ライフ {leader.life}
          </div>
          {synergy.effectKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {synergy.effectKeywords.map(kw => (
                <span key={kw} className="text-[9px] px-1.5 py-0.5 bg-indigo-900/60 text-indigo-200 rounded-full border border-indigo-700/60">{kw}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* シナジー評価（自明な情報を除く） */}
      {meaningfulPoints.length > 0 && (
        <div className="bg-gray-800/60 rounded-xl p-3 space-y-2">
          <div className="text-xs font-semibold text-indigo-300 mb-1.5">📋 シナジー評価</div>
          {meaningfulPoints.map((p, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`flex-shrink-0 mt-0.5 font-bold ${p.good === true ? 'text-green-400' : p.good === false ? 'text-red-400' : 'text-gray-500'}`}>
                {p.good === true ? '✓' : p.good === false ? '✗' : '›'}
              </span>
              <span className={p.good === false ? 'text-red-300' : 'text-gray-300'}>{p.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* 種族分布 */}
      {synergy.topTraits.length > 0 && (
        <div className="bg-gray-800/60 rounded-xl p-3">
          <div className="text-xs font-semibold text-indigo-300 mb-2.5">🎯 主要種族構成</div>
          <div className="space-y-2">
            {synergy.topTraits.map(t => (
              <div key={t.trait} className="flex items-center gap-2">
                <span className={`text-xs w-28 flex-shrink-0 ${t.matchesLeader ? 'text-yellow-300 font-bold' : 'text-gray-400'}`}>
                  {t.matchesLeader && '★ '}{t.trait}
                </span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${t.matchesLeader ? 'bg-yellow-400' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(t.pct * 2, 100)}%`, transition: 'width 0.5s ease' }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-10 text-right tabular-nums">{t.pct}%</span>
              </div>
            ))}
          </div>
          {synergy.topTraits.some(t => t.matchesLeader) && (
            <div className="text-[10px] text-yellow-500/80 mt-2">★ リーダーと種族一致</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 対面分析タブ ──────────────────────────────────────
function MatchupTab({ matchups }) {
  if (!matchups || matchups.length === 0) return <EmptyState />;
  const tier1 = matchups.filter(m => m.tier === 1);
  const tier2 = matchups.filter(m => m.tier === 2);
  const [expanded, setExpanded] = useState(null);

  const labelBg = {
    '大有利': 'bg-green-900/60 text-green-300 border-green-700',
    '有利': 'bg-green-900/30 text-green-400 border-green-800',
    '五分': 'bg-yellow-900/30 text-yellow-300 border-yellow-800',
    '不利': 'bg-red-900/30 text-red-400 border-red-800',
    '大不利': 'bg-red-900/60 text-red-300 border-red-700',
  };

  const MatchupRow = ({ m }) => (
    <div className="mb-1.5">
      <button
        onClick={() => setExpanded(expanded === m.id ? null : m.id)}
        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all hover:brightness-110 ${m.bgColor}`}>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white">{m.name}</div>
          <div className="text-[10px] text-gray-400 mt-0.5 truncate">{m.description}</div>
        </div>
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border flex-shrink-0 ${labelBg[m.label] ?? 'text-gray-300 border-gray-600'}`}>
          {m.label}
        </span>
        <span className="text-gray-600 text-[10px] flex-shrink-0">{expanded === m.id ? '▲' : '▼'}</span>
      </button>
      {expanded === m.id && (
        <div className="mx-1 mb-1 px-3 py-2 bg-gray-800/50 rounded-b-xl border border-gray-700 border-t-0 text-xs space-y-1.5">
          {m.reasons.map((r, i) => (
            <div key={i} className="flex gap-1.5 text-gray-400">
              <span className="text-gray-600 flex-shrink-0">›</span><span>{r}</span>
            </div>
          ))}
          <div className="pt-1.5 border-t border-gray-700 text-gray-500">
            弱点: <span className="text-gray-400">{m.weakness}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-bold text-red-300 mb-2">⚡ Tier 1 対面</div>
        {tier1.map(m => <MatchupRow key={m.id} m={m} />)}
      </div>
      <div>
        <div className="text-xs font-bold text-orange-300 mb-2">🔸 Tier 2 対面</div>
        {tier2.map(m => <MatchupRow key={m.id} m={m} />)}
      </div>
      <div className="text-[10px] text-gray-600 pt-1 border-t border-gray-800">
        ※ コスト曲線・カウンター密度・ライフ等から算出した目安。プレイング次第で変動します。
      </div>
    </div>
  );
}

// ── 立ち回りタブ ──────────────────────────────────────

function TurnCardBadges({ charCards, eventCards }) {
  const counterEvts = eventCards.filter(c => c.isCounter);
  const actionEvts  = eventCards.filter(c => !c.isCounter);
  const hasAny = charCards.length > 0 || eventCards.length > 0;
  if (!hasAny) return null;
  return (
    <div className="space-y-1.5 mb-2">
      {charCards.length > 0 && (
        <div>
          <div className="text-[9px] text-blue-400 font-semibold mb-1">👤 キャラ（自分ターン展開）</div>
          <div className="flex flex-wrap gap-1">
            {charCards.map((c, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded-lg border border-blue-800/50 leading-tight">
                {c.name}（{c.cost}C×{c.count}）
              </span>
            ))}
          </div>
        </div>
      )}
      {counterEvts.length > 0 && (
        <div>
          <div className="text-[9px] text-orange-400 font-semibold mb-1">🛡 カウンター（相手ターン使用）</div>
          <div className="flex flex-wrap gap-1">
            {counterEvts.map((c, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-orange-900/50 text-orange-300 rounded-lg border border-orange-800/50 leading-tight">
                {c.name}（{c.cost}C×{c.count}）
              </span>
            ))}
          </div>
        </div>
      )}
      {actionEvts.length > 0 && (
        <div>
          <div className="text-[9px] text-green-400 font-semibold mb-1">📜 アクション（自分ターン使用）</div>
          <div className="flex flex-wrap gap-1">
            {actionEvts.map((c, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded-lg border border-green-800/50 leading-tight">
                {c.name}（{c.cost}C×{c.count}）
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StrategyTab({ strategy, leader, deck }) {
  if (!strategy || !leader) return <EmptyState text="リーダーとカードを追加すると定石が表示されます" />;
  const { turns, generalTips } = strategy;
  const leaderHints = getLeaderStrategyHints(leader, deck);
  const winConditions = generateWinConditions(deck, leader);

  return (
    <div className="space-y-3">
      {/* デッキ別勝ち筋 */}
      {winConditions.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-900/60 to-gray-900/60 px-3 py-2 border-b border-gray-700">
            <div className="text-xs font-bold text-amber-300 tracking-wide">🏆 このデッキの勝ち筋</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{leader.name} デッキ特化攻略</div>
          </div>
          <div className="divide-y divide-gray-800">
            {winConditions.map((tip, i) => (
              <div key={i} className="px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{tip.icon}</span>
                  <span className="text-xs font-semibold text-gray-100">{tip.title}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed pl-5">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* リーダー固有戦略 */}
      {leaderHints.length > 0 && (
        <div className="bg-indigo-950/60 border border-indigo-800/60 rounded-xl p-3">
          <div className="text-xs font-bold text-indigo-300 mb-2">🌟 {leader.name} の立ち回りポイント</div>
          <ul className="space-y-2">
            {leaderHints.map((hint, i) => (
              <li key={i} className="text-xs text-indigo-200/90 flex gap-2 leading-relaxed">
                <span className="text-indigo-500 flex-shrink-0 font-bold mt-0.5">→</span>
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ターン別定石 */}
      {turns.map(t => (
        <div key={t.turn} className="bg-gray-800/60 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg leading-none">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-white">{t.turn}</span>
              <span className="text-[10px] text-gray-500 ml-2">（{t.don}）</span>
            </div>
            <span className="text-[10px] text-gray-500 bg-gray-700/60 px-2 py-0.5 rounded-full flex-shrink-0">{t.phase}</span>
          </div>
          <TurnCardBadges charCards={t.charCards} eventCards={t.eventCards} />
          <p className="text-xs text-gray-300 leading-relaxed border-l-2 border-gray-600 pl-2.5">{t.advice}</p>
        </div>
      ))}

      {/* 共通Tips */}
      <div className="bg-teal-950/50 border border-teal-800/40 rounded-xl p-3">
        <div className="text-xs font-bold text-teal-300 mb-2">📌 このデッキの共通ポイント</div>
        <ul className="space-y-2">
          {generalTips.map((tip, i) => (
            <li key={i} className="text-xs text-teal-100/80 flex gap-2 leading-relaxed">
              <span className="text-teal-600 flex-shrink-0 font-bold">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── 共通 ──────────────────────────────────────────────
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

  const result   = useMemo(() => evaluateDeck(deck, leader),         [deck, leader]);
  const synergy  = useMemo(() => analyzeLeaderSynergy(deck, leader), [deck, leader]);
  const matchups = useMemo(() => analyzeMatchups(deck, leader),      [deck, leader]);
  const strategy = useMemo(() => generateStrategy(deck, leader),     [deck, leader]);

  const isEmpty = !deck.length;

  return (
    <div className="flex flex-col h-full">
      {/* サブタブ */}
      <div className="flex-shrink-0 flex border-b border-gray-700/80 bg-gray-900/70">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-2 text-[10px] leading-tight transition-colors gap-0.5
              ${tab === t.id
                ? 'text-white border-b-2 border-purple-500 bg-purple-900/20'
                : 'text-gray-600 hover:text-gray-400'}`}>
            <span className="text-sm leading-tight">{t.icon}</span>
            <span className="font-medium">{t.label}</span>
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {isEmpty && tab !== 'synergy' && <EmptyState />}
        {(!isEmpty || tab === 'synergy') && (
          <>
            {tab === 'score'    && <ScoreTab    result={result} deck={deck} />}
            {tab === 'synergy'  && <SynergyTab  synergy={synergy} leader={leader} />}
            {tab === 'matchup'  && <MatchupTab  matchups={matchups} />}
            {tab === 'strategy' && <StrategyTab strategy={strategy} leader={leader} deck={deck} />}
          </>
        )}
      </div>
    </div>
  );
}
