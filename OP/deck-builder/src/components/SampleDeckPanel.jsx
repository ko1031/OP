import { useState, useEffect } from 'react';
import { X, Copy, ChevronDown, ChevronUp, Trophy, RefreshCw, ExternalLink } from 'lucide-react';
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
  return (sampleDeck.deck || [])
    .map(({ cardNumber, count }) => {
      const card = cardMap[cardNumber];
      return card ? { card, count } : null;
    })
    .filter(Boolean);
}

// 動的デッキ（cardrush/limitless）を SampleDeckCard が期待する形式に正規化
function normalizeDynamicDeck(d, cardMap) {
  const leaderCard = cardMap[d.leaderCard];
  const name = leaderCard
    ? leaderCard.name
    : (d.leaderName || d.leaderCard || '?');
  const colors = leaderCard?.colors || [];

  // eventType 推定（cardrush はイベント名から、limitless は CS 扱い）
  const evtName  = d.eventName || '';
  const evtLower = evtName.toLowerCase();
  let eventType = 'cs';
  if (evtLower.includes('flagship') || evtName.includes('フラッグシップ')) {
    eventType = 'flagship';
  }

  return {
    id:          d.id,
    leaderCard:  d.leaderCard,
    leaderName:  name,
    name,
    colors,
    eventType,
    event:       evtName || 'Tournament',
    date:        d.date,
    rawDate:     d.rawDate || '',
    description: '',
    deck:        d.deck || [],
    source:      d.source,
    sourceUrl:   d.sourceUrl || '',
    dynamic:     true,
  };
}

// 日付文字列 → Date（"2026/4/2" or "2026-04-02"）
function parseDate(str) {
  if (!str) return new Date(0);
  const normalized = str.replace(/\//g, '-');
  const [y, m, d] = normalized.split('-').map(Number);
  return new Date(y, m - 1, d);
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

  // ソースバッジ（国内 / 海外）
  const sourceBadge =
    sample.source === 'cardrush'  ? { label: '🇯🇵 国内', cls: 'text-rose-300 bg-rose-900/30 border border-rose-700/40' } :
    sample.source === 'limitless' ? { label: '🌏 海外', cls: 'text-teal-300 bg-teal-900/30 border border-teal-700/40' } :
    null;

  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700/60 overflow-hidden">
      {/* ヘッダー */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* リーダー画像 */}
          {leader && (
            <CardImage
              card={leader}
              className="w-20 h-28 object-cover rounded-xl flex-shrink-0 border border-gray-600/50 shadow-lg"
            />
          )}
          <div className="flex-1 min-w-0">
            {/* バッジ行 */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${eventBadge.cls}`}>
                {eventBadge.label}
              </span>
              {sourceBadge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${sourceBadge.cls}`}>
                  {sourceBadge.label}
                </span>
              )}
              <div className="flex gap-1">
                {(sample.colors || []).map(c => <ColorDot key={c} color={c} />)}
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
            {sample.description && (
              <div className="text-xs text-gray-400 mt-2 leading-relaxed line-clamp-2">
                {sample.description}
              </div>
            )}
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
          {sample.sourceUrl && (
            <a
              href={sample.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-3 py-2 rounded-lg bg-gray-700/40 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
              title="元サイトを開く"
            >
              <ExternalLink size={13} />
            </a>
          )}
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

// ──────────────────────────────────────────────
// メインパネル
// ──────────────────────────────────────────────
export default function SampleDeckPanel({ allCards, onCopy, onClose }) {
  const cardMap = buildCardMap(allCards);

  const [dynamicDecks, setDynamicDecks] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // tournament_stats.json から動的デッキを取得
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/tournament_stats.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        const raw = Array.isArray(data.sampleDecks) ? data.sampleDecks : [];
        const normalized = raw
          .filter(d => d.leaderCard && Array.isArray(d.deck) && d.deck.length > 0)
          .map(d => normalizeDynamicDeck(d, cardMap));
        setDynamicDecks(normalized);
        setLastUpdated(data.lastUpdated || '');
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('SampleDeckPanel: tournament_stats.json 取得失敗', err);
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 静的デッキを正規化（既存フォーマットは既に適合済みだが source を付加）
  const staticDecks = SAMPLE_DECKS.map(d => ({
    ...d,
    rawDate: d.date ? d.date.replace(/\//g, '-') : '',
    source:  d.source || 'static',
  }));

  // 動的デッキ ＋ 静的デッキをマージ（日付降順）
  // 動的側に同じリーダーカード・同日付があれば静的を省く（重複防止）
  const dynamicKeys = new Set(
    dynamicDecks.map(d => `${d.leaderCard}_${d.rawDate}`)
  );
  const filteredStatic = staticDecks.filter(
    d => !dynamicKeys.has(`${d.leaderCard}_${d.rawDate}`)
  );

  const allDecks = [...dynamicDecks, ...filteredStatic].sort(
    (a, b) => parseDate(b.date || b.rawDate) - parseDate(a.date || a.rawDate)
  );

  // 更新日時の表示ラベル
  const updatedLabel = lastUpdated
    ? `最終更新: ${lastUpdated.slice(0, 10)}`
    : (error ? 'データ取得エラー（静的データ表示中）' : '');

  const sourceNote = dynamicDecks.length > 0
    ? `国内: cardrush.media ／ 海外: Limitless 大会上位デッキ`
    : 'フラッグシップバトル・非公認大会 2026年3〜4月';

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* パネル本体 */}
      <div className="relative flex flex-col w-full max-w-3xl bg-gray-900 shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-700/80 bg-gray-900/90">
          <div>
            <div className="text-white font-bold text-base flex items-center gap-2">
              <Trophy size={17} className="text-yellow-400" />
              優勝サンプルデッキ
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {sourceNote}｜新しい順
            </div>
            {updatedLabel && (
              <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                <RefreshCw size={10} />
                {updatedLabel}
              </div>
            )}
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
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <RefreshCw size={18} className="animate-spin mr-2" />
              データを読み込み中...
            </div>
          ) : allDecks.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              デッキデータが見つかりません
            </div>
          ) : (
            allDecks.map(s => (
              <SampleDeckCard key={s.id} sample={s} cardMap={cardMap} onCopy={onCopy} />
            ))
          )}

          {!loading && (
            <div className="text-xs text-gray-600 pb-2 text-center space-y-0.5">
              {dynamicDecks.length > 0 && (
                <div>出典: cardrush.media（国内）・onepiece.limitlesstcg.com（海外）</div>
              )}
              <div>静的データ: フラッグシップバトル・非公認大会 2026年3〜4月</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
