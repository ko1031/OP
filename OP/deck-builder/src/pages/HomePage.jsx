import { Layers, Swords } from 'lucide-react';

export default function HomePage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* 背景装飾 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl" />
      </div>

      {/* タイトル */}
      <div className="relative text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
          ONE PIECE
          <span className="text-red-400 ml-2">カード</span>
        </h1>
        <p className="text-gray-500 text-sm tracking-widest uppercase">Training Tool</p>
      </div>

      {/* メニューカード */}
      <div className="relative flex flex-col sm:flex-row gap-5 w-full max-w-lg">

        {/* 一人回し */}
        <button
          onClick={() => onNavigate('solo-play')}
          className="group flex-1 flex flex-col items-center gap-4 p-8 rounded-2xl border border-gray-700/80 bg-gray-900/80 hover:bg-gray-800/90 hover:border-red-600/60 transition-all duration-200 shadow-xl hover:shadow-red-900/20 hover:shadow-2xl cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-900/30 border border-red-700/40 flex items-center justify-center group-hover:bg-red-800/40 group-hover:border-red-500/60 transition-all">
            <Swords size={32} className="text-red-400 group-hover:text-red-300" />
          </div>
          <div className="text-center">
            <div className="text-white font-bold text-lg group-hover:text-red-200 transition-colors">
              一人回し
            </div>
            <div className="text-gray-500 text-xs mt-1 leading-relaxed">
              デッキを回して動きを確認<br />マリガン機能搭載
            </div>
          </div>
          <div className="text-xs text-red-700/80 border border-red-900/40 rounded-full px-3 py-0.5 group-hover:text-red-400 group-hover:border-red-700/60 transition-colors">
            SOLO PLAY
          </div>
        </button>

        {/* デッキ構築 */}
        <button
          onClick={() => onNavigate('deck-builder')}
          className="group flex-1 flex flex-col items-center gap-4 p-8 rounded-2xl border border-gray-700/80 bg-gray-900/80 hover:bg-gray-800/90 hover:border-blue-600/60 transition-all duration-200 shadow-xl hover:shadow-blue-900/20 hover:shadow-2xl cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-900/30 border border-blue-700/40 flex items-center justify-center group-hover:bg-blue-800/40 group-hover:border-blue-500/60 transition-all">
            <Layers size={32} className="text-blue-400 group-hover:text-blue-300" />
          </div>
          <div className="text-center">
            <div className="text-white font-bold text-lg group-hover:text-blue-200 transition-colors">
              デッキ構築
            </div>
            <div className="text-gray-500 text-xs mt-1 leading-relaxed">
              カード検索 &amp; デッキ編集<br />優勝デッキ・大会統計も確認
            </div>
          </div>
          <div className="text-xs text-blue-700/80 border border-blue-900/40 rounded-full px-3 py-0.5 group-hover:text-blue-400 group-hover:border-blue-700/60 transition-colors">
            DECK BUILDER
          </div>
        </button>
      </div>

      <p className="relative text-gray-700 text-xs mt-10">
        ※ 非公式ツールです。ONE PIECEカードゲーム公式とは無関係です。
      </p>
    </div>
  );
}
