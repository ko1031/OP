// ─────────────────────────────────────────────────────────────────────────
// PvPBattlePage.jsx — 人対人 対戦ページ（WebSocket + JWT 対応版）
// Phase 2: リアルタイム通信でフェーズ/ターン/基本アクションを同期
// ─────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useReducer } from 'react';
import {
  Home, Swords, X, Anchor,
  Wifi, WifiOff, ChevronRight, Zap,
  AlertTriangle
} from 'lucide-react';
import PirateMapBg from '../components/PirateMapBg';
import CardImage from '../components/CardImage';
import { usePvPConnection } from '../hooks/usePvPConnection';
import { ACTION } from '../utils/gameToken';

// ─── カードサイズ定数（BattlePage と統一） ──────────────────────────
const CARD      = { W: 96,  H: 134 };
const HAND_CARD = { W: 76,  H: 107 };
const DECK_CARD = { W: 72,  H: 101 };
const DON_MINI  = { W: 46,  H: 64  };
const DON_CARD  = { W: 64,  H: 90  };

const LEFT_COL_W = 240;
const DON_IMG_URL = `${import.meta.env.BASE_URL}don-card.png`;

// ─── スタイル定数 ─────────────────────────────────────────────────────
const P = {
  bg:      'bg-[#06091a]',
  label:   'text-[10px] text-amber-300/90 font-bold uppercase tracking-widest',
  btnGold: 'bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-amber-100 font-bold border border-amber-500/60 shadow-md transition-all',
  btnRed:  'bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-red-100 font-bold border border-red-600/50 transition-all',
  btnBlue: 'bg-gradient-to-b from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-blue-100 font-bold border border-blue-600/50 transition-all',
  btnGray: 'bg-[#1a2040] hover:bg-[#232d55] text-amber-200/60 border border-amber-800/30 transition-all',
};

// ─── フェーズ定数 ─────────────────────────────────────────────────────
const PHASES = [
  { id:'refresh', label:'リフレッシュ', icon:'🔄' },
  { id:'draw',    label:'ドロー',       icon:'📚' },
  { id:'don',     label:'DON!!',        icon:'💛' },
  { id:'main',    label:'メイン',       icon:'⚔'  },
  { id:'end',     label:'エンド',       icon:'⏹'  },
];

// ─── ゲーム状態リデューサー ────────────────────────────────────────────
// 自分と相手それぞれの簡易ゲーム状態を管理
const initialPlayerState = (isMe) => ({
  life:       5,
  handCount:  isMe ? 5 : 5,
  deckCount:  isMe ? 45 : 45,
  donActive:  0,
  donRested:  0,
  field:      Array(5).fill(null),   // フィールドのカード
  leader:     null,
  stage:      null,
  trash:      [],
});

function gameReducer(state, action) {
  switch (action.type) {
    // ターン終了 → ターン切り替え
    case 'TURN_END':
      return {
        ...state,
        isMyTurn: !state.isMyTurn,
        turnNumber: state.turnNumber + (state.isMyTurn ? 0 : 1),
        phase: 'refresh',
      };

    // フェーズ変更（自分のみ）
    case 'PHASE_CHANGE':
      return { ...state, phase: action.phase };

    // カードプレイ（自分）
    case 'MY_PLAY_CARD': {
      const newField = [...state.me.field];
      const slot = newField.findIndex(c => c === null);
      if (slot === -1) return state;
      newField[slot] = action.card;
      return {
        ...state,
        me: {
          ...state.me,
          field: newField,
          handCount: state.me.handCount - 1,
          donActive: state.me.donActive - (action.cost || 0),
        },
      };
    }

    // 相手がカードをプレイした
    case 'OPP_PLAY_CARD': {
      const newField = [...state.opp.field];
      const slot = newField.findIndex(c => c === null);
      if (slot !== -1) newField[slot] = { name: '???', card_type: 'CHARACTER' };
      return {
        ...state,
        opp: {
          ...state.opp,
          field: newField,
          handCount: Math.max(0, state.opp.handCount - 1),
        },
      };
    }

    // ライフダメージ
    case 'LIFE_DAMAGE':
      if (action.target === 'me') {
        return { ...state, me: { ...state.me, life: Math.max(0, state.me.life - 1) } };
      }
      return { ...state, opp: { ...state.opp, life: Math.max(0, state.opp.life - 1) } };

    // DON!! リセット（リフレッシュ時）
    case 'DON_REFRESH':
      return { ...state, me: { ...state.me, donActive: state.me.donActive + state.me.donRested, donRested: 0 } };

    // ログ追記
    case 'ADD_LOG':
      return {
        ...state,
        log: [...state.log.slice(-40), { id: Date.now() + Math.random(), text: action.text, type: action.logType || 'action' }],
      };

    // 投了
    case 'SURRENDER':
      return { ...state, result: action.winner };

    default:
      return state;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────
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

// ─── カード詳細モーダル ──────────────────────────────────────────────
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
            <div className="text-amber-700/60 text-xs mt-0.5">{card.card_number}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-amber-900/30 flex items-center justify-center text-amber-500 hover:bg-amber-800/40"><X size={16}/></button>
        </div>
        <div className="flex gap-4 p-4">
          <CardImage card={card} className="w-40 h-56 object-cover rounded-xl border border-amber-900/40 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {card.cost  != null && <Stat label="コスト"   value={card.cost} />}
              {card.power != null && <Stat label="パワー"   value={card.power?.toLocaleString()} />}
              {card.counter!= null && <Stat label="カウンター" value={card.counter?.toLocaleString()} />}
              {card.life  != null && <Stat label="ライフ"   value={card.life} red />}
            </div>
            <div className="flex flex-wrap gap-1.5">{card.traits?.map(t => <Tag key={t}>《{t}》</Tag>)}</div>
            {card.effect && (
              <div className="bg-[#080c20]/80 rounded-xl p-3 border border-amber-900/20">
                <div className="text-[9px] text-amber-600/60 uppercase mb-1.5">効果</div>
                <div className="text-amber-100/90 text-xs leading-relaxed whitespace-pre-line">{card.effect}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ゲームカード ────────────────────────────────────────────────────
function GameCard({ card, tapped, faceDown, onClick, onDoubleClick, badge, highlight }) {
  const donCount = badge || 0;
  return (
    <div className="relative flex-shrink-0" style={{ width:CARD.W, height:CARD.H }}>
      {donCount > 0 && !tapped && Array.from({ length: Math.min(donCount,4) }).map((_,i) => (
        <div key={i} className="absolute rounded-lg overflow-hidden pointer-events-none"
          style={{ width:DON_MINI.W, height:DON_MINI.H, right:-26-i*16, bottom:16+i*12, zIndex:i+1,
            transform:`rotate(${10+i*6}deg)`, border:'2px solid rgba(253,224,71,0.95)', boxShadow:'2px 4px 10px rgba(0,0,0,0.8)' }}>
          <img src={DON_IMG_URL} alt="DON!!" style={{ width:'100%', height:'100%', objectFit:'cover' }} draggable={false} />
        </div>
      ))}
      <div className={`absolute inset-0 cursor-pointer select-none rounded-xl overflow-hidden border-2 transition-all duration-150
        ${tapped ? 'rotate-90 origin-center opacity-75' : ''}
        ${highlight ? 'border-amber-400 shadow-amber-400/60 shadow-lg scale-105' : 'border-white/25'}
        hover:border-amber-400/70 hover:scale-[1.03]`}
        style={{ zIndex:10 }} onClick={onClick} onDoubleClick={onDoubleClick}>
        {faceDown ? (
          <div style={{ width:CARD.W, height:CARD.H }} className="bg-gradient-to-br from-red-900/60 to-[#06091a] flex items-center justify-center">
            <span className="text-red-600/70 text-4xl">☠</span>
          </div>
        ) : <CardImage card={card} className="w-full h-full object-cover" />}
      </div>
    </div>
  );
}

function EmptySlot({ small }) {
  const w = small ? 64 : CARD.W, h = small ? 90 : CARD.H;
  return (
    <div style={{ width:w, height:h }} className="rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center flex-shrink-0">
      <Anchor size={small ? 14 : 18} className="text-white/20" />
    </div>
  );
}

function DonCard({ active, small }) {
  const w = small ? 52 : DON_CARD.W, h = small ? 73 : DON_CARD.H;
  return (
    <div className={`flex-shrink-0 select-none rounded overflow-hidden ${active ? 'opacity-100' : 'opacity-50'}`} style={{ width:w, height:h }}>
      <img src={DON_IMG_URL} alt="DON!!"
        style={{ width:w, height:h, objectFit:'cover',
          transform: active ? 'none' : `rotate(90deg) scale(${w/h})`,
          filter: active ? 'none' : 'brightness(0.7) sepia(0.3)' }}
        draggable={false} />
    </div>
  );
}

function LifeCard() {
  return (
    <div className="relative flex-shrink-0 rounded-lg overflow-hidden border border-white/20" style={{ width:40, height:56 }}>
      <div className="w-full h-full bg-gradient-to-br from-red-900/50 to-[#06091a] flex items-center justify-center">
        <span className="text-red-600/60 text-lg">♥</span>
      </div>
    </div>
  );
}

function ConnBadge({ connected }) {
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold
      ${connected ? 'bg-green-900/40 text-green-400' : 'bg-red-900/30 text-red-500'}`}>
      {connected ? <Wifi size={9} /> : <WifiOff size={9} />}
      {connected ? 'Online' : 'Offline'}
    </div>
  );
}

function TurnBanner({ isMyTurn, visible }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className={`px-12 py-6 rounded-2xl font-black text-3xl tracking-widest backdrop-blur-sm border-2 shadow-2xl
        ${isMyTurn ? 'bg-amber-900/70 border-amber-500/60 text-amber-200' : 'bg-blue-900/70 border-blue-500/60 text-blue-200'}`}
        style={{ textShadow:'0 2px 12px rgba(0,0,0,0.8)' }}>
        {isMyTurn ? '⚔ あなたのターン' : '⌛ 相手のターン'}
      </div>
    </div>
  );
}

// ─── 切断警告バナー ──────────────────────────────────────────────────
function DisconnectBanner({ show }) {
  if (!show) return null;
  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
      bg-red-900/90 border border-red-600/60 text-red-200 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm shadow-lg">
      <AlertTriangle size={15} />
      相手との接続が切断されました
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────────
export default function PvPBattlePage({ onNavigate, battleConfig }) {
  // battleConfig: { role, roomCode, deck, playerName, opponentId }
  const roomCode   = battleConfig?.roomCode   || '';
  const playerName = battleConfig?.playerName || 'あなた';
  const myRole     = battleConfig?.role       || 'host';

  // ─── ゲーム状態 ─────────────────────────────────────────────────
  const [state, dispatch] = useReducer(gameReducer, {
    isMyTurn:   myRole === 'host', // ホストが先行
    turnNumber: 1,
    phase:      'refresh',
    me:         initialPlayerState(true),
    opp:        initialPlayerState(false),
    log: [
      { id:1, text:'対戦を開始しました', type:'system' },
      { id:2, text:`${myRole === 'host' ? 'あなた' : '相手'}が先行です`, type:'system' },
    ],
    result: null, // 'win' | 'lose' | null
  });

  const [detailCard,      setDetailCard]      = useState(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showTurnBanner,  setShowTurnBanner]  = useState(true);

  // ターンバナー表示
  const turnKey = `${state.isMyTurn}-${state.turnNumber}`;
  useEffect(() => {
    let alive = true;
    const t1 = setTimeout(() => { if (alive) setShowTurnBanner(true);  }, 0);
    const t2 = setTimeout(() => { if (alive) setShowTurnBanner(false); }, 2200);
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2); };
  }, [turnKey]);

  const addLog = useCallback((text, logType = 'action') => {
    dispatch({ type:'ADD_LOG', text, logType });
  }, []);

  // ─── WebSocket アクション受信ハンドラ ────────────────────────────
  const handleOpponentAction = useCallback((actionType, payload) => {
    switch (actionType) {
      case ACTION.END_TURN:
        addLog('相手がターンを終了しました', 'turn');
        dispatch({ type:'TURN_END' });
        break;

      case ACTION.PLAY_CARD:
        addLog(`相手がカードをプレイ${payload.cardName ? `（${payload.cardName}）` : ''}`);
        dispatch({ type:'OPP_PLAY_CARD', card: payload });
        break;

      case ACTION.ATTACK:
        addLog('相手がアタックしました');
        break;

      case ACTION.DRAW:
        addLog('相手がカードをドローしました');
        break;

      case ACTION.LIFE_DAMAGE:
        addLog('ライフダメージ！', 'system');
        dispatch({ type:'LIFE_DAMAGE', target:'me' });
        break;

      case ACTION.SURRENDER:
        addLog('相手が投了しました', 'system');
        dispatch({ type:'SURRENDER', winner:'me' });
        break;

      case ACTION.GAME_READY:
        addLog('相手の準備が完了しました', 'system');
        break;

      default:
        console.log('[PvP] 未処理アクション:', actionType, payload);
    }
  }, [addLog]);

  // ─── WebSocket 接続 ─────────────────────────────────────────────
  const { connected, opponentConnected, sendAction, disconnect } = usePvPConnection({
    roomCode,
    playerId: myRole,
    enabled: !!roomCode,
    onGameAction:    handleOpponentAction,
    onOpponentLeave: useCallback(() => addLog('相手が切断しました', 'system'), [addLog]),
  });

  // ─── 自分のアクション → 送信 + ローカル反映 ────────────────────
  const handleEndTurn = useCallback(async () => {
    if (!state.isMyTurn) return;
    await sendAction(ACTION.END_TURN, { turnNumber: state.turnNumber });
    addLog(`${playerName}がターンを終了`, 'turn');
    dispatch({ type:'TURN_END' });
  }, [state.isMyTurn, state.turnNumber, sendAction, addLog, playerName]);

  const handleNextPhase = useCallback(async () => {
    if (!state.isMyTurn) return;
    const idx = PHASES.findIndex(p => p.id === state.phase);
    if (idx < PHASES.length - 1) {
      const next = PHASES[idx + 1];
      dispatch({ type:'PHASE_CHANGE', phase: next.id });
      addLog(`${next.label}フェーズ`);
      // DON!!フェーズ自動処理
      if (state.phase === 'refresh') dispatch({ type:'DON_REFRESH' });
    } else {
      await handleEndTurn();
    }
  }, [state.isMyTurn, state.phase, handleEndTurn, addLog]);

  const handleAttack = useCallback(async () => {
    if (!state.isMyTurn) return;
    await sendAction(ACTION.ATTACK, {});
    addLog('アタック！');
  }, [state.isMyTurn, sendAction, addLog]);

  const handleSurrender = useCallback(async () => {
    await sendAction(ACTION.SURRENDER, {});
    dispatch({ type:'SURRENDER', winner:'opp' });
    disconnect();
    onNavigate('pvp-room');
  }, [sendAction, dispatch, disconnect, onNavigate]);

  // ─── 勝敗モーダル ────────────────────────────────────────────────
  if (state.result) {
    const win = state.result === 'me';
    return (
      <div className={`min-h-screen flex items-center justify-center ${P.bg}`}>
        <div className="text-center space-y-6">
          <div className={`text-6xl font-black ${win ? 'text-amber-300' : 'text-red-400'}`}
            style={{ textShadow: `0 0 30px ${win ? 'rgba(251,191,36,0.5)' : 'rgba(239,68,68,0.5)'}` }}>
            {win ? '🏆 勝利！' : '💀 敗北'}
          </div>
          <div className="text-amber-700/60 text-lg">{win ? '相手を倒しました！' : '投了しました'}</div>
          <button onClick={() => onNavigate('pvp-room')} className={`px-8 py-3 rounded-xl text-base ${P.btnGold}`}>
            ルームに戻る
          </button>
        </div>
      </div>
    );
  }

  // ─── レンダリング ─────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex flex-col ${P.bg} overflow-hidden relative`}>
      <PirateMapBg />

      <TurnBanner isMyTurn={state.isMyTurn} visible={showTurnBanner} />
      <DisconnectBanner show={!opponentConnected && !!roomCode} />

      {detailCard && <CardDetailModal card={detailCard} onClose={() => setDetailCard(null)} />}

      {/* 終了確認 */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0a0f24] border border-amber-700/40 rounded-2xl p-6 max-w-xs w-full mx-4 text-center">
            <div className="text-amber-100 font-black text-lg mb-2">対戦を終了しますか？</div>
            <div className="text-amber-700/60 text-sm mb-5">相手に負けを認めることになります</div>
            <div className="flex gap-3">
              <button onClick={() => setShowQuitConfirm(false)} className={`flex-1 py-2.5 rounded-xl text-sm ${P.btnGray}`}>キャンセル</button>
              <button onClick={handleSurrender} className={`flex-1 py-2.5 rounded-xl text-sm ${P.btnRed}`}>投了する</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ヘッダー ══ */}
      <div className="relative z-10 flex items-center gap-2 px-3 pt-2 pb-1.5 border-b border-amber-900/20 bg-[#06091a]/80 backdrop-blur-sm flex-shrink-0">
        <button onClick={() => setShowQuitConfirm(true)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs ${P.btnGray}`}>
          <Home size={12} />投了
        </button>

        {/* ルームコード + 接続状態 */}
        <div className="flex items-center gap-1.5 bg-[#0d1530]/60 border border-amber-900/20 rounded-lg px-2 py-1">
          <span className="text-amber-700/50 text-[9px]">ROOM</span>
          <span className="text-amber-300/80 text-xs font-black tracking-widest font-mono">{roomCode}</span>
          <ConnBadge connected={connected} />
        </div>

        {/* フェーズバー */}
        <div className="flex-1 flex items-center justify-center gap-1">
          {PHASES.map((ph, i) => (
            <button key={ph.id} disabled={!state.isMyTurn}
              onClick={() => state.isMyTurn && dispatch({ type:'PHASE_CHANGE', phase:ph.id })}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all
                ${ph.id === state.phase
                  ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300'
                  : i < PHASES.findIndex(p => p.id === state.phase)
                    ? 'text-amber-700/40 border border-transparent'
                    : 'text-amber-800/30 border border-transparent'}`}>
              <span>{ph.icon}</span>
              <span className="hidden sm:inline">{ph.label}</span>
            </button>
          ))}
        </div>

        {/* ターン / 接続状態 */}
        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black border
          ${state.isMyTurn ? 'bg-amber-900/30 border-amber-600/40 text-amber-300'
                           : 'bg-blue-900/30 border-blue-600/40 text-blue-300'}`}>
          {state.isMyTurn ? '自分のターン' : '相手のターン'} T{state.turnNumber}
        </div>
      </div>

      {/* ══ メインフィールド ══ */}
      <div className="relative z-10 flex flex-1 overflow-hidden">

        {/* ─── 左カラム（相手情報） */}
        <div className="flex-shrink-0 flex flex-col border-r border-amber-900/15 bg-[#06091a]/50" style={{ width:LEFT_COL_W }}>
          <div className="p-3 border-b border-amber-900/15 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-900/40 border border-red-700/40 flex items-center justify-center font-black text-red-300 text-sm">
              {myRole === 'host' ? 'G' : 'H'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-red-200/70 text-xs font-bold">対戦相手</div>
              <ConnBadge connected={opponentConnected} />
            </div>
          </div>
          <div className="p-3 border-b border-amber-900/15">
            <div className={`${P.label} mb-2`}>相手ライフ <span className="text-amber-600/50 normal-case font-normal">{state.opp.life}</span></div>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: state.opp.life }).map((_,i) => <LifeCard key={i} />)}
            </div>
          </div>
          <div className="p-3 border-b border-amber-900/15">
            <div className={`${P.label} mb-2`}>相手 DON!!</div>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: state.opp.donActive }).map((_,i) => <DonCard key={i} active small />)}
              {Array.from({ length: state.opp.donRested }).map((_,i) => <DonCard key={i+10} active={false} small />)}
            </div>
          </div>
          <div className="p-3 border-b border-amber-900/15">
            <div className={`${P.label} mb-2`}>相手の手札</div>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: Math.min(state.opp.handCount, 10) }).map((_,i) => (
                <div key={i} style={{ width:28, height:40 }}
                  className="rounded border border-white/15 bg-gradient-to-br from-red-900/30 to-[#06091a] flex items-center justify-center">
                  <span className="text-red-800/50 text-[10px]">☠</span>
                </div>
              ))}
            </div>
            <div className="text-amber-700/40 text-[10px] mt-1">{state.opp.handCount}枚</div>
          </div>
          <div className="p-3">
            <div className={`${P.label} mb-2`}>相手デッキ</div>
            <div className="flex items-center gap-2">
              <div style={{ width:DECK_CARD.W, height:DECK_CARD.H }}
                className="rounded-lg border-2 border-white/15 bg-gradient-to-br from-red-900/40 to-[#06091a] flex items-center justify-center flex-shrink-0">
                <span className="text-red-700/50 text-2xl">☠</span>
              </div>
              <div className="text-amber-300/60 font-black text-lg">{state.opp.deckCount}</div>
            </div>
          </div>
        </div>

        {/* ─── 中央フィールド */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 相手フィールド */}
          <div className="flex-1 border-b-2 border-amber-900/20 bg-red-950/5 flex flex-col">
            <div className="flex items-center gap-1 px-3 pt-2 pb-1">
              <div className="text-red-400/40 text-[9px] font-bold uppercase tracking-widest">相手のフィールド</div>
            </div>
            <div className="flex-1 flex items-center px-4 gap-4">
              <div className="flex-shrink-0">
                <div style={{ width:CARD.W, height:CARD.H }}
                  className="rounded-xl border-2 border-red-700/30 bg-gradient-to-br from-red-900/30 to-[#06091a] flex items-center justify-center">
                  <span className="text-red-700/50 text-3xl">☠</span>
                </div>
                <div className="text-[9px] text-red-500/40 text-center mt-1">リーダー</div>
              </div>
              <div className="flex-1 flex gap-3 items-center justify-center">
                {state.opp.field.map((card, i) => (
                  card ? <GameCard key={i} card={card} faceDown onDoubleClick={() => setDetailCard(card)} />
                       : <EmptySlot key={i} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 pb-2">
              <div className="text-amber-700/30 text-[9px]">ステージ</div>
              <EmptySlot small />
            </div>
          </div>

          {/* フィールド中央ライン */}
          <div className="relative h-8 flex items-center justify-center flex-shrink-0">
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-800/30 to-transparent" />
            <div className="bg-[#06091a] px-3 relative z-10 flex items-center gap-2">
              <Swords size={14} className="text-amber-700/40" />
            </div>
          </div>

          {/* 自分フィールド */}
          <div className="flex-1 bg-amber-950/5 flex flex-col">
            <div className="flex items-center gap-2 px-4 pt-2">
              <div className="text-amber-700/30 text-[9px]">ステージ</div>
              <EmptySlot small />
            </div>
            <div className="flex-1 flex items-center px-4 gap-4">
              <div className="flex-shrink-0">
                <div style={{ width:CARD.W, height:CARD.H }}
                  className="rounded-xl border-2 border-amber-600/30 bg-gradient-to-br from-amber-900/20 to-[#06091a] flex items-center justify-center cursor-pointer hover:border-amber-500/50 transition-all">
                  <span className="text-amber-700/40 text-3xl">⚓</span>
                </div>
                <div className="text-[9px] text-amber-600/40 text-center mt-1">リーダー</div>
              </div>
              <div className="flex-1 flex gap-3 items-center justify-center">
                {state.me.field.map((card, i) => (
                  card ? <GameCard key={i} card={card} onDoubleClick={() => setDetailCard(card)} />
                       : <EmptySlot key={i} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 pb-2 pt-1">
              <div className="text-amber-400/40 text-[9px] font-bold uppercase tracking-widest">自分のフィールド</div>
            </div>
          </div>
        </div>

        {/* ─── 右カラム（自分情報 + アクション） */}
        <div className="flex-shrink-0 flex flex-col border-l border-amber-900/15 bg-[#06091a]/50" style={{ width:LEFT_COL_W }}>
          <div className="p-3 border-b border-amber-900/15 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-900/40 border border-amber-700/40 flex items-center justify-center font-black text-amber-300 text-sm">
              {playerName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-amber-100/80 text-xs font-bold truncate">{playerName}</div>
              <ConnBadge connected={connected} />
            </div>
          </div>

          <div className="p-3 border-b border-amber-900/15">
            <div className={`${P.label} mb-2`}>自分ライフ <span className="text-amber-600/50 normal-case font-normal">{state.me.life}</span></div>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: state.me.life }).map((_,i) => <LifeCard key={i} />)}
            </div>
          </div>

          <div className="p-3 border-b border-amber-900/15">
            <div className={`${P.label} mb-2`}>DON!! <span className="text-amber-600/50 normal-case font-normal">{state.me.donActive} / {state.me.donActive + state.me.donRested}</span></div>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: state.me.donActive }).map((_,i) => <DonCard key={i} active />)}
              {Array.from({ length: state.me.donRested }).map((_,i) => <DonCard key={i+10} active={false} />)}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="p-3 border-b border-amber-900/15 space-y-2">
            <div className={`${P.label} mb-1`}>アクション</div>
            <button onClick={handleNextPhase} disabled={!state.isMyTurn}
              className={`w-full py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5
                ${state.isMyTurn ? P.btnGold : P.btnGray + ' opacity-40 cursor-not-allowed'}`}>
              <ChevronRight size={13} />
              {PHASES.findIndex(p => p.id === state.phase) === PHASES.length - 1 ? 'ターン終了' : '次のフェーズ'}
            </button>
            <button onClick={handleAttack} disabled={!state.isMyTurn}
              className={`w-full py-2 rounded-lg text-xs ${state.isMyTurn ? P.btnBlue : P.btnGray + ' opacity-40 cursor-not-allowed'}`}>
              <Zap size={11} className="inline mr-1" />アタック
            </button>
          </div>

          {/* デッキ / トラッシュ */}
          <div className="p-3 border-b border-amber-900/15">
            <div className="flex gap-3 items-start">
              <div>
                <div className={`${P.label} mb-1`}>デッキ</div>
                <div className="flex items-center gap-1.5">
                  <div style={{ width:50, height:70 }}
                    className="rounded-lg border-2 border-amber-800/30 bg-gradient-to-br from-amber-900/20 to-[#06091a] flex items-center justify-center">
                    <span className="text-amber-700/40 text-xl">⚓</span>
                  </div>
                  <div className="text-amber-300/60 font-black text-base">{state.me.deckCount}</div>
                </div>
              </div>
              <div>
                <div className={`${P.label} mb-1`}>トラッシュ</div>
                <div style={{ width:50, height:70 }}
                  className="rounded-lg border-2 border-amber-800/20 bg-[#0d1530]/60 flex items-center justify-center">
                  <span className="text-amber-800/30 text-lg">🗑</span>
                </div>
              </div>
            </div>
          </div>

          {/* バトルログ */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            <div className={`${P.label} mb-2`}>バトルログ</div>
            <div className="flex-1 overflow-y-auto space-y-1 text-[10px]">
              {[...state.log].reverse().map(entry => (
                <div key={entry.id}
                  className={`px-2 py-1 rounded leading-relaxed
                    ${entry.type === 'system' ? 'text-amber-700/60 italic' :
                      entry.type === 'turn'   ? 'text-blue-400/70 font-bold' :
                      'text-amber-200/50'}`}>
                  {entry.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 手札エリア ══ */}
      <div className="relative z-10 flex-shrink-0 border-t-2 border-amber-900/20 bg-[#06091a]/90 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className={`${P.label} flex-shrink-0`}>手札 <span className="text-amber-600/50 normal-case font-normal">{state.me.handCount}枚</span></div>
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1">
            {Array.from({ length: Math.min(state.me.handCount, 10) }).map((_,i) => (
              <div key={i} style={{ width:HAND_CARD.W, height:HAND_CARD.H, flexShrink:0 }}
                className="rounded-xl border-2 border-amber-800/30 bg-gradient-to-br from-amber-900/15 to-[#06091a] flex items-center justify-center cursor-pointer hover:border-amber-600/40 hover:scale-105 transition-all">
                <span className="text-amber-700/30 text-2xl">⚓</span>
              </div>
            ))}
          </div>
          <button disabled={!state.isMyTurn}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs flex items-center gap-1
              ${state.isMyTurn ? P.btnGold : P.btnGray + ' opacity-40 cursor-not-allowed'}`}>
            ドロー
          </button>
        </div>
      </div>
    </div>
  );
}
