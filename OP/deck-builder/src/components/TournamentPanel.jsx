import { useState, useEffect } from 'react';
import { X, Trophy, ExternalLink, RefreshCw, BarChart2 } from 'lucide-react';

// ─────────────────────────────────────────────
// カラーユーティリティ
// ─────────────────────────────────────────────
function getLeaderColors(name) {
  const colorMap = [
    ['赤青',['赤','青']], ['赤緑',['赤','緑']], ['赤黄',['赤','黄']], ['赤黒',['赤','黒']], ['赤紫',['赤','紫']],
    ['青黄',['青','黄']], ['青緑',['青','緑']], ['青黒',['青','黒']], ['青紫',['青','紫']],
    ['黄緑',['黄','緑']], ['黄黒',['黄','黒']], ['黄紫',['黄','紫']],
    ['緑黒',['緑','黒']], ['緑紫',['緑','紫']], ['緑黄',['緑','黄']],
    ['黒紫',['黒','紫']], ['紫黄',['紫','黄']],
  ];
  for (const [key, colors] of colorMap) {
    if (name.startsWith(key)) return colors;
  }
  for (const c of ['赤','青','緑','黄','黒','紫']) {
    if (name.startsWith(c)) return [c];
  }
  return ['黒'];
}

const COLOR_HEX = {
  赤: '#ef4444', 青: '#3b82f6', 緑: '#22c55e',
  黄: '#facc15', 黒: '#9ca3af', 紫: '#a855f7',
};
const COLOR_STYLE = {
  赤: { bg: 'bg-red-500',    text: 'text-red-400',    bar: 'bg-red-500' },
  青: { bg: 'bg-blue-500',   text: 'text-blue-400',   bar: 'bg-blue-500' },
  緑: { bg: 'bg-green-500',  text: 'text-green-400',  bar: 'bg-green-500' },
  黄: { bg: 'bg-yellow-400', text: 'text-yellow-300', bar: 'bg-yellow-400' },
  黒: { bg: 'bg-gray-300',   text: 'text-gray-300',   bar: 'bg-gray-400' },
  紫: { bg: 'bg-purple-500', text: 'text-purple-400', bar: 'bg-purple-500' },
};

function primaryHex(leaderName) {
  const c = getLeaderColors(leaderName)[0] || '黒';
  return COLOR_HEX[c] || '#9ca3af';
}

function ColorDots({ leaderName, size = 'w-2.5 h-2.5' }) {
  return (
    <div className="flex gap-0.5 flex-shrink-0">
      {getLeaderColors(leaderName).map(c => (
        <span key={c}
          className={`inline-block ${size} rounded-full flex-shrink-0 ${COLOR_STYLE[c]?.bg || 'bg-gray-500'}`} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// SVG 円グラフ
// ─────────────────────────────────────────────
function PieChart({ distribution, highlighted, onHover }) {
  const cx = 130, cy = 130, R = 110, innerR = 52;

  // 優勝数ベースでスライスを作成（0件は除外）
  const slices = distribution.filter(d => d.wins14 > 0);
  const total  = slices.reduce((s, d) => s + d.wins14, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center h-64 text-gray-600 text-sm">データなし</div>
  );

  // 各スライスの角度を計算
  let cursor = -Math.PI / 2; // 12時から開始
  const paths = slices.map(d => {
    const angle  = (d.wins14 / total) * 2 * Math.PI;
    const start  = cursor;
    const end    = cursor + angle;
    cursor       = end;
    const large  = angle > Math.PI ? 1 : 0;
    const color  = primaryHex(d.leaderName);
    const isHL   = highlighted === d.leaderName;

    // ホバー時に外側に少し押し出す
    const mid    = (start + end) / 2;
    const pushX  = isHL ? Math.cos(mid) * 8 : 0;
    const pushY  = isHL ? Math.sin(mid) * 8 : 0;

    const x1 = cx + pushX + R * Math.cos(start);
    const y1 = cy + pushY + R * Math.sin(start);
    const x2 = cx + pushX + R * Math.cos(end);
    const y2 = cy + pushY + R * Math.sin(end);
    const ix1 = cx + pushX + innerR * Math.cos(end);
    const iy1 = cy + pushY + innerR * Math.sin(end);
    const ix2 = cx + pushX + innerR * Math.cos(start);
    const iy2 = cy + pushY + innerR * Math.sin(start);

    const d_attr = [
      `M ${cx + pushX + innerR * Math.cos(start)} ${cy + pushY + innerR * Math.sin(start)}`,
      `L ${x1} ${y1}`,
      `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    // パーセントラベルの位置（スライスが十分大きい場合のみ）
    const labelR  = (R + innerR) / 2;
    const midAngle = (start + end) / 2;
    const lx = cx + pushX + labelR * Math.cos(midAngle);
    const ly = cy + pushY + labelR * Math.sin(midAngle);
    const pct = Math.round((d.wins14 / total) * 100);

    return { d: d_attr, color, name: d.leaderName, wins: d.wins14, pct, lx, ly, isHL, angle };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="260" height="260" viewBox="0 0 260 260">
        {paths.map((p, i) => (
          <g key={i}
            onMouseEnter={() => onHover(p.name)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            <path
              d={p.d}
              fill={p.color}
              opacity={highlighted && !p.isHL ? 0.4 : 1}
              stroke="#111827"
              strokeWidth="1.5"
            />
            {/* パーセントラベル（5%以上） */}
            {p.pct >= 8 && (
              <text
                x={p.lx} y={p.ly}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="11" fontWeight="bold" fill="white"
                style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
              >
                {p.pct}%
              </text>
            )}
          </g>
        ))}
        {/* 中央ラベル */}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="13" fill="#d1d5db" fontWeight="bold">
          優勝
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="22" fill="white" fontWeight="bold">
          {total}
        </text>
        <text x={cx} y={cy + 28} textAnchor="middle" fontSize="11" fill="#6b7280">
          件
        </text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// 分布バーグラフ行
// ─────────────────────────────────────────────
function DistributionRow({ item, maxTotal, index, highlighted, onHover }) {
  const colors = getLeaderColors(item.leaderName);
  const primaryColor = colors[0] || '黒';
  const style = COLOR_STYLE[primaryColor] || COLOR_STYLE['黒'];
  const winPct  = maxTotal > 0 ? (item.wins14     / maxTotal) * 100 : 0;
  const runPct  = maxTotal > 0 ? (item.runnerUp14 / maxTotal) * 100 : 0;
  const isHL    = highlighted === item.leaderName;

  return (
    <div
      className={`flex items-center gap-3 py-2 border-b border-gray-800/60 last:border-0 rounded px-1 transition-colors cursor-default
        ${isHL ? 'bg-gray-700/40' : 'hover:bg-gray-800/30'}`}
      onMouseEnter={() => onHover(item.leaderName)}
      onMouseLeave={() => onHover(null)}
    >
      {/* ランク */}
      <span className="text-gray-600 text-xs w-5 flex-shrink-0 text-center font-mono">{index + 1}</span>
      {/* 色ドット */}
      <ColorDots leaderName={item.leaderName} />
      {/* リーダー名 */}
      <span className={`text-sm flex-1 min-w-0 truncate font-medium ${isHL ? 'text-white' : 'text-gray-200'}`}>
        {item.leaderName}
      </span>
      {/* バーグラフ */}
      <div className="flex items-center gap-1.5 w-36 flex-shrink-0">
        <div className="flex-1 h-3.5 bg-gray-800 rounded-full overflow-hidden flex">
          {item.wins14 > 0 && (
            <div className={`h-full ${style.bar} transition-all`}
              style={{ width: `${winPct}%` }} title={`優勝 ${item.wins14}`} />
          )}
          {item.runnerUp14 > 0 && (
            <div className="h-full bg-gray-500 transition-all"
              style={{ width: `${runPct}%` }} title={`準優勝 ${item.runnerUp14}`} />
          )}
        </div>
      </div>
      {/* 数字 */}
      <div className="flex items-center gap-2 flex-shrink-0 text-xs w-20 justify-end">
        <span className={`font-bold tabular-nums ${style.text}`}>優 {item.wins14}</span>
        <span className="text-gray-500 tabular-nums">準 {item.runnerUp14}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 優勝一覧行
// ─────────────────────────────────────────────
function WinnerRow({ deck }) {
  const isWin = deck.result === '優勝';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 rounded px-1 transition-colors">
      <span className="text-gray-500 text-xs flex-shrink-0 w-20 tabular-nums">{deck.date}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded flex-shrink-0
        ${isWin ? 'bg-yellow-700/40 text-yellow-300 border border-yellow-600/40'
                : 'bg-gray-700/60 text-gray-300 border border-gray-600/40'}`}>
        {deck.result}
      </span>
      <ColorDots leaderName={deck.leaderName} />
      <span className="text-sm text-gray-200 flex-1 min-w-0 truncate font-medium">{deck.leaderName}</span>
      <span className="text-gray-500 text-xs flex-shrink-0 max-w-[180px] truncate">{deck.eventName}</span>
      <a href={deck.deckUrl} target="_blank" rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-400 flex-shrink-0 transition-colors p-0.5"
        title="デッキリストを見る">
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────
// メインパネル
// ─────────────────────────────────────────────
export default function TournamentPanel({ onClose }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [tab,         setTab]         = useState('distribution');
  const [highlighted, setHighlighted] = useState(null);

  useEffect(() => {
    fetch('./tournament_stats.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d  => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const maxTotal = data?.distribution?.[0]?.total14 || 1;
  const sortedWinners = data?.recentWinners
    ? [...data.recentWinners].sort((a, b) => b.rawDate.localeCompare(a.rawDate))
    : [];

  // 凡例（円グラフ対象リーダー）
  const legendItems = data?.distribution?.filter(d => d.wins14 > 0) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      {/* max-w-lg(512) → max-w-4xl(896) で約1.75倍 */}
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[88vh]">

        {/* ヘッダー */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-700/80 flex-shrink-0">
          <BarChart2 size={18} className="text-yellow-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-white text-base font-bold">大会統計 — 直近14日間</div>
            {data?.lastUpdated && (
              <div className="text-gray-500 text-xs mt-0.5 flex items-center gap-1.5">
                <RefreshCw size={10} />
                最終更新: {data.lastUpdated.replace('T', ' ').replace('+09:00', ' JST')}
              </div>
            )}
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-700/80 flex-shrink-0 px-2">
          {[
            { id: 'distribution', icon: <BarChart2 size={13} />, label: 'デッキ分布' },
            { id: 'winners',      icon: <Trophy    size={13} />, label: `優勝一覧${data ? `（${sortedWinners.length}件）` : ''}` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition-colors
                ${tab === t.id
                  ? 'text-blue-400 border-b-2 border-blue-400 -mb-px bg-blue-500/5'
                  : 'text-gray-500 hover:text-gray-300'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* ローディング */}
          {loading && (
            <div className="flex items-center justify-center flex-1">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {/* エラー */}
          {error && (
            <div className="text-center py-12 flex-1 flex flex-col items-center justify-center gap-2">
              <div className="text-red-400 text-sm">データの読み込みに失敗しました</div>
              <div className="text-gray-600 text-xs">{error}</div>
            </div>
          )}

          {/* ─── デッキ分布タブ: 2カラム ─── */}
          {!loading && !error && tab === 'distribution' && (
            <div className="flex flex-1 min-h-0 gap-0">

              {/* 左: 円グラフ + 凡例 */}
              <div className="w-80 flex-shrink-0 flex flex-col items-center border-r border-gray-800 px-4 py-4 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-400 mb-3 self-start">優勝回数シェア</div>
                <PieChart
                  distribution={data.distribution}
                  highlighted={highlighted}
                  onHover={setHighlighted}
                />
                {/* 凡例 */}
                <div className="mt-3 w-full space-y-1">
                  {legendItems.map(item => {
                    const isHL = highlighted === item.leaderName;
                    const hex  = primaryHex(item.leaderName);
                    const pct  = Math.round((item.wins14 / legendItems.reduce((s,d) => s+d.wins14, 0)) * 100);
                    return (
                      <div key={item.leaderName}
                        className={`flex items-center gap-2 py-1 px-2 rounded cursor-default transition-colors
                          ${isHL ? 'bg-gray-700/50' : 'hover:bg-gray-800/30'}`}
                        onMouseEnter={() => setHighlighted(item.leaderName)}
                        onMouseLeave={() => setHighlighted(null)}
                      >
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: hex }} />
                        <span className={`text-xs flex-1 truncate ${isHL ? 'text-white font-medium' : 'text-gray-300'}`}>
                          {item.leaderName}
                        </span>
                        <span className="text-xs tabular-nums text-gray-500">{pct}%</span>
                        <span className="text-xs tabular-nums font-bold" style={{ color: hex }}>
                          {item.wins14}勝
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 右: バーグラフ一覧 */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="text-xs font-semibold text-gray-400 mb-3">入賞数ランキング（優勝＋準優勝）</div>
                {/* ヘッダー行 */}
                <div className="flex items-center gap-3 pb-2 border-b border-gray-700 mb-1">
                  <span className="text-gray-600 text-[11px] w-5">#</span>
                  <span className="text-gray-600 text-[11px] flex-1">リーダー</span>
                  <span className="text-gray-600 text-[11px] w-36 text-center">入賞割合</span>
                  <div className="text-gray-600 text-[11px] w-20 flex gap-2 justify-end">
                    <span className="text-yellow-600">優勝</span>
                    <span>準優勝</span>
                  </div>
                </div>
                {data.distribution.length === 0
                  ? <div className="text-center text-gray-600 text-sm py-8">データなし</div>
                  : data.distribution.map((item, i) => (
                    <DistributionRow
                      key={item.leaderName}
                      item={item}
                      maxTotal={maxTotal}
                      index={i}
                      highlighted={highlighted}
                      onHover={setHighlighted}
                    />
                  ))
                }
              </div>
            </div>
          )}

          {/* ─── 優勝一覧タブ ─── */}
          {!loading && !error && tab === 'winners' && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* ヘッダー行 */}
              <div className="flex items-center gap-3 pb-2 border-b border-gray-700 mb-1">
                <span className="text-gray-600 text-[11px] w-20">日付</span>
                <span className="text-gray-600 text-[11px] w-10">結果</span>
                <span className="text-gray-600 text-[11px] flex-1">リーダー</span>
                <span className="text-gray-600 text-[11px] max-w-[180px]">イベント</span>
                <span className="text-gray-600 text-[11px] w-5" />
              </div>
              {sortedWinners.length === 0
                ? <div className="text-center text-gray-600 text-sm py-8">データなし</div>
                : sortedWinners.map(deck => <WinnerRow key={deck.id} deck={deck} />)
              }
            </div>
          )}
        </div>

        {/* フッター */}
        {data && (
          <div className="px-6 py-2.5 border-t border-gray-800 flex-shrink-0">
            <p className="text-gray-600 text-xs">
              出典: cardrush.media 大会結果データ（優勝・準優勝のみ集計）
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
