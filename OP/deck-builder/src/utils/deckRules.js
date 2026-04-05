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

// ────────────────────────────────────────────────
// 現在の環境 Tier1〜2 デッキ定義（2026年4月時点）
// ────────────────────────────────────────────────
export const META_DECKS = [
  {
    id: 'red_zoro',
    name: '赤単ゾロ',
    colors: ['赤'],
    style: 'aggro',
    avgCost: 2.5,
    life: 4,
    counterDense: false,
    tier: 1,
    description: '序盤から速攻で押しつけるアグロ。低コストを連打してライフを削り切る。',
    strength: '圧倒的な速度・序盤制圧力',
    weakness: 'カウンター・ブロッカー多投デッキ',
  },
  {
    id: 'green_kinemon',
    name: '緑単錦えもん',
    colors: ['緑'],
    style: 'midrange',
    avgCost: 3.5,
    life: 5,
    counterDense: true,
    tier: 1,
    description: 'おでんをフィニッシャーにしたミッドレンジ。サーチが豊富で安定感が高い。',
    strength: 'サーチによる安定性・おでんのフィニッシュ力',
    weakness: '超アグロへの対応力不足',
  },
  {
    id: 'purple_kaido',
    name: '紫単カイドウ',
    colors: ['紫'],
    style: 'ramp',
    avgCost: 5.0,
    life: 5,
    counterDense: false,
    tier: 1,
    description: '鬼ヶ島でドンを加速し、高コストカードを早期展開するランプデッキ。',
    strength: '中盤以降の圧倒的制圧力',
    weakness: '鬼ヶ島依存・序盤の動きが薄い',
  },
  {
    id: 'black_smoker',
    name: '黒単スモーカー',
    colors: ['黒'],
    style: 'combo',
    avgCost: 3.0,
    life: 4,
    counterDense: false,
    tier: 1,
    description: 'リーダー効果とコスト軽減シナジーでパワーカードを次々展開するコンボ。',
    strength: 'カードパワーの高さ・爆発力',
    weakness: 'サーチがなく手札事故リスクあり',
  },
  {
    id: 'black_sakazuki',
    name: '黒単サカズキ',
    colors: ['黒'],
    style: 'control',
    avgCost: 3.5,
    life: 4,
    counterDense: true,
    tier: 1,
    description: '0コストカードをKOできるリーダー効果で相手の展開を潰すコントロール。',
    strength: '除去性能の高さ・粘り強さ',
    weakness: '時間がかかる・カウンター持ち対面',
  },
  {
    id: 'red_luffy',
    name: '赤単ルフィ',
    colors: ['赤'],
    style: 'aggro',
    avgCost: 2.0,
    life: 4,
    counterDense: false,
    tier: 2,
    description: '速攻カードで一気にライフを削りきる純アグロ。リーダー効果で序盤のアドを稼ぐ。',
    strength: '圧倒的な速度',
    weakness: 'ブロッカー・カウンター多投デッキ',
  },
  {
    id: 'green_kid',
    name: '緑単キッド',
    colors: ['緑'],
    style: 'midrange',
    avgCost: 3.0,
    life: 5,
    counterDense: true,
    tier: 2,
    description: 'サーチが豊富で安定性の高いミッドレンジ。攻守のバランスが良い。',
    strength: '安定感・手札事故の少なさ',
    weakness: '特定のコンボに対する対処力',
  },
  {
    id: 'blue_doflamingo',
    name: '青単ドフラミンゴ',
    colors: ['青'],
    style: 'midrange',
    avgCost: 3.5,
    life: 5,
    counterDense: true,
    tier: 2,
    description: 'リーダー効果による継続的な展開力が強みのミッドレンジ。不利対面が少ない。',
    strength: 'リソース持続力・対応力',
    weakness: 'AOE除去への対応',
  },
];

/**
 * リーダーとデッキの相性を分析する
 */
export function analyzeLeaderSynergy(deck, leader) {
  if (!leader || !deck.length) return null;

  const total = deck.reduce((s, e) => s + e.count, 0);
  const leaderColors = leader.colors || [];
  const leaderTraits = leader.traits || [];
  const leaderEffect = leader.effect || '';

  // 色一致率
  const colorMatchCount = deck.reduce((s, e) => {
    const matches = (e.card.colors || []).some(c => leaderColors.includes(c));
    return s + (matches ? e.count : 0);
  }, 0);
  const colorMatchPct = total > 0 ? colorMatchCount / total : 0;

  // デッキ内の種族集計
  const traitMap = {};
  deck.forEach(({ card, count }) => {
    (card.traits || []).forEach(t => {
      traitMap[t] = (traitMap[t] || 0) + count;
    });
  });
  const topTraits = Object.entries(traitMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([trait, count]) => ({
      trait, count, pct: Math.round(count / total * 100),
      matchesLeader: leaderTraits.includes(trait),
    }));

  // リーダー効果キーワード分析
  const effectKeywords = [];
  if (/ラッシュ|Rush/.test(leaderEffect)) effectKeywords.push('ラッシュ');
  if (/ブロッカー/.test(leaderEffect)) effectKeywords.push('ブロッカー');
  if (/サーチ|デッキ.*見て/.test(leaderEffect)) effectKeywords.push('サーチ');
  if (/コスト.*減|軽減/.test(leaderEffect)) effectKeywords.push('コスト軽減');
  if (/カウンター/.test(leaderEffect)) effectKeywords.push('カウンター強化');
  if (/ドン!!.*加える|ドン.*得る/.test(leaderEffect)) effectKeywords.push('ドン加速');
  if (/手札.*加える|ドロー/.test(leaderEffect)) effectKeywords.push('ドロー');
  if (/KO|除去/.test(leaderEffect)) effectKeywords.push('除去');

  // 対応するカードの枚数カウント
  const keywordCardCount = {};
  if (effectKeywords.includes('ラッシュ')) {
    keywordCardCount['ラッシュ'] = deck.reduce((s, e) =>
      s + (/【ラッシュ】/.test(e.card.effect || '') ? e.count : 0), 0);
  }
  if (effectKeywords.includes('ブロッカー')) {
    keywordCardCount['ブロッカー'] = deck.reduce((s, e) =>
      s + (/【ブロッカー】/.test(e.card.effect || '') ? e.count : 0), 0);
  }

  // シナジースコア計算
  let synergyScore = 0;
  const points = [];

  if (colorMatchPct >= 0.95) {
    synergyScore += 3;
    points.push({ good: true, text: `色一致率 ${Math.round(colorMatchPct * 100)}%（完璧）` });
  } else if (colorMatchPct >= 0.8) {
    synergyScore += 2;
    points.push({ good: true, text: `色一致率 ${Math.round(colorMatchPct * 100)}%（良好）` });
  } else {
    synergyScore += 0;
    points.push({ good: false, text: `色一致率 ${Math.round(colorMatchPct * 100)}%（要改善 — 色外カードは入れられません）` });
  }

  const leaderTraitMatches = topTraits.filter(t => t.matchesLeader);
  if (leaderTraitMatches.length > 0) {
    synergyScore += 2;
    points.push({ good: true, text: `リーダー種族「${leaderTraitMatches.map(t => t.trait).join('・')}」がデッキ中心（${leaderTraitMatches[0].pct}%）` });
  }

  if (topTraits.length > 0) {
    points.push({ good: null, text: `主要種族: ${topTraits.map(t => `${t.trait}(${t.pct}%)`).join(' / ')}` });
  }

  if (effectKeywords.length > 0) {
    synergyScore += 1;
    points.push({ good: true, text: `リーダー効果キーワード: ${effectKeywords.join('・')}` });
    Object.entries(keywordCardCount).forEach(([kw, cnt]) => {
      if (cnt > 0) points.push({ good: cnt >= 8, text: `${kw}カード: ${cnt}枚` });
    });
  }

  const grade = synergyScore >= 5 ? 'S' : synergyScore >= 3 ? 'A' : synergyScore >= 1 ? 'B' : 'C';

  return { grade, synergyScore, colorMatchPct, topTraits, effectKeywords, points };
}

/**
 * 環境Tier1〜2デッキとのマッチアップを分析する
 */
export function analyzeMatchups(deck, leader) {
  if (!leader || !deck.length) return [];

  const total = deck.reduce((s, e) => s + e.count, 0);
  const counterCards = deck.reduce((s, e) => {
    const has = e.card.counter || (e.card.card_type === 'EVENT' && e.card.effect?.includes('【カウンター】'));
    return s + (has ? e.count : 0);
  }, 0);
  const counterDensity = counterCards / total;
  const avgCost = deck.reduce((s, e) => s + (e.card.cost ?? 0) * e.count, 0) / total;
  const ourLife = leader.life || 5;
  const ourColors = leader.colors || [];

  return META_DECKS.map(meta => {
    let score = 0;
    const reasons = [];

    // ── 速度比較 ──
    if (avgCost < meta.avgCost - 1.2) {
      score += 1;
      reasons.push(`速度優位（平均コスト ${avgCost.toFixed(1)} vs ${meta.avgCost}）`);
    } else if (avgCost > meta.avgCost + 1.2) {
      score -= 1;
      reasons.push(`速度で遅れがち（平均コスト ${avgCost.toFixed(1)} vs ${meta.avgCost}）`);
    }

    // ── カウンター密度 vs アグロ ──
    if (meta.style === 'aggro') {
      if (counterDensity >= 0.42) {
        score += 1;
        reasons.push(`カウンター密度 ${Math.round(counterDensity * 100)}% でアグロの速度に耐えられる`);
      } else if (counterDensity < 0.28) {
        score -= 1;
        reasons.push(`カウンター密度 ${Math.round(counterDensity * 100)}% — アグロに押されやすい`);
      }
    }

    // ── ライフ vs アグロ ──
    if (meta.style === 'aggro') {
      if (ourLife >= 5) {
        score += 0.5;
        reasons.push(`ライフ ${ourLife} でアグロの削りに耐えやすい`);
      } else {
        score -= 0.5;
        reasons.push(`ライフ ${ourLife} — アグロに序盤削られやすい`);
      }
    }

    // ── ランプ vs 速攻 ──
    if (meta.style === 'ramp' && avgCost < 3.2) {
      score += 1;
      reasons.push('ランプの準備中に攻め込める速度がある');
    }

    // ── コントロール vs 低速 ──
    if (meta.style === 'control') {
      if (avgCost < 2.8) {
        score += 1;
        reasons.push('低コスト展開でコントロールの除去を回避しやすい');
      } else if (counterDensity >= 0.4) {
        score += 0.5;
        reasons.push('カウンター密度が高くコントロール相手に粘れる');
      } else {
        score -= 0.5;
        reasons.push('コントロールの除去に盤面が崩されやすい');
      }
    }

    // ── 相手カウンター密度 ──
    if (meta.counterDense && avgCost < 3.0) {
      score -= 0.5;
      reasons.push('相手のカウンターが厚く攻撃が通りにくい');
    }

    // ── 色同士の相性（汎用的なヒューリスティック）──
    const colorOverlap = ourColors.some(c => meta.colors.includes(c));
    if (colorOverlap) {
      reasons.push('同系色 — プレイングで差がつきやすいミラー気味の対面');
    }

    score = Math.max(-2, Math.min(2, Math.round(score * 2) / 2));

    const label =
      score >= 1.5 ? '大有利' :
      score >= 0.5 ? '有利' :
      score <= -1.5 ? '大不利' :
      score <= -0.5 ? '不利' : '五分';

    const labelColor =
      score >= 1 ? 'text-green-400' :
      score <= -1 ? 'text-red-400' : 'text-yellow-300';

    const bgColor =
      score >= 1 ? 'bg-green-900/30 border-green-700' :
      score <= -1 ? 'bg-red-900/30 border-red-700' : 'bg-yellow-900/20 border-yellow-700';

    return { ...meta, score, label, labelColor, bgColor, reasons };
  });
}

/**
 * デッキの立ち回り定石をターン別に生成する
 */
export function generateStrategy(deck, leader) {
  if (!deck.length || !leader) return null;

  const leaderEffect = leader.effect || '';
  const leaderColors = leader.colors || [];

  // コスト帯別カードを抽出（枚数多い順）
  const byBracket = (minCost, maxCost) =>
    deck
      .filter(e => {
        const c = e.card.cost ?? 0;
        return c >= minCost && c <= maxCost && e.card.card_type !== 'LEADER';
      })
      .sort((a, b) => b.count - a.count || (a.card.cost ?? 0) - (b.card.cost ?? 0));

  const t1Cards = byBracket(0, 2);
  const t2Cards = byBracket(3, 4);
  const t3Cards = byBracket(5, 6);
  const finCards = byBracket(7, 99);
  const eventCards = deck
    .filter(e => e.card.card_type === 'EVENT')
    .sort((a, b) => b.count - a.count);
  const counterCards = deck
    .filter(e => e.card.counter || (e.card.card_type === 'EVENT' && e.card.effect?.includes('【カウンター】')))
    .sort((a, b) => b.count - a.count);

  // 先頭N枚をカード名リストに
  const cardNames = (arr, n = 3) =>
    arr.slice(0, n).map(e => `「${e.card.name}」(${e.card.cost ?? 0}コスト×${e.count}枚)`);

  // リーダー効果発動条件
  let leaderTip = '';
  if (/アタック時/.test(leaderEffect)) leaderTip = 'リーダーアタック時に効果が発動 — 積極的にアタックを狙おう';
  else if (/自分のターン.*終了時|ターン終了時/.test(leaderEffect)) leaderTip = 'ターン終了時に効果が発動 — プレイ後に忘れず確認';
  else if (/登場時/.test(leaderEffect)) leaderTip = '特定カードの登場時効果 — タイミングに注意';
  else if (/ブロック時/.test(leaderEffect)) leaderTip = 'ブロック時に効果が発動 — 防御も積極的に';

  const turns = [
    {
      turn: 'T1〜T2',
      don: '1〜2ドン',
      icon: '🔰',
      phase: '序盤：盤面形成',
      cards: cardNames(t1Cards, 3),
      advice:
        t1Cards.length >= 2
          ? `${t1Cards[0].card.name}・${t1Cards[1]?.card.name ?? ''}などを展開して序盤の盤面を作る。リーダーアタックも忘れずに。`
          : 'ドン!!を貯め、T3以降の大きな動きに備える。手札交換を活用して手札の質を上げる。',
    },
    {
      turn: 'T3〜T4',
      don: '3〜4ドン',
      icon: '⚔️',
      phase: '中盤前半：展開加速',
      cards: cardNames(t2Cards, 3),
      advice:
        t2Cards.length >= 1
          ? `${t2Cards[0].card.name}など主力3〜4コストを展開。カウンターは安易に使わず手札に温存しながら攻守のバランスを取る。`
          : 'イベント・カウンターを手札に温存しつつ低コストカードで横展開を続ける。',
    },
    {
      turn: 'T5〜T6',
      don: '5〜6ドン',
      icon: '💥',
      phase: '中盤後半：盤面制圧',
      cards: cardNames(t3Cards, 3),
      advice:
        t3Cards.length >= 1
          ? `${t3Cards[0].card.name}など強力なカードで盤面を制圧。相手のカウンターを使わせてから勝負を仕掛ける。`
          : 'ここまでの盤面優位を活かし、ライフへの攻撃を集中させる。カウンターは最終局面まで温存。',
    },
    {
      turn: 'T7以降',
      don: '7ドン以上',
      icon: '🏆',
      phase: '終盤：フィニッシュ',
      cards: cardNames(finCards, 2),
      advice:
        finCards.length >= 1
          ? `${finCards[0].card.name}がフィニッシャー。相手の手札が少ない・カウンターが尽きたタイミングを見計らって叩き込む。`
          : 'リーダーアタックと盤面カードのアタックを組み合わせ、手札のカウンターが尽きたところで一気に削り切る。',
    },
  ];

  // 汎用アドバイス
  const generalTips = [];
  if (counterCards.length > 0) {
    generalTips.push(`手札の${counterCards[0].card.name}などカウンターは終盤まで温存が基本`);
  }
  if (eventCards.length > 0) {
    generalTips.push(`${eventCards[0].card.name}などイベントは相手のアタックに合わせて使うと効果的`);
  }
  if (leaderTip) generalTips.push(leaderTip);
  generalTips.push('相手のライフが3以下になったら一気に攻めるチャンス — カウンターを警戒しながらアタック宣言を工夫しよう');

  return { turns, generalTips };
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
