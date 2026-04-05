import { useState } from 'react';

const OFFICIAL_BASE  = 'https://www.onepiece-cardgame.com/images/cardlist/card';
const PROXY_BASE     = '/card-img';
const FALLBACK_DIRECT = 'https://www.onepiece-cardgame.com/images/cardlist/cardback.png';
const FALLBACK_PROXY  = '/card-img/cardback.png';

// 開発中はViteプロキシ経由、本番（GitHub Pages等）は公式URLを直接参照
const isDev = import.meta.env.DEV;

function resolveUrl(imageUrl) {
  if (!imageUrl) return isDev ? FALLBACK_PROXY : FALLBACK_DIRECT;
  if (isDev) {
    // dev: プロキシ経由で Referer ヘッダーを付与
    return imageUrl.replace(OFFICIAL_BASE, PROXY_BASE);
  }
  // prod: 公式URLをそのまま使用。referrerpolicy="no-referrer" で送信元を隠す
  return imageUrl;
}

export default function CardImage({ card, className = '', style = {} }) {
  const [src, setSrc] = useState(() => resolveUrl(card?.image_url));
  const [errored, setErrored] = useState(false);

  const handleError = () => {
    if (!errored) {
      setErrored(true);
      setSrc(isDev ? FALLBACK_PROXY : FALLBACK_DIRECT);
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
      referrerPolicy="no-referrer"
    />
  );
}
