import { useState, useEffect, useRef } from 'react';
import { Home, RotateCcw, Shuffle, Anchor, Skull, Swords } from 'lucide-react';
import { useGameState, loadSavedDecks, resolveSampleDeck, expandDeck } from '../hooks/useGameState';
import { SAMPLE_DECKS } from '../utils/deckRules';
import CardImage from '../components/CardImage';

// ─── フェイズ定義 ───────────────────────────────
const PHASES = [
  { id: 'refresh', label: 'リフレッシュ', icon: '🔄', desc: '全カードアンタップ・DON!!回収' },
  { id: 'draw',    label: 'ドロー',       icon: '📚', desc: '1枚ドロー（先行1Tはスキップ）' },
  { id: 'don',     label: 'DON!!',        icon: '💛', desc: 'DON!!デッキから補充' },
  { id: 'main',    label: 'メイン',       icon: '⚔',  desc: 'カードをプレイ・アタック' },
  { id: 'end',     label: 'エンド',       icon: '⏹',  desc: '次のターンへ' },
];
const PHASE_NEXT_LABEL = {
  refresh: 'ドローフェイズへ（アンタップ）',
  draw:    'DON!!フェイズへ（ドロー）',
  don:     'メインフェイズへ（DON!!補充）',
  main:    'エンドフェイズへ',
  end:     '次のターン開始',
};

// ─── 海賊テーマ定数 ─────────────────────────────
const PIRATE = {
  bg:         'bg-[#06091a]',
  panel:      'bg-[#0d1530]/80 border border-[#8B6914]/25',
  panelHover: 'hover:border-amber-600/50',
  text:       'text-amber-100',
  textMuted:  'text-amber-200/40',
  textGold:   'text-amber-400',
  textGoldDim:'text-amber-600/70',
  label:      'text-[10px] text-amber-500/70 font-bold uppercase tracking-widest',
  btnGold:    'bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-amber-100 font-bold border border-amber-500/60 shadow-amber-900/40 shadow-md',
  btnRed:     'bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-red-100 font-bold border border-red-600/50',
  btnBlue:    'bg-gradient-to-b from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-blue-100 font-bold border border-blue-600/50',
  btnGray:    'bg-[#1a2040] hover:bg-[#232d55] text-amber-200/60 border border-amber-800/30',
};

// ─── ライフスタック（縦にオフセット重ね）──────────
function LifeStack({ life, onFlip }) {
  const offset = 10;
  const cardH = 80; // h-20 = 80px
  const cardW = 56; // w-14 = 56px
  const totalH = life.length > 0 ? cardH + (life.length - 1) * offset : cardH;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={PIRATE.label}>LIFE</div>
      <div className="relative cursor-pointer" style={{ height: totalH, width: cardW }}
        onClick={life.length > 0 ? onFlip : undefined}
        title="クリックでライフをめくる">
        {life.length === 0 ? (
          <div className="w-14 h-20 rounded-lg border-2 border-dashed border-red-900/40 flex items-center justify-center">
            <Skull size={20} className="text-red-900/50" />
          </div>
        ) : (
          // life[0] = 次にめくるカード → 一番手前（最下）に描画, 最大z-index
          [...life].map((card, i) => {
            const visualPos = life.length - 1 - i; // life[0] → bottom (最大位置)
            const isTop = i === 0;
            return (
              <div
                key={card._uid}
                className="absolute transition-all"
                style={{ top: visualPos * offset, left: 0, zIndex: i + 1 }}
              >
                <div className={`w-14 h-20 rounded-lg border-2 flex items-center justify-center
                  ${isTop
                    ? 'bg-gradient-to-br from-red-900 to-[#1a0505] border-red-700/80 shadow-lg shadow-red-900/50 hover:border-red-400'
                    : 'bg-gradient-to-br from-red-950 to-[#0d0505] border-red-900/40'
                  }`}>
                  <span className="text-red-500/80 text-2xl">☠</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="text-red-500 text-[10px] font-bold">{life.length}枚</div>
    </div>
  );
}

// ─── ゲームカード ─────────────────────────────────
function GameCard({ card, tapped, faceDown, small, onClick, badge, highlight }) {
  const w = small ? 'w-14' : 'w-[72px]';
  const h = small ? 'h-20' : 'h-24';
  return (
    <div
      className={`relative flex-shrink-0 cursor-pointer select-none rounded-lg overflow-hidden border-2 transition-all duration-150
        ${tapped ? 'rotate-90 origin-center opacity-70' : ''}
        ${highlight ? 'border-amber-400 shadow-amber-400/60 shadow-lg scale-105' : 'border-amber-900/40'}
        hover:border-amber-500/70 hover:scale-105
      `}
      onClick={onClick}
      title={faceDown ? '（裏向き）' : card?.name}
    >
      {faceDown ? (
        <div className={`${w} ${h} bg-gradient-to-br from-red-900/60 to-[#06091a] flex items-center justify-center`}>
          <span className="text-red-600/70 text-3xl">☠</span>
        </div>
      ) : (
        <CardImage card={card} className={`${w} ${h} object-cover`} />
      )}
      {badge > 0 && (
        <div className="absolute bottom-0.5 right-0.5 bg-amber-500 text-gray-900 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
          +{badge}
        </div>
      )}
    </div>
  );
}

// ─── 空スロット ──────────────────────────────────
function EmptySlot() {
  return (
    <div className="w-[72px] h-24 rounded-lg border-2 border-dashed border-amber-900/20 flex items-center justify-center">
      <Anchor size={14} className="text-amber-900/30" />
    </div>
  );
}

// ─── DON!!コイン ──────────────────────────────────
function DonCoin({ active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black cursor-pointer transition-all select-none
        ${active
          ? 'bg-gradient-to-br from-amber-400 to-yellow-600 border-amber-300 text-gray-900 shadow-amber-500/50 shadow-md hover:from-amber-300 hover:to-yellow-500'
          : 'bg-[#1a1800] border-amber-900/40 text-amber-900/50'
        }`}
      title={active ? 'DON!!（タップして使用）' : 'DON!!（レスト済み）'}
    >
      D
    </div>
  );
}

// ─── 手札カード ──────────────────────────────────
function HandCard({ card, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`relative flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-150 hover:scale-110 hover:-translate-y-2
        ${selected
          ? 'border-amber-400 -translate-y-3 shadow-amber-400/60 shadow-xl'
          : 'border-amber-900/40 hover:border-amber-600/70'}
      `}
    >
      <CardImage card={card} className="w-[60px] h-[84px] object-cover" />
      {selected && <div className="absolute inset-0 bg-amber-400/10 pointer-events-none" />}
      {card.cost > 0 && (
        <div className="absolute top-0.5 left-0.5 bg-amber-500/90 text-gray-900 text-[9px] font-black rounded w-3.5 h-3.5 flex items-center justify-center">
          {card.cost}
        </div>
      )}
    </div>
  );
}

// ─── アクションメニュー ──────────────────────────
function ActionMenu({ card, context, onAction, onClose }) {
  if (!card) return null;
  const actions = [];
  if (context === 'hand') {
    if (card.card_type === 'CHARACTER') actions.push({ id: 'play',       label: `⚔ フィールドに出す（コスト${card.cost || 0}）` });
    if (card.card_type === 'STAGE')     actions.push({ id: 'stage',      label: `🏝 ステージにセット（コスト${card.cost || 0}）` });
    if (card.card_type === 'EVENT')     actions.push({ id: 'event',      label: `📜 イベント使用（コスト${card.cost || 0}）` });
    actions.push({ id: 'trash-hand', label: '🗑 手札からトラッシュ' });
  }
  if (context === 'field') {
    actions.push({ id: 'tap',         label: card.tapped ? '↩ アンタップ' : '⚔ タップ（アタック）' });
    actions.push({ id: 'attach-don',  label: '💛 DON!!アタッチ +1' });
    actions.push({ id: 'trash-field', label: '💀 KO → トラッシュ' });
  }
  if (context === 'leader') {
    actions.push({ id: 'tap-leader',        label: card.tapped ? '↩ アンタップ' : '⚔ タップ（アタック）' });
    actions.push({ id: 'attach-don-leader', label: '💛 DON!!アタッチ +1' });
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="bg-[#0d1530] border border-amber-700/40 rounded-2xl shadow-2xl shadow-amber-900/20 p-2 min-w-[240px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-amber-900/30 mb-1">
          <div className="text-amber-400 text-xs font-bold truncate">{card.name}</div>
          <div className="text-amber-600/60 text-[10px]">{card.card_type}{card.cost > 0 ? ` • コスト${card.cost}` : ''}</div>
        </div>
        {actions.map(a => (
          <button key={a.id}
            onClick={() => { onAction(a.id); onClose(); }}
            className="w-full text-left px-3 py-2 text-sm text-amber-100/90 hover:bg-amber-900/30 rounded-lg transition-colors">
            {a.label}
          </button>
        ))}
        <button onClick={onClose}
          className="w-full text-left px-3 py-1.5 text-xs text-amber-800/60 hover:text-amber-500 transition-colors mt-1">
          ✕ キャンセル
        </button>
      </div>
    </div>
  );
}

// ─── フェイズバー ────────────────────────────────
function PhaseBar({ subPhase, turn, playerOrder, onAdvance }) {
  const activeIdx = PHASES.findIndex(p => p.id === subPhase);
  const nextLabel = PHASE_NEXT_LABEL[subPhase] || '次へ';
  return (
    <div className="flex items-center gap-2">
      {/* フェイズ一覧 */}
      <div className="hidden sm:flex items-center gap-0.5">
        {PHASES.map((p, i) => (
          <div key={p.id} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold transition-all
              ${i === activeIdx
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                : i < activeIdx
                  ? 'text-amber-800/50 line-through'
                  : 'text-amber-900/40'
              }`}>
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </div>
            {i < PHASES.length - 1 && <span className="text-amber-900/30 text-[8px] mx-0.5">→</span>}
          </div>
        ))}
      </div>
      {/* モバイル用フェイズ表示 */}
      <div className="sm:hidden text-amber-300 text-xs font-bold">
        {PHASES[activeIdx]?.icon} {PHASES[activeIdx]?.label}
      </div>
      {/* 次のフェイズボタン */}
      <button
        onClick={onAdvance}
        className={`flex-shrink-0 text-[10px] px-2.5 py-1 rounded-lg transition-all font-bold ${PIRATE.btnGold}`}
        title={nextLabel}
      >
        {subPhase === 'end' ? '次ターン ▶' : subPhase === 'main' ? 'エンドへ ▶' : `次へ ▶`}
      </button>
    </div>
  );
}

// ─── デッキ選択画面 ──────────────────────────────
function DeckSelectScreen({ allCards, onSelect }) {
  const cardMap = {};
  allCards.forEach(c => { cardMap[c.card_number] = c; });
  const saved = Object.values(loadSavedDecks()).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  const samples = [...SAMPLE_DECKS].sort((a, b) => {
    const pd = s => { const [y,m,d]=s.split('/').map(Number); return new Date(y,m-1,d); };
    return pd(b.date) - pd(a.date);
  });
  return (
    <div className={`min-h-screen ${PIRATE.bg} flex flex-col items-center p-6 overflow-y-auto`}
      style={{ backgroundImage: 'radial-gradient(ellipse at 30% 20%, #0d1f4020 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, #1a0d0020 0%, transparent 60%)' }}>
      <div className="w-full max-w-2xl">
        <h2 className="text-amber-400 font-black text-2xl mb-1 flex items-center gap-2">
          <Anchor size={20} /> デッキを選択
        </h2>
        <p className="text-amber-700/60 text-sm mb-6">一人回しするデッキを選んでください</p>

        {saved.length > 0 && (
          <section className="mb-6">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">保存済みデッキ</div>
            <div className="space-y-2">
              {saved.map(d => (
                <button key={d.id}
                  onClick={() => onSelect(d.leader, d.deck)}
                  className={`w-full flex items-center gap-3 p-3 ${PIRATE.panel} rounded-xl ${PIRATE.panelHover} transition-all text-left hover:shadow-lg hover:shadow-amber-900/20`}>
                  <CardImage card={d.leader} className="w-10 h-14 object-cover rounded-lg flex-shrink-0 border border-amber-900/40" />
                  <div className="flex-1 min-w-0">
                    <div className="text-amber-100 text-sm font-bold truncate">{d.name}</div>
                    <div className="text-amber-700/60 text-xs">{d.leader?.name} • {Object.values(d.deck).reduce((s,e)=>s+e.count,0)}枚</div>
                  </div>
                  <div className="text-amber-500 text-xs flex-shrink-0 font-bold">出航 ⚓</div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">優勝サンプルデッキ</div>
          <div className="space-y-2">
            {samples.map(s => {
              const resolved = resolveSampleDeck(s, cardMap);
              if (!resolved.leader) return null;
              return (
                <button key={s.id}
                  onClick={() => onSelect(resolved.leader, resolved.entries)}
                  className={`w-full flex items-center gap-3 p-3 ${PIRATE.panel} rounded-xl ${PIRATE.panelHover} transition-all text-left hover:shadow-lg hover:shadow-amber-900/20`}>
                  <CardImage card={resolved.leader} className="w-10 h-14 object-cover rounded-lg flex-shrink-0 border border-amber-900/40" />
                  <div className="flex-1 min-w-0">
                    <div className="text-amber-100 text-sm font-bold truncate">{s.name}</div>
                    <div className="text-amber-700/60 text-xs">{s.date} • {s.event}</div>
                  </div>
                  <div className="text-amber-500 text-xs flex-shrink-0 font-bold">出航 ⚓</div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── 先行/後攻 選択画面 ──────────────────────────
function PlayerOrderScreen({ leader, onSelect, onBack }) {
  return (
    <div className={`min-h-screen ${PIRATE.bg} flex flex-col items-center justify-center p-6`}
      style={{ backgroundImage: 'radial-gradient(ellipse at 50% 30%, #1a0d0030 0%, transparent 60%)' }}>
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Skull size={40} className="text-amber-500/60" />
        </div>
        <h2 className="text-amber-400 font-black text-2xl mb-2">先行 / 後攻</h2>
        <p className="text-amber-700/60 text-sm mb-8">どちらで始めますか？</p>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* 先行 */}
          <button onClick={() => onSelect('first')}
            className="group flex-1 flex flex-col items-center gap-3 p-6 bg-[#0d1530]/80 border border-amber-700/30 rounded-2xl hover:border-amber-500/60 hover:bg-[#131d45]/80 transition-all shadow-lg hover:shadow-amber-900/30">
            <div className="w-14 h-14 rounded-full bg-amber-900/30 border border-amber-600/40 flex items-center justify-center group-hover:bg-amber-800/40 transition-all">
              <Swords size={28} className="text-amber-400" />
            </div>
            <div>
              <div className="text-amber-300 font-black text-xl mb-1">先行</div>
              <div className="text-amber-700/70 text-xs leading-relaxed">
                最初に行動<br />ターン1はドロー無し<br />DON!! +1枚
              </div>
            </div>
          </button>

          {/* 後攻 */}
          <button onClick={() => onSelect('second')}
            className="group flex-1 flex flex-col items-center gap-3 p-6 bg-[#0d1530]/80 border border-blue-700/30 rounded-2xl hover:border-blue-500/60 hover:bg-[#0d1530]/80 transition-all shadow-lg hover:shadow-blue-900/30">
            <div className="w-14 h-14 rounded-full bg-blue-900/30 border border-blue-600/40 flex items-center justify-center group-hover:bg-blue-800/40 transition-all">
              <Anchor size={28} className="text-blue-400" />
            </div>
            <div>
              <div className="text-blue-300 font-black text-xl mb-1">後攻</div>
              <div className="text-blue-700/70 text-xs leading-relaxed">
                2番目に行動<br />ターン1からドロー有り<br />DON!! +2枚
              </div>
            </div>
          </button>
        </div>

        <button onClick={onBack} className="mt-6 text-amber-800/60 hover:text-amber-500 text-xs transition-colors">
          ← デッキ選択に戻る
        </button>
      </div>
    </div>
  );
}

// ─── マリガン画面 ────────────────────────────────
function MulliganScreen({ state, onMulligan, onStart, onBack }) {
  const orderLabel = state.playerOrder === 'first' ? '先行' : '後攻';
  return (
    <div className={`min-h-screen ${PIRATE.bg} flex flex-col items-center justify-center gap-6 p-6`}>
      <div className="text-center">
        <div className="text-amber-500/70 text-sm mb-1">【{orderLabel}】デッキ: {state.deck.length + state.hand.length + state.life.length}枚</div>
        <h2 className="text-amber-300 font-black text-xl">マリガンしますか？</h2>
        <div className="text-amber-700/60 text-sm mt-1">マリガン回数: {state.mulliganCount}回（何度でも可）</div>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        {state.hand.map(card => (
          <div key={card._uid} className="rounded-lg overflow-hidden border border-amber-900/40 shadow-lg">
            <CardImage card={card} className="w-20 h-28 object-cover" />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onMulligan}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${PIRATE.btnRed}`}>
          <Shuffle size={15} />
          マリガン ({state.mulliganCount}回目)
        </button>
        <button onClick={onStart}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${PIRATE.btnGold}`}>
          <Anchor size={15} />
          出航！ゲーム開始
        </button>
      </div>
      <button onClick={onBack} className="text-amber-800/60 hover:text-amber-500 text-xs transition-colors">
        ← デッキ選択に戻る
      </button>
    </div>
  );
}

// ─── メインプレイマット ──────────────────────────
export default function SoloPlayPage({ onNavigate }) {
  const [allCards, setAllCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [screen, setScreen] = useState('deck-select'); // 'deck-select'|'order-select'
  const [pendingLeader, setPendingLeader] = useState(null);
  const [pendingEntries, setPendingEntries] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showLog, setShowLog] = useState(false);

  const game = useGameState();
  const { state } = game;

  // カードデータ読み込み
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

  const handleAction = (actionId) => {
    if (!selectedCard) return;
    const { uid } = selectedCard;
    switch (actionId) {
      case 'play':              game.playToField(uid); break;
      case 'stage':             game.playStage(uid); break;
      case 'event':             game.trashHandCard(uid); break;
      case 'trash-hand':        game.trashHandCard(uid); break;
      case 'tap':               game.toggleFieldCard(uid); break;
      case 'attach-don':        game.attachDonToField(uid); break;
      case 'trash-field':       game.trashFieldCard(uid); break;
      case 'tap-leader':        game.toggleLeader(); break;
      case 'attach-don-leader': game.attachDonToLeader(); break;
    }
    setSelectedCard(null);
  };

  if (loadingCards) {
    return (
      <div className={`h-screen ${PIRATE.bg} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-3">
          <Anchor size={32} className="text-amber-600 animate-pulse" />
          <div className="text-amber-600/70 text-sm">カードデータ読み込み中...</div>
        </div>
      </div>
    );
  }

  // ── デッキ選択 ──
  if (!state && screen === 'deck-select') {
    return (
      <div className={`h-screen ${PIRATE.bg} flex flex-col`}>
        <header className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-[#080c1e]/95 border-b border-amber-900/30`}>
          <button onClick={() => onNavigate('home')} className="text-amber-800/60 hover:text-amber-400 transition-colors">
            <Home size={18} />
          </button>
          <Anchor size={14} className="text-amber-700/60" />
          <span className="text-amber-300 font-bold text-sm">一人回し — デッキ選択</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <DeckSelectScreen
            allCards={allCards}
            onSelect={(leader, entries) => {
              setPendingLeader(leader);
              setPendingEntries(entries);
              setScreen('order-select');
            }}
          />
        </div>
      </div>
    );
  }

  // ── 先行/後攻 選択 ──
  if (!state && screen === 'order-select') {
    return (
      <div className={`h-screen ${PIRATE.bg} flex flex-col`}>
        <header className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-[#080c1e]/95 border-b border-amber-900/30`}>
          <button onClick={() => setScreen('deck-select')} className="text-amber-800/60 hover:text-amber-400 transition-colors">
            <Home size={18} />
          </button>
          <Anchor size={14} className="text-amber-700/60" />
          <span className="text-amber-300 font-bold text-sm">一人回し — 先行/後攻</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <PlayerOrderScreen
            leader={pendingLeader}
            onSelect={(order) => {
              const cardMap = {};
              allCards.forEach(c => { cardMap[c.card_number] = c; });
              // savedDeck entries or resolved entries
              const entries = Array.isArray(pendingEntries)
                ? pendingEntries
                : Object.values(pendingEntries).map(e => ({ card: cardMap[e.card?.card_number || e.cardNumber] || e.card, count: e.count })).filter(e => e.card);
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
      <div className={`h-screen ${PIRATE.bg} flex flex-col`}>
        <header className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-[#080c1e]/95 border-b border-amber-900/30`}>
          <button onClick={game.resetGame} className="text-amber-800/60 hover:text-amber-400 transition-colors">
            <Home size={18} />
          </button>
          <Anchor size={14} className="text-amber-700/60" />
          <span className="text-amber-300 font-bold text-sm">一人回し — マリガン</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <MulliganScreen
            state={state}
            onMulligan={game.mulligan}
            onStart={game.startMainGame}
            onBack={game.resetGame}
          />
        </div>
      </div>
    );
  }

  // ── ゲーム画面（プレイマット）──
  if (!state) return null;
  const s = state;
  const donTotal = s.donActive + s.donTapped;
  const orderLabel = s.playerOrder === 'first' ? '先' : '後';

  return (
    <div className={`h-screen ${PIRATE.bg} flex flex-col overflow-hidden select-none`}
      style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, #0d1f2008 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, #1a0d0008 0%, transparent 50%)' }}>

      {/* ─── ヘッダー ─── */}
      <header className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-[#080c1e]/95 border-b border-amber-900/30 z-10 flex-wrap">
        {/* 左: ホーム + ターン情報 */}
        <button onClick={game.resetGame} className="text-amber-800/60 hover:text-amber-400 transition-colors flex-shrink-0">
          <Home size={16} />
        </button>
        <div className={`flex-shrink-0 text-amber-400 font-black text-sm flex items-center gap-1`}>
          <Skull size={12} />
          T{s.turn}<span className="text-amber-700/60 text-[10px] font-normal">({orderLabel})</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-amber-700/60">
          <span>甲板 <b className="text-amber-200/70">{s.deck.length}</b></span>
          <span>手 <b className="text-amber-200/70">{s.hand.length}</b></span>
          <span>命 <b className="text-red-400">{s.life.length}</b></span>
          <span>捨 <b className="text-amber-900/60">{s.trash.length}</b></span>
        </div>

        {/* 中央: フェイズバー */}
        <div className="flex-1 flex justify-center min-w-0">
          <PhaseBar
            subPhase={s.subPhase}
            turn={s.turn}
            playerOrder={s.playerOrder}
            onAdvance={game.advancePhase}
          />
        </div>

        {/* 右: ドロー + リセット + ログ */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => game.drawCard(1)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${PIRATE.btnBlue}`}>
            +1ドロー
          </button>
          <button onClick={game.resetGame}
            className="text-amber-900/50 hover:text-amber-500 transition-colors" title="デッキ選択へ">
            <RotateCcw size={13} />
          </button>
          <button onClick={() => setShowLog(v => !v)}
            className="text-amber-900/50 hover:text-amber-500 transition-colors text-[10px]">
            {showLog ? '▼LOG' : '▶LOG'}
          </button>
        </div>
      </header>

      {/* ─── プレイマット ─── */}
      <div className="flex-1 flex flex-col overflow-hidden p-1.5 gap-1.5">

        {/* 上段: フィールドエリア */}
        <div className="flex gap-1.5 flex-1 min-h-0">

          {/* 左カラム: ライフ + リーダー */}
          <div className="flex flex-col gap-1.5 flex-shrink-0 w-[76px]">
            {/* ライフ */}
            <div className={`${PIRATE.panel} rounded-xl p-2 flex flex-col items-center`}>
              <LifeStack life={s.life} onFlip={game.flipLife} />
            </div>
            {/* リーダー */}
            <div className={`${PIRATE.panel} rounded-xl p-2 flex flex-col items-center gap-1 flex-1`}>
              <div className={PIRATE.label}>リーダー</div>
              <GameCard
                card={s.leader}
                tapped={s.leader.tapped}
                badge={s.leader.donAttached}
                highlight={selectedCard?.context === 'leader'}
                onClick={() => handleCardClick(s.leader, 'leader', 'leader')}
              />
            </div>
          </div>

          {/* 中央: キャラクター + DON!! */}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">

            {/* キャラクターゾーン */}
            <div className={`flex-1 ${PIRATE.panel} rounded-xl p-2`} style={{ backgroundImage: 'linear-gradient(135deg, #0d1f1020 0%, transparent 100%)' }}>
              <div className={`${PIRATE.label} mb-1.5`}>
                キャラクターゾーン ({s.field.length}/5)
              </div>
              <div className="flex gap-2 items-end flex-wrap">
                {s.field.map(card => (
                  <GameCard
                    key={card._uid}
                    card={card}
                    tapped={card.tapped}
                    badge={card.donAttached}
                    highlight={selectedCard?.uid === card._uid}
                    onClick={() => handleCardClick(card, 'field', card._uid)}
                  />
                ))}
                {Array.from({ length: Math.max(0, 5 - s.field.length) }).map((_, i) => (
                  <EmptySlot key={i} />
                ))}
              </div>
            </div>

            {/* DON!!ゾーン */}
            <div className={`${PIRATE.panel} rounded-xl p-2`} style={{ backgroundImage: 'linear-gradient(135deg, #2a1d0020 0%, transparent 100%)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest">
                  DON!! ({donTotal}/10) • デッキ残{s.donDeck}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => game.tapDon(1)}
                    className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${PIRATE.btnGray}`}>
                    レスト×1
                  </button>
                  <button onClick={() => game.returnDonToDeck(1)}
                    className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${PIRATE.btnGray}`}>
                    デッキへ返す
                  </button>
                  <button onClick={game.attachDonToLeader}
                    className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${PIRATE.btnGold}`}>
                    リーダーに+1
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: s.donActive }).map((_, i) => (
                  <DonCoin key={`a-${i}`} active={true} onClick={() => game.tapDon(1)} />
                ))}
                {Array.from({ length: s.donTapped }).map((_, i) => (
                  <DonCoin key={`t-${i}`} active={false} />
                ))}
                {s.donLeader > 0 && (
                  <div className="flex items-center ml-1">
                    <span className="text-amber-600/70 text-[9px]">リーダー+{s.donLeader}</span>
                  </div>
                )}
                {donTotal === 0 && (
                  <span className="text-amber-900/40 text-xs italic">フェイズを進めるとDON!!が補充されます</span>
                )}
              </div>
            </div>
          </div>

          {/* 右カラム: デッキ + ステージ */}
          <div className="flex flex-col gap-1.5 flex-shrink-0 w-[76px]">

            {/* デッキ */}
            <div className={`${PIRATE.panel} rounded-xl p-2 flex flex-col items-center gap-1`}>
              <div className={PIRATE.label}>甲板（デッキ）</div>
              <div className="relative cursor-pointer" onClick={() => game.drawCard(1)} title="クリックで1枚ドロー">
                <div className="w-[56px] h-20 rounded-lg bg-gradient-to-br from-[#0d1530] to-[#06091a] border-2 border-amber-900/40 flex items-center justify-center hover:border-amber-600/60 transition-colors">
                  <Anchor size={20} className="text-amber-700/60" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-blue-700 text-white text-[9px] font-black rounded-full w-4.5 h-4.5 w-5 h-5 flex items-center justify-center">
                  {s.deck.length}
                </div>
              </div>
              <div className="text-[8px] text-amber-800/50 text-center">クリックで<br/>ドロー</div>
            </div>

            {/* ステージ */}
            <div className={`${PIRATE.panel} rounded-xl p-2 flex flex-col items-center gap-1 flex-1`}>
              <div className={PIRATE.label}>ステージ</div>
              {s.stage ? (
                <CardImage card={s.stage} className="w-[56px] h-20 object-cover rounded-lg border border-amber-900/40" />
              ) : (
                <div className="w-[56px] h-20 rounded-lg border-2 border-dashed border-amber-900/20 flex items-center justify-center">
                  <span className="text-amber-900/30 text-[9px] text-center">なし</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 下段: 手札 + トラッシュ */}
        <div className="flex-shrink-0 flex gap-1.5">
          {/* 手札 */}
          <div className={`flex-1 ${PIRATE.panel} rounded-xl px-3 py-2 min-w-0`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={PIRATE.label}>手札 ({s.hand.length}枚)</div>
              <div className="text-[9px] text-amber-900/40">クリックして操作</div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {s.hand.map(card => (
                <HandCard
                  key={card._uid}
                  card={card}
                  selected={selectedCard?.uid === card._uid}
                  onClick={() => handleCardClick(card, 'hand', card._uid)}
                />
              ))}
              {s.hand.length === 0 && (
                <span className="text-amber-900/30 text-sm italic py-3 px-2">手札なし</span>
              )}
            </div>
          </div>

          {/* トラッシュ（右下）*/}
          <div className={`flex-shrink-0 w-[80px] ${PIRATE.panel} rounded-xl p-2 flex flex-col items-center gap-1`}>
            <div className={PIRATE.label}>トラッシュ</div>
            {s.trash.length > 0 ? (
              <div className="relative">
                <CardImage card={s.trash[s.trash.length - 1]} className="w-[56px] h-[76px] object-cover rounded-lg border border-amber-900/40 opacity-60" />
                <div className="absolute -bottom-1 -right-1 bg-amber-900/80 text-amber-300 text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-amber-700/50">
                  {s.trash.length}
                </div>
              </div>
            ) : (
              <div className="w-[56px] h-[76px] rounded-lg border-2 border-dashed border-amber-900/20 flex items-center justify-center">
                <span className="text-amber-900/30 text-[9px]">0</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── ログパネル ─── */}
      {showLog && (
        <div className="fixed bottom-0 right-0 w-72 max-h-60 bg-[#080c1e]/97 border border-amber-900/40 rounded-tl-xl overflow-y-auto p-3 z-30">
          <div className="text-[10px] text-amber-600/70 font-bold mb-1 flex items-center gap-1">
            <Skull size={10} /> 航海ログ
          </div>
          {s.log.map((msg, i) => (
            <div key={i} className={`text-[10px] py-0.5 border-b border-amber-900/20 ${i === 0 ? 'text-amber-200' : 'text-amber-800/60'}`}>
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* ─── アクションメニュー ─── */}
      {selectedCard && (
        <ActionMenu
          card={selectedCard.card}
          context={selectedCard.context}
          onAction={handleAction}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
