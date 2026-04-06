// ─────────────────────────────────────────────────────────────────────
// BattlePage.jsx — CPU対戦ページ
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { Home, Swords, ChevronRight, X, Bot, User, RotateCcw } from 'lucide-react';
import { useBattleState } from '../hooks/useBattleState';
import { loadSavedDecks, resolveSampleDeck } from '../hooks/useGameState';
import { SAMPLE_DECKS } from '../utils/deckRules';
import CardImage from '../components/CardImage';

// ─── カードサイズ定数 ─────────────────────────────────────────────────
const PC  = { W: 90,  H: 126 };  // プレイヤーフィールド・リーダー
const PH  = { W: 72,  H: 101 };  // プレイヤー手札
const CC  = { W: 64,  H: 90  };  // CPUフィールド・リーダー
const CH  = { W: 48,  H: 67  };  // CPU手札（裏面のみ）
const DM  = { W: 38,  H: 53  };  // DON!!ミニアタッチ

// ─── カラー定義 ───────────────────────────────────────────────────────
const P = {
  bg:      'bg-[#06091a]',
  panel:   'bg-white/8 border border-white/12',
  label:   'text-[10px] text-amber-300/80 font-bold uppercase tracking-widest',
  btnGold: 'bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-amber-100 font-bold border border-amber-500/60 shadow-md transition-all',
  btnRed:  'bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-red-100 font-bold border border-red-600/50 transition-all',
  btnBlue: 'bg-gradient-to-b from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-blue-100 font-bold border border-blue-600/50 transition-all',
  btnGray: 'bg-[#1a2040] hover:bg-[#232d55] text-amber-200/60 border border-amber-800/30 transition-all',
  btnGreen:'bg-gradient-to-b from-green-700 to-green-900 hover:from-green-600 hover:to-green-800 text-green-100 font-bold border border-green-600/50 transition-all',
};

const PHASES = ['refresh','draw','don','main','end'];
const PHASE_LABELS = { refresh:'リフレッシュ', draw:'ドロー', don:'DON!!', main:'メイン', end:'エンド' };

// ─── ユーティリティ ───────────────────────────────────────────────────
function hasTrigger(card) { return /【トリガー】/.test(card?.effect || ''); }
function calcPower(card) { return (card?.power || 0) + (card?.donAttached || 0) * 1000; }

// ─── ゲームカード（フィールド用・プレイヤー）────────────────────────
function GameCard({ card, tapped, faceDown, onClick, highlight, dimmed, size = PC, showPower = false }) {
  const { W, H } = size;
  const donCount = card?.donAttached || 0;
  const visibleDon = Math.min(donCount, 4);
  return (
    <div className="relative flex-shrink-0" style={{ width: W, height: H }}>
      {/* DON!!アタッチ（右側に扇状）*/}
      {donCount > 0 && Array.from({ length: visibleDon }).map((_, i) => (
        <div key={i} className="absolute rounded pointer-events-none overflow-hidden"
          style={{
            width: DM.W, height: DM.H,
            right: -(DM.W * (0.4 + i * 0.6) + 2),
            bottom: 4 + i * 6,
            zIndex: 10 + i,
            transform: `rotate(${-10 + i * 7}deg)`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
          }}>
          <div className="w-full h-full bg-yellow-500/20 border border-yellow-500/50 rounded flex items-center justify-center">
            <span className="text-yellow-400 font-black text-[10px]">DON</span>
          </div>
        </div>
      ))}
      {/* メインカード */}
      <div
        onClick={onClick}
        className="absolute inset-0 rounded-lg overflow-hidden cursor-pointer select-none transition-all duration-150"
        style={{
          transform: tapped ? 'rotate(90deg) translateX(17%)' : 'none',
          transformOrigin: 'center center',
          boxShadow: highlight === 'attacker'
            ? '0 0 0 3px #f59e0b, 0 0 18px rgba(245,158,11,0.7)'
            : highlight === 'target'
            ? '0 0 0 3px #ef4444, 0 0 18px rgba(239,68,68,0.7)'
            : '0 4px 12px rgba(0,0,0,0.5)',
          filter: dimmed ? 'brightness(0.4)' : 'none',
          opacity: dimmed ? 0.6 : 1,
        }}
      >
        {faceDown
          ? <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-950 flex items-center justify-center border border-blue-700/40 rounded-lg">
              <span className="text-blue-400/50 text-lg font-black">OP</span>
            </div>
          : <CardImage card={card} className="w-full h-full object-cover" />
        }
        {/* タップオーバーレイ */}
        {tapped && <div className="absolute inset-0 bg-blue-900/25 rounded-lg" />}
      </div>
      {/* パワー表示 */}
      {showPower && card?.power && !faceDown && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 z-20 bg-black/80 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-amber-700/40 whitespace-nowrap">
          {calcPower(card).toLocaleString()}
        </div>
      )}
    </div>
  );
}

// ─── 裏向きカード（CPU手札用）────────────────────────────────────────
function FaceDownCard({ size = CH }) {
  return (
    <div className="rounded overflow-hidden flex-shrink-0 border border-blue-800/40"
      style={{ width: size.W, height: size.H, background: 'linear-gradient(135deg, #0a1535, #0d1e4a)' }}>
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-blue-700/40 font-black text-[8px]">OP</span>
      </div>
    </div>
  );
}

// ─── ライフトークン ────────────────────────────────────────────────
function LifeTokens({ count, max = 5, color = 'red' }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i}
          className="w-4 h-4 rounded-full border transition-all"
          style={{
            background: i < count
              ? color === 'red' ? 'radial-gradient(circle, #ef4444, #991b1b)' : 'radial-gradient(circle, #60a5fa, #1d4ed8)'
              : 'rgba(255,255,255,0.05)',
            borderColor: i < count ? (color === 'red' ? 'rgba(252,165,165,0.5)' : 'rgba(147,197,253,0.5)') : 'rgba(255,255,255,0.1)',
            boxShadow: i < count ? `0 0 6px ${color === 'red' ? 'rgba(239,68,68,0.4)' : 'rgba(96,165,250,0.4)'}` : 'none',
          }}
        />
      ))}
      <span className="text-xs font-black ml-1" style={{ color: color === 'red' ? '#fca5a5' : '#93c5fd' }}>
        {count}/{max}
      </span>
    </div>
  );
}

// ─── DONゾーン表示 ────────────────────────────────────────────────
function DonZone({ active, tapped, label = 'DON!!' }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[9px] text-amber-600/60 font-bold uppercase">{label}</div>
      <div className="flex gap-1 items-center">
        <div className="flex gap-0.5">
          {Array.from({ length: Math.min(active, 8) }).map((_, i) => (
            <div key={`a${i}`} className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-300/50"
              style={{ boxShadow: '0 0 4px rgba(234,179,8,0.6)' }} />
          ))}
        </div>
        {tapped > 0 && (
          <div className="flex gap-0.5 ml-1">
            {Array.from({ length: Math.min(tapped, 8) }).map((_, i) => (
              <div key={`t${i}`} className="w-3 h-3 rounded-full bg-yellow-700/60 border border-yellow-700/40 rotate-90" />
            ))}
          </div>
        )}
        {(active + tapped === 0) && <span className="text-amber-900/40 text-[9px]">0</span>}
      </div>
      <div className="text-[9px] text-amber-400/50">
        <span className="text-yellow-400 font-bold">{active}</span>
        {tapped > 0 && <span className="text-yellow-700"> +{tapped}</span>}
      </div>
    </div>
  );
}

// ─── フェーズインジケーター ────────────────────────────────────────
function PhaseBar({ current }) {
  return (
    <div className="flex gap-0.5 items-center">
      {PHASES.map((p, i) => (
        <div key={p} className="flex items-center gap-0.5">
          <div className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
            p === current
              ? 'bg-amber-500/25 border border-amber-500/60 text-amber-300'
              : 'bg-white/4 border border-white/8 text-white/25'
          }`}>
            {PHASE_LABELS[p]}
          </div>
          {i < PHASES.length - 1 && <ChevronRight size={8} className="text-white/15" />}
        </div>
      ))}
    </div>
  );
}

// ─── CPU ボードセクション（上段）─────────────────────────────────
function CpuBoard({ cpuSide, attackMode, onTargetSelect }) {
  const isSelectingTarget = attackMode === 'select-target';
  const leader = cpuSide.leader;

  return (
    <div className="flex flex-col gap-2 w-full" style={{ minHeight: 220 }}>
      {/* CPU情報行 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-black/30 border border-blue-800/30 rounded-lg px-2.5 py-1.5">
          <Bot size={12} className="text-blue-400" />
          <span className="text-blue-300/80 text-[10px] font-bold">CPU</span>
        </div>
        <LifeTokens count={cpuSide.life.length} max={leader?.life || 5} color="blue" />
        <DonZone active={cpuSide.donActive} tapped={cpuSide.donTapped} />
        <div className="text-[9px] text-amber-900/50 ml-auto">
          手札{cpuSide.hand.length}枚 | デッキ{cpuSide.deck.length}枚
        </div>
      </div>

      {/* CPU フィールド行 */}
      <div className="flex items-end gap-3 flex-wrap">
        {/* CPU リーダー */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-[8px] text-blue-400/60 font-bold">LEADER</div>
          <div className="relative">
            <GameCard
              card={leader}
              tapped={leader.tapped}
              size={CC}
              showPower
              highlight={isSelectingTarget ? 'target' : null}
              onClick={() => isSelectingTarget && onTargetSelect('cpu-leader')}
            />
            {(leader.donAttached || 0) > 0 && (
              <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center z-20">
                {leader.donAttached}
              </div>
            )}
          </div>
          {isSelectingTarget && (
            <div className="text-[8px] text-red-400 animate-pulse font-bold">ターゲット</div>
          )}
        </div>

        {/* CPU フィールド（キャラクター）*/}
        <div className="flex gap-2 items-end flex-wrap flex-1">
          {cpuSide.field.length === 0 && (
            <div className="flex items-center justify-center border border-dashed border-blue-900/30 rounded-lg text-[9px] text-blue-900/40 px-4"
              style={{ width: CC.W, height: CC.H }}>
              なし
            </div>
          )}
          {cpuSide.field.map(card => (
            <div key={card._uid} className="flex flex-col items-center gap-0.5">
              <GameCard
                card={card}
                tapped={card.tapped}
                size={CC}
                showPower
                highlight={isSelectingTarget ? 'target' : null}
                onClick={() => isSelectingTarget && onTargetSelect(card._uid)}
              />
              {isSelectingTarget && (
                <div className="text-[8px] text-red-400 animate-pulse font-bold">選択</div>
              )}
            </div>
          ))}
        </div>

        {/* CPU 手札（裏向き）*/}
        <div className="flex flex-col items-center gap-1">
          <div className="text-[8px] text-blue-400/60 font-bold">HAND</div>
          <div className="flex gap-0.5 flex-wrap max-w-[120px]">
            {cpuSide.hand.map((_, i) => <FaceDownCard key={i} />)}
            {cpuSide.hand.length === 0 && <span className="text-blue-900/40 text-[9px]">0枚</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── プレイヤーボードセクション（下段）───────────────────────────
function PlayerBoard({
  playerSide, attackMode, selectedAttackerUid,
  onAttackerSelect, onPlayCard, onAttachDon,
  isMyTurn, inMainPhase,
  showCardDetail,
}) {
  const leader = playerSide.leader;
  const isSelectingAttacker = attackMode === 'select-attacker' || attackMode === null;
  const canAct = isMyTurn && inMainPhase;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* プレイヤーフィールド行 */}
      <div className="flex items-end gap-3 flex-wrap">
        {/* プレイヤーリーダー */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-[8px] text-amber-400/60 font-bold">LEADER</div>
          <div className="relative">
            <GameCard
              card={leader}
              tapped={leader.tapped}
              size={PC}
              showPower
              highlight={selectedAttackerUid === 'p-leader' ? 'attacker' : null}
              onClick={() => {
                if (canAct && !attackMode) onAttackerSelect('p-leader');
                else if (attackMode === null) showCardDetail(leader);
              }}
            />
            {(leader.donAttached || 0) > 0 && (
              <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center z-20 border-2 border-black">
                {leader.donAttached}
              </div>
            )}
            {/* DONアタッチボタン */}
            {canAct && playerSide.donActive > 0 && (
              <button
                onClick={e => { e.stopPropagation(); onAttachDon('leader'); }}
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] bg-yellow-700/80 hover:bg-yellow-600 text-yellow-200 px-2 py-0.5 rounded font-bold whitespace-nowrap border border-yellow-600/50 z-30"
              >
                DON!!+
              </button>
            )}
          </div>
          {canAct && !leader.tapped && (
            <div className="text-[8px] text-amber-400/60 font-bold mt-5">アタック</div>
          )}
        </div>

        {/* フィールドキャラクター */}
        <div className="flex gap-3 items-end flex-wrap flex-1 justify-center">
          {playerSide.field.length === 0 && (
            <div className="flex items-center justify-center border border-dashed border-amber-900/30 rounded-lg text-[9px] text-amber-900/40 px-4"
              style={{ width: PC.W, height: PC.H }}>
              空
            </div>
          )}
          {playerSide.field.map(card => {
            const isAttacker = selectedAttackerUid === card._uid;
            return (
              <div key={card._uid} className="flex flex-col items-center gap-1">
                <GameCard
                  card={card}
                  tapped={card.tapped}
                  size={PC}
                  showPower
                  highlight={isAttacker ? 'attacker' : null}
                  dimmed={canAct && selectedAttackerUid && !isAttacker}
                  onClick={() => {
                    if (canAct && !attackMode && !card.tapped) onAttackerSelect(card._uid);
                    else showCardDetail(card);
                  }}
                />
                {/* DONアタッチボタン */}
                {canAct && playerSide.donActive > 0 && (
                  <button
                    onClick={() => onAttachDon(card._uid)}
                    className="text-[8px] bg-yellow-700/80 hover:bg-yellow-600 text-yellow-200 px-2 py-0.5 rounded font-bold whitespace-nowrap border border-yellow-600/50"
                  >
                    DON!!+
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 情報パネル */}
        <div className="flex flex-col items-end gap-2">
          <LifeTokens count={playerSide.life.length} max={leader?.life || 5} color="red" />
          <DonZone active={playerSide.donActive} tapped={playerSide.donTapped} />
          <div className="text-[9px] text-amber-900/50">
            デッキ{playerSide.deck.length}枚
          </div>
        </div>
      </div>

      {/* 手札行 */}
      <div className="flex gap-1.5 items-end flex-wrap pb-1 mt-1">
        <div className="text-[8px] text-amber-400/60 font-bold mr-1 self-center">HAND</div>
        {playerSide.hand.map(card => (
          <div key={card._uid} className="flex flex-col items-center gap-0.5 group">
            <div
              className="rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 hover:-translate-y-1 border border-amber-900/30 hover:border-amber-600/50"
              style={{ width: PH.W, height: PH.H, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
              onClick={() => {
                if (canAct && card.card_type === 'CHARACTER') onPlayCard(card._uid);
                else showCardDetail(card);
              }}
              title={card.name}
            >
              <CardImage card={card} className="w-full h-full object-cover" />
            </div>
            {/* コスト表示 */}
            {card.card_type === 'CHARACTER' && (
              <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                canAct && (card.cost || 0) <= playerSide.donActive
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-600/40'
                  : 'bg-white/5 text-white/30 border border-white/10'
              }`}>
                {card.cost}
              </div>
            )}
          </div>
        ))}
        {playerSide.hand.length === 0 && (
          <span className="text-amber-900/40 text-xs">手札なし</span>
        )}
      </div>
    </div>
  );
}

// ─── バトルログ ───────────────────────────────────────────────────
function BattleLog({ logs }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [logs?.length]);

  return (
    <div ref={ref} className="overflow-y-auto text-[10px] space-y-0.5" style={{ maxHeight: 100 }}>
      {(logs || []).map((entry, i) => (
        <div key={entry.ts || i}
          className={`px-2 py-0.5 rounded ${i === 0 ? 'text-amber-200/90 bg-amber-900/15' : 'text-amber-900/60'}`}>
          {entry.msg}
        </div>
      ))}
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
          <div className="rounded-xl overflow-hidden border border-blue-600/40"
            style={{ width: 120, height: 168 }}>
            <CardImage card={card} className="w-full h-full object-cover" />
          </div>
        </div>
        {card.effect && (
          <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-3 mb-4 text-[11px] text-blue-200/80 leading-relaxed">
            {card.effect}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onActivate}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black ${P.btnBlue}`}>
            発動する
          </button>
          <button onClick={onSkip}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black ${P.btnGray}`}>
            スキップ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 解決確認モーダル（アタック）────────────────────────────────
function AttackResolveModal({ attackState, cpuSide, playerSide, onResolve, onCancel }) {
  if (!attackState || attackState.step !== 'resolving') return null;
  const atkPow = attackState.attackPower || 0;
  const defPow = attackState.defensePower || 0;
  const wins = atkPow > defPow;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-[#0a0f24] border border-amber-600/40 rounded-2xl shadow-2xl max-w-xs w-full mx-4 p-5">
        <div className="text-center mb-4">
          <div className="text-amber-400 font-black text-base mb-1">アタック解決</div>
          <div className="flex items-center justify-center gap-3 my-3">
            <div className="text-center">
              <div className="text-xs text-amber-400/60 mb-1">攻撃</div>
              <div className="font-black text-xl text-amber-300">{atkPow.toLocaleString()}</div>
            </div>
            <div className="text-2xl">⚔️</div>
            <div className="text-center">
              <div className="text-xs text-blue-400/60 mb-1">防御</div>
              <div className="font-black text-xl text-blue-300">{defPow.toLocaleString()}</div>
            </div>
          </div>
          <div className={`font-black text-lg ${wins ? 'text-green-400' : 'text-gray-400'}`}>
            {wins ? '攻撃成功！' : '攻撃失敗'}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onResolve}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black ${wins ? P.btnGold : P.btnGray}`}>
            確定
          </button>
          <button onClick={onCancel}
            className={`py-2.5 px-3 rounded-xl text-sm ${P.btnGray}`}>
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 勝利/敗北モーダル ────────────────────────────────────────────
function WinModal({ winner, onReturn, onRematch }) {
  const isWin = winner === 'player';
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className={`bg-[#0a0f24] border rounded-2xl shadow-2xl max-w-xs w-full mx-4 p-8 text-center
        ${isWin ? 'border-amber-500/60' : 'border-red-700/40'}`}>
        <div className="text-6xl mb-4">{isWin ? '🏆' : '💀'}</div>
        <div className={`font-black text-3xl mb-2 ${isWin ? 'text-amber-400' : 'text-red-400'}`}>
          {isWin ? '勝利！' : '敗北...'}
        </div>
        <div className="text-amber-200/50 text-sm mb-6">
          {isWin ? 'CPUを倒した！' : 'CPUに敗れた...'}
        </div>
        <div className="flex gap-3">
          <button onClick={onRematch}
            className={`flex-1 py-2.5 rounded-xl font-black text-sm ${P.btnGold}`}>
            <RotateCcw size={14} className="inline mr-1" /> リマッチ
          </button>
          <button onClick={onReturn}
            className={`flex-1 py-2.5 rounded-xl font-black text-sm ${P.btnGray}`}>
            <Home size={14} className="inline mr-1" /> ホーム
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── セットアップ画面 ────────────────────────────────────────────
function SetupScreen({ onStart, onHome, cardMap }) {
  const savedDecks = loadSavedDecks();
  const savedDeckNames = Object.keys(savedDecks);

  const [playerDeckName, setPlayerDeckName] = useState(savedDeckNames[0] || '');
  const [cpuDeckName, setCpuDeckName]       = useState('');
  const [cpuDeckType, setCpuDeckType]       = useState('sample'); // 'sample' | 'saved'
  const [sampleIdx, setSampleIdx]           = useState(0);
  const [order, setOrder]                   = useState('first');
  const isCardMapReady = Object.keys(cardMap || {}).length > 0;

  // プレイヤーデッキ: 保存済みのみ
  const playerDeck = savedDecks[playerDeckName] || null;

  // CPUデッキ（サンプルはresolveSampleDeckで解決）
  let cpuDeckResolved = null;
  if (cpuDeckType === 'sample' && isCardMapReady) {
    const raw = SAMPLE_DECKS[sampleIdx];
    if (raw) cpuDeckResolved = resolveSampleDeck(raw, cardMap);
  } else if (cpuDeckType === 'saved') {
    cpuDeckResolved = savedDecks[cpuDeckName] || null;
  }

  const canStart = playerDeck && cpuDeckResolved && isCardMapReady;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0a1530, #06091a)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">⚔️</div>
          <h1 className="font-black text-2xl text-amber-400 mb-1">CPU対戦</h1>
          <p className="text-amber-800/60 text-sm">デッキと先行/後攻を選んでください</p>
        </div>

        <div className="space-y-4">
          {/* プレイヤーデッキ */}
          <div className="bg-[#0d1530] border border-amber-800/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <User size={14} className="text-amber-400" />
              <span className="text-amber-300/80 font-bold text-sm">あなたのデッキ</span>
            </div>
            {savedDeckNames.length === 0 ? (
              <div className="text-amber-900/50 text-sm text-center py-2">
                デッキビルダーで先にデッキを保存してください
              </div>
            ) : (
              <select
                value={playerDeckName}
                onChange={e => setPlayerDeckName(e.target.value)}
                className="w-full bg-[#06091a] border border-amber-800/40 rounded-xl px-3 py-2 text-amber-200/80 text-sm focus:outline-none focus:border-amber-600/60"
              >
                {savedDeckNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
            {playerDeck && (
              <div className="mt-2 text-[10px] text-amber-700/50">
                リーダー: {playerDeck.leader?.name} / {playerDeck.entries?.length ?? 0}種
              </div>
            )}
          </div>

          {/* CPUデッキ */}
          <div className="bg-[#0d1530] border border-blue-800/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot size={14} className="text-blue-400" />
              <span className="text-blue-300/80 font-bold text-sm">CPUのデッキ</span>
            </div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setCpuDeckType('sample')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  cpuDeckType === 'sample'
                    ? 'bg-blue-700/30 border-blue-600/50 text-blue-300'
                    : 'bg-white/4 border-white/10 text-white/30'
                }`}>
                サンプル
              </button>
              <button
                onClick={() => setCpuDeckType('saved')}
                disabled={savedDeckNames.length === 0}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  cpuDeckType === 'saved'
                    ? 'bg-blue-700/30 border-blue-600/50 text-blue-300'
                    : 'bg-white/4 border-white/10 text-white/30'
                } disabled:opacity-30`}>
                保存済み
              </button>
            </div>
            {cpuDeckType === 'sample' ? (
              <select
                value={sampleIdx}
                onChange={e => setSampleIdx(Number(e.target.value))}
                className="w-full bg-[#06091a] border border-blue-800/40 rounded-xl px-3 py-2 text-blue-200/80 text-sm focus:outline-none focus:border-blue-600/60"
              >
                {SAMPLE_DECKS.map((d, i) => <option key={i} value={i}>{d.name}</option>)}
              </select>
            ) : (
              <select
                value={cpuDeckName}
                onChange={e => setCpuDeckName(e.target.value)}
                className="w-full bg-[#06091a] border border-blue-800/40 rounded-xl px-3 py-2 text-blue-200/80 text-sm focus:outline-none focus:border-blue-600/60"
              >
                <option value="">選択してください</option>
                {savedDeckNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>

          {/* 先行/後攻 */}
          <div className="bg-[#0d1530] border border-amber-800/20 rounded-2xl p-4">
            <div className="text-amber-300/70 font-bold text-sm mb-3">先行 / 後攻</div>
            <div className="flex gap-3">
              {[['first','先行（先手）'],['second','後攻（後手）']].map(([val, label]) => (
                <button key={val}
                  onClick={() => setOrder(val)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-all ${
                    order === val
                      ? `${P.btnGold}`
                      : `${P.btnGray}`
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* スタートボタン */}
          <button
            disabled={!canStart}
            onClick={() => onStart(playerDeck, cpuDeckResolved, order)}
            className={`w-full py-4 rounded-2xl font-black text-lg transition-all ${
              canStart ? P.btnGold : 'bg-gray-800/50 text-gray-600 border border-gray-700/30 cursor-not-allowed'
            }`}
          >
            <Swords size={18} className="inline mr-2" />
            対戦スタート！
          </button>

          <button onClick={onHome}
            className={`w-full py-2.5 rounded-xl text-sm ${P.btnGray}`}>
            <Home size={14} className="inline mr-1" /> ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── マリガン画面 ────────────────────────────────────────────────
function MulliganScreen({ playerHand, leaderName, onMulligan, onKeep }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0a1530, #06091a)' }}>
      <div className="w-full max-w-lg text-center">
        <h2 className="font-black text-2xl text-amber-400 mb-1">マリガン</h2>
        <p className="text-amber-700/60 text-sm mb-6">初期手札を確認してください（1回まで引き直し可能）</p>
        <div className="text-xs text-amber-600/50 mb-4">リーダー: {leaderName}</div>

        {/* 手札表示 */}
        <div className="flex gap-2 justify-center flex-wrap mb-8">
          {playerHand.map(card => (
            <div key={card._uid} className="flex flex-col items-center gap-1">
              <div className="rounded-xl overflow-hidden border border-amber-800/30"
                style={{ width: 76, height: 107 }}>
                <CardImage card={card} className="w-full h-full object-cover" />
              </div>
              <div className="text-[8px] text-amber-700/60 text-center max-w-[70px] truncate">{card.name}</div>
              {card.cost != null && (
                <div className="text-[8px] bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-800/30">
                  コスト{card.cost}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center">
          <button onClick={onMulligan}
            className={`px-8 py-3 rounded-xl font-black text-sm ${P.btnRed}`}>
            <RotateCcw size={14} className="inline mr-1" /> 引き直す
          </button>
          <button onClick={onKeep}
            className={`px-8 py-3 rounded-xl font-black text-sm ${P.btnGold}`}>
            キープ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────
export default function BattlePage({ onNavigate }) {
  const game = useBattleState();
  const { state } = game;

  // カードマップ（サンプルデッキ解決用）
  const [cardMap, setCardMap] = useState({});
  useEffect(() => {
    fetch('./cards.json')
      .then(r => r.json())
      .then(d => {
        const map = {};
        (d.cards || []).forEach(c => { map[c.card_number] = c; });
        setCardMap(map);
      })
      .catch(() => {});
  }, []);

  // アタックモード管理
  const [attackMode, setAttackMode] = useState(null); // null | 'select-target'
  const [selectedAttackerUid, setSelectedAttackerUid] = useState(null);

  // カード詳細モーダル
  const [detailCard, setDetailCard] = useState(null);

  // セットアップ用情報（リマッチのため保存）
  const [setupInfo, setSetupInfo] = useState(null);

  const isCpuTurn = state?.activePlayer === 'cpu';
  const isMyTurn  = state?.activePlayer === 'player';
  const subPhase  = state?.subPhase;
  const inMainPhase = subPhase === 'main';

  // ─── CPU ターン自動実行 ─────────────────────────────────────────
  useEffect(() => {
    if (!state || state.phase !== 'game' || state.winner) return;
    if (!isCpuTurn) return;
    if (state.pendingTrigger) return; // トリガー待ち（プレイヤー/CPU問わず停止）

    // リフレッシュ/ドロー/DON!!フェーズ: 自動進行
    if (['refresh', 'draw', 'don'].includes(subPhase)) {
      const t = setTimeout(() => game.advancePhase(), 800);
      return () => clearTimeout(t);
    }

    // エンドフェーズ: 自動進行
    if (subPhase === 'end') {
      const t = setTimeout(() => game.advancePhase(), 600);
      return () => clearTimeout(t);
    }

    // メインフェーズ: CPU行動実行（runCpuMainPhaseが内部でendへ自動進行）
    if (subPhase === 'main') {
      const t = setTimeout(() => game.runCpuMainPhase(), 1200);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.activePlayer, state?.subPhase, state?.winner, state?.pendingTrigger]);

  // CPUターン中はアタックモードをリセット
  useEffect(() => {
    if (isCpuTurn) {
      setAttackMode(null);
      setSelectedAttackerUid(null);
    }
  }, [isCpuTurn]);

  // ─── セットアップ開始 ──────────────────────────────────────────
  const handleStart = useCallback((playerDeck, cpuDeck, order) => {
    setSetupInfo({ playerDeck, cpuDeck, order });
    game.startBattle(playerDeck.leader, playerDeck.entries, cpuDeck.leader, cpuDeck.entries, order);
  }, [game]);

  // リマッチ
  const handleRematch = useCallback(() => {
    if (!setupInfo) return;
    const { playerDeck, cpuDeck, order } = setupInfo;
    game.startBattle(playerDeck.leader, playerDeck.entries, cpuDeck.leader, cpuDeck.entries, order);
    setAttackMode(null);
    setSelectedAttackerUid(null);
  }, [setupInfo, game]);

  // ─── アタック操作 ──────────────────────────────────────────────
  const handleAttackerSelect = useCallback((uid) => {
    setSelectedAttackerUid(uid);
    setAttackMode('select-target');
    game.playerSelectAttacker(uid);
  }, [game]);

  const handleTargetSelect = useCallback((targetUid) => {
    if (attackMode !== 'select-target') return;
    setAttackMode('resolving');
    game.playerSelectTarget(targetUid);
  }, [attackMode, game]);

  const handleCancelAttack = useCallback(() => {
    game.cancelAttack();
    setAttackMode(null);
    setSelectedAttackerUid(null);
  }, [game]);

  const handleResolveAttack = useCallback(() => {
    game.resolveAttack();
    setAttackMode(null);
    setSelectedAttackerUid(null);
  }, [game]);

  // ─── 各種表示分岐 ─────────────────────────────────────────────
  if (!state) {
    return (
      <SetupScreen
        onStart={handleStart}
        onHome={() => onNavigate('home')}
        cardMap={cardMap}
      />
    );
  }

  if (state.phase === 'mulligan') {
    return (
      <MulliganScreen
        playerHand={state.player.hand}
        leaderName={state.player.leader?.name}
        onMulligan={game.playerMulligan}
        onKeep={game.confirmMulligan}
      />
    );
  }

  const ps = state.player;
  const cs = state.cpu;

  return (
    <div className={`min-h-screen flex flex-col ${P.bg} overflow-hidden`}
      style={{ fontSize: 13 }}>

      {/* ─── ヘッダー ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-amber-900/20 bg-black/30">
        <button onClick={() => onNavigate('home')} className={`p-1.5 rounded-lg ${P.btnGray}`}>
          <Home size={14} />
        </button>
        <div className="flex-1">
          <PhaseBar current={subPhase} />
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-bold ${
          isMyTurn
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            : 'bg-blue-500/15 border-blue-500/40 text-blue-300'
        }`}>
          {isMyTurn ? <User size={12} /> : <Bot size={12} />}
          {isMyTurn ? 'プレイヤーターン' : 'CPUターン'}
          <span className="text-white/30 ml-1">T{state.turn}</span>
        </div>
      </div>

      {/* ─── メインエリア ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左: ボードエリア */}
        <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-3">
          {/* CPU ボード（上段）*/}
          <div className={`rounded-2xl p-3 border ${
            isCpuTurn ? 'border-blue-600/40 bg-blue-900/8' : 'border-blue-900/20 bg-black/20'
          }`}>
            <CpuBoard
              cpuSide={cs}
              attackMode={attackMode}
              onTargetSelect={handleTargetSelect}
            />
          </div>

          {/* セパレーター */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-800/30 to-transparent" />
            <div className="px-2 py-0.5 rounded-full bg-amber-900/20 border border-amber-800/30 text-amber-700/50 text-[9px] font-bold tracking-wider">
              BATTLE FIELD
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-800/30 to-transparent" />
          </div>

          {/* プレイヤー ボード（下段）*/}
          <div className={`rounded-2xl p-3 border ${
            isMyTurn ? 'border-amber-600/30 bg-amber-900/5' : 'border-amber-900/15 bg-black/15'
          }`}>
            <PlayerBoard
              playerSide={ps}
              attackMode={attackMode}
              selectedAttackerUid={selectedAttackerUid}
              onAttackerSelect={handleAttackerSelect}
              onPlayCard={game.playerPlayCard}
              onAttachDon={game.playerAttachDon}
              isMyTurn={isMyTurn}
              inMainPhase={inMainPhase}
              showCardDetail={setDetailCard}
            />
          </div>
        </div>

        {/* 右: コントロールパネル */}
        <div className="flex-shrink-0 w-52 flex flex-col gap-3 p-3 border-l border-amber-900/15 bg-black/20 overflow-y-auto">
          {/* アクションボタン */}
          <div className="space-y-2">
            <div className={P.label}>アクション</div>

            {/* フェーズ進行ボタン（プレイヤーターン時のみ）*/}
            {isMyTurn && !attackMode && (
              <button
                onClick={game.advancePhase}
                className={`w-full py-2.5 rounded-xl text-xs font-black ${P.btnGold} flex items-center justify-center gap-1.5`}
              >
                <ChevronRight size={14} />
                {subPhase === 'main' ? 'エンドフェーズ' : 'フェーズ進行'}
              </button>
            )}

            {/* アタックキャンセル */}
            {attackMode === 'select-target' && (
              <button onClick={handleCancelAttack}
                className={`w-full py-2 rounded-xl text-xs ${P.btnGray}`}>
                <X size={12} className="inline mr-1" /> アタックキャンセル
              </button>
            )}

            {/* CPUターン中表示 */}
            {isCpuTurn && (
              <div className="text-center py-3 text-blue-400/70 text-xs animate-pulse">
                <Bot size={16} className="inline mb-1 mr-1" />
                CPU思考中...
              </div>
            )}

            {/* アタックモードガイド */}
            {isMyTurn && inMainPhase && !attackMode && (
              <div className="text-[9px] text-amber-700/50 text-center px-1 leading-relaxed">
                フィールドのキャラ・リーダーをクリックでアタック宣言
              </div>
            )}
            {attackMode === 'select-target' && (
              <div className="text-[9px] text-red-400/70 text-center animate-pulse leading-relaxed">
                CPUのキャラ・リーダーをクリックしてターゲット選択
              </div>
            )}
          </div>

          {/* DON!!操作（プレイヤーメインフェーズ）*/}
          {isMyTurn && inMainPhase && ps.donActive > 0 && (
            <div className="space-y-1.5">
              <div className={P.label}>DON!!</div>
              <button onClick={() => game.playerTapDon(1)}
                className={`w-full py-1.5 rounded-lg text-[10px] ${P.btnGray}`}>
                DON!! ×1 レスト
              </button>
            </div>
          )}

          {/* バトルログ */}
          <div className="flex-1 space-y-1">
            <div className={P.label}>バトルログ</div>
            <BattleLog logs={state.battleLog} />
          </div>
        </div>
      </div>

      {/* ─── モーダル類 ──────────────────────────────────────── */}

      {/* トリガー（プレイヤー）*/}
      {state.pendingTrigger?.owner === 'player' && (
        <TriggerModal
          card={state.pendingTrigger.card}
          onActivate={() => game.resolveTrigger(true)}
          onSkip={() => game.resolveTrigger(false)}
        />
      )}

      {/* トリガー（CPU）- 自動処理 */}
      {state.pendingTrigger?.owner === 'cpu' && (
        <AutoCpuTrigger game={game} card={state.pendingTrigger.card} />
      )}

      {/* アタック解決 */}
      {state.attackState?.step === 'resolving' && state.attackState?.owner === 'player' && (
        <AttackResolveModal
          attackState={state.attackState}
          cpuSide={cs}
          playerSide={ps}
          onResolve={handleResolveAttack}
          onCancel={handleCancelAttack}
        />
      )}

      {/* 勝敗モーダル */}
      {state.winner && (
        <WinModal
          winner={state.winner}
          onReturn={() => { game.resetBattle(); onNavigate('home'); }}
          onRematch={handleRematch}
        />
      )}

      {/* カード詳細 */}
      {detailCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
          onClick={() => setDetailCard(null)}>
          <div className="bg-[#0a0f24] border border-amber-700/40 rounded-2xl p-4 max-w-xs w-full mx-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex gap-4">
              <div className="rounded-xl overflow-hidden flex-shrink-0 border border-amber-900/30"
                style={{ width: 112, height: 157 }}>
                <CardImage card={detailCard} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-amber-200 text-base mb-1">{detailCard.name}</div>
                <div className="text-amber-700/50 text-[10px] mb-2">{detailCard.card_number}</div>
                {detailCard.power && <div className="text-amber-300 text-sm font-bold mb-1">P: {detailCard.power.toLocaleString()}</div>}
                {detailCard.cost != null && <div className="text-blue-300 text-sm font-bold mb-1">コスト: {detailCard.cost}</div>}
                {detailCard.effect && (
                  <div className="text-amber-200/70 text-[10px] leading-relaxed mt-2 max-h-32 overflow-y-auto">
                    {detailCard.effect}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setDetailCard(null)}
              className={`mt-3 w-full py-2 rounded-xl text-xs ${P.btnGray}`}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CPUトリガー自動処理コンポーネント ───────────────────────────
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
