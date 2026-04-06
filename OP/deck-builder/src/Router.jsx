import { useState } from 'react';
import HomePage    from './pages/HomePage';
import DeckBuilderPage from './pages/DeckBuilderPage';
import SoloPlayPage from './pages/SoloPlayPage';

export default function Router() {
  const [page, setPage] = useState('home'); // 'home' | 'deck-builder' | 'solo-play'

  if (page === 'home')         return <HomePage    onNavigate={setPage} />;
  if (page === 'deck-builder') return <DeckBuilderPage onNavigate={setPage} />;
  if (page === 'solo-play')    return <SoloPlayPage   onNavigate={setPage} />;
  return null;
}
