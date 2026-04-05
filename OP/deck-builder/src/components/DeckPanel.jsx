import { useState } from 'react';
import { Trash2, Save, FolderOpen, RotateCcw, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import CardImage from './CardImage';
import ColorBadge from './ColorBadge';
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
            {cnt > 0 && <span className="text-gray-500 text-[9px] leading-none">{cnt}</span>}
            <div className="w-full bg-blue-600 rounded-sm" style={{ height: `${h}%`, minHeight: cnt > 0 ? 2 : 0 }} />
          </div>
        );
      })}
    </div>
  );
}

function DeckEntry({ entry, onAdd, onRemove, onRemoveAll }) {
  const { card, count } = entry;
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-800 group">
      <CardImage card={card} className="w-8 h-11 object-cover rounded flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white truncate">{card.name}</div>
        <div className="flex gap-1 mt-0.5">
          {(card.colors || []).map(c => <ColorBadge key={c} color={c} small />)}
          {card.cost != null && <span className="text-gray-500 text-xs">C{card.cost}</span>}
          {card.power != null && <span className="text-gray-500 text-xs">{card.power?.toLocaleString()}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onRemove(card.card_number)}
          className="w-5 h-5 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-gray-300">
          <Minus size={10} />
        </button>
        <span className="text-white text-sm font-bold w-4 text-center">{count}</span>
        <button onClick={() => onAdd(card)}
          className="w-5 h-5 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-gray-300">
          <Plus size={10} />
        </button>
        <button onClick={() => onRemoveAll(card.card_number)}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-900 text-gray-500 hover:text-red-400 transition-all">
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}

function SavedDeckItem({ saved, onLoad, onDelete }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-800 group">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white font-medium truncate">{saved.name}</div>
        <div className="text-xs text-gray-500">
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
  onSave, onLoad, onDeleteSaved, loadDecks,
}) {
  const [showSaved, setShowSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [savedDecks, setSavedDecks] = useState({});
  const stats = deckStats(deck);

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
    <div className="flex flex-col h-full bg-gray-900">
      {/* ヘッダー */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-bold text-sm">デッキ</span>
          <span className={`text-sm font-bold ${total === DECK_LIMIT ? 'text-green-400' : total > DECK_LIMIT ? 'text-red-400' : 'text-gray-300'}`}>
            {total} / {DECK_LIMIT}
          </span>
        </div>
        {/* プログレスバー */}
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* リーダー */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-gray-700">
        <div className="text-xs text-gray-500 mb-1">リーダー</div>
        {leader ? (
          <div className="flex items-center gap-2">
            <CardImage card={leader} className="w-12 rounded" />
            <div>
              <div className="text-sm font-bold text-white">{leader.name}</div>
              <div className="flex gap-1 mt-0.5">
                {(leader.colors || []).map(c => <ColorBadge key={c} color={c} small />)}
                <span className="text-gray-400 text-xs">ライフ:{leader.life}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-600 italic">リーダーカードをクリックして選択</div>
        )}
      </div>

      {/* デッキ名 + 操作ボタン */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-gray-700 space-y-2">
        <input
          value={deckName}
          onChange={e => setDeckName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
          placeholder="デッキ名を入力…"
        />
        <div className="flex gap-1">
          <button onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded py-1.5 transition-colors">
            <Save size={12} /> 保存
          </button>
          <button onClick={handleShowSaved}
            className="flex-1 flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded py-1.5 transition-colors">
            <FolderOpen size={12} /> 読込
            {showSaved ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          <button onClick={onReset}
            className="flex items-center justify-center gap-1 bg-gray-700 hover:bg-red-900 text-gray-400 hover:text-red-300 text-xs rounded px-2 py-1.5 transition-colors">
            <RotateCcw size={12} />
          </button>
        </div>
        {saveMsg && <div className="text-xs text-center text-green-400">{saveMsg}</div>}

        {/* 保存済みデッキ */}
        {showSaved && (
          <div className="bg-gray-800 rounded p-1 space-y-0.5 max-h-40 overflow-y-auto">
            {Object.keys(savedDecks).length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-2">保存済みデッキなし</div>
            ) : (
              Object.values(savedDecks).map(s => (
                <SavedDeckItem key={s.id} saved={s} onLoad={handleLoad} onDelete={handleDelete} />
              ))
            )}
          </div>
        )}
      </div>

      {/* コスト分布 */}
      {deck.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-gray-700">
          <div className="text-xs text-gray-500 mb-1">コスト分布</div>
          <CostBar distribution={stats.costDistribution} />
          <div className="flex justify-between text-gray-600 text-[9px] mt-0.5">
            {Array.from({length:11},(_,i)=>i).map(c=><span key={c}>{c}</span>)}
          </div>
        </div>
      )}

      {/* デッキ内容 */}
      <div className="flex-1 overflow-y-auto">
        {deck.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
