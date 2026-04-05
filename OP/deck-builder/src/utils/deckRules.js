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
// 出典: cardrush.media 大会結果（2026年2〜4月）
//       Note.com PROS 週間環境考察（3月第1週）
//       Note.com 複数プレイヤー解説記事（紫エネル「圧倒的Tier1」等）
//       ※ 2026年4月1日規制: 4プリン禁止
// 環境: OP15「神の島の冒険」+ OP14 + EB04
// Tier定義: Tier1=圧倒的シェア・デッキパワー・不利対面が少ない / Tier2=環境上位だが対策されやすい
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
    description: '五老星のKO耐性で除去を封じるコントロール。序盤はサターン聖・ウォーキュリー聖でリソースを蓄積し、10ドンで五老星を展開するゴロセイループが核。紫エネル・緑ミホーク不利。OP13以来Tier1継続。4/2フラッグシップ優勝。',
    strength: 'KO耐性・ゴロセイループによる盤面圧倒・除去イベントの豊富さ',
    weakness: 'ライフ4と低く速攻に弱い。紫エネル・ロシナンテに有利を取られやすい',
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
    id: 'purpleyellow_rosinante',
    name: '紫黄ロシナンテ',
    colors: ['紫', '黄'],
    style: 'midrange',
    avgCost: 3.5,
    life: 4,
    counterDense: true,
    tier: 1,
    description: 'OP12登場のロシナンテ（コラソン）リーダー。OP14.5環境でメタシェア18.4%・週次ランキング1位を維持するTier1筆頭。複数バージョンのトラファルガー・ローをフル採用し紫ドン加速で高コストローを早期展開。サーチと手札補充が安定した中速コントロール。',
    strength: '多数のローによる安定サーチ・紫ドン加速・高いカウンター密度',
    weakness: 'ライフ4で速攻に弱い。ロー以外のカードへの依存度が低くデッキが読まれやすい',
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
    description: 'PROS週間環境考察でTier1確定。イベント・ステージを実質カウンターとして扱えるリーダー効果が特徴。青黄ナミに有利を取れる数少ないデッキ。紫エネルには不利とする意見もあるが、プレイング次第で対応可能。4月以降も環境に残ると予測。',
    strength: 'イベント/ステージのカウンター化・青黄ナミへの有利・高い汎用性',
    weakness: '紫エネルに押し込まれるリスク。コンボ理解が必要',
  },
  {
    id: 'green_mihawk',
    name: '緑ミホーク',
    colors: ['緑'],
    style: 'midrange',
    avgCost: 3.8,
    life: 5,
    counterDense: false,
    tier: 2,
    description: 'OP14新規リーダー（単色緑）。剣士・王下七武海のシナジーでメタシェア13.0%を維持するTier2。ボニーのコスト操作でミホーク本体を早出しし、強力な除去イベントで盤面を制圧するミッドレンジ。ロシナンテや赤青エースにも互角に戦える。',
    strength: '剣士シナジー・ボニーによるコスト操作・高パワーキャラの早出し',
    weakness: 'カウンター密度が低く速攻には対処が難しい場面も',
  },
  {
    id: 'bluepurple_sanji',
    name: '青紫サンジ',
    colors: ['青', '紫'],
    style: 'midrange',
    avgCost: 3.2,
    life: 4,
    counterDense: true,
    tier: 2,
    description: 'OP12登場の青紫サンジリーダー。PROS週間考察3月第1週で「Tier1.5→Tier2へ下落」。2〜3月は複数大会優勝の実力派だったが、OP15環境で紫エネル・赤青ルーシーが台頭しポジションが後退。ヴィンスモーク兄弟シナジーは健在。',
    strength: '安定した手札補充・青紫の両色カードによる柔軟な展開',
    weakness: 'ライフ4で速攻に対して脆い。紫エネル・赤青ルーシー台頭でポジション後退',
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
    description: '4月1日プリン禁止後にTier2へ後退。禁止前は3月に複数フラッグシップ連続優勝の実力派だったが、プリン不採用を余儀なくされ構築の幅が縮小。ボルサリーノ+助けてクエーサーのコンボは健在で爆発力は残る。黒イム・赤青エースに有利。',
    strength: 'アマゾン・リリーシナジー・ボルサリーノコンボ・黒イム/赤青エースへの有利',
    weakness: '4月規制でプリン禁止→構築の自由度低下。紫エネルに不利',
  },
  {
    id: 'purple_enel',
    name: '紫エネル',
    colors: ['紫'],
    style: 'control',
    avgCost: 4.0,
    life: 5,
    counterDense: false,
    tier: 1,
    description: 'OP15リリース直後から「圧倒的Tier1」「15弾最強リーダー」と評される現環境No.1候補。ドン上限6枚・空島シナジーで早期に高コストエネルを展開する超高速ランプ。緑ミホーク・黒イム・ロシナンテに有利。そだ杯・フラッグシップ連続優勝中。',
    strength: 'ドン上限6枚の高速展開・空島統一シナジー・制圧後は覆しにくい盤面',
    weakness: '青黄ナミ・赤青ルーシーの高パワーカウンターに押し切られるリスク',
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
  {
    id: 'yellow_kalgara',
    name: '黄カルガラ',
    colors: ['黄'],
    style: 'midrange',
    avgCost: 3.2,
    life: 5,
    counterDense: true,
    tier: 2,
    description: 'OP15新リーダー。空島・シャンドラ軍シナジーでボルサリーノ+助けてクエーサーのコンボを搭載。あかなし杯3/12優勝・BCGFest準優勝など入賞実績あり。青黄ナミと似た動きをするが、リーダー効果で黄色統一しやすい。',
    strength: '空島シナジー・ボルサリーノコンボ・黄色統一による安定感',
    weakness: '紫エネルに先手を取られると展開を止められやすい',
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
              ? `${t1Char[0].card.name}・${t1Char[1]?.card.name ?? ''}などを展開して序盤の盤面を作る。先攻T1はリーダーアタック不可のためキャラ展開を優先しよう。`
              : 'ドン!!を貯め、T3以降の大きな動きに備える。先攻T1はリーダーアタック不可のため手札交換・キャラ展開を優先。',
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
  let charCounter1000Cards = 0; // +1000カウンターキャラ枚数
  let charCounter2000Cards = 0; // +2000カウンターキャラ枚数
  let eventCounterCards = 0;
  let mainEventCards = 0;   // 【メイン】イベント（除去・ドロー・サーチ系）
  let triggerCards = 0;
  let highCostEventCards = 0; // コスト3以上のイベント（ドローリーダー用）

  deck.forEach(({ card, count }) => {
    if (card.card_type === 'CHARACTER' && card.counter) {
      charCounterValue += card.counter * count;
      charCounterCards += count;
      if (card.counter === 1000) charCounter1000Cards += count;
      else if (card.counter === 2000) charCounter2000Cards += count;
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
    charCounterValue, charCounterCards,
    charCounter1000Cards, charCounter2000Cards, // 1000/2000別内訳
    eventCounterCards, mainEventCards, triggerCards,
    highCostEventCards,
    lowCost, midCost, highCost, lowPct,
    charCount, eventCount,
    leaderRules,
    advice,
  };
}

/**
 * デッキ固有の勝ち筋・攻め方を生成する
 * リーダー効果・4積みコアピース・フィニッシャーから具体的な戦略を提示する
 */
export function generateWinConditions(deck, leader) {
  if (!leader || !deck.length) return [];
  const leaderRules = getLeaderRules(leader);
  const ef = leader.effect || '';
  const conditions = [];

  const total = deck.reduce((s, e) => s + e.count, 0);
  const avgCost = total > 0
    ? deck.reduce((s, e) => s + (e.card.cost ?? 0) * e.count, 0) / total
    : 0;

  // 4積みキャラ（コアピース）
  const coreChars = deck
    .filter(e => e.count >= 4 && e.card.card_type === 'CHARACTER')
    .sort((a, b) => (a.card.cost ?? 0) - (b.card.cost ?? 0));

  // 4積みイベント
  const coreEvents = deck
    .filter(e => e.count >= 4 && e.card.card_type === 'EVENT')
    .sort((a, b) => (b.card.cost ?? 0) - (a.card.cost ?? 0));

  // フィニッシャー（コスト7以上のキャラ）
  const finishers = deck
    .filter(e => (e.card.cost ?? 0) >= 7 && e.card.card_type === 'CHARACTER')
    .sort((a, b) => (b.card.cost ?? 0) - (a.card.cost ?? 0));

  // ブロッカー
  const blockers = deck.filter(e =>
    e.card.card_type === 'CHARACTER' && /【ブロッカー】/.test(e.card.effect || '')
  );

  // カウンター密度
  const counterTotal = deck.reduce((s, e) => {
    const has = e.card.counter || (e.card.card_type === 'EVENT' && e.card.effect?.includes('【カウンター】'));
    return s + (has ? e.count : 0);
  }, 0);
  const counterDensity = counterTotal / total;

  // 低コスト展開キャラ（コスト1〜2）
  const earlyChars = coreChars.filter(e => (e.card.cost ?? 0) <= 2);
  // 中コスト展開キャラ（コスト3〜4）
  const midChars = coreChars.filter(e => (e.card.cost ?? 0) >= 3 && (e.card.cost ?? 0) <= 4);
  // 高コストフィニッシャー（コスト5〜6で4積み）
  const bigChars = coreChars.filter(e => (e.card.cost ?? 0) >= 5);

  // ── 1. リーダー効果をフル活用した中核戦略 ──
  if (leaderRules.eventIsStrength) {
    const minCost = leaderRules.eventDrawMinCost ?? 3;
    const hiEvts = deck
      .filter(e => e.card.card_type === 'EVENT' && (e.card.cost ?? 0) >= minCost)
      .sort((a, b) => b.count - a.count);
    if (hiEvts.length > 0) {
      conditions.push({
        icon: '⚡',
        title: 'リーダー効果を毎ターン発動する',
        body: `自ターンにコスト${minCost}以上のイベントを必ず1枚発動して1ドローを確保。${hiEvts[0].card.name}などを積極的に回転させて手札を常に潤沢に保つ。「イベントを使う→ドロー→また使う」の流れを維持できれば手札差で圧倒できる。`,
      });
    }
  } else if (leaderRules.eventAsCounter) {
    const mainEvts = deck.filter(e => e.card.card_type === 'EVENT' && !e.card.effect?.includes('【カウンター】'));
    conditions.push({
      icon: '⚡',
      title: 'イベントをカウンターに転用して手札効率を最大化する',
      body: `手札のイベント・ステージを守りのカウンターとして使える。${mainEvts[0]?.card.name ?? 'イベントカード'}は「攻めに使うか守りに使うか」を都度選択できるため、相手の読みを外しながら手札消費ゼロに近い守りが可能。手札がほぼ全てカウンターとして機能する状態を維持することが最大の強み。`,
    });
  } else if (leaderRules.lifeDrawOnDamage) {
    conditions.push({
      icon: '⚡',
      title: 'ライフを受けながら手札を充実させる',
      body: `ライフが削られるたびにドローできるため、序盤はあえてライフで受け入れて手札を厚くする。ライフ3〜4枚が削れた時点で手札が十分充実しているはず。そのタイミングで大型キャラを一気に展開して逆転を狙う。ライフ0でも手札が豊富なら戦える。`,
    });
  } else if (leaderRules.maxDon != null) {
    const maxD = leaderRules.maxDon;
    conditions.push({
      icon: '⚡',
      title: `ドン${maxD}枚上限を活かした速攻展開`,
      body: `ドン上限${maxD}枚のため、通常より早くドンが枯渇する。【起動メイン】でドンを一気に消費するタイミングを計算して「ドンが枯れる前に勝利する」プランを徹底する。序盤にドンを無駄遣いせず、フィニッシュターンに全力投入するのが鉄則。`,
    });
  } else if (leaderRules.donAccelerate) {
    conditions.push({
      icon: '⚡',
      title: 'ドン加速で相手より2ターン早く動く',
      body: `毎ターンのドン加速で相手より高コストキャラを先に展開できる。このテンポ差が積み重なると盤面は圧倒的優位に。加速したドンを絶対に余らせないよう、常に高コストキャラとのバランスを意識してデッキを組むこと。`,
    });
  } else if (leaderRules.hasBounce) {
    conditions.push({
      icon: '⚡',
      title: 'バウンスで相手の展開コストを強制する',
      body: `相手が苦労して展開した大型キャラを手札に戻すことで、再度コストを要求できる。バウンスは「除去」と異なりトラッシュに置かないため相手の手札が増える。手札が増えた相手は守りに余裕ができるため、バウンス後は即座に追撃して手札を削り切ることが重要。`,
    });
  }

  // ── 2. フィニッシュルート ──
  if (finishers.length > 0) {
    const fin = finishers[0];
    const finT = Math.ceil(fin.card.cost / 2);
    conditions.push({
      icon: '🏆',
      title: `${fin.card.name}でのフィニッシュ`,
      body: `コスト${fin.card.cost}の${fin.card.name}がフィニッシャー。T${finT}以降、相手のライフが3以下になったら投入して一気に詰める。${blockers.length >= 4 ? `${blockers[0].card.name}などブロッカーで盤面を守りながら` : 'アタッカーを複数展開しながら'}最後は全力アタックで畳み掛ける。`,
    });
  } else if (bigChars.length > 0) {
    const bc = bigChars[0];
    conditions.push({
      icon: '🏆',
      title: `${bc.card.name}での中盤制圧→フィニッシュ`,
      body: `コスト${bc.card.cost}の${bc.card.name}（×${bc.count}）で中盤から盤面を制圧。4積みしているため引き込みやすく、複数体並べることで相手のカウンターを分散させて突破力を高める。`,
    });
  }

  // ── 3. 序盤の動き ──
  if (earlyChars.length >= 2) {
    conditions.push({
      icon: '🔰',
      title: '序盤の盤面形成',
      body: `T1〜T2は${earlyChars.slice(0, 2).map(e => `${e.card.name}（${e.card.cost}C）`).join('・')}で盤面を作る。低コストの4積みカードを早期に並べて相手より先にアタック回数を稼ぎ、カウンターリソースを削り始める。`,
    });
  } else if (midChars.length >= 1) {
    conditions.push({
      icon: '🔰',
      title: '序盤の動き',
      body: `T3〜T4から${midChars.slice(0, 2).map(e => `${e.card.name}（${e.card.cost}C）`).join('・')}で展開を加速。序盤はドンを貯めつつ相手の動きをカウンターで抑え、T3で一気に盤面を作るミッドレンジスタイル。`,
    });
  }

  // ── 4. 防御戦略 ──
  if (counterDensity >= 0.44) {
    conditions.push({
      icon: '🛡',
      title: 'カウンター密度を活かした長期戦',
      body: `カウンター密度${Math.round(counterDensity * 100)}%と非常に厚い。相手ライフが4以下になるまでカウンターを切らず、手札を溜め続ける。盤面が整ったタイミングで攻勢に転じれば、手札差で後半を制圧できる。`,
    });
  } else if (counterDensity < 0.3 && avgCost < 3.5) {
    conditions.push({
      icon: '🛡',
      title: '守りより展開速度で圧倒する',
      body: `カウンターは少なめだが、その分展開速度が高い。守りに手札を使わず展開に振り切ることで、相手が守りに回る前にライフを削り切るのが勝ちパターン。相手の攻撃は原則ライフで受けてカウンターを温存する。`,
    });
  }

  return conditions.slice(0, 4);
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
    eventType: 'flagship',
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
    eventType: 'flagship',
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
    eventType: 'flagship',
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
    eventType: 'flagship',
    tier: 2,
    colors: ['紫'],
    description: 'ドン加速と空島シナジーで高コストカードを早期展開。シェア13.1%・59勝記録のTier2筆頭。3/11・4/2と連続でフラッグシップを制覇。',
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
    eventType: 'flagship',
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
  {
    id: 'flagship_2026_bluepurple_luffy',
    name: '青紫ルフィ',
    leaderCard: 'OP11-040',
    date: '2026/2/23',
    event: 'フラッグシップバトル優勝',
    eventType: 'flagship',
    tier: 1,
    colors: ['青', '紫'],
    description: '青のバウンス除去と紫のドン加速を融合したコントロール。手札から高コストキャラを早期展開しつつ盤面を制圧する。OP15環境でも安定した勝率を誇る上位デッキ。',
    deck: [
      { cardNumber: 'OP13-043', count: 4 },
      { cardNumber: 'ST18-001', count: 4 },
      { cardNumber: 'OP05-067', count: 4 },
      { cardNumber: 'EB01-061', count: 4 },
      { cardNumber: 'OP06-047', count: 1 },
      { cardNumber: 'OP11-054', count: 4 },
      { cardNumber: 'OP06-119', count: 4 },
      { cardNumber: 'OP01-070', count: 4 },
      { cardNumber: 'P-107',    count: 4 },
      { cardNumber: 'OP08-076', count: 4 },
      { cardNumber: 'OP04-056', count: 4 },
      { cardNumber: 'OP11-080', count: 4 },
      { cardNumber: 'OP09-078', count: 4 },
      { cardNumber: 'OP01-119', count: 1 },
    ],
  },
  {
    id: 'nonofficial_2026_blueyellow_hancock',
    name: '青黄ハンコック',
    leaderCard: 'OP14-041',
    date: '2026/3/26',
    event: 'あかなし杯（非公認大会）優勝',
    eventType: 'nonofficial',
    tier: 2,
    colors: ['青', '黄'],
    description: 'アマゾン・リリー軍団のシナジーで爆発的な攻撃力を発揮。ST17-004ハンコックをはじめアマゾン・リリー特徴持ちを並べて高パワーアタックを連発。OP14環境で最も爆発力があると評される。',
    deck: [
      { cardNumber: 'OP14-103', count: 4 },
      { cardNumber: 'EB03-023', count: 4 },
      { cardNumber: 'OP08-050', count: 3 },
      { cardNumber: 'OP14-113', count: 4 },
      { cardNumber: 'ST17-004', count: 4 },
      { cardNumber: 'OP15-113', count: 4 },
      { cardNumber: 'OP14-114', count: 4 },
      { cardNumber: 'OP14-105', count: 4 },
      { cardNumber: 'EB04-058', count: 4 },
      { cardNumber: 'OP14-107', count: 4 },
      { cardNumber: 'OP14-112', count: 4 },
      { cardNumber: 'OP14-104', count: 3 },
      { cardNumber: 'OP07-115', count: 4 },
    ],
  },
  {
    id: 'flagship_2026_purpleyellow_rosinante',
    name: '紫黄ロシナンテ',
    leaderCard: 'OP12-061',
    date: '2026/3/15',
    event: 'フラッグシップバトル優勝',
    eventType: 'flagship',
    tier: 1,
    colors: ['紫', '黄'],
    description: 'トラファルガー・ロー6種類を軸に紫黄ドンでフルサポート。シェア18.4%・週次ランキング1位のTier1筆頭。P-093/P-088の高カウンターローが守備の要。cardrush.media 3/15フラッグシップ優勝レシピ準拠。',
    deck: [
      { cardNumber: 'OP10-065',  count: 4 },
      { cardNumber: 'OP09-069',  count: 4 },
      { cardNumber: 'OP12-108',  count: 4 },
      { cardNumber: 'ST18-001',  count: 3 },
      { cardNumber: 'OP11-106',  count: 2 },
      { cardNumber: 'OP12-112',  count: 3 },
      { cardNumber: 'P-093',     count: 4 },
      { cardNumber: 'P-088',     count: 4 },
      { cardNumber: 'OP12-073',  count: 4 },
      { cardNumber: 'EB03-062',  count: 4 },
      { cardNumber: 'EB04-038',  count: 4 },
      { cardNumber: 'OP10-119',  count: 1 },
      { cardNumber: 'ST10-010',  count: 1 },
      { cardNumber: 'OP12-115',  count: 4 },
      { cardNumber: 'OP05-077',  count: 2 },
      { cardNumber: 'OP07-076',  count: 2 },
    ],
  },
  {
    id: 'nonofficial_2026_bluepurple_sanji',
    name: '青紫サンジ',
    leaderCard: 'OP12-041',
    date: '2026/2/26',
    event: 'あかなし杯（非公認大会）優勝',
    eventType: 'nonofficial',
    tier: 1,
    colors: ['青', '紫'],
    description: 'ヴィンスモーク兄弟とサンジのシナジーで安定した展開。紫のドン加速+青のバウンスで柔軟に対応。2月〜3月に複数大会を制したTier1。平均予算11,600円の組みやすいデッキ。',
    deck: [
      { cardNumber: 'OP09-078',  count: 4 },
      { cardNumber: 'OP12-079',  count: 4 },
      { cardNumber: 'OP12-060',  count: 4 },
      { cardNumber: 'OP13-043',  count: 4 },
      { cardNumber: 'OP07-062',  count: 4 },
      { cardNumber: 'OP06-068',  count: 4 },
      { cardNumber: 'OP12-063',  count: 4 },
      { cardNumber: 'OP07-064',  count: 4 },
      { cardNumber: 'OP09-065',  count: 4 },
      { cardNumber: 'OP10-065',  count: 4 },
      { cardNumber: 'ST18-001',  count: 4 },
      { cardNumber: 'EB03-036',  count: 4 },
      { cardNumber: 'OP14-063',  count: 2 },
    ],
  },
  {
    id: 'flagship_2026_purple_doflamingo',
    name: '紫ドフラミンゴ',
    leaderCard: 'OP14-060',
    date: '2026/3/23',
    event: 'フラッグシップバトル優勝',
    eventType: 'flagship',
    tier: 2,
    colors: ['紫'],
    description: 'アタック対象をドンキホーテ海賊団に変えるリーダー効果で盤面を守りながらコスト8〜10の大型ドフラミンゴで制圧。3月23日フラッグシップ優勝。約8,130円の低予算構成。',
    deck: [
      { cardNumber: 'OP14-069',  count: 2 },
      { cardNumber: 'OP10-071',  count: 4 },
      { cardNumber: 'PRB02-011', count: 4 },
      { cardNumber: 'OP10-065',  count: 4 },
      { cardNumber: 'OP14-063',  count: 4 },
      { cardNumber: 'OP14-067',  count: 4 },
      { cardNumber: 'OP12-076',  count: 4 },
      { cardNumber: 'OP14-071',  count: 4 },
      { cardNumber: 'ST18-001',  count: 4 },
      { cardNumber: 'EB03-036',  count: 4 },
      { cardNumber: 'OP05-077',  count: 4 },
      { cardNumber: 'OP09-069',  count: 4 },
      { cardNumber: 'OP10-072',  count: 2 },
    ],
  },
  // ── 以下、同リーダーの複数型 ──
  {
    id: 'nonofficial_2026_blueyellow_nami_v2',
    name: '青黄ナミ（キッド型）',
    leaderCard: 'OP11-041',
    date: '2026/4/2',
    event: 'あかなし杯（非公認大会）優勝',
    eventType: 'nonofficial',
    tier: 1,
    colors: ['青', '黄'],
    description: 'ユースタス・キッド×4を軸にした速攻型ナミ。EB04-061ルフィ・OP15-047サンジ・PRB02-008マルコでフィニッシュ力を高める。あかなし杯4/2優勝。フラッグシップ型より攻撃的な構成。',
    deck: [
      { cardNumber: 'OP06-106',   count: 4 },
      { cardNumber: 'OP11-106',   count: 4 },
      { cardNumber: 'P-096',      count: 4 },
      { cardNumber: 'EB03-053',   count: 4 },
      { cardNumber: 'EB04-058',   count: 4 },
      { cardNumber: 'EB03-055',   count: 4 },
      { cardNumber: 'OP13-042',   count: 4 },
      { cardNumber: 'OP10-112',   count: 4 },
      { cardNumber: 'OP12-119',   count: 4 },
      { cardNumber: 'EB04-061',   count: 2 },
      { cardNumber: 'OP15-047',   count: 2 },
      { cardNumber: 'PRB02-008',  count: 2 },
      { cardNumber: 'OP12-112',   count: 2 },
      { cardNumber: 'OP07-115',   count: 4 },
      { cardNumber: 'OP06-058',   count: 2 },
    ],
  },
  {
    id: 'championship_2026_blueyellow_nami_v3',
    name: '青黄ナミ（菊之丞型）',
    leaderCard: 'OP11-041',
    date: '2026/3/21',
    event: 'CS BCGFest予選準優勝',
    eventType: 'cs',
    tier: 2,
    colors: ['青', '黄'],
    description: '菊之丞×4採用で序盤サーチを厚くした構成。ベビー５×4・ゴムゴムの黄金回転弾×2でカウンターを補充。CS BCGFest予選3/21準優勝。フラッグシップ型との差別化がポイント。',
    deck: [
      { cardNumber: 'OP06-106',   count: 4 },
      { cardNumber: 'OP11-106',   count: 4 },
      { cardNumber: 'P-096',      count: 4 },
      { cardNumber: 'OP06-104',   count: 4 },
      { cardNumber: 'OP06-047',   count: 1 },
      { cardNumber: 'OP08-050',   count: 2 },
      { cardNumber: 'OP12-112',   count: 4 },
      { cardNumber: 'EB03-053',   count: 4 },
      { cardNumber: 'EB04-058',   count: 4 },
      { cardNumber: 'EB03-055',   count: 4 },
      { cardNumber: 'OP12-119',   count: 4 },
      { cardNumber: 'OP13-042',   count: 4 },
      { cardNumber: 'EB04-061',   count: 1 },
      { cardNumber: 'OP07-115',   count: 4 },
      { cardNumber: 'OP15-116',   count: 2 },
    ],
  },
  {
    id: 'nonofficial_2026_purple_enel_v2',
    name: '紫エネル（サンジ型・神避）',
    leaderCard: 'OP15-058',
    date: '2026/3/11',
    event: 'そだ杯（非公認大会）優勝',
    eventType: 'nonofficial',
    tier: 2,
    colors: ['紫'],
    description: 'サンジ×4を採用しカウンター値を補充したエネル。神避×2でラッシュ対策を強化。そだ杯3/11優勝。OP10-075水晶型との違いはサンジ+プリン採用でカウンター密度を高める点。',
    deck: [
      { cardNumber: 'OP12-071',   count: 4 },
      { cardNumber: 'OP15-066',   count: 4 },
      { cardNumber: 'OP15-067',   count: 4 },
      { cardNumber: 'OP15-061',   count: 4 },
      { cardNumber: 'OP15-071',   count: 4 },
      { cardNumber: 'OP07-064',   count: 4 },
      { cardNumber: 'OP15-060',   count: 4 },
      { cardNumber: 'OP15-118',   count: 4 },
      { cardNumber: 'OP15-077',   count: 4 },
      { cardNumber: 'OP15-075',   count: 4 },
      { cardNumber: 'OP15-076',   count: 4 },
      { cardNumber: 'OP15-078',   count: 4 },
      { cardNumber: 'OP13-076',   count: 2 },
    ],
  },
  {
    id: 'nonofficial_2026_purple_enel_v3',
    name: '紫エネル（サンジ型・ガンマナイフ）',
    leaderCard: 'OP15-058',
    date: '2026/3/4',
    event: 'そだ杯（非公認大会）優勝',
    eventType: 'nonofficial',
    tier: 2,
    colors: ['紫'],
    description: 'サンジ×4＋ガンマナイフ×2の除去強化型エネル。そだ杯3/4優勝。神避型と比べてガンマナイフで5コスト以下キャラへの除去力を強化した形。どちらを選ぶかはメタに依存。',
    deck: [
      { cardNumber: 'OP12-071',   count: 4 },
      { cardNumber: 'OP15-066',   count: 4 },
      { cardNumber: 'OP15-067',   count: 4 },
      { cardNumber: 'OP15-061',   count: 4 },
      { cardNumber: 'OP15-071',   count: 4 },
      { cardNumber: 'OP07-064',   count: 4 },
      { cardNumber: 'OP15-060',   count: 4 },
      { cardNumber: 'OP15-118',   count: 4 },
      { cardNumber: 'OP15-077',   count: 4 },
      { cardNumber: 'OP15-075',   count: 4 },
      { cardNumber: 'OP15-076',   count: 4 },
      { cardNumber: 'OP15-078',   count: 4 },
      { cardNumber: 'OP05-077',   count: 2 },
    ],
  },
];
