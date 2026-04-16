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
const DON_CARD  = { W: 64,  H: 90  };   // DON!!カード（手札より少し小さい）
const DON_MINI  = { W: 46,  H: 64  };   // DON!!アタッチミニカード

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
// badge = donAttached 枚数、右側にDON!!ミニカードを扇状に表示
function GameCard({ card, tapped, faceDown, onClick, onDoubleClick, badge, highlight }) {
  const donCount   = badge || 0;
  const visibleDon = Math.min(donCount, 4);

  return (
    // 外側ラッパー: overflow-visible でDON!!ミニカードをはみ出させる
    <div className="relative flex-shrink-0" style={{ width: CARD.W, height: CARD.H }}>

      {/* ── DON!!アタッチ表示（右側に扇状・タップ中も表示） ── */}
      {donCount > 0 && !tapped && Array.from({ length: visibleDon }).map((_, i) => (
        <div key={i}
          className="absolute rounded-lg overflow-hidden pointer-events-none"
          style={{
            width:  DON_MINI.W,
            height: DON_MINI.H,
            right:  -26 - i * 16,
            bottom: 16 + i * 12,
            zIndex: i + 1,
            transform: `rotate(${10 + i * 6}deg)`,
            border: '2px solid rgba(253,224,71,0.95)',
            boxShadow: '2px 4px 10px rgba(0,0,0,0.8)',
          }}>
          <img
            src={DON_IMG_URL}
            alt="DON!!"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            draggable={false}
          />
        </div>
      ))}

      {/* 非タップ時: 枚数バッジ（1枚以上で常に表示） */}
      {donCount > 0 && !tapped && (
        <div className="absolute pointer-events-none rounded-full font-black flex items-center justify-center"
          style={{
            right: -6, bottom: 4, zIndex: 20,
            width: 22, height: 22, fontSize: 11,
            background: '#fbbf24', color: '#1c1a00',
            border: '2px solid #fde68a', boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
          }}>
          +{donCount}
        </div>
      )}

      {/* タップ時: 左上に枚数バッジ（回転しても見やすい位置） */}
      {tapped && donCount > 0 && (
        <div className="absolute pointer-events-none rounded-full font-black flex items-center justify-center"
          style={{
            top: 2, left: 2, width: 22, height: 22, zIndex: 20, fontSize: 11,
            background: '#fbbf24', color: '#1c1a00',
            border: '2px solid #fde68a', boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
          }}>
          +{donCount}
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
const DON_IMG_URL = `${import.meta.env.BASE_URL}don-card.png`;

function DonCard({ active, onClick, onDragStart, onDragEnd }) {
  const canDrag = active && !!onDragStart;
  // レスト時: 90°横向き表示（TCG標準のレスト表現）
  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag ? (e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); } : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onClick={active ? onClick : undefined}
      className={`flex-shrink-0 select-none transition-all duration-200 rounded overflow-hidden flex items-center justify-center
        ${active
          ? `cursor-pointer hover:scale-105 hover:brightness-105 ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`
          : 'cursor-default opacity-60'
        }`}
      style={{
        width:  DON_CARD.W,
        height: DON_CARD.H,
        boxShadow: active ? '0 3px 12px rgba(0,0,0,0.6)' : 'none',
      }}
      title={active ? 'DON!!（クリックでレスト / ドラッグでアタッチ）' : 'DON!!（レスト済み）'}
    >
      <img
        src={DON_IMG_URL}
        alt="DON!!"
        style={{
          width: DON_CARD.W, height: DON_CARD.H,
          objectFit: 'cover', display: 'block',
          // レスト時: 90°回転してカードをH/W比でスケール（はみ出し防止）
          transform: active ? 'none' : `rotate(90deg) scale(${DON_CARD.W / DON_CARD.H})`,
          transition: 'transform 0.2s ease',
          filter: active ? 'none' : 'brightness(0.7) sepia(0.3)',
        }}
        draggable={false}
      />
    </div>
  );
}

// ─── 手札カード ──────────────────────────────────
function HandCard({ card, selected, onClick, onDoubleClick, onDragStart, onDragEnd }) {
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); } : undefined}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`relative flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-150 hover:scale-110 hover:-translate-y-2
        ${selected ? 'border-amber-400 -translate-y-3 shadow-amber-400/60 shadow-xl' : 'border-amber-900/40 hover:border-amber-600/70'}
        ${onDragStart ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      style={{ width: HAND_CARD.W, height: HAND_CARD.H }}
      title={`${card?.name} | ダブルクリックで効果確認 | ドラッグで場に出す`}
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

  // 全てのカードを同じ行き先に一括設定
  const setAllDest = (destVal) => {
    const newDest = {};
    revealed.forEach(c => { newDest[c._uid] = destVal; });
    setDest(newDest);
    if (destVal === 'top') {
      // revealed[0]が一番上に来るよう、一番後に選んだ扱いにする
      setTopOrder(revealed.map(c => c._uid).reverse());
    } else {
      setTopOrder([]);
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
        <div className="flex flex-col gap-2 px-5 py-3 border-t border-amber-900/30">
          {/* 一括操作ボタン */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-600/50 flex-shrink-0">一括：</span>
            <button onClick={() => setAllDest('hand')}
              className="text-[10px] px-3 py-1 rounded-lg border font-bold bg-emerald-900/40 border-emerald-700/50 text-emerald-200 hover:bg-emerald-800/50 transition-all">
              全て手札
            </button>
            <button onClick={() => setAllDest('bottom')}
              className="text-[10px] px-3 py-1 rounded-lg border font-bold bg-purple-900/40 border-purple-700/50 text-purple-200 hover:bg-purple-800/50 transition-all">
              全てデッキ下
            </button>
            <button onClick={() => setAllDest('top')}
              className="text-[10px] px-3 py-1 rounded-lg border font-bold bg-blue-900/40 border-blue-700/50 text-blue-200 hover:bg-blue-800/50 transition-all">
              全てデッキ上
            </button>
          </div>
          <div className="flex items-center gap-3">
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

// ─── 登場時効果パーサー ──────────────────────────
function parseEntryEffect(effectText, myLifeCount) {
  if (!effectText) return { entryText: '', autoActions: [] };

  // 【登場時】セクションを抽出（次の【】が来るまで）
  const m = effectText.match(/【登場時】([\s\S]*?)(?=【|$)/);
  const entryText = m ? m[1].trim() : '';

  const autoActions = [];

  // ── DON!!コスト（最初に処理: 他の効果のトリガーになる）
  const donCostM = entryText.match(/ドン‼[ーー−-](\d+)/);
  if (donCostM) {
    autoActions.push({ id:'donReturn', count: parseInt(donCostM[1]),
      icon:'💛', label:`DON!!×${donCostM[1]}枚をデッキに戻す（コスト）`, color:'text-yellow-300' });
  }

  // ── シンプルドロー: 「カードN枚を引く」（条件句なし）
  const drawM = entryText.match(/カード(\d+)枚を引く/);
  if (drawM && !entryText.includes('場合') && !entryText.includes('ならば') && !entryText.includes('なら')) {
    autoActions.push({ id:'draw', count: parseInt(drawM[1]),
      icon:'📚', label:`${drawM[1]}枚ドロー（自動）`, color:'text-blue-300' });
  }

  // ── サーチ: 「デッキの上からN枚」（ライフ追加文と競合する場合は除外）
  const searchM = entryText.match(/デッキの上から(\d+)枚/);
  if (searchM) {
    // 同じ文にライフへの追加が含まれる場合はaddLifeで処理するためスキップ
    const deckTopSentence = entryText.split(/[。]/).find(s => /デッキの上から/.test(s)) || '';
    if (!/ライフ.*加える/.test(deckTopSentence)) {
      autoActions.push({ id:'search', count: parseInt(searchM[1]),
        icon:'🔍', label:`デッキトップ${searchM[1]}枚サーチ（自動）`, color:'text-purple-300' });
    }
  }

  // ── 手札からキャラ登場（コスト以下）: 「コストX以下のキャラ1枚まで登場」
  const playFromHandM = entryText.match(/コスト(\d+)以下の.*?キャラ.*?1枚.*?登場/);
  if (playFromHandM && !entryText.includes('トラッシュ')) {
    autoActions.push({ id:'playFromHand', maxCost: parseInt(playFromHandM[1]),
      icon:'🃏', label:`手札からコスト${playFromHandM[1]}以下のキャラを1枚登場`, color:'text-green-300' });
  }

  // ── トラッシュからキャラ登場（コスト以下）
  const playFromTrashM = entryText.match(/コスト(\d+)以下の.*?キャラ.*?1枚.*?トラッシュ.*?登場|トラッシュ.*?コスト(\d+)以下の.*?キャラ.*?1枚.*?登場/);
  if (playFromTrashM) {
    const cost = parseInt(playFromTrashM[1] || playFromTrashM[2]);
    autoActions.push({ id:'playFromTrash', maxCost: cost,
      icon:'💀', label:`トラッシュからコスト${cost}以下のキャラを1枚登場`, color:'text-orange-300' });
  }

  // ── ライフ追加: デッキトップをライフの上に加える（無条件のみ自動）
  // 実際のカードテキスト例: "デッキの上から1枚をライフの上に加える"
  {
    const sentences = entryText.split(/[。]/);
    const lifeAddSentence = sentences.find(s =>
      /(デッキの上から|デッキトップ).*ライフ.*加える/.test(s)
    );
    // 「場合」「：」が含まれる場合は条件付き効果なので下の条件付きブロックで処理
    if (lifeAddSentence && !/場合|：/.test(lifeAddSentence)) {
      autoActions.push({ id:'addLife',
        icon:'❤', label:`デッキトップをライフの上に追加（自動）`, color:'text-red-300' });
    }
  }

  // ── 条件付きライフ追加: 「自分のライフがN枚以下/以上の場合、デッキトップをライフに」
  // 例: EB04-054「自分のライフが2枚以下の場合、デッキの上から1枚をライフの上に加える」
  if (myLifeCount !== undefined) {
    const condM = entryText.match(
      /自分のライフが(\d+)枚(以下|以上)の場合[^。]*(デッキの上から|デッキトップ)[^。]*ライフ.*加える/
    );
    if (condM) {
      const threshold = parseInt(condM[1]);
      const op = condM[2]; // 以下 or 以上
      const condMet = op === '以下' ? myLifeCount <= threshold : myLifeCount >= threshold;
      if (condMet) {
        autoActions.push({ id:'addLife',
          icon:'❤', label:`ライフ${threshold}枚${op}のため、デッキトップをライフの上に追加（自動）`, color:'text-red-300' });
      } else {
        autoActions.push({ id:'info',
          icon:'ℹ', label:`ライフが${threshold}枚${op}でないため効果なし（スキップ）`, color:'text-gray-400' });
      }
    }
  }

  // ── 情報表示のみ（手動操作が必要な複雑効果）
  const hasComplexEffect = entryText.includes('場合') || entryText.includes('選ぶ') ||
    (entryText.includes('相手') && !donCostM && !searchM && !drawM);
  if (autoActions.length === 0 && entryText && hasComplexEffect) {
    autoActions.push({ id:'info', icon:'ℹ', label:'手動で効果を処理してください', color:'text-amber-400' });
  }

  return { entryText: entryText || effectText, autoActions };
}

// ─── アタック時効果パーサー ─────────────────────
function parseAttackEffect(card) {
  const effectText = card?.effect || '';
  const match = effectText.match(/【アタック時】([\s\S]*?)(?=【|$)/);
  if (!match) return { attackText: null, autoActions: [] };
  const attackText = match[0].trim();
  const body = match[1].trim();
  const autoActions = [];
  const drawM = body.match(/カード(\d+)枚を引く/);
  if (drawM && !body.includes('場合') && !body.includes('ならば') && !body.includes('なら')) {
    autoActions.push({ id:'draw', count: parseInt(drawM[1]), icon:'📚', label:`${drawM[1]}枚ドロー（自動）`, color:'text-blue-300' });
  }
  const donCostM = body.match(/ドン‼[ーー−-](\d+)/);
  if (donCostM) {
    autoActions.push({ id:'donReturn', count: parseInt(donCostM[1]), icon:'💛', label:`DON!!×${donCostM[1]}枚をデッキに戻す`, color:'text-yellow-300' });
  }
  const searchM = body.match(/デッキの上から(\d+)枚/);
  if (searchM) {
    autoActions.push({ id:'search', count: parseInt(searchM[1]), icon:'🔍', label:`デッキトップ${searchM[1]}枚サーチ（自動）`, color:'text-purple-300' });
  }
  return { attackText, autoActions };
}

// ─── イベント効果パーサー ────────────────────────
function parseEventEffect(card) {
  const effectText = card?.effect || '';
  const autoActions = [];
  const drawM = effectText.match(/カード(\d+)枚を引く/);
  if (drawM && !effectText.includes('場合') && !effectText.includes('ならば') && !effectText.includes('なら')) {
    autoActions.push({ id:'draw', count: parseInt(drawM[1]), icon:'📚', label:`${drawM[1]}枚ドロー（自動）`, color:'text-blue-300' });
  }
  const donCostM = effectText.match(/ドン‼[ーー−-](\d+)/);
  if (donCostM) {
    autoActions.push({ id:'donReturn', count: parseInt(donCostM[1]), icon:'💛', label:`DON!!×${donCostM[1]}枚をデッキに戻す（コスト）`, color:'text-yellow-300' });
  }
  const searchM = effectText.match(/デッキの上から(\d+)枚/);
  if (searchM) {
    autoActions.push({ id:'search', count: parseInt(searchM[1]), icon:'🔍', label:`デッキトップ${searchM[1]}枚サーチ（自動）`, color:'text-purple-300' });
  }
  return { effectText, autoActions };
}

// ─── 起動メイン効果パーサー ──────────────────────
function parseActiveAbility(card) {
  const effectText = card?.effect || '';
  const match = effectText.match(/【起動メイン[^】]*】([\s\S]*?)(?=【|$)/);
  if (!match) return { abilityText: null, autoActions: [] };
  const abilityText = match[0].trim();
  const body = match[1].trim();
  const autoActions = [];
  const drawM = body.match(/カード(\d+)枚を引く/);
  if (drawM && !body.includes('場合') && !body.includes('ならば')) {
    autoActions.push({ id:'draw', count: parseInt(drawM[1]), icon:'📚', label:`${drawM[1]}枚ドロー（自動）`, color:'text-blue-300' });
  }
  const donRetM = body.match(/ドン‼[ーー−-](\d+)/);
  if (donRetM) {
    autoActions.push({ id:'donReturn', count: parseInt(donRetM[1]), icon:'💛', label:`DON!!×${donRetM[1]}枚をデッキに戻す`, color:'text-yellow-300' });
  }
  const searchM = body.match(/デッキの上から(\d+)枚/);
  if (searchM) {
    autoActions.push({ id:'search', count: parseInt(searchM[1]), icon:'🔍', label:`デッキトップ${searchM[1]}枚サーチ`, color:'text-purple-300' });
  }
  return { abilityText, autoActions };
}

// ─── 登場時効果モーダル ──────────────────────────
function EntryEffectModal({ card, onActivate, onSkip, game, onChainPlay }) {
  const myLifeCount = game?.state?.life?.length ?? 0;
  const { entryText, autoActions } = parseEntryEffect(card?.effect || '', myLifeCount);

  const handleActivate = () => {
    // chain actions（playFromHand/playFromTrash）は後で別モーダルで処理
    let chainAction = null;
    autoActions.forEach(a => {
      if (a.id === 'draw')       game.drawCard(a.count);
      if (a.id === 'donReturn')  game.returnDonToDeckPriority(a.count);
      if (a.id === 'search')     game.beginSearch(a.count);
      if (a.id === 'addLife')    game.addLife();
      if (a.id === 'playFromHand' || a.id === 'playFromTrash') chainAction = a;
    });
    onActivate();
    if (chainAction && onChainPlay) onChainPlay(chainAction);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onClick={onSkip}>
      <div className="bg-[#0a0f24] border border-amber-600/45 rounded-2xl shadow-2xl p-5 max-w-sm w-full"
        onClick={e => e.stopPropagation()}>

        {/* ヘッダー */}
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-amber-900/30">
          <div className="w-9 h-9 rounded-full bg-amber-800/40 border border-amber-600/40 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-300 text-base">⚡</span>
          </div>
          <div>
            <div className="text-[9px] text-amber-600/60 uppercase tracking-widest">登場時効果</div>
            <div className="text-amber-100 font-black text-sm leading-tight">{card?.name}</div>
            {card?.cost != null && (
              <div className="text-amber-700/60 text-[10px]">コスト{card.cost}{card.power != null ? ` ／ パワー${card.power?.toLocaleString()}` : ''}</div>
            )}
          </div>
        </div>

        {/* 効果テキスト */}
        <div className="bg-[#0d1530]/80 rounded-xl p-3 border border-amber-900/25 mb-3">
          <div className="text-[9px] text-amber-600/50 uppercase tracking-wider mb-1.5">【登場時】</div>
          <div className="text-amber-100/90 text-[11px] leading-relaxed whitespace-pre-line">{entryText}</div>
        </div>

        {/* 自動実行アクション */}
        {autoActions.length > 0 && (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5">⚙ 「発動する」で自動実行</div>
            {autoActions.map(a => (
              <div key={a.id} className={`flex items-center gap-1.5 text-[11px] ${a.color}`}>
                <span>{a.icon}</span><span>{a.label}</span>
              </div>
            ))}
          </div>
        )}
        {autoActions.length === 0 && (
          <div className="bg-amber-900/15 border border-amber-800/25 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-amber-600/60">
              ⚠ この効果はゲームボードで手動操作が必要です。「発動する」を押した後、各ボタンで処理してください。
            </div>
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-2.5">
          <button onClick={onSkip}
            className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20 transition-all">
            発動しない
          </button>
          <button onClick={handleActivate}
            className="flex-1 py-2 rounded-xl text-sm font-black bg-gradient-to-b from-amber-600 to-amber-800 border border-amber-500/60 text-amber-100 hover:from-amber-500 shadow-md shadow-amber-900/40 transition-all">
            ⚡ 発動する
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 効果による手札/トラッシュからキャラ登場モーダル ────────
function PlayFromModal({ source, cards, maxCost, game, onDone }) {
  const eligible = cards.filter(c => c.card_type === 'CHARACTER' && (c.cost || 0) <= maxCost);
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-green-600/45 rounded-2xl shadow-2xl p-5 max-w-md w-full max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-green-900/30">
          <div className="w-9 h-9 rounded-full bg-green-800/40 border border-green-600/40 flex items-center justify-center flex-shrink-0">
            <span className="text-green-300 text-base">🃏</span>
          </div>
          <div>
            <div className="text-[9px] text-green-600/60 uppercase tracking-widest">効果登場</div>
            <div className="text-amber-100 font-black text-sm leading-tight">
              {source === 'hand' ? '手札' : 'トラッシュ'}からコスト{maxCost}以下のキャラを1枚選んで登場
            </div>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 space-y-1.5 mb-3">
          {eligible.length === 0 ? (
            <div className="text-amber-600/60 text-sm text-center py-4">対象カードがありません</div>
          ) : eligible.map(c => (
            <button key={c._uid}
              onClick={() => {
                if (source === 'hand') game.playFromHandFree(c._uid);
                else game.playFromTrashFree(c._uid);
                onDone();
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-green-900/20 border border-green-800/30 hover:bg-green-900/40 transition-all text-left">
              <div className="flex-1 min-w-0">
                <div className="text-amber-100 text-sm font-bold truncate">{c.name}</div>
                <div className="text-amber-700/60 text-[10px]">コスト{c.cost} / パワー{(c.power||0).toLocaleString()}</div>
              </div>
              <span className="text-green-400 text-xs font-bold">登場 →</span>
            </button>
          ))}
        </div>
        <button onClick={onDone}
          className="w-full py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20 transition-all">
          スキップ
        </button>
      </div>
    </div>
  );
}

// ─── アタック時効果モーダル ─────────────────────
function AttackEffectModal({ card, onActivate, onSkip, game }) {
  const { attackText, autoActions } = parseAttackEffect(card);
  if (!attackText) return null;
  const handleActivate = () => {
    autoActions.forEach(a => {
      if (a.id === 'draw')      game.drawCard(a.count);
      if (a.id === 'donReturn') game.returnDonToDeckPriority(a.count);
      if (a.id === 'search')    game.beginSearch(a.count);
    });
    onActivate();
  };
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm" onClick={onSkip}>
      <div className="bg-[#0a0f24] border border-red-600/45 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-red-900/30">
          <div className="w-9 h-9 rounded-full bg-red-800/40 border border-red-600/40 flex items-center justify-center flex-shrink-0">
            <span className="text-red-300 text-base">⚔</span>
          </div>
          <div>
            <div className="text-[9px] text-red-600/60 uppercase tracking-widest">アタック時効果</div>
            <div className="text-amber-100 font-black text-sm leading-tight">{card?.name}</div>
            {card?.power != null && <div className="text-amber-700/60 text-[10px]">パワー{card.power?.toLocaleString()}</div>}
          </div>
        </div>
        <div className="bg-[#0d1530]/80 rounded-xl p-3 border border-red-900/25 mb-3">
          <div className="text-[9px] text-red-600/50 uppercase tracking-wider mb-1.5">【アタック時】</div>
          <div className="text-amber-100/90 text-[11px] leading-relaxed whitespace-pre-line">{attackText}</div>
        </div>
        {autoActions.length > 0 ? (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5">⚙ 「発動する」で自動実行</div>
            {autoActions.map(a => (
              <div key={a.id} className={`flex items-center gap-1.5 text-[11px] ${a.color}`}>
                <span>{a.icon}</span><span>{a.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-amber-900/15 border border-amber-800/25 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-amber-600/60">⚠ この効果はゲームボードで手動操作が必要です。</div>
          </div>
        )}
        <div className="flex gap-2.5">
          <button onClick={onSkip} className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20 transition-all">発動しない</button>
          <button onClick={handleActivate} className="flex-1 py-2 rounded-xl text-sm font-black bg-gradient-to-b from-red-600 to-red-800 border border-red-500/60 text-red-100 hover:from-red-500 shadow-md shadow-red-900/40 transition-all">⚔ 発動する</button>
        </div>
      </div>
    </div>
  );
}

// ─── イベント効果モーダル ─────────────────────
function EventEffectModal({ card, onActivate, onSkip, game }) {
  const { effectText, autoActions } = parseEventEffect(card);
  const handleActivate = () => {
    autoActions.forEach(a => {
      if (a.id === 'draw')      game.drawCard(a.count);
      if (a.id === 'donReturn') game.returnDonToDeckPriority(a.count);
      if (a.id === 'search')    game.beginSearch(a.count);
    });
    onActivate();
  };
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm" onClick={onSkip}>
      <div className="bg-[#0a0f24] border border-blue-600/45 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-blue-900/30">
          <div className="w-9 h-9 rounded-full bg-blue-800/40 border border-blue-600/40 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-300 text-base">📜</span>
          </div>
          <div>
            <div className="text-[9px] text-blue-600/60 uppercase tracking-widest">イベント効果</div>
            <div className="text-amber-100 font-black text-sm leading-tight">{card?.name}</div>
            {card?.cost != null && <div className="text-amber-700/60 text-[10px]">コスト{card.cost}</div>}
          </div>
        </div>
        <div className="bg-[#0d1530]/80 rounded-xl p-3 border border-blue-900/25 mb-3">
          <div className="text-[9px] text-blue-600/50 uppercase tracking-wider mb-1.5">効果</div>
          <div className="text-amber-100/90 text-[11px] leading-relaxed whitespace-pre-line">{effectText || '（効果テキストなし）'}</div>
        </div>
        {autoActions.length > 0 ? (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5">⚙ 「発動する」で自動実行</div>
            {autoActions.map(a => (
              <div key={a.id} className={`flex items-center gap-1.5 text-[11px] ${a.color}`}>
                <span>{a.icon}</span><span>{a.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-amber-900/15 border border-amber-800/25 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-amber-600/60">⚠ この効果はゲームボードで手動操作が必要です。「発動する」を押した後、各ボタンで処理してください。</div>
          </div>
        )}
        <div className="flex gap-2.5">
          <button onClick={onSkip} className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20 transition-all">効果なしで使用</button>
          <button onClick={handleActivate} className="flex-1 py-2 rounded-xl text-sm font-black bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-500/60 text-blue-100 hover:from-blue-500 shadow-md shadow-blue-900/40 transition-all">📜 発動する</button>
        </div>
      </div>
    </div>
  );
}

// ─── キャラクター選択モーダル ────────────────────
function CharacterSelectModal({ field, info, onConfirm, onCancel }) {
  const [chosen, setChosen] = useState([]);
  const { mode, maxSelect, donPerChar, label } = info;

  const toggle = (uid) => {
    if (mode === 'single') {
      setChosen([uid]);
    } else {
      if (chosen.includes(uid)) {
        setChosen(c => c.filter(id => id !== uid));
      } else if (chosen.length < maxSelect) {
        setChosen(c => [...c, uid]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[#0a0f24] border border-amber-600/45 rounded-2xl shadow-2xl p-5 max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-amber-900/30">
          <div className="w-9 h-9 rounded-full bg-amber-800/40 border border-amber-600/40 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-300 text-base">⚡</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] text-amber-600/60 uppercase tracking-widest">キャラクター選択</div>
            <div className="text-amber-200 text-sm leading-tight">{label}</div>
            {mode === 'multi' && <div className="text-[10px] text-amber-700/60">{chosen.length}/{maxSelect}枚選択中</div>}
          </div>
          <button onClick={onCancel}><X size={14} className="text-amber-800/60 hover:text-amber-400"/></button>
        </div>
        {field.length === 0 ? (
          <div className="text-amber-600/60 text-sm text-center py-6">フィールドにキャラクターがいません</div>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center mb-4">
            {field.map(card => {
              const sel = chosen.includes(card._uid);
              return (
                <button key={card._uid} onClick={() => toggle(card._uid)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all duration-150 hover:scale-105
                    ${sel ? 'border-amber-400 shadow-amber-400/60 shadow-lg scale-105' : 'border-white/20 hover:border-amber-500/60'}`}
                  style={{ width: CARD.W, height: CARD.H }}>
                  <CardImage card={card} className="w-full h-full object-cover"/>
                  {sel && (
                    <div className="absolute inset-0 bg-amber-400/25 flex items-center justify-center">
                      <span className="text-amber-200 font-black text-3xl drop-shadow-lg">✓</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-1 pt-3">
                    <span className="text-[9px] text-amber-200 font-bold truncate block">{card.name}</span>
                  </div>
                  {(card.donAttached || 0) > 0 && (
                    <div className="absolute top-1 right-1 bg-amber-500 text-gray-900 text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                      +{card.donAttached}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20 transition-all">キャンセル</button>
          <button
            onClick={() => chosen.length > 0 && onConfirm(chosen, donPerChar)}
            disabled={chosen.length === 0}
            className="flex-1 py-2 rounded-xl text-sm font-black bg-gradient-to-b from-amber-600 to-amber-800 border border-amber-500/60 text-amber-100 hover:from-amber-500 shadow-md disabled:opacity-40 transition-all">
            ⚡ 確定（{chosen.length}枚）
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── リーダー効果確認モーダル ────────────────────
function LeaderAbilityModal({ leaderEffect, leaderName, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[58] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[#0a0f24] border border-amber-600/45 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-amber-900/30">
          <div className="w-9 h-9 rounded-full bg-amber-800/40 border border-amber-600/40 flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-amber-300"/>
          </div>
          <div>
            <div className="text-[9px] text-amber-600/60 uppercase tracking-widest">起動メイン効果</div>
            <div className="text-amber-100 font-black text-sm leading-tight">{leaderName}</div>
          </div>
        </div>
        {leaderEffect.note && (
          <div className="bg-amber-900/20 rounded-xl p-3 border border-amber-800/25 mb-3">
            <div className="text-amber-200/80 text-[10px] leading-relaxed">{leaderEffect.note}</div>
          </div>
        )}
        {leaderEffect.activeAbility && (
          <div className="bg-[#131d45]/70 rounded-xl p-3 border border-amber-900/20 mb-4">
            <div className="text-[9px] text-amber-600/50 uppercase tracking-wider mb-1">効果</div>
            <div className="text-amber-100/90 text-[11px] leading-relaxed">{leaderEffect.activeAbility}</div>
          </div>
        )}
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20 transition-all">キャンセル</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl text-sm font-black bg-gradient-to-b from-amber-600 to-amber-800 border border-amber-500/60 text-amber-100 hover:from-amber-500 shadow-md shadow-amber-900/40 transition-all">⚡ 発動する</button>
        </div>
      </div>
    </div>
  );
}

// ─── キャラクター起動メインモーダル ──────────────
function CharActiveModal({ card, onActivate, onSkip, game }) {
  const { abilityText, autoActions } = parseActiveAbility(card);
  if (!abilityText) return null;
  const handleActivate = () => {
    autoActions.forEach(a => {
      if (a.id === 'draw')      game.drawCard(a.count);
      if (a.id === 'donReturn') game.returnDonToDeckPriority(a.count);
      if (a.id === 'search')    game.beginSearch(a.count);
    });
    onActivate();
  };
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm" onClick={onSkip}>
      <div className="bg-[#0a0f24] border border-amber-600/45 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-amber-900/30">
          <div className="w-9 h-9 rounded-full bg-amber-800/40 border border-amber-600/40 flex items-center justify-center flex-shrink-0">
            <Zap size={15} className="text-amber-300"/>
          </div>
          <div>
            <div className="text-[9px] text-amber-600/60 uppercase tracking-widest">起動メイン効果</div>
            <div className="text-amber-100 font-black text-sm leading-tight">{card?.name}</div>
            {card?.power != null && <div className="text-amber-700/60 text-[10px]">パワー{card.power?.toLocaleString()}</div>}
          </div>
        </div>
        <div className="bg-[#0d1530]/80 rounded-xl p-3 border border-amber-900/25 mb-3">
          <div className="text-[9px] text-amber-600/50 uppercase tracking-wider mb-1.5">【起動メイン】</div>
          <div className="text-amber-100/90 text-[11px] leading-relaxed whitespace-pre-line">{abilityText}</div>
        </div>
        {autoActions.length > 0 ? (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5">⚙ 「発動する」で自動実行</div>
            {autoActions.map(a => (
              <div key={a.id} className={`flex items-center gap-1.5 text-[11px] ${a.color}`}>
                <span>{a.icon}</span><span>{a.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-amber-900/15 border border-amber-800/25 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-amber-600/60">⚠ この効果はゲームボードで手動操作が必要です。</div>
          </div>
        )}
        <div className="flex gap-2.5">
          <button onClick={onSkip} className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20 transition-all">発動しない</button>
          <button onClick={handleActivate} className="flex-1 py-2 rounded-xl text-sm font-black bg-gradient-to-b from-amber-600 to-amber-800 border border-amber-500/60 text-amber-100 hover:from-amber-500 shadow-md shadow-amber-900/40 transition-all">⚡ 発動する</button>
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
  const [showTrash, setShowTrash] = useState(false);            // トラッシュ一覧
  const [triggerToast, setTriggerToast] = useState(null);       // トリガー発動通知
  const [pendingEntryEffect,  setPendingEntryEffect]  = useState(null); // 登場時効果待ち
  const [pendingAttackEffect, setPendingAttackEffect] = useState(null); // アタック時効果待ち
  const [pendingEventEffect,  setPendingEventEffect]  = useState(null); // イベント効果待ち
  const [pendingChainPlay,    setPendingChainPlay]    = useState(null); // 連鎖効果（手札/トラッシュから登場）待ち
  const [showLeaderAbilityModal, setShowLeaderAbilityModal] = useState(false); // リーダー効果確認
  const [charSelectInfo, setCharSelectInfo] = useState(null); // キャラ選択モーダル情報
  const [pendingCharAbility, setPendingCharAbility] = useState(null); // キャラ起動メイン効果待ち
  const [phaseError, setPhaseError] = useState(null); // フェーズエラーメッセージ
  const [dragInfo,  setDragInfo]  = useState(null);  // ドラッグ中カード情報 { card, context }
  const [dragOver,  setDragOver]  = useState(null);  // ホバー中ドロップゾーン名

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
  // useGameState 側で pendingLifeTrigger フラグが立った時だけトーストを表示する。
  // 手札枚数の増減では判断しないため、通常ドロー・サーチ結果等でも誤発動しない。
  useEffect(() => {
    if (!state?.pendingLifeTrigger) return;
    setTriggerToast(state.pendingLifeTrigger);
    const t = setTimeout(() => {
      setTriggerToast(null);
      game.clearLifeTrigger();
    }, 4000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.pendingLifeTrigger]);

  const handleCardClick = (card, context, uid) => {
    if (selectedCard?.uid === uid) { setSelectedCard(null); return; }
    setSelectedCard({ card, context, uid });
  };
  const handleCardDoubleClick = (card) => { setDetailCard(card); setSelectedCard(null); };

  // ─── D&D: ドロップゾーン判定 ───────────────────────────
  const isValidDrop = (zone) => {
    if (!dragInfo) return false;
    const { context, card } = dragInfo;
    if (context === 'hand') {
      if (zone === 'field')  return card.card_type === 'CHARACTER';
      if (zone === 'stage')  return card.card_type === 'STAGE';
      if (zone === 'event')  return card.card_type === 'EVENT';
      if (zone === 'trash')  return true;
      if (zone === 'deck')   return true;
    }
    if (context === 'don-active') {
      if (zone === 'leader') return true;
      if (zone.startsWith('field-card-')) return true;
    }
    return false;
  };

  // ドロップゾーンのスタイル（hover時はリング強調）
  const dzStyle = (zone) => {
    if (!isValidDrop(zone)) return {};
    const hovered = dragOver === zone;
    return {
      outline:    hovered ? '2px solid rgba(245,215,142,0.9)' : '2px dashed rgba(245,215,142,0.45)',
      outlineOffset: '-2px',
      filter:     hovered ? 'brightness(1.18)' : 'brightness(1.06)',
      transition: 'outline 0.1s, filter 0.1s',
    };
  };

  // D&D: ドロップ実行
  const handleDrop = (zone, extraUid = null) => {
    if (!dragInfo) return;
    const { context, card } = dragInfo;
    if (context === 'hand') {
      if (zone === 'field' && card.card_type === 'CHARACTER') {
        game.playToField(card._uid);
        if (/【登場時】/.test(card.effect || '')) setPendingEntryEffect(card);
      } else if (zone === 'stage' && card.card_type === 'STAGE') {
        game.playStage(card._uid);
      } else if (zone === 'event' && card.card_type === 'EVENT') {
        game.trashHandCard(card._uid);
      } else if (zone === 'trash') {
        game.trashHandCard(card._uid);
      } else if (zone === 'deck') {
        game.returnHandToTop(card._uid);
      }
    } else if (context === 'don-active') {
      if (zone === 'leader') {
        game.attachDonToLeader();
      } else if (zone === 'field-card' && extraUid) {
        game.attachDonToField(extraUid);
      }
    }
    setDragInfo(null);
    setDragOver(null);
    setSelectedCard(null);
  };

  const handleDragEnd = () => { setDragInfo(null); setDragOver(null); };

  const handleAction = (actionId) => {
    if (!selectedCard) return;
    const { card, uid } = selectedCard;
    if (actionId === 'detail') { setDetailCard(card); return; }

    // フェーズチェック
    const phaseErrMsg = getPhaseActionError(actionId, state?.subPhase);
    if (phaseErrMsg) {
      showPhaseError(phaseErrMsg);
      setSelectedCard(null);
      return;
    }

    switch (actionId) {
      case 'play': {
        game.playToField(uid);
        // 【登場時】効果を持つ場合はモーダルを表示
        const hasEntry = card.effect && /【登場時】/.test(card.effect);
        if (hasEntry) {
          setPendingEntryEffect(card);
        }
        break;
      }
      case 'stage':              game.playStage(uid); break;
      case 'event': {
        // イベントは効果モーダルを表示してから使用
        setPendingEventEffect({ card, uid });
        break;
      }
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
      case 'tap': {
        // アタック時: カードがアクティブ→タップされる前にアタック時効果をチェック
        const attackCard = state?.field?.find(c => c._uid === uid);
        game.toggleFieldCard(uid);
        if (attackCard && !attackCard.tapped && /【アタック時】/.test(attackCard.effect || '')) {
          setPendingAttackEffect(attackCard);
        }
        break;
      }
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

  // ─── フェーズエラーチェック ───
  const showPhaseError = (msg) => {
    setPhaseError(msg);
    setTimeout(() => setPhaseError(null), 2800);
  };

  const getPhaseActionError = (actionId, phase) => {
    if (!phase || phase === 'main') return null;
    const phaseNames = { refresh:'リフレッシュ', draw:'ドロー', don:'DON!!', end:'エンド' };
    const actionLabels = {
      play:'キャラを登場させる', stage:'ステージをセット', event:'イベントを使用する',
      tap:'アタックする', 'tap-leader':'リーダーでアタックする',
      'attach-don':'DON!!を付与する', 'attach-don-leader':'リーダーにDON!!を付与する',
    };
    const blocked = {
      refresh: ['play','stage','event','tap','tap-leader','attach-don','attach-don-leader'],
      draw:    ['play','stage','event','tap','tap-leader','attach-don','attach-don-leader'],
      don:     ['tap','tap-leader'],
      end:     ['play','stage','event','tap','tap-leader'],
    };
    if ((blocked[phase] || []).includes(actionId)) {
      return `${phaseNames[phase]}フェーズでは「${actionLabels[actionId] || actionId}」はできません`;
    }
    return null;
  };

  // ─── キャラ起動メイン発動 ───
  const handleCharActiveAbility = (card) => {
    const err = getPhaseActionError('char-active', state?.subPhase);
    // 起動メインはメインフェーズのみ（ただし厳密チェックはしない）
    setPendingCharAbility(card);
  };

  // リーダー効果確認モーダルで「発動する」押下時
  const handleLeaderAbilityConfirm = () => {
    if (!state) return;
    const num = state.leader?.card_number;
    if (num === 'OP15-058') {
      // エネル: DON追加後にキャラ選択（レストDON×4をキャラに付与）
      game.useEnelAbility(1, 4);
      setShowLeaderAbilityModal(false);
      setCharSelectInfo({ mode: 'single', maxSelect: 1, donPerChar: 4, label: 'DON!!×4を付与するキャラを1枚選んでください' });
    } else if (num === 'OP08-001') {
      // チョッパー: 最大3キャラにDON!!×1ずつ
      setShowLeaderAbilityModal(false);
      setCharSelectInfo({ mode: 'multi', maxSelect: 3, donPerChar: 1, label: '《動物》か《ドラム王国》のキャラを最大3枚選んでください（DON!!×1ずつ付与）' });
    } else if (num === 'OP14-020') {
      game.useMihawkAbility('leader');
      setShowLeaderAbilityModal(false);
    } else if (num === 'OP10-001') {
      game.useSmokerAbility();
      setShowLeaderAbilityModal(false);
    } else if (num === 'OP05-041') {
      game.useAkainuAbility();
      setShowLeaderAbilityModal(false);
    } else {
      setShowLeaderAbilityModal(false);
    }
  };

  // キャラ選択確定時（DONをアタッチ）
  const handleCharSelectConfirm = (chosenUids, donPerChar) => {
    chosenUids.forEach(uid => game.attachDonToFieldMulti(uid, donPerChar));
    setCharSelectInfo(null);
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
  //    行2[flex:3]: LEADER(flex) | STAGE(LEFT_COL_W固定) | DECK(DECK_TRASH_W)
  //    行3[flex:2]: COST(flex) | TRASH(DECK_TRASH_W)
  //  行4[flex:2]: HAND（フル幅）
  // ─────────────────────────────────────────────────────
  const LEFT_COL_W   = 240;   // ライフ/フェーズ/DON!!デッキ列幅（各2倍）
  const LEADER_PAN_W = 280;   // リーダーパネル幅（2倍）
  const DECK_TRASH_W = 248;   // デッキ・トラッシュ固定幅

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

        {/* ── 上段（行1〜3）: ライフ列（全高） | 中央+右セクション ── */}
        <div className="flex gap-1.5 min-h-0" style={{ flex: 8 }}>

          {/* ──── ライフ列（行1〜3の全高をカバー） ──── */}
          <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center justify-center overflow-visible`}
            style={{ width: LEFT_COL_W, borderColor: 'rgba(220,50,50,0.22)' }}>
            <LifeStack life={s.life} onFlip={game.flipLife}/>
          </div>

          {/* ──── 中央+右セクション（行1〜3を縦積み） ──── */}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">

            {/* 行1 [flex:3]: キャラクターゾーン（ライフ分広がる） */}
            <div className="min-h-0 overflow-visible" style={{ flex: 3 }}>
              <div
                className={`h-full ${P.panel} rounded-xl p-2 flex flex-col min-w-0 overflow-visible`}
                style={{ borderColor: 'rgba(120,220,120,0.18)', ...dzStyle('field') }}
                onDragOver={(e) => { if (isValidDrop('field')) { e.preventDefault(); setDragOver('field'); } }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop('field'); }}
              >
                <div className="flex items-center gap-2 mb-1 flex-shrink-0">
                  <span className={P.label}>キャラクター ({s.field.length}/5)</span>
                  <span className="text-[9px] text-white/35 hidden lg:inline">
                    ダブルクリック→効果 / クリック→操作
                    {dragInfo?.context === 'hand' && dragInfo.card.card_type === 'CHARACTER' && ' / ここにドロップで場に出す'}
                  </span>
                </div>
                <div className="flex gap-4 items-end overflow-x-auto overflow-y-visible flex-1 pb-1 justify-center px-2">
                  {s.field.map(card => {
                    const donPad = (card.donAttached || 0) > 0
                      ? Math.min(card.donAttached, 4) * 16 + 32 : 0;
                    const hasActive = /【起動メイン】/.test(card.effect || '');
                    return (
                      <div key={card._uid}
                        className="flex flex-col items-center gap-1 flex-shrink-0"
                        style={{ paddingRight: donPad }}>
                        <div
                          style={dzStyle(`field-card-${card._uid}`)}
                          className="rounded-xl"
                          onDragOver={(e) => { if (isValidDrop(`field-card-${card._uid}`)) { e.preventDefault(); e.stopPropagation(); setDragOver(`field-card-${card._uid}`); } }}
                          onDragLeave={(e) => { e.stopPropagation(); setDragOver(null); }}
                          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop('field-card', card._uid); }}
                        >
                          <GameCard card={card} tapped={card.tapped} badge={card.donAttached}
                            highlight={selectedCard?.uid === card._uid}
                            onClick={() => handleCardClick(card, 'field', card._uid)}
                            onDoubleClick={() => handleCardDoubleClick(card)}
                          />
                        </div>
                        {/* 起動メインボタン */}
                        {hasActive && (
                          <button onClick={() => handleCharActiveAbility(card)}
                            style={{ width: CARD.W }}
                            className={`py-1 rounded-lg font-black text-[9px] ${P.btnGold} flex items-center justify-center gap-0.5 border`}>
                            <Zap size={8}/> 起動メイン
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 5 - s.field.length) }).map((_, i) => <EmptySlot key={i}/>)}
                </div>
              </div>
            </div>

            {/* 行2 [flex:3]: フェーズ | リーダー(flex) | ステージ(固定) | デッキ */}
            <div className="flex gap-1.5 min-h-0 overflow-visible" style={{ flex: 3 }}>

              {/* フェーズパネル（行2のみ — 行1分短くなる） */}
              <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col justify-between min-h-0`}
                style={{ width: LEFT_COL_W, borderColor: 'rgba(200,160,50,0.25)' }}>
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

              {/* リーダー（flex — 中央配置） */}
              <div
                className={`flex-1 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-2 overflow-visible min-w-0`}
                style={{ borderColor: 'rgba(255,220,80,0.22)', ...dzStyle('leader') }}
                onDragOver={(e) => { if (isValidDrop('leader')) { e.preventDefault(); setDragOver('leader'); } }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop('leader'); }}
              >
                <div className={P.label}>リーダー</div>
                <div className="flex-1 flex items-center justify-center">
                  <GameCard
                    card={s.leader}
                    tapped={s.leader.tapped}
                    badge={s.leader.donAttached}
                    highlight={selectedCard?.context === 'leader'}
                    onClick={() => handleCardClick(s.leader, 'leader', 'leader')}
                    onDoubleClick={() => handleCardDoubleClick(s.leader)}
                  />
                </div>
                {/* リーダー効果ボタン（リーダーカード幅×1.5・センタリング） */}
                {s.leaderEffect?.hasActiveAbility && (
                  <button onClick={() => setShowLeaderAbilityModal(true)}
                    style={{ width: CARD.W * 1.5 }}
                    className={`py-2.5 rounded-xl font-black text-xs ${P.btnGold} flex items-center justify-center gap-1.5 shadow-lg`}>
                    <Zap size={13}/> 起動メイン効果
                  </button>
                )}
                {s.leaderEffect?.note && !s.leaderEffect?.hasActiveAbility && (
                  <div className="text-[9px] text-amber-500/55 text-center leading-tight px-1 line-clamp-2">
                    {s.leaderEffect.note}
                  </div>
                )}
              </div>

              {/* ステージ（固定幅 — ライフ列と同じ） */}
              <div
                className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1`}
                style={{ width: LEFT_COL_W, borderColor: 'rgba(180,80,220,0.22)', ...dzStyle('stage') }}
                onDragOver={(e) => { if (isValidDrop('stage')) { e.preventDefault(); setDragOver('stage'); } }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop('stage'); }}
              >
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

              {/* デッキ */}
              <div
                className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1`}
                style={{ width: DECK_TRASH_W, borderColor: 'rgba(60,120,220,0.22)', ...dzStyle('deck') }}
                onDragOver={(e) => { if (isValidDrop('deck')) { e.preventDefault(); setDragOver('deck'); } }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop('deck'); }}
              >
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

            {/* 行3 [flex:2]: DON!!デッキ | コストエリア | トラッシュ */}
            <div className="flex gap-1.5 min-h-0" style={{ flex: 2 }}>

              {/* DON!!デッキパネル（行3のみ） */}
              <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center justify-center gap-1 min-h-0`}
                style={{ width: LEFT_COL_W, borderColor: 'rgba(253,224,71,0.25)' }}>
                <div className={P.label}>DON!!デッキ</div>
                <div className="relative">
                  <div className="absolute rounded-lg"
                    style={{
                      width: DON_CARD.W + 6, height: DON_CARD.H + 6,
                      top: 4, left: 4,
                      background: 'linear-gradient(160deg, #3d2a00 0%, #1a1300 100%)',
                      border: '1.5px solid rgba(180,120,10,0.35)',
                    }}/>
                  <div className="relative rounded overflow-hidden"
                    style={{ width: DON_CARD.W + 6, height: DON_CARD.H + 6 }}>
                    <DonCard active={false} onClick={undefined}/>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-amber-600 text-amber-900 text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-amber-400/60 shadow-md">
                    {s.donDeck}
                  </div>
                </div>
                <div className="text-[9px] text-amber-600/60">残{s.donDeck}枚</div>
              </div>

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
                        <DonCard key={`a-${i}`} active={true} onClick={() => game.tapDon(1)}
                          onDragStart={() => setDragInfo({ context: 'don-active' })}
                          onDragEnd={handleDragEnd}
                        />
                      ))
                    : (
                      <div className="flex items-end gap-1.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <DonCard key={i} active={true} onClick={() => game.tapDon(1)}
                            onDragStart={() => setDragInfo({ context: 'don-active' })}
                            onDragEnd={handleDragEnd}
                          />
                        ))}
                        <span className="text-yellow-300 font-black text-sm self-center pb-1">×{s.donActive}</span>
                      </div>
                    )
                  }
                  {s.donActive > 0 && s.donTapped > 0 && (
                    <div className="self-stretch w-px bg-white/15 mx-0.5"/>
                  )}
                  {s.donTapped <= 8
                    ? Array.from({ length: s.donTapped }).map((_, i) => (
                        <DonCard key={`t-${i}`} active={false}
                          onClick={s.subPhase === 'main' ? () => game.activateDon(1) : undefined}
                          title={s.subPhase === 'main' ? 'クリックでアクティブに戻す' : undefined}
                        />
                      ))
                    : (
                      <div className="flex items-end gap-1.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <DonCard key={i} active={false}
                            onClick={s.subPhase === 'main' ? () => game.activateDon(1) : undefined}
                            title={s.subPhase === 'main' ? 'クリックでアクティブに戻す' : undefined}
                          />
                        ))}
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
              <div
                className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1`}
                style={{ width: DECK_TRASH_W, borderColor: 'rgba(200,80,80,0.22)', ...dzStyle('trash') }}
                onDragOver={(e) => { if (isValidDrop('trash')) { e.preventDefault(); setDragOver('trash'); } }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop('trash'); }}
              >
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
              <div className="text-[9px] text-white/30 hidden sm:inline">クリック→操作 / ダブルクリック→効果確認 / ドラッグ→各ゾーンに直接配置</div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 items-end flex-1 justify-center">
              {s.hand.map(card => (
                <HandCard key={card._uid} card={card}
                  selected={selectedCard?.uid === card._uid}
                  onClick={() => handleCardClick(card, 'hand', card._uid)}
                  onDoubleClick={() => handleCardDoubleClick(card)}
                  onDragStart={() => setDragInfo({ card, context: 'hand' })}
                  onDragEnd={handleDragEnd}
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

      {/* ─── フェーズエラートースト ─── */}
      {phaseError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] pointer-events-none">
          <div className="bg-red-950/97 border-2 border-red-500/80 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3 backdrop-blur-sm">
            <span className="text-red-300 text-lg flex-shrink-0">⚠</span>
            <div className="text-red-200 font-bold text-sm">{phaseError}</div>
          </div>
        </div>
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

      {/* ─── キーボードショートカットヒント（右下に配置して手札と被らないように） ─── */}
      <div className="fixed bottom-2 right-2 z-20 pointer-events-none">
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

      {/* ─── 登場時効果モーダル ─── */}
      {pendingEntryEffect && !pendingChainPlay && (
        <EntryEffectModal
          card={pendingEntryEffect}
          game={game}
          onActivate={() => setPendingEntryEffect(null)}
          onSkip={() => setPendingEntryEffect(null)}
          onChainPlay={(action) => setPendingChainPlay(action)}
        />
      )}

      {/* ─── 連鎖効果: 手札/トラッシュからキャラ登場 ─── */}
      {pendingChainPlay && !state?.searchReveal?.length && (
        <PlayFromModal
          source={pendingChainPlay.id === 'playFromHand' ? 'hand' : 'trash'}
          cards={pendingChainPlay.id === 'playFromHand' ? (state?.hand || []) : (state?.trash || [])}
          maxCost={pendingChainPlay.maxCost}
          game={game}
          onDone={() => setPendingChainPlay(null)}
        />
      )}

      {/* ─── アタック時効果モーダル ─── */}
      {pendingAttackEffect && (
        <AttackEffectModal
          card={pendingAttackEffect}
          game={game}
          onActivate={() => setPendingAttackEffect(null)}
          onSkip={() => setPendingAttackEffect(null)}
        />
      )}

      {/* ─── イベント効果モーダル ─── */}
      {pendingEventEffect && (
        <EventEffectModal
          card={pendingEventEffect.card}
          game={game}
          onActivate={() => { game.trashHandCard(pendingEventEffect.uid); setPendingEventEffect(null); }}
          onSkip={() => { game.trashHandCard(pendingEventEffect.uid); setPendingEventEffect(null); }}
        />
      )}

      {/* ─── リーダー効果確認モーダル ─── */}
      {showLeaderAbilityModal && (
        <LeaderAbilityModal
          leaderEffect={s.leaderEffect}
          leaderName={s.leader?.name}
          onConfirm={handleLeaderAbilityConfirm}
          onCancel={() => setShowLeaderAbilityModal(false)}
        />
      )}

      {/* ─── キャラクター選択モーダル ─── */}
      {charSelectInfo && (
        <CharacterSelectModal
          field={s.field}
          info={charSelectInfo}
          onConfirm={handleCharSelectConfirm}
          onCancel={() => setCharSelectInfo(null)}
        />
      )}

      {/* ─── キャラ起動メインモーダル ─── */}
      {pendingCharAbility && (
        <CharActiveModal
          card={pendingCharAbility}
          game={game}
          onActivate={() => setPendingCharAbility(null)}
          onSkip={() => setPendingCharAbility(null)}
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
