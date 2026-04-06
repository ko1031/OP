import { useState, useEffect } from 'react';
import { Home, RotateCcw, Shuffle, Anchor, Skull, Swords, X, Zap } from 'lucide-react';
import { useGameState, loadSavedDecks, resolveSampleDeck, LEADER_EFFECTS } from '../hooks/useGameState';
import { SAMPLE_DECKS } from '../utils/deckRules';
import CardImage from '../components/CardImage';
import PirateMapBg from '../components/PirateMapBg';

// ─── カードサイズ定数 ─────────────────────────────
const CARD      = { W: 96,  H: 134 };   // フィールド・リーダー
const HAND_CARD = { W: 76,  H: 107 };   // 手札
const DECK_CARD = { W: 72,  H: 101 };   // デッキ/ステージ表示
const TRASH_CARD= { W: 80,  H: 112 };   // トラッシュ表示
const DON_CARD  = { W: 28,  H: 39  };   // DON!!カード
const DON_MINI  = { W: 17,  H: 24  };   // DON!!アタッチミニカード

// ─── フェイズ ──────────────────────────────────────
const PHASES = [
  { id: 'refresh', label: 'リフレッシュ', icon: '🔄' },
  { id: 'draw',    label: 'ドロー',       icon: '📚' },
  { id: 'don',     label: 'DON!!',        icon: '💛' },
  { id: 'main',    label: 'メイン',       icon: '⚔'  },
  { id: 'end',     label: 'エンド',       icon: '⏹'  },
];

const P = {
  bg:      'bg-[#06091a]',
  panel:   'bg-white/10 border border-white/15',
  label:   'text-[10px] text-amber-300/90 font-bold uppercase tracking-widest',
  btnGold: 'bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-amber-100 font-bold border border-amber-500/60 shadow-amber-900/40 shadow-md transition-all',
  btnRed:  'bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-red-100 font-bold border border-red-600/50 transition-all',
  btnBlue: 'bg-gradient-to-b from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-blue-100 font-bold border border-blue-600/50 transition-all',
  btnGray: 'bg-[#1a2040] hover:bg-[#232d55] text-amber-200/60 border border-amber-800/30 transition-all',
};

// ─── カード詳細モーダル ──────────────────────────
function CardDetailModal({ card, onClose }) {
  if (!card) return null;
  const typeColor = { LEADER:'text-yellow-400', CHARACTER:'text-green-400', EVENT:'text-blue-400', STAGE:'text-purple-400' };
  const typeLabel = { LEADER:'リーダー', CHARACTER:'キャラクター', EVENT:'イベント', STAGE:'ステージ' };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0a0f24] border border-amber-700/40 rounded-2xl shadow-2xl max-w-[540px] w-full max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-amber-900/30">
          <div>
            <div className={`text-xs font-bold ${typeColor[card.card_type] || 'text-gray-400'}`}>{typeLabel[card.card_type]}</div>
            <div className="text-amber-100 font-black text-lg leading-tight">{card.name}</div>
            <div className="text-amber-700/60 text-xs mt-0.5">{card.card_number}{card.colors?.length > 0 && ` • ${card.colors.join('/')}`}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-amber-900/30 flex items-center justify-center text-amber-500 hover:bg-amber-800/40 transition-all flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-4 p-4">
          <div className="flex-shrink-0">
            <CardImage card={card} className="w-48 h-[272px] object-cover rounded-xl border border-amber-900/40 shadow-xl" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {card.cost != null && <Stat label="コスト" value={card.cost} />}
              {card.power != null && <Stat label="パワー" value={card.power?.toLocaleString()} />}
              {card.counter != null && <Stat label="カウンター" value={card.counter?.toLocaleString()} />}
              {card.life != null && <Stat label="ライフ" value={card.life} red />}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {card.attribute && <Tag>{card.attribute}</Tag>}
              {card.traits?.map(t => <Tag key={t}>《{t}》</Tag>)}
            </div>
            {card.effect && (
              <div className="bg-[#080c20]/80 rounded-xl p-3 border border-amber-900/20">
                <div className="text-[9px] text-amber-600/60 uppercase tracking-wider mb-1.5">効果</div>
                <div className="text-amber-100/90 text-xs leading-relaxed whitespace-pre-line">{card.effect}</div>
              </div>
            )}
            {card.trigger && (
              <div className="bg-[#0f1520]/80 rounded-xl p-3 border border-blue-900/20">
                <div className="text-[9px] text-blue-500/60 uppercase tracking-wider mb-1.5">トリガー</div>
                <div className="text-blue-200/80 text-xs leading-relaxed whitespace-pre-line">{card.trigger}</div>
              </div>
            )}
            <div className="text-[9px] text-amber-900/40">{card.pack_info}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value, red }) {
  return (
    <div className="bg-[#131d45]/60 rounded-lg p-2 border border-amber-900/20">
      <div className="text-[9px] text-amber-600/50 uppercase tracking-wider">{label}</div>
      <div className={`font-black text-xl ${red ? 'text-red-400' : 'text-amber-300'}`}>{value}</div>
    </div>
  );
}
function Tag({ children }) {
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-800/40">{children}</span>;
}

// ─── ヘッダー用 stat チップ ──────────────────────
function StatChip({ icon, value, label, color, clickable }) {
  return (
    <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border
      ${clickable ? 'cursor-pointer hover:bg-amber-900/25 hover:border-amber-700/50' : ''}
      bg-[#0d1530]/60 border-amber-900/30`}
      title={label}>
      <span>{icon}</span>
      <b className={color === 'red' ? 'text-red-400' : 'text-amber-300/80'}>{value}</b>
    </div>
  );
}

// ─── ゲームカード（フィールド用）──────────────────
// badge = donAttached 枚数、背面にDON!!ミニカードを重ねて表示
function GameCard({ card, tapped, faceDown, onClick, onDoubleClick, badge, highlight }) {
  const donCount = badge || 0;
  const showDon  = donCount > 0 && !tapped; // タップ時は非表示（回転で混乱を避ける）
  const visibleDon = Math.min(donCount, 4);

  return (
    // 外側ラッパー: overflow-visible でDON!!ミニカードをはみ出させる
    <div className="relative flex-shrink-0" style={{ width: CARD.W, height: CARD.H }}>

      {/* ── DON!!アタッチ表示（背面右側に扇状に配置） ── */}
      {showDon && Array.from({ length: visibleDon }).map((_, i) => (
        <div key={i}
          className="absolute rounded overflow-hidden pointer-events-none"
          style={{
            width:  DON_MINI.W,
            height: DON_MINI.H,
            right:  -8 - i * 9,
            bottom: 10 + i * 7,
            zIndex: i + 1,
            transform: `rotate(${12 + i * 6}deg)`,
            background: 'linear-gradient(160deg, #fef08a 0%, #fbbf24 50%, #d97706 100%)',
            border: '1.5px solid rgba(253,224,71,0.8)',
            boxShadow: '1px 2px 5px rgba(0,0,0,0.6)',
          }}>
          <div className="w-full h-full flex flex-col items-center justify-center">
            <span className="text-amber-900 font-black leading-none" style={{ fontSize: 5 }}>DON</span>
            <span className="text-amber-900 font-black leading-none" style={{ fontSize: 7 }}>!!</span>
          </div>
        </div>
      ))}
      {/* 4枚超えは枚数バッジ */}
      {showDon && donCount > 4 && (
        <div className="absolute pointer-events-none rounded px-1 font-black text-[8px] leading-tight"
          style={{
            right: -6, bottom: 6, zIndex: 6,
            background: '#fbbf24', color: '#1c1a00',
            border: '1px solid #fde68a', boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}>
          +{donCount}
        </div>
      )}
      {/* タップ時の枚数バッジ（回転中でも見えるよう） */}
      {tapped && donCount > 0 && (
        <div className="absolute pointer-events-none rounded-full font-black flex items-center justify-center"
          style={{
            top: 2, right: 2, width: 18, height: 18, zIndex: 20, fontSize: 9,
            background: '#fbbf24', color: '#1c1a00', border: '1px solid #fde68a',
          }}>
          {donCount}
        </div>
      )}

      {/* ── メインカード（DON!!の手前） ── */}
      <div
        className={`absolute inset-0 cursor-pointer select-none rounded-xl overflow-hidden border-2 transition-all duration-150
          ${tapped ? 'rotate-90 origin-center opacity-75' : ''}
          ${highlight ? 'border-amber-400 shadow-amber-400/60 shadow-lg scale-105' : 'border-white/25'}
          hover:border-amber-400/70 hover:scale-[1.03]`}
        style={{ zIndex: 10 }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        title={`${faceDown ? '（裏向き）' : (card?.name || '')} | ダブルクリックで効果確認`}
      >
        {faceDown ? (
          <div style={{ width: CARD.W, height: CARD.H }}
            className="bg-gradient-to-br from-red-900/60 to-[#06091a] flex items-center justify-center">
            <span className="text-red-600/70 text-4xl">☠</span>
          </div>
        ) : (
          <CardImage card={card} className="w-full h-full object-cover" />
        )}
      </div>
    </div>
  );
}

// ─── 空スロット ──────────────────────────────────
function EmptySlot() {
  return (
    <div style={{ width: CARD.W, height: CARD.H }}
      className="rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center flex-shrink-0 flex-shrink-0">
      <Anchor size={18} className="text-white/20" />
    </div>
  );
}

// ─── DON!!カード ─────────────────────────────────
function DonCard({ active, onClick }) {
  return (
    <div
      onClick={active ? onClick : undefined}
      className={`flex-shrink-0 rounded-md overflow-hidden select-none transition-all duration-150
        ${active
          ? 'cursor-pointer hover:scale-105 hover:brightness-110'
          : 'opacity-50 cursor-default'
        }`}
      style={{
        width:  DON_CARD.W,
        height: DON_CARD.H,
        background: active
          ? 'linear-gradient(160deg, #fef08a 0%, #fbbf24 45%, #d97706 100%)'
          : 'linear-gradient(160deg, #292106 0%, #1a1300 100%)',
        border: active
          ? '2px solid rgba(253, 224, 71, 0.85)'
          : '2px solid rgba(92, 68, 10, 0.5)',
        boxShadow: active
          ? '0 2px 8px rgba(245,158,11,0.55), inset 0 1px 0 rgba(255,255,255,0.2)'
          : 'none',
      }}
      title={active ? 'DON!!（クリックでレスト）' : 'DON!!（レスト済み）'}
    >
      <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
        <span className={`font-black leading-none tracking-tight select-none ${active ? 'text-amber-900' : 'text-amber-800/50'}`}
          style={{ fontSize: 9 }}>DON</span>
        <span className={`font-black leading-none select-none ${active ? 'text-amber-900' : 'text-amber-800/50'}`}
          style={{ fontSize: 13 }}>!!</span>
        {active && (
          <span className="text-amber-700/70 leading-none select-none" style={{ fontSize: 7 }}>◆</span>
        )}
      </div>
    </div>
  );
}

// ─── 手札カード ──────────────────────────────────
function HandCard({ card, selected, onClick, onDoubleClick }) {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`relative flex-shrink-0 cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-150 hover:scale-110 hover:-translate-y-2
        ${selected ? 'border-amber-400 -translate-y-3 shadow-amber-400/60 shadow-xl' : 'border-amber-900/40 hover:border-amber-600/70'}`}
      style={{ width: HAND_CARD.W, height: HAND_CARD.H }}
      title={`${card?.name} | ダブルクリックで効果確認`}
    >
      <CardImage card={card} className="w-full h-full object-cover" />
      {selected && <div className="absolute inset-0 bg-amber-400/10 pointer-events-none" />}
      {/* コスト */}
      {card?.cost != null && (
        <div className="absolute top-1 left-1 bg-amber-500 text-gray-900 text-[11px] font-black rounded-full w-6 h-6 flex items-center justify-center shadow-md">
          {card.cost}
        </div>
      )}
      {/* カウンター値 */}
      {card?.counter != null && (
        <div className="absolute top-1 right-1 bg-blue-600/90 text-white text-[9px] font-black rounded px-1 shadow">
          +{(card.counter/1000).toFixed(0)}k
        </div>
      )}
      {/* トリガーマーク */}
      {(card?.trigger || card?.effect?.includes('[トリガー]')) && (
        <div className="absolute bottom-1 right-1 text-[8px] bg-yellow-500/90 text-gray-900 font-black rounded px-1">⚡TRG</div>
      )}
    </div>
  );
}

// ─── アクションメニュー ─────────────────────────
function ActionMenu({ card, context, onAction, onClose }) {
  if (!card) return null;
  const actions = [];
  if (context === 'hand') {
    if (card.card_type === 'CHARACTER') actions.push({ id:'play',   label:`⚔ フィールドに出す（コスト${card.cost||0}）` });
    if (card.card_type === 'STAGE')     actions.push({ id:'stage',  label:`🏝 ステージにセット（コスト${card.cost||0}）` });
    if (card.card_type === 'EVENT')     actions.push({ id:'event',  label:`📜 イベント使用（コスト${card.cost||0}）` });
    actions.push({ id:'deck-top',    label:'⬆ デッキトップに戻す' });
    actions.push({ id:'deck-bottom', label:'⬇ デッキボトムに戻す' });
    actions.push({ id:'detail',      label:'🔍 効果を確認' });
    actions.push({ id:'trash-hand',  label:'🗑 トラッシュ' });
  }
  if (context === 'field') {
    actions.push({ id:'tap',          label: card.tapped ? '↩ アンタップ' : '⚔ タップ（アタック）' });
    actions.push({ id:'attach-don',   label:'💛 DON!!アタッチ +1' });
    if ((card.donAttached||0) > 0)
      actions.push({ id:'detach-don', label:`💛 DON!!を外す（現在+${card.donAttached}）` });
    actions.push({ id:'deck-top',     label:'⬆ デッキトップに戻す' });
    actions.push({ id:'deck-bottom',  label:'⬇ デッキボトムに戻す' });
    actions.push({ id:'detail',       label:'🔍 効果を確認' });
    actions.push({ id:'trash-field',  label:'💀 KO → トラッシュ' });
  }
  if (context === 'leader') {
    actions.push({ id:'tap-leader',         label: card.tapped ? '↩ アンタップ' : '⚔ タップ（アタック）' });
    actions.push({ id:'attach-don-leader',  label:'💛 DON!!アタッチ +1' });
    if ((card.donAttached||0) > 0)
      actions.push({ id:'detach-don-leader', label:`💛 DON!!を外す（現在+${card.donAttached}）` });
    actions.push({ id:'detail', label:'🔍 効果を確認' });
  }
  if (context === 'stage') {
    actions.push({ id:'detail',        label:'🔍 効果を確認' });
    actions.push({ id:'trash-stage',   label:'🗑 トラッシュに置く' });
    actions.push({ id:'deck-top',      label:'⬆ デッキトップに戻す' });
    actions.push({ id:'deck-bottom',   label:'⬇ デッキボトムに戻す' });
  }
  if (context === 'trash') {
    actions.push({ id:'detail',            label:'🔍 効果を確認' });
    actions.push({ id:'trash-to-deck-top', label:'⬆ デッキトップに戻す' });
    actions.push({ id:'trash-to-hand',     label:'✋ 手札に加える' });
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d1530] border border-amber-700/40 rounded-2xl shadow-2xl p-2 min-w-[260px]"
        onClick={e => e.stopPropagation()}>
        <div className="px-3 py-2 border-b border-amber-900/30 mb-1">
          <div className="text-amber-400 text-xs font-bold truncate">{card.name}</div>
          <div className="text-amber-600/60 text-[10px]">
            {card.card_type}{card.cost != null ? ` • コスト${card.cost}` : ''}
            {card.power != null ? ` • ${card.power?.toLocaleString()}` : ''}
          </div>
        </div>
        {actions.map(a => (
          <button key={a.id} onClick={() => { onAction(a.id); onClose(); }}
            className="w-full text-left px-3 py-2 text-sm text-amber-100/90 hover:bg-amber-900/30 rounded-lg transition-colors">
            {a.label}
          </button>
        ))}
        <button onClick={onClose} className="w-full text-left px-3 py-1.5 text-xs text-amber-800/60 hover:text-amber-500 transition-colors mt-1">
          ✕ キャンセル
        </button>
      </div>
    </div>
  );
}

// ─── フェイズバー ────────────────────────────────
function PhaseBar({ subPhase, onAdvance }) {
  const activeIdx = PHASES.findIndex(p => p.id === subPhase);
  return (
    <div className="flex items-center gap-2">
      {/* デスクトップ: 全フェーズ表示 */}
      <div className="hidden lg:flex items-center gap-0.5">
        {PHASES.map((p, i) => (
          <div key={p.id} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all
              ${i === activeIdx
                ? 'bg-amber-600/35 text-amber-200 border border-amber-500/60 shadow-sm shadow-amber-900/30'
                : i < activeIdx
                  ? 'text-amber-900/35 line-through'
                  : 'text-amber-800/50'}`}>
              <span>{p.icon}</span>
              <span className="hidden xl:inline">{p.label}</span>
            </div>
            {i < PHASES.length - 1 && <span className="text-amber-900/25 text-[9px] mx-0.5">›</span>}
          </div>
        ))}
      </div>
      {/* モバイル: 現在フェーズのみ */}
      <div className="lg:hidden flex items-center gap-1 bg-amber-900/25 border border-amber-700/35 rounded-lg px-2.5 py-1">
        <span className="text-sm">{PHASES[activeIdx]?.icon}</span>
        <span className="text-amber-200 text-xs font-bold">{PHASES[activeIdx]?.label}</span>
      </div>
      {/* 次へボタン */}
      <button onClick={onAdvance}
        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-bold ${P.btnGold}`}>
        {subPhase === 'end' ? '次ターン ▶' : '次へ ▶'}
      </button>
    </div>
  );
}

// ─── ライフスタック ──────────────────────────────
function LifeStack({ life, onFlip }) {
  const offset = 12;
  const totalH = life.length > 0 ? CARD.H + (life.length - 1) * offset : CARD.H;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={P.label}>LIFE</div>
      <div className="relative cursor-pointer" style={{ height: totalH, width: CARD.W }}
        onClick={life.length > 0 ? onFlip : undefined} title="クリックでライフをめくる">
        {life.length === 0 ? (
          <div style={{ width: CARD.W, height: CARD.H }}
            className="rounded-xl border-2 border-dashed border-red-900/40 flex items-center justify-center">
            <Skull size={24} className="text-red-900/40" />
          </div>
        ) : (
          [...life].map((card, i) => {
            const visualPos = life.length - 1 - i;
            const isTop = i === 0;
            return (
              <div key={card._uid} className="absolute" style={{ top: visualPos * offset, left: 0, zIndex: i + 1 }}>
                <div style={{ width: CARD.W, height: CARD.H }}
                  className={`rounded-xl border-2 flex items-center justify-center
                    ${isTop
                      ? 'bg-gradient-to-br from-red-900 to-[#1a0505] border-red-700/80 shadow-lg shadow-red-900/50 hover:border-red-400'
                      : 'bg-gradient-to-br from-red-950 to-[#0d0505] border-red-900/40'}`}>
                  <span className="text-red-500/80 text-4xl select-none">☠</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="text-red-500 text-[11px] font-bold">{life.length}枚</div>
    </div>
  );
}

// ─── サーチモーダル ──────────────────────────────
function SearchModal({ revealed, onResolve, onCancel }) {
  // 各カードの行き先: 'hand' | 'top' | 'bottom' | null
  const [dest, setDest] = useState(() => Object.fromEntries(revealed.map(c => [c._uid, null])));
  // デッキトップ戻し順（ドラッグ不要にするためクリック順で確定）
  const [topOrder, setTopOrder] = useState([]); // _uid の配列（先頭=一番上）
  const [detailCard, setDetailCard] = useState(null);

  const allAssigned = revealed.every(c => dest[c._uid] !== null);

  const setCardDest = (uid, newDest) => {
    setDest(prev => ({ ...prev, [uid]: newDest }));
    if (newDest === 'top') {
      setTopOrder(prev => prev.includes(uid) ? prev : [uid, ...prev]); // 先に選んだものが下
    } else {
      setTopOrder(prev => prev.filter(id => id !== uid));
    }
  };

  const handleConfirm = () => {
    const toHand   = revealed.filter(c => dest[c._uid] === 'hand').map(c => c._uid);
    // topOrder は「先に選んだ = 下」なので toDeckTop[0] が一番上 = 後から追加したもの
    const toDeckTop    = topOrder; // useGameStateでreverse済みなのでそのまま
    const toDeckBottom = revealed.filter(c => dest[c._uid] === 'bottom').map(c => c._uid);
    onResolve({ toHand, toDeckTop, toDeckBottom });
  };

  const destLabel = { hand: '手札', top: '上', bottom: '下', null: '未定' };
  const destColor = {
    hand:   'bg-emerald-700/70 border-emerald-500/70 text-emerald-100',
    top:    'bg-blue-700/70 border-blue-500/70 text-blue-100',
    bottom: 'bg-purple-700/70 border-purple-500/70 text-purple-100',
    null:   'bg-amber-900/30 border-amber-700/40 text-amber-400/60',
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-amber-700/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-900/30">
          <div>
            <div className="text-amber-400 font-black text-base flex items-center gap-2">
              🔍 サーチ効果
            </div>
            <div className="text-amber-700/60 text-xs mt-0.5">
              各カードの行き先を選択してください
            </div>
          </div>
          <button onClick={onCancel}
            className="w-8 h-8 rounded-full bg-amber-900/30 flex items-center justify-center text-amber-500 hover:bg-amber-800/40 transition-all">
            <X size={15}/>
          </button>
        </div>

        {/* 凡例 */}
        <div className="flex items-center gap-3 px-5 py-2 bg-black/20 text-[10px] border-b border-amber-900/20">
          <span className="text-amber-600/70">行き先：</span>
          {[['hand','手札に加える','emerald'],['top','デッキトップへ','blue'],['bottom','デッキボトムへ','purple']].map(([k,l,c])=>(
            <span key={k} className={`px-2 py-0.5 rounded-full border font-bold ${destColor[k]}`}>{l}</span>
          ))}
          <span className="text-amber-600/50 ml-auto">
            デッキトップ戻し順：左が下、右が上（選んだ順に積み上げ）
          </span>
        </div>

        {/* カード一覧 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-4 justify-center">
            {revealed.map((card, idx) => {
              const d = dest[card._uid];
              const topPos = topOrder.indexOf(card._uid); // -1 or index
              return (
                <div key={card._uid} className="flex flex-col items-center gap-2">
                  {/* デッキトップ順インジケーター */}
                  <div className="h-5 flex items-center justify-center">
                    {d === 'top' && topPos >= 0 && (
                      <span className="text-[10px] text-blue-300 font-bold bg-blue-900/50 px-2 py-0.5 rounded-full border border-blue-700/50">
                        上から {topOrder.length - topPos} 番目
                      </span>
                    )}
                  </div>

                  {/* カード画像 */}
                  <div
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      d === 'hand'   ? 'border-emerald-500 shadow-emerald-500/40 shadow-lg scale-105' :
                      d === 'top'    ? 'border-blue-500 shadow-blue-500/40 shadow-lg' :
                      d === 'bottom' ? 'border-purple-500 shadow-purple-500/40 shadow-lg' :
                      'border-amber-700/30 hover:border-amber-500/50'
                    }`}
                    style={{ width: CARD.W, height: CARD.H }}
                    onClick={() => setDetailCard(card)}
                  >
                    <CardImage card={card} style={{ width: CARD.W, height: CARD.H }}/>
                    {/* 番号バッジ */}
                    <div className="absolute top-1 left-1 bg-black/70 text-amber-400 text-[9px] font-bold rounded px-1">
                      #{idx + 1}
                    </div>
                    {/* 行き先バッジ */}
                    {d && (
                      <div className={`absolute bottom-1 left-1 right-1 text-center text-[10px] font-black py-0.5 rounded border ${destColor[d]}`}>
                        {destLabel[d]}
                      </div>
                    )}
                  </div>

                  {/* 行き先ボタン */}
                  <div className="flex gap-1">
                    {[['hand','手札','emerald'],['top','上','blue'],['bottom','下','purple']].map(([k,l,c])=>(
                      <button key={k}
                        onClick={() => setCardDest(card._uid, d === k ? null : k)}
                        className={`text-[10px] px-2 py-1 rounded-lg border font-bold transition-all ${
                          d === k ? destColor[k] : 'bg-black/30 border-amber-900/30 text-amber-600/60 hover:border-amber-700/50'
                        }`}>
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* カード名（短縮） */}
                  <div className="text-[9px] text-amber-500/60 text-center max-w-[120px] truncate">{card.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* デッキトップ戻し順プレビュー */}
        {topOrder.length > 0 && (
          <div className="px-5 py-2 bg-blue-900/20 border-t border-blue-900/30">
            <div className="text-[10px] text-blue-400 font-bold mb-1.5">
              📚 デッキトップ戻し順（←下 ｜ 上→）
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[...topOrder].reverse().map((uid, i) => {
                const card = revealed.find(c => c._uid === uid);
                return card ? (
                  <div key={uid} className="flex items-center gap-1.5 flex-shrink-0">
                    {i > 0 && <span className="text-blue-700/60 text-xs">→</span>}
                    <div className="bg-blue-900/40 border border-blue-700/40 rounded-lg px-2 py-1 text-[10px] text-blue-200 flex items-center gap-1">
                      <span className="text-blue-500 font-bold">{i + 1}</span>
                      <span className="max-w-[80px] truncate">{card.name}</span>
                    </div>
                  </div>
                ) : null;
              })}
              <span className="text-blue-400/50 text-[10px] ml-1 flex-shrink-0">← 一番上</span>
            </div>
          </div>
        )}

        {/* フッターボタン */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-amber-900/30">
          <div className="text-[10px] text-amber-600/50 flex-1">
            {revealed.filter(c=>dest[c._uid]===null).length > 0
              ? `⚠ あと ${revealed.filter(c=>dest[c._uid]===null).length} 枚未選択`
              : '✓ 全て選択済み'}
          </div>
          <button onClick={onCancel}
            className="text-xs px-4 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 hover:bg-amber-900/20 transition-all">
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allAssigned}
            className={`text-xs px-5 py-2 rounded-xl font-black border transition-all ${
              allAssigned
                ? 'bg-gradient-to-b from-amber-600 to-amber-800 border-amber-500/60 text-amber-100 hover:from-amber-500 shadow-amber-900/40 shadow-md'
                : 'bg-black/20 border-amber-900/20 text-amber-900/30 cursor-not-allowed'
            }`}>
            ✓ 決定
          </button>
        </div>
      </div>

      {/* カード詳細（サーチモーダル内） */}
      {detailCard && <CardDetailModal card={detailCard} onClose={() => setDetailCard(null)}/>}
    </div>
  );
}

// ─── トラッシュビューワー ─────────────────────────
function TrashModal({ trash, onAction, onClose }) {
  const [sel, setSel] = useState(null);
  if (!trash.length) return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0a0f24] border border-amber-700/40 rounded-2xl p-8 text-amber-600/60 text-sm">トラッシュは空です</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-amber-700/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-900/30">
          <div className="text-amber-400 font-black text-base">🗑 トラッシュ ({trash.length}枚)</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-amber-900/30 flex items-center justify-center text-amber-500 hover:bg-amber-800/40"><X size={15}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-3 justify-start">
            {[...trash].reverse().map((card, i) => (
              <div key={card._uid} className="flex flex-col items-center gap-1 cursor-pointer"
                onClick={() => setSel(sel?._uid === card._uid ? null : card)}>
                <div className={`rounded-xl overflow-hidden border-2 transition-all ${sel?._uid===card._uid?'border-amber-500 scale-105':'border-amber-900/30 hover:border-amber-700/50'}`}
                  style={{ width: 80, height: 112 }}>
                  <CardImage card={card} style={{ width:80, height:112 }}/>
                </div>
                <div className="text-[8px] text-amber-700/50 text-center max-w-[80px] truncate">{card.name}</div>
              </div>
            ))}
          </div>
        </div>
        {sel && (
          <div className="border-t border-amber-900/30 px-5 py-3 flex items-center gap-3 bg-[#080c20]/60">
            <div className="text-amber-300 text-sm font-bold flex-1 truncate">{sel.name}</div>
            <button onClick={() => { onAction('trash-to-hand', sel._uid); setSel(null); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold ${P.btnGold}`}>✋ 手札へ</button>
            <button onClick={() => { onAction('trash-to-deck-top', sel._uid); setSel(null); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold ${P.btnBlue}`}>⬆ デッキトップへ</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── サーチ開始パネル ────────────────────────────
function SearchStartPanel({ deckCount, onBegin, onClose }) {
  const [n, setN] = useState(3);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0a0f24] border border-amber-700/50 rounded-2xl shadow-2xl p-6 w-80"
        onClick={e => e.stopPropagation()}>
        <div className="text-amber-400 font-black text-base mb-4 flex items-center gap-2">
          🔍 サーチ効果
        </div>
        <div className="text-amber-200/70 text-sm mb-4">何枚確認しますか？</div>

        {/* クイック選択 */}
        <div className="flex gap-2 mb-4">
          {[1,2,3,4,5].map(v => (
            <button key={v} onClick={() => setN(v)}
              className={`flex-1 py-2 rounded-xl text-sm font-black border transition-all ${
                n === v
                  ? 'bg-amber-600 border-amber-400 text-amber-100 shadow-amber-900/40 shadow-md'
                  : 'bg-black/30 border-amber-800/30 text-amber-500/70 hover:border-amber-600/50'
              }`}>
              {v}
            </button>
          ))}
        </div>

        {/* カスタム入力 */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-amber-600/70 text-xs">カスタム：</span>
          <input type="number" min={1} max={deckCount} value={n}
            onChange={e => setN(Math.max(1, Math.min(deckCount, Number(e.target.value))))}
            className="w-20 bg-black/40 border border-amber-800/40 rounded-lg px-2 py-1 text-amber-200 text-sm text-center"/>
          <span className="text-amber-700/50 text-xs">枚（デッキ残{deckCount}枚）</span>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm border border-amber-800/30 text-amber-600/60 hover:bg-amber-900/20 transition-all">
            キャンセル
          </button>
          <button
            onClick={() => { onBegin(n); onClose(); }}
            disabled={deckCount === 0}
            className="flex-1 py-2 rounded-xl text-sm font-black bg-gradient-to-b from-amber-600 to-amber-800 border border-amber-500/60 text-amber-100 hover:from-amber-500 shadow-md disabled:opacity-40">
            めくる
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── リーダー効果バッジ ─────────────────────────
function LeaderEffectBadge({ leaderEffect, leaderName, onUseAbility }) {
  const [open, setOpen] = useState(false);
  if (!leaderEffect?.note && !leaderEffect?.hasActiveAbility) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border border-amber-700/40 bg-black/60 text-amber-400 hover:bg-amber-800/40 transition-all backdrop-blur-sm">
        <Zap size={9} /> 効果
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 z-[50] bg-[#0a0f24] border border-amber-700/40 rounded-xl p-3 shadow-2xl w-72">
          <div className="text-amber-400 text-[10px] font-bold mb-2 flex items-center justify-between">
            <span>⚡ {leaderName}</span>
            <button onClick={() => setOpen(false)}><X size={12} className="text-amber-800/60 hover:text-amber-400" /></button>
          </div>
          {leaderEffect.note && (
            <div className="text-amber-200/80 text-[10px] leading-relaxed mb-2 bg-amber-900/20 rounded-lg p-2">{leaderEffect.note}</div>
          )}
          {leaderEffect.activeAbility && (
            <div className="text-amber-300/70 text-[10px] leading-relaxed mb-2 bg-[#131d45]/60 rounded-lg p-2">{leaderEffect.activeAbility}</div>
          )}
          {leaderEffect.hasActiveAbility && onUseAbility && (
            <button onClick={() => { onUseAbility(); setOpen(false); }}
              className={`w-full text-[10px] px-2 py-1.5 rounded-lg font-bold mt-1 ${P.btnGold}`}>
              ⚡ 起動メイン効果を発動
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── デッキ選択 ─────────────────────────────────
function DeckSelectScreen({ allCards, onSelect }) {
  const cardMap = {};
  allCards.forEach(c => { cardMap[c.card_number] = c; });
  const saved = Object.values(loadSavedDecks()).sort((a,b) => new Date(b.savedAt)-new Date(a.savedAt));
  const samples = [...SAMPLE_DECKS].sort((a,b)=>{
    const pd=s=>{const[y,m,d]=s.split('/').map(Number);return new Date(y,m-1,d);};
    return pd(b.date)-pd(a.date);
  });
  const hasEff = (n) => !!LEADER_EFFECTS[n];
  return (
    <div className={`min-h-screen ${P.bg} flex flex-col items-center p-6 overflow-y-auto`}>
      <div className="w-full max-w-2xl">
        <h2 className="text-amber-400 font-black text-2xl mb-1 flex items-center gap-2"><Anchor size={20}/>デッキを選択</h2>
        <p className="text-amber-700/60 text-sm mb-6">一人回しするデッキを選んでください</p>
        {saved.length > 0 && (
          <section className="mb-6">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">保存済みデッキ</div>
            <div className="space-y-2">
              {saved.map(d => (
                <button key={d.id} onClick={() => onSelect(d.leader, d.deck)}
                  className={`w-full flex items-center gap-3 p-3 ${P.panel} rounded-xl hover:border-amber-600/50 transition-all text-left`}>
                  <CardImage card={d.leader} className="w-10 h-14 object-cover rounded-lg flex-shrink-0 border border-amber-900/40"/>
                  <div className="flex-1 min-w-0">
                    <div className="text-amber-100 text-sm font-bold truncate">{d.name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-700/60 text-xs">{d.leader?.name} • {Object.values(d.deck).reduce((s,e)=>s+e.count,0)}枚</span>
                      {hasEff(d.leader?.card_number) && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-900/30 text-amber-500 border border-amber-800/30">⚡効果</span>}
                    </div>
                  </div>
                  <span className="text-amber-500 text-xs font-bold">出航 ⚓</span>
                </button>
              ))}
            </div>
          </section>
        )}
        <section>
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">優勝サンプルデッキ</div>
          <div className="space-y-2">
            {samples.map(s => {
              const r = resolveSampleDeck(s, cardMap);
              if (!r.leader) return null;
              return (
                <button key={s.id} onClick={() => onSelect(r.leader, r.entries)}
                  className={`w-full flex items-center gap-3 p-3 ${P.panel} rounded-xl hover:border-amber-600/50 transition-all text-left`}>
                  <CardImage card={r.leader} className="w-10 h-14 object-cover rounded-lg flex-shrink-0 border border-amber-900/40"/>
                  <div className="flex-1 min-w-0">
                    <div className="text-amber-100 text-sm font-bold truncate">{s.name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-700/60 text-xs">{s.date} • {s.event}</span>
                      {hasEff(r.leader?.card_number) && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-900/30 text-amber-500 border border-amber-800/30">⚡効果</span>}
                    </div>
                  </div>
                  <span className="text-amber-500 text-xs font-bold">出航 ⚓</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── 先行/後攻 ─────────────────────────────────
function PlayerOrderScreen({ onSelect, onBack }) {
  return (
    <div className={`min-h-screen ${P.bg} flex flex-col items-center justify-center p-6`}>
      <div className="w-full max-w-md text-center">
        <Skull size={40} className="text-amber-500/50 mx-auto mb-4"/>
        <h2 className="text-amber-400 font-black text-2xl mb-2">先行 / 後攻</h2>
        <p className="text-amber-700/60 text-sm mb-8">どちらで始めますか？</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => onSelect('first')}
            className="group flex-1 flex flex-col items-center gap-3 p-6 bg-[#0d1530]/80 border border-amber-700/30 rounded-2xl hover:border-amber-500/60 transition-all">
            <div className="w-14 h-14 rounded-full bg-amber-900/30 border border-amber-600/40 flex items-center justify-center">
              <Swords size={28} className="text-amber-400"/>
            </div>
            <div className="text-amber-300 font-black text-xl">先行</div>
            <div className="text-amber-700/60 text-xs">ターン1: ドロー無し・DON!! +1</div>
          </button>
          <button onClick={() => onSelect('second')}
            className="group flex-1 flex flex-col items-center gap-3 p-6 bg-[#0d1530]/80 border border-blue-700/30 rounded-2xl hover:border-blue-500/60 transition-all">
            <div className="w-14 h-14 rounded-full bg-blue-900/30 border border-blue-600/40 flex items-center justify-center">
              <Anchor size={28} className="text-blue-400"/>
            </div>
            <div className="text-blue-300 font-black text-xl">後攻</div>
            <div className="text-blue-700/70 text-xs">ターン1: ドロー有り・DON!! +2</div>
          </button>
        </div>
        <button onClick={onBack} className="mt-6 text-amber-800/60 hover:text-amber-500 text-xs transition-colors">← デッキ選択へ</button>
      </div>
    </div>
  );
}

// ─── マリガン ───────────────────────────────────
function MulliganScreen({ state, onMulligan, onStart, onBack }) {
  return (
    <div className={`min-h-screen ${P.bg} flex flex-col items-center justify-center gap-6 p-6`}>
      <div className="text-center">
        <div className="text-amber-500/70 text-sm mb-1">【{state.playerOrder==='first'?'先行':'後攻'}】</div>
        <h2 className="text-amber-300 font-black text-xl">マリガンしますか？</h2>
        <div className="text-amber-700/60 text-sm mt-1">マリガン {state.mulliganCount}回（何度でも可）</div>
        {state.leaderEffect?.note && (
          <div className="mt-2 text-[11px] px-3 py-1.5 rounded-full bg-amber-900/20 text-amber-500 border border-amber-800/30 inline-block">
            ⚡ {state.leaderEffect.note}
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {state.hand.map(card => (
          <div key={card._uid} className="rounded-xl overflow-hidden border border-amber-900/40 shadow-lg">
            <CardImage card={card} className="w-20 h-28 object-cover"/>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onMulligan} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl ${P.btnRed}`}>
          <Shuffle size={15}/> マリガン ({state.mulliganCount}回目)
        </button>
        <button onClick={onStart} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl ${P.btnGold}`}>
          <Anchor size={15}/> 出航！ゲーム開始
        </button>
      </div>
      <button onClick={onBack} className="text-amber-800/60 hover:text-amber-500 text-xs transition-colors">← デッキ選択へ</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// メインプレイマット
// ─────────────────────────────────────────────────────
export default function SoloPlayPage({ onNavigate }) {
  const [allCards, setAllCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [screen, setScreen] = useState('deck-select');
  const [pendingLeader, setPendingLeader] = useState(null);
  const [pendingEntries, setPendingEntries] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [detailCard, setDetailCard] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [showSearchStart, setShowSearchStart] = useState(false);
  const [showTrash, setShowTrash] = useState(false);      // トラッシュ一覧
  const [triggerToast, setTriggerToast] = useState(null); // トリガー発動通知
  const [prevHandLen, setPrevHandLen] = useState(0);      // ライフトリガー検出用

  const game = useGameState();
  const { state } = game;

  useEffect(() => {
    fetch('./cards.json')
      .then(r => r.json())
      .then(d => { setAllCards(d.cards || []); setLoadingCards(false); })
      .catch(() => setLoadingCards(false));
  }, []);

  // ─── キーボードショートカット ───
  useEffect(() => {
    if (!state) return;
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); game.advancePhase(); }
      if (e.code === 'KeyD' && !e.ctrlKey && !e.metaKey) game.drawCard(1);
      if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) game.shuffleDeck();
      if (e.code === 'Escape') { setSelectedCard(null); setDetailCard(null); setShowTrash(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, game]);

  // ─── ライフカードのトリガー検知 ───
  useEffect(() => {
    if (!state) return;
    const cur = state.hand.length;
    if (cur > prevHandLen) {
      // 増えた枚数分のカードをチェック（末尾から）
      const newCards = state.hand.slice(state.hand.length - (cur - prevHandLen));
      const triggered = newCards.find(c => c.trigger || c.effect?.includes('[トリガー]') || c.effect?.includes('Trigger'));
      if (triggered) {
        setTriggerToast(triggered);
        setTimeout(() => setTriggerToast(null), 4000);
      }
    }
    setPrevHandLen(cur);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.hand?.length]);

  const handleCardClick = (card, context, uid) => {
    if (selectedCard?.uid === uid) { setSelectedCard(null); return; }
    setSelectedCard({ card, context, uid });
  };
  const handleCardDoubleClick = (card) => { setDetailCard(card); setSelectedCard(null); };

  const handleAction = (actionId) => {
    if (!selectedCard) return;
    const { card, uid } = selectedCard;
    if (actionId === 'detail') { setDetailCard(card); return; }
    switch (actionId) {
      case 'play':               game.playToField(uid); break;
      case 'stage':              game.playStage(uid); break;
      case 'event':              game.trashHandCard(uid); break;
      case 'trash-hand':         game.trashHandCard(uid); break;
      case 'deck-top':
        if (selectedCard.context === 'hand')   game.returnHandToTop(uid);
        else if (selectedCard.context === 'stage') game.trashStage(); // ステージはトラッシュ経由
        else                                   game.returnFieldToTop(uid);
        break;
      case 'deck-bottom':
        if (selectedCard.context === 'hand')  game.returnHandToBottom(uid);
        else                                   game.returnFieldToBottom(uid);
        break;
      case 'tap':                game.toggleFieldCard(uid); break;
      case 'attach-don':         game.attachDonToField(uid); break;
      case 'detach-don':         game.detachDonFromField(uid); break;
      case 'trash-field':        game.trashFieldCard(uid); break;
      case 'tap-leader':         game.toggleLeader(); break;
      case 'attach-don-leader':  game.attachDonToLeader(); break;
      case 'detach-don-leader':  game.detachDonFromLeader(); break;
      case 'trash-stage':        game.trashStage(); break;
      case 'trash-to-deck-top':  game.returnTrashToDeckTop(uid); break;
      case 'trash-to-hand':      game.returnTrashToHand(uid); break;
    }
    setSelectedCard(null);
  };

  const handleLeaderAbility = () => {
    if (!state) return;
    const num = state.leader?.card_number;
    if (num === 'OP15-058') game.useEnelAbility(1, 4);
    else if (num === 'OP14-020') game.useMihawkAbility('leader');
  };

  if (loadingCards) {
    return (
      <div className={`h-screen ${P.bg} flex items-center justify-center`}>
        <Anchor size={32} className="text-amber-600 animate-pulse"/>
      </div>
    );
  }

  // ── デッキ選択 ──
  if (!state && screen === 'deck-select') {
    return (
      <div className={`h-screen ${P.bg} flex flex-col`}>
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-[#080c1e]/95 border-b border-amber-900/30">
          <button onClick={() => onNavigate('home')} className="text-amber-800/60 hover:text-amber-400 transition-colors"><Home size={18}/></button>
          <span className="text-amber-300 font-bold text-sm">一人回し — デッキ選択</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <DeckSelectScreen allCards={allCards} onSelect={(leader, entries) => {
            setPendingLeader(leader); setPendingEntries(entries); setScreen('order-select');
          }}/>
        </div>
      </div>
    );
  }

  // ── 先行/後攻 ──
  if (!state && screen === 'order-select') {
    return (
      <div className={`h-screen ${P.bg} flex flex-col`}>
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-[#080c1e]/95 border-b border-amber-900/30">
          <button onClick={() => setScreen('deck-select')} className="text-amber-800/60 hover:text-amber-400 transition-colors"><Home size={18}/></button>
          <span className="text-amber-300 font-bold text-sm">一人回し — 先行/後攻</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <PlayerOrderScreen
            onSelect={(order) => {
              const cm = {}; allCards.forEach(c => { cm[c.card_number] = c; });
              const entries = Array.isArray(pendingEntries)
                ? pendingEntries
                : Object.values(pendingEntries).map(e => ({ card: cm[e.card?.card_number||e.cardNumber]||e.card, count:e.count })).filter(e=>e.card);
              game.startGame(pendingLeader, entries, order);
            }}
            onBack={() => setScreen('deck-select')}
          />
        </div>
      </div>
    );
  }

  // ── マリガン ──
  if (state?.phase === 'mulligan') {
    return (
      <div className={`h-screen ${P.bg} flex flex-col`}>
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-[#080c1e]/95 border-b border-amber-900/30">
          <button onClick={game.resetGame} className="text-amber-800/60 hover:text-amber-400 transition-colors"><Home size={18}/></button>
          <span className="text-amber-300 font-bold text-sm">一人回し — マリガン</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <MulliganScreen state={state} onMulligan={game.mulligan} onStart={game.startMainGame} onBack={game.resetGame}/>
        </div>
      </div>
    );
  }

  if (!state) return null;
  const s = state;
  const donTotal = s.donActive + s.donTapped;

  // ─────────────────────────────────────────────────────
  // ゲーム画面（公式プレイシート準拠・フル画面レイアウト）
  //  左メガ列（行1〜3全高）:
  //    ├ ライフ（LEFT_COL_W）
  //    └ フェーズ(flex:6) + DON!!デッキ(flex:2) 縦積み
  //  右セクション（行1〜3）:
  //    行1[flex:3]: CHARACTER
  //    行2[flex:3]: LEADER | STAGE(flex) | DECK(DECK_TRASH_W)
  //    行3[flex:2]: COST(flex) | TRASH(DECK_TRASH_W)
  //  行4[flex:2]: HAND（フル幅）
  // ─────────────────────────────────────────────────────
  const LEFT_COL_W   = 120;   // ライフ列幅 ＝ フェーズ/DON!!デッキ列幅（各120px）
  const LEADER_PAN_W = 140;   // リーダーパネル幅
  const DECK_TRASH_W = 248;   // デッキ・トラッシュ（元の2倍幅）

  const activePhaseIdx = PHASES.findIndex(p => p.id === s.subPhase);

  return (
    <div className={`h-screen ${P.bg} flex flex-col overflow-hidden select-none relative`}>

      {/* ─── 海賊地図背景 ─── */}
      <PirateMapBg />

      {/* ─── ヘッダー（コンパクト版 — フェーズは盤面左列に移動） ─── */}
      <header className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-[#080c1e]/98 border-b border-amber-900/35 z-[10] relative"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
        {/* 戻るボタン */}
        <button onClick={game.resetGame} title="デッキ選択へ戻る"
          className="text-amber-700/60 hover:text-amber-400 transition-colors flex-shrink-0 p-0.5 rounded hover:bg-amber-900/20">
          <Home size={16}/>
        </button>

        {/* ターン + 手番 */}
        <div className="flex items-center gap-1.5 flex-shrink-0 bg-amber-900/20 border border-amber-800/30 rounded-lg px-2 py-0.5">
          <Skull size={11} className="text-amber-500/80"/>
          <span className="text-amber-300 font-black text-sm">T{s.turn}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.playerOrder==='first' ? 'bg-amber-800/40 text-amber-400' : 'bg-blue-900/40 text-blue-400'}`}>
            {s.playerOrder==='first' ? '先行' : '後攻'}
          </span>
        </div>

        {/* ゲーム状態カウンター */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          <StatChip icon="📚" value={s.deck.length} label="デッキ" />
          <StatChip icon="✋" value={s.hand.length} label="手札" />
          <StatChip icon="❤️" value={s.life.length} label="LIFE" color="red" />
          <button onClick={() => setShowTrash(true)} title="トラッシュを確認">
            <StatChip icon="🗑" value={s.trash.length} label="トラッシュ" clickable />
          </button>
        </div>

        <div className="flex-1"/>

        {/* アクションボタン */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => game.drawCard(1)} className={`text-xs px-2.5 py-1 rounded-lg border ${P.btnBlue}`}>+ドロー</button>
          <button onClick={() => setShowSearchStart(true)}
            className={`text-xs px-2.5 py-1 rounded-lg border ${P.btnGold}`}
            title="デッキトップN枚を確認してカードを選ぶ">
            🔍 サーチ
          </button>
          <button onClick={game.resetGame} className="text-amber-900/55 hover:text-amber-500 transition-colors p-1 rounded hover:bg-amber-900/20" title="ゲームリセット">
            <RotateCcw size={13}/>
          </button>
          <button onClick={() => setShowLog(v=>!v)}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${showLog ? 'bg-amber-800/40 border-amber-600/50 text-amber-300' : 'border-amber-900/30 text-amber-800/50 hover:text-amber-400'}`}>
            LOG
          </button>
        </div>
      </header>

      {/* ─── プレイマット本体（公式プレイシート準拠） ─── */}
      <div className="flex-1 flex flex-col overflow-hidden p-1.5 gap-1.5 min-h-0 relative z-[1]">

        {/* ── 上段（行1〜3統合）: 左メガ列 | 右セクション ── */}
        <div className="flex gap-1.5 min-h-0" style={{ flex: 8 }}>

          {/* ──── 左メガ列（ライフ全高 ＋ フェーズ/DON!!縦積み） ──── */}
          <div className="flex-shrink-0 flex gap-1.5" style={{ width: LEFT_COL_W * 2 + 6 }}>

            {/* ライフ（行1〜3の全高をカバー） */}
            <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center justify-center overflow-visible`}
              style={{ width: LEFT_COL_W }}>
              <LifeStack life={s.life} onFlip={game.flipLife}/>
            </div>

            {/* フェーズ(flex:6) + DON!!デッキ(flex:2) 縦積み */}
            <div className="flex-1 flex flex-col gap-1.5">

              {/* フェーズフロー（行1〜2の高さに対応） */}
              <div className={`${P.panel} rounded-xl p-2 flex flex-col justify-between min-h-0`}
                style={{ flex: 6, borderColor: 'rgba(200,160,50,0.25)' }}>
                <div className="flex flex-col gap-0.5 flex-1 justify-around">
                  {PHASES.map((p, i) => (
                    <div key={p.id}
                      className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all
                        ${i === activePhaseIdx
                          ? 'bg-amber-600/40 text-amber-200 border border-amber-500/60'
                          : i < activePhaseIdx
                            ? 'text-amber-900/35 line-through'
                            : 'text-amber-700/50'}`}>
                      <span className="text-sm leading-none">{p.icon}</span>
                      <span>{p.label}</span>
                    </div>
                  ))}
                </div>
                <button onClick={game.advancePhase}
                  className={`mt-1 w-full text-xs py-1 rounded-lg font-bold ${P.btnGold}`}>
                  {s.subPhase === 'end' ? '次ターン ▶' : '次へ ▶'}
                </button>
              </div>

              {/* DON!!デッキ（行3の高さに対応） */}
              <div className={`${P.panel} rounded-xl p-2 flex flex-col items-center justify-center gap-1 min-h-0`}
                style={{ flex: 2, borderColor: 'rgba(253,224,71,0.25)' }}>
                <div className={P.label}>DON!!デッキ</div>
                <div className="relative">
                  <div className="absolute rounded-lg"
                    style={{
                      width: DON_CARD.W + 6, height: DON_CARD.H + 6,
                      top: 4, left: 4,
                      background: 'linear-gradient(160deg, #3d2a00 0%, #1a1300 100%)',
                      border: '1.5px solid rgba(180,120,10,0.35)',
                    }}/>
                  <div className="relative rounded-lg flex flex-col items-center justify-center gap-0.5"
                    style={{
                      width: DON_CARD.W + 6, height: DON_CARD.H + 6,
                      background: 'linear-gradient(160deg, #fef08a 0%, #fbbf24 50%, #d97706 100%)',
                      border: '2px solid rgba(253,224,71,0.85)',
                      boxShadow: '0 3px 10px rgba(245,158,11,0.45)',
                    }}>
                    <span className="font-black text-amber-900 leading-none" style={{ fontSize: 8 }}>DON</span>
                    <span className="font-black text-amber-900 leading-none" style={{ fontSize: 11 }}>!!</span>
                    <span className="text-amber-700/70 leading-none" style={{ fontSize: 6 }}>◆</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-amber-600 text-amber-900 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-amber-400/60 shadow-md">
                    {s.donDeck}
                  </div>
                </div>
                <div className="text-[9px] text-amber-600/60">残{s.donDeck}枚</div>
              </div>
            </div>
          </div>

          {/* ──── 右セクション（行1〜3を縦に積む） ──── */}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">

            {/* 行1 [flex:3]: キャラクターゾーン */}
            <div className="min-h-0 overflow-visible" style={{ flex: 3 }}>
              <div className={`h-full ${P.panel} rounded-xl p-2 flex flex-col min-w-0 overflow-visible`}
                style={{ borderColor: 'rgba(120,220,120,0.18)' }}>
                <div className="flex items-center gap-2 mb-1 flex-shrink-0">
                  <span className={P.label}>キャラクター ({s.field.length}/5)</span>
                  <span className="text-[9px] text-white/35 hidden lg:inline">ダブルクリック→効果 / クリック→操作</span>
                </div>
                <div className="flex gap-2 items-end overflow-x-auto overflow-y-visible flex-1 pb-1">
                  {s.field.map(card => (
                    <GameCard key={card._uid} card={card} tapped={card.tapped} badge={card.donAttached}
                      highlight={selectedCard?.uid === card._uid}
                      onClick={() => handleCardClick(card, 'field', card._uid)}
                      onDoubleClick={() => handleCardDoubleClick(card)}
                    />
                  ))}
                  {Array.from({ length: Math.max(0, 5 - s.field.length) }).map((_, i) => <EmptySlot key={i}/>)}
                </div>
              </div>
            </div>

            {/* 行2 [flex:3]: リーダー | ステージ(flex) | デッキ */}
            <div className="flex gap-1.5 min-h-0 overflow-visible" style={{ flex: 3 }}>

              {/* リーダー */}
              <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1 overflow-visible`}
                style={{ width: LEADER_PAN_W, borderColor: 'rgba(255,220,80,0.22)' }}>
                <div className={P.label}>リーダー</div>
                <div className="relative flex-1 flex items-center justify-center">
                  <GameCard
                    card={s.leader}
                    tapped={s.leader.tapped}
                    badge={s.leader.donAttached}
                    highlight={selectedCard?.context === 'leader'}
                    onClick={() => handleCardClick(s.leader, 'leader', 'leader')}
                    onDoubleClick={() => handleCardDoubleClick(s.leader)}
                  />
                  <div className="absolute bottom-1 left-1 z-20">
                    <LeaderEffectBadge
                      leaderEffect={s.leaderEffect}
                      leaderName={s.leader?.name}
                      onUseAbility={s.leaderEffect?.hasActiveAbility ? handleLeaderAbility : null}
                    />
                  </div>
                </div>
              </div>

              {/* ステージ（flex-1） */}
              <div className={`flex-1 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1 min-w-0`}
                style={{ borderColor: 'rgba(180,80,220,0.22)' }}>
                <div className={P.label}>ステージ</div>
                <div className="flex-1 flex items-center justify-center">
                  {s.stage ? (
                    <div className="cursor-pointer rounded-xl overflow-hidden border-2 border-purple-400/40 hover:border-purple-300/70 transition-all shadow-lg"
                      onClick={() => handleCardClick(s.stage, 'stage', s.stage._uid)}
                      onDoubleClick={() => handleCardDoubleClick(s.stage)}>
                      <CardImage card={s.stage} className="object-cover" style={{ width: DECK_CARD.W, height: DECK_CARD.H }}/>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center"
                      style={{ width: DECK_CARD.W, height: DECK_CARD.H }}>
                      <span className="text-white/20 text-xs">なし</span>
                    </div>
                  )}
                </div>
              </div>

              {/* デッキ（2倍幅） */}
              <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1`}
                style={{ width: DECK_TRASH_W, borderColor: 'rgba(60,120,220,0.22)' }}>
                <div className={P.label}>デッキ</div>
                <div className="flex-1 flex flex-col items-center justify-center gap-1">
                  <div className="relative cursor-pointer group" onClick={() => game.drawCard(1)} title="クリックでドロー">
                    <div className="absolute rounded-xl bg-gradient-to-br from-blue-900/50 to-[#06091a]"
                      style={{ width: DECK_CARD.W - 4, height: DECK_CARD.H - 4, top: 4, left: 4 }}/>
                    <div className="relative rounded-xl bg-gradient-to-br from-[#1a2a5e] to-[#06091a] border-2 border-white/20 flex flex-col items-center justify-center gap-1
                      group-hover:border-amber-400/60 transition-colors"
                      style={{ width: DECK_CARD.W, height: DECK_CARD.H }}>
                      <Anchor size={18} className="text-white/40"/>
                      <span className="text-white/40 text-[9px] font-bold">CLICK</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-blue-400/50 shadow-md">
                      {s.deck.length}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-white/30">ドロー</span>
                    <button onClick={game.shuffleDeck} title="シャッフル（S）"
                      className="text-white/40 hover:text-amber-300 transition-colors">
                      <Shuffle size={11}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 行3 [flex:2]: コストエリア | トラッシュ */}
            <div className="flex gap-1.5 min-h-0" style={{ flex: 2 }}>

              {/* コストエリア */}
              <div className={`flex-1 ${P.panel} rounded-xl p-2 flex flex-col min-w-0`}
                style={{ borderColor: 'rgba(253,224,71,0.22)' }}>
                <div className="flex items-center justify-between mb-1 gap-1 flex-wrap flex-shrink-0">
                  <div className="text-[10px] text-amber-300/90 font-bold flex items-center gap-1">
                    <span>💛</span>
                    <span>コストエリア</span>
                    <span className="text-white/50 font-normal">({donTotal}/{s.donMax})</span>
                    {s.donMax < 10 && <span className="text-amber-400/55 text-[9px]">上限{s.donMax}</span>}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={game.tapAllDon}       className={`text-[9px] px-1.5 py-0.5 rounded border ${P.btnRed}`}  >全レスト</button>
                    <button onClick={game.activateAllDon}  className={`text-[9px] px-1.5 py-0.5 rounded border ${P.btnBlue}`} >全アクティブ</button>
                    <button onClick={() => game.tapDon(1)} className={`text-[9px] px-1.5 py-0.5 rounded border ${P.btnGray}`}>×1レスト</button>
                    <button onClick={() => game.returnDonToDeck(1)}       className={`text-[9px] px-1.5 py-0.5 rounded border ${P.btnGray}`}>→デッキ</button>
                    <button onClick={() => game.returnTappedDonToDeck(1)} className={`text-[9px] px-1.5 py-0.5 rounded border ${P.btnGray}`}>レスト→デッキ</button>
                    <button onClick={game.attachDonToLeader}              className={`text-[9px] px-1.5 py-0.5 rounded border ${P.btnGold}`}>リーダー+1</button>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap items-end flex-1 overflow-y-auto" style={{ minHeight: DON_CARD.H + 2 }}>
                  {s.donActive <= 8
                    ? Array.from({ length: s.donActive }).map((_, i) => (
                        <DonCard key={`a-${i}`} active={true} onClick={() => game.tapDon(1)}/>
                      ))
                    : (
                      <div className="flex items-end gap-1.5">
                        {Array.from({ length: 3 }).map((_, i) => <DonCard key={i} active={true} onClick={() => game.tapDon(1)}/>)}
                        <span className="text-yellow-300 font-black text-sm self-center pb-1">×{s.donActive}</span>
                      </div>
                    )
                  }
                  {s.donActive > 0 && s.donTapped > 0 && (
                    <div className="self-stretch w-px bg-white/15 mx-0.5"/>
                  )}
                  {s.donTapped <= 8
                    ? Array.from({ length: s.donTapped }).map((_, i) => (
                        <DonCard key={`t-${i}`} active={false}/>
                      ))
                    : (
                      <div className="flex items-end gap-1.5">
                        {Array.from({ length: 3 }).map((_, i) => <DonCard key={i} active={false}/>)}
                        <span className="text-white/30 font-black text-sm self-center pb-1">×{s.donTapped}</span>
                      </div>
                    )
                  }
                  {s.donLeader > 0 && (
                    <div className="self-center ml-1 flex items-center gap-0.5 bg-yellow-900/30 border border-yellow-600/40 rounded-lg px-1.5 py-0.5">
                      <span className="text-yellow-300 text-[10px] font-black">👑+{s.donLeader}</span>
                    </div>
                  )}
                  {donTotal === 0 && (
                    <span className="text-white/25 text-xs italic self-center">次フェーズでDON!!補充</span>
                  )}
                </div>
              </div>

              {/* トラッシュ（2倍幅） */}
              <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1`}
                style={{ width: DECK_TRASH_W, borderColor: 'rgba(200,80,80,0.22)' }}>
                <div className={`${P.label} flex items-center gap-1`}>
                  トラッシュ
                  {s.trash.length > 0 && <span className="text-red-300/70 font-black">({s.trash.length})</span>}
                </div>
                {s.trash.length > 0 ? (
                  <div className="relative cursor-pointer group flex-1 w-full flex items-center justify-center overflow-visible"
                    onClick={() => setShowTrash(true)} title="クリックで一覧表示">
                    {s.trash.length >= 3 && (
                      <div className="absolute rounded-xl overflow-hidden border border-white/15"
                        style={{ width: TRASH_CARD.W, height: TRASH_CARD.H, top: 8, left: 18, transform: 'rotate(8deg)', opacity: 0.55, zIndex: 1 }}>
                        <CardImage card={s.trash[s.trash.length-3]} className="w-full h-full object-cover"/>
                      </div>
                    )}
                    {s.trash.length >= 2 && (
                      <div className="absolute rounded-xl overflow-hidden border border-white/20"
                        style={{ width: TRASH_CARD.W, height: TRASH_CARD.H, top: 4, left: 10, transform: 'rotate(4deg)', opacity: 0.75, zIndex: 2 }}>
                        <CardImage card={s.trash[s.trash.length-2]} className="w-full h-full object-cover"/>
                      </div>
                    )}
                    <div className="absolute rounded-xl overflow-hidden border-2 border-red-400/35"
                      style={{ width: TRASH_CARD.W, height: TRASH_CARD.H, top: 0, left: 0, zIndex: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                      <CardImage card={s.trash[s.trash.length-1]} className="w-full h-full object-cover"/>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <span className="text-white font-bold text-[10px] bg-black/40 px-1.5 py-0.5 rounded">一覧</span>
                      </div>
                    </div>
                    <div className="absolute font-black rounded-full flex items-center justify-center border"
                      style={{ bottom: -2, right: 4, width: 18, height: 18, fontSize: 9, zIndex: 10, background: '#991b1b', color: '#fca5a5', borderColor: '#ef4444' }}>
                      {s.trash.length}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-white/15 w-full">
                    <span className="text-white/20 text-xs">空</span>
                  </div>
                )}
                <div className="text-[9px] text-white/30">クリックで一覧</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 行4 [flex:2]: 手札（フル幅） ── */}
        <div className="flex gap-1.5 min-h-0" style={{ flex: 2 }}>
          <div className={`flex-1 ${P.panel} rounded-xl px-3 py-2 flex flex-col min-w-0`}
            style={{ borderColor: 'rgba(100,160,255,0.22)' }}>
            <div className="flex items-center gap-2 mb-1 flex-shrink-0">
              <div className={P.label}>手札 ({s.hand.length}枚)</div>
              <div className="text-[9px] text-white/30 hidden sm:inline">クリック→操作 / ダブルクリック→効果確認</div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 items-end flex-1">
              {s.hand.map(card => (
                <HandCard key={card._uid} card={card}
                  selected={selectedCard?.uid === card._uid}
                  onClick={() => handleCardClick(card, 'hand', card._uid)}
                  onDoubleClick={() => handleCardDoubleClick(card)}
                />
              ))}
              {s.hand.length === 0 && <span className="text-white/20 text-sm italic self-center px-2">手札なし</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ログ ─── */}
      {showLog && (
        <div className="fixed bottom-0 right-0 w-72 max-h-60 bg-[#080c1e]/97 border border-amber-900/40 rounded-tl-xl overflow-y-auto p-3 z-30">
          <div className="text-[10px] text-amber-600/70 font-bold mb-1 flex items-center gap-1">
            <Skull size={10}/> 航海ログ
          </div>
          {s.log.map((msg, i) => (
            <div key={i} className={`text-[10px] py-0.5 border-b border-amber-900/20 ${i===0?'text-amber-200':'text-amber-800/60'}`}>
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* ─── カード詳細モーダル ─── */}
      {detailCard && <CardDetailModal card={detailCard} onClose={() => setDetailCard(null)}/>}

      {/* ─── アクションメニュー ─── */}
      {selectedCard && !detailCard && (
        <ActionMenu card={selectedCard.card} context={selectedCard.context}
          onAction={handleAction} onClose={() => setSelectedCard(null)}/>
      )}

      {/* ─── トラッシュ一覧 ─── */}
      {showTrash && (
        <TrashModal
          trash={state?.trash || []}
          onAction={(actionId, uid) => {
            setSelectedCard({ card: (state?.trash||[]).find(c=>c._uid===uid), context:'trash', uid });
            if (actionId === 'trash-to-hand')      game.returnTrashToHand(uid);
            else if (actionId === 'trash-to-deck-top') game.returnTrashToDeckTop(uid);
          }}
          onClose={() => setShowTrash(false)}
        />
      )}

      {/* ─── トリガー発動トースト ─── */}
      {triggerToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] pointer-events-none animate-bounce">
          <div className="bg-yellow-900/95 border-2 border-yellow-500/80 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3">
            <span className="text-yellow-300 text-lg">⚡</span>
            <div>
              <div className="text-yellow-200 font-black text-sm">トリガー発動！</div>
              <div className="text-yellow-400/80 text-xs">{triggerToast.name}</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── キーボードショートカットヒント ─── */}
      <div className="fixed bottom-2 left-2 z-20 pointer-events-none">
        <div className="flex flex-col gap-0.5 bg-[#080c1e]/70 border border-amber-900/25 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
          <div className="text-[9px] text-amber-700/70 font-bold uppercase tracking-wider mb-0.5">ショートカット</div>
          {[['Space', '次フェーズ'], ['D', 'ドロー'], ['S', 'シャッフル'], ['Esc', '選択解除']].map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-[9px]">
              <kbd className="bg-amber-900/30 border border-amber-800/40 text-amber-500/80 px-1 rounded font-mono leading-none py-0.5">{k}</kbd>
              <span className="text-amber-800/60">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── サーチ開始パネル ─── */}
      {showSearchStart && !state?.searchReveal?.length && (
        <SearchStartPanel
          deckCount={state?.deck?.length ?? 0}
          onBegin={(n) => { game.beginSearch(n); setShowSearchStart(false); }}
          onClose={() => setShowSearchStart(false)}
        />
      )}

      {/* ─── サーチ解決モーダル ─── */}
      {state?.searchReveal?.length > 0 && (
        <SearchModal
          revealed={state.searchReveal}
          onResolve={(result) => game.resolveSearch(result)}
          onCancel={game.cancelSearch}
        />
      )}
    </div>
  );
}
