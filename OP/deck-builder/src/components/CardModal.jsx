import { useEffect } from 'react';
import { X, Plus, Minus, Crown, Zap, Shield } from 'lucide-react';
import CardImage from './CardImage';
import ColorBadge from './ColorBadge';
import { hasTrigger } from '../utils/deckRules';

const TYPE_LABEL = {
  LEADER: 'リーダー',
  CHARACTER: 'キャラ',
  EVENT: 'イベント',
  STAGE: 'ステージ',
};

/** 効果テキスト内の【キーワード】をハイライト */
function EffectText({ text }) {
  if (!text) return <span className="text-gray-600 italic text-xs">効果なし</span>;

  const parts = text.split(/(【[^】]+】)/g);
  return (
    <p className="text-xs leading-relaxed text-gray-300 whitespace-pre-wrap">
      {parts.map((part, i) =>
        /^【[^】]+】$/.test(part)
          ? <span key={i} className="text-yellow-300 font-bold">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </p>
  );
}

export default function CardModal({
  card,
  count,
  isSelectedLeader,
  onAdd,
  onRemove,
  onSelectLeader,
  onClose,
}) {
  if (!card) return null;

  const isLeader  = card.card_type === 'LEADER';
  const trigger   = hasTrigger(card);
  const hasCounter = card.counter || (card.card_type === 'EVENT' && card.effect?.includes('【カウンター】'));
  const canAdd    = count < 4;
  const canRemove = count > 0;

  // Escape キーで閉じる
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  // 背景スクロール防止
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    /* オーバーレイ */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* モーダル本体 */}
      <div
        className="relative bg-gray-900 border border-gray-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-400 hover:text-white transition-colors"
        >
          <X size={15} />
        </button>

        {/* モバイルは縦積み / sm以上は横並び */}
        <div className="flex flex-col sm:flex-row max-h-[90dvh] sm:max-h-[85vh] overflow-hidden">

          {/* ── カード画像エリア ── */}
          <div className="flex-shrink-0 sm:w-48 bg-gradient-to-b from-gray-950/80 to-gray-900 flex items-center justify-center px-8 pt-5 pb-3 sm:py-5 sm:px-4">
            <CardImage
              card={card}
              className="w-full max-w-[160px] sm:max-w-none rounded-xl shadow-xl ring-1 ring-white/10"
            />
          </div>

          {/* ── カード情報エリア ── */}
          <div className="flex flex-col flex-1 overflow-hidden px-4 pb-4 sm:py-4 sm:pl-3 sm:pr-4 gap-2.5">

            {/* カード名 */}
            <div className="pr-8 sm:pr-6">
              <h2 className="text-white font-bold text-base leading-snug">{card.name}</h2>
              <div className="text-gray-600 text-[10px] mt-0.5">{card.card_number}</div>
            </div>

            {/* バッジ行 */}
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/80 text-gray-300 font-medium">
                {TYPE_LABEL[card.card_type] || card.card_type}
              </span>
              {(card.colors || []).map(c => <ColorBadge key={c} color={c} small />)}
              {card.cost != null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 font-bold border border-blue-700/50">
                  コスト {card.cost}
                </span>
              )}
              {card.life != null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/50 text-red-300 font-bold border border-red-700/50">
                  ライフ {card.life}
                </span>
              )}
              {card.power != null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/80 text-gray-300">
                  {card.power.toLocaleString()}
                </span>
              )}
              {hasCounter && card.counter && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-900/50 text-orange-300 font-bold border border-orange-700/50 flex items-center gap-0.5">
                  <Shield size={9} /> +{card.counter / 1000}000
                </span>
              )}
              {trigger && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-300 font-bold border border-yellow-700/50 flex items-center gap-0.5">
                  <Zap size={9} /> TRG
                </span>
              )}
            </div>

            {/* 特徴（種族） */}
            {(card.traits || []).length > 0 && (
              <div className="text-[11px] text-gray-500">
                特徴: <span className="text-gray-400">{card.traits.join(' / ')}</span>
              </div>
            )}

            {/* 効果テキスト */}
            <div className="flex-1 bg-gray-800/50 rounded-xl p-3 overflow-y-auto min-h-[60px] max-h-28 sm:max-h-36 border border-gray-700/40">
              <EffectText text={card.effect} />
            </div>

            {/* トリガーテキスト */}
            {card.trigger && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3">
                <div className="text-[10px] font-bold text-yellow-300 mb-1 flex items-center gap-1">
                  <Zap size={10} /> トリガー
                </div>
                <EffectText text={card.trigger} />
              </div>
            )}

            {/* ── アクションボタン ── */}
            {isLeader ? (
              /* リーダー設定ボタン */
              <button
                onClick={() => { onSelectLeader(card); onClose(); }}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97]
                  ${isSelectedLeader
                    ? 'bg-yellow-600/80 text-yellow-100 border border-yellow-500'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
              >
                <Crown size={15} />
                {isSelectedLeader ? '✓ リーダー設定済み' : 'リーダーに設定'}
              </button>
            ) : (
              /* 枚数コントロール */
              <div className="flex items-center gap-2">
                {/* マイナスボタン */}
                <button
                  onClick={() => onRemove(card.card_number)}
                  disabled={!canRemove}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-500 disabled:opacity-25 disabled:cursor-not-allowed text-white transition-all active:scale-95"
                >
                  <Minus size={20} />
                </button>

                {/* 枚数表示 */}
                <div className="flex-1 flex flex-col items-center">
                  <span className={`text-3xl font-black leading-none transition-colors
                    ${count >= 4 ? 'text-yellow-400' : count > 0 ? 'text-white' : 'text-gray-700'}`}>
                    {count}
                  </span>
                  <span className="text-[10px] text-gray-600 mt-0.5">/ 4 枚</span>
                </div>

                {/* プラスボタン */}
                <button
                  onClick={() => onAdd(card)}
                  disabled={!canAdd}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-400 disabled:opacity-25 disabled:cursor-not-allowed text-white transition-all active:scale-95"
                >
                  <Plus size={20} />
                </button>
              </div>
            )}

            {/* 4枚上限メッセージ */}
            {!isLeader && count >= 4 && (
              <p className="text-center text-[11px] text-yellow-500/80">上限（4枚）に達しています</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
