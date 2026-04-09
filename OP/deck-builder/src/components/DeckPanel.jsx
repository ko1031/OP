import { useState } from 'react';
import { Trash2, Save, FolderOpen, RotateCcw, ChevronDown, ChevronUp, Minus, Plus, BarChart2, List, Crown } from 'lucide-react';
import CardImage from './CardImage';
import ColorBadge from './ColorBadge';
import DeckEvaluator from './DeckEvaluator';
import CardModal from './CardModal';
import LeaderSelectModal from './LeaderSelectModal';
import { DECK_LIMIT, deckStats } from '../utils/deckRules';

function CostBar({ distribution }) {
  const max = Math.max(...Object.values(distribution), 1);
  const costs = Array.from({ length: 11 }, (_, i) => i);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {costs.map(c => {
        const cnt = distribution[c] || 0;
        const h = Math.round((cnt / max) * 100);
        return (
          <div key={c} className="flex-1 flex flex-col items-center gap-0.5">
            {cnt > 0 && <span className="text-amber-400/80 text-[9px] leading-none">{cnt}</span>}
            <div className="w-full bg-blue-600 rounded-sm" style={{ height: `${h}%`, minHeight: cnt > 0 ? 2 : 0 }} />
          </div>
        );
      })}
    </div>
  );
}

function DeckEntry({ entry, onAdd, onRemove, onRemoveAll, onOpenModal }) {
  const { card, count } = entry;
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#0d1530]/80 group">
      {/* カード画像＋名前エリア: クリックでモーダルを開く */}
      <button
        onClick={() => onOpenModal(card)}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
      >
        <CardImage card={card} className="w-8 h-11 object-cover rounded flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white truncate">{card.name}</div>
          <div className="flex gap-1 mt-0.5">
            {(card.colors || []).map(c => <ColorBadge key={c} color={c} small />)}
            {card.cost != null && <span className="text-amber-400/80 text-xs">C{card.cost}</span>}
            {card.power != null && <span className="text-amber-400/80 text-xs">{card.power?.toLocaleString()}</span>}
          </div>
        </div>
      </button>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onRemove(card.card_number)}
          className="w-5 h-5 flex items-center justify-center rounded bg-[#1a2040] hover:bg-amber-900/40 text-amber-200/80">
          <Minus size={10} />
        </button>
        <span className="text-white text-sm font-bold w-4 text-center">{count}</span>
        <button onClick={() => onAdd(card)}
          className="w-5 h-5 flex items-center justify-center rounded bg-[#1a2040] hover:bg-amber-900/40 text-amber-200/80">
          <Plus size={10} />
        </button>
        <button onClick={() => onRemoveAll(card.card_number)}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-900 text-amber-400/80 hover:text-red-400 transition-all">
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}

function SavedDeckItem({ saved, onLoad, onDelete }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#0d1530]/80 group">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white font-medium truncate">{saved.name}</div>
        <div className="text-xs text-amber-400/80">
          {saved.leader?.name} · {saved.deck.reduce((s, e) => s + e.count, 0)}枚
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onLoad(saved.id)}
          className="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 rounded text-white">読込</button>
        <button onClick={() => onDelete(saved.id)}
          className="px-2 py-1 text-xs bg-red-900 hover:bg-red-800 rounded text-red-300">削除</button>
      </div>
    </div>
  );
}

export default function DeckPanel({
  leader, deck, total, deckName, setDeckName,
  onAddCard, onRemoveCard, onRemoveAllCard, onReset,
  onSave, onLoad, onDeleteSaved, loadDecks, onSelectLeader,
  onFindByText, onFindByTrait, onFindByName,
  allCards,
}) {
  const [showSaved, setShowSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [savedDecks, setSavedDecks] = useState({});
  const [activeTab, setActiveTab] = useState('deck'); // 'deck' | 'eval'
  const [modalCard, setModalCard] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [leaderDetailCard, setLeaderDetailCard] = useState(null);
  const stats = deckStats(deck);

  const handleDragOver = (e) => {
    if (!e.dataTransfer.types.includes('application/op-card')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };
  const handleDragLeave = (e) => {
    // パネル内の子要素への移動では消えないように
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const card = JSON.parse(e.dataTransfer.getData('application/op-card'));
      if (card) onAddCard(card);
    } catch { /* ignore */ }
  };

  const progress = Math.min((total / DECK_LIMIT) * 100, 100);
  const progressColor = total === DECK_LIMIT ? 'bg-green-500' : total > DECK_LIMIT ? 'bg-red-500' : 'bg-blue-500';

  const handleSave = () => {
    const result = onSave();
    if (result.ok) {
      setSaveMsg('✓ 保存しました');
      setTimeout(() => setSaveMsg(''), 2000);
    } else {
      setSaveMsg('⚠ ' + result.reason);
      setTimeout(() => setSaveMsg(''), 2000);
    }
  };

  const handleShowSaved = () => {
    setSavedDecks(loadDecks());
    setShowSaved(v => !v);
  };

  const handleLoad = (id) => {
    onLoad(id);
    setShowSaved(false);
  };

  const handleDelete = (id) => {
    onDeleteSaved(id);
    setSavedDecks(loadDecks());
  };

  // カードを種類・コスト順で並べる
  const TYPE_ORDER = { CHARACTER: 0, EVENT: 1, STAGE: 2 };
  const sortedDeck = [...deck].sort((a, b) => {
    const to = (TYPE_ORDER[a.card.card_type] ?? 9) - (TYPE_ORDER[b.card.card_type] ?? 9);
    if (to !== 0) return to;
    return (a.card.cost ?? 0) - (b.card.cost ?? 0);
  });

  return (
    <div
      className={`flex flex-col h-full bg-[#080c1e]/90 relative transition-colors duration-150
        ${isDragOver ? 'ring-2 ring-inset ring-blue-400/60 bg-blue-900/10' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ドラッグオーバー時のオーバーレイ */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="bg-blue-500/20 border-2 border-dashed border-blue-400/70 rounded-2xl px-8 py-4 text-blue-300 font-bold text-sm backdrop-blur-sm">
            ＋ デッキに追加
          </div>
        </div>
      )}
      {/* ヘッダー */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-amber-900/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-amber-200/90 font-black text-sm tracking-wide">デッキ構築</span>
          <div className={`flex items-center gap-1 text-sm font-black px-2 py-0.5 rounded-full border
            ${total === DECK_LIMIT
              ? 'bg-green-900/30 text-green-400 border-green-700/50'
              : total > DECK_LIMIT
                ? 'bg-red-900/30 text-red-400 border-red-700/50'
                : 'bg-[#1a2040] text-amber-200/80 border-amber-800/30'}`}>
            {total === DECK_LIMIT && <span>✓</span>}
            <span>{total} / {DECK_LIMIT}</span>
          </div>
        </div>
        {/* プログレスバー */}
        <div className="h-1.5 bg-[#0d1530]/80 rounded-full overflow-hidden border border-amber-900/20">
          <div className={`h-full rounded-full transition-all duration-300 ${progressColor}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* リーダー */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-amber-900/30">
        <div className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mb-1.5">リーダー</div>
        {leader ? (
          <div className="flex flex-col gap-2">
            {/* リーダー情報行 */}
            <div className="flex items-center gap-2">
              {/* 画像クリック → 詳細モーダル */}
              <button
                onClick={() => setLeaderDetailCard(leader)}
                className="flex-shrink-0 rounded overflow-hidden hover:ring-2 hover:ring-amber-400/60 transition-all"
                title="詳細を見る"
              >
                <CardImage card={leader} className="w-12 rounded" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{leader.name}</div>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {(leader.colors || []).map(c => <ColorBadge key={c} color={c} small />)}
                  <span className="text-amber-400/80 text-xs">ライフ:{leader.life}</span>
                </div>
              </div>
            </div>
            {/* リーダーを変更ボタン（フルwidth・大きめ） */}
            <button
              onClick={() => setShowLeaderModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-amber-700/50 bg-amber-900/20 text-amber-300 hover:bg-amber-800/40 hover:border-amber-500/70 text-sm font-bold transition-colors"
            >
              <Crown size={13} />
              リーダーを変更
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLeaderModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-amber-800/40 hover:border-amber-600/60 text-amber-500/80 hover:text-amber-400/80 text-sm font-bold transition-colors"
          >
            <Crown size={14} />
            リーダーカードを選択
          </button>
        )}
      </div>

      {/* デッキ名 + 操作ボタン */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-amber-900/30 space-y-2">
        <input
          value={deckName}
          onChange={e => setDeckName(e.target.value)}
          className="w-full bg-[#0d1530]/80 border border-amber-900/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
          placeholder="デッキ名を入力…"
        />
        <div className="flex gap-1">
          <button onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded py-1.5 transition-colors">
            <Save size={12} /> 保存
          </button>
          <button onClick={handleShowSaved}
            className="flex-1 flex items-center justify-center gap-1 bg-[#1a2040] hover:bg-amber-900/40 text-amber-200/80 text-xs rounded py-1.5 transition-colors">
            <FolderOpen size={12} /> 読込
            {showSaved ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          <button onClick={onReset}
            className="flex items-center justify-center gap-1 bg-[#1a2040] hover:bg-red-900 text-amber-500/70 hover:text-red-300 text-xs rounded px-2 py-1.5 transition-colors">
            <RotateCcw size={12} />
          </button>
        </div>
        {saveMsg && <div className="text-xs text-center text-green-400">{saveMsg}</div>}

        {/* 保存済みデッキ */}
        {showSaved && (
          <div className="bg-[#0d1530]/80 rounded p-1 space-y-0.5 max-h-40 overflow-y-auto">
            {Object.keys(savedDecks).length === 0 ? (
              <div className="text-xs text-amber-400/80 text-center py-2">保存済みデッキなし</div>
            ) : (
              Object.values(savedDecks).map(s => (
                <SavedDeckItem key={s.id} saved={s} onLoad={handleLoad} onDelete={handleDelete} />
              ))
            )}
          </div>
        )}
      </div>

      {/* タブ切り替え（モバイルのみ表示） */}
      <div className="md:hidden flex-shrink-0 flex border-b border-amber-900/30">
        <button
          onClick={() => setActiveTab('deck')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors
            ${activeTab === 'deck' ? 'text-white border-b-2 border-blue-500 bg-[#0d1530]/80/50' : 'text-amber-400/80 hover:text-amber-200/80'}`}>
          <List size={12} /> デッキ内容
        </button>
        <button
          onClick={() => setActiveTab('eval')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors
            ${activeTab === 'eval' ? 'text-white border-b-2 border-purple-500 bg-[#0d1530]/80/50' : 'text-amber-400/80 hover:text-amber-200/80'}`}>
          <BarChart2 size={12} /> デッキ評価
        </button>
      </div>

      {/* PC: 2カラム並列 / モバイル: タブ切り替え */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

        {/* ── デッキ内容カラム ── */}
        <div className={`flex-col overflow-hidden
          md:flex md:w-[240px] md:flex-shrink-0 md:border-r md:border-amber-900/30
          ${activeTab === 'deck' ? 'flex flex-1' : 'hidden'}`}>

          {/* コスト分布 */}
          {deck.length > 0 && (
            <div className="flex-shrink-0 px-3 py-2 border-b border-amber-900/30">
              <div className="text-xs text-amber-400/80 mb-1">コスト分布</div>
              <CostBar distribution={stats.costDistribution} />
              <div className="flex justify-between text-amber-500/80 text-[9px] mt-0.5">
                {Array.from({length:11},(_,i)=>i).map(c=><span key={c}>{c}</span>)}
              </div>
            </div>
          )}

          {/* カードリスト */}
          <div className="flex-1 overflow-y-auto">
            {deck.length === 0 ? (
              <div className="flex items-center justify-center h-full text-amber-500/80 text-sm">
                カードをクリックして追加
              </div>
            ) : (
              <div className="py-1">
                {sortedDeck.map(entry => (
                  <DeckEntry
                    key={entry.card.card_number}
                    entry={entry}
                    onAdd={onAddCard}
                    onRemove={onRemoveCard}
                    onRemoveAll={onRemoveAllCard}
                    onOpenModal={setModalCard}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── デッキ評価カラム ── */}
        <div className={`flex-col flex-1 overflow-hidden
          md:flex
          ${activeTab === 'eval' ? 'flex' : 'hidden'}`}>
          <DeckEvaluator deck={deck} leader={leader} />
        </div>

      </div>

      {/* リーダー詳細モーダル（シナジー検索ボタン付き） */}
      {leaderDetailCard && (
        <CardModal
          card={leaderDetailCard}
          count={0}
          isSelectedLeader={true}
          onAdd={() => {}}
          onRemove={() => {}}
          onSelectLeader={() => {}}
          onClose={() => setLeaderDetailCard(null)}
          onFindByText={onFindByText   ? (card) => { setLeaderDetailCard(null); onFindByText(card);  } : undefined}
          onFindByTrait={onFindByTrait ? (card) => { setLeaderDetailCard(null); onFindByTrait(card); } : undefined}
          onFindByName={onFindByName   ? (card) => { setLeaderDetailCard(null); onFindByName(card);  } : undefined}
        />
      )}

      {/* リーダー選択モーダル */}
      {showLeaderModal && (
        <LeaderSelectModal
          allCards={allCards || []}
          currentLeader={leader}
          onSelect={onSelectLeader ?? (() => {})}
          onClose={() => setShowLeaderModal(false)}
        />
      )}

      {/* カード詳細モーダル */}
      {modalCard && (
        <CardModal
          card={modalCard}
          count={deck.find(e => e.card.card_number === modalCard.card_number)?.count ?? 0}
          isSelectedLeader={leader?.card_number === modalCard.card_number}
          onAdd={onAddCard}
          onRemove={onRemoveCard}
          onSelectLeader={onSelectLeader ?? (() => {})}
          onClose={() => setModalCard(null)}
          onFindByText={onFindByText   ? (card) => { setModalCard(null); onFindByText(card);  } : undefined}
          onFindByTrait={onFindByTrait ? (card) => { setModalCard(null); onFindByTrait(card); } : undefined}
          onFindByName={onFindByName   ? (card) => { setModalCard(null); onFindByName(card);  } : undefined}
        />
      )}
    </div>
  );
}
