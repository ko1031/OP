/**
 * ONE PIECE カードゲーム デッキ構築ルール
 */

export const DECK_LIMIT = 50;
export const MAX_COPIES = 4;

/** カードをデッキに追加できるか検証 */
export function canAddCard(deck, card, leader) {
  if (card.card_type === 'LEADER') return { ok: false, reason: 'リーダーカードはデッキに入りません' };

  // デッキ枚数チェック
  const total = deck.reduce((sum, e) => sum + e.count, 0);
  if (total >= DECK_LIMIT) return { ok: false, reason: `デッキは${DECK_LIMIT}枚までです` };

  // 同一カード枚数チェック
  const existing = deck.find(e => e.card.card_number === card.card_number);
  if (existing && existing.count >= MAX_COPIES)
    return { ok: false, reason: `同じカードは${MAX_COPIES}枚までです` };

  // 色チェック（リーダーが選択済みの場合）
  if (leader) {
    const leaderColors = leader.colors || [];
    const cardColors = card.colors || [];
    const hasColor = cardColors.some(c => leaderColors.includes(c));
    if (!hasColor)
      return { ok: false, reason: `リーダーの色（${leaderColors.join('/')}）と一致しません` };
  }

  return { ok: true };
}

/** デッキ全体のバリデーション */
export function validateDeck(deck, leader) {
  const errors = [];
  const total = deck.reduce((sum, e) => sum + e.count, 0);

  if (!leader) errors.push('リーダーカードを選択してください');
  if (total !== DECK_LIMIT) errors.push(`デッキは${DECK_LIMIT}枚必要です（現在${total}枚）`);

  return errors;
}

/** デッキの合計枚数 */
export function deckTotal(deck) {
  return deck.reduce((sum, e) => sum + e.count, 0);
}

/** カードを色でグループ化して統計を返す */
export function deckStats(deck) {
  const colorCount = {};
  const typeCount = {};
  const costDistribution = {};

  deck.forEach(({ card, count }) => {
    (card.colors || []).forEach(c => { colorCount[c] = (colorCount[c] || 0) + count; });
    typeCount[card.card_type] = (typeCount[card.card_type] || 0) + count;
    const cost = card.cost ?? 0;
    costDistribution[cost] = (costDistribution[cost] || 0) + count;
  });

  return { colorCount, typeCount, costDistribution };
}
