import { Layers, Swords, Anchor, ChevronRight, Bot } from 'lucide-react';

/* ─────────────────────────────────────────────
   コンパスローズ SVG
───────────────────────────────────────────── */
function CompassRose({ size = 320, opacity = 0.13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" fill="none"
      style={{ opacity, position: 'absolute', pointerEvents: 'none' }}>
      {/* 外円 */}
      <circle cx="160" cy="160" r="150" stroke="#c9a227" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />
      <circle cx="160" cy="160" r="120" stroke="#c9a227" strokeWidth="0.6" opacity="0.3" />
      <circle cx="160" cy="160" r="90"  stroke="#c9a227" strokeWidth="0.6" opacity="0.3" />
      {/* 方位線 8本 */}
      {[0,45,90,135,180,225,270,315].map(deg => {
        const r = deg * Math.PI / 180;
        const x1 = 160 + 25 * Math.sin(r), y1 = 160 - 25 * Math.cos(r);
        const x2 = 160 + 150 * Math.sin(r), y2 = 160 - 150 * Math.cos(r);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9a227" strokeWidth={deg % 90 === 0 ? 1 : 0.5} opacity={0.7} />;
      })}
      {/* 北 矢印 */}
      <polygon points="160,10 154,50 160,42 166,50" fill="#e53e3e" opacity="0.85" />
      {/* 南 矢印 */}
      <polygon points="160,310 154,270 160,278 166,270" fill="#c9a227" opacity="0.7" />
      {/* 東 矢印 */}
      <polygon points="310,160 270,154 278,160 270,166" fill="#c9a227" opacity="0.7" />
      {/* 西 矢印 */}
      <polygon points="10,160 50,154 42,160 50,166" fill="#c9a227" opacity="0.7" />
      {/* 中心 */}
      <circle cx="160" cy="160" r="12" fill="#0a1228" stroke="#c9a227" strokeWidth="1.5" opacity="0.9" />
      <circle cx="160" cy="160" r="4" fill="#c9a227" opacity="0.9" />
      {/* N/S/E/W ラベル */}
      <text x="155" y="7"   fill="#e53e3e" fontSize="13" fontWeight="bold" fontFamily="serif" opacity="0.9">N</text>
      <text x="155" y="318" fill="#c9a227" fontSize="11" fontFamily="serif" opacity="0.7">S</text>
      <text x="303" y="165" fill="#c9a227" fontSize="11" fontFamily="serif" opacity="0.7">E</text>
      <text x="4"   y="165" fill="#c9a227" fontSize="11" fontFamily="serif" opacity="0.7">W</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   ルート線（ドット航路）
───────────────────────────────────────────── */
function TreasurePath() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* 破線の航路 */}
      <path d="M80 800 Q300 650 500 550 Q700 450 900 380 Q1100 310 1360 200"
        fill="none" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="6 10" opacity="0.18" />
      <path d="M100 200 Q400 350 600 480 Q800 600 1000 700 Q1200 780 1400 850"
        fill="none" stroke="#c9a227" strokeWidth="1" strokeDasharray="4 8" opacity="0.10" />
      {/* X マーク */}
      {[[920, 380], [560, 490], [320, 630]].map(([x, y], i) => (
        <g key={i} opacity={0.22} transform={`translate(${x},${y})`}>
          <line x1="-8" y1="-8" x2="8" y2="8" stroke="#e53e3e" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="8" y1="-8" x2="-8" y2="8" stroke="#e53e3e" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      ))}
      {/* 緯度・経度グリッド */}
      {[180, 300, 420, 540, 660].map(y => (
        <line key={y} x1="0" y1={y} x2="1440" y2={y} stroke="#c9a227" strokeWidth="0.3" opacity="0.08" />
      ))}
      {[240, 480, 720, 960, 1200].map(x => (
        <line key={x} x1={x} y1="0" x2={x} y2="900" stroke="#c9a227" strokeWidth="0.3" opacity="0.08" />
      ))}
      {/* 島のシルエット */}
      <ellipse cx="1300" cy="750" rx="55" ry="28" fill="#1a3a6a" opacity="0.18" />
      <ellipse cx="1320" cy="748" rx="30" ry="18" fill="#243c6e" opacity="0.15" />
      <ellipse cx="140"  cy="160" rx="40" ry="20" fill="#1a3a6a" opacity="0.14" />
      <ellipse cx="155"  cy="158" rx="22" ry="13" fill="#243c6e" opacity="0.12" />
      {/* 海の波アニメーション的な曲線 */}
      {[200, 350, 500, 650, 750].map((y, i) => (
        <path key={i} d={`M0 ${y} Q360 ${y - 15} 720 ${y} Q1080 ${y + 15} 1440 ${y}`}
          fill="none" stroke="#1a3a7a" strokeWidth="0.7" opacity="0.12" />
      ))}
      {/* 海賊旗のシルエット（右上隅） */}
      <line x1="1380" y1="30" x2="1380" y2="120" stroke="#c9a227" strokeWidth="2" opacity="0.15" />
      <rect x="1380" y="30" width="44" height="32" fill="#c9a227" opacity="0.10" rx="2" />
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
      <circle cx="38" cy="40" r="7"   fill="#06091a" />
      <circle cx="62" cy="40" r="7"   fill="#06091a" />
      <ellipse cx="50" cy="52" rx="4" ry="3" fill="#06091a" opacity="0.5" />
      <rect x="38" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="47" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="56" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.9" />
      <line x1="10" y1="82" x2="90" y2="95" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.75" />
      <line x1="90" y1="82" x2="10" y2="95" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   装飾ロープ区切り線
───────────────────────────────────────────── */
function RopeDivider({ className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #8b6914aa)' }} />
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="6" stroke="#c9a227" strokeWidth="1.2" opacity="0.7" />
        <circle cx="9" cy="9" r="2.5" fill="#c9a227" opacity="0.7" />
      </svg>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #8b6914aa, transparent)' }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   ナビゲーションカード（地図マーカー風）
───────────────────────────────────────────── */
function NavCard({ onClick, color, icon: Icon, title, subtitle, badge, features, markerLabel }) {
  const palette = {
    red:   { border: '#7f1d1d', borderHov: '#ef4444', glow: 'rgba(220,38,38,0.25)', badge: '#ef4444', badgeBg: 'rgba(220,38,38,0.12)', pin: '#ef4444', iconColor: 'text-red-400' },
    green: { border: '#14532d', borderHov: '#22c55e', glow: 'rgba(34,197,94,0.25)',  badge: '#22c55e', badgeBg: 'rgba(34,197,94,0.12)',  pin: '#22c55e', iconColor: 'text-green-400' },
    blue:  { border: '#1e3a8a', borderHov: '#3b82f6', glow: 'rgba(59,130,246,0.25)', badge: '#3b82f6', badgeBg: 'rgba(59,130,246,0.12)', pin: '#3b82f6', iconColor: 'text-blue-400' },
  };
  const p = palette[color];

  return (
    <button onClick={onClick}
      className="group relative flex-1 min-w-[200px] flex flex-col items-center gap-4 p-7 rounded-2xl transition-all duration-300 cursor-pointer text-left focus:outline-none"
      style={{
        background: 'linear-gradient(155deg, #0d1b3e 0%, #080d20 60%, #04080f 100%)',
        border: `1px solid ${p.border}`,
        boxShadow: `0 6px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,162,39,0.07)`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = `1px solid ${p.borderHov}`;
        e.currentTarget.style.boxShadow = `0 12px 40px ${p.glow}, 0 0 0 1px ${p.borderHov}44, inset 0 1px 0 rgba(200,162,39,0.12)`;
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = `1px solid ${p.border}`;
        e.currentTarget.style.boxShadow = `0 6px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,162,39,0.07)`;
        e.currentTarget.style.transform = '';
      }}
    >
      {/* 地図ピン（右上コーナー） */}
      <div className="absolute -top-2.5 right-6 flex flex-col items-center gap-0" aria-hidden>
        <div className="w-4 h-4 rounded-full border-2 transition-transform group-hover:scale-125"
          style={{ background: p.pin, borderColor: p.borderHov, boxShadow: `0 0 8px ${p.glow}` }} />
        <div className="w-0.5 h-3 rounded-b-full" style={{ background: p.pin, opacity: 0.7 }} />
      </div>

      {/* アイコン（羅針盤風の円形フレーム） */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `radial-gradient(circle, ${p.glow} 0%, transparent 70%)`, transform: 'scale(1.6)' }} />
        <div className="w-16 h-16 rounded-full flex items-center justify-center relative"
          style={{
            background: 'radial-gradient(circle, #0f1f4a 0%, #060910 100%)',
            border: `1.5px solid ${p.border}`,
            boxShadow: `inset 0 1px 0 rgba(200,162,39,0.12)`,
          }}>
          {/* 方位リング */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64" fill="none" opacity="0.4">
            <circle cx="32" cy="32" r="30" stroke="#c9a227" strokeWidth="0.6" strokeDasharray="2 4" />
            {[0,90,180,270].map(d => {
              const r = d * Math.PI / 180;
              return <line key={d} x1={32+10*Math.sin(r)} y1={32-10*Math.cos(r)} x2={32+29*Math.sin(r)} y2={32-29*Math.cos(r)} stroke="#c9a227" strokeWidth="0.8" />;
            })}
          </svg>
          <Icon size={26} className={`${p.iconColor} relative z-10 transition-transform group-hover:scale-110 duration-300`} />
        </div>
      </div>

      {/* テキスト */}
      <div className="text-center flex-1 w-full">
        <div className="font-black text-lg mb-1 tracking-wide leading-tight"
          style={{ color: '#f5d78e', textShadow: '0 1px 8px rgba(197,159,39,0.3)' }}>
          {title}
        </div>
        <RopeDivider className="my-2" />
        <div className="text-amber-300/60 text-xs leading-relaxed">
          {subtitle}
        </div>
      </div>

      {/* 機能タグ */}
      {features?.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center w-full">
          {features.map(f => (
            <span key={f} className="text-[9px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,162,39,0.15)', color: 'rgba(245,215,142,0.5)' }}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* バッジ + 矢印 */}
      <div className="flex items-center justify-between w-full">
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full tracking-widest uppercase"
          style={{ color: p.badge, background: p.badgeBg, border: `1px solid ${p.badge}40` }}>
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
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #0d1e45 0%, #07091e 55%, #030610 100%)' }}>

      {/* ── 海賊地図の航路・島・グリッド ── */}
      <TreasurePath />

      {/* ── コンパスローズ（背景左下） ── */}
      <div style={{ position: 'fixed', bottom: -40, left: -40, zIndex: 0, pointerEvents: 'none' }}>
        <CompassRose size={320} opacity={0.16} />
      </div>
      {/* ── コンパスローズ（背景右上・小） ── */}
      <div style={{ position: 'fixed', top: -30, right: -30, zIndex: 0, pointerEvents: 'none' }}>
        <CompassRose size={200} opacity={0.10} />
      </div>

      {/* ── ビネット（周辺暗化） ── */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)' }} />

      {/* ── 上下のグロウライン ── */}
      <div className="fixed top-0 left-0 right-0 h-px pointer-events-none z-0"
        style={{ background: 'linear-gradient(90deg, transparent, #c9a22755, transparent)' }} />
      <div className="fixed bottom-0 left-0 right-0 h-px pointer-events-none z-0"
        style={{ background: 'linear-gradient(90deg, transparent, #c9a22730, transparent)' }} />

      {/* ── 錨（四隅の装飾） ── */}
      <div className="fixed top-5 left-5 pointer-events-none z-0 opacity-[0.07]">
        <Anchor size={64} className="text-amber-400" />
      </div>
      <div className="fixed top-5 right-5 pointer-events-none z-0 opacity-[0.07] -scale-x-100">
        <Anchor size={64} className="text-amber-400" />
      </div>
      <div className="fixed bottom-5 left-5 pointer-events-none z-0 opacity-[0.05] rotate-180">
        <Anchor size={52} className="text-amber-400" />
      </div>
      <div className="fixed bottom-5 right-5 pointer-events-none z-0 opacity-[0.05] -rotate-90">
        <Anchor size={52} className="text-amber-400" />
      </div>

      {/* ═══════════════════════════════════════
          タイトルブロック
      ═══════════════════════════════════════ */}
      <div className="relative z-10 text-center mb-10">

        {/* ドクロ＋旗のバナー */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <div className="h-px w-16 opacity-40" style={{ background: 'linear-gradient(90deg, transparent, #c9a227)' }} />
          <div className="relative">
            {/* 外周グロウ */}
            <div className="absolute inset-0 rounded-full blur-xl opacity-30"
              style={{ background: 'radial-gradient(circle, #c9a22760, transparent)' }} />
            <SkullCross size={64} className="text-amber-400 relative z-10 drop-shadow-[0_0_12px_rgba(201,162,39,0.5)]" />
          </div>
          <div className="h-px w-16 opacity-40" style={{ background: 'linear-gradient(90deg, #c9a227, transparent)' }} />
        </div>

        {/* メインタイトル */}
        <div className="relative inline-block">
          {/* スタンプ風のアンダーグロウ */}
          <div className="absolute inset-0 blur-2xl opacity-20 scale-110"
            style={{ background: 'linear-gradient(180deg, #c9a22740, transparent)' }} />
          <h1 className="relative font-black tracking-tight leading-none"
            style={{
              fontSize: 'clamp(2.6rem, 8vw, 4.5rem)',
              background: 'linear-gradient(180deg, #fffbeb 0%, #f5d78e 30%, #c9a227 65%, #7a5a0a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              filter: 'drop-shadow(0 2px 12px rgba(201,162,39,0.35))',
            }}>
            ONE PIECE
          </h1>
        </div>

        {/* サブタイトルライン */}
        <div className="flex items-center justify-center gap-3 mt-3 mb-1">
          <RopeDivider className="w-32" />
          <span className="text-amber-500/80 text-[11px] tracking-[0.45em] uppercase font-bold whitespace-nowrap">
            Card Game
          </span>
          <RopeDivider className="w-32" />
        </div>

        {/* スタンプ風バッジ */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className="px-4 py-1.5 rounded"
            style={{
              border: '1.5px solid rgba(201,162,39,0.45)',
              background: 'rgba(201,162,39,0.06)',
              color: 'rgba(245,215,142,0.55)',
              fontSize: '10px',
              letterSpacing: '0.3em',
              fontWeight: 700,
              fontFamily: 'serif',
            }}>
            ⚓ TRAINING &amp; DECK BUILDER TOOL ⚓
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          メニューカード
      ═══════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full max-w-2xl xl:max-w-3xl flex-wrap justify-center">
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
      <p className="relative z-10 text-amber-900/30 text-[10px] mt-10 text-center tracking-widest font-medium"
        style={{ fontFamily: 'serif' }}>
        ─ 非公式ファンツール — ONE PIECEカードゲーム公式とは無関係です ─
      </p>
    </div>
  );
}
