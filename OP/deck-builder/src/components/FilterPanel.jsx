import { useState } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

const COLORS = ['赤', '緑', '青', '紫', '黒', '黄'];
const TYPES  = ['LEADER', 'CHARACTER', 'EVENT', 'STAGE'];
const TYPE_LABELS = { LEADER: 'リーダー', CHARACTER: 'キャラ', EVENT: 'イベント', STAGE: 'ステージ' };
const COLOR_BG  = { 赤:'bg-red-600', 緑:'bg-green-600', 青:'bg-blue-500', 紫:'bg-purple-600', 黒:'bg-gray-700', 黄:'bg-yellow-400' };
const COLOR_TXT = { 黄:'text-gray-900' };

export default function FilterPanel({ filters, onChange, seriesList }) {
  const [filterOpen, setFilterOpen] = useState(false);

  const toggle = (key, val) => {
    const cur = filters[key] || [];
    onChange({ ...filters, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] });
  };

  // アクティブフィルター数（検索テキスト除く）
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
    <div className="bg-gray-900 border-b border-gray-700/80 px-3 sm:px-4 py-2.5 sm:py-3">
      {/* 検索バー + モバイル用フィルタートグル */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="カード名・効果で検索…"
            value={filters.text || ''}
            onChange={e => onChange({ ...filters, text: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {filters.text && (
            <button
              onClick={() => onChange({ ...filters, text: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* モバイル: フィルタートグルボタン */}
        <button
          onClick={() => setFilterOpen(v => !v)}
          className={`md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all flex-shrink-0
            ${filterOpen || activeCount > 0
              ? 'bg-blue-700/40 border-blue-500/60 text-blue-300'
              : 'bg-gray-800 border-gray-700 text-gray-400 active:bg-gray-700'
            }`}
        >
          <SlidersHorizontal size={14} />
          フィルター
          {activeCount > 0 && (
            <span className="bg-blue-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
          {filterOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* フィルターコントロール — モバイルは折りたたみ可、デスクトップは常時表示 */}
      <div className={`mt-2.5 space-y-0 ${filterOpen ? 'block' : 'hidden'} md:block`}>
        <div className="flex flex-wrap gap-x-4 gap-y-2.5 items-start">
          {/* 色フィルター */}
          <div>
            <div className="text-[10px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">色</div>
            <div className="flex gap-1">
              {COLORS.map(c => {
                const active = (filters.colors || []).includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggle('colors', c)}
                    className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition-all
                      ${COLOR_BG[c] || 'bg-gray-600'} ${COLOR_TXT[c] || 'text-white'}
                      ${active ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-40 hover:opacity-70'}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 種類フィルター */}
          <div>
            <div className="text-[10px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">種類</div>
            <div className="flex gap-1 flex-wrap">
              {TYPES.map(t => {
                const active = (filters.types || []).includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggle('types', t)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-all
                      ${active
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-300'
                      }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 特殊フィルター */}
          <div>
            <div className="text-[10px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">特殊</div>
            <div className="flex gap-1">
              <button
                onClick={() => onChange({ ...filters, counterOnly: !filters.counterOnly })}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-all
                  ${filters.counterOnly
                    ? 'bg-orange-600 border-orange-400 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400'
                  }`}
              >
                🛡 カウンター
              </button>
              <button
                onClick={() => onChange({ ...filters, triggerOnly: !filters.triggerOnly })}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-all
                  ${filters.triggerOnly
                    ? 'bg-yellow-500 border-yellow-300 text-gray-900'
                    : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400'
                  }`}
              >
                ⚡ トリガー
              </button>
            </div>
          </div>

          {/* シリーズフィルター */}
          <div className="flex-1 min-w-36">
            <div className="text-[10px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">収録パック</div>
            <select
              value={filters.series || ''}
              onChange={e => onChange({ ...filters, series: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 px-2 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="">すべて</option>
              {seriesList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* コスト範囲 */}
          <div>
            <div className="text-[10px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">コスト</div>
            <div className="flex items-center gap-1">
              <input
                type="number" min="0" max="10" placeholder="0"
                value={filters.costMin ?? ''}
                onChange={e => onChange({ ...filters, costMin: e.target.value === '' ? '' : +e.target.value })}
                className="w-11 bg-gray-800 border border-gray-700 rounded text-xs text-white px-2 py-1.5 focus:outline-none focus:border-blue-500 text-center"
              />
              <span className="text-gray-600 text-xs">〜</span>
              <input
                type="number" min="0" max="10" placeholder="10"
                value={filters.costMax ?? ''}
                onChange={e => onChange({ ...filters, costMax: e.target.value === '' ? '' : +e.target.value })}
                className="w-11 bg-gray-800 border border-gray-700 rounded text-xs text-white px-2 py-1.5 focus:outline-none focus:border-blue-500 text-center"
              />
            </div>
          </div>

          {/* クリアボタン */}
          <div className="flex items-end">
            <button
              onClick={() => onChange({})}
              className="text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-3 py-1.5 transition-colors"
            >
              クリア
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
