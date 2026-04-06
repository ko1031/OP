import { useState } from 'react';
import HomePage       from './pages/HomePage';
import DeckBuilderPage from './pages/DeckBuilderPage';
import SoloPlayPage   from './pages/SoloPlayPage';
import BattlePage     from './pages/BattlePage';

export default function Router() {
  const [page, setPage] = useState('home'); // 'home' | 'deck-builder' | 'solo-play' | 'battle'

  if (page === 'home')         return <HomePage        onNavigate={setPage} />;
  if (page === 'deck-builder') return <DeckBuilderPage onNavigate={setPage} />;
  if (page === 'solo-play')    return <SoloPlayPage    onNavigate={setPage} />;
  if (page === 'battle')       return <BattlePage      onNavigate={setPage} />;
  return null;
}
