import { Layers, Swords, Anchor, ChevronRight } from 'lucide-react';
import PirateMapBg from '../components/PirateMapBg';

// 海賊旗SVG
function SkullCross({ size = 40, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none">
      <ellipse cx="50" cy="42" rx="26" ry="24" fill="currentColor" opacity="0.9" />
      <circle cx="38" cy="40" r="7" fill="#06091a" />
      <circle cx="62" cy="40" r="7" fill="#06091a" />
      <ellipse cx="50" cy="52" rx="4" ry="3" fill="#06091a" opacity="0.5" />
      <rect x="38" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="47" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="56" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.8" />
      <line x1="10" y1="82" x2="90" y2="95" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.7" />
      <line x1="90" y1="82" x2="10" y2="95" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

// ナビカード
function NavCard({ onClick, color, icon: Icon, iconBg, title, subtitle, badge, features }) {
  const borderColor  = color === 'red'  ? 'rgba(220,60,60,0.25)'  : 'rgba(60,100,220,0.25)';
  const borderHover  = color === 'red'  ? 'rgba(220,60,60,0.65)'  : 'rgba(60,100,220,0.65)';
  const glowColor    = color === 'red'  ? 'rgba(180,40,0,0.18)'   : 'rgba(0,40,200,0.18)';
  const badgeColor   = color === 'red'  ? '#ef4444'               : '#3b82f6';
  const badgeBorder  = color === 'red'  ? 'rgba(220,60,60,0.35)'  : 'rgba(60,100,220,0.35)';

  return (
    <button
      onClick={onClick}
      aria-label={title}
      className="group flex-1 flex flex-col items-center gap-5 p-8 rounded-2xl transition-all duration-300 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      style={{
        background: 'linear-gradient(145deg, #0d1530cc, #06091acc)',
        border: `1px solid ${borderColor}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,160,50,0.06)`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = `1px solid ${borderHover}`;
        e.currentTarget.style.boxShadow = `0 16px 48px ${glowColor}, inset 0 1px 0 rgba(200,160,50,0.10)`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = `1px solid ${borderColor}`;
        e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,160,50,0.06)`;
        e.currentTarget.style.transform = '';
      }}
    >
      {/* アイコン */}
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 flex-shrink-0"
        style={{ background: iconBg.bg, border: `1px solid ${iconBg.border}` }}>
        <Icon size={30} className={iconBg.iconClass} />
      </div>

      {/* テキスト */}
      <div className="text-center flex-1">
        <div className="font-black text-xl mb-2 leading-tight" style={{ color: '#f5d78e' }}>
          {title}
        </div>
        <div className="text-amber-300/70 text-sm leading-relaxed">
          {subtitle}
        </div>
      </div>

      {/* 機能タグ一覧 */}
      {features && features.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {features.map(f => (
            <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-amber-400/60">
              {f}
            </span>
          ))}
        </div>
      )}

      {/* バッジ + 矢印 */}
      <div className="flex items-center justify-between w-full mt-1">
        <span className="text-[10px] font-bold px-3 py-0.5 rounded-full"
          style={{ color: badgeColor, border: `1px solid ${badgeBorder}`, background: `${badgeColor}18` }}>
          {badge}
        </span>
        <ChevronRight size={14} className="text-amber-800/40 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

export default function HomePage({ onNavigate }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0f1a3a 0%, #06091a 50%, #06091a 100%)' }}>

      {/* 海賊地図背景 */}
      <PirateMapBg />

      {/* デコレーティブ水平線 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-[-10%] w-[120%] h-px opacity-10"
          style={{ background: 'linear-gradient(90deg, transparent, #c9a227, transparent)' }} />
        <div className="absolute top-1/3 left-[-10%] w-[120%] h-px opacity-5"
          style={{ background: 'linear-gradient(90deg, transparent, #c9a227, transparent)' }} />
        <div className="absolute bottom-1/3 left-[-10%] w-[120%] h-px opacity-10"
          style={{ background: 'linear-gradient(90deg, transparent, #c9a227, transparent)' }} />
        {/* コーナーの錨 */}
        <div className="absolute top-6 left-6 opacity-[0.05]">
          <Anchor size={80} className="text-amber-400" />
        </div>
        <div className="absolute bottom-6 right-6 opacity-[0.05] rotate-180">
          <Anchor size={80} className="text-amber-400" />
        </div>
        {/* 光のグロウ */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #c9a22740 0%, transparent 70%)' }} />
      </div>

      {/* ─── タイトルブロック ─── */}
      <div className="relative text-center mb-10">
        <div className="flex justify-center mb-5">
          <SkullCross size={60} className="text-amber-500/70" />
        </div>

        <h1 className="font-black tracking-tight mb-3 leading-none"
          style={{
            fontSize: 'clamp(2.25rem, 7vw, 4rem)',
            background: 'linear-gradient(180deg, #f5d78e 0%, #c9a227 55%, #8b6914 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
          ONE PIECE
        </h1>

        {/* 区切り線 + サブタイトル */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px flex-1 max-w-[100px]"
            style={{ background: 'linear-gradient(90deg, transparent, #c9a22770)' }} />
          <span className="text-amber-500/90 text-xs tracking-[0.35em] uppercase font-bold">
            Card Game
          </span>
          <div className="h-px flex-1 max-w-[100px]"
            style={{ background: 'linear-gradient(90deg, #c9a22770, transparent)' }} />
        </div>

        <p className="text-amber-600/55 text-[11px] tracking-[0.25em] uppercase font-medium">
          Training &amp; Deck Builder Tool
        </p>
      </div>

      {/* ─── メニューカード ─── */}
      <div className="relative flex flex-col sm:flex-row gap-5 w-full max-w-xl">

        <NavCard
          onClick={() => onNavigate('solo-play')}
          color="red"
          icon={Swords}
          iconBg={{
            bg: 'radial-gradient(circle, #7f1d1d55, #3b0f0f35)',
            border: 'rgba(220,60,60,0.3)',
            iconClass: 'text-red-400 group-hover:text-red-300 transition-colors',
          }}
          title="一人回し"
          subtitle="デッキの動きを確認・練習。先行/後攻選択、マリガン、ドロー、サーチ効果など完全サポート。"
          badge="SOLO PLAY"
          features={['先行/後攻', 'マリガン', 'サーチ効果', 'DON!!管理']}
        />

        <NavCard
          onClick={() => onNavigate('deck-builder')}
          color="blue"
          icon={Layers}
          iconBg={{
            bg: 'radial-gradient(circle, #1e3a8a55, #0f1f5035)',
            border: 'rgba(60,100,220,0.3)',
            iconClass: 'text-blue-400 group-hover:text-blue-300 transition-colors',
          }}
          title="デッキ構築"
          subtitle="カード検索・フィルタリングでデッキを組み立て。優勝デッキや大会統計も確認できます。"
          badge="DECK BUILDER"
          features={['カード検索', '優勝デッキ', '大会統計', 'エクスポート']}
        />
      </div>

      {/* 免責事項 */}
      <p className="relative text-amber-900/35 text-[10px] mt-10 text-center tracking-wide">
        ⚓ 非公式ファンツール — ONE PIECEカードゲーム公式とは無関係です
      </p>
    </div>
  );
}
