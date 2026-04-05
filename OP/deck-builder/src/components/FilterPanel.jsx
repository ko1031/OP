import { Search, X, Zap } from 'lucide-react';

const COLORS = ['赤', '緑', '青', '紫', '黒', '黄'];
const TYPES  = ['LEADER', 'CHARACTER', 'EVENT', 'STAGE'];
const TYPE_LABELS = { LEADER: 'リーダー', CHARACTER: 'キャラ', EVENT: 'イベント', STAGE: 'ステージ' };
const COLOR_BG = { 赤:'bg-red-600', 緑:'bg-green-600', 青:'bg-blue-500', 紫:'bg-purple-600', 黒:'bg-gray-700', 黄:'bg-yellow-400' };
const COLOR_TXT = { 黄:'text-gray-900' };

export default function FilterPanel({ filters, onChange, seriesList }) {
  const toggle = (key, val) => {
    const cur = filters[key] || [];
    onChange({ ...filters, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] });
  };

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 space-y-3">
      {/* フリーワード検索 */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="カード名・効果で検索…"
          value={filters.text || ''}
          onChange={e => onChange({ ...filters, text: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {filters.text && (
          <button onClick={() => onChange({ ...filters, text: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-start">
        {/* 色フィルター */}
        <div>
          <div className="text-xs text-gray-500 mb-1 font-medium">色</div>
          <div className="flex gap-1 flex-wrap">
            {COLORS.map(c => {
              const active = (filters.colors || []).includes(c);
              return (
                <button key={c} onClick={() => toggle('colors', c)}
                  className={`w-8 h-8 rounded-full text-xs font-bold border-2 transition-all
                    ${COLOR_BG[c] || 'bg-gray-600'} ${COLOR_TXT[c] || 'text-white'}
                    ${active ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50'}`}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* 種類フィルター */}
        <div>
          <div className="text-xs text-gray-500 mb-1 font-medium">種類</div>
          <div className="flex gap-1 flex-wrap">
            {TYPES.map(t => {
              const active = (filters.types || []).includes(t);
              return (
                <button key={t} onClick={() => toggle('types', t)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-all
                    ${active ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400'}`}>
                  {TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 特殊フィルター */}
        <div>
          <div className="text-xs text-gray-500 mb-1 font-medium">特殊</div>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => onChange({ ...filters, counterOnly: !filters.counterOnly })}
              className={`px-3 py-1 rounded text-xs font-medium border transition-all flex items-center gap-1
                ${filters.counterOnly ? 'bg-orange-600 border-orange-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400'}`}>
              🛡 カウンター
            </button>
            <button
              onClick={() => onChange({ ...filters, triggerOnly: !filters.triggerOnly })}
              className={`px-3 py-1 rounded text-xs font-medium border transition-all flex items-center gap-1
                ${filters.triggerOnly ? 'bg-yellow-500 border-yellow-300 text-gray-900' : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400'}`}>
              ⚡ トリガー
            </button>
          </div>
        </div>

        {/* シリーズフィルター */}
        <div className="flex-1 min-w-40">
          <div className="text-xs text-gray-500 mb-1 font-medium">収録パック</div>
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
          <div className="text-xs text-gray-500 mb-1 font-medium">コスト</div>
          <div className="flex items-center gap-1">
            <input type="number" min="0" max="10" placeholder="0"
              value={filters.costMin ?? ''}
              onChange={e => onChange({ ...filters, costMin: e.target.value === '' ? '' : +e.target.value })}
              className="w-12 bg-gray-800 border border-gray-700 rounded text-xs text-white px-2 py-1.5 focus:outline-none"
            />
            <span className="text-gray-500 text-xs">〜</span>
            <input type="number" min="0" max="10" placeholder="10"
              value={filters.costMax ?? ''}
              onChange={e => onChange({ ...filters, costMax: e.target.value === '' ? '' : +e.target.value })}
              className="w-12 bg-gray-800 border border-gray-700 rounded text-xs text-white px-2 py-1.5 focus:outline-none"
            />
          </div>
        </div>

        {/* クリアボタン */}
        <div className="flex items-end">
          <button onClick={() => onChange({})}
            className="text-xs text-gray-500 hover:text-white border border-gray-700 rounded px-3 py-1.5 hover:border-gray-500 transition-colors">
            クリア
          </button>
        </div>
      </div>
    </div>
  );
}
