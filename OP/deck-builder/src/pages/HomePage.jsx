import { Layers, Swords, Anchor, ChevronRight, Bot, Users } from 'lucide-react';

/* ─────────────────────────────────────────────
   カラーパレット（セピア・古地図系）
   背景:  #120b04 〜 #1e1206
   紙面:  #2a1a08 〜 #3a2510
   金線:  #b8892a
   赤針:  #cc3020
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   コンパスローズ SVG
───────────────────────────────────────────── */
function CompassRose({ size = 320, opacity = 0.18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" fill="none"
      style={{ opacity, position: 'absolute', pointerEvents: 'none' }}>
      <circle cx="160" cy="160" r="150" stroke="#b8892a" strokeWidth="1.2" strokeDasharray="4 7" opacity="0.7" />
      <circle cx="160" cy="160" r="120" stroke="#b8892a" strokeWidth="0.6" opacity="0.35" />
      <circle cx="160" cy="160" r="90"  stroke="#b8892a" strokeWidth="0.6" opacity="0.25" />
      {[0,45,90,135,180,225,270,315].map(deg => {
        const r = deg * Math.PI / 180;
        const x1 = 160 + 25 * Math.sin(r), y1 = 160 - 25 * Math.cos(r);
        const x2 = 160 + 150 * Math.sin(r), y2 = 160 - 150 * Math.cos(r);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#b8892a" strokeWidth={deg % 90 === 0 ? 1.2 : 0.6} opacity={0.65} />;
      })}
      {/* 北 赤針 */}
      <polygon points="160,8 153,52 160,44 167,52"  fill="#cc3020" opacity="0.9" />
      {/* 南・東・西 */}
      <polygon points="160,312 153,268 160,276 167,268" fill="#b8892a" opacity="0.7" />
      <polygon points="312,160 268,153 276,160 268,167" fill="#b8892a" opacity="0.7" />
      <polygon points="8,160 52,153 44,160 52,167"    fill="#b8892a" opacity="0.7" />
      <circle cx="160" cy="160" r="13" fill="#1e1206" stroke="#b8892a" strokeWidth="1.5" opacity="0.95" />
      <circle cx="160" cy="160" r="4.5" fill="#b8892a" opacity="0.9" />
      <text x="153" y="5"   fill="#cc3020" fontSize="13" fontWeight="bold" fontFamily="serif" opacity="0.9">N</text>
      <text x="153" y="320" fill="#b8892a" fontSize="11" fontFamily="serif" opacity="0.65">S</text>
      <text x="305" y="165" fill="#b8892a" fontSize="11" fontFamily="serif" opacity="0.65">E</text>
      <text x="4"   y="165" fill="#b8892a" fontSize="11" fontFamily="serif" opacity="0.65">W</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   航路・地図模様 SVG
───────────────────────────────────────────── */
function TreasureMap() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <defs>
        {/* 羊皮紙テクスチャ風グラデーション */}
        <radialGradient id="parchment" cx="50%" cy="40%" r="75%">
          <stop offset="0%"   stopColor="#2a1a08" stopOpacity="0.6" />
          <stop offset="60%"  stopColor="#180e04" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0c0702" stopOpacity="1" />
        </radialGradient>
        {/* 周辺焼け */}
        <radialGradient id="burn" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="80%"  stopColor="#0a0500" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#050200" stopOpacity="0.85" />
        </radialGradient>
        {/* 縦ストライプ（紙目） */}
        <pattern id="grain" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="4" stroke="#5a3a18" strokeWidth="0.3" opacity="0.12" />
        </pattern>
      </defs>

      {/* 羊皮紙ベース */}
      <rect width="1440" height="900" fill="url(#parchment)" />
      {/* 紙目 */}
      <rect width="1440" height="900" fill="url(#grain)" />
      {/* 周辺焼け */}
      <rect width="1440" height="900" fill="url(#burn)" />

      {/* 緯度・経度グリッド */}
      {[150, 300, 450, 600, 750].map(y => (
        <line key={`h${y}`} x1="0" y1={y} x2="1440" y2={y} stroke="#8b5e2a" strokeWidth="0.4" opacity="0.12" />
      ))}
      {[180, 360, 540, 720, 900, 1080, 1260].map(x => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="900" stroke="#8b5e2a" strokeWidth="0.4" opacity="0.12" />
      ))}

      {/* 破線の航路 */}
      <path d="M60 820 Q280 680 460 560 Q660 440 880 370 Q1100 300 1380 190"
        fill="none" stroke="#b8892a" strokeWidth="1.8" strokeDasharray="7 11" opacity="0.22" />
      <path d="M120 180 Q380 340 580 470 Q790 600 1010 710 Q1200 790 1420 860"
        fill="none" stroke="#8b5e2a" strokeWidth="1.2" strokeDasharray="5 9" opacity="0.14" />

      {/* X マーク（宝の場所） */}
      {[[900, 375], [555, 488], [310, 635]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`} opacity={0.28}>
          <line x1="-9" y1="-9" x2="9" y2="9"   stroke="#cc3020" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="9"  y1="-9" x2="-9" y2="9"  stroke="#cc3020" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="0" cy="0" r="5" fill="none" stroke="#cc3020" strokeWidth="0.8" opacity="0.5" />
        </g>
      ))}

      {/* 島シルエット */}
      <ellipse cx="1310" cy="760" rx="65" ry="30" fill="#3a2010" opacity="0.25" />
      <ellipse cx="1325" cy="757" rx="36" ry="20" fill="#4a2c14" opacity="0.20" />
      <ellipse cx="130"  cy="155" rx="48" ry="22" fill="#3a2010" opacity="0.22" />
      <ellipse cx="148"  cy="153" rx="26" ry="14" fill="#4a2c14" opacity="0.18" />
      <ellipse cx="700"  cy="820" rx="38" ry="16" fill="#3a2010" opacity="0.16" />

      {/* 波線（海面） */}
      {[220, 380, 520, 670, 760].map((y, i) => (
        <path key={i} d={`M0 ${y} Q360 ${y-18} 720 ${y} Q1080 ${y+18} 1440 ${y}`}
          fill="none" stroke="#5a3518" strokeWidth="0.8" opacity="0.13" />
      ))}

      {/* 座標ラベル（地図っぽい文字） */}
      {['A','B','C','D','E','F','G'].map((l, i) => (
        <text key={l} x={180 * (i+1) - 10} y="16"
          fill="#8b5e2a" fontSize="9" fontFamily="serif" opacity="0.25" fontStyle="italic">{l}</text>
      ))}
      {['I','II','III','IV','V'].map((l, i) => (
        <text key={l} x="8" y={150 * (i+1) + 5}
          fill="#8b5e2a" fontSize="8" fontFamily="serif" opacity="0.22" fontStyle="italic">{l}</text>
      ))}

      {/* 旗竿（右上隅） */}
      <line x1="1400" y1="20" x2="1400" y2="110" stroke="#8b5e2a" strokeWidth="2" opacity="0.18" />
      <path d="M1400 22 L1438 40 L1400 58 Z" fill="#8b5e2a" opacity="0.14" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   海賊旗ドクロ
───────────────────────────────────────────── */
function SkullCross({ size = 56, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none">
      <ellipse cx="50" cy="42" rx="26" ry="24" fill="currentColor" opacity="0.95" />
      <circle cx="38" cy="40" r="7"   fill="#120b04" />
      <circle cx="62" cy="40" r="7"   fill="#120b04" />
      <ellipse cx="50" cy="52" rx="4" ry="3" fill="#120b04" opacity="0.5" />
      <rect x="38" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="47" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="56" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.9" />
      <line x1="10" y1="82" x2="90" y2="95" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.75" />
      <line x1="90" y1="82" x2="10" y2="95" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   ロープ区切り線
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   ナビゲーションカード
───────────────────────────────────────────── */
function NavCard({ onClick, color, icon: Icon, title, subtitle, badge, features }) {
  const palette = {
    red:   { b: '#5a1a10', bh: '#cc3020', glow: 'rgba(180,40,20,0.28)', badge: '#cc4030', badgeBg: 'rgba(180,40,20,0.14)', pin: '#cc3020', ic: 'text-red-400' },
    green: { b: '#1a3a18', bh: '#4a8a40', glow: 'rgba(60,140,50,0.22)', badge: '#4a9a40', badgeBg: 'rgba(50,120,40,0.14)', pin: '#4a8a40', ic: 'text-green-500' },
    blue:  { b: '#1a2a4a', bh: '#4060b0', glow: 'rgba(50,80,180,0.22)', badge: '#4070c0', badgeBg: 'rgba(40,70,170,0.14)', pin: '#4060b0', ic: 'text-blue-400' },
  };
  const p = palette[color];

  return (
    <button onClick={onClick}
      className="group relative flex-1 min-w-[200px] flex flex-col items-center gap-4 p-7 rounded-xl transition-all duration-300 cursor-pointer focus:outline-none"
      style={{
        background: 'linear-gradient(155deg, #261608 0%, #1a0e05 60%, #100802 100%)',
        border: `1px solid ${p.b}`,
        boxShadow: `0 6px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(184,137,42,0.08)`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = `1px solid ${p.bh}`;
        e.currentTarget.style.boxShadow = `0 14px 42px ${p.glow}, 0 0 0 1px ${p.bh}44, inset 0 1px 0 rgba(184,137,42,0.14)`;
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = `1px solid ${p.b}`;
        e.currentTarget.style.boxShadow = `0 6px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(184,137,42,0.08)`;
        e.currentTarget.style.transform = '';
      }}
    >
      {/* 地図ピン */}
      <div className="absolute -top-3 right-7 flex flex-col items-center">
        <div className="w-4 h-4 rounded-full border-2 transition-transform group-hover:scale-125 duration-300"
          style={{ background: p.pin, borderColor: p.bh, boxShadow: `0 0 8px ${p.glow}` }} />
        <div className="w-0.5 h-3 rounded-b-full" style={{ background: p.pin, opacity: 0.65 }} />
      </div>

      {/* アイコン：羅針盤風フレーム */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-xl"
          style={{ background: `radial-gradient(circle, ${p.glow}, transparent)`, transform: 'scale(1.7)' }} />
        <div className="w-16 h-16 rounded-full flex items-center justify-center relative"
          style={{
            background: 'radial-gradient(circle, #2a1808 0%, #120b02 100%)',
            border: `1.5px solid ${p.b}`,
            boxShadow: `inset 0 1px 0 rgba(184,137,42,0.10)`,
          }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64" fill="none" opacity="0.45">
            <circle cx="32" cy="32" r="30" stroke="#b8892a" strokeWidth="0.7" strokeDasharray="2 5" />
            {[0,90,180,270].map(d => {
              const r = d * Math.PI / 180;
              return <line key={d} x1={32+10*Math.sin(r)} y1={32-10*Math.cos(r)} x2={32+29*Math.sin(r)} y2={32-29*Math.cos(r)} stroke="#b8892a" strokeWidth="0.9" />;
            })}
          </svg>
          <Icon size={26} className={`${p.ic} relative z-10 transition-transform group-hover:scale-110 duration-300`} />
        </div>
      </div>

      {/* テキスト */}
      <div className="text-center flex-1 w-full">
        <div className="font-black text-lg mb-1 tracking-wide"
          style={{ color: '#e8c870', textShadow: '0 1px 8px rgba(184,137,42,0.28)' }}>
          {title}
        </div>
        <RopeDivider className="my-2" />
        <div className="text-sm leading-relaxed" style={{ color: 'rgba(210,170,100,0.55)' }}>
          {subtitle}
        </div>
      </div>

      {/* 機能タグ */}
      {features?.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center w-full">
          {features.map(f => (
            <span key={f} className="text-[9px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'rgba(184,137,42,0.07)', border: '1px solid rgba(184,137,42,0.18)', color: 'rgba(210,170,80,0.55)' }}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* バッジ + 矢印 */}
      <div className="flex items-center justify-between w-full">
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full tracking-widest uppercase"
          style={{ color: p.badge, background: p.badgeBg, border: `1px solid ${p.badge}44` }}>
          {badge}
        </span>
        <ChevronRight size={14} className="transition-all group-hover:translate-x-1"
          style={{ color: `${p.badge}99` }} />
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   メインページ
───────────────────────────────────────────── */
export default function HomePage({ onNavigate }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at 50% 25%, #241408 0%, #160d04 55%, #0c0602 100%)' }}>

      {/* ── 地図レイヤー ── */}
      <TreasureMap />

      {/* ── コンパスローズ（左下） ── */}
      <div style={{ position: 'fixed', bottom: -50, left: -50, zIndex: 0, pointerEvents: 'none' }}>
        <CompassRose size={340} opacity={0.20} />
      </div>
      {/* ── コンパスローズ（右上・小） ── */}
      <div style={{ position: 'fixed', top: -30, right: -30, zIndex: 0, pointerEvents: 'none' }}>
        <CompassRose size={200} opacity={0.12} />
      </div>

      {/* ── ビネット ── */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(8,3,0,0.7) 100%)' }} />

      {/* ── 上下ライン ── */}
      <div className="fixed top-0 left-0 right-0 h-px pointer-events-none z-0"
        style={{ background: 'linear-gradient(90deg, transparent, #b8892a55, transparent)' }} />
      <div className="fixed bottom-0 left-0 right-0 h-px pointer-events-none z-0"
        style={{ background: 'linear-gradient(90deg, transparent, #b8892a30, transparent)' }} />

      {/* ── 四隅の錨 ── */}
      <div className="fixed top-5 left-5 pointer-events-none z-0 opacity-[0.09]">
        <Anchor size={64} style={{ color: '#b8892a' }} />
      </div>
      <div className="fixed top-5 right-5 pointer-events-none z-0 opacity-[0.09] -scale-x-100">
        <Anchor size={64} style={{ color: '#b8892a' }} />
      </div>
      <div className="fixed bottom-5 left-5 pointer-events-none z-0 opacity-[0.06] rotate-180">
        <Anchor size={52} style={{ color: '#b8892a' }} />
      </div>
      <div className="fixed bottom-5 right-5 pointer-events-none z-0 opacity-[0.06] -rotate-90">
        <Anchor size={52} style={{ color: '#b8892a' }} />
      </div>

      {/* ═══════════════════════════════════════
          タイトルブロック
      ═══════════════════════════════════════ */}
      <div className="relative z-10 text-center mb-10">

        {/* ドクロバナー */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <div className="h-px w-20 opacity-45" style={{ background: 'linear-gradient(90deg, transparent, #b8892a)' }} />
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-35"
              style={{ background: 'radial-gradient(circle, #b8892a50, transparent)' }} />
            <SkullCross size={68} className="relative z-10"
              style={{ color: '#c9a035', filter: 'drop-shadow(0 0 14px rgba(184,137,42,0.5))' }} />
          </div>
          <div className="h-px w-20 opacity-45" style={{ background: 'linear-gradient(90deg, #b8892a, transparent)' }} />
        </div>

        {/* メインタイトル */}
        <div className="relative inline-block">
          <div className="absolute inset-0 blur-3xl opacity-25 scale-110"
            style={{ background: 'radial-gradient(ellipse, #c9a02750, transparent)' }} />
          <h1 className="relative font-black tracking-tight leading-none"
            style={{
              fontSize: 'clamp(2.6rem, 8vw, 4.5rem)',
              background: 'linear-gradient(180deg, #fdf0c0 0%, #e8c060 25%, #c9a035 60%, #7a5a10 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 2px 10px rgba(184,137,42,0.4))',
            }}>
            ONE PIECE
          </h1>
        </div>

        {/* サブタイトルライン */}
        <div className="flex items-center justify-center gap-3 mt-3 mb-1">
          <RopeDivider className="w-28" />
          <span className="whitespace-nowrap font-bold"
            style={{ color: 'rgba(184,137,42,0.75)', fontSize: '11px', letterSpacing: '0.45em', textTransform: 'uppercase' }}>
            Card Game
          </span>
          <RopeDivider className="w-28" />
        </div>

        {/* スタンプ風バッジ */}
        <div className="flex items-center justify-center mt-3">
          <div className="px-5 py-1.5 rounded"
            style={{
              border: '1.5px solid rgba(184,137,42,0.38)',
              background: 'rgba(184,137,42,0.05)',
              color: 'rgba(210,170,80,0.50)',
              fontSize: '10px',
              letterSpacing: '0.28em',
              fontWeight: 700,
              fontFamily: 'Georgia, serif',
            }}>
            ⚓ TRAINING &amp; DECK BUILDER TOOL ⚓
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          メニューカード
      ═══════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full max-w-3xl xl:max-w-4xl flex-wrap justify-center">
        <NavCard
          onClick={() => onNavigate('solo-play')}
          color="red"
          icon={Swords}
          title="一人回し"
          subtitle="デッキの動きを確認・練習。先行/後攻、マリガン、ドロー、サーチ効果など完全サポート。"
          badge="SOLO PLAY"
          features={['先行/後攻', 'マリガン', 'サーチ効果', 'DON!!管理']}
        />
        <NavCard
          onClick={() => onNavigate('battle')}
          color="green"
          icon={Bot}
          title="CPU対戦"
          subtitle="ルールベースAIと実戦対決。ライフトリガー・ブロッカー・フェーズ進行など本格ルール対応。"
          badge="CPU BATTLE"
          features={['ライフトリガー', 'ブロッカー', 'AI対戦', '自動効果']}
        />
        <NavCard
          onClick={() => onNavigate('pvp-room')}
          color="red"
          icon={Users}
          title="人対人 対戦"
          subtitle="ルームコードで友達と対戦。フェーズ進行・アタック・ブロックをリアルタイムで同期。"
          badge="PvP BATTLE"
          features={['ルームコード', 'リアルタイム', 'JWT認証', 'フェーズ同期']}
        />
        <NavCard
          onClick={() => onNavigate('deck-builder')}
          color="blue"
          icon={Layers}
          title="デッキ構築"
          subtitle="カード検索・フィルタリングでデッキを組み立て。優勝デッキや大会統計も確認できます。"
          badge="DECK BUILDER"
          features={['カード検索', '優勝デッキ', '大会統計', 'エクスポート']}
        />
      </div>

      {/* 免責事項 */}
      <p className="relative z-10 mt-10 text-center tracking-widest font-medium"
        style={{ color: 'rgba(120,80,30,0.40)', fontSize: '10px', fontFamily: 'Georgia, serif' }}>
        ─ 非公式ファンツール — ONE PIECEカードゲーム公式とは無関係です ─
      </p>
    </div>
  );
}
