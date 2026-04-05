import { useState } from 'react';

const OFFICIAL_BASE = 'https://www.onepiece-cardgame.com/images/cardlist/card';
const PROXY_BASE    = '/card-img';
const FALLBACK_PROXY = '/card-img/cardback.png';

/**
 * 公式画像URLをViteプロキシ経由のURLに変換する
 * 例: https://www.onepiece-cardgame.com/images/cardlist/card/ST01-001.png?xxx
 *  → /card-img/ST01-001.png?xxx
 */
function toProxyUrl(imageUrl) {
  if (!imageUrl) return FALLBACK_PROXY;
  return imageUrl.replace(OFFICIAL_BASE, PROXY_BASE);
}

export default function CardImage({ card, className = '', style = {} }) {
  const initial = toProxyUrl(card?.image_url);
  const [src, setSrc] = useState(initial);
  const [errored, setErrored] = useState(false);

  const handleError = () => {
    if (!errored) {
      setErrored(true);
      setSrc(FALLBACK_PROXY);
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
