import { useState } from 'react';
import HomePage       from './pages/HomePage';
import DeckBuilderPage from './pages/DeckBuilderPage';
import SoloPlayPage   from './pages/SoloPlayPage';
import BattlePage     from './pages/BattlePage';
import PvPRoomPage    from './pages/PvPRoomPage';
import PvPBattlePage  from './pages/PvPBattlePage';

export default function Router() {
  const [page, setPage] = useState('home');
  // 'home' | 'deck-builder' | 'solo-play' | 'battle' | 'pvp-room' | 'pvp-battle'

  // PvP対戦設定（ルーム情報・デッキ等）を pvp-battle ページへ引き渡す
  const [pvpConfig, setPvpConfig] = useState(null);

  const handleNavigate = (dest) => setPage(dest);

  // PvPRoomPage から対戦開始時に呼ばれる
  const handleStartPvpBattle = (config) => {
    setPvpConfig(config);
    setPage('pvp-battle');
  };

  if (page === 'home')         return <HomePage        onNavigate={handleNavigate} />;
  if (page === 'deck-builder') return <DeckBuilderPage onNavigate={handleNavigate} />;
  if (page === 'solo-play')    return <SoloPlayPage    onNavigate={handleNavigate} />;
  if (page === 'battle')       return <BattlePage      onNavigate={handleNavigate} />;
  if (page === 'pvp-room')     return <PvPRoomPage     onNavigate={handleNavigate} onStartBattle={handleStartPvpBattle} />;
  if (page === 'pvp-battle')   return <PvPBattlePage   onNavigate={handleNavigate} battleConfig={pvpConfig} />;
  return null;
}
