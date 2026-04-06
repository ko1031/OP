import { useState, useEffect, useRef } from 'react';
import { Home, RotateCcw, ChevronDown, ChevronUp, Plus, Minus, Shuffle } from 'lucide-react';
import { useGameState, loadSavedDecks, resolveSampleDeck, expandDeck } from '../hooks/useGameState';
import { SAMPLE_DECKS } from '../utils/deckRules';
import CardImage from '../components/CardImage';

// ─────────────────────────────────────────────
// カード1枚コンポーネント（プレイマット用）
// ─────────────────────────────────────────────
function GameCard({ card, tapped, faceDown, small, onClick, onRightClick, badge, highlight }) {
  const w = small ? 'w-14' : 'w-20';
  const h = small ? 'h-20' : 'h-28';
  return (
    <div
      className={`relative flex-shrink-0 cursor-pointer select-none rounded-lg overflow-hidden border-2 transition-all duration-150
        ${tapped ? 'rotate-90 origin-center' : ''}
        ${highlight ? 'border-yellow-400 shadow-yellow-400/50 shadow-lg' : 'border-gray-600/60'}
        ${tapped ? 'opacity-80' : 'opacity-100'}
        hover:border-white/60 hover:scale-105
      `}
      style={{ width: tapped ? undefined : undefined }}
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onRightClick?.(); }}
      title={faceDown ? '（裏向き）' : `${card?.name}\n右クリック: サブアクション`}
    >
      {faceDown ? (
        <div className={`${w} ${h} bg-gradient-to-br from-red-900/60 to-gray-900 flex items-center justify-center`}>
          <span className="text-red-600 text-3xl font-black">★</span>
        </div>
      ) : (
        <CardImage card={card} className={`${w} ${h} object-cover`} />
      )}
      {/* DON!!アタッチ数バッジ */}
      {badge > 0 && (
        <div className="absolute bottom-0.5 right-0.5 bg-yellow-500 text-gray-900 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
          +{badge}
        </div>
      )}
    </div>
  );
}

// 空スロット
function EmptySlot({ label, onDrop }) {
  return (
    <div
      onClick={onDrop}
      className="w-20 h-28 rounded-lg border-2 border-dashed border-gray-700/60 flex items-center justify-center text-gray-700 text-[10px] text-center px-1 hover:border-gray-500 transition-colors cursor-pointer"
    >
      {label}
    </div>
  );
}

// DON!!コイン1枚
function DonCoin({ active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-black cursor-pointer transition-all select-none
        ${active
          ? 'bg-yellow-500 border-yellow-300 text-gray-900 hover:bg-yellow-400 shadow-yellow-500/40 shadow-md'
          : 'bg-gray-800 border-gray-600 text-gray-600 hover:border-gray-400'
        }`}
      title={active ? 'DON!!（タップして使用）' : 'DON!!（タップ済み）'}
    >
      D
    </div>
  );
}

// ─────────────────────────────────────────────
// デッキ選択画面
// ─────────────────────────────────────────────
function DeckSelectScreen({ allCards, onSelect }) {
  const cardMap = {};
  allCards.forEach(c => { cardMap[c.card_number] = c; });

  const saved = loadSavedDecks();
  const savedList = Object.values(saved).sort((a, b) =>
    new Date(b.savedAt) - new Date(a.savedAt)
  );

  // サンプルデッキ（日付降順）
  const samples = [...SAMPLE_DECKS].sort((a, b) => {
    const parseD = s => { const [y,m,d] = s.split('/').map(Number); return new Date(y, m-1, d); };
    return parseD(b.date) - parseD(a.date);
  });

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-start p-6 overflow-y-auto">
      <div className="w-full max-w-2xl">
        <h2 className="text-white font-bold text-xl mb-1">デッキを選択</h2>
        <p className="text-gray-500 text-sm mb-6">一人回しするデッキを選んでください</p>

        {/* 保存済みデッキ */}
        {savedList.length > 0 && (
          <section className="mb-6">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">保存済みデッキ</div>
            <div className="space-y-2">
              {savedList.map(d => (
                <button key={d.id}
                  onClick={() => onSelect(d.leader, d.deck)}
                  className="w-full flex items-center gap-3 p-3 bg-gray-800/60 hover:bg-gray-700/80 rounded-xl border border-gray-700/60 hover:border-blue-600/50 transition-all text-left"
                >
                  <CardImage card={d.leader} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold truncate">{d.name}</div>
                    <div className="text-gray-500 text-xs">{d.leader?.name} • {Object.values(d.deck).reduce((s,e)=>s+e.count,0)}枚</div>
                  </div>
                  <div className="text-blue-400 text-xs flex-shrink-0">選択 →</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* サンプルデッキ */}
        <section>
          <div className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-3">優勝サンプルデッキ</div>
          <div className="space-y-2">
            {samples.map(s => {
              const resolved = resolveSampleDeck(s, cardMap);
              if (!resolved.leader) return null;
              return (
                <button key={s.id}
                  onClick={() => onSelect(resolved.leader, resolved.entries)}
                  className="w-full flex items-center gap-3 p-3 bg-gray-800/60 hover:bg-gray-700/80 rounded-xl border border-gray-700/60 hover:border-yellow-600/50 transition-all text-left"
                >
                  <CardImage card={resolved.leader} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold truncate">{s.name}</div>
                    <div className="text-gray-500 text-xs">{s.date} • {s.event}</div>
                  </div>
                  <div className="text-yellow-500 text-xs flex-shrink-0">選択 →</div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ハンドカード（手札）
// ─────────────────────────────────────────────
function HandCard({ card, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`relative flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-150 hover:scale-110 hover:-translate-y-2
        ${selected ? 'border-yellow-400 -translate-y-3 shadow-yellow-400/60 shadow-xl' : 'border-gray-600/60 hover:border-white/50'}
      `}
    >
      <CardImage card={card} className="w-16 h-[88px] object-cover" />
      {selected && (
        <div className="absolute inset-0 bg-yellow-400/10 pointer-events-none" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// アクションメニュー（選択したカードへの操作）
// ─────────────────────────────────────────────
function ActionMenu({ card, context, onAction, onClose }) {
  if (!card) return null;
  const actions = [];
  if (context === 'hand') {
    if (card.card_type === 'CHARACTER') actions.push({ id: 'play', label: '✦ フィールドに出す' });
    if (card.card_type === 'STAGE')     actions.push({ id: 'stage', label: '🏟 ステージにセット' });
    if (card.card_type === 'EVENT')     actions.push({ id: 'event', label: '📜 イベント使用（トラッシュ）' });
    actions.push({ id: 'trash-hand', label: '🗑 トラッシュ' });
  }
  if (context === 'field') {
    actions.push({ id: 'tap', label: card.tapped ? '↩ アンタップ' : '↪ タップ（アタック）' });
    actions.push({ id: 'attach-don', label: '💛 DON!!アタッチ (+1)' });
    actions.push({ id: 'trash-field', label: '🗑 KO → トラッシュ' });
  }
  if (context === 'leader') {
    actions.push({ id: 'tap-leader', label: card.tapped ? '↩ リーダーをアンタップ' : '↪ リーダーをタップ' });
    actions.push({ id: 'attach-don-leader', label: '💛 DON!!アタッチ (+1)' });
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-600 rounded-2xl shadow-2xl p-2 min-w-[220px]"
        onClick={e => e.stopPropagation()}>
        <div className="text-gray-400 text-xs px-3 py-1.5 border-b border-gray-700 mb-1 truncate">
          {card.name}
        </div>
        {actions.map(a => (
          <button key={a.id}
            onClick={() => { onAction(a.id); onClose(); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {a.label}
          </button>
        ))}
        <button onClick={onClose}
          className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors mt-1">
          キャンセル
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// メインプレイマット
// ─────────────────────────────────────────────
export default function SoloPlayPage({ onNavigate }) {
  const [allCards, setAllCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);   // {card, context, uid}
  const [showLog, setShowLog] = useState(false);
  const logRef = useRef(null);

  const game = useGameState();
  const { state } = game;

  useEffect(() => {
    fetch('./cards.json')
      .then(r => r.json())
      .then(d => { setAllCards(d.cards || []); setLoadingCards(false); });
  }, []);

  // カード選択→アクションメニュー
  const handleCardClick = (card, context, uid) => {
    if (selectedCard?.uid === uid) { setSelectedCard(null); return; }
    setSelectedCard({ card, context, uid });
  };

  const handleAction = (actionId) => {
    if (!selectedCard) return;
    const { uid, context } = selectedCard;
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
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── デッキ選択画面 ──
  if (!state) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col">
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-700/80">
          <button onClick={() => onNavigate('home')} className="text-gray-500 hover:text-white transition-colors">
            <Home size={18} />
          </button>
          <span className="text-white font-bold text-sm">一人回し — デッキ選択</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <DeckSelectScreen allCards={allCards} onSelect={(leader, entries) => game.startGame(leader, entries)} />
        </div>
      </div>
    );
  }

  // ── マリガン画面 ──
  if (state.phase === 'mulligan') {
    return (
      <div className="h-screen bg-gray-950 flex flex-col">
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-700/80">
          <button onClick={game.resetGame} className="text-gray-500 hover:text-white transition-colors">
            <Home size={18} />
          </button>
          <span className="text-white font-bold text-sm">一人回し — マリガン</span>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          {/* 情報 */}
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-1">デッキ: {allCards.length > 0 ? state.deck.length + state.hand.length + state.life.length : '?'}枚</div>
            <div className="text-white font-bold text-lg">手札を確認してください</div>
            <div className="text-gray-500 text-sm mt-1">
              マリガン回数: {state.mulliganCount}回（何度でも可）
            </div>
          </div>

          {/* 手札表示 */}
          <div className="flex gap-2 flex-wrap justify-center">
            {state.hand.map(card => (
              <div key={card._uid} className="rounded-lg overflow-hidden border border-gray-600/60">
                <CardImage card={card} className="w-20 h-28 object-cover" />
              </div>
            ))}
          </div>

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              onClick={game.mulligan}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-700/70 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
            >
              <Shuffle size={16} />
              マリガン ({state.mulliganCount}回目)
            </button>
            <button
              onClick={game.startMainGame}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-700/80 hover:bg-green-600 text-white font-bold rounded-xl transition-colors"
            >
              ゲーム開始 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ゲーム画面（プレイマット） ──
  const s = state;
  const donTotal = s.donActive + s.donTapped;

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden select-none">

      {/* ヘッダー */}
      <header className="flex-shrink-0 flex items-center gap-3 px-3 py-1.5 bg-gray-900/95 border-b border-gray-700/80 z-10">
        <button onClick={game.resetGame} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
          <Home size={16} />
        </button>
        <span className="text-white font-bold text-xs">
          ターン {s.turn}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>デッキ <b className="text-white">{s.deck.length}</b></span>
          <span>•</span>
          <span>手札 <b className="text-white">{s.hand.length}</b></span>
          <span>•</span>
          <span>ライフ <b className="text-red-400">{s.life.length}</b></span>
          <span>•</span>
          <span>トラッシュ <b className="text-gray-400">{s.trash.length}</b></span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* ドロー */}
          <button onClick={() => game.drawCard(1)}
            className="text-xs px-2 py-1 bg-blue-800/60 hover:bg-blue-700 text-blue-300 rounded border border-blue-700/50 transition-colors">
            +1ドロー
          </button>
          {/* ターン終了 */}
          <button onClick={game.endTurn}
            className="text-xs px-3 py-1 bg-green-800/70 hover:bg-green-700 text-green-200 font-bold rounded border border-green-700/50 transition-colors">
            ターン終了
          </button>
          {/* リセット */}
          <button onClick={game.resetGame}
            className="text-gray-600 hover:text-gray-300 transition-colors" title="デッキ選択に戻る">
            <RotateCcw size={14} />
          </button>
          {/* ログトグル */}
          <button onClick={() => setShowLog(v => !v)}
            className="text-gray-600 hover:text-gray-300 transition-colors text-xs">
            {showLog ? '▼ログ' : '▶ログ'}
          </button>
        </div>
      </header>

      {/* ─── プレイマット（公式プレイシート準拠） ─── */}
      {/*
        レイアウト（上から下）:
        ┌──────┬──────────────────────────────┬────────┐
        │ LIFE │      キャラクターゾーン       │ DECK   │
        │      │  [C1] [C2] [C3] [C4] [C5]   │ TRASH  │
        ├──────┼──────────────────────────────┤        │
        │LEADER│      DON!!ゾーン             │ STAGE  │
        └──────┴──────────────────────────────┴────────┘
                         手  札
      */}
      <div className="flex-1 flex flex-col overflow-hidden p-2 gap-2">

        {/* 上段: フィールドエリア */}
        <div className="flex gap-2 flex-1 min-h-0">

          {/* 左カラム: ライフ + リーダー */}
          <div className="flex flex-col gap-2 flex-shrink-0">

            {/* ライフエリア */}
            <div className="bg-gray-900/70 rounded-xl border border-gray-700/60 p-2 flex flex-col items-center gap-1.5">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">ライフ</div>
              <div className="flex flex-col gap-1 items-center">
                {s.life.length > 0 ? (
                  <>
                    {/* 一番上のカードだけ操作可（ダメージを受けるとめくる） */}
                    <div className="relative">
                      <GameCard
                        card={s.life[0]}
                        faceDown={true}
                        small={true}
                        onClick={() => game.flipLife()}
                      />
                      {s.life.length > 1 && (
                        <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                          {s.life.length}
                        </div>
                      )}
                    </div>
                    <div className="text-[9px] text-red-400 font-bold">{s.life.length}枚</div>
                  </>
                ) : (
                  <div className="w-14 h-20 rounded-lg border-2 border-dashed border-red-900/50 flex items-center justify-center">
                    <span className="text-red-800 text-xs font-bold">0</span>
                  </div>
                )}
              </div>
              <div className="text-[8px] text-gray-600 text-center">クリックで<br/>めくる</div>
            </div>

            {/* リーダー */}
            <div className="bg-gray-900/70 rounded-xl border border-gray-700/60 p-2 flex flex-col items-center gap-1">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">リーダー</div>
              <GameCard
                card={s.leader}
                tapped={s.leader.tapped}
                small={false}
                badge={s.leader.donAttached}
                highlight={selectedCard?.context === 'leader'}
                onClick={() => handleCardClick(s.leader, 'leader', 'leader')}
              />
              <div className="text-[9px] text-gray-500 text-center">右クリックで<br/>メニュー</div>
            </div>
          </div>

          {/* 中央: キャラクターゾーン + DON!! */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">

            {/* キャラクターゾーン */}
            <div className="flex-1 bg-gray-900/50 rounded-xl border border-gray-700/60 p-3">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                キャラクターゾーン（{s.field.length}/5）
              </div>
              <div className="flex gap-2 items-start flex-wrap">
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
                {/* 空スロット */}
                {Array.from({ length: Math.max(0, 5 - s.field.length) }).map((_, i) => (
                  <EmptySlot key={i} label={`スロット\n${s.field.length + i + 1}`} />
                ))}
              </div>
            </div>

            {/* DON!!ゾーン */}
            <div className="bg-gray-900/50 rounded-xl border border-yellow-900/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider">
                  DON!! ({donTotal}/10) デッキ残:{s.donDeck}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => game.tapDon(1)}
                    className="text-[10px] px-2 py-0.5 bg-yellow-700/40 hover:bg-yellow-600/50 text-yellow-300 rounded border border-yellow-700/50 transition-colors">
                    タップ×1
                  </button>
                  <button onClick={() => game.attachDonToLeader()}
                    className="text-[10px] px-2 py-0.5 bg-yellow-900/40 hover:bg-yellow-800/60 text-yellow-400 rounded border border-yellow-800/50 transition-colors">
                    リーダーに+1
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {/* アクティブDON!! */}
                {Array.from({ length: s.donActive }).map((_, i) => (
                  <DonCoin key={`a-${i}`} active={true} onClick={() => game.tapDon(1)} />
                ))}
                {/* タップ済みDON!! */}
                {Array.from({ length: s.donTapped }).map((_, i) => (
                  <DonCoin key={`t-${i}`} active={false} />
                ))}
                {/* リーダーにアタッチ済み */}
                {s.donLeader > 0 && (
                  <div className="flex items-center gap-1 ml-1">
                    <span className="text-[9px] text-yellow-600">リーダー+{s.donLeader}</span>
                  </div>
                )}
                {donTotal === 0 && (
                  <span className="text-gray-700 text-xs italic">ターン終了でDON!!が補充されます</span>
                )}
              </div>
            </div>
          </div>

          {/* 右カラム: デッキ + トラッシュ + ステージ */}
          <div className="flex flex-col gap-2 flex-shrink-0 w-24">

            {/* デッキ */}
            <div className="bg-gray-900/70 rounded-xl border border-gray-700/60 p-2 flex flex-col items-center gap-1">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">デッキ</div>
              <div className="relative cursor-pointer" onClick={() => game.drawCard(1)}
                title="クリックで1枚ドロー">
                <div className="w-14 h-20 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600/60 flex items-center justify-center hover:border-blue-500/60 transition-colors">
                  <span className="text-blue-600 text-2xl font-black">★</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                  {s.deck.length}
                </div>
              </div>
              <div className="text-[8px] text-gray-600 text-center">クリックで<br/>ドロー</div>
            </div>

            {/* トラッシュ */}
            <div className="bg-gray-900/70 rounded-xl border border-gray-700/60 p-2 flex flex-col items-center gap-1">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">トラッシュ</div>
              {s.trash.length > 0 ? (
                <div className="relative">
                  <CardImage card={s.trash[s.trash.length - 1]} className="w-14 h-20 object-cover rounded-lg border border-gray-600/50 opacity-70" />
                  <div className="absolute -bottom-1 -right-1 bg-gray-600 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                    {s.trash.length}
                  </div>
                </div>
              ) : (
                <div className="w-14 h-20 rounded-lg border-2 border-dashed border-gray-700/50 flex items-center justify-center">
                  <span className="text-gray-700 text-xs">0</span>
                </div>
              )}
            </div>

            {/* ステージ */}
            <div className="bg-gray-900/70 rounded-xl border border-gray-700/60 p-2 flex flex-col items-center gap-1">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">ステージ</div>
              {s.stage ? (
                <CardImage card={s.stage} className="w-14 h-20 object-cover rounded-lg border border-gray-600/50" />
              ) : (
                <div className="w-14 h-20 rounded-lg border-2 border-dashed border-gray-700/50 flex items-center justify-center">
                  <span className="text-gray-700 text-[9px] text-center">なし</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 手札エリア */}
        <div className="flex-shrink-0 bg-gray-900/60 rounded-xl border border-gray-700/60 px-3 py-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              手札 ({s.hand.length}枚)
            </div>
            <div className="text-[9px] text-gray-600 ml-1">クリックで選択 → アクションメニューが表示</div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {s.hand.map(card => (
              <HandCard
                key={card._uid}
                card={card}
                selected={selectedCard?.uid === card._uid}
                onClick={() => handleCardClick(card, 'hand', card._uid)}
              />
            ))}
            {s.hand.length === 0 && (
              <span className="text-gray-700 text-sm italic py-4 px-2">手札なし</span>
            )}
          </div>
        </div>
      </div>

      {/* ログパネル */}
      {showLog && (
        <div className="fixed bottom-0 right-0 w-72 max-h-64 bg-gray-900/95 border border-gray-700 rounded-tl-xl overflow-y-auto p-3 z-30" ref={logRef}>
          <div className="text-[10px] text-gray-500 font-bold mb-1">ゲームログ</div>
          {s.log.map((msg, i) => (
            <div key={i} className={`text-[11px] py-0.5 border-b border-gray-800/50 ${i === 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* アクションメニュー */}
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
