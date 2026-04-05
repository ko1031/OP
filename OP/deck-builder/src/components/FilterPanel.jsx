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
    filters.counterOnly ? 1 : 0,
    filters.triggerOnly ? 1 : 0,
  ].reduce((s, n) => s + n, 0);

  return (
    <div className="bg-gray-900 border-b border-gray-700/80 flex-shrink-0">

      {/* ── 検索バー行（常時表示） ── */}
      <div className="flex gap-2 items-center px-2 py-2">
        {/* 検索入力 */}
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="カード名・効果を検索"
            value={filters.text || ''}
            onChange={e => onChange({ ...filters, text: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-7 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {filters.text && (
            <button
              onClick={() => onChange({ ...filters, text: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
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
              ? 'bg-blue-700/50 border-blue-500/70 text-blue-300'
              : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
        >
          <SlidersHorizontal size={13} />
          <span className="hidden sm:inline">フィルター</span>
          {activeCount > 0 && (
            <span className="bg-blue-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
          {filterOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* ── フィルターパネル（展開時） ── */}
      {filterOpen && (
        <div className="px-2 pb-2 border-t border-gray-700/60">

          {/* モバイル: コンパクトグリッド / デスクトップ: 横並び */}
          <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-2">

            {/* 色 + 種類（モバイルは横2列） */}
            <div className="grid grid-cols-2 gap-2 sm:contents">

              {/* 色フィルター */}
              <div className="min-w-0">
                <div className="text-[9px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">色</div>
                <div className="flex gap-1 flex-wrap">
                  {COLORS.map(c => {
                    const active = (filters.colors || []).includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => toggle('colors', c)}
                        className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition-all flex-shrink-0
                          ${COLOR_BG[c]} ${COLOR_TXT[c] || 'text-white'}
                          ${active ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-40'}`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 種類フィルター */}
              <div className="min-w-0">
                <div className="text-[9px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">種類</div>
                <div className="flex gap-1 flex-wrap">
                  {TYPES.map(t => {
                    const active = (filters.types || []).includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => toggle('types', t)}
                        title={TYPE_LABELS_FULL[t]}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-all
                          ${active
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-gray-800 border-gray-600 text-gray-400'
                          }`}
                      >
                        <span className="sm:hidden">{TYPE_LABELS[t]}</span>
                        <span className="hidden sm:inline">{TYPE_LABELS_FULL[t]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 特殊フィルター + コスト + パック + クリア（モバイルは1行ずつ） */}
            <div className="grid grid-cols-2 gap-2 sm:contents">

              {/* 特殊フィルター */}
              <div className="min-w-0">
                <div className="text-[9px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">特殊</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onChange({ ...filters, counterOnly: !filters.counterOnly })}
                    className={`flex-1 py-1 rounded text-xs font-medium border transition-all text-center
                      ${filters.counterOnly
                        ? 'bg-orange-600 border-orange-400 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-400'
                      }`}
                  >
                    🛡 CNT
                  </button>
                  <button
                    onClick={() => onChange({ ...filters, triggerOnly: !filters.triggerOnly })}
                    className={`flex-1 py-1 rounded text-xs font-medium border transition-all text-center
                      ${filters.triggerOnly
                        ? 'bg-yellow-500 border-yellow-300 text-gray-900'
                        : 'bg-gray-800 border-gray-600 text-gray-400'
                      }`}
                  >
                    ⚡ TRG
                  </button>
                </div>
              </div>

              {/* コスト範囲 */}
              <div className="min-w-0">
                <div className="text-[9px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">コスト</div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" max="10" placeholder="0"
                    value={filters.costMin ?? ''}
                    onChange={e => onChange({ ...filters, costMin: e.target.value === '' ? '' : +e.target.value })}
                    className="w-0 flex-1 bg-gray-800 border border-gray-700 rounded text-sm text-white px-1.5 py-1 focus:outline-none focus:border-blue-500 text-center"
                  />
                  <span className="text-gray-600 text-xs flex-shrink-0">〜</span>
                  <input
                    type="number" min="0" max="10" placeholder="10"
                    value={filters.costMax ?? ''}
                    onChange={e => onChange({ ...filters, costMax: e.target.value === '' ? '' : +e.target.value })}
                    className="w-0 flex-1 bg-gray-800 border border-gray-700 rounded text-sm text-white px-1.5 py-1 focus:outline-none focus:border-blue-500 text-center"
                  />
                </div>
              </div>
            </div>

            {/* 収録パック + クリア */}
            <div className="flex gap-2 items-end w-full sm:w-auto sm:flex-1">
              <div className="flex-1 min-w-0">
                <div className="text-[9px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">収録パック</div>
                <select
                  value={filters.series || ''}
                  onChange={e => onChange({ ...filters, series: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 px-2 py-1 focus:outline-none focus:border-blue-500"
                >
                  <option value="">すべて</option>
                  {seriesList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => { onChange({}); setFilterOpen(false); }}
                className="flex-shrink-0 text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-2.5 py-1 transition-colors mb-px"
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
