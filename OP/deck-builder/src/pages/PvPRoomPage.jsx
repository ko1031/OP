import { useState, useCallback } from 'react';
import { Home, Anchor, Copy, Check, Users, Wifi, WifiOff, Swords, ChevronRight, X } from 'lucide-react';
import PirateMapBg from '../components/PirateMapBg';
import { usePvPConnection } from '../hooks/usePvPConnection';
import { ACTION } from '../utils/gameToken';

// ─── スタイル定数 ──────────────────────────────────────────────────────
const P = {
  bg:      'bg-[#06091a]',
  label:   'text-[10px] text-amber-300/90 font-bold uppercase tracking-widest',
  btnGold: 'bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-amber-100 font-bold border border-amber-500/60 shadow-amber-900/40 shadow-md transition-all',
  btnRed:  'bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-red-100 font-bold border border-red-600/50 transition-all',
  btnBlue: 'bg-gradient-to-b from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-blue-100 font-bold border border-blue-600/50 transition-all',
  btnGray: 'bg-[#1a2040] hover:bg-[#232d55] text-amber-200/60 border border-amber-800/30 transition-all',
};

// ─── ステップ定数 ──────────────────────────────────────────────────────
const STEPS = {
  SELECT_MODE: 'select_mode',
  ROOM_HOST:   'room_host',
  ROOM_GUEST:  'room_guest',
  WAITING:     'waiting',
  READY:       'ready',
};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function loadSavedDecks() {
  try { return JSON.parse(localStorage.getItem('op_decks') || '[]'); }
  catch { return []; }
}

// ─── 小コンポーネント ──────────────────────────────────────────────────
function CompassRose({ size = 200, opacity = 0.12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" fill="none"
      style={{ opacity, position: 'absolute', pointerEvents: 'none' }}>
      <circle cx="160" cy="160" r="150" stroke="#b8892a" strokeWidth="1.2" strokeDasharray="4 7" opacity="0.7" />
      {[0,45,90,135,180,225,270,315].map(deg => {
        const r = deg * Math.PI / 180;
        return <line key={deg} x1={160+25*Math.sin(r)} y1={160-25*Math.cos(r)}
          x2={160+150*Math.sin(r)} y2={160-150*Math.cos(r)}
          stroke="#b8892a" strokeWidth={deg%90===0?1.2:0.6} opacity={0.65} />;
      })}
      <polygon points="160,8 153,52 160,44 167,52" fill="#cc3020" opacity="0.9" />
      <polygon points="160,312 153,268 160,276 167,268" fill="#b8892a" opacity="0.7" />
      <circle cx="160" cy="160" r="13" fill="#1e1206" stroke="#b8892a" strokeWidth="1.5" opacity="0.95" />
      <circle cx="160" cy="160" r="4.5" fill="#b8892a" opacity="0.9" />
    </svg>
  );
}

function RopeDivider({ className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #7a5018aa)' }} />
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="#b8892a" strokeWidth="1.2" opacity="0.65" />
        <circle cx="8" cy="8" r="2.2" fill="#b8892a" opacity="0.65" />
      </svg>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #7a5018aa, transparent)' }} />
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
        ${copied ? 'bg-green-800/40 border-green-600/50 text-green-300'
                 : 'bg-amber-900/20 border-amber-700/30 text-amber-400 hover:bg-amber-900/40'}`}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'コピー済み' : 'コピー'}
    </button>
  );
}

function ConnectionBadge({ connected }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border
      ${connected ? 'bg-green-900/30 border-green-600/40 text-green-400'
                  : 'bg-amber-900/20 border-amber-700/30 text-amber-500'}`}>
      {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
      {connected ? '接続済み' : '待機中...'}
    </div>
  );
}

function DeckSelectCard({ deck, selected, onSelect }) {
  const leader   = deck?.cards?.find(c => c.card_type === 'LEADER');
  const colorMap = { RED:'#ef4444', BLUE:'#3b82f6', GREEN:'#22c55e', PURPLE:'#a855f7', YELLOW:'#eab308', BLACK:'#6b7280' };
  const colors   = leader?.colors || [];
  return (
    <button onClick={() => onSelect(deck)}
      className={`relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200
        ${selected ? 'border-amber-400 bg-amber-900/20 shadow-amber-400/20 shadow-lg'
                   : 'border-white/10 bg-white/5 hover:border-amber-600/40'}`}>
      <div className="flex gap-1 mb-3">
        {colors.map(c => <div key={c} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: colorMap[c] || '#888' }} />)}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-amber-100 font-bold text-sm truncate">{deck.name || '名無しデッキ'}</div>
          <div className="text-amber-600/60 text-[11px] mt-0.5 truncate">リーダー: {leader?.name || '未設定'}</div>
        </div>
        <div className="text-amber-700/50 text-[10px]">{deck.cards?.filter(c => c.card_type !== 'LEADER').length || 0} / 50枚</div>
      </div>
      {selected && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center"><Check size={11} className="text-gray-900" /></div>}
    </button>
  );
}

function WaitingDots() {
  return (
    <div className="flex gap-1.5 items-center">
      {[0,1,2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full bg-amber-500/60"
          style={{ animation: `pvp-pulse 1.4s ease-in-out ${i*0.2}s infinite` }} />
      ))}
    </div>
  );
}

// ─── メインコンポーネント ──────────────────────────────────────────────
export default function PvPRoomPage({ onNavigate, onStartBattle }) {
  const [step,          setStep]         = useState(STEPS.SELECT_MODE);
  const [role,          setRole]         = useState(null);
  const [roomCode,      setRoomCode]     = useState('');
  const [inputCode,     setInputCode]    = useState('');
  const [inputError,    setInputError]   = useState('');
  const [selectedDeck,  setSelectedDeck] = useState(null);
  const [playerName,    setPlayerName]   = useState('');
  const [opponentId,    setOpponentId]   = useState(null);
  const [roomFullError, setRoomFullError]= useState(false);

  const [savedDecks]    = useState(() => loadSavedDecks());
  const [hostPreviewCode] = useState(() => generateRoomCode());

  // ─── WebSocket 接続（WAITING ステップ以降だけ有効） ────────────────
  const isConnecting = step === STEPS.WAITING || step === STEPS.READY;

  const { connected, opponentConnected, sendAction, disconnect } = usePvPConnection({
    roomCode:   isConnecting ? roomCode : null,
    playerId:   role || 'host',
    enabled:    isConnecting,
    onOpponentJoin:  useCallback((id) => {
      setOpponentId(id);
      setStep(STEPS.READY);
    }, []),
    onOpponentLeave: useCallback(() => {
      setOpponentId(null);
      setStep(STEPS.WAITING);
    }, []),
    onRoomFull: useCallback(() => {
      setRoomFullError(true);
      setStep(STEPS.SELECT_MODE);
    }, []),
  });

  // 対戦開始
  const handleStartBattle = useCallback(() => {
    sendAction(ACTION.GAME_READY, { deckName: selectedDeck?.name });
    if (onStartBattle) {
      onStartBattle({ role, roomCode, deck: selectedDeck, playerName, opponentId });
    }
  }, [role, roomCode, selectedDeck, playerName, opponentId, onStartBattle, sendAction]);

  // ルームを抜ける
  const handleLeaveRoom = useCallback(() => {
    disconnect();
    setStep(STEPS.SELECT_MODE);
    setRoomCode('');
    setOpponentId(null);
  }, [disconnect]);

  // ─── ステップ: デッキ選択 + モード選択 ──────────────────────────
  const renderSelectMode = () => (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      {roomFullError && (
        <div className="w-full bg-red-900/30 border border-red-600/40 rounded-xl p-3 flex items-center gap-2 text-red-300 text-sm">
          <X size={15} />
          そのルームはすでに満員です。別のコードをお試しください。
        </div>
      )}

      <div className="text-center"><div className="text-amber-300/60 text-sm">まず対戦に使うデッキを選んでください</div></div>

      <div className="w-full">
        <div className={`${P.label} mb-2`}>デッキ選択</div>
        {savedDecks.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-white/10 bg-white/5">
            <Anchor size={24} className="mx-auto mb-2 text-amber-800/40" />
            <div className="text-amber-700/50 text-sm">保存済みデッキがありません</div>
            <button onClick={() => onNavigate('deck-builder')} className={`mt-3 px-4 py-2 rounded-lg text-xs ${P.btnGold}`}>デッキを作る</button>
          </div>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {savedDecks.map((deck, i) => (
              <DeckSelectCard key={i} deck={deck} selected={selectedDeck?.name === deck.name} onSelect={setSelectedDeck} />
            ))}
          </div>
        )}
      </div>

      <div className="w-full">
        <div className={`${P.label} mb-2`}>プレイヤー名（任意）</div>
        <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} maxLength={12}
          placeholder="海賊王になる男"
          className="w-full bg-[#0d1530]/80 border border-amber-800/30 rounded-lg px-3 py-2.5 text-amber-100 text-sm placeholder-amber-800/40 focus:outline-none focus:border-amber-600/60 transition-all" />
      </div>

      <RopeDivider className="w-full" />

      <div className="flex gap-4 w-full">
        <button onClick={() => { setRole('host'); setStep(STEPS.ROOM_HOST); }} disabled={!selectedDeck}
          className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200
            ${!selectedDeck ? 'border-white/10 bg-white/5 opacity-40 cursor-not-allowed'
                            : 'border-amber-700/40 bg-amber-900/10 hover:border-amber-500/60 cursor-pointer'}`}>
          <div className="w-12 h-12 rounded-full bg-amber-900/30 border border-amber-700/40 flex items-center justify-center">
            <Anchor size={22} className="text-amber-400" />
          </div>
          <div><div className="text-amber-200 font-bold text-sm">ルームを作る</div>
            <div className="text-amber-700/50 text-[10px] mt-0.5">コードを友達に送る</div></div>
        </button>

        <button onClick={() => { setRole('guest'); setStep(STEPS.ROOM_GUEST); }} disabled={!selectedDeck}
          className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200
            ${!selectedDeck ? 'border-white/10 bg-white/5 opacity-40 cursor-not-allowed'
                            : 'border-blue-700/40 bg-blue-900/10 hover:border-blue-500/60 cursor-pointer'}`}>
          <div className="w-12 h-12 rounded-full bg-blue-900/30 border border-blue-700/40 flex items-center justify-center">
            <Users size={22} className="text-blue-400" />
          </div>
          <div><div className="text-blue-200 font-bold text-sm">ルームに参加</div>
            <div className="text-blue-700/50 text-[10px] mt-0.5">コードを入力する</div></div>
        </button>
      </div>
    </div>
  );

  // ─── ステップ: ホスト（コード発行） ──────────────────────────────
  const renderRoomHost = () => (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <div className="text-center"><div className="text-amber-300/60 text-sm">このコードを対戦相手に送ってください</div></div>

      <div className="w-full bg-[#0d1530]/80 border border-amber-800/30 rounded-2xl p-6 text-center">
        <div className={`${P.label} mb-3`}>ルームコード</div>
        <div className="font-black text-4xl tracking-[0.3em] text-amber-300 mb-4"
          style={{ textShadow: '0 0 20px rgba(251,191,36,0.3)', fontFamily: 'monospace' }}>
          {hostPreviewCode}
        </div>
        <div className="flex justify-center"><CopyButton text={hostPreviewCode} /></div>
      </div>

      <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-900/30 border border-amber-800/30 flex items-center justify-center">
          <Swords size={14} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-amber-100 text-sm font-bold truncate">{selectedDeck?.name}</div>
          <div className="text-amber-700/50 text-[10px]">選択中のデッキ</div>
        </div>
      </div>

      <button onClick={() => { setRoomCode(hostPreviewCode); setStep(STEPS.WAITING); }}
        className={`w-full py-3 rounded-xl text-sm ${P.btnGold}`}>
        このコードで待機する
      </button>
      <button onClick={() => setStep(STEPS.SELECT_MODE)} className={`w-full py-2.5 rounded-xl text-xs ${P.btnGray}`}>← 戻る</button>
    </div>
  );

  // ─── ステップ: ゲスト（コード入力） ──────────────────────────────
  const renderRoomGuest = () => (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <div className="text-center"><div className="text-amber-300/60 text-sm">相手から受け取ったルームコードを入力</div></div>

      <div className="w-full">
        <div className={`${P.label} mb-2`}>ルームコード</div>
        <input type="text" value={inputCode}
          onChange={e => { setInputCode(e.target.value.toUpperCase()); setInputError(''); }}
          maxLength={6} placeholder="A3F9B2"
          className={`w-full bg-[#0d1530]/80 border rounded-xl px-4 py-4 text-amber-100 text-2xl font-black tracking-[0.4em] text-center placeholder-amber-800/30 focus:outline-none transition-all font-mono
            ${inputError ? 'border-red-600/60' : 'border-amber-800/30 focus:border-amber-600/60'}`} />
        {inputError && <div className="mt-1.5 text-red-400 text-xs flex items-center gap-1"><X size={11} />{inputError}</div>}
      </div>

      <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-900/30 border border-blue-800/30 flex items-center justify-center">
          <Swords size={14} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-amber-100 text-sm font-bold truncate">{selectedDeck?.name}</div>
          <div className="text-amber-700/50 text-[10px]">選択中のデッキ</div>
        </div>
      </div>

      <button
        onClick={() => {
          const code = inputCode.trim().toUpperCase();
          if (code.length !== 6) { setInputError('6文字のルームコードを入力してください'); return; }
          setRoomCode(code);
          setStep(STEPS.WAITING);
        }}
        disabled={inputCode.length !== 6}
        className={`w-full py-3 rounded-xl text-sm transition-all
          ${inputCode.length === 6 ? P.btnBlue : 'opacity-40 cursor-not-allowed ' + P.btnGray}`}>
        参加する
      </button>
      <button onClick={() => setStep(STEPS.SELECT_MODE)} className={`w-full py-2.5 rounded-xl text-xs ${P.btnGray}`}>← 戻る</button>
    </div>
  );

  // ─── ステップ: 待機中（WebSocket接続・相手を待つ） ────────────────
  const renderWaiting = () => (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">

      <div className="flex items-center gap-3 bg-[#0d1530]/80 border border-amber-800/30 rounded-xl px-5 py-3 w-full">
        <div className={`${P.label} whitespace-nowrap`}>ルームコード</div>
        <div className="font-black text-2xl text-amber-300 tracking-[0.3em] flex-1 text-center font-mono">{roomCode}</div>
        <CopyButton text={roomCode} />
      </div>

      <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-5">
        {/* アニメーション */}
        <div className="relative">
          <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center
            ${connected ? 'border-amber-600/40' : 'border-amber-800/20'}`}>
            <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center
              ${connected ? 'border-amber-500/30 animate-pulse' : 'border-amber-900/20'}`}>
              <Users size={30} className={connected ? 'text-amber-500/70' : 'text-amber-800/30'} />
            </div>
          </div>
          {connected && <div className="absolute inset-0 rounded-full border-2 border-amber-600/15 animate-ping" />}
        </div>

        <div className="text-center">
          <div className="text-amber-100 font-bold mb-1">
            {!connected ? 'サーバーに接続中...' :
             role === 'host' ? '相手の参加を待っています' : '相手を探しています'}
          </div>
          <div className="text-amber-700/50 text-xs mb-3">
            {role === 'host' ? 'ルームコードを相手に送ってください' : `ルームコード: ${roomCode}`}
          </div>
          <WaitingDots />
        </div>

        {/* プレイヤー一覧 */}
        <div className="w-full space-y-2">
          <RopeDivider />
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-amber-600/40 animate-pulse'}`} />
              <span className="text-amber-100/80 text-sm">{playerName || '自分'}</span>
            </div>
            <ConnectionBadge connected={connected} />
          </div>
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${opponentConnected ? 'bg-green-400' : 'bg-amber-600/20 animate-pulse'}`} />
              <span className={`text-sm ${opponentConnected ? 'text-amber-100/80' : 'text-amber-700/50 italic'}`}>
                {opponentConnected ? (opponentId === 'host' ? 'ホスト' : 'ゲスト') : '対戦相手...'}
              </span>
            </div>
            <ConnectionBadge connected={opponentConnected} />
          </div>
        </div>
      </div>

      <button onClick={handleLeaveRoom} className={`w-full py-2.5 rounded-xl text-xs ${P.btnGray}`}>
        ← ルームを抜ける
      </button>
    </div>
  );

  // ─── ステップ: 対戦準備完了 ──────────────────────────────────────
  const renderReady = () => (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">

      {/* マッチアップ */}
      <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-900/30 border-2 border-amber-600/40 flex items-center justify-center mx-auto mb-2 font-black text-amber-300 text-xl">
              {(playerName || '自').charAt(0)}
            </div>
            <div className="text-amber-100 font-bold text-sm">{playerName || '自分'}</div>
            <div className="text-amber-700/50 text-[10px]">{selectedDeck?.name}</div>
            <div className="mt-1.5 flex justify-center"><ConnectionBadge connected={true} /></div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="text-amber-400/80 font-black text-2xl" style={{ textShadow: '0 0 15px rgba(251,191,36,0.4)' }}>VS</div>
            <Swords size={18} className="text-amber-600/40" />
          </div>

          <div className="flex-1 text-center">
            <div className="w-14 h-14 rounded-full bg-red-900/30 border-2 border-red-600/40 flex items-center justify-center mx-auto mb-2 font-black text-red-300 text-xl">
              {opponentId === 'host' ? 'H' : 'G'}
            </div>
            <div className="text-red-200/70 font-bold text-sm">対戦相手</div>
            <div className="text-amber-700/50 text-[10px]">{opponentId === 'host' ? 'ホスト' : 'ゲスト'}</div>
            <div className="mt-1.5 flex justify-center"><ConnectionBadge connected={opponentConnected} /></div>
          </div>
        </div>
      </div>

      <RopeDivider className="w-full" />

      <div className="w-full bg-[#0d1530]/80 border border-amber-800/20 rounded-xl p-4 space-y-2">
        <div className={`${P.label} mb-2`}>対戦ルール</div>
        {[
          ['ルームコード', roomCode],
          ['先行', role === 'host' ? 'あなた（ホスト）' : '相手（ホスト）'],
          ['ライフ', 'リーダーのライフ数に従う'],
          ['制限時間', 'なし'],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-xs">
            <span className="text-amber-700/60">{k}</span>
            <span className="text-amber-200/70 font-mono">{v}</span>
          </div>
        ))}
      </div>

      <button onClick={handleStartBattle}
        className={`w-full py-4 rounded-xl text-base font-black ${P.btnGold} flex items-center justify-center gap-2`}>
        <Swords size={18} />対戦スタート<ChevronRight size={18} />
      </button>

      <button onClick={handleLeaveRoom} className={`w-full py-2.5 rounded-xl text-xs ${P.btnGray}`}>
        ← キャンセル
      </button>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case STEPS.SELECT_MODE: return renderSelectMode();
      case STEPS.ROOM_HOST:   return renderRoomHost();
      case STEPS.ROOM_GUEST:  return renderRoomGuest();
      case STEPS.WAITING:     return renderWaiting();
      case STEPS.READY:       return renderReady();
      default:                return renderSelectMode();
    }
  };

  const stepLabels = {
    [STEPS.SELECT_MODE]: 'デッキ選択',
    [STEPS.ROOM_HOST]:   'ルーム作成',
    [STEPS.ROOM_GUEST]:  'ルーム参加',
    [STEPS.WAITING]:     '接続待機',
    [STEPS.READY]:       '対戦準備完了',
  };

  // ─── レンダリング ──────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex flex-col ${P.bg} relative overflow-hidden`}>
      <PirateMapBg />
      <div style={{ position:'fixed', bottom:-60, left:-60, zIndex:0, pointerEvents:'none' }}>
        <CompassRose size={300} opacity={0.15} />
      </div>
      <div style={{ position:'fixed', top:-30, right:-30, zIndex:0, pointerEvents:'none' }}>
        <CompassRose size={180} opacity={0.10} />
      </div>

      {/* ヘッダー */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2 border-b border-amber-900/20 bg-[#06091a]/80 backdrop-blur-sm">
        <button onClick={() => onNavigate('home')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${P.btnGray}`}>
          <Home size={13} />ホーム
        </button>
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-amber-500/70" />
          <span className="text-amber-300/80 font-black text-sm tracking-widest">人対人 対戦</span>
        </div>
        <div className="text-amber-700/50 text-[10px] font-bold uppercase tracking-wider">
          {stepLabels[step]}
        </div>
      </div>

      {/* ステップインジケータ */}
      <div className="relative z-10 flex justify-center gap-2 py-4 px-4">
        {[STEPS.SELECT_MODE, STEPS.ROOM_HOST, STEPS.WAITING, STEPS.READY].map((s, i) => {
          const order = [STEPS.SELECT_MODE, STEPS.ROOM_HOST, STEPS.WAITING, STEPS.READY];
          const cur = order.indexOf(step === STEPS.ROOM_GUEST ? STEPS.ROOM_HOST : step);
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-all duration-300
                ${i < cur ? 'bg-amber-500' : i === cur ? 'bg-amber-400 scale-125' : 'bg-white/15'}`} />
              {i < 3 && <div className={`w-6 h-px ${i < cur ? 'bg-amber-700/60' : 'bg-white/10'}`} />}
            </div>
          );
        })}
      </div>

      {/* メインコンテンツ */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <h2 className="relative font-black tracking-tight"
              style={{
                fontSize:'clamp(1.6rem, 5vw, 2.4rem)',
                background:'linear-gradient(180deg, #fdf0c0 0%, #e8c060 35%, #c9a035 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                backgroundClip:'text', filter:'drop-shadow(0 1px 6px rgba(184,137,42,0.3))',
              }}>
              人対人 対戦
            </h2>
          </div>
          <RopeDivider className="mt-2 w-48 mx-auto" />
          <div className="text-amber-700/50 text-xs mt-2 tracking-wider">PLAYER vs PLAYER</div>
        </div>

        {renderStep()}
      </div>

      <style>{`
        @keyframes pvp-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
