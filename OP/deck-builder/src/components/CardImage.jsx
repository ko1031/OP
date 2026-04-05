import { useState } from 'react';

const OFFICIAL_BASE = 'https://www.onepiece-cardgame.com/images/cardlist/card';
const PROXY_BASE    = '/card-img';

// 開発中はViteプロキシ経由、本番（GitHub Pages）はビルド時にダウンロードしたローカル画像を使用
const isDev    = import.meta.env.DEV;
const BASE_URL = import.meta.env.BASE_URL; // dev: '/'  /  prod: '/OP/'

function resolveUrl(imageUrl) {
  if (isDev) {
    // dev: Viteプロキシ経由（Refererヘッダーを自動付与）
    if (!imageUrl) return `${PROXY_BASE}/cardback.png`;
    return imageUrl.replace(OFFICIAL_BASE, PROXY_BASE);
  }
  // prod: GitHub Actions でダウンロード済みのローカル画像を使用
  if (!imageUrl) return `${BASE_URL}images/cardback.png`;
  const filename = imageUrl.split('/').pop().split('?')[0];
  return `${BASE_URL}images/${filename}`;
}

export default function CardImage({ card, className = '', style = {} }) {
  const [src, setSrc] = useState(() => resolveUrl(card?.image_url));
  const [errored, setErrored] = useState(false);

  const handleError = () => {
    if (!errored) {
      setErrored(true);
      setSrc(isDev ? `${PROXY_BASE}/cardback.png` : `${BASE_URL}images/cardback.png`);
    }
  };

  return (
    <img
      src={src}
      alt={card?.name || 'カード'}
      className={className}
      style={style}
      onError={handleError}
      loading="lazy"
    />
  );
}
