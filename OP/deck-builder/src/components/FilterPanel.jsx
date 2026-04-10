import { useState } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

const COLORS = ['赤', '緑', '青', '紫', '黒', '黄'];
const TYPES  = ['LEADER', 'CHARACTER', 'EVENT', 'STAGE'];
const TYPE_LABELS = { LEADER: 'L', CHARACTER: 'C', EVENT: 'E', STAGE: 'S' };
const TYPE_LABELS_FULL = { LEADER: 'リーダー', CHARACTER: 'キャラ', EVENT: 'イベント', STAGE: 'ステージ' };
const COLOR_BG  = { 赤:'bg-red-600', 緑:'bg-green-600', 青:'bg-blue-500', 紫:'bg-purple-600', 黒:'bg-gray-600', 黄:'bg-yellow-400' };
const COLOR_TXT = { 黄:'text-gray-900' };

export default function FilterPanel({ filters, onChange, seriesList }) {
  const [filterOpen, setFilterOpen] = useState(false);

  const toggle = (key, val) => {
    const cur = filters[key] || [];
    onChange({ ...filters, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] });
  };

  const activeCount = [
    (filters.colors?.length || 0),
    (filters.types?.length || 0),
    filters.series ? 1 : 0,
    (filters.costMin != null && filters.costMin !== '') ? 1 : 0,
    (filters.costMax != null && filters.costMax !== '') ? 1 : 0,
    (filters.powerMin != null && filters.powerMin !== '') ? 1 : 0,
    (filters.powerMax != null && filters.powerMax !== '') ? 1 : 0,
    filters.triggerOnly ? 1 : 0,
    (filters.regulations?.length || 0),
  ].reduce((s, n) => s + n, 0);

  return (
    <div className="bg-[#080c1e]/90 border-b border-amber-900/30 backdrop-blur-sm flex-shrink-0">

      {/* ── 検索バー行（常時表示） ── */}
      <div className="flex gap-2 items-center px-2 py-2">
        {/* 検索入力 */}
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-700/60 pointer-events-none" />
          <input
            type="text"
            placeholder="カード名・効果を検索"
            value={filters.text || ''}
            onChange={e => onChange({ ...filters, text: e.target.value })}
            className="w-full bg-[#0d1530]/80 border border-amber-900/40 rounded-lg pl-7 pr-7 py-1.5 text-sm text-amber-100 placeholder-amber-800/50 focus:outline-none focus:border-amber-600/60"
          />
          {filters.text && (
            <button
              onClick={() => onChange({ ...filters, text: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-700/60 hover:text-amber-300"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* フィルタートグルボタン */}
        <button
          onClick={() => setFilterOpen(v => !v)}
          className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
            ${filterOpen || activeCount > 0
              ? 'bg-amber-800/40 border-amber-600/60 text-amber-300'
              : 'bg-[#0d1530]/80 border-amber-900/40 text-amber-700/70'
            }`}
        >
          <SlidersHorizontal size={13} />
          <span className="hidden sm:inline">フィルター</span>
          {activeCount > 0 && (
            <span className="bg-amber-500 text-gray-900 text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
          {filterOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* ── フィルターパネル（展開時） ── */}
      {filterOpen && (
        <div className="px-2 pb-2 border-t border-amber-900/25">
          <div className="mt-2 flex flex-col gap-2">

            {/* 行1: 色 | ブロックアイコン | 種類 | トリガー */}
            <div className="flex gap-4 flex-wrap">

              {/* 色フィルター */}
              <div className="flex-shrink-0">
                <div className="text-[9px] text-amber-700/60 mb-1 font-semibold uppercase tracking-wider">色</div>
                <div className="flex gap-1 flex-wrap">
                  {COLORS.map(c => {
                    const active = (filters.colors || []).includes(c);
                    return (
                      <button key={c} onClick={() => toggle('colors', c)}
                        className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition-all flex-shrink-0
                          ${COLOR_BG[c]} ${COLOR_TXT[c] || 'text-white'}
                          ${active ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-40'}`}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ブロックアイコン */}
              <div className="flex-shrink-0">
                <div className="text-[9px] text-amber-700/60 mb-1 font-semibold uppercase tracking-wider">ブロックアイコン</div>
                <div className="flex gap-1">
                  {['1','2','3','4','5'].map(r => {
                    const active = (filters.regulations || []).includes(r);
                    return (
                      <button key={r} onClick={() => toggle('regulations', r)}
                        className={`w-7 h-7 rounded-full text-xs font-black border-2 transition-all flex-shrink-0
                          ${active
                            ? 'bg-blue-600 border-blue-300 text-white scale-110 shadow-md'
                            : 'bg-[#0d1530]/80 border-amber-900/40 text-amber-400/80 opacity-60'
                          }`}>
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 種類フィルター */}
              <div className="flex-shrink-0">
                <div className="text-[9px] text-amber-700/60 mb-1 font-semibold uppercase tracking-wider">種類</div>
                <div className="flex gap-1 flex-wrap">
                  {TYPES.map(t => {
                    const active = (filters.types || []).includes(t);
                    return (
                      <button key={t} onClick={() => toggle('types', t)} title={TYPE_LABELS_FULL[t]}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-all
                          ${active
                            ? 'bg-amber-700 border-amber-500 text-amber-100'
                            : 'bg-[#0d1530]/80 border-amber-900/40 text-amber-700/60'
                          }`}>
                        {TYPE_LABELS_FULL[t]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* トリガー */}
              <div className="flex-shrink-0">
                <div className="text-[9px] text-amber-700/60 mb-1 font-semibold uppercase tracking-wider">特殊</div>
                <button
                  onClick={() => onChange({ ...filters, triggerOnly: !filters.triggerOnly })}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-all whitespace-nowrap
                    ${filters.triggerOnly
                      ? 'bg-yellow-500 border-yellow-300 text-gray-900'
                      : 'bg-[#0d1530]/80 border-amber-900/40 text-amber-700/60'
                    }`}
                >
                  ⚡ トリガー
                </button>
              </div>
            </div>

            {/* 行3: コスト | パワー */}
            <div className="grid grid-cols-2 gap-2">

              {/* コスト範囲 */}
              <div className="min-w-0">
                <div className="text-[9px] text-amber-700/60 mb-1 font-semibold uppercase tracking-wider">コスト</div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" max="10" placeholder="0"
                    value={filters.costMin ?? ''}
                    onChange={e => onChange({ ...filters, costMin: e.target.value === '' ? '' : +e.target.value })}
                    className="w-0 flex-1 bg-[#0d1530]/80 border border-amber-900/40 rounded text-sm text-amber-100 px-1.5 py-1 focus:outline-none focus:border-amber-600/60 text-center"
                  />
                  <span className="text-amber-500/80 text-xs flex-shrink-0">〜</span>
                  <input
                    type="number" min="0" max="10" placeholder="10"
                    value={filters.costMax ?? ''}
                    onChange={e => onChange({ ...filters, costMax: e.target.value === '' ? '' : +e.target.value })}
                    className="w-0 flex-1 bg-[#0d1530]/80 border border-amber-900/40 rounded text-sm text-amber-100 px-1.5 py-1 focus:outline-none focus:border-amber-600/60 text-center"
                  />
                </div>
              </div>

              {/* パワー範囲 */}
              <div className="min-w-0">
                <div className="text-[9px] text-amber-700/60 mb-1 font-semibold uppercase tracking-wider">パワー</div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" step="1000" placeholder="0"
                    value={filters.powerMin ?? ''}
                    onChange={e => onChange({ ...filters, powerMin: e.target.value === '' ? '' : +e.target.value })}
                    className="w-0 flex-1 bg-[#0d1530]/80 border border-amber-900/40 rounded text-sm text-amber-100 px-1.5 py-1 focus:outline-none focus:border-amber-600/60 text-center"
                  />
                  <span className="text-amber-500/80 text-xs flex-shrink-0">〜</span>
                  <input
                    type="number" min="0" step="1000" placeholder="max"
                    value={filters.powerMax ?? ''}
                    onChange={e => onChange({ ...filters, powerMax: e.target.value === '' ? '' : +e.target.value })}
                    className="w-0 flex-1 bg-[#0d1530]/80 border border-amber-900/40 rounded text-sm text-amber-100 px-1.5 py-1 focus:outline-none focus:border-amber-600/60 text-center"
                  />
                </div>
              </div>
            </div>

            {/* 行4: 収録パック（横幅いっぱい） + クリア（右端） */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 min-w-0">
                <div className="text-[9px] text-amber-700/60 mb-1 font-semibold uppercase tracking-wider">収録パック</div>
                <select
                  value={filters.series || ''}
                  onChange={e => onChange({ ...filters, series: e.target.value })}
                  className="w-full bg-[#0d1530]/80 border border-amber-900/40 rounded text-xs text-amber-200/80 px-2 py-1 focus:outline-none focus:border-amber-600/60"
                >
                  <option value="">すべて</option>
                  {seriesList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => { onChange({}); setFilterOpen(false); }}
                className="flex-shrink-0 text-xs text-amber-800/50 hover:text-amber-300 border border-amber-900/30 hover:border-amber-700/50 rounded px-2.5 py-1 transition-colors mb-px"
              >
                クリア
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
