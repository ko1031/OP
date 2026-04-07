// ─────────────────────────────────────────────────────────────────────
// BattlePage.jsx — CPU対戦ページ（一人回しレイアウト準拠）
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { Home, Swords, ChevronRight, X, Bot, User, RotateCcw, Anchor, Skull, Zap, Shuffle, Eye } from 'lucide-react';
import PirateMapBg from '../components/PirateMapBg';
import { useBattleState } from '../hooks/useBattleState';
import { loadSavedDecks, resolveSampleDeck, LEADER_EFFECTS } from '../hooks/useGameState';
import { SAMPLE_DECKS } from '../utils/deckRules';
import CardImage from '../components/CardImage';

// ─── カードサイズ定数（一人回しと同じ）─────────────────────────────
const CARD      = { W: 96,  H: 134 };
const HAND_CARD = { W: 76,  H: 107 };
const DECK_CARD = { W: 72,  H: 101 };
const TRASH_CARD= { W: 80,  H: 112 };
const DON_CARD  = { W: 64,  H: 90  };
const DON_MINI  = { W: 46,  H: 64  };
// CPU用（少し縮小）
const CC = { W: 64, H: 90 };

// ─── レイアウト定数（一人回しと同じ）──────────────────────────────
const LEFT_COL_W   = 240;
const DECK_TRASH_W = 248;

const DON_IMG_URL = `${import.meta.env.BASE_URL}don-card.png`;

// ─── カラー定義 ───────────────────────────────────────────────────────
const P = {
  bg:      'bg-[#06091a]',
  panel:   'bg-white/10 border border-white/15',
  label:   'text-[10px] text-amber-300/90 font-bold uppercase tracking-widest',
  btnGold: 'bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-amber-100 font-bold border border-amber-500/60 shadow-md transition-all',
  btnRed:  'bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-red-100 font-bold border border-red-600/50 transition-all',
  btnBlue: 'bg-gradient-to-b from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-blue-100 font-bold border border-blue-600/50 transition-all',
  btnGray: 'bg-[#1a2040] hover:bg-[#232d55] text-amber-200/60 border border-amber-800/30 transition-all',
  btnGreen:'bg-gradient-to-b from-green-700 to-green-900 hover:from-green-600 hover:to-green-800 text-green-100 font-bold border border-green-600/50 transition-all',
};

const PHASES = [
  { id: 'refresh', label: 'リフレッシュ', icon: '🔄' },
  { id: 'draw',    label: 'ドロー',       icon: '📚' },
  { id: 'don',     label: 'DON!!',        icon: '💛' },
  { id: 'main',    label: 'メイン',       icon: '⚔'  },
  { id: 'end',     label: 'エンド',       icon: '⏹'  },
];

// ─── ユーティリティ ───────────────────────────────────────────────────
function hasTrigger(card) { return /【トリガー】/.test(card?.effect || ''); }
// DON!!パワーは自分のターンのみ有効
// ownerTurn: そのカードの持ち主のターンかどうか
function calcPower(card, ownerTurn = true) { return (card?.power || 0) + (ownerTurn ? (card?.donAttached || 0) * 1000 : 0); }

// ─── Stat/Tag helpers ─────────────────────────────────────────────
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

// ─── カード詳細モーダル（一人回しと同じ）─────────────────────────────
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
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-amber-900/30 flex items-center justify-center text-amber-500 hover:bg-amber-800/40"><X size={16}/></button>
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
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── フィールドカード（一人回しGameCard準拠）─────────────────────────
function GameCard({ card, tapped, faceDown, onClick, onDoubleClick, badge, highlight, size = CARD, showPower = false, ownerTurn = true }) {
  const donCount = badge || card?.donAttached || 0;
  const visibleDon = Math.min(donCount, 4);
  const { W, H } = size;
  return (
    <div className="relative flex-shrink-0" style={{ width: W, height: H }}>
      {donCount > 0 && !tapped && Array.from({ length: visibleDon }).map((_, i) => (
        <div key={i} className="absolute rounded-lg overflow-hidden pointer-events-none"
          style={{
            width: DON_MINI.W * (W / CARD.W), height: DON_MINI.H * (W / CARD.W),
            right: (-26 - i * 14) * (W / CARD.W), bottom: (16 + i * 10) * (W / CARD.W),
            zIndex: i + 1, transform: `rotate(${10 + i * 6}deg)`,
            border: '2px solid rgba(253,224,71,0.95)', boxShadow: '2px 4px 10px rgba(0,0,0,0.8)',
          }}>
          <img src={DON_IMG_URL} alt="DON!!" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
        </div>
      ))}
      {donCount > 0 && !tapped && (
        <div className="absolute pointer-events-none rounded-full font-black flex items-center justify-center"
          style={{ right: -4, bottom: 2, zIndex: 20, width: 20, height: 20, fontSize: 10,
            background: '#fbbf24', color: '#1c1a00', border: '2px solid #fde68a', boxShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>
          +{donCount}
        </div>
      )}
      {tapped && donCount > 0 && (
        <div className="absolute pointer-events-none rounded-full font-black flex items-center justify-center"
          style={{ top: 2, left: 2, width: 20, height: 20, zIndex: 20, fontSize: 10,
            background: '#fbbf24', color: '#1c1a00', border: '2px solid #fde68a', boxShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>
          +{donCount}
        </div>
      )}
      <div
        className={`absolute inset-0 cursor-pointer select-none rounded-xl overflow-hidden border-2 transition-all duration-150
          ${tapped ? 'rotate-90 origin-center opacity-75' : ''}
          ${highlight === 'attacker' ? 'border-amber-400 shadow-amber-400/60 shadow-lg scale-105'
            : highlight === 'target' ? 'border-red-500 shadow-red-500/60 shadow-lg scale-105'
            : 'border-white/25'}
          hover:border-amber-400/70 hover:scale-[1.03]`}
        style={{ zIndex: 10, boxShadow: highlight ? undefined : '0 4px 12px rgba(0,0,0,0.5)' }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {faceDown
          ? <div className="w-full h-full bg-gradient-to-br from-red-900/60 to-[#06091a] flex items-center justify-center">
              <span className="text-red-600/70 text-3xl">☠</span>
            </div>
          : <CardImage card={card} className="w-full h-full object-cover" />}
      </div>
      {showPower && card?.power && !faceDown && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 z-20 bg-black/80 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-amber-700/40 whitespace-nowrap">
          {calcPower(card, ownerTurn).toLocaleString()}
        </div>
      )}
    </div>
  );
}

// ─── 空スロット ─────────────────────────────────────────────────────
function EmptySlot({ size = CARD }) {
  return (
    <div style={{ width: size.W, height: size.H }}
      className="rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center flex-shrink-0">
      <Anchor size={14} className="text-white/20" />
    </div>
  );
}

// ─── 手札カード（一人回しHandCard準拠）──────────────────────────────
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
        cursor-pointer`}
      style={{ width: HAND_CARD.W, height: HAND_CARD.H }}
      title={card?.name}
    >
      <CardImage card={card} className="w-full h-full object-cover" />
      {selected && <div className="absolute inset-0 bg-amber-400/10 pointer-events-none" />}
      {card?.cost != null && (
        <div className="absolute top-1 left-1 bg-amber-500 text-gray-900 text-[11px] font-black rounded-full w-6 h-6 flex items-center justify-center shadow-md">
          {card.cost}
        </div>
      )}
      {card?.counter != null && (
        <div className="absolute top-1 right-1 bg-blue-600/90 text-white text-[9px] font-black rounded px-1 shadow">
          +{(card.counter/1000).toFixed(0)}k
        </div>
      )}
      {(card?.trigger || /【トリガー】/.test(card?.effect || '')) && (
        <div className="absolute bottom-1 right-1 text-[8px] bg-yellow-500/90 text-gray-900 font-black rounded px-1">⚡TRG</div>
      )}
    </div>
  );
}

// ─── DON!!カード ────────────────────────────────────────────────────
function DonCard({ active, onClick, onDragStart, onDragEnd }) {
  const canDrag = active && !!onDragStart;
  return (
    <div onClick={active ? onClick : undefined}
      draggable={canDrag}
      onDragStart={canDrag ? (e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); } : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      className={`flex-shrink-0 select-none transition-all duration-150 rounded overflow-hidden
        ${active ? 'cursor-pointer hover:scale-105 hover:brightness-105' : 'opacity-40 cursor-default grayscale brightness-75'}`}
      style={{ width: DON_CARD.W, height: DON_CARD.H, boxShadow: active ? '0 3px 12px rgba(0,0,0,0.6)' : 'none' }}
      title={active ? 'DON!!（ドラッグでアタッチ / クリックでレスト）' : 'DON!!（レスト済み）'}>
      <img src={DON_IMG_URL} alt="DON!!" style={{ width: DON_CARD.W, height: DON_CARD.H, objectFit: 'cover', display: 'block' }} draggable={false} />
    </div>
  );
}

// ─── ライフスタック（一人回しと同じ）────────────────────────────────
function LifeStack({ life, onFlip, size = CARD, label = 'LIFE' }) {
  const offset = 10;
  const totalH = life.length > 0 ? size.H + (life.length - 1) * offset : size.H;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={P.label}>{label}</div>
      <div className="relative cursor-pointer" style={{ height: totalH, width: size.W }}
        onClick={life.length > 0 ? onFlip : undefined} title="クリックでライフをめくる">
        {life.length === 0 ? (
          <div style={{ width: size.W, height: size.H }}
            className="rounded-xl border-2 border-dashed border-red-900/40 flex items-center justify-center">
            <Skull size={20} className="text-red-900/40" />
          </div>
        ) : (
          [...life].map((card, i) => {
            const pos = life.length - 1 - i;
            const isTop = i === 0;
            return (
              <div key={card._uid} className="absolute" style={{ top: pos * offset, left: 0, zIndex: i + 1 }}>
                <div style={{ width: size.W, height: size.H }}
                  className={`rounded-xl border-2 flex items-center justify-center
                    ${isTop
                      ? 'bg-gradient-to-br from-red-900 to-[#1a0505] border-red-700/80 shadow-lg shadow-red-900/50 hover:border-red-400'
                      : 'bg-gradient-to-br from-red-950 to-[#0d0505] border-red-900/40'}`}>
                  <span className="text-red-500/80 text-3xl select-none">☠</span>
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

// ─── フェイズバー ──────────────────────────────────────────────────
function PhaseBar({ subPhase, isMyTurn, onAdvance }) {
  const activeIdx = PHASES.findIndex(p => p.id === subPhase);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {PHASES.map((p, i) => (
          <div key={p.id} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all
              ${i === activeIdx
                ? 'bg-amber-600/35 text-amber-200 border border-amber-500/60 shadow-sm'
                : i < activeIdx ? 'text-amber-900/35 line-through' : 'text-amber-800/50'}`}>
              <span>{p.icon}</span>
              <span className="hidden xl:inline">{p.label}</span>
            </div>
            {i < PHASES.length - 1 && <span className="text-amber-900/25 text-[9px] mx-0.5">›</span>}
          </div>
        ))}
      </div>
      {isMyTurn && (
        <button onClick={onAdvance}
          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-bold ${P.btnGold}`}>
          {subPhase === 'end' ? '次ターン ▶' : '次へ ▶'}
        </button>
      )}
    </div>
  );
}

// ─── StatChip ──────────────────────────────────────────────────────
function StatChip({ icon, value, label, color, onClick }) {
  return (
    <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border bg-[#0d1530]/60 border-amber-900/30
      ${onClick ? 'cursor-pointer hover:bg-amber-900/25 hover:border-amber-700/50' : ''}`}
      title={label} onClick={onClick}>
      <span>{icon}</span>
      <b className={color === 'red' ? 'text-red-400' : 'text-amber-300/80'}>{value}</b>
    </div>
  );
}

// ─── バトルログ ─────────────────────────────────────────────────────
function BattleLog({ logs }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; }, [logs?.length]);
  return (
    <div ref={ref} className="overflow-y-auto text-[10px] space-y-0.5" style={{ maxHeight: 120 }}>
      {(logs || []).map((entry, i) => (
        <div key={entry.ts || i}
          className={`px-2 py-0.5 rounded ${i === 0 ? 'text-amber-200/90 bg-amber-900/15' : 'text-amber-900/60'}`}>
          {entry.msg}
        </div>
      ))}
    </div>
  );
}

// ─── アクションメニュー（一人回しと同じ）─────────────────────────────
function ActionMenu({ card, context, onAction, onClose }) {
  if (!card) return null;
  const actions = [];
  if (context === 'hand') {
    if (card.card_type === 'CHARACTER') actions.push({ id:'play', label:`⚔ フィールドに出す（コスト${card.cost||0}）` });
    if (card.card_type === 'STAGE') actions.push({ id:'stage', label:`🏝 ステージにセット（コスト${card.cost||0}）` });
    if (card.card_type === 'EVENT') actions.push({ id:'event', label:`📜 イベント使用（コスト${card.cost||0}）` });
    actions.push({ id:'deck-top', label:'⬆ デッキトップに戻す' });
    actions.push({ id:'deck-bottom', label:'⬇ デッキボトムに戻す' });
    actions.push({ id:'detail', label:'🔍 効果を確認' });
    actions.push({ id:'trash-hand', label:'🗑 トラッシュ' });
  }
  if (context === 'field') {
    actions.push({ id:'tap', label: card.tapped ? '↩ アンタップ' : '⚔ タップ（アタック）' });
    if (/【起動メイン/.test(card.effect || '')) actions.push({ id:'char-active', label:'⚡ 起動メイン効果を発動' });
    actions.push({ id:'attach-don', label:'💛 DON!!アタッチ +1' });
    if ((card.donAttached||0) > 0) actions.push({ id:'detach-don', label:`💛 DON!!を外す（現在+${card.donAttached}）` });
    actions.push({ id:'deck-top', label:'⬆ デッキトップに戻す' });
    actions.push({ id:'deck-bottom', label:'⬇ デッキボトムに戻す' });
    actions.push({ id:'detail', label:'🔍 効果を確認' });
    actions.push({ id:'trash-field', label:'💀 KO → トラッシュ' });
  }
  if (context === 'leader') {
    actions.push({ id:'tap-leader', label: card.tapped ? '↩ アンタップ' : '⚔ タップ（アタック）' });
    actions.push({ id:'attach-don-leader', label:'💛 DON!!アタッチ +1' });
    if ((card.donAttached||0) > 0) actions.push({ id:'detach-don-leader', label:`💛 DON!!を外す（現在+${card.donAttached}）` });
    actions.push({ id:'detail', label:'🔍 効果を確認' });
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d1530] border border-amber-700/40 rounded-2xl shadow-2xl p-2 min-w-[260px]" onClick={e => e.stopPropagation()}>
        <div className="px-3 py-2 border-b border-amber-900/30 mb-1">
          <div className="text-amber-400 text-xs font-bold truncate">{card.name}</div>
          <div className="text-amber-600/60 text-[10px]">
            {card.card_type}{card.cost != null ? ` • コスト${card.cost}` : ''}{card.power != null ? ` • ${card.power?.toLocaleString()}` : ''}
          </div>
        </div>
        {actions.map(a => (
          <button key={a.id} onClick={() => { onAction(a.id); onClose(); }}
            className="w-full text-left px-3 py-2 text-sm text-amber-100/90 hover:bg-amber-900/30 rounded-lg transition-colors">
            {a.label}
          </button>
        ))}
        <button onClick={onClose} className="w-full text-left px-3 py-1.5 text-xs text-amber-800/60 hover:text-amber-500 transition-colors mt-1">✕ キャンセル</button>
      </div>
    </div>
  );
}

// ─── 効果パーサー（一人回しから移植）─────────────────────────────────
function parseEntryEffect(effectText) {
  if (!effectText) return { entryText: '', autoActions: [] };
  const m = effectText.match(/【登場時】([\s\S]*?)(?=【|$)/);
  const entryText = m ? m[1].trim() : '';
  const autoActions = [];

  // DON!!コスト（ドン‼-N）
  const donCostM = entryText.match(/ドン‼[ーー−-](\d+)/);
  if (donCostM)
    autoActions.push({ id:'donReturn', count: parseInt(donCostM[1]), icon:'💛', label:`DON!!×${donCostM[1]}枚をデッキに戻す（コスト）`, color:'text-yellow-300' });

  // ドロー
  const drawM = entryText.match(/カード(\d+)枚を引/);
  if (drawM && !entryText.includes('場合') && !entryText.includes('ならば') && !entryText.includes('なら'))
    autoActions.push({ id:'draw', count: parseInt(drawM[1]), icon:'📚', label:`${drawM[1]}枚ドロー（自動）`, color:'text-blue-300' });

  // サーチ（デッキトップN枚を見る）
  const searchM = entryText.match(/デッキの上から(\d+)枚/);
  if (searchM)
    autoActions.push({ id:'search', count: parseInt(searchM[1]), icon:'🔍', label:`デッキトップ${searchM[1]}枚サーチ（自動）`, color:'text-purple-300' });

  // 手札からキャラを登場させる
  const playFromHandM = entryText.match(/手札から[^。]*?キャラカード[^。]*?登場させる/);
  if (playFromHandM) {
    // パワーやコスト制限を抽出
    const powerLimitM = entryText.match(/パワー(\d+)以下/);
    const costLimitM = entryText.match(/コスト(\d+)以下/);
    const limit = powerLimitM ? { type:'power', value: parseInt(powerLimitM[1]) }
                : costLimitM  ? { type:'cost',  value: parseInt(costLimitM[1]) } : null;
    const limitLabel = limit ? (limit.type === 'power' ? `パワー${limit.value}以下` : `コスト${limit.value}以下`) : '';
    autoActions.push({ id:'playFromHand', limit, icon:'⚔', label:`手札から${limitLabel}キャラを登場（選択）`, color:'text-green-300' });
  }

  // トラッシュからキャラを登場させる
  const playFromTrashM = entryText.match(/トラッシュから[^。]*?キャラカード[^。]*?登場させる/);
  if (playFromTrashM) {
    const costLimitM = entryText.match(/コスト(\d+)以下/);
    const limit = costLimitM ? { type:'cost', value: parseInt(costLimitM[1]) } : null;
    const limitLabel = limit ? `コスト${limit.value}以下` : '';
    autoActions.push({ id:'playFromTrash', limit, icon:'💀', label:`トラッシュから${limitLabel}キャラを登場（選択）`, color:'text-pink-300' });
  }

  // 相手キャラをレストにする
  const restM = entryText.match(/相手.*?レストにする|レストにする.*?相手/);
  if (restM)
    autoActions.push({ id:'restOpponent', icon:'💤', label:'相手キャラをレスト（選択）', color:'text-orange-400' });

  // 相手キャラをKO
  const koM = entryText.match(/相手.*?KOする|KOする.*?相手|コスト\d+以下.*?KOする/);
  if (koM)
    autoActions.push({ id:'koOpponent', icon:'💀', label:'相手キャラをKO（選択）', color:'text-red-400' });

  // 相手キャラをデッキ下へ
  const deckBotEntryM = entryText.match(/相手.*?デッキの下|デッキの下.*?相手/);
  if (deckBotEntryM)
    autoActions.push({ id:'deckBottomOpponent', icon:'⬇️', label:'相手キャラをデッキ下へ（選択）', color:'text-purple-400' });

  // ライフに加える
  const lifeAddM = entryText.match(/ライフの上に加える/);
  if (lifeAddM)
    autoActions.push({ id:'addLife', icon:'❤️', label:'デッキトップ1枚をライフに追加（自動）', color:'text-red-300' });

  // 速攻を得る
  const rushM = entryText.match(/【速攻】を得る/);
  if (rushM)
    autoActions.push({ id:'info', icon:'⚡', label:'速攻を得る（このターンアタック可能）', color:'text-yellow-300' });

  return { entryText: entryText || effectText, autoActions };
}

function parseAttackEffect(card) {
  const effectText = card?.effect || '';
  const match = effectText.match(/【アタック時】([\s\S]*?)(?=【|$)/);
  if (!match) return { attackText: null, autoActions: [] };
  const attackText = match[0].trim();
  const body = match[1].trim();
  const autoActions = [];
  const drawM = body.match(/カード(\d+)枚を引く/);
  if (drawM && !body.includes('場合') && !body.includes('ならば') && !body.includes('なら'))
    autoActions.push({ id:'draw', count: parseInt(drawM[1]), icon:'📚', label:`${drawM[1]}枚ドロー（自動）`, color:'text-blue-300' });
  const donCostM = body.match(/ドン‼[ーー−-](\d+)/);
  if (donCostM)
    autoActions.push({ id:'donReturn', count: parseInt(donCostM[1]), icon:'💛', label:`DON!!×${donCostM[1]}枚をデッキに戻す`, color:'text-yellow-300' });
  const searchM = body.match(/デッキの上から(\d+)枚/);
  if (searchM)
    autoActions.push({ id:'search', count: parseInt(searchM[1]), icon:'🔍', label:`デッキトップ${searchM[1]}枚サーチ（自動）`, color:'text-purple-300' });
  // 相手キャラをKO
  const koM = body.match(/相手.*?KOする|KOする.*?相手|コスト\d+以下.*?KOする/);
  if (koM)
    autoActions.push({ id:'koOpponent', icon:'💀', label:'相手キャラをKO（選択）', color:'text-red-400' });
  // 相手キャラをレスト
  const restM = body.match(/相手.*?レストにする|レストにする.*?相手/);
  if (restM)
    autoActions.push({ id:'restOpponent', icon:'💤', label:'相手キャラをレスト（選択）', color:'text-orange-400' });
  // 相手キャラをデッキ下へ
  const deckBotM = body.match(/相手.*?デッキの下|デッキの下.*?相手/);
  if (deckBotM)
    autoActions.push({ id:'deckBottomOpponent', icon:'⬇️', label:'相手キャラをデッキ下へ（選択）', color:'text-purple-400' });
  // パワー変更（一時的）→ 手動
  const powerM = body.match(/パワー[をが]?[ー−\-+＋]?\d+|パワー\d+(?:上げ|下げ|アップ|ダウン)/);
  if (powerM)
    autoActions.push({ id:'info', icon:'⚡', label:'パワー変更（ゲームボードで手動操作）', color:'text-gray-400' });
  // レストDON!!付与 → 手動
  const restDonM = body.match(/ドン!!.*?レスト.*?付与|レスト.*?ドン!!.*?付与/);
  if (restDonM)
    autoActions.push({ id:'info', icon:'💛', label:'レストDON!!付与（ゲームボードで手動操作）', color:'text-gray-400' });
  return { attackText, autoActions };
}

function parseEventEffect(card) {
  const effectText = card?.effect || '';
  const autoActions = [];
  const drawM = effectText.match(/カード(\d+)枚を引く/);
  if (drawM && !effectText.includes('場合') && !effectText.includes('ならば') && !effectText.includes('なら'))
    autoActions.push({ id:'draw', count: parseInt(drawM[1]), icon:'📚', label:`${drawM[1]}枚ドロー（自動）`, color:'text-blue-300' });
  const donCostM = effectText.match(/ドン‼[ーー−-](\d+)/);
  if (donCostM)
    autoActions.push({ id:'donReturn', count: parseInt(donCostM[1]), icon:'💛', label:`DON!!×${donCostM[1]}枚をデッキに戻す（コスト）`, color:'text-yellow-300' });
  const searchM = effectText.match(/デッキの上から(\d+)枚/);
  if (searchM)
    autoActions.push({ id:'search', count: parseInt(searchM[1]), icon:'🔍', label:`デッキトップ${searchM[1]}枚サーチ（自動）`, color:'text-purple-300' });
  // 相手キャラをKO
  const koM = effectText.match(/相手.*?KOする|KOする.*?相手|コスト\d+以下.*?KOする/);
  if (koM)
    autoActions.push({ id:'koOpponent', icon:'💀', label:'相手キャラをKO（選択）', color:'text-red-400' });
  // 相手キャラをレスト
  const restM = effectText.match(/相手.*?レストにする|レストにする.*?相手/);
  if (restM)
    autoActions.push({ id:'restOpponent', icon:'💤', label:'相手キャラをレスト（選択）', color:'text-orange-400' });
  // 相手キャラをデッキ下へ
  const deckBotM = effectText.match(/相手.*?デッキの下|デッキの下.*?相手/);
  if (deckBotM)
    autoActions.push({ id:'deckBottomOpponent', icon:'⬇️', label:'相手キャラをデッキ下へ（選択）', color:'text-purple-400' });
  return { effectText, autoActions };
}

function parseActiveAbility(card) {
  const effectText = card?.effect || '';
  const match = effectText.match(/【起動メイン[^】]*】([\s\S]*?)(?=【|$)/);
  if (!match) return { abilityText: null, autoActions: [] };
  const abilityText = match[0].trim();
  const body = match[1].trim();
  const autoActions = [];
  const drawM = body.match(/カード(\d+)枚を引く/);
  if (drawM && !body.includes('場合') && !body.includes('ならば'))
    autoActions.push({ id:'draw', count: parseInt(drawM[1]), icon:'📚', label:`${drawM[1]}枚ドロー（自動）`, color:'text-blue-300' });
  const donRetM = body.match(/ドン‼[ーー−-](\d+)/);
  if (donRetM)
    autoActions.push({ id:'donReturn', count: parseInt(donRetM[1]), icon:'💛', label:`DON!!×${donRetM[1]}枚をデッキに戻す`, color:'text-yellow-300' });
  const searchM = body.match(/デッキの上から(\d+)枚/);
  if (searchM)
    autoActions.push({ id:'search', count: parseInt(searchM[1]), icon:'🔍', label:`デッキトップ${searchM[1]}枚サーチ`, color:'text-purple-300' });
  // ブロッカーを得る（このキャラに付与）
  const blockerM = body.match(/【ブロッカー】を与える|ブロッカー.*?を得る|このキャラに.*?ブロッカー/);
  if (blockerM)
    autoActions.push({ id:'giveBlocker', icon:'🛡', label:'このキャラに【ブロッカー】を付与（自動）', color:'text-cyan-300' });
  // 手札を1枚捨てる
  const discardM = body.match(/手札.*?1枚.*?捨てる|あなたは手札.*?捨てる/);
  if (discardM)
    autoActions.push({ id:'discardHand', icon:'🗑️', label:'手札1枚を捨てる（選択）', color:'text-gray-300' });
  // 相手キャラをKO
  const koM = body.match(/相手.*?KOする|KOする.*?相手|コスト\d+以下.*?KOする/);
  if (koM)
    autoActions.push({ id:'koOpponent', icon:'💀', label:'相手キャラをKO（選択）', color:'text-red-400' });
  // 相手キャラをレスト
  const restM = body.match(/相手.*?レストにする|レストにする.*?相手/);
  if (restM)
    autoActions.push({ id:'restOpponent', icon:'💤', label:'相手キャラをレスト（選択）', color:'text-orange-400' });
  // 相手キャラをデッキ下へ
  const deckBotM = body.match(/相手.*?デッキの下|デッキの下.*?相手/);
  if (deckBotM)
    autoActions.push({ id:'deckBottomOpponent', icon:'⬇️', label:'相手キャラをデッキ下へ（選択）', color:'text-purple-400' });
  return { abilityText, autoActions };
}

// ─── 効果からキャラ登場選択モーダル ──────────────────────────────────
function PlayFromModal({ source, cards, limit, game, onDone }) {
  // source: 'hand' or 'trash'
  const filtered = cards.filter(c => {
    if (c.card_type !== 'CHARACTER') return false;
    if (!limit) return true;
    if (limit.type === 'power') return (c.power || 0) <= limit.value;
    if (limit.type === 'cost') return (c.cost || 0) <= limit.value;
    return true;
  });
  const limitLabel = limit ? (limit.type === 'power' ? `パワー${limit.value}以下` : `コスト${limit.value}以下`) : '';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-green-600/40 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-5">
        <div className="text-center mb-3">
          <div className="text-green-400 font-black text-base mb-1">
            ⚔ {source === 'hand' ? '手札' : 'トラッシュ'}からキャラを登場
          </div>
          {limitLabel && <div className="text-green-300/60 text-xs">対象: {limitLabel}のキャラカード</div>}
        </div>
        {filtered.length > 0 ? (
          <div className="flex gap-3 flex-wrap justify-center mb-4 max-h-[40vh] overflow-y-auto">
            {filtered.map(card => (
              <div key={card._uid} className="flex flex-col items-center gap-1 cursor-pointer group"
                onClick={() => {
                  if (source === 'hand') game.playerPlayFromHandFree(card._uid);
                  else game.playerPlayFromTrashFree(card._uid);
                  onDone();
                }}>
                <div className="rounded-xl overflow-hidden border-2 border-green-500/50 group-hover:border-green-400 group-hover:scale-105 transition-all"
                  style={{ width: 80, height: 112 }}>
                  <CardImage card={card} className="w-full h-full object-cover" />
                </div>
                <div className="text-[9px] text-green-300/80 text-center max-w-[90px] truncate">{card.name}</div>
                <div className="text-[8px] text-green-400/50">
                  {card.cost != null ? `C${card.cost}` : ''} {card.power ? `P${card.power}` : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-amber-600/50 text-sm py-4">対象のキャラカードがありません</div>
        )}
        <button onClick={onDone} className={`w-full py-2.5 rounded-xl text-sm font-black ${P.btnGray}`}>スキップ（登場させない）</button>
      </div>
    </div>
  );
}

// ─── 効果で相手キャラを対象選択するモーダル ───────────────────────────
function CpuCharTargetModal({ cpuField, action, onConfirm, onCancel }) {
  const actionLabel = action === 'koOpponent' ? 'KO' : action === 'restOpponent' ? 'レスト' : 'デッキ下へ送る';
  const borderColor = action === 'koOpponent' ? 'border-red-600/40' : action === 'restOpponent' ? 'border-orange-600/40' : 'border-purple-600/40';
  const titleColor = action === 'koOpponent' ? 'text-red-400' : action === 'restOpponent' ? 'text-orange-400' : 'text-purple-400';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className={`bg-[#0a0f24] border ${borderColor} rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-5`}>
        <div className="text-center mb-3">
          <div className={`${titleColor} font-black text-base mb-1`}>
            💀 相手キャラを選択 → {actionLabel}
          </div>
          <div className="text-amber-600/50 text-xs">対象となるCPUキャラクターをクリックしてください</div>
        </div>
        {cpuField.length > 0 ? (
          <div className="flex gap-3 flex-wrap justify-center mb-4 max-h-[40vh] overflow-y-auto">
            {cpuField.map(card => (
              <div key={card._uid} className="flex flex-col items-center gap-1 cursor-pointer group"
                onClick={() => onConfirm(card._uid)}>
                <div className={`rounded-xl overflow-hidden border-2 border-red-500/50 group-hover:border-red-400 group-hover:scale-105 transition-all`}
                  style={{ width: 80, height: 112 }}>
                  <CardImage card={card} className="w-full h-full object-cover" />
                </div>
                <div className="text-[9px] text-red-300/80 text-center max-w-[90px] truncate">{card.name}</div>
                <div className="text-[8px] text-red-400/50">{card.power ? `P${card.power.toLocaleString()}` : ''}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-amber-600/50 text-sm py-6">相手フィールドにキャラクターがいません</div>
        )}
        <button onClick={onCancel} className={`w-full py-2.5 rounded-xl text-sm font-black ${P.btnGray}`}>キャンセル（効果不発）</button>
      </div>
    </div>
  );
}

// ─── 手札1枚捨てるモーダル（効果コスト）──────────────────────────────
function DiscardHandModal({ hand, onDiscard, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-gray-600/40 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-5">
        <div className="text-center mb-3">
          <div className="text-gray-300 font-black text-base mb-1">🗑️ 手札を1枚捨てる</div>
          <div className="text-gray-400/60 text-xs">捨てるカードを選んでください（効果コスト）</div>
        </div>
        {hand.length > 0 ? (
          <div className="flex gap-3 flex-wrap justify-center mb-4 max-h-[40vh] overflow-y-auto">
            {hand.map(card => (
              <div key={card._uid} className="flex flex-col items-center gap-1 cursor-pointer group"
                onClick={() => onDiscard(card._uid)}>
                <div className="rounded-xl overflow-hidden border-2 border-gray-500/50 group-hover:border-red-400 group-hover:scale-105 transition-all"
                  style={{ width: 80, height: 112 }}>
                  <CardImage card={card} className="w-full h-full object-cover" />
                </div>
                <div className="text-[9px] text-gray-300/80 text-center max-w-[90px] truncate">{card.name}</div>
                <div className="text-[8px] text-gray-500/50">
                  {card.card_type === 'CHARACTER' ? `C${card.cost ?? ''}` : card.card_type === 'EVENT' ? 'EVT' : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-amber-600/50 text-sm py-6">手札にカードがありません</div>
        )}
        <button onClick={onCancel} className={`w-full py-2.5 rounded-xl text-sm font-black ${P.btnGray}`}>スキップ</button>
      </div>
    </div>
  );
}

// ─── 効果モーダル（登場時）──────────────────────────────────────────
function EntryEffectModal({ card, onActivate, onSkip, game, onChainPlay }) {
  const { entryText, autoActions } = parseEntryEffect(card?.effect || '');
  const handleActivate = () => {
    // 即時自動実行アクション
    autoActions.forEach(a => {
      if (a.id === 'draw') game.playerDraw(a.count);
      if (a.id === 'donReturn') game.playerReturnDonToDeckPriority(a.count);
      if (a.id === 'search') game.playerBeginSearch(a.count);
      if (a.id === 'addLife') game.playerAddLife();
    });
    // 連鎖効果（手札/トラッシュから登場 または 相手キャラ対象効果）
    const chainPlay = autoActions.find(a =>
      a.id === 'playFromHand' || a.id === 'playFromTrash' ||
      a.id === 'koOpponent' || a.id === 'restOpponent' || a.id === 'deckBottomOpponent'
    );
    if (chainPlay && onChainPlay) {
      onChainPlay(chainPlay);
    }
    onActivate();
  };
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm" onClick={onSkip}>
      <div className="bg-[#0a0f24] border border-amber-600/45 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-amber-900/30">
          <div className="w-9 h-9 rounded-full bg-amber-800/40 border border-amber-600/40 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-300 text-base">⚡</span>
          </div>
          <div>
            <div className="text-[9px] text-amber-600/60 uppercase tracking-widest">登場時効果</div>
            <div className="text-amber-100 font-black text-sm leading-tight">{card?.name}</div>
          </div>
        </div>
        <div className="bg-[#0d1530]/80 rounded-xl p-3 border border-amber-900/25 mb-3">
          <div className="text-[9px] text-amber-600/50 uppercase tracking-wider mb-1.5">【登場時】</div>
          <div className="text-amber-100/90 text-[11px] leading-relaxed whitespace-pre-line">{entryText}</div>
        </div>
        {autoActions.length > 0 ? (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5">⚙ 「発動する」で自動実行</div>
            {autoActions.map(a => (<div key={a.id} className={`flex items-center gap-1.5 text-[11px] ${a.color}`}><span>{a.icon}</span><span>{a.label}</span></div>))}
          </div>
        ) : (
          <div className="bg-amber-900/15 border border-amber-800/25 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-amber-600/60">⚠ この効果はゲームボードで手動操作が必要です。</div>
          </div>
        )}
        <div className="flex gap-2.5">
          <button onClick={onSkip} className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20 transition-all">発動しない</button>
          <button onClick={handleActivate} className={`flex-1 py-2 rounded-xl text-sm font-black ${P.btnGold}`}>⚡ 発動する</button>
        </div>
      </div>
    </div>
  );
}

// ─── 効果モーダル（アタック時）─────────────────────────────────────
function AttackEffectModal({ card, onActivate, onSkip, game, onChainPlay }) {
  const { attackText, autoActions } = parseAttackEffect(card);
  if (!attackText) return null;
  const handleActivate = () => {
    autoActions.forEach(a => {
      if (a.id === 'draw') game.playerDraw(a.count);
      if (a.id === 'donReturn') game.playerReturnDonToDeckPriority(a.count);
      if (a.id === 'search') game.playerBeginSearch(a.count);
    });
    // 相手キャラ対象効果があれば連鎖
    const targetAction = autoActions.find(a =>
      a.id === 'koOpponent' || a.id === 'restOpponent' || a.id === 'deckBottomOpponent'
    );
    if (targetAction && onChainPlay) onChainPlay(targetAction);
    onActivate();
  };
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm" onClick={onSkip}>
      <div className="bg-[#0a0f24] border border-red-600/45 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-red-900/30">
          <div className="w-9 h-9 rounded-full bg-red-800/40 border border-red-600/40 flex items-center justify-center flex-shrink-0">⚔</div>
          <div>
            <div className="text-[9px] text-red-600/60 uppercase tracking-widest">アタック時効果</div>
            <div className="text-amber-100 font-black text-sm leading-tight">{card?.name}</div>
          </div>
        </div>
        <div className="bg-[#0d1530]/80 rounded-xl p-3 border border-red-900/25 mb-3">
          <div className="text-amber-100/90 text-[11px] leading-relaxed whitespace-pre-line">{attackText}</div>
        </div>
        {autoActions.length > 0 && (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5">⚙ 自動実行</div>
            {autoActions.map(a => (<div key={a.id} className={`flex items-center gap-1.5 text-[11px] ${a.color}`}><span>{a.icon}</span><span>{a.label}</span></div>))}
          </div>
        )}
        <div className="flex gap-2.5">
          <button onClick={onSkip} className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20">発動しない</button>
          <button onClick={handleActivate} className={`flex-1 py-2 rounded-xl text-sm font-black ${P.btnRed}`}>⚔ 発動する</button>
        </div>
      </div>
    </div>
  );
}

// ─── 効果モーダル（イベント）───────────────────────────────────────
function EventEffectModal({ card, onActivate, onSkip, game, onChainPlay }) {
  const { effectText, autoActions } = parseEventEffect(card);
  const handleActivate = () => {
    autoActions.forEach(a => {
      if (a.id === 'draw') game.playerDraw(a.count);
      if (a.id === 'donReturn') game.playerReturnDonToDeckPriority(a.count);
      if (a.id === 'search') game.playerBeginSearch(a.count);
    });
    // 相手キャラ対象効果があれば連鎖
    const targetAction = autoActions.find(a =>
      a.id === 'koOpponent' || a.id === 'restOpponent' || a.id === 'deckBottomOpponent'
    );
    if (targetAction && onChainPlay) onChainPlay(targetAction);
    onActivate();
  };
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm" onClick={onSkip}>
      <div className="bg-[#0a0f24] border border-blue-600/45 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-blue-900/30">
          <div className="w-9 h-9 rounded-full bg-blue-800/40 border border-blue-600/40 flex items-center justify-center flex-shrink-0">📜</div>
          <div>
            <div className="text-[9px] text-blue-600/60 uppercase tracking-widest">イベント効果</div>
            <div className="text-amber-100 font-black text-sm leading-tight">{card?.name}</div>
          </div>
        </div>
        <div className="bg-[#0d1530]/80 rounded-xl p-3 border border-blue-900/25 mb-3">
          <div className="text-amber-100/90 text-[11px] leading-relaxed whitespace-pre-line">{effectText || '（効果テキストなし）'}</div>
        </div>
        {autoActions.length > 0 && (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5">⚙ 自動実行</div>
            {autoActions.map(a => (<div key={a.id} className={`flex items-center gap-1.5 text-[11px] ${a.color}`}><span>{a.icon}</span><span>{a.label}</span></div>))}
          </div>
        )}
        <div className="flex gap-2.5">
          <button onClick={onSkip} className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20">効果なしで使用</button>
          <button onClick={handleActivate} className={`flex-1 py-2 rounded-xl text-sm font-black ${P.btnBlue}`}>📜 発動する</button>
        </div>
      </div>
    </div>
  );
}

// ─── CharacterSelectModal（リーダー能力キャラ選択）────────────────────
function CharacterSelectModal({ field, info, onConfirm, onCancel }) {
  const [chosen, setChosen] = useState([]);
  const { mode, maxSelect, donPerChar, label } = info;
  const toggle = (uid) => {
    if (mode === 'single') { setChosen([uid]); }
    else { chosen.includes(uid) ? setChosen(c => c.filter(id => id !== uid)) : chosen.length < maxSelect && setChosen(c => [...c, uid]); }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[#0a0f24] border border-amber-600/45 rounded-2xl shadow-2xl p-5 max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-amber-900/30">
          <div className="w-9 h-9 rounded-full bg-amber-800/40 border border-amber-600/40 flex items-center justify-center flex-shrink-0"><span className="text-amber-300 text-base">⚡</span></div>
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
                  {sel && <div className="absolute inset-0 bg-amber-400/25 flex items-center justify-center"><span className="text-amber-200 font-black text-3xl drop-shadow-lg">✓</span></div>}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-1 pt-3">
                    <span className="text-[9px] text-amber-200 font-bold truncate block">{card.name}</span>
                  </div>
                  {(card.donAttached||0) > 0 && <div className="absolute top-1 right-1 bg-amber-500 text-gray-900 text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">+{card.donAttached}</div>}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20 transition-all">キャンセル</button>
          <button onClick={() => chosen.length > 0 && onConfirm(chosen, donPerChar)} disabled={chosen.length === 0}
            className="flex-1 py-2 rounded-xl text-sm font-black bg-gradient-to-b from-amber-600 to-amber-800 border border-amber-500/60 text-amber-100 hover:from-amber-500 shadow-md disabled:opacity-40 transition-all">
            ⚡ 確定（{chosen.length}枚）
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LeaderAbilityModal（リーダー起動メイン効果確認）────────────────
function LeaderAbilityModal({ leaderEffect, leaderName, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[58] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[#0a0f24] border border-amber-600/45 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-amber-900/30">
          <div className="w-9 h-9 rounded-full bg-amber-800/40 border border-amber-600/40 flex items-center justify-center flex-shrink-0"><Zap size={16} className="text-amber-300"/></div>
          <div>
            <div className="text-[9px] text-amber-600/60 uppercase tracking-widest">起動メイン効果</div>
            <div className="text-amber-100 font-black text-sm leading-tight">{leaderName}</div>
          </div>
        </div>
        {leaderEffect.note && <div className="bg-amber-900/20 rounded-xl p-3 border border-amber-800/25 mb-3"><div className="text-amber-200/80 text-[10px] leading-relaxed">{leaderEffect.note}</div></div>}
        {leaderEffect.activeAbility && <div className="bg-[#131d45]/70 rounded-xl p-3 border border-amber-900/20 mb-4"><div className="text-[9px] text-amber-600/50 uppercase tracking-wider mb-1">効果</div><div className="text-amber-100/90 text-[11px] leading-relaxed">{leaderEffect.activeAbility}</div></div>}
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20 transition-all">キャンセル</button>
          <button onClick={onConfirm} className={`flex-1 py-2 rounded-xl text-sm font-black ${P.btnGold}`}>⚡ 発動する</button>
        </div>
      </div>
    </div>
  );
}

// ─── CharActiveModal（キャラ起動メイン効果）─────────────────────────
function CharActiveModal({ card, onActivate, onSkip, game, onChainPlay }) {
  const { abilityText, autoActions } = parseActiveAbility(card);
  if (!abilityText) return null;
  const handleActivate = () => {
    autoActions.forEach(a => {
      if (a.id === 'draw')        game.playerDraw(a.count);
      if (a.id === 'donReturn')   game.playerReturnDonToDeckPriority(a.count);
      if (a.id === 'search')      game.playerBeginSearch(a.count);
      if (a.id === 'giveBlocker') game.playerGiveCharBlocker(card._uid); // このキャラに付与
    });
    // 連鎖: 手札を捨てる or 相手キャラ対象効果
    const discardAction = autoActions.find(a => a.id === 'discardHand');
    const targetAction  = autoActions.find(a => a.id === 'koOpponent' || a.id === 'restOpponent' || a.id === 'deckBottomOpponent');
    if (discardAction && onChainPlay) onChainPlay(discardAction);
    else if (targetAction && onChainPlay) onChainPlay(targetAction);
    onActivate();
  };
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm" onClick={onSkip}>
      <div className="bg-[#0a0f24] border border-amber-600/45 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-amber-900/30">
          <div className="w-9 h-9 rounded-full bg-amber-800/40 border border-amber-600/40 flex items-center justify-center flex-shrink-0"><Zap size={15} className="text-amber-300"/></div>
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
            {autoActions.map(a => (<div key={a.id} className={`flex items-center gap-1.5 text-[11px] ${a.color}`}><span>{a.icon}</span><span>{a.label}</span></div>))}
          </div>
        ) : (
          <div className="bg-amber-900/15 border border-amber-800/25 rounded-xl px-3 py-2 mb-3">
            <div className="text-[9px] text-amber-600/60">⚠ この効果はゲームボードで手動操作が必要です。</div>
          </div>
        )}
        <div className="flex gap-2.5">
          <button onClick={onSkip} className="flex-1 py-2 rounded-xl border border-amber-800/40 text-amber-600/70 text-sm hover:bg-amber-900/20 transition-all">発動しない</button>
          <button onClick={handleActivate} className={`flex-1 py-2 rounded-xl text-sm font-black ${P.btnGold}`}>⚡ 発動する</button>
        </div>
      </div>
    </div>
  );
}

// ─── LeaderEffectBadge（リーダー効果バッジ）─────────────────────────
function LeaderEffectBadge({ leaderEffect, leaderName, onUseAbility }) {
  const [open, setOpen] = useState(false);
  if (!leaderEffect?.note && !leaderEffect?.hasActiveAbility && !leaderEffect?.hasOpponentAttackAbility) return null;
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
          {leaderEffect.note && <div className="text-amber-200/80 text-[10px] leading-relaxed mb-2 bg-amber-900/20 rounded-lg p-2">{leaderEffect.note}</div>}
          {leaderEffect.activeAbility && <div className="text-amber-300/70 text-[10px] leading-relaxed mb-2 bg-[#131d45]/60 rounded-lg p-2">{leaderEffect.activeAbility}</div>}
          {leaderEffect.opponentAttackAbility && (
            <div className="text-cyan-300/70 text-[10px] leading-relaxed mb-2 bg-cyan-900/20 rounded-lg p-2">
              🌊 相手アタック時: {leaderEffect.opponentAttackAbility}
            </div>
          )}
          {leaderEffect.hasActiveAbility && onUseAbility && (
            <button onClick={() => { onUseAbility(); setOpen(false); }} className={`w-full text-[10px] px-2 py-1.5 rounded-lg font-bold mt-1 ${P.btnGold}`}>
              ⚡ 起動メイン効果を発動
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── サーチモーダル ─────────────────────────────────────────────────
function SearchModal({ revealed, onResolve, onCancel }) {
  const [dest, setDest] = useState(() => Object.fromEntries(revealed.map(c => [c._uid, null])));
  const [topOrder, setTopOrder] = useState([]);
  const allAssigned = revealed.every(c => dest[c._uid] !== null);
  const setCardDest = (uid, newDest) => {
    setDest(p => ({ ...p, [uid]: newDest }));
    if (newDest === 'top') setTopOrder(p => p.includes(uid) ? p : [uid, ...p]);
    else setTopOrder(p => p.filter(id => id !== uid));
  };
  const setAllDest = (d) => {
    const nd = {}; revealed.forEach(c => { nd[c._uid] = d; }); setDest(nd);
    setTopOrder(d === 'top' ? revealed.map(c => c._uid).reverse() : []);
  };
  const handleConfirm = () => {
    onResolve({
      toHand: revealed.filter(c => dest[c._uid] === 'hand').map(c => c._uid),
      toDeckTop: topOrder,
      toDeckBottom: revealed.filter(c => dest[c._uid] === 'bottom').map(c => c._uid),
    });
  };
  const destColor = { hand:'bg-emerald-700/70 border-emerald-500/70 text-emerald-100', top:'bg-blue-700/70 border-blue-500/70 text-blue-100', bottom:'bg-purple-700/70 border-purple-500/70 text-purple-100', null:'bg-amber-900/30 border-amber-700/40 text-amber-400/60' };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-amber-700/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-900/30">
          <div className="text-amber-400 font-black text-base">🔍 サーチ効果</div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-amber-900/30 flex items-center justify-center text-amber-500"><X size={15}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-4 justify-center">
            {revealed.map(card => {
              const d = dest[card._uid];
              return (
                <div key={card._uid} className="flex flex-col items-center gap-2">
                  <div className={`rounded-lg overflow-hidden border-2 transition-all ${
                    d === 'hand' ? 'border-emerald-500 shadow-emerald-500/40 shadow-lg' :
                    d === 'top' ? 'border-blue-500 shadow-blue-500/40 shadow-lg' :
                    d === 'bottom' ? 'border-purple-500 shadow-purple-500/40 shadow-lg' : 'border-amber-700/30'
                  }`} style={{ width: CARD.W, height: CARD.H }}>
                    <CardImage card={card} style={{ width: CARD.W, height: CARD.H }}/>
                  </div>
                  <div className="flex gap-1">
                    {[['hand','手札'],['top','上'],['bottom','下']].map(([k,l])=>(
                      <button key={k} onClick={() => setCardDest(card._uid, d === k ? null : k)}
                        className={`text-[10px] px-2 py-1 rounded-lg border font-bold transition-all ${d === k ? destColor[k] : 'bg-black/30 border-amber-900/30 text-amber-600/60'}`}>{l}</button>
                    ))}
                  </div>
                  <div className="text-[9px] text-amber-500/60 text-center max-w-[110px] truncate">{card.name}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2 px-5 py-3 border-t border-amber-900/30">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-600/50 flex-shrink-0">一括：</span>
            <button onClick={() => setAllDest('hand')} className="text-[10px] px-3 py-1 rounded-lg border font-bold bg-emerald-900/40 border-emerald-700/50 text-emerald-200">全て手札</button>
            <button onClick={() => setAllDest('bottom')} className="text-[10px] px-3 py-1 rounded-lg border font-bold bg-purple-900/40 border-purple-700/50 text-purple-200">全てデッキ下</button>
            <button onClick={() => setAllDest('top')} className="text-[10px] px-3 py-1 rounded-lg border font-bold bg-blue-900/40 border-blue-700/50 text-blue-200">全てデッキ上</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-amber-600/50 flex-1">
              {revealed.filter(c=>dest[c._uid]===null).length > 0 ? `⚠ あと ${revealed.filter(c=>dest[c._uid]===null).length} 枚未選択` : '✓ 全て選択済み'}
            </div>
            <button onClick={onCancel} className="text-xs px-4 py-2 rounded-xl border border-amber-800/40 text-amber-600/70">キャンセル</button>
            <button onClick={handleConfirm} disabled={!allAssigned}
              className={`text-xs px-5 py-2 rounded-xl font-black border transition-all ${allAssigned ? P.btnGold : 'bg-black/20 border-amber-900/20 text-amber-900/30 cursor-not-allowed'}`}>✓ 決定</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── トラッシュモーダル ─────────────────────────────────────────────
function TrashModal({ trash, onAction, onClose }) {
  const [sel, setSel] = useState(null);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-amber-700/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-900/30">
          <div className="text-amber-400 font-black text-base">🗑 トラッシュ ({trash.length}枚)</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-amber-900/30 flex items-center justify-center text-amber-500"><X size={15}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {trash.length === 0 ? (
            <div className="text-amber-600/50 text-sm text-center py-4">トラッシュは空です</div>
          ) : (
            <div className="flex flex-wrap gap-3 justify-start">
              {[...trash].reverse().map(card => (
                <div key={card._uid} className="flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => setSel(sel?._uid === card._uid ? null : card)}>
                  <div className={`rounded-xl overflow-hidden border-2 transition-all ${sel?._uid===card._uid ? 'border-amber-500 scale-105' : 'border-amber-900/30'}`}
                    style={{ width: 80, height: 112 }}>
                    <CardImage card={card} style={{ width:80, height:112 }}/>
                  </div>
                  <div className="text-[8px] text-amber-700/50 text-center max-w-[80px] truncate">{card.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {sel && (
          <div className="border-t border-amber-900/30 px-5 py-3 flex items-center gap-3 bg-[#080c20]/60">
            <div className="text-amber-300 text-sm font-bold flex-1 truncate">{sel.name}</div>
            <button onClick={() => { onAction('trash-to-hand', sel._uid); setSel(null); }} className={`text-xs px-3 py-1.5 rounded-lg font-bold ${P.btnGold}`}>✋ 手札へ</button>
            <button onClick={() => { onAction('trash-to-deck-top', sel._uid); setSel(null); }} className={`text-xs px-3 py-1.5 rounded-lg font-bold ${P.btnBlue}`}>⬆ デッキトップへ</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ブロッカーステップモーダル（CPU攻撃時）─────────────────────────
function BlockerModal({ attackState, playerField, onBlock, onPass }) {
  if (!attackState || attackState.step !== 'blocker' || attackState.owner !== 'cpu') return null;
  const blockers = playerField.filter(c => (/【ブロッカー】/.test(c.effect || '') || c._hasBlocker) && !c.tapped);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-amber-600/40 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-5">
        <div className="text-center mb-4">
          <div className="text-amber-400 font-black text-lg mb-1">⚔️ ブロッカーステップ</div>
          <div className="text-amber-200/70 text-sm mb-1">CPU攻撃力: <span className="text-red-300 font-black">{attackState.attackPower.toLocaleString()}</span></div>
          <div className="text-amber-700/50 text-xs">ブロッカーを選んで受けますか？</div>
        </div>
        {blockers.length > 0 && (
          <div className="flex gap-3 flex-wrap justify-center mb-4">
            {blockers.map(card => (
              <div key={card._uid} className="flex flex-col items-center gap-1 cursor-pointer group" onClick={() => onBlock(card._uid)}>
                <div className="rounded-xl overflow-hidden border-2 border-amber-500/50 group-hover:border-amber-400 group-hover:scale-105 transition-all"
                  style={{ width: 80, height: 112 }}>
                  <CardImage card={card} className="w-full h-full object-cover" />
                </div>
                <div className="text-[9px] text-amber-300 font-black">{calcPower(card, false).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onPass} className={`w-full py-2.5 rounded-xl text-sm font-black ${P.btnGray}`}>パスする（ブロックしない）</button>
      </div>
    </div>
  );
}

// ─── カウンターステップモーダル（CPU攻撃時）──────────────────────────
function CounterModal({
  attackState, playerHand, onCounter, onConfirm,
  playerLeader, playerLeaderEffect, playerLeaderAbilityUsed, onLeaderDefenseAbility,
}) {
  const [selectingDiscard, setSelectingDiscard] = useState(false);
  if (!attackState || attackState.step !== 'counter' || attackState.owner !== 'cpu') return null;
  const { attackPower, defensePower } = attackState;
  const willSurvive = defensePower > attackPower;
  const counterCards = playerHand.filter(c => (c.counter || 0) > 0);

  // リーダー相手アタック時効果の表示条件
  const requiredDon = playerLeaderEffect?.opponentAttackRequiresDon ?? 1;
  const leaderDon = playerLeader?.donAttached || 0;
  const canUseLeaderAbility =
    playerLeaderEffect?.hasOpponentAttackAbility &&
    !playerLeaderAbilityUsed &&
    leaderDon >= requiredDon &&
    attackState.targetType === 'leader';

  const handleDiscardForAbility = (cardUid) => {
    onLeaderDefenseAbility(cardUid);
    setSelectingDiscard(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-purple-600/40 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-5">
        <div className="text-center mb-3">
          <div className="text-purple-400 font-black text-lg mb-2">🛡️ カウンターステップ</div>
          <div className="flex items-center justify-center gap-4 my-2">
            <div className="text-center"><div className="text-[10px] text-red-400/60 mb-0.5">攻撃力</div><div className="font-black text-2xl text-red-300">{attackPower.toLocaleString()}</div></div>
            <div className="text-xl font-black text-amber-600/70">VS</div>
            <div className="text-center"><div className="text-[10px] text-blue-400/60 mb-0.5">防御力</div><div className={`font-black text-2xl ${willSurvive ? 'text-green-300' : 'text-blue-300'}`}>{defensePower.toLocaleString()}</div></div>
          </div>
          <div className={`text-sm font-bold ${willSurvive ? 'text-green-400' : 'text-red-400'}`}>
            {willSurvive ? '✓ ダメージ防御成功！' : `防御力が攻撃力を超える必要あり（残り+${(attackPower - defensePower + 1000).toLocaleString()}）`}
          </div>
        </div>

        {/* リーダー相手アタック時効果セクション */}
        {canUseLeaderAbility && (
          <div className="mb-3 bg-cyan-900/20 border border-cyan-700/40 rounded-xl p-3">
            <div className="text-[10px] text-cyan-400 font-bold mb-1">
              ⚡ {playerLeader?.name}リーダー効果
              {requiredDon > 0 && <span className="ml-1 text-yellow-400">[DON!!×{requiredDon} 付き]</span>}
            </div>
            <div className="text-[10px] text-cyan-200/70 mb-2 leading-relaxed">
              {playerLeaderEffect.opponentAttackAbility}
            </div>
            {!selectingDiscard ? (
              <button
                onClick={() => setSelectingDiscard(true)}
                className="w-full text-[11px] py-1.5 rounded-lg font-black bg-cyan-700/40 border border-cyan-600/50 text-cyan-200 hover:bg-cyan-600/50 transition-all">
                🌊 手札1枚捨ててリーダーパワー+2000
              </button>
            ) : (
              <div>
                <div className="text-[10px] text-cyan-300/80 font-bold mb-2">捨てるカードを選んでください：</div>
                <div className="flex gap-2 flex-wrap justify-center max-h-28 overflow-y-auto mb-2">
                  {playerHand.map(card => (
                    <div key={card._uid} className="flex flex-col items-center gap-0.5 cursor-pointer group"
                      onClick={() => handleDiscardForAbility(card._uid)}>
                      <div className="rounded-lg overflow-hidden border-2 border-cyan-500/50 group-hover:border-cyan-300 group-hover:scale-105 transition-all"
                        style={{ width: 56, height: 78 }}>
                        <CardImage card={card} className="w-full h-full object-cover"/>
                      </div>
                      <div className="text-[7px] text-cyan-400/70 text-center max-w-[56px] truncate">{card.name}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSelectingDiscard(false)}
                  className="w-full text-[10px] py-1 rounded-lg border border-cyan-800/40 text-cyan-600/60 hover:bg-cyan-900/20 transition-all">
                  キャンセル
                </button>
              </div>
            )}
          </div>
        )}
        {playerLeaderAbilityUsed && playerLeaderEffect?.hasOpponentAttackAbility && attackState.targetType === 'leader' && (
          <div className="mb-3 text-[10px] text-cyan-600/50 text-center">
            ✓ リーダー効果使用済み（+2000適用中）
          </div>
        )}

        {counterCards.length > 0 && !selectingDiscard && (
          <div className="mb-3">
            <div className="text-[10px] text-purple-400/60 font-bold text-center mb-2">
              カウンターカード（クリックで発動）※キャラ・イベントカード共通
            </div>
            <div className="flex gap-2 flex-wrap justify-center max-h-36 overflow-y-auto">
              {counterCards.map(card => (
                <div key={card._uid} className="flex flex-col items-center gap-1 cursor-pointer group" onClick={() => onCounter(card._uid)}>
                  <div className={`rounded-xl overflow-hidden border-2 group-hover:scale-105 transition-all ${
                    card.card_type === 'EVENT' ? 'border-blue-500/50 group-hover:border-blue-400' : 'border-purple-500/50 group-hover:border-purple-400'
                  }`} style={{ width: 68, height: 95 }}>
                    <CardImage card={card} className="w-full h-full object-cover" />
                  </div>
                  <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                    card.card_type === 'EVENT'
                      ? 'text-blue-300 bg-blue-900/40 border-blue-700/50'
                      : 'text-purple-300 bg-purple-900/40 border-purple-700/50'
                  }`}>+{(card.counter || 0).toLocaleString()}</div>
                  <div className="text-[8px] text-gray-500/60">{card.card_type === 'EVENT' ? 'EVT' : 'CHR'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!selectingDiscard && (
          <button onClick={onConfirm} className={`w-full py-2.5 rounded-xl text-sm font-black ${willSurvive ? P.btnGreen : P.btnGold}`}>
            {willSurvive ? '防御確定！' : 'このまま受ける'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── アタック解決モーダル（プレイヤー攻撃確認）──────────────────────
function AttackResolveModal({ attackState, cpuField, cpuLeader, onResolve, onCancel }) {
  if (!attackState || attackState.step !== 'resolving') return null;
  const atkPow = attackState.attackPower || 0;
  const defPow = attackState.defensePower || 0;
  const wins = atkPow >= defPow;
  const isBlocker = attackState.targetType === 'character';
  const targetLabel = isBlocker
    ? `ブロッカー「${cpuField?.find(x => x._uid === attackState.targetUid)?.name || '?'}」`
    : `CPUリーダー「${cpuLeader?.name || ''}」`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-amber-600/40 rounded-2xl shadow-2xl max-w-xs w-full mx-4 p-5">
        <div className="text-center mb-4">
          <div className="text-amber-400 font-black text-base mb-1">アタック解決</div>
          <div className={`text-xs mb-2 px-2 py-1 rounded-lg ${isBlocker ? 'bg-orange-900/30 text-orange-300' : 'bg-blue-900/30 text-blue-300'}`}>
            {isBlocker ? '🛡 ' : '👑 '}{targetLabel}
          </div>
          <div className="flex items-center justify-center gap-3 my-3">
            <div className="text-center"><div className="text-xs text-amber-400/60 mb-1">攻撃</div><div className="font-black text-xl text-amber-300">{atkPow.toLocaleString()}</div></div>
            <div className="text-2xl">⚔️</div>
            <div className="text-center"><div className="text-xs text-blue-400/60 mb-1">防御</div><div className="font-black text-xl text-blue-300">{defPow.toLocaleString()}</div></div>
          </div>
          <div className={`font-black text-lg ${wins ? 'text-green-400' : 'text-gray-400'}`}>{wins ? '攻撃成功！' : '攻撃失敗'}</div>
        </div>
        <div className="flex gap-3">
          <button onClick={onResolve} className={`flex-1 py-2.5 rounded-xl text-sm font-black ${wins ? P.btnGold : P.btnGray}`}>確定</button>
          <button onClick={onCancel} className={`py-2.5 px-3 rounded-xl text-sm ${P.btnGray}`}><X size={14}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── トリガーモーダル ──────────────────────────────────────────────
function TriggerModal({ card, onActivate, onSkip }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-blue-600/50 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
        <div className="text-center mb-4">
          <div className="text-blue-400 font-black text-lg mb-1">【トリガー】発動！</div>
          <div className="text-amber-200/80 text-sm">{card.name}</div>
        </div>
        <div className="flex justify-center mb-5">
          <div className="rounded-xl overflow-hidden border border-blue-600/40" style={{ width: 120, height: 168 }}>
            <CardImage card={card} className="w-full h-full object-cover" />
          </div>
        </div>
        {card.effect && (
          <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-3 mb-4 text-[11px] text-blue-200/80 leading-relaxed">{card.effect}</div>
        )}
        <div className="flex gap-3">
          <button onClick={onActivate} className={`flex-1 py-2.5 rounded-xl text-sm font-black ${P.btnBlue}`}>発動する</button>
          <button onClick={onSkip} className={`flex-1 py-2.5 rounded-xl text-sm font-black ${P.btnGray}`}>スキップ</button>
        </div>
      </div>
    </div>
  );
}

// ─── 勝敗モーダル ──────────────────────────────────────────────────
function WinModal({ winner, onReturn, onRematch }) {
  const isWin = winner === 'player';
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className={`bg-[#0a0f24] border rounded-2xl shadow-2xl max-w-xs w-full mx-4 p-8 text-center ${isWin ? 'border-amber-500/60' : 'border-red-700/40'}`}>
        <div className="text-6xl mb-4">{isWin ? '🏆' : '💀'}</div>
        <div className={`font-black text-3xl mb-2 ${isWin ? 'text-amber-400' : 'text-red-400'}`}>{isWin ? '勝利！' : '敗北...'}</div>
        <div className="text-amber-200/50 text-sm mb-6">{isWin ? 'CPUを倒した！' : 'CPUに敗れた...'}</div>
        <div className="flex gap-3">
          <button onClick={onRematch} className={`flex-1 py-2.5 rounded-xl font-black text-sm ${P.btnGold}`}><RotateCcw size={14} className="inline mr-1"/>リマッチ</button>
          <button onClick={onReturn} className={`flex-1 py-2.5 rounded-xl font-black text-sm ${P.btnGray}`}><Home size={14} className="inline mr-1"/>ホーム</button>
        </div>
      </div>
    </div>
  );
}

// ─── CPUトリガー自動処理 ─────────────────────────────────────────
function AutoCpuTrigger({ game, card }) {
  useEffect(() => {
    const t = setTimeout(() => game.resolveTrigger(true), 1000);
    return () => clearTimeout(t);
  }, [card?._uid]);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-900/90 border border-blue-500/60 rounded-xl px-4 py-2 text-xs text-blue-200 font-bold animate-pulse">
      CPU トリガー「{card?.name}」発動中...
    </div>
  );
}

// ─── 保存済みデッキ変換 ─────────────────────────────────────────────
function resolveSavedDeck(savedDeck, _cardMap) {
  if (!savedDeck) return null;
  const entries = (savedDeck.deck || []).map(entry => {
    if (entry.card) return { card: entry.card, count: entry.count };
    const card = _cardMap?.[entry.cardNumber];
    return card ? { card, count: entry.count } : null;
  }).filter(Boolean);
  return { leader: savedDeck.leader, entries, name: savedDeck.name || savedDeck.id };
}

// ─── セットアップ画面 ──────────────────────────────────────────────
function SetupScreen({ onStart, onHome, cardMap }) {
  const savedDecks = loadSavedDecks();
  const savedDeckNames = Object.keys(savedDecks);
  const [playerDeckName, setPlayerDeckName] = useState(savedDeckNames[0] || '');
  const [cpuDeckName, setCpuDeckName] = useState(savedDeckNames[0] || '');
  const [cpuDeckType, setCpuDeckType] = useState('sample');
  const [sampleIdx, setSampleIdx] = useState(0);
  const [order, setOrder] = useState('first');
  const isCardMapReady = Object.keys(cardMap || {}).length > 0;
  const playerDeck = resolveSavedDeck(savedDecks[playerDeckName] || null, cardMap);
  let cpuDeckResolved = null;
  if (cpuDeckType === 'sample' && isCardMapReady) {
    const raw = SAMPLE_DECKS[sampleIdx]; if (raw) cpuDeckResolved = resolveSampleDeck(raw, cardMap);
  } else if (cpuDeckType === 'saved') { cpuDeckResolved = resolveSavedDeck(savedDecks[cpuDeckName] || null, cardMap); }
  const canStart = playerDeck?.entries?.length > 0 && cpuDeckResolved?.entries?.length > 0;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'radial-gradient(ellipse at 50% 0%, #0a1530, #06091a)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6"><div className="text-3xl mb-2">⚔️</div><h1 className="font-black text-2xl text-amber-400 mb-1">CPU対戦</h1></div>
        <div className="space-y-4">
          <div className="bg-[#0d1530] border border-amber-800/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3"><User size={14} className="text-amber-400"/><span className="text-amber-300/80 font-bold text-sm">あなたのデッキ</span></div>
            {savedDeckNames.length === 0 ? <div className="text-amber-900/50 text-sm text-center py-2">デッキビルダーで先にデッキを保存してください</div> : (
              <select value={playerDeckName} onChange={e => setPlayerDeckName(e.target.value)}
                className="w-full bg-[#06091a] border border-amber-800/40 rounded-xl px-3 py-2 text-amber-200/80 text-sm focus:outline-none">
                {savedDeckNames.map(n => <option key={n} value={n}>{savedDecks[n]?.name || n}</option>)}
              </select>
            )}
            {playerDeck?.entries?.length > 0 && <div className="mt-2 text-[10px] text-amber-700/50">リーダー: {playerDeck.leader?.name}</div>}
          </div>
          <div className="bg-[#0d1530] border border-blue-800/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3"><Bot size={14} className="text-blue-400"/><span className="text-blue-300/80 font-bold text-sm">CPUのデッキ</span></div>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setCpuDeckType('sample')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${cpuDeckType==='sample' ? 'bg-blue-700/30 border-blue-600/50 text-blue-300' : 'bg-white/4 border-white/10 text-white/30'}`}>サンプル</button>
              <button onClick={() => setCpuDeckType('saved')} disabled={!savedDeckNames.length} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${cpuDeckType==='saved' ? 'bg-blue-700/30 border-blue-600/50 text-blue-300' : 'bg-white/4 border-white/10 text-white/30'} disabled:opacity-30`}>保存済み</button>
            </div>
            {cpuDeckType === 'sample' ? (
              <select value={sampleIdx} onChange={e => setSampleIdx(Number(e.target.value))} className="w-full bg-[#06091a] border border-blue-800/40 rounded-xl px-3 py-2 text-blue-200/80 text-sm">
                {SAMPLE_DECKS.map((d,i) => <option key={i} value={i}>{d.name}</option>)}
              </select>
            ) : (
              <select value={cpuDeckName} onChange={e => setCpuDeckName(e.target.value)} className="w-full bg-[#06091a] border border-blue-800/40 rounded-xl px-3 py-2 text-blue-200/80 text-sm">
                <option value="">選択してください</option>
                {savedDeckNames.map(n => <option key={n} value={n}>{savedDecks[n]?.name || n}</option>)}
              </select>
            )}
          </div>
          <div className="bg-[#0d1530] border border-amber-800/20 rounded-2xl p-4">
            <div className="text-amber-300/70 font-bold text-sm mb-3">先行 / 後攻</div>
            <div className="flex gap-3">
              {[['first','先行'],['second','後攻']].map(([val,label]) => (
                <button key={val} onClick={() => setOrder(val)} className={`flex-1 py-2.5 rounded-xl font-bold text-sm border ${order===val ? P.btnGold : P.btnGray}`}>{label}</button>
              ))}
            </div>
          </div>
          {cpuDeckType === 'sample' && !isCardMapReady && <div className="text-center text-amber-700/60 text-xs animate-pulse">カードデータ読み込み中...</div>}
          <button disabled={!canStart} onClick={() => onStart(playerDeck, cpuDeckResolved, order)}
            className={`w-full py-4 rounded-2xl font-black text-lg ${canStart ? P.btnGold : 'bg-gray-800/50 text-gray-600 border border-gray-700/30 cursor-not-allowed'}`}>
            <Swords size={18} className="inline mr-2"/>対戦スタート！
          </button>
          <button onClick={onHome} className={`w-full py-2.5 rounded-xl text-sm ${P.btnGray}`}><Home size={14} className="inline mr-1"/>ホームに戻る</button>
        </div>
      </div>
    </div>
  );
}

// ─── マリガン画面 ──────────────────────────────────────────────────
function MulliganScreen({ playerHand, leaderName, onMulligan, onKeep }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'radial-gradient(ellipse at 50% 0%, #0a1530, #06091a)' }}>
      <div className="w-full max-w-lg text-center">
        <h2 className="font-black text-2xl text-amber-400 mb-1">マリガン</h2>
        <p className="text-amber-700/60 text-sm mb-6">初期手札を確認（1回まで引き直し可能）</p>
        <div className="flex gap-2 justify-center flex-wrap mb-8">
          {playerHand.map(card => (
            <div key={card._uid} className="flex flex-col items-center gap-1">
              <div className="rounded-xl overflow-hidden border border-amber-800/30" style={{ width: 76, height: 107 }}>
                <CardImage card={card} className="w-full h-full object-cover" />
              </div>
              <div className="text-[8px] text-amber-700/60 max-w-[70px] truncate">{card.name}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 justify-center">
          <button onClick={onMulligan} className={`px-8 py-3 rounded-xl font-black text-sm ${P.btnRed}`}><RotateCcw size={14} className="inline mr-1"/>引き直す</button>
          <button onClick={onKeep} className={`px-8 py-3 rounded-xl font-black text-sm ${P.btnGold}`}>キープ</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// メインコンポーネント
// ═══════════════════════════════════════════════════════════════════
export default function BattlePage({ onNavigate }) {
  const game = useBattleState();
  const { state } = game;

  const [cardMap, setCardMap] = useState({});
  useEffect(() => {
    fetch('./cards.json').then(r => r.json()).then(d => {
      const map = {}; (d.cards || []).forEach(c => { map[c.card_number] = c; }); setCardMap(map);
    }).catch(() => {});
  }, []);

  // UI状態
  const [attackMode, setAttackMode] = useState(null);
  const [selectedAttackerUid, setSelectedAttackerUid] = useState(null);
  const [detailCard, setDetailCard] = useState(null);
  const [setupInfo, setSetupInfo] = useState(null);
  const [actionMenu, setActionMenu] = useState(null); // { card, context }
  const [showLog, setShowLog] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [pendingEntryEffect, setPendingEntryEffect] = useState(null);
  const [pendingAttackEffect, setPendingAttackEffect] = useState(null);
  const [pendingEventEffect, setPendingEventEffect] = useState(null);
  const [showLeaderAbilityModal, setShowLeaderAbilityModal] = useState(false);
  const [charSelectInfo, setCharSelectInfo] = useState(null);
  const [pendingCharAbility, setPendingCharAbility] = useState(null);
  const [phaseError, setPhaseError] = useState(null);
  const [dragInfo, setDragInfo] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [pendingChainPlay, setPendingChainPlay] = useState(null); // { id:'playFromHand'|'playFromTrash', limit }
  const [pendingTargetEffect, setPendingTargetEffect] = useState(null); // { id:'koOpponent'|'restOpponent'|'deckBottomOpponent' }
  const [pendingDiscardHand, setPendingDiscardHand] = useState(false);

  const isCpuTurn = state?.activePlayer === 'cpu';
  const isMyTurn  = state?.activePlayer === 'player';
  const subPhase  = state?.subPhase;
  const inMainPhase = subPhase === 'main';

  // ─── CPU ターン自動実行 ─────────────────────────────────────────
  useEffect(() => {
    if (!state || state.phase !== 'game' || state.winner) return;
    if (!isCpuTurn) return;
    if (state.pendingTrigger) return;
    if (state.attackState) return;
    if (['refresh','draw','don'].includes(subPhase)) { const t = setTimeout(() => game.advancePhase(), 800); return () => clearTimeout(t); }
    if (subPhase === 'end') { const t = setTimeout(() => game.advancePhase(), 600); return () => clearTimeout(t); }
    if (subPhase === 'main') {
      if ((state.cpuPendingAttacks?.length || 0) > 0) { const t = setTimeout(() => game.processCpuPendingAttack(), 600); return () => clearTimeout(t); }
      const t = setTimeout(() => game.runCpuMainPhase(), 1200); return () => clearTimeout(t);
    }
  }, [state?.activePlayer, state?.subPhase, state?.winner, state?.pendingTrigger, state?.attackState, state?.cpuPendingAttacks?.length]);

  useEffect(() => { if (isCpuTurn) { setAttackMode(null); setSelectedAttackerUid(null); } }, [isCpuTurn]);

  // ─── キーボードショートカット ─────────────────────────────────────
  useEffect(() => {
    if (!state || state.phase !== 'game') return;
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); if (isMyTurn) game.advancePhase(); }
      if (e.code === 'KeyD' && !e.ctrlKey && !e.metaKey) game.playerDraw(1);
      if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) game.playerShuffleDeck();
      if (e.code === 'Escape') { setActionMenu(null); setDetailCard(null); setShowTrash(false); setAttackMode(null); setSelectedAttackerUid(null); setDragInfo(null); setDragOver(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, game, isMyTurn]);

  // ─── フェーズエラーチェック ─────────────────────────────────────────
  const showPhaseError = (msg) => { setPhaseError(msg); setTimeout(() => setPhaseError(null), 2800); };
  const getPhaseActionError = (actionId, phase) => {
    if (!phase || phase === 'main') return null;
    const phaseNames = { refresh:'リフレッシュ', draw:'ドロー', don:'DON!!', end:'エンド' };
    const actionLabels = { play:'キャラを登場させる', stage:'ステージをセット', event:'イベントを使用する', tap:'アタックする', 'tap-leader':'リーダーでアタックする', 'attach-don':'DON!!を付与する', 'attach-don-leader':'リーダーにDON!!を付与する' };
    const blocked = { refresh:['play','stage','event','tap','tap-leader','attach-don','attach-don-leader'], draw:['play','stage','event','tap','tap-leader','attach-don','attach-don-leader'], don:['tap','tap-leader'], end:['play','stage','event','tap','tap-leader'] };
    if ((blocked[phase] || []).includes(actionId)) return `${phaseNames[phase]}フェーズでは「${actionLabels[actionId] || actionId}」はできません`;
    return null;
  };

  // ─── D&D: ドロップゾーン判定 ──────────────────────────────────────
  const isValidDrop = (zone) => {
    if (!dragInfo) return false;
    const { context, card } = dragInfo;
    if (context === 'hand') {
      if (zone === 'field') return card.card_type === 'CHARACTER';
      if (zone === 'stage') return card.card_type === 'STAGE';
      if (zone === 'event') return card.card_type === 'EVENT';
      if (zone === 'trash') return true;
      if (zone === 'deck') return true;
    }
    if (context === 'don-active') {
      if (zone === 'leader') return true;
      if (zone.startsWith('field-card-')) return true;
    }
    return false;
  };
  const dzStyle = (zone) => {
    if (!isValidDrop(zone)) return {};
    const hovered = dragOver === zone;
    return { outline: hovered ? '2px solid rgba(245,215,142,0.9)' : '2px dashed rgba(245,215,142,0.45)', outlineOffset: '-2px', filter: hovered ? 'brightness(1.18)' : 'brightness(1.06)', transition: 'outline 0.1s, filter 0.1s' };
  };
  const handleDrop = (zone, extraUid = null) => {
    if (!dragInfo) return;
    const { context, card } = dragInfo;
    if (context === 'hand') {
      if (zone === 'field' && card.card_type === 'CHARACTER') {
        game.playerPlayCard(card._uid);
        if (/【登場時】/.test(card.effect || '')) setPendingEntryEffect(card);
      } else if (zone === 'stage' && card.card_type === 'STAGE') {
        game.playerPlayStage(card._uid);
      } else if (zone === 'event' && card.card_type === 'EVENT') {
        game.playerPlayEvent(card._uid);
        if (card.effect) setPendingEventEffect(card);
      } else if (zone === 'trash') {
        game.playerTrashCard(card._uid);
      } else if (zone === 'deck') {
        game.playerReturnHandToTop(card._uid);
      }
    } else if (context === 'don-active') {
      if (zone === 'leader') { game.playerAttachDon('leader'); }
      else if (zone.startsWith('field-card-') && extraUid) { game.playerAttachDon(extraUid); }
    }
    setDragInfo(null); setDragOver(null);
  };
  const handleDragEnd = () => { setDragInfo(null); setDragOver(null); };

  // ─── リーダー起動メイン効果ハンドラー ────────────────────────────
  const handleLeaderAbilityConfirm = useCallback(() => {
    if (!state) return;
    const num = state.player.leader?.card_number;
    if (num === 'OP15-058') {
      game.playerUseEnelAbility(1, 4);
      setShowLeaderAbilityModal(false);
      setCharSelectInfo({ mode: 'single', maxSelect: 1, donPerChar: 4, label: 'DON!!×4を付与するキャラを1枚選んでください' });
    } else if (num === 'OP08-001') {
      setShowLeaderAbilityModal(false);
      setCharSelectInfo({ mode: 'multi', maxSelect: 3, donPerChar: 1, label: '《動物》か《ドラム王国》のキャラを最大3枚選んでください（DON!!×1ずつ付与）' });
    } else if (num === 'OP14-020') {
      game.playerUseMihawkAbility('leader');
      setShowLeaderAbilityModal(false);
    } else if (num === 'OP10-001') {
      game.playerUseSmokerAbility();
      setShowLeaderAbilityModal(false);
    } else if (num === 'OP05-041') {
      game.playerUseAkainuAbility();
      setShowLeaderAbilityModal(false);
    } else {
      setShowLeaderAbilityModal(false);
    }
  }, [state, game]);

  const handleCharSelectConfirm = useCallback((chosenUids, donPerChar) => {
    chosenUids.forEach(uid => game.playerAttachDonMulti(uid, donPerChar));
    setCharSelectInfo(null);
  }, [game]);

  const handleCharActiveAbility = useCallback((card) => {
    setPendingCharAbility(card);
  }, []);

  // ─── ハンドラー ─────────────────────────────────────────────────
  const handleStart = useCallback((playerDeck, cpuDeck, order) => {
    setSetupInfo({ playerDeck, cpuDeck, order });
    game.startBattle(playerDeck.leader, playerDeck.entries, cpuDeck.leader, cpuDeck.entries, order);
  }, [game]);

  const handleRematch = useCallback(() => {
    if (!setupInfo) return;
    const { playerDeck, cpuDeck, order } = setupInfo;
    game.startBattle(playerDeck.leader, playerDeck.entries, cpuDeck.leader, cpuDeck.entries, order);
    setAttackMode(null); setSelectedAttackerUid(null);
  }, [setupInfo, game]);

  const handleAttackerSelect = useCallback((uid) => {
    setSelectedAttackerUid(uid); setAttackMode('select-target');
    game.playerSelectAttacker(uid);
  }, [game]);

  const handleTargetSelect = useCallback((targetUid) => {
    if (attackMode !== 'select-target') return;
    setAttackMode('resolving');
    game.playerSelectTarget(targetUid);
    // アタック時効果チェック
    if (state) {
      const p = state.player;
      const ast = state.attackState;
      const uid = ast?.attackerUid || selectedAttackerUid;
      const attacker = uid === 'p-leader' ? p.leader : p.field.find(c => c._uid === uid);
      if (attacker && /【アタック時】/.test(attacker.effect || '')) {
        setPendingAttackEffect(attacker);
      }
    }
  }, [attackMode, game, state, selectedAttackerUid]);

  const handleCancelAttack = useCallback(() => { game.cancelAttack(); setAttackMode(null); setSelectedAttackerUid(null); }, [game]);
  const handleResolveAttack = useCallback(() => { game.resolveAttack(); setAttackMode(null); setSelectedAttackerUid(null); }, [game]);

  // アクションメニュー処理
  const handleAction = useCallback((actionId) => {
    const card = actionMenu?.card;
    const ctx = actionMenu?.context;
    if (!card || !game) return;
    if (actionId === 'detail') { setDetailCard(card); setActionMenu(null); return; }
    if (actionId === 'char-active') { handleCharActiveAbility(card); setActionMenu(null); return; }
    const phaseErr = getPhaseActionError(actionId, state?.subPhase);
    if (phaseErr) { showPhaseError(phaseErr); setActionMenu(null); return; }
    switch (actionId) {
      case 'play': {
        game.playerPlayCard(card._uid);
        if (/【登場時】/.test(card.effect || '')) setPendingEntryEffect(card);
        break;
      }
      case 'stage': game.playerPlayStage(card._uid); break;
      case 'event': {
        game.playerPlayEvent(card._uid);
        if (card.effect) setPendingEventEffect(card);
        break;
      }
      case 'tap':
        if (ctx === 'field') {
          if (card.tapped) {
            // レスト状態ならアンタップ（トグル）
            game.playerToggleField(card._uid);
          } else {
            // アクティブ状態 → アタック宣言 → ターゲット選択モードへ
            handleAttackerSelect(card._uid);
          }
        }
        break;
      case 'tap-leader':
        if (state.player.leader.tapped) {
          // レスト状態ならアンタップ（トグル）
          game.playerToggleLeader();
        } else {
          // アクティブ状態 → リーダーでアタック宣言 → ターゲット選択モードへ
          handleAttackerSelect('p-leader');
        }
        break;
      case 'attach-don': game.playerAttachDon(card._uid); break;
      case 'attach-don-leader': game.playerAttachDon('leader'); break;
      case 'detach-don': game.playerDetachDon(card._uid); break;
      case 'detach-don-leader': game.playerDetachDonLeader(); break;
      case 'deck-top':
        if (ctx === 'hand') game.playerReturnHandToTop(card._uid);
        if (ctx === 'field') game.playerReturnFieldToTop(card._uid);
        break;
      case 'deck-bottom':
        if (ctx === 'hand') game.playerReturnHandToBottom(card._uid);
        if (ctx === 'field') game.playerReturnFieldToBottom(card._uid);
        break;
      case 'detail': setDetailCard(card); break;
      case 'trash-hand': game.playerTrashCard(card._uid); break;
      case 'trash-field': game.playerTrashFieldCard(card._uid); break;
      case 'trash-stage': game.playerTrashStage(); break;
      case 'trash-to-hand': game.playerReturnTrashToHand(card._uid); break;
      case 'trash-to-deck-top': game.playerReturnTrashToDeckTop(card._uid); break;
    }
    setActionMenu(null);
  }, [actionMenu, game, state]);

  const handleTrashAction = useCallback((actionId, uid) => {
    if (actionId === 'trash-to-hand') game.playerReturnTrashToHand(uid);
    if (actionId === 'trash-to-deck-top') game.playerReturnTrashToDeckTop(uid);
  }, [game]);

  // ─── 画面分岐 ─────────────────────────────────────────────────
  if (!state) return <SetupScreen onStart={handleStart} onHome={() => onNavigate('home')} cardMap={cardMap}/>;
  if (state.phase === 'mulligan') return <MulliganScreen playerHand={state.player.hand} leaderName={state.player.leader?.name} onMulligan={game.playerMulligan} onKeep={game.confirmMulligan}/>;

  const ps = state.player;
  const cs = state.cpu;
  const isSelectingTarget = attackMode === 'select-target';
  const donTotal = ps.donActive + ps.donTapped;
  const activePhaseIdx = PHASES.findIndex(p => p.id === subPhase);

  return (
    <div className={`h-screen ${P.bg} flex flex-col overflow-hidden select-none relative`}>

      <PirateMapBg />

      {/* ═══ ヘッダー ═══ */}
      <header className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-[#080c1e]/98 border-b border-amber-900/35 z-[10] relative"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
        <button onClick={() => onNavigate('home')} title="ホームに戻る"
          className="text-amber-700/60 hover:text-amber-400 transition-colors flex-shrink-0 p-0.5 rounded hover:bg-amber-900/20">
          <Home size={16}/>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0 bg-amber-900/20 border border-amber-800/30 rounded-lg px-2 py-0.5">
          <Skull size={11} className="text-amber-500/80"/>
          <span className="text-amber-300 font-black text-sm">T{state.turn}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isMyTurn ? 'bg-amber-800/40 text-amber-400' : 'bg-blue-900/40 text-blue-400'}`}>
            {isMyTurn ? 'あなた' : 'CPU'}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          <StatChip icon="📚" value={ps.deck.length} label="デッキ"/>
          <StatChip icon="✋" value={ps.hand.length} label="手札"/>
          <StatChip icon="❤️" value={ps.life.length} label="LIFE" color="red"/>
          <button onClick={() => setShowTrash(true)} title="トラッシュを確認">
            <StatChip icon="🗑" value={ps.trash.length} label="トラッシュ"/>
          </button>
        </div>
        <div className="flex-1"/>
        {/* CPU情報 */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 bg-blue-900/20 border border-blue-800/30 rounded-lg px-1.5 py-0.5 text-[10px] text-blue-400/80 font-bold"><Bot size={10}/>CPU</div>
          <StatChip icon="❤️" value={cs.life.length} label="CPUライフ" color="red"/>
          <StatChip icon="💛" value={`${cs.donActive}/${cs.donActive+cs.donTapped}`} label="DON!!"/>
          <StatChip icon="📚" value={cs.deck.length} label="CPUデッキ"/>
          <StatChip icon="✋" value={cs.hand.length} label="CPU手札"/>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => game.playerDraw(1)} className={`text-xs px-2.5 py-1 rounded-lg border ${P.btnBlue}`}>+ドロー</button>
          <button onClick={() => setShowLog(v=>!v)}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${showLog ? 'bg-amber-800/40 border-amber-600/50 text-amber-300' : 'border-amber-900/30 text-amber-800/50 hover:text-amber-400'}`}>LOG</button>
        </div>
      </header>

      {/* ═══ メインエリア ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden p-1.5 gap-1.5 min-h-0 relative z-[1]">

        {/* ── CPU ボード（コンパクト・flex:2）── */}
        <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 relative`}
          style={{ borderColor: isCpuTurn ? 'rgba(60,130,255,0.35)' : 'rgba(60,130,255,0.15)' }}>
          {isCpuTurn && <div className="absolute top-1 right-2 text-blue-400/70 text-[10px] animate-pulse font-bold"><Bot size={12} className="inline mr-0.5"/>思考中...</div>}
          <div className="flex items-end gap-3 flex-wrap justify-center">
            {/* CPUライフ */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-[8px] text-red-400/60 font-bold uppercase tracking-widest">LIFE</div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: cs.life.length }).map((_,i) => (
                  <div key={i} className="w-3 h-5 bg-red-700/60 border border-red-500/40 rounded-sm"/>
                ))}
                {cs.life.length === 0 && <Skull size={14} className="text-red-900/40"/>}
              </div>
              <div className="text-red-400/70 text-[9px] font-bold">{cs.life.length}</div>
            </div>
            {/* CPUリーダー */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-[8px] text-blue-400/60 font-bold">LEADER</div>
              <GameCard card={cs.leader} tapped={cs.leader.tapped} size={CC} showPower ownerTurn={isCpuTurn}
                highlight={isSelectingTarget ? 'target' : null}
                onClick={() => isSelectingTarget && handleTargetSelect('cpu-leader')}/>
            </div>
            {/* CPUフィールド */}
            <div className="flex gap-2 items-end flex-wrap">
              {cs.field.length === 0 && <EmptySlot size={CC}/>}
              {cs.field.map(card => {
                // アクティブ状態のキャラはアタック対象にできない
                const canTarget = isSelectingTarget && card.tapped;
                return (
                  <div key={card._uid} className="flex flex-col items-center gap-0.5">
                    <GameCard card={card} tapped={card.tapped} size={CC} showPower ownerTurn={isCpuTurn}
                      highlight={canTarget ? 'target' : (isSelectingTarget && !card.tapped ? null : null)}
                      onClick={() => canTarget ? handleTargetSelect(card._uid) : (isSelectingTarget && !card.tapped ? showPhaseError('アクティブ状態のキャラにはアタックできません') : null)}/>
                    {isSelectingTarget && !card.tapped && (
                      <div className="text-[7px] text-gray-500/60 font-bold">攻撃不可</div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* CPU手札（裏向き） */}
            <div className="flex gap-0.5 flex-wrap max-w-[120px]">
              {cs.hand.map((_, i) => (
                <div key={i} className="rounded overflow-hidden border border-blue-800/40"
                  style={{ width: 32, height: 45, background: 'linear-gradient(135deg, #0a1535, #0d1e4a)' }}>
                  <div className="w-full h-full flex items-center justify-center"><span className="text-blue-700/40 font-black text-[6px]">OP</span></div>
                </div>
              ))}
            </div>
          </div>
          {/* アタックターゲット選択ガイド */}
          {isSelectingTarget && (
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <div className="text-[10px] text-red-400/80 animate-pulse font-bold">↑ CPUのカードをクリックしてターゲット選択</div>
              <button onClick={handleCancelAttack} className={`text-[10px] px-2 py-0.5 rounded-lg ${P.btnGray}`}><X size={10} className="inline mr-0.5"/>キャンセル</button>
            </div>
          )}
        </div>

        {/* ── プレイヤーボード（一人回しグリッドレイアウト準拠）── */}
        <div className="flex gap-1.5 min-h-0" style={{ flex: 8 }}>

          {/* ──── ライフ列（行1〜3の全高をカバー）──── */}
          <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center justify-center overflow-visible`}
            style={{ width: LEFT_COL_W, borderColor: 'rgba(220,50,50,0.22)' }}>
            <LifeStack life={ps.life} onFlip={game.playerFlipLife}/>
          </div>

          {/* ──── 中央+右セクション（行1〜3を縦積み）──── */}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">

            {/* 行1: キャラクターゾーン */}
            <div className="min-h-0 overflow-visible" style={{ flex: 3 }}>
              <div className={`h-full ${P.panel} rounded-xl p-2 flex flex-col min-w-0 overflow-visible`}
                style={{ borderColor: 'rgba(120,220,120,0.18)', ...dzStyle('field') }}
                onDragOver={e => { if (isValidDrop('field')) { e.preventDefault(); setDragOver('field'); } }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => { e.preventDefault(); handleDrop('field'); }}>
                <div className="flex items-center gap-2 mb-1 flex-shrink-0">
                  <span className={P.label}>キャラクター ({ps.field.length}/5)</span>
                  <span className="text-[9px] text-white/35 hidden lg:inline">
                    ダブルクリック→効果 / クリック→操作
                    {dragInfo?.context === 'hand' && dragInfo.card.card_type === 'CHARACTER' && ' / ここにドロップで場に出す'}
                  </span>
                </div>
                <div className="flex gap-4 items-end overflow-x-auto overflow-y-visible flex-1 pb-1 justify-center px-2">
                  {ps.field.map(card => {
                    const donPad = (card.donAttached || 0) > 0 ? Math.min(card.donAttached, 4) * 16 + 32 : 0;
                    const hasActive = /【起動メイン】/.test(card.effect || '');
                    const isAttacker = selectedAttackerUid === card._uid;
                    return (
                      <div key={card._uid} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ paddingRight: donPad }}>
                        <div style={dzStyle(`field-card-${card._uid}`)} className="rounded-xl"
                          onDragOver={e => { if (isValidDrop(`field-card-${card._uid}`)) { e.preventDefault(); e.stopPropagation(); setDragOver(`field-card-${card._uid}`); } }}
                          onDragLeave={e => { e.stopPropagation(); setDragOver(null); }}
                          onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop('field-card', card._uid); }}>
                          <GameCard card={card} tapped={card.tapped} badge={card.donAttached} ownerTurn={isMyTurn}
                            highlight={isAttacker ? 'attacker' : null}
                            onClick={() => {
                              if (isMyTurn && inMainPhase && !attackMode) setActionMenu({ card, context: 'field' });
                              else if (attackMode === null && !isCpuTurn) setActionMenu({ card, context: 'field' });
                            }}
                            onDoubleClick={() => setDetailCard(card)}/>
                        </div>
                        {hasActive && (
                          <button onClick={() => handleCharActiveAbility(card)} style={{ width: CARD.W }}
                            className={`py-1 rounded-lg font-black text-[9px] ${P.btnGold} flex items-center justify-center gap-0.5 border`}>
                            <Zap size={8}/> 起動メイン
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 5 - ps.field.length) }).map((_, i) => <EmptySlot key={i}/>)}
                </div>
              </div>
            </div>

            {/* 行2: フェーズ | リーダー(flex) | ステージ(固定) | デッキ */}
            <div className="flex gap-1.5 min-h-0 overflow-visible" style={{ flex: 3 }}>

              {/* フェーズパネル */}
              <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col justify-between min-h-0`}
                style={{ width: LEFT_COL_W, borderColor: 'rgba(200,160,50,0.25)' }}>
                <div className="flex flex-col gap-0.5 flex-1 justify-around">
                  {PHASES.map((p, i) => (
                    <div key={p.id} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all
                      ${i === activePhaseIdx ? 'bg-amber-600/40 text-amber-200 border border-amber-500/60' : i < activePhaseIdx ? 'text-amber-900/35 line-through' : 'text-amber-700/50'}`}>
                      <span className="text-sm leading-none">{p.icon}</span><span>{p.label}</span>
                    </div>
                  ))}
                </div>
                {isMyTurn && (
                  <button onClick={game.advancePhase} className={`mt-1 w-full text-xs py-1 rounded-lg font-bold ${P.btnGold}`}>
                    {subPhase === 'end' ? '次ターン ▶' : '次へ ▶'}
                  </button>
                )}
              </div>

              {/* リーダー（flex中央配置） */}
              <div className={`flex-1 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-2 overflow-visible min-w-0`}
                style={{ borderColor: 'rgba(255,220,80,0.22)', ...dzStyle('leader') }}
                onDragOver={e => { if (isValidDrop('leader')) { e.preventDefault(); setDragOver('leader'); } }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => { e.preventDefault(); handleDrop('leader'); }}>
                <div className={P.label}>リーダー</div>
                <div className="flex-1 flex items-center justify-center">
                  <GameCard card={ps.leader} tapped={ps.leader.tapped} badge={ps.leader.donAttached} ownerTurn={isMyTurn}
                    highlight={selectedAttackerUid === 'p-leader' ? 'attacker' : null}
                    onClick={() => {
                      if (isMyTurn && inMainPhase && !attackMode) setActionMenu({ card: ps.leader, context: 'leader' });
                      else if (!isCpuTurn) setActionMenu({ card: ps.leader, context: 'leader' });
                    }}
                    onDoubleClick={() => setDetailCard(ps.leader)}/>
                </div>
                {ps.leaderEffect?.hasActiveAbility && (
                  <button onClick={() => setShowLeaderAbilityModal(true)} style={{ width: CARD.W * 1.5 }}
                    className={`py-2.5 rounded-xl font-black text-xs ${P.btnGold} flex items-center justify-center gap-1.5 shadow-lg`}>
                    <Zap size={13}/> 起動メイン効果
                  </button>
                )}
                {/* ライフ離れ効果ボタン（ナミ等: 自分ターン中に使用） */}
                {ps.leaderEffect?.onLifeLeaveDraw && isMyTurn && inMainPhase && ps.life.length > 0 && (
                  <button onClick={game.playerReturnLifeToHand} style={{ width: CARD.W * 1.5 }}
                    className={`py-1.5 rounded-xl font-black text-[10px] bg-cyan-700/40 border border-cyan-600/50 text-cyan-200 hover:bg-cyan-600/50 transition-all flex items-center justify-center gap-1`}>
                    🌊 ライフ→手札
                  </button>
                )}
                {ps.leaderEffect?.note && !ps.leaderEffect?.hasActiveAbility && (
                  <div className="text-[9px] text-amber-500/55 text-center leading-tight px-1 line-clamp-2">{ps.leaderEffect.note}</div>
                )}
              </div>

              {/* ステージ（固定幅） */}
              <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1`}
                style={{ width: LEFT_COL_W, borderColor: 'rgba(180,80,220,0.22)', ...dzStyle('stage') }}
                onDragOver={e => { if (isValidDrop('stage')) { e.preventDefault(); setDragOver('stage'); } }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => { e.preventDefault(); handleDrop('stage'); }}>
                <div className={P.label}>ステージ</div>
                <div className="flex-1 flex items-center justify-center">
                  {ps.stage ? (
                    <div className="cursor-pointer rounded-xl overflow-hidden border-2 border-purple-400/40 hover:border-purple-300/70 transition-all shadow-lg"
                      onClick={() => setActionMenu({ card: ps.stage, context: 'stage' })}
                      onDoubleClick={() => setDetailCard(ps.stage)}>
                      <CardImage card={ps.stage} className="object-cover" style={{ width: DECK_CARD.W, height: DECK_CARD.H }}/>
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
              <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1`}
                style={{ width: DECK_TRASH_W, borderColor: 'rgba(60,120,220,0.22)', ...dzStyle('deck') }}
                onDragOver={e => { if (isValidDrop('deck')) { e.preventDefault(); setDragOver('deck'); } }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => { e.preventDefault(); handleDrop('deck'); }}>
                <div className={P.label}>デッキ</div>
                <div className="flex-1 flex flex-col items-center justify-center gap-1">
                  <div className="relative cursor-pointer group" onClick={() => game.playerDraw(1)} title="クリックでドロー">
                    <div className="absolute rounded-xl bg-gradient-to-br from-blue-900/50 to-[#06091a]"
                      style={{ width: DECK_CARD.W - 4, height: DECK_CARD.H - 4, top: 4, left: 4 }}/>
                    <div className="relative rounded-xl bg-gradient-to-br from-[#1a2a5e] to-[#06091a] border-2 border-white/20 flex flex-col items-center justify-center gap-1 group-hover:border-amber-400/60 transition-colors"
                      style={{ width: DECK_CARD.W, height: DECK_CARD.H }}>
                      <Anchor size={18} className="text-white/40"/>
                      <span className="text-white/40 text-[9px] font-bold">CLICK</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-blue-400/50 shadow-md">
                      {ps.deck.length}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-white/30">ドロー</span>
                    <button onClick={game.playerShuffleDeck} title="シャッフル（S）" className="text-white/40 hover:text-amber-300 transition-colors"><Shuffle size={11}/></button>
                  </div>
                </div>
              </div>
            </div>

            {/* 行3: DON!!デッキ | コストエリア | トラッシュ */}
            <div className="flex gap-1.5 min-h-0" style={{ flex: 2 }}>

              {/* DON!!デッキパネル */}
              <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center justify-center gap-1 min-h-0`}
                style={{ width: LEFT_COL_W, borderColor: 'rgba(253,224,71,0.25)' }}>
                <div className={P.label}>DON!!デッキ</div>
                <div className="relative">
                  <div className="absolute rounded-lg"
                    style={{ width: DON_CARD.W + 6, height: DON_CARD.H + 6, top: 4, left: 4, background: 'linear-gradient(160deg, #3d2a00 0%, #1a1300 100%)', border: '1.5px solid rgba(180,120,10,0.35)' }}/>
                  <div className="relative rounded overflow-hidden" style={{ width: DON_CARD.W + 6, height: DON_CARD.H + 6 }}>
                    <DonCard active={false}/>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-amber-600 text-amber-900 text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-amber-400/60 shadow-md">{ps.donDeck}</div>
                </div>
                <div className="text-[9px] text-amber-600/60">残{ps.donDeck}枚</div>
              </div>

              {/* コストエリア */}
              <div className={`flex-1 ${P.panel} rounded-xl p-2 flex flex-col min-w-0`}
                style={{ borderColor: 'rgba(253,224,71,0.22)' }}>
                <div className="flex items-center justify-between mb-1 gap-1 flex-wrap flex-shrink-0">
                  <div className="text-[10px] text-amber-300/90 font-bold flex items-center gap-1">
                    <span>💛</span><span>コストエリア</span>
                    <span className="text-white/50 font-normal">({donTotal})</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => game.playerTapDon(1)} className={`text-[9px] px-1.5 py-0.5 rounded border ${P.btnGray}`}>×1レスト</button>
                    <button onClick={() => game.playerAttachDon('leader')} className={`text-[9px] px-1.5 py-0.5 rounded border ${P.btnGold}`}>リーダー+1</button>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap items-end flex-1 overflow-y-auto" style={{ minHeight: DON_CARD.H + 2 }}>
                  {ps.donActive <= 8
                    ? Array.from({ length: ps.donActive }).map((_, i) => (
                        <DonCard key={`a-${i}`} active={true} onClick={() => game.playerTapDon(1)}
                          onDragStart={() => setDragInfo({ context: 'don-active' })} onDragEnd={handleDragEnd}/>
                      ))
                    : (
                      <div className="flex items-end gap-1.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <DonCard key={i} active={true} onClick={() => game.playerTapDon(1)}
                            onDragStart={() => setDragInfo({ context: 'don-active' })} onDragEnd={handleDragEnd}/>
                        ))}
                        <span className="text-yellow-300 font-black text-sm self-center pb-1">×{ps.donActive}</span>
                      </div>
                    )
                  }
                  {ps.donActive > 0 && ps.donTapped > 0 && <div className="self-stretch w-px bg-white/15 mx-0.5"/>}
                  {ps.donTapped <= 8
                    ? Array.from({ length: ps.donTapped }).map((_, i) => <DonCard key={`t-${i}`} active={false}/>)
                    : (
                      <div className="flex items-end gap-1.5">
                        {Array.from({ length: 3 }).map((_, i) => <DonCard key={i} active={false}/>)}
                        <span className="text-white/30 font-black text-sm self-center pb-1">×{ps.donTapped}</span>
                      </div>
                    )
                  }
                  {(ps.leader.donAttached||0) > 0 && (
                    <div className="self-center ml-1 flex items-center gap-0.5 bg-yellow-900/30 border border-yellow-600/40 rounded-lg px-1.5 py-0.5">
                      <span className="text-yellow-300 text-[10px] font-black">👑+{ps.leader.donAttached}</span>
                    </div>
                  )}
                  {donTotal === 0 && <span className="text-white/25 text-xs italic self-center">次フェーズでDON!!補充</span>}
                </div>
              </div>

              {/* トラッシュ */}
              <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1`}
                style={{ width: DECK_TRASH_W, borderColor: 'rgba(200,80,80,0.22)', ...dzStyle('trash') }}
                onDragOver={e => { if (isValidDrop('trash')) { e.preventDefault(); setDragOver('trash'); } }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => { e.preventDefault(); handleDrop('trash'); }}>
                <div className={`${P.label} flex items-center gap-1`}>
                  トラッシュ {ps.trash.length > 0 && <span className="text-red-300/70 font-black">({ps.trash.length})</span>}
                </div>
                {ps.trash.length > 0 ? (
                  <div className="relative cursor-pointer group flex-1 w-full flex items-center justify-center overflow-visible"
                    onClick={() => setShowTrash(true)} title="クリックで一覧表示">
                    {ps.trash.length >= 2 && (
                      <div className="absolute rounded-xl overflow-hidden border border-white/20"
                        style={{ width: TRASH_CARD.W, height: TRASH_CARD.H, top: 4, left: 10, transform: 'rotate(4deg)', opacity: 0.75, zIndex: 2 }}>
                        <CardImage card={ps.trash[ps.trash.length-2]} className="w-full h-full object-cover"/>
                      </div>
                    )}
                    <div className="absolute rounded-xl overflow-hidden border-2 border-red-400/35"
                      style={{ width: TRASH_CARD.W, height: TRASH_CARD.H, top: 0, left: 0, zIndex: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                      <CardImage card={ps.trash[ps.trash.length-1]} className="w-full h-full object-cover"/>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <span className="text-white font-bold text-[10px] bg-black/40 px-1.5 py-0.5 rounded">一覧</span>
                      </div>
                    </div>
                    <div className="absolute font-black rounded-full flex items-center justify-center border"
                      style={{ bottom: -2, right: 4, width: 18, height: 18, fontSize: 9, zIndex: 10, background: '#991b1b', color: '#fca5a5', borderColor: '#ef4444' }}>
                      {ps.trash.length}
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

        {/* ── 手札（フル幅・一人回し準拠）── */}
        <div className="flex gap-1.5 min-h-0" style={{ flex: 2 }}>
          <div className={`flex-1 ${P.panel} rounded-xl px-3 py-2 flex flex-col min-w-0`}
            style={{ borderColor: 'rgba(100,160,255,0.22)' }}>
            <div className="flex items-center gap-2 mb-1 flex-shrink-0">
              <div className={P.label}>手札 ({ps.hand.length}枚)</div>
              <div className="text-[9px] text-white/30 hidden sm:inline">クリック→操作 / ダブルクリック→効果確認 / ドラッグ→各ゾーンに直接配置</div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 items-end flex-1 justify-center">
              {ps.hand.map(card => (
                <HandCard key={card._uid} card={card}
                  selected={selectedAttackerUid === card._uid}
                  onClick={() => {
                    if (isMyTurn && inMainPhase) setActionMenu({ card, context: 'hand' });
                    else setDetailCard(card);
                  }}
                  onDoubleClick={() => setDetailCard(card)}
                  onDragStart={() => setDragInfo({ card, context: 'hand' })}
                  onDragEnd={handleDragEnd}/>
              ))}
              {ps.hand.length === 0 && <span className="text-white/20 text-sm italic self-center px-2">手札なし</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ログ ─── */}
      {showLog && (
        <div className="fixed bottom-0 right-0 w-72 max-h-60 bg-[#080c1e]/97 border border-amber-900/40 rounded-tl-xl overflow-y-auto p-3 z-30">
          <div className="text-[10px] text-amber-600/70 font-bold mb-1 flex items-center gap-1"><Skull size={10}/> バトルログ</div>
          <BattleLog logs={state.battleLog}/>
        </div>
      )}

      {/* ─── キーボードショートカットヒント ─── */}
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

      {/* ═══ モーダル類 ═══ */}

      {/* トリガー（プレイヤー）*/}
      {state.pendingTrigger?.owner === 'player' && <TriggerModal card={state.pendingTrigger.card} onActivate={() => game.resolveTrigger(true)} onSkip={() => game.resolveTrigger(false)}/>}
      {/* トリガー（CPU）*/}
      {state.pendingTrigger?.owner === 'cpu' && <AutoCpuTrigger game={game} card={state.pendingTrigger.card}/>}

      {/* ブロッカーステップ */}
      <BlockerModal attackState={state.attackState} playerField={ps.field} onBlock={game.playerBlock} onPass={game.playerPassBlock}/>
      {/* カウンターステップ */}
      <CounterModal
        attackState={state.attackState} playerHand={ps.hand}
        onCounter={game.playerCounter} onConfirm={game.playerConfirmCounter}
        playerLeader={ps.leader} playerLeaderEffect={ps.leaderEffect}
        playerLeaderAbilityUsed={ps.leaderAbilityUsed}
        onLeaderDefenseAbility={game.playerUseLeaderDefenseAbility}
      />
      {/* キャラへの攻撃: ブロッカー後ダメージ確認 */}
      {state.attackState?.step === 'resolve-char' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0f24] border border-amber-600/40 rounded-2xl shadow-2xl max-w-xs w-full mx-4 p-5 text-center">
            <div className="text-amber-400 font-black text-base mb-2">⚔️ バトル解決</div>
            <div className="flex items-center justify-center gap-4 mb-3">
              <div><div className="text-[10px] text-red-400/60">攻撃</div><div className="font-black text-xl text-red-300">{state.attackState.attackPower.toLocaleString()}</div></div>
              <div className="text-xl">VS</div>
              <div><div className="text-[10px] text-blue-400/60">防御</div><div className="font-black text-xl text-blue-300">{state.attackState.defensePower.toLocaleString()}</div></div>
            </div>
            <div className={`text-sm font-bold mb-4 ${state.attackState.attackPower >= state.attackState.defensePower ? 'text-red-400' : 'text-green-400'}`}>
              {state.attackState.attackPower >= state.attackState.defensePower ? 'キャラがKO！' : '防御成功！'}
            </div>
            <button onClick={game.playerResolveCharAttack} className={`w-full py-2.5 rounded-xl text-sm font-black ${P.btnGold}`}>確定</button>
          </div>
        </div>
      )}

      {/* アタック解決（プレイヤー攻撃） */}
      {state.attackState?.step === 'resolving' && state.attackState?.owner === 'player' && (
        <AttackResolveModal attackState={state.attackState} cpuField={cs.field} cpuLeader={cs.leader} onResolve={handleResolveAttack} onCancel={handleCancelAttack}/>
      )}

      {/* 登場時効果 */}
      {pendingEntryEffect && <EntryEffectModal card={pendingEntryEffect} game={game}
        onActivate={() => setPendingEntryEffect(null)}
        onSkip={() => setPendingEntryEffect(null)}
        onChainPlay={(action) => {
          if (action.id === 'koOpponent' || action.id === 'restOpponent' || action.id === 'deckBottomOpponent') setPendingTargetEffect(action);
          else setPendingChainPlay(action);
        }}/>}
      {/* アタック時効果 */}
      {pendingAttackEffect && <AttackEffectModal card={pendingAttackEffect} game={game}
        onActivate={() => setPendingAttackEffect(null)}
        onSkip={() => setPendingAttackEffect(null)}
        onChainPlay={(action) => {
          if (action.id === 'koOpponent' || action.id === 'restOpponent' || action.id === 'deckBottomOpponent') setPendingTargetEffect(action);
          else setPendingChainPlay(action);
        }}/>}
      {/* イベント効果 */}
      {pendingEventEffect && <EventEffectModal card={pendingEventEffect} game={game}
        onActivate={() => setPendingEventEffect(null)}
        onSkip={() => setPendingEventEffect(null)}
        onChainPlay={(action) => {
          if (action.id === 'discardHand') setPendingDiscardHand(true);
          else if (action.id === 'koOpponent' || action.id === 'restOpponent' || action.id === 'deckBottomOpponent') setPendingTargetEffect(action);
          else setPendingChainPlay(action);
        }}/>}

      {/* 効果連鎖: 手札/トラッシュからキャラ登場 */}
      {pendingChainPlay && (ps.searchReveal?.length || 0) === 0 && (
        <PlayFromModal
          source={pendingChainPlay.id === 'playFromHand' ? 'hand' : 'trash'}
          cards={pendingChainPlay.id === 'playFromHand' ? ps.hand : ps.trash}
          limit={pendingChainPlay.limit}
          game={game}
          onDone={() => setPendingChainPlay(null)}/>
      )}

      {/* 効果: 相手キャラ対象選択（KO/レスト/デッキ下） */}
      {pendingTargetEffect && (
        <CpuCharTargetModal
          cpuField={cs.field}
          action={pendingTargetEffect.id}
          onConfirm={(charUid) => {
            if (pendingTargetEffect.id === 'koOpponent') game.playerKoCpuChar(charUid);
            else if (pendingTargetEffect.id === 'restOpponent') game.playerRestCpuChar(charUid);
            else if (pendingTargetEffect.id === 'deckBottomOpponent') game.playerDeckBottomCpuChar(charUid);
            setPendingTargetEffect(null);
          }}
          onCancel={() => setPendingTargetEffect(null)}/>
      )}

      {/* 効果コスト: 手札1枚捨てる */}
      {pendingDiscardHand && (
        <DiscardHandModal
          hand={ps.hand}
          onDiscard={(cardUid) => { game.playerDiscardHandCard(cardUid); setPendingDiscardHand(false); }}
          onCancel={() => setPendingDiscardHand(false)}/>
      )}

      {/* リーダー起動メイン効果 */}
      {showLeaderAbilityModal && ps.leaderEffect && (
        <LeaderAbilityModal leaderEffect={ps.leaderEffect} leaderName={ps.leader?.name} onConfirm={handleLeaderAbilityConfirm} onCancel={() => setShowLeaderAbilityModal(false)}/>
      )}

      {/* キャラクター選択（リーダー能力用）*/}
      {charSelectInfo && <CharacterSelectModal field={ps.field} info={charSelectInfo} onConfirm={handleCharSelectConfirm} onCancel={() => setCharSelectInfo(null)}/>}

      {/* キャラ起動メイン効果 */}
      {pendingCharAbility && <CharActiveModal card={pendingCharAbility} game={game}
        onActivate={() => setPendingCharAbility(null)}
        onSkip={() => setPendingCharAbility(null)}
        onChainPlay={(action) => {
          if (action.id === 'discardHand') setPendingDiscardHand(true);
          else if (action.id === 'koOpponent' || action.id === 'restOpponent' || action.id === 'deckBottomOpponent') setPendingTargetEffect(action);
          else setPendingChainPlay(action);
        }}/>}

      {/* サーチモーダル */}
      {(ps.searchReveal?.length || 0) > 0 && (
        <SearchModal revealed={ps.searchReveal} onResolve={game.playerResolveSearch} onCancel={game.playerCancelSearch}/>
      )}

      {/* トラッシュモーダル */}
      {showTrash && <TrashModal trash={ps.trash} onAction={handleTrashAction} onClose={() => setShowTrash(false)}/>}

      {/* アクションメニュー */}
      {actionMenu && <ActionMenu card={actionMenu.card} context={actionMenu.context} onAction={handleAction} onClose={() => setActionMenu(null)}/>}

      {/* カード詳細 */}
      {detailCard && <CardDetailModal card={detailCard} onClose={() => setDetailCard(null)}/>}

      {/* フェーズエラートースト */}
      {phaseError && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] bg-red-900/95 border border-red-600/60 rounded-xl px-4 py-2.5 text-red-100 text-sm font-bold shadow-2xl animate-bounce">
          {phaseError}
        </div>
      )}

      {/* 勝敗 */}
      {state.winner && <WinModal winner={state.winner} onReturn={() => { game.resetBattle(); onNavigate('home'); }} onRematch={handleRematch}/>}
    </div>
  );
}
