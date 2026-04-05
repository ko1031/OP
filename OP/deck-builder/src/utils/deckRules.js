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
 * スクレイパーが取得した trigger フィールド（div.trigger）を優先チェックし、
 * 旧形式の effect 内記述にもフォールバック対応する
 */
export function hasTrigger(card) {
  // 新形式: div.trigger から取得したフィールドが存在する場合
  if (card.trigger) return true;
  // 旧形式フォールバック: effect 内に【トリガー】が書かれているケース
  const effect = card.effect || '';
  const cleaned = effect.replace(
    /\(このカードがダメージを与えた場合、トリガーは発動せずそのカードはトラッシュに置かれる\)/g,
    ''
  );
  return /【トリガー】(?!.{0,6}(を持|が発動|を発動))/.test(cleaned);
}

/**
 * リーダー効果テキストから特殊ルール・特徴を抽出する
 * 返り値の各フラグはデッキ評価・立ち回り生成で参照する
 */
export function getLeaderRules(leader) {
  if (!leader) return {};
  const ef = leader.effect || '';
  const rules = {};

  // ── ドン上限制限 ──
  // 例: エネル「ルール上、自分のドン‼デッキは6枚になる」
  const donMatch = ef.match(/ドン[!！‼]+デッキは(\d+)枚/);
  if (donMatch) rules.maxDon = parseInt(donMatch[1]);

  // ── イベント/ステージをカウンターとして使える ──
  // 例: ルーシー「イベントかステージカードを任意の枚数捨ててもよい」
  if (/イベントかステージカードを.*捨て.*パワー/.test(ef)) {
    rules.eventAsCounter = true;
  }

  // ── コスト指定以上のイベント発動でドロー ──
  // 例: ルーシー「元々のコスト3以上のイベントを発動している場合、カード1枚を引く」
  const evDrawMatch = ef.match(/元々のコスト(\d+)以上のイベントを発動.*引く/);
  if (evDrawMatch) {
    rules.eventDrawMinCost = parseInt(evDrawMatch[1]);
    rules.eventIsStrength = true; // イベント多積みが強みになる
  }

  // ── ライフ減少時にドロー ──
  // 例: 青黄ナミ「自分のライフが1枚以上減った時、カード1枚を引く」
  if (/ライフ.*減.*カード.*引く|ライフ.*ダメージ.*引く/.test(ef)) {
    rules.lifeDrawOnDamage = true;
  }

  // ── アタック時にドロー ──
  // 例: リーダーがアタックした時にカードを引く
  if (/アタック時.*カード.*引く|アタック時.*ドロー/.test(ef)) {
    rules.drawOnAttack = true;
  }

  // ── アタック時に手札捨てカウンター/効果 ──
  if (/アタック時.*手札.*捨て/.test(ef)) {
    rules.attackDiscard = true;
  }

  // ── ドン加速（追加でドンを得る） ──
  if (/ドン[!！‼]+デッキからドン[!！‼]+.*アクティブ|ドン[!！‼]+.*追加.*アクティブ/.test(ef)) {
    rules.donAccelerate = true;
  }

  // ── 特定特徴を持つキャラ登場時にドン付与 ──
  if (/登場した時.*ドン[!！‼]+.*付与|ドン[!！‼]+.*付与.*登場した時/.test(ef)) {
    rules.donOnPlay = true;
  }

  // ── コスト軽減 ──
  if (/コスト.*-(\d+)|コスト.*軽減|(\d+)少なくなる|コストを減らす/.test(ef)) {
    rules.costReduction = true;
  }

  // ── バウンス効果（相手キャラを手札に戻す） ──
  if (/手札に戻す|バウンス/.test(ef)) {
    rules.hasBounce = true;
  }

  // ── ブロッカー付与 ──
  if (/【ブロッカー】を得る|ブロッカーを付与/.test(ef)) {
    rules.givesBlocker = true;
  }

  // ── ラッシュ付与 ──
  if (/【ラッシュ】を得る|ラッシュを付与/.test(ef)) {
    rules.givesRush = true;
  }

  // ── ライフを増やす・守る ──
  if (/ライフ.*加える|ライフ.*上に置く|ライフ.*守る/.test(ef)) {
    rules.lifeProtect = true;
  }

  // ── サーチ（デッキを見て手札に加える） ──
  if (/デッキの上から.*見て.*手札|デッキから.*サーチ/.test(ef)) {
    rules.hasDeckSearch = true;
  }

  // ── KO/除去効果 ──
  if (/KO.*する|トラッシュに置く/.test(ef)) {
    rules.hasRemoval = true;
  }

  // ── 相手ターン発動 ──
  if (/相手のターン中|相手のアタック時/.test(ef)) {
    rules.activeDuringOpponentTurn = true;
  }

  // ── 自分ターン終了時発動 ──
  if (/自分のターン.*終了時|ターン終了時/.test(ef)) {
    rules.activeOnTurnEnd = true;
  }

  // ── 登場時発動（特定キャラが場に出た時） ──
  if (/登場した時.*発動|登場時.*できる/.test(ef)) {
    rules.activeOnPlay = true;
  }

  return rules;
}

/**
 * リーダー固有の立ち回りヒントを生成する（全リーダー対応）
 * generateStrategy の generalTips に追加される形で使用
 */
export function getLeaderStrategyHints(leader, deck) {
  if (!leader) return [];
  const rules = getLeaderRules(leader);
  const hints = [];
  const ef = leader.effect || '';

  // ── ドン上限制限 ──
  if (rules.maxDon != null) {
    hints.push(`⚡ ドン!!上限${rules.maxDon}枚 — 通常より早くドンが枯れる。【起動メイン】で一気に展開するのがこのリーダーの勝ちパターン`);
  }

  // ── イベントドロー ──
  if (rules.eventIsStrength) {
    const minCost = rules.eventDrawMinCost ?? 3;
    const ev = deck?.find(e => e.card.card_type === 'EVENT' && (e.card.cost ?? 0) >= minCost);
    hints.push(`📖 コスト${minCost}以上のイベントを自ターンに使うと1ドロー — ${ev?.card.name ?? 'イベントカード'}を積極的に発動してアドを稼ごう`);
  }

  // ── イベント/ステージがカウンターとして使える ──
  if (rules.eventAsCounter) {
    hints.push(`🛡 手札のイベント・ステージを防御時にカウンターとして使える — 攻撃時に捨てて+1000。手札を守りにも攻めにも使えるのがこのリーダーの強さ`);
  }

  // ── ライフ減少時ドロー ──
  if (rules.lifeDrawOnDamage) {
    hints.push(`🃏 ライフが削られるたびにドロー — 受け身でも手札が増える。ライフを盾に使いながら手札を充実させる「受け」のプランが強力`);
  }

  // ── アタック時ドロー ──
  if (rules.drawOnAttack && !rules.eventIsStrength) {
    hints.push(`⚔️ リーダーアタック時にドロー — 毎ターン必ずリーダーでアタックして手札を切らさないようにしよう`);
  }

  // ── ドン加速 ──
  if (rules.donAccelerate) {
    hints.push(`💨 ドン加速リーダー — 早いターンに高コストキャラを展開できる。ドン加速を毎ターン確実に行い、テンポアドバンテージを取り続けよう`);
  }

  // ── キャラ登場時にドン付与 ──
  if (rules.donOnPlay) {
    hints.push(`🎯 キャラ登場時にドン!!を付与 — キャラを展開するほどドンが増える。序盤から積極的にキャラを並べてドンを溜め、大型フィニッシャーへつなげよう`);
  }

  // ── コスト軽減 ──
  if (rules.costReduction) {
    hints.push(`💰 コスト軽減リーダー — 本来より安くキャラを出せる。軽減の恩恵を最大限に受ける中〜高コストキャラを中心に構成しよう`);
  }

  // ── バウンス ──
  if (rules.hasBounce) {
    hints.push(`↩️ バウンス効果持ち — 相手キャラを手札に戻すことで盤面を整理できる。相手の大型キャラが出た時に使うと特に効果的`);
  }

  // ── ブロッカー付与 ──
  if (rules.givesBlocker) {
    hints.push(`🛡 ブロッカー付与リーダー — 展開したキャラがブロッカーになれる。アタッカーとブロッカーを兼用させて手数を増やそう`);
  }

  // ── ラッシュ付与 ──
  if (rules.givesRush) {
    hints.push(`⚡ ラッシュ付与リーダー — 登場したターンからアタックできる。高コストキャラを出してすぐにアタックする速攻プランが使える`);
  }

  // ── ライフ保護 ──
  if (rules.lifeProtect) {
    hints.push(`❤️ ライフを増やせるリーダー — ライフを盾に時間を稼ぐプランが使える。序盤の守りを固めながら盤面を整え、手札が充実してから攻めに転じよう`);
  }

  // ── 相手ターン発動 ──
  if (rules.activeDuringOpponentTurn && !rules.eventAsCounter) {
    hints.push(`⏰ 相手ターン中に発動する効果あり — 相手のアタック時に合わせて使うことで最大の効果を発揮。タイミングを見極めよう`);
  }

  // ── KO/除去 ──
  if (rules.hasRemoval) {
    hints.push(`💥 除去効果持ちリーダー — 相手の厄介なキャラを処理しながら展開できる。相手のブロッカーや大型キャラを狙い撃ちしよう`);
  }

  // ── デッキサーチ ──
  if (rules.hasDeckSearch) {
    hints.push(`🔍 サーチ効果持ちリーダー — デッキから必要なカードを引き込める。サーチで軸となるカードをそろえることを最優先にしよう`);
  }

  // リーダー効果の種類が多すぎる場合は主要なものに絞る（最大3つ）
  return hints.slice(0, 3);
}

// ────────────────────────────────────────────────
// 現在の環境 Tier1〜2 デッキ定義
// 出典: Egman Events OP14パワーランキング（2026年）
//       tcg-portal.jp（2026年4月 大会結果 451エントリー）
//       Note.com PROS / ドン研 / ティアワンメディア（2026年3〜4月）
//       ※ 2026年4月1日規制: 4プリン禁止
// 環境: OP14「蒼海の七傑」+ OP15 + EB03
// ────────────────────────────────────────────────
export const META_DECKS = [
  {
    id: 'black_im',
    name: '黒イム',
    colors: ['黒'],
    style: 'control',
    avgCost: 3.5,
    life: 4,
    counterDense: true,
    tier: 1,
    // キャラカード: サターン聖(4)/ウォーキュリー聖(4)/ナス寿郎聖(6)/マーズ聖(6)/ピーター聖(7)/五老星(10)
    // イベント: 元々…ないではないか…(除去/カウンター)/世界の均衡など…(除去)/浸食輪廻(4採用)
    description: '五老星の効果KO耐性で除去戦略を封じるコントロール。序盤はサターン聖・ウォーキュリー聖でリソースを蓄積し、10ドンで五老星を展開してトラッシュから複数体を一気に並べるゴロセイループが核。',
    strength: 'KO耐性・ゴロセイループによる盤面圧倒・除去イベントの豊富さ',
    weakness: 'ライフ4と低く速攻に弱い。10ドンまでの序盤を生き延びるスキルが必要',
  },
  {
    id: 'redblue_ace',
    name: '赤青エース',
    colors: ['赤', '青'],
    style: 'midrange',
    avgCost: 3.0,
    life: 5,
    counterDense: true,
    tier: 1,
    // キャラカード: 低〜中コストの攻守両用キャラ中心
    // イベント: 【カウンター】イベントで手札1枚を2000カウンターに変換(毎ターン1回)
    description: 'リーダー効果でアタック時に手札1枚を2000カウンターに変換しつつドロー。攻守一体の汎用ミッドレンジ。OP13から継続してトップメタを維持し、OP14でもコラソン・ルーシーと並ぶ最強格。',
    strength: '攻守バランス・毎ターンのドロー・どの対面にも対応できる汎用性',
    weakness: '2色構築のため事故リスクあり。ミラーは技量差が出やすい',
  },
  {
    id: 'blueyellow_nami',
    name: '青黄ナミ',
    colors: ['青', '黄'],
    style: 'control',
    avgCost: 3.5,
    life: 5,
    counterDense: true,
    tier: 1,
    // キャラカード: のじこ(2・バウンス)/ジョズ(6・バウンス)/キッド(8)/ルフィ(8・ラッシュ)/サンジ(9)
    // イベント: バウンス系・ドロー系を相手ターンに合わせて使用
    description: '2026年4月規制後も安定Tier1。ライフが離れるたびにドローするリーダー効果で継続的に手札を補充。青のバウンスで盤面をリセットしながら黄の高パワーキャラでフィニッシュ。ドン1枚で+2000のリーダー防御も強力。',
    strength: 'ライフトリガードロー・バウンスによる盤面コントロール・高い汎用性',
    weakness: 'リーダーパワー7000時は6000以下のキャラがアタックを受けやすい',
  },
  {
    id: 'blackpurple_corazon',
    name: '黒紫コラソン',
    colors: ['黒', '紫'],
    style: 'control',
    avgCost: 3.5,
    life: 5,
    counterDense: true,
    tier: 1,
    description: 'OP12登場のロシナンテ（コラソン）リーダー。OP14環境で急浮上し週次ランキング1位を獲得。黒の除去性能と紫のドン加速を組み合わせた強力コントロール。テクニカルな操作が求められる上級者向けデッキ。',
    strength: '高い除去性能・ドン加速によるテンポアドバンテージ',
    weakness: '複雑なプレイングが要求される。習熟度がカギ',
  },
  {
    id: 'redblue_lucy',
    name: '赤青ルーシー',
    colors: ['赤', '青'],
    style: 'aggro',
    avgCost: 2.8,
    life: 5,
    counterDense: true,
    tier: 1,
    // イベント・ステージを実質カウンターとして機能させる独自システム
    description: '2026年4月大会でシェア15.5%・勝率トップのTier1。イベント・ステージを実質カウンターとして扱えるリーダー効果が特徴。青サカズキ全盛期に匹敵する強さと評される。構築の自由度が高く攻守の両方に対応できる。',
    strength: 'イベント/ステージのカウンター化・圧倒的な展開速度・高いシェア実績',
    weakness: 'コンボ理解が必要。コントロールへの息切れリスク',
  },
  {
    id: 'greenyellow_mihawk',
    name: '緑黄ミホーク',
    colors: ['緑', '黄'],
    style: 'midrange',
    avgCost: 4.0,
    life: 5,
    counterDense: false,
    tier: 2,
    description: 'OP14新規リーダー。剣士シナジーと高パワーキャラの組み合わせでトップ6安定のTier2。イムやコラソンにも互角に戦える実力を持つ。',
    strength: '高パワー展開・剣士シナジーの相乗効果',
    weakness: 'カウンター密度がやや低く速攻には対処が必要',
  },
  {
    id: 'blueyellow_hancock',
    name: '青黄ハンコック',
    colors: ['青', '黄'],
    style: 'aggro',
    avgCost: 3.0,
    life: 5,
    counterDense: true,
    tier: 2,
    description: 'OP14最も爆発力のあるリーダーと評される。圧倒的なアタック圧力と手札回収が特徴。イムと並んで最も対策されるデッキ。',
    strength: '爆発的な攻撃力・優れた手札回収',
    weakness: '序盤に動けないと攻め筋を失いやすい',
  },
  {
    id: 'purple_enel',
    name: '紫エネル',
    colors: ['紫'],
    style: 'control',
    avgCost: 4.0,
    life: 5,
    counterDense: false,
    tier: 2,
    description: '2026年4月大会でシェア13.1%・59勝を記録するTier2筆頭。ドン加速と高コストカードの早出しで盤面を制圧するランプコントロール。',
    strength: 'ドン加速による高コストカードの早期展開',
    weakness: '展開前に崩されると立て直しが困難',
  },
  {
    id: 'purple_doflamingo',
    name: '紫ドフラミンゴ',
    colors: ['紫'],
    style: 'control',
    avgCost: 3.5,
    life: 5,
    counterDense: true,
    tier: 2,
    description: 'OP14新規リーダー。糸による盤面干渉と紫コントロールの除去性能を組み合わせた安定型。OP14環境のTier2として継続的に結果を残す。',
    strength: '盤面干渉・安定したコントロール性能',
    weakness: 'フィニッシュ手段がやや限られる',
  },
  {
    id: 'blue_jinbe',
    name: '青ジンベエ',
    colors: ['青'],
    style: 'control',
    avgCost: 3.5,
    life: 5,
    counterDense: true,
    tier: 2,
    description: 'OP14環境でTier1.5相当の評価を得る青コントロール。バウンスと手札補充を組み合わせた粘り強いデッキ。赤青ルーシーにも対抗できる。',
    strength: 'バウンスによる盤面リセット・高い手札補充',
    weakness: 'テンポが遅くアグロに押し込まれやすい',
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
 * キャラカード（自分ターンに展開）とイベントカード（タイミング別）を分離して返す
 * リーダー効果による特殊ルールを考慮する
 */
export function generateStrategy(deck, leader) {
  if (!deck.length || !leader) return null;

  const leaderEffect = leader.effect || '';
  const leaderRules  = getLeaderRules(leader);

  // コスト帯・タイプ別にカードを抽出（枚数多い順）
  const byBracketAndType = (minCost, maxCost, type) =>
    deck
      .filter(e => {
        const c = e.card.cost ?? 0;
        return c >= minCost && c <= maxCost && e.card.card_type === type;
      })
      .sort((a, b) => b.count - a.count || (a.card.cost ?? 0) - (b.card.cost ?? 0));

  // カード情報を整形（UI表示用）
  const toCardInfo = (arr, n = 3) =>
    arr.slice(0, n).map(e => ({
      name: e.card.name,
      cost: e.card.cost ?? 0,
      count: e.count,
      // 【カウンター】を含む → 相手ターンに使うカウンターイベント
      isCounter: !!(e.card.effect?.includes('【カウンター】')),
      // バウンス・KO・除去系 → 自分ターンのアクション
      isRemoval: !!(e.card.effect && /バウンス|手札に戻|KO|トラッシュ/.test(e.card.effect)),
    }));

  // 各コスト帯のキャラ・イベント
  const t1Char  = byBracketAndType(0, 2, 'CHARACTER');
  const t2Char  = byBracketAndType(3, 4, 'CHARACTER');
  const t3Char  = byBracketAndType(5, 6, 'CHARACTER');
  const finChar = byBracketAndType(7, 99, 'CHARACTER');
  const t1Event  = byBracketAndType(0, 2, 'EVENT');
  const t2Event  = byBracketAndType(3, 4, 'EVENT');
  const t3Event  = byBracketAndType(5, 6, 'EVENT');
  const finEvent = byBracketAndType(7, 99, 'EVENT');

  // コスト3以上のイベント（イベントドローリーダー用）
  const highCostEvents = byBracketAndType(3, 99, 'EVENT');

  // 全イベント・カウンターカード（generalTips用）
  const allEvents = deck
    .filter(e => e.card.card_type === 'EVENT')
    .sort((a, b) => b.count - a.count);
  const counterCards = deck
    .filter(e => e.card.counter || (e.card.card_type === 'EVENT' && e.card.effect?.includes('【カウンター】')))
    .sort((a, b) => b.count - a.count);

  // ── リーダー効果発動条件の基本ヒント ──
  let leaderTip = '';
  if (/アタック時/.test(leaderEffect)) leaderTip = 'リーダーアタック時に効果が発動 — 積極的にアタックを狙おう';
  else if (/自分のターン.*終了時|ターン終了時/.test(leaderEffect)) leaderTip = 'ターン終了時に効果が発動 — プレイ後に忘れず確認';
  else if (/登場時/.test(leaderEffect)) leaderTip = '特定カードの登場時効果 — タイミングに注意';
  else if (/ブロック時/.test(leaderEffect)) leaderTip = 'ブロック時に効果が発動 — 防御も積極的に';

  // ── ドン上限制限があるリーダー（例：エネル）のターン構成変更 ──
  const maxDon = leaderRules.maxDon ?? 10;
  const isLimitedDon = maxDon < 10;

  // エネルの場合はT5〜T6が実質フィニッシュターン（最大6ドン）
  const turns = isLimitedDon
    ? [
        {
          turn: 'T1',
          don: '1ドン',
          icon: '🔰',
          phase: '序盤：手札整備',
          charCards:  toCardInfo(t1Char, 2),
          eventCards: toCardInfo(t1Event, 1),
          advice: 'ドン!!デッキは最大6枚のため通常より早くドンが枯れる。T1はリーダーアタックと低コストカードで盤面を始動させる。',
        },
        {
          turn: 'T2（リーダー起動後）',
          don: `最大${maxDon}ドン`,
          icon: '⚡',
          phase: '中盤：一気に展開',
          charCards:  [...toCardInfo(t2Char, 3), ...toCardInfo(t3Char, 2)].slice(0, 3),
          eventCards: toCardInfo([...t2Event, ...t3Event], 2),
          advice: leaderEffect.includes('起動メイン')
            ? `T2以降【起動メイン】でドン!!を一気に加速。最大${maxDon}ドン全てを活用して高コストキャラを一気に展開しよう。ドン!!が枯れる前に攻撃を仕掛けることが重要。`
            : `最大${maxDon}ドンをフル活用。高コストキャラを並べてプレッシャーをかける。`,
        },
        {
          turn: 'T3〜（フィニッシュ）',
          don: `最大${maxDon}ドン（再加速後）`,
          icon: '🏆',
          phase: '終盤：畳み掛け',
          charCards:  toCardInfo(finChar, 2),
          eventCards: toCardInfo(finEvent, 2),
          advice:
            finChar.length >= 1
              ? `${finChar[0].card.name}でフィニッシュを狙う。ドン!!上限が${maxDon}のため、再加速のタイミングを計算して攻め続ける。`
              : `ドン!!が再加速したターンに一気に畳み掛ける。相手の手札が尽きたら全力アタック。`,
        },
      ]
    : [
        {
          turn: 'T1〜T2',
          don: '1〜2ドン',
          icon: '🔰',
          phase: '序盤：盤面形成',
          charCards:  toCardInfo(t1Char, 3),
          eventCards: toCardInfo(t1Event, 2),
          advice:
            t1Char.length >= 2
              ? `${t1Char[0].card.name}・${t1Char[1]?.card.name ?? ''}などを展開して序盤の盤面を作る。リーダーアタックも忘れずに。`
              : 'ドン!!を貯め、T3以降の大きな動きに備える。手札交換を活用して手札の質を上げる。',
        },
        {
          turn: 'T3〜T4',
          don: '3〜4ドン',
          icon: '⚔️',
          phase: '中盤前半：展開加速',
          charCards:  toCardInfo(t2Char, 3),
          eventCards: toCardInfo(t2Event, 2),
          advice: leaderRules.eventIsStrength
            ? `${highCostEvents[0]?.card.name ?? 'コスト3+イベント'}を使ってリーダー効果でドロー。毎ターンイベントを発動しながら手札を補充しつつ攻める。`
            : t2Char.length >= 1
              ? `${t2Char[0].card.name}など主力3〜4コストを展開。カウンターイベントは安易に使わず手札に温存しながら攻守のバランスを取る。`
              : 'イベント・カウンターを手札に温存しつつ低コストカードで横展開を続ける。',
        },
        {
          turn: 'T5〜T6',
          don: '5〜6ドン',
          icon: '💥',
          phase: '中盤後半：盤面制圧',
          charCards:  toCardInfo(t3Char, 3),
          eventCards: toCardInfo(t3Event, 2),
          advice: leaderRules.eventIsStrength
            ? `コスト3+イベントを毎ターン発動してドローを継続。${t3Char[0]?.card.name ?? '主力キャラ'}を展開しながら手札をイベントで補充し続ける。`
            : t3Char.length >= 1
              ? `${t3Char[0].card.name}など強力なカードで盤面を制圧。除去イベントで相手の盤面を崩してから攻めよう。`
              : 'ここまでの盤面優位を活かし、ライフへの攻撃を集中させる。カウンターは最終局面まで温存。',
        },
        {
          turn: 'T7以降',
          don: '7ドン以上',
          icon: '🏆',
          phase: '終盤：フィニッシュ',
          charCards:  toCardInfo(finChar, 2),
          eventCards: toCardInfo(finEvent, 2),
          advice:
            finChar.length >= 1
              ? `${finChar[0].card.name}がフィニッシャー。相手の手札が少ない・カウンターが尽きたタイミングを見計らって叩き込む。`
              : 'リーダーアタックと盤面カードのアタックを組み合わせ、手札のカウンターが尽きたところで一気に削り切る。',
        },
      ];

  // ── 汎用アドバイス ──
  const generalTips = [];

  // リーダー固有の強み説明（全リーダー対応・最優先）
  const leaderHints = getLeaderStrategyHints(leader, deck);
  generalTips.push(...leaderHints);

  if (counterCards.length > 0 && !leaderRules.eventAsCounter) {
    generalTips.push(`手札の${counterCards[0].card.name}などカウンターカードは終盤まで温存が基本`);
  }
  if (allEvents.length > 0) {
    const counterEvent = allEvents.find(e => e.card.effect?.includes('【カウンター】'));
    const actionEvent  = allEvents.find(e => !e.card.effect?.includes('【カウンター】'));
    if (counterEvent && !leaderRules.eventAsCounter) {
      generalTips.push(`【カウンター】イベント（例:${counterEvent.card.name}）は相手のアタック宣言後に使う — 自分のターンには使えない`);
    }
    if (actionEvent) {
      generalTips.push(`除去・ドローイベント（例:${actionEvent.card.name}）は自分のメインフェイズで使い盤面有利を作る`);
    }
  }
  // leaderHints がない場合のみ基本ヒントを表示
  if (leaderHints.length === 0 && leaderTip) generalTips.push(leaderTip);
  generalTips.push('相手のライフが3以下になったら一気に攻めるチャンス — カウンターを警戒しながらアタック宣言を工夫しよう');

  return { turns, generalTips };
}

/**
 * デッキ全体を評価してスコアとアドバイスを返す
 * leader が渡された場合はリーダー効果による特殊ルールを考慮する
 */
export function evaluateDeck(deck, leader) {
  const total = deck.reduce((s, e) => s + e.count, 0);
  if (total === 0) return null;

  const leaderRules = getLeaderRules(leader);

  // ── カウンター評価 ──
  let charCounterValue = 0;
  let charCounterCards = 0;
  let eventCounterCards = 0;
  let mainEventCards = 0;   // 【メイン】イベント（除去・ドロー・サーチ系）
  let triggerCards = 0;
  let highCostEventCards = 0; // コスト3以上のイベント（ドローリーダー用）

  deck.forEach(({ card, count }) => {
    if (card.card_type === 'CHARACTER' && card.counter) {
      charCounterValue += card.counter * count;
      charCounterCards += count;
    }
    const ef = card.effect || '';
    if (card.card_type === 'EVENT') {
      if (ef.includes('【カウンター】')) eventCounterCards += count;
      // 【メイン】を含むイベント = メインイベント（除去・ドロー・サーチ系）
      if (ef.includes('【メイン】')) mainEventCards += count;
      // コスト3以上のイベント（ルーシー等のドロートリガーに使用）
      if ((card.cost ?? 0) >= (leaderRules.eventDrawMinCost ?? 3)) highCostEventCards += count;
    }
    if (hasTrigger(card)) triggerCards += count;
  });

  // ── カウンタースコア ──
  // イベントをカウンターとして使えるリーダー（ルーシー等）はイベント枚数もカウンターとして加算
  const effectiveEventCounter = leaderRules.eventAsCounter
    ? eventCounterCards + Math.floor(mainEventCards * 0.5) // メインイベントも半分はカウンターとして機能
    : eventCounterCards;
  const counterScore = Math.min(40,
    Math.round((charCounterValue / 1000) * 1.2 + effectiveEventCounter * 2)
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
  // ドン上限制限リーダー（エネル等）は高コストに振り切るので評価基準を緩める
  const isLimitedDon = (leaderRules.maxDon ?? 10) < 10;
  const costScore = Math.min(30, Math.round(
    isLimitedDon
      ? (lowPct >= 0.40 ? 30 : lowPct >= 0.30 ? 24 : lowPct >= 0.20 ? 18 : 12)
      : (lowPct >= 0.65 ? 30 : lowPct >= 0.55 ? 24 : lowPct >= 0.45 ? 18 : lowPct >= 0.35 ? 12 : 6)
  ));

  // ── タイプバランス評価 ──
  const charCount = deck.filter(e => e.card.card_type === 'CHARACTER').reduce((s,e)=>s+e.count,0);
  const eventCount = deck.filter(e => e.card.card_type === 'EVENT').reduce((s,e)=>s+e.count,0);

  // イベントが強みになるリーダー（ルーシー等）は上限を20枚に緩和し、高枚数をポジティブ評価
  const eventUpperLimit = leaderRules.eventIsStrength ? 24 : (mainEventCards >= 2 ? 18 : 14);
  const charOk = leaderRules.eventIsStrength
    ? (charCount >= 20 && charCount <= 40) // イベント型は少し少なめでもOK
    : (charCount >= 30 && charCount <= 44);
  const eventOk = eventCount >= 6 && eventCount <= eventUpperLimit;

  const typeScore = Math.min(30,
    (charOk ? 15 : charCount >= 20 ? 8 : 3) +
    (eventOk ? 15 : eventCount >= 3 ? 8 : 2)
  );

  const totalScore = counterScore + costScore + typeScore;
  const grade =
    totalScore >= 88 ? 'S' :
    totalScore >= 74 ? 'A' :
    totalScore >= 58 ? 'B' :
    totalScore >= 40 ? 'C' : 'D';

  const advice = [];

  // ── リーダー固有のアドバイス ──
  if (isLimitedDon) {
    if (highCost > 12)
      advice.push(`ドン上限${leaderRules.maxDon}のリーダーでは高コスト多めでも問題なし。フィニッシャーを増やして速攻を狙おう。`);
    // ドン上限リーダーは低コスト率の基準が下がる → 低コスト警告を出さない
  } else {
    if (lowPct < 0.55 && mainEventCards < 4)
      advice.push(`低コスト(0〜3)が${Math.round(lowPct*100)}%と少なめ。序盤安定のため60%以上を推奨します。`);
    if (highCost > 8)
      advice.push(`高コスト(7+)が${highCost}枚。事故防止のために6枚以下を推奨します。`);
  }

  if (leaderRules.eventIsStrength) {
    // ルーシー等: イベント多積みはむしろ強み
    if (eventCount < 10)
      advice.push(`このリーダーはイベントを発動するほど強い！コスト${leaderRules.eventDrawMinCost ?? 3}以上のイベントを10〜20枚入れてドローアドを最大化しましょう。`);
    else if (highCostEventCards < 8)
      advice.push(`コスト${leaderRules.eventDrawMinCost ?? 3}以上のイベントが${highCostEventCards}枚。ドロー効果を毎ターン活かすには8枚以上が理想です。`);
    else
      advice.push(`✅ イベント構成が良好！コスト${leaderRules.eventDrawMinCost ?? 3}以上が${highCostEventCards}枚確保されており、毎ターンのドロー効果を安定発動できます。`);
    // キャラカードが少なくてもイベント型は評価しない
    if (charCount < 20)
      advice.push(`キャラカードが${charCount}枚と少なめです。最低限のアタック要員（20枚以上）は確保しましょう。`);
  } else {
    if (charCount < 30 && mainEventCards < 6)
      advice.push(`キャラカードが${charCount}枚と少なめ。30〜40枚が標準的な構成です。`);
    if (eventCount < 6 && mainEventCards === 0)
      advice.push(`イベントが${eventCount}枚のみ。6〜10枚でコンボ・防御の幅が広がります。`);
  }

  // ── カウンター関連アドバイス ──
  if (leaderRules.eventAsCounter) {
    // ルーシー等: イベントがカウンターとして機能するのでカウンターキャラの基準を緩める
    if (charCounterCards < 10 && eventCount < 8)
      advice.push(`カウンターキャラ${charCounterCards}枚・イベント${eventCount}枚。このリーダーはイベントもカウンターに使えるので合計20枚以上を目安に。`);
  } else {
    if (charCounterCards < 14)
      advice.push(`カウンターキャラが${charCounterCards}枚と少なめです。14枚以上を目安に増やしましょう。`);
    if (charCounterValue < 18000)
      advice.push(`カウンター合計値が${(charCounterValue/1000).toFixed(0)}K。20K以上を目標に守りを固めましょう。`);
    if (eventCounterCards < 3 && mainEventCards < 4)
      advice.push(`【カウンター】イベントが${eventCounterCards}枚のみ。3〜5枚で防御力が大幅アップします。`);
  }

  if (mainEventCards === 0 && !leaderRules.eventIsStrength)
    advice.push('【メイン】イベント（除去・ドロー・サーチ）がありません。2〜6枚入れると盤面干渉力が上がります。');

  if (advice.length === 0)
    advice.push('バランスの良いデッキです！対戦でぜひ試してみましょう。');

  return {
    grade, totalScore,
    counterScore, costScore, typeScore,
    charCounterValue, charCounterCards, eventCounterCards, mainEventCards, triggerCards,
    highCostEventCards,
    lowCost, midCost, highCost, lowPct,
    charCount, eventCount,
    leaderRules,
    advice,
  };
}

// ────────────────────────────────────────────────
// フラッグシップバトル優勝サンプルデッキ
// 出典: cardrush.media 大会入賞デッキ（2026年2〜4月）
// ────────────────────────────────────────────────
export const SAMPLE_DECKS = [
  {
    id: 'flagship_2026_black_im',
    name: '黒イム',
    leaderCard: 'OP13-079',
    date: '2026/3/4',
    event: 'フラッグシップバトル優勝',
    tier: 1,
    colors: ['黒'],
    description: '五老星ループで盤面を圧倒するコントロール。KO耐性で除去を封じながら序盤蓄積→五老星で一気に並べる。4月規制後も安定Tier1。',
    deck: [
      { cardNumber: 'OP05-097', count: 1 },
      { cardNumber: 'OP13-099', count: 1 },
      { cardNumber: 'OP13-083', count: 4 },
      { cardNumber: 'OP13-089', count: 4 },
      { cardNumber: 'OP13-080', count: 4 },
      { cardNumber: 'OP13-084', count: 4 },
      { cardNumber: 'OP13-091', count: 4 },
      { cardNumber: 'OP13-086', count: 4 },
      { cardNumber: 'OP13-092', count: 4 },
      { cardNumber: 'OP13-082', count: 4 },
      { cardNumber: 'OP05-082', count: 2 },
      { cardNumber: 'OP13-096', count: 4 },
      { cardNumber: 'OP13-098', count: 4 },
      { cardNumber: 'OP13-097', count: 2 },
      { cardNumber: 'OP14-096', count: 4 },
    ],
  },
  {
    id: 'flagship_2026_redblue_lucy',
    name: '赤青ルーシー',
    leaderCard: 'OP15-002',
    date: '2026/4/2',
    event: 'フラッグシップバトル優勝',
    tier: 1,
    colors: ['赤', '青'],
    description: 'イベント・ステージを実質カウンター化するリーダー効果。大会シェア15.5%・勝率トップのTier1。',
    deck: [
      { cardNumber: 'OP15-057', count: 3 },
      { cardNumber: 'OP15-053', count: 4 },
      { cardNumber: 'OP15-052', count: 4 },
      { cardNumber: 'OP15-040', count: 4 },
      { cardNumber: 'OP10-045', count: 4 },
      { cardNumber: 'OP15-006', count: 2 },
      { cardNumber: 'OP15-046', count: 4 },
      { cardNumber: 'OP14-049', count: 1 },
      { cardNumber: 'OP09-118', count: 1 },
      { cardNumber: 'OP15-020', count: 4 },
      { cardNumber: 'OP15-056', count: 2 },
      { cardNumber: 'OP10-060', count: 4 },
      { cardNumber: 'OP15-054', count: 4 },
      { cardNumber: 'OP15-021', count: 3 },
      { cardNumber: 'OP10-059', count: 4 },
      { cardNumber: 'OP12-060', count: 1 },
      { cardNumber: 'OP05-019', count: 1 },
    ],
  },
  {
    id: 'flagship_2026_blueyellow_nami',
    name: '青黄ナミ',
    leaderCard: 'OP11-041',
    date: '2026/4/2',
    event: 'フラッグシップバトル優勝',
    tier: 1,
    colors: ['青', '黄'],
    description: 'ライフが削れるたびにドローするリーダー効果＋バウンスで盤面コントロール。4月規制後も安定Tier1。',
    deck: [
      { cardNumber: 'OP06-106', count: 4 },
      { cardNumber: 'OP11-106', count: 4 },
      { cardNumber: 'P-096',    count: 4 },
      { cardNumber: 'EB03-053', count: 4 },
      { cardNumber: 'EB04-058', count: 4 },
      { cardNumber: 'EB03-055', count: 4 },
      { cardNumber: 'OP14-102', count: 4 },
      { cardNumber: 'OP14-111', count: 4 },
      { cardNumber: 'OP13-042', count: 3 },
      { cardNumber: 'OP14-110', count: 3 },
      { cardNumber: 'OP14-104', count: 4 },
      { cardNumber: 'OP07-115', count: 4 },
      { cardNumber: 'EB03-060', count: 4 },
    ],
  },
  {
    id: 'flagship_2026_purple_enel',
    name: '紫エネル',
    leaderCard: 'OP15-058',
    date: '2026/4/2',
    event: 'フラッグシップバトル優勝',
    tier: 2,
    colors: ['紫'],
    description: 'ドン加速と空島シナジーで高コストカードを早期展開。シェア13.1%・59勝記録のTier2筆頭。',
    deck: [
      { cardNumber: 'OP15-061', count: 4 },
      { cardNumber: 'OP15-066', count: 4 },
      { cardNumber: 'OP15-067', count: 4 },
      { cardNumber: 'OP15-071', count: 4 },
      { cardNumber: 'OP10-075', count: 4 },
      { cardNumber: 'OP07-072', count: 4 },
      { cardNumber: 'OP10-067', count: 2 },
      { cardNumber: 'OP15-060', count: 2 },
      { cardNumber: 'OP15-118', count: 4 },
      { cardNumber: 'OP15-077', count: 4 },
      { cardNumber: 'OP15-075', count: 4 },
      { cardNumber: 'OP15-076', count: 4 },
      { cardNumber: 'OP15-078', count: 4 },
      { cardNumber: 'OP13-076', count: 2 },
    ],
  },
  {
    id: 'flagship_2026_redblue_ace',
    name: '赤青エース',
    leaderCard: 'OP13-002',
    date: '2026/2/18',
    event: 'フラッグシップバトル優勝',
    tier: 1,
    colors: ['赤', '青'],
    description: 'アタック時ドロー＋カウンター変換の汎用ミッドレンジ。OP13から継続してトップメタを維持。',
    deck: [
      { cardNumber: 'OP13-016', count: 4 },
      { cardNumber: 'ST22-002', count: 4 },
      { cardNumber: 'OP13-043', count: 4 },
      { cardNumber: 'PRB02-008', count: 4 },
      { cardNumber: 'OP02-008', count: 3 },
      { cardNumber: 'OP13-054', count: 4 },
      { cardNumber: 'OP08-047', count: 4 },
      { cardNumber: 'OP13-046', count: 2 },
      { cardNumber: 'OP10-045', count: 2 },
      { cardNumber: 'ST23-001', count: 2 },
      { cardNumber: 'OP06-047', count: 1 },
      { cardNumber: 'EB04-007', count: 4 },
      { cardNumber: 'OP13-042', count: 4 },
      { cardNumber: 'OP09-118', count: 1 },
      { cardNumber: 'ST22-015', count: 4 },
      { cardNumber: 'OP04-056', count: 2 },
      { cardNumber: 'OP01-029', count: 1 },
    ],
  },
];
