import { useState, useEffect } from 'react';
import { Home, RotateCcw, Shuffle, Anchor, Skull, Swords, X, Zap } from 'lucide-react';
import { useGameState, loadSavedDecks, resolveSampleDeck, LEADER_EFFECTS } from '../hooks/useGameState';
import { SAMPLE_DECKS } from '../utils/deckRules';
import CardImage from '../components/CardImage';
import PirateMapBg from '../components/PirateMapBg';

// ─── カードサイズ定数 ─────────────────────────────
const CARD = { W: 120, H: 168 };   // フィールド・リーダー
const HAND_CARD = { W: 96, H: 134 }; // 手札

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
  panel:   'bg-[#0d1530]/80 border border-[#8B6914]/25',
  label:   'text-[10px] text-amber-500/70 font-bold uppercase tracking-widest',
  btnGold: 'bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-amber-100 font-bold border border-amber-500/60 shadow-amber-900/40 shadow-md',
  btnRed:  'bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-red-100 font-bold border border-red-600/50',
  btnBlue: 'bg-gradient-to-b from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-blue-100 font-bold border border-blue-600/50',
  btnGray: 'bg-[#1a2040] hover:bg-[#232d55] text-amber-200/60 border border-amber-800/30',
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

// ─── ゲームカード（フィールド用）──────────────────
function GameCard({ card, tapped, faceDown, onClick, onDoubleClick, badge, highlight }) {
  return (
    <div
      className={`relative flex-shrink-0 cursor-pointer select-none rounded-xl overflow-hidden border-2 transition-all duration-150
        ${tapped ? 'rotate-90 origin-center opacity-75' : ''}
        ${highlight ? 'border-amber-400 shadow-amber-400/60 shadow-lg scale-105' : 'border-amber-900/40'}
        hover:border-amber-500/70 hover:scale-[1.03]`}
      style={{ width: CARD.W, height: CARD.H }}
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
      {badge > 0 && (
        <div className="absolute bottom-1 right-1 bg-amber-500 text-gray-900 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
          +{badge}
        </div>
      )}
    </div>
  );
}

// ─── 空スロット ──────────────────────────────────
function EmptySlot() {
  return (
    <div style={{ width: CARD.W, height: CARD.H }}
      className="rounded-xl border-2 border-dashed border-amber-900/20 flex items-center justify-center flex-shrink-0">
      <Anchor size={18} className="text-amber-900/20" />
    </div>
  );
}

// ─── DON!!コイン ─────────────────────────────────
function DonCoin({ active, onClick }) {
  return (
    <div onClick={onClick}
      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-black cursor-pointer transition-all select-none
        ${active
          ? 'bg-gradient-to-br from-amber-400 to-yellow-600 border-amber-300 text-gray-900 shadow-amber-500/50 shadow-md hover:from-amber-300'
          : 'bg-[#1a1800] border-amber-900/40 text-amber-900/50'
        }`}
      title={active ? 'DON!!（クリックでレスト）' : 'DON!!（レスト済み）'}>
      D
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
      {card?.cost > 0 && (
        <div className="absolute top-1 left-1 bg-amber-500/90 text-gray-900 text-[10px] font-black rounded w-5 h-5 flex items-center justify-center">
          {card.cost}
        </div>
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
    <div className="flex items-center gap-1.5">
      <div className="hidden lg:flex items-center gap-0.5">
        {PHASES.map((p, i) => (
          <div key={p.id} className="flex items-center">
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold
              ${i === activeIdx ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                : i < activeIdx ? 'text-amber-900/40 line-through' : 'text-amber-900/30'}`}>
              {p.icon}<span className="hidden xl:inline ml-0.5">{p.label}</span>
            </div>
            {i < PHASES.length - 1 && <span className="text-amber-900/20 text-[8px] mx-0.5">→</span>}
          </div>
        ))}
      </div>
      <div className="lg:hidden text-amber-300 text-xs font-bold">
        {PHASES[activeIdx]?.icon} {PHASES[activeIdx]?.label}
      </div>
      <button onClick={onAdvance}
        className={`flex-shrink-0 text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all ${P.btnGold}`}>
        {subPhase === 'end' ? '次ターン▶' : '次へ▶'}
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
  const [showSearchStart, setShowSearchStart] = useState(false); // サーチ枚数選択パネル

  const game = useGameState();
  const { state } = game;

  useEffect(() => {
    fetch('./cards.json')
      .then(r => r.json())
      .then(d => { setAllCards(d.cards || []); setLoadingCards(false); })
      .catch(() => setLoadingCards(false));
  }, []);

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
        if (selectedCard.context === 'hand')  game.returnHandToTop(uid);
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
  // ゲーム画面（プレイマット）
  // 新レイアウト:
  //  行1: [LIFE] [CHARACTER ZONE (compact)] [DECK+STAGE]
  //  行2: [    ] [LEADER (center) + DON!!  ] [         ]
  //  行3: [HAND (flex)                     ] [TRASH    ]
  // ─────────────────────────────────────────────────────
  const CHAR_ZONE_H = CARD.H + 28; // キャラゾーン固定高さ
  const LOWER_H = CARD.H + 32;     // リーダー+DONゾーン高さ
  const SIDE_W = 110;               // 左右カラム幅

  return (
    <div className={`h-screen ${P.bg} flex flex-col overflow-hidden select-none relative`}>

      {/* ─── 海賊地図背景 ─── */}
      <PirateMapBg />

      {/* ─── ヘッダー ─── */}
      <header className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-[#080c1e]/95 border-b border-amber-900/30 z-[10] flex-wrap relative">
        <button onClick={game.resetGame} className="text-amber-800/60 hover:text-amber-400 transition-colors flex-shrink-0">
          <Home size={16}/>
        </button>
        <div className="text-amber-400 font-black text-sm flex items-center gap-1 flex-shrink-0">
          <Skull size={12}/> T{s.turn}
          <span className="text-amber-700/60 text-[10px] font-normal">({s.playerOrder==='first'?'先':'後'})</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-amber-700/60 flex-shrink-0">
          <span>甲板<b className="text-amber-300/70 ml-0.5">{s.deck.length}</b></span>
          <span>手<b className="text-amber-300/70 ml-0.5">{s.hand.length}</b></span>
          <span>命<b className="text-red-400 ml-0.5">{s.life.length}</b></span>
        </div>
        <div className="flex-1 flex justify-center min-w-0">
          <PhaseBar subPhase={s.subPhase} onAdvance={game.advancePhase}/>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => game.drawCard(1)} className={`text-[10px] px-2 py-0.5 rounded border transition-all ${P.btnBlue}`}>+1ドロー</button>
          <button onClick={() => setShowSearchStart(true)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-all ${P.btnGold}`}
            title="デッキトップN枚を確認してカードを選ぶ">
            🔍 サーチ
          </button>
          <button onClick={game.resetGame} className="text-amber-900/50 hover:text-amber-500 transition-colors" title="リセット"><RotateCcw size={13}/></button>
          <button onClick={() => setShowLog(v=>!v)} className="text-amber-900/50 hover:text-amber-500 text-[10px] transition-colors">{showLog?'▼LOG':'▶LOG'}</button>
        </div>
      </header>

      {/* ─── プレイマット本体 ─── */}
      <div className="flex-1 flex flex-col overflow-hidden p-1.5 gap-1.5 min-h-0 relative z-[1]">

        {/* ── 行1: ライフ + キャラゾーン + デッキ/ステージ ── */}
        <div className="flex gap-1.5 flex-shrink-0" style={{ height: CHAR_ZONE_H }}>

          {/* 左: ライフ */}
          <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center justify-start overflow-visible`}
            style={{ width: SIDE_W }}>
            <LifeStack life={s.life} onFlip={game.flipLife}/>
          </div>

          {/* 中央: キャラクターゾーン */}
          <div className={`flex-1 ${P.panel} rounded-xl p-2`}
            style={{ backgroundImage: 'linear-gradient(135deg, #0d1f1015 0%, transparent 100%)' }}>
            <div className={`${P.label} mb-1.5`}>キャラクター ({s.field.length}/5) — ダブルクリックで効果確認</div>
            <div className="flex gap-2 items-end overflow-x-auto">
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

          {/* 右: デッキ + ステージ */}
          <div className="flex-shrink-0 flex flex-col gap-1.5" style={{ width: SIDE_W }}>
            {/* デッキ */}
            <div className={`${P.panel} rounded-xl p-2 flex flex-col items-center gap-1`}>
              <div className={P.label}>甲板</div>
              <div className="relative cursor-pointer" onClick={() => game.drawCard(1)} title="クリックでドロー">
                <div className="rounded-xl bg-gradient-to-br from-[#0d1530] to-[#06091a] border-2 border-amber-900/40 flex items-center justify-center hover:border-amber-600/60 transition-colors"
                  style={{ width: 72, height: 100 }}>
                  <Anchor size={22} className="text-amber-700/60"/>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-blue-700 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">{s.deck.length}</div>
              </div>
              <div className="text-[8px] text-amber-800/50 text-center">クリックでドロー</div>
            </div>
            {/* ステージ */}
            <div className={`${P.panel} rounded-xl p-2 flex flex-col items-center gap-1 flex-1`}>
              <div className={P.label}>ステージ</div>
              {s.stage ? (
                <div className="cursor-pointer rounded-xl overflow-hidden border border-amber-900/40"
                  onClick={() => handleCardDoubleClick(s.stage)}>
                  <CardImage card={s.stage} className="object-cover" style={{ width:72, height:100 }}/>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-amber-900/20 flex items-center justify-center"
                  style={{ width:72, height:100 }}>
                  <span className="text-amber-900/25 text-[9px]">なし</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 行2: リーダー(中央) + DON!!ゾーン ── */}
        <div className="flex gap-1.5 flex-shrink-0" style={{ height: LOWER_H }}>

          {/* 左: 空白スペーサー（ライフ列と幅合わせ）*/}
          <div style={{ width: SIDE_W }} className="flex-shrink-0" />

          {/* リーダー */}
          <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1`}
            style={{ width: CARD.W + 24 }}>
            <div className={P.label}>リーダー</div>
            <div className="relative">
              <GameCard
                card={s.leader}
                tapped={s.leader.tapped}
                badge={s.leader.donAttached}
                highlight={selectedCard?.context === 'leader'}
                onClick={() => handleCardClick(s.leader, 'leader', 'leader')}
                onDoubleClick={() => handleCardDoubleClick(s.leader)}
              />
              {/* リーダー効果バッジ — カード左下にオーバーレイ */}
              <div className="absolute bottom-1 left-1 z-10">
                <LeaderEffectBadge
                  leaderEffect={s.leaderEffect}
                  leaderName={s.leader?.name}
                  onUseAbility={s.leaderEffect?.hasActiveAbility ? handleLeaderAbility : null}
                />
              </div>
            </div>
          </div>

          {/* DON!!ゾーン */}
          <div className={`flex-1 ${P.panel} rounded-xl p-3`}
            style={{ backgroundImage: 'linear-gradient(135deg, #2a1d0015 0%, transparent 100%)' }}>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
              <div className="text-[11px] text-amber-500/80 font-bold">
                💛 DON!! ({donTotal}/{s.donMax}) デッキ残{s.donDeck}
                {s.donMax < 10 && <span className="ml-1 text-amber-600/60 text-[10px]">（上限{s.donMax}）</span>}
              </div>
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => game.tapDon(1)}
                  className={`text-[9px] px-2 py-0.5 rounded border transition-all ${P.btnGray}`}>レスト×1</button>
                <button onClick={() => game.returnDonToDeck(1)}
                  className={`text-[9px] px-2 py-0.5 rounded border transition-all ${P.btnGray}`}>アクティブ→デッキ</button>
                <button onClick={() => game.returnTappedDonToDeck(1)}
                  className={`text-[9px] px-2 py-0.5 rounded border transition-all ${P.btnGray}`}>レスト→デッキ</button>
                <button onClick={game.attachDonToLeader}
                  className={`text-[9px] px-2 py-0.5 rounded border transition-all ${P.btnGold}`}>リーダーに+1</button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: s.donActive }).map((_, i) => (
                <DonCoin key={`a-${i}`} active={true} onClick={() => game.tapDon(1)}/>
              ))}
              {Array.from({ length: s.donTapped }).map((_, i) => (
                <DonCoin key={`t-${i}`} active={false}/>
              ))}
              {s.donLeader > 0 && <span className="text-amber-600/70 text-[10px] self-center ml-1">リーダー+{s.donLeader}</span>}
              {donTotal === 0 && <span className="text-amber-900/40 text-sm italic self-center">次フェイズでDON!!補充</span>}
            </div>
          </div>

          {/* 右: 空白スペーサー */}
          <div style={{ width: SIDE_W }} className="flex-shrink-0"/>
        </div>

        {/* ── 行3: 手札 + トラッシュ ── */}
        <div className="flex gap-1.5 flex-1 min-h-0">
          {/* 手札 */}
          <div className={`flex-1 ${P.panel} rounded-xl px-3 py-2 flex flex-col min-w-0`}>
            <div className="flex items-center gap-2 mb-1.5 flex-shrink-0">
              <div className={P.label}>手札 ({s.hand.length}枚)</div>
              <div className="text-[9px] text-amber-900/40">クリック→操作 / ダブルクリック→効果確認</div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 items-end">
              {s.hand.map(card => (
                <HandCard key={card._uid} card={card}
                  selected={selectedCard?.uid === card._uid}
                  onClick={() => handleCardClick(card, 'hand', card._uid)}
                  onDoubleClick={() => handleCardDoubleClick(card)}
                />
              ))}
              {s.hand.length === 0 && <span className="text-amber-900/30 text-sm italic py-3 px-2">手札なし</span>}
            </div>
          </div>

          {/* トラッシュ（右下）*/}
          <div className={`flex-shrink-0 ${P.panel} rounded-xl p-2 flex flex-col items-center gap-1`}
            style={{ width: SIDE_W }}>
            <div className={P.label}>トラッシュ</div>
            {s.trash.length > 0 ? (
              <div className="relative cursor-pointer" onClick={() => handleCardDoubleClick(s.trash[s.trash.length-1])}
                title="クリックで効果確認">
                <CardImage card={s.trash[s.trash.length-1]}
                  className="rounded-xl border border-amber-900/40 opacity-60 object-cover"
                  style={{ width:80, height:112 }}/>
                <div className="absolute -bottom-1 -right-1 bg-amber-900/80 text-amber-300 text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-amber-700/50">
                  {s.trash.length}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-amber-900/20 flex items-center justify-center"
                style={{ width:80, height:112 }}>
                <span className="text-amber-900/25 text-[9px]">0</span>
              </div>
            )}
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
