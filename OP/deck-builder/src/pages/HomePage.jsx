import { Layers, Swords, Anchor } from 'lucide-react';
import PirateMapBg from '../components/PirateMapBg';

// 海賊旗SVG
function SkullCross({ size = 40, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none">
      {/* 頭蓋骨 */}
      <ellipse cx="50" cy="42" rx="26" ry="24" fill="currentColor" opacity="0.9" />
      <circle cx="38" cy="40" r="7" fill="#06091a" />
      <circle cx="62" cy="40" r="7" fill="#06091a" />
      {/* 鼻 */}
      <ellipse cx="50" cy="52" rx="4" ry="3" fill="#06091a" opacity="0.5" />
      {/* 歯 */}
      <rect x="38" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="47" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="56" y="60" width="6" height="9" rx="2" fill="currentColor" opacity="0.8" />
      {/* 骨（×）*/}
      <line x1="10" y1="82" x2="90" y2="95" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.7" />
      <line x1="90" y1="82" x2="10" y2="95" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export default function HomePage({ onNavigate }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0f1a3a 0%, #06091a 50%, #06091a 100%)' }}>

      {/* 海賊地図背景 */}
      <PirateMapBg />

      {/* 背景: 波紋 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-[-10%] w-[120%] h-px opacity-10"
          style={{ background: 'linear-gradient(90deg, transparent, #c9a227, transparent)' }} />
        <div className="absolute top-1/3 left-[-10%] w-[120%] h-px opacity-5"
          style={{ background: 'linear-gradient(90deg, transparent, #c9a227, transparent)' }} />
        <div className="absolute bottom-1/3 left-[-10%] w-[120%] h-px opacity-10"
          style={{ background: 'linear-gradient(90deg, transparent, #c9a227, transparent)' }} />
        {/* コーナーの錨 */}
        <div className="absolute top-6 left-6 opacity-[0.04]">
          <Anchor size={80} className="text-amber-400" />
        </div>
        <div className="absolute bottom-6 right-6 opacity-[0.04] rotate-180">
          <Anchor size={80} className="text-amber-400" />
        </div>
        {/* 光のグロウ */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #c9a22740 0%, transparent 70%)' }} />
      </div>

      {/* タイトル */}
      <div className="relative text-center mb-12">
        <div className="flex justify-center mb-4">
          <SkullCross size={56} className="text-amber-500/60" />
        </div>
        <h1 className="font-black tracking-tight mb-2 leading-none"
          style={{
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            background: 'linear-gradient(180deg, #f5d78e 0%, #c9a227 50%, #8b6914 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
          }}>
          ONE PIECE
        </h1>
        <div className="flex items-center justify-center gap-3 my-1">
          <div className="h-px flex-1 max-w-[80px]" style={{ background: 'linear-gradient(90deg, transparent, #c9a22760)' }} />
          <span className="text-amber-600/80 text-xs tracking-[0.3em] uppercase font-bold">Card Game</span>
          <div className="h-px flex-1 max-w-[80px]" style={{ background: 'linear-gradient(90deg, #c9a22760, transparent)' }} />
        </div>
        <p className="text-amber-700/50 text-xs tracking-widest uppercase">Training Tool</p>
      </div>

      {/* メニュー */}
      <div className="relative flex flex-col sm:flex-row gap-5 w-full max-w-lg">

        {/* 一人回し */}
        <button
          onClick={() => onNavigate('solo-play')}
          className="group flex-1 flex flex-col items-center gap-4 p-8 rounded-2xl transition-all duration-300 cursor-pointer"
          style={{
            background: 'linear-gradient(145deg, #0d1530cc, #06091acc)',
            border: '1px solid rgba(200, 130, 30, 0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,160,50,0.08)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.border = '1px solid rgba(200, 130, 30, 0.6)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(180, 80, 0, 0.2), inset 0 1px 0 rgba(200,160,50,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.border = '1px solid rgba(200, 130, 30, 0.25)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,160,50,0.08)';
          }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all"
            style={{ background: 'radial-gradient(circle, #7f1d1d60, #3b0f0f40)', border: '1px solid rgba(220, 60, 60, 0.3)' }}>
            <Swords size={30} className="text-red-400 group-hover:text-red-300 transition-colors" />
          </div>
          <div className="text-center">
            <div className="font-black text-lg mb-1 transition-colors"
              style={{ color: '#f5d78e' }}>
              一人回し
            </div>
            <div className="text-amber-700/60 text-xs leading-relaxed">
              デッキの動きを確認<br />先行/後攻・マリガン搭載
            </div>
          </div>
          <div className="text-[10px] font-bold px-3 py-0.5 rounded-full"
            style={{ color: '#c9a227', border: '1px solid rgba(200, 130, 30, 0.3)' }}>
            SOLO PLAY
          </div>
        </button>

        {/* デッキ構築 */}
        <button
          onClick={() => onNavigate('deck-builder')}
          className="group flex-1 flex flex-col items-center gap-4 p-8 rounded-2xl transition-all duration-300 cursor-pointer"
          style={{
            background: 'linear-gradient(145deg, #0d1530cc, #06091acc)',
            border: '1px solid rgba(60, 100, 200, 0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(60,100,200,0.08)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.border = '1px solid rgba(60, 100, 200, 0.6)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 40, 180, 0.2), inset 0 1px 0 rgba(60,100,200,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.border = '1px solid rgba(60, 100, 200, 0.25)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(60,100,200,0.08)';
          }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all"
            style={{ background: 'radial-gradient(circle, #1e3a8a60, #0f1f5040)', border: '1px solid rgba(60, 100, 200, 0.3)' }}>
            <Layers size={30} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
          </div>
          <div className="text-center">
            <div className="font-black text-lg mb-1 transition-colors text-blue-200 group-hover:text-blue-100">
              デッキ構築
            </div>
            <div className="text-blue-900/80 text-xs leading-relaxed">
              カード検索 &amp; デッキ編集<br />優勝デッキ・大会統計を確認
            </div>
          </div>
          <div className="text-[10px] font-bold px-3 py-0.5 rounded-full text-blue-500"
            style={{ border: '1px solid rgba(60, 100, 200, 0.3)' }}>
            DECK BUILDER
          </div>
        </button>
      </div>

      <p className="relative text-amber-900/30 text-xs mt-10 text-center">
        ⚓ 非公式ツール — ONE PIECEカードゲーム公式とは無関係です
      </p>
    </div>
  );
}
