// デッキ構築ページ — 既存 App.jsx をそのまま包む薄いラッパー
import App from '../App.jsx';

export default function DeckBuilderPage({ onNavigate }) {
  return <App onNavigate={onNavigate} />;
}
