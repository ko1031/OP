import { useState, useEffect } from 'react';
import { X, Trophy, ExternalLink, RefreshCw, BarChart2, List } from 'lucide-react';

// リーダー名から色ドット用の色を推定
function getLeaderColors(name) {
  const colorMap = [
    ['赤青', ['赤','青']], ['赤緑', ['赤','緑']], ['赤黄', ['赤','黄']], ['赤黒', ['赤','黒']], ['赤紫', ['赤','紫']],
    ['青黄', ['青','黄']], ['青緑', ['青','緑']], ['青黒', ['青','黒']], ['青紫', ['青','紫']],
    ['黄緑', ['黄','緑']], ['黄黒', ['黄','黒']], ['黄紫', ['黄','紫']],
    ['緑黒', ['緑','黒']], ['緑紫', ['緑','紫']],
    ['黒紫', ['黒','紫']],
    ['紫黄', ['紫','黄']],
    ['緑黄', ['緑','黄']],
  ];
  for (const [key, colors] of colorMap) {
    if (name.startsWith(key)) return colors;
  }
  const singleColors = ['赤','青','緑','黄','黒','紫'];
  for (const c of singleColors) {
    if (name.startsWith(c)) return [c];
  }
  return ['黒'];
}

const COLOR_STYLE = {
  赤: { bg: 'bg-red-500', text: 'text-red-400', bar: 'bg-red-500' },
  青: { bg: 'bg-blue-500', text: 'text-blue-400', bar: 'bg-blue-500' },
  緑: { bg: 'bg-green-500', text: 'text-green-400', bar: 'bg-green-500' },
  黄: { bg: 'bg-yellow-400', text: 'text-yellow-300', bar: 'bg-yellow-400' },
  黒: { bg: 'bg-gray-300', text: 'text-gray-300', bar: 'bg-gray-400' },
  紫: { bg: 'bg-purple-500', text: 'text-purple-400', bar: 'bg-purple-500' },
};

function ColorDots({ leaderName }) {
  const colors = getLeaderColors(leaderName);
  return (
    <div className="flex gap-0.5 flex-shrink-0">
      {colors.map(c => (
        <span
          key={c}
          className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_STYLE[c]?.bg || 'bg-gray-500'}`}
        />
      ))}
    </div>
  );
}

// 分布バーグラフ行
function DistributionRow({ item, maxTotal, index }) {
  const colors = getLeaderColors(item.leaderName);
  const primaryColor = colors[0] || '黒';
  const style = COLOR_STYLE[primaryColor] || COLOR_STYLE['黒'];
  const winPct = maxTotal > 0 ? (item.wins14 / maxTotal) * 100 : 0;
  const runPct = maxTotal > 0 ? (item.runnerUp14 / maxTotal) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-gray-800/60 last:border-0">
      {/* ランク */}
      <span className="text-gray-600 text-xs w-4 flex-shrink-0 text-center">{index + 1}</span>

      {/* 色ドット */}
      <ColorDots leaderName={item.leaderName} />

      {/* リーダー名 */}
      <span className="text-gray-200 text-xs flex-1 min-w-0 truncate">{item.leaderName}</span>

      {/* バーグラフ */}
      <div className="flex items-center gap-1 w-28 flex-shrink-0">
        <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden flex">
          {item.wins14 > 0 && (
            <div
              className={`h-full ${style.bar} rounded-l-full transition-all`}
              style={{ width: `${winPct}%` }}
              title={`優勝 ${item.wins14}`}
            />
          )}
          {item.runnerUp14 > 0 && (
            <div
              className="h-full bg-gray-500 transition-all"
              style={{ width: `${runPct}%` }}
              title={`準優勝 ${item.runnerUp14}`}
            />
          )}
        </div>
      </div>

      {/* 数字 */}
      <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px] w-16 justify-end">
        <span className={`font-bold ${style.text}`}>優{item.wins14}</span>
        <span className="text-gray-500">準{item.runnerUp14}</span>
      </div>
    </div>
  );
}

// 直近優勝一覧行
function WinnerRow({ deck }) {
  const dateStr = deck.date?.replace(/\//g, '/') || '';
  const isWin = deck.result === '優勝';

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-800/60 last:border-0">
      {/* 日付 */}
      <span className="text-gray-500 text-[10px] flex-shrink-0 w-16">{dateStr}</span>

      {/* 結果バッジ */}
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0
        ${isWin
          ? 'bg-yellow-700/40 text-yellow-300 border border-yellow-600/40'
          : 'bg-gray-700/60 text-gray-300 border border-gray-600/40'
        }`}>
        {deck.result}
      </span>

      {/* 色ドット */}
      <ColorDots leaderName={deck.leaderName} />

      {/* リーダー名 */}
      <span className="text-gray-200 text-xs flex-1 min-w-0 truncate">{deck.leaderName}</span>

      {/* イベント名 */}
      <span className="text-gray-600 text-[10px] flex-shrink-0 hidden sm:block max-w-[120px] truncate">
        {deck.eventName}
      </span>

      {/* デッキリンク */}
      <a
        href={deck.deckUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-400 flex-shrink-0 transition-colors"
        title="デッキリストを見る"
      >
        <ExternalLink size={12} />
      </a>
    </div>
  );
}

export default function TournamentPanel({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('distribution'); // 'distribution' | 'winners'

  useEffect(() => {
    fetch('./tournament_stats.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const maxTotal = data?.distribution?.[0]?.total14 || 1;

  // 優勝・準優勝を日付降順でソート
  const sortedWinners = data?.recentWinners
    ? [...data.recentWinners].sort((a, b) => b.rawDate.localeCompare(a.rawDate))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700/80 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">

        {/* ヘッダー */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-700/80 flex-shrink-0">
          <BarChart2 size={16} className="text-yellow-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-bold">大会統計 — 直近14日間</div>
            {data?.lastUpdated && (
              <div className="text-gray-500 text-[10px] mt-0.5 flex items-center gap-1">
                <RefreshCw size={9} />
                最終更新: {data.lastUpdated.replace('T', ' ').replace('+09:00', ' JST')}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-700/80 flex-shrink-0">
          <button
            onClick={() => setTab('distribution')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors
              ${tab === 'distribution'
                ? 'text-blue-400 border-b-2 border-blue-400 -mb-px bg-blue-500/5'
                : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            <BarChart2 size={12} />
            デッキ分布
          </button>
          <button
            onClick={() => setTab('winners')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors
              ${tab === 'winners'
                ? 'text-blue-400 border-b-2 border-blue-400 -mb-px bg-blue-500/5'
                : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            <Trophy size={12} />
            優勝一覧
            {data && (
              <span className="bg-gray-700 text-gray-300 text-[9px] px-1.5 py-0.5 rounded-full">
                {sortedWinners.length}
              </span>
            )}
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-red-400 text-sm mb-1">データの読み込みに失敗しました</div>
              <div className="text-gray-600 text-xs">{error}</div>
              <div className="text-gray-600 text-xs mt-2">
                scripts/fetch_tournament_data.py を実行してください
              </div>
            </div>
          )}

          {/* デッキ分布タブ */}
          {!loading && !error && tab === 'distribution' && (
            <div>
              <div className="flex items-center gap-3 mb-2 py-1 border-b border-gray-800">
                <span className="text-gray-600 text-[10px] w-4" />
                <span className="text-gray-600 text-[10px] flex-1">リーダー</span>
                <span className="text-gray-600 text-[10px] w-28 text-center">入賞割合</span>
                <div className="text-gray-600 text-[10px] w-16 text-right flex gap-1.5 justify-end">
                  <span className="text-yellow-600">優勝</span>
                  <span>準優勝</span>
                </div>
              </div>
              {data.distribution.length === 0 ? (
                <div className="text-center text-gray-600 text-sm py-8">データなし</div>
              ) : (
                data.distribution.map((item, i) => (
                  <DistributionRow key={item.leaderName} item={item} maxTotal={maxTotal} index={i} />
                ))
              )}
            </div>
          )}

          {/* 優勝一覧タブ */}
          {!loading && !error && tab === 'winners' && (
            <div>
              <div className="flex items-center gap-2 mb-2 py-1 border-b border-gray-800">
                <span className="text-gray-600 text-[10px] w-16">日付</span>
                <span className="text-gray-600 text-[10px] w-8">結果</span>
                <span className="text-gray-600 text-[10px] flex-1">リーダー</span>
                <span className="text-gray-600 text-[10px] hidden sm:block">イベント</span>
                <span className="text-gray-600 text-[10px] w-4" />
              </div>
              {sortedWinners.length === 0 ? (
                <div className="text-center text-gray-600 text-sm py-8">データなし</div>
              ) : (
                sortedWinners.map(deck => (
                  <WinnerRow key={deck.id} deck={deck} />
                ))
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        {data && (
          <div className="px-4 py-2 border-t border-gray-800 flex-shrink-0">
            <p className="text-gray-600 text-[10px]">
              出典: cardrush.media 大会結果データ（優勝・準優勝のみ集計）
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
