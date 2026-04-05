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

/**
 * カードが【トリガー】能力を自身で持つか判定
 * （バニッシュ説明文や「〜を持つ」参照は除く）
 */
export function hasTrigger(card) {
  const effect = card.effect || '';
  const cleaned = effect.replace(
    /\(このカードがダメージを与えた場合、トリガーは発動せずそのカードはトラッシュに置かれる\)/g,
    ''
  );
  return /【トリガー】(?!.{0,6}(を持|が発動|を発動))/.test(cleaned);
}

/**
 * デッキ全体を評価してスコアとアドバイスを返す
 */
export function evaluateDeck(deck, leader) {
  const total = deck.reduce((s, e) => s + e.count, 0);
  if (total === 0) return null;

  // ── カウンター評価 ──
  let charCounterValue = 0;
  let charCounterCards = 0;
  let eventCounterCards = 0;
  let triggerCards = 0;

  deck.forEach(({ card, count }) => {
    if (card.card_type === 'CHARACTER' && card.counter) {
      charCounterValue += card.counter * count;
      charCounterCards += count;
    }
    if (card.card_type === 'EVENT' && card.effect?.includes('【カウンター】')) {
      eventCounterCards += count;
    }
    if (hasTrigger(card)) triggerCards += count;
  });

  const counterScore = Math.min(40,
    Math.round((charCounterValue / 1000) * 1.2 + eventCounterCards * 2)
  );

  // ── コスト曲線評価 ──
  let lowCost = 0, midCost = 0, highCost = 0;
  deck.forEach(({ card, count }) => {
    const c = card.cost ?? 0;
    if (c <= 3) lowCost += count;
    else if (c <= 6) midCost += count;
    else highCost += count;
  });
  const lowPct = total > 0 ? lowCost / total : 0;
  const costScore = Math.min(30, Math.round(
    lowPct >= 0.65 ? 30 :
    lowPct >= 0.55 ? 24 :
    lowPct >= 0.45 ? 18 :
    lowPct >= 0.35 ? 12 : 6
  ));

  // ── タイプバランス評価 ──
  const charCount = deck.filter(e => e.card.card_type === 'CHARACTER').reduce((s,e)=>s+e.count,0);
  const eventCount = deck.filter(e => e.card.card_type === 'EVENT').reduce((s,e)=>s+e.count,0);
  const charOk = charCount >= 32 && charCount <= 44;
  const eventOk = eventCount >= 6 && eventCount <= 14;
  const typeScore = Math.min(30,
    (charOk ? 15 : charCount >= 26 ? 8 : 3) +
    (eventOk ? 15 : eventCount >= 3 ? 8 : 2)
  );

  const totalScore = counterScore + costScore + typeScore;
  const grade =
    totalScore >= 88 ? 'S' :
    totalScore >= 74 ? 'A' :
    totalScore >= 58 ? 'B' :
    totalScore >= 40 ? 'C' : 'D';

  const advice = [];
  if (charCounterCards < 15)
    advice.push(`カウンターキャラが${charCounterCards}枚と少なめです。15枚以上を目安に増やしましょう。`);
  if (charCounterValue < 18000)
    advice.push(`カウンター合計値が${(charCounterValue/1000).toFixed(0)}K。20K以上を目標に守りを固めましょう。`);
  if (eventCounterCards < 3)
    advice.push(`【カウンター】イベントが${eventCounterCards}枚のみ。3〜5枚で防御力が大幅アップします。`);
  if (lowPct < 0.55)
    advice.push(`低コスト(0〜3)が${Math.round(lowPct*100)}%と少なめ。序盤安定のため60%以上を推奨します。`);
  if (highCost > 8)
    advice.push(`高コスト(7+)が${highCost}枚。事故防止のために6枚以下を推奨します。`);
  if (charCount < 32)
    advice.push(`キャラカードが${charCount}枚と少なめ。32〜40枚が標準的な構成です。`);
  if (eventCount < 6)
    advice.push(`イベントが${eventCount}枚のみ。6〜10枚でコンボ・防御の幅が広がります。`);
  if (advice.length === 0)
    advice.push('バランスの良いデッキです！対戦でぜひ試してみましょう。');

  return {
    grade, totalScore,
    counterScore, costScore, typeScore,
    charCounterValue, charCounterCards, eventCounterCards, triggerCards,
    lowCost, midCost, highCost, lowPct,
    charCount, eventCount,
    advice,
  };
}
