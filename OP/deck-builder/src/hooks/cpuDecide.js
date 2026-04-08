// ─────────────────────────────────────────────────────────────────────
// cpuDecide.js — CPU AI decision engine  v3  (Phase 2: 脅威スコア＋フェーズ適応＋Greedy DON)
// ONE PIECE TCG ルールベースAI
//
// 設計方針（Phase 2 追加事項）
//   ⑥ ゲームフェーズ検出 (early/mid/late) で評価関数の重みを動的に変える
//   ⑦ 脅威スコア threatScore() でアタック対象を「コスト」だけでなく
//      ブロッカー・速攻・バニッシュなど特性込みで優先順位付け
//   ⑧ DON!! 配分をグリーディーBest-First に刷新
//      各配分候補の「期待価値 donValueFor()」を評価して最良から割り振る
//   ⑨ カウンタープレッシャー推定: 相手の手札が多い場合はアタック閾値を上げる
//   ⑩ リーダーパワーを scoreBoardState に組み込んでDON配分精度を向上
// ─────────────────────────────────────────────────────────────────────

// ─── リーダー固有の定数（useBattleState.jsでも参照）──────────────
// 黒イム OP13-079
export const IM_LEADER_ID             = 'OP13-079';
export const GOROUSEI_CARD_NUMBERS    = ['OP13-083', 'OP13-089', 'OP13-080', 'OP13-091', 'OP13-084'];
export const GOROUSEI_FINISHER_NUMBER = 'OP13-082';
export const KYO_NO_GYOKUZA_NUMBER    = 'OP13-099';
// 紫エネル OP15-058
export const ENEL_LEADER_ID          = 'OP15-058';
export const ENEL_6COST_CHARS        = ['OP15-060', 'OP15-118'];
export const ENEL_1COST_DRAW_CHARS   = ['OP15-061', 'OP15-063', 'OP15-066', 'OP15-067'];
// 青黄ナミ OP11-041
export const NAMI_LEADER_ID          = 'OP11-041';
// 赤青ルーシー OP15-002
export const LUCY_LEADER_ID          = 'OP15-002';
// 共通登場時効果カード
export const PERONA_CARD_NUMBER      = 'OP14-111'; // 黄ペローナ: 登場時/KO時 相手コスト6以下キャラアタック不可
export const ROBIN_EB03_NUMBER       = 'EB03-055'; // 黄ロビン7コスト: 登場時 ライフ→トラッシュ＋デッキ2枚→ライフ
export const ROBIN_OP15_NUMBER       = 'OP15-109'; // 黄ロビン7コスト(OP15): 登場時 ライフ→手札＋デッキ1枚→ライフ

// ─── ユーティリティ ────────────────────────────────────────────────
/** キャラの実効パワー（DON ボーナス込み、ターン所有者視点） */
function effectivePower(card, isOwnerTurn = true) {
  return (card.power || 0) + (isOwnerTurn ? (card.donAttached || 0) * 1000 : 0);
}

/** カードのコストパフォーマンス（パワー÷コスト、コスト0は特別扱い） */
function costEfficiency(card) {
  const cost = card.cost || 1;
  const power = card.power || 0;
  const blockerBonus = /【ブロッカー】/.test(card.effect || '') ? 1500 : 0;
  const rushBonus    = /【速攻】/.test(card.effect || '') ? 1000 : 0;
  return (power + blockerBonus + rushBonus) / cost;
}

// ─── ⑥ ゲームフェーズ検出 ────────────────────────────────────────
/**
 * ターン数からゲームフェーズを判定する
 * early  : ターン 1〜3  → 展開重視
 * mid    : ターン 4〜7  → 除去＋プレッシャー
 * late   : ターン 8+    → フィニッシュ狙い
 */
function getGamePhase(turn) {
  if (turn <= 3) return 'early';
  if (turn <= 7) return 'mid';
  return 'late';
}

// ─── イムリーダー専用ヘルパー ─────────────────────────────────────
/** CPUがイムリーダーかどうかを判定 */
function isImLeader(cpuSide) {
  return cpuSide?.leader?.card_number === IM_LEADER_ID;
}

/** トラッシュ内の異なる名前のパワー5000《五老星》の数を数える */
function countUniqueGorouseiInTrash(trash) {
  const seen = new Set();
  for (const c of (trash || [])) {
    if (
      c.card_type === 'CHARACTER' &&
      (c.power || 0) === 5000 &&
      (c.traits || []).includes('五老星') &&
      !seen.has(c.name)
    ) {
      seen.add(c.name);
    }
  }
  return seen.size;
}

/**
 * イムリーダー専用カードプレイ決定
 * 五老星キャラを積極的に登場させ、条件が揃えばOP13-082フィニッシャーを出す
 */
function decideImCardPlays(cpuSide, _playerSide, _turn) {
  const { hand, field, donActive, trash } = cpuSide;
  const playDecisions = [];
  let remainingDon = donActive;
  const maxField = 5;

  // OP13-082起動条件: トラッシュに3体以上の異なる五老星(パワー5000)がいるか
  const uniqueGorouseiInTrash = countUniqueGorouseiInTrash(trash);
  const canUseFinisher = uniqueGorouseiInTrash >= 3;

  const candidates = hand
    .filter(c => c.card_type === 'CHARACTER' && (c.cost || 0) <= remainingDon)
    .map(c => {
      const isGorousei =
        GOROUSEI_CARD_NUMBERS.includes(c.card_number) || (c.traits || []).includes('五老星');
      const isFinisher = c.card_number === GOROUSEI_FINISHER_NUMBER;
      return { card: c, isGorousei, isFinisher, cost: c.cost || 0 };
    });

  if (candidates.length === 0) return { playDecisions, remainingDon };

  // 優先度: フィニッシャー（条件達成時）> 五老星（コスト高順）> その他
  candidates.sort((a, b) => {
    const aFin = a.isFinisher && canUseFinisher;
    const bFin = b.isFinisher && canUseFinisher;
    if (aFin && !bFin) return -1;
    if (bFin && !aFin) return 1;
    if (a.isGorousei && !b.isGorousei) return -1;
    if (b.isGorousei && !a.isGorousei) return 1;
    return b.cost - a.cost;
  });

  for (const { card, cost } of candidates) {
    if (field.length + playDecisions.length >= maxField) break;
    if (cost > remainingDon) continue;
    playDecisions.push({ type: 'play', uid: card._uid, cost });
    remainingDon -= cost;
  }

  return { playDecisions, remainingDon };
}

// ─── 紫エネル専用カードプレイ ─────────────────────────────────────
/**
 * エネル専用: コスト1ドロー系キャラを優先してから6コストエネルを展開
 * DON!!デッキが6枚のため、高コストより低コスト展開を先行させる
 */
function decideEnelCardPlays(cpuSide, _playerSide, _turn) {
  const { hand, field, donActive } = cpuSide;
  const playDecisions = [];
  let remainingDon = donActive;
  const maxField = 5;

  const candidates = hand
    .filter(c => c.card_type === 'CHARACTER' && (c.cost || 0) <= remainingDon)
    .map(c => {
      const is6Enel   = ENEL_6COST_CHARS.includes(c.card_number);
      const is1Draw   = ENEL_1COST_DRAW_CHARS.includes(c.card_number);
      const isOP15Pur = c.card_number?.startsWith('OP15') && (c.colors || []).includes('紫');
      return { card: c, is6Enel, is1Draw, isOP15Pur, cost: c.cost || 0 };
    });

  if (candidates.length === 0) return { playDecisions, remainingDon };

  // 優先度: コスト1ドロー系 > 6コストエネル > OP15紫 > その他（コスト高順）
  candidates.sort((a, b) => {
    if (a.is1Draw  && !b.is1Draw)  return -1;
    if (b.is1Draw  && !a.is1Draw)  return  1;
    if (a.is6Enel  && !b.is6Enel)  return -1;
    if (b.is6Enel  && !a.is6Enel)  return  1;
    if (a.isOP15Pur && !b.isOP15Pur) return -1;
    if (b.isOP15Pur && !a.isOP15Pur) return  1;
    return b.cost - a.cost;
  });

  for (const { card, cost } of candidates) {
    if (field.length + playDecisions.length >= maxField) break;
    if (cost > remainingDon) continue;
    playDecisions.push({ type: 'play', uid: card._uid, cost });
    remainingDon -= cost;
  }

  return { playDecisions, remainingDon };
}

// ─── 青黄ナミ専用カードプレイ ─────────────────────────────────────
/**
 * ナミ専用: バウンス効果を持つキャラを優先してコントロール展開
 */
function decideNamiCardPlays(cpuSide, _playerSide, turn) {
  const { hand, field, donActive } = cpuSide;
  const playDecisions = [];
  let remainingDon = donActive;
  const maxField = 5;
  const phase = getGamePhase(turn);

  const candidates = hand
    .filter(c => c.card_type === 'CHARACTER' && (c.cost || 0) <= remainingDon)
    .map(c => ({
      card: c,
      hasBounce: /手札に戻す/.test(c.effect || ''),
      hasRush:   /【速攻】/.test(c.effect || ''),
      isBlocker: /【ブロッカー】/.test(c.effect || '') || c._hasBlocker,
      cost:      c.cost || 0,
      efficiency: costEfficiency(c),
    }));

  if (candidates.length === 0) return { playDecisions, remainingDon };

  // 優先度: バウンス > 速攻 > ブロッカー > コスト高順
  candidates.sort((a, b) => {
    if (a.hasBounce && !b.hasBounce) return -1;
    if (b.hasBounce && !a.hasBounce) return  1;
    if (a.hasRush   && !b.hasRush)   return -1;
    if (b.hasRush   && !a.hasRush)   return  1;
    if (a.isBlocker && !b.isBlocker) return -1;
    if (b.isBlocker && !a.isBlocker) return  1;
    return b.cost - a.cost;
  });

  const effThreshold = phase === 'early' ? 600 : 1000;
  for (const { card, cost, efficiency, hasBounce } of candidates) {
    if (field.length + playDecisions.length >= maxField) break;
    if (cost > remainingDon) continue;
    // バウンス持ちは効率チェックを緩和
    const isLowValue = !hasBounce && efficiency < effThreshold && remainingDon - cost < 2;
    if (isLowValue && playDecisions.length > 0) continue;
    playDecisions.push({ type: 'play', uid: card._uid, cost });
    remainingDon -= cost;
  }

  return { playDecisions, remainingDon };
}

// ─── 赤青ルーシー専用カードプレイ ────────────────────────────────
/**
 * ルーシー専用: 速攻・ブロッカー優先でキャラ展開
 * イベントプレイはuseBattleState.js側で別途処理する
 */
function decideLucyCardPlays(cpuSide, _playerSide, _turn) {
  const { hand, field, donActive } = cpuSide;
  const playDecisions = [];
  let remainingDon = donActive;
  const maxField = 5;

  const candidates = hand
    .filter(c => c.card_type === 'CHARACTER' && (c.cost || 0) <= remainingDon)
    .map(c => ({
      card: c,
      hasRush:   /【速攻】/.test(c.effect || ''),
      isBlocker: /【ブロッカー】/.test(c.effect || '') || c._hasBlocker,
      cost:      c.cost || 0,
    }));

  if (candidates.length === 0) return { playDecisions, remainingDon };

  // 優先度: 速攻 > ブロッカー > コスト高順
  candidates.sort((a, b) => {
    if (a.hasRush   && !b.hasRush)   return -1;
    if (b.hasRush   && !a.hasRush)   return  1;
    if (a.isBlocker && !b.isBlocker) return -1;
    if (b.isBlocker && !a.isBlocker) return  1;
    return b.cost - a.cost;
  });

  for (const { card, cost } of candidates) {
    if (field.length + playDecisions.length >= maxField) break;
    if (cost > remainingDon) continue;
    playDecisions.push({ type: 'play', uid: card._uid, cost });
    remainingDon -= cost;
  }

  return { playDecisions, remainingDon };
}

// ─── ⑦ 脅威スコア ────────────────────────────────────────────────
/**
 * カードの「脅威度」を数値化する（除去・アタック優先順位に使用）
 *
 * 評価要素:
 *   - パワー × 0.4  … 純粋な打点
 *   - コスト × 700  … 盤面残留価値（高コストを除去すると大きなアドバンテージ）
 *   - ブロッカー    … 防御壁として非常に厄介 (+2500)
 *   - 速攻          … 即時アタック可能で脅威 (+1200)
 *   - バニッシュ    … トリガー無効化で危険 (+1800)
 *   - ダブルアタック … 2回ダメージで危険 (+1500)
 *   - トリガー      … 予期しない効果のリスク (+600)
 */
function threatScore(card) {
  const power = card.power || 0;
  const cost  = card.cost  || 0;
  const eff   = card.effect || '';
  const isBlocker    = /【ブロッカー】/.test(eff)   || card._hasBlocker;
  const hasRush      = /【速攻】/.test(eff)         || card._hasRush;
  const hasBanish    = /【バニッシュ】/.test(eff);
  const hasDoubleAtk = /【ダブルアタック】/.test(eff);
  const hasTrigger   = /【トリガー】/.test(eff);

  let score = power * 0.4 + cost * 700;
  if (isBlocker)    score += 2500;
  if (hasRush)      score += 1200;
  if (hasBanish)    score += 1800;
  if (hasDoubleAtk) score += 1500;
  if (hasTrigger)   score += 600;

  return score;
}

// ─── ⑧ DON 配分補助関数 ──────────────────────────────────────────
/**
 * DON 1枚をターゲットに付けた場合の期待価値を算出する
 * （KO 実現値 + プレッシャー値 + 閾値越えボーナス）
 *
 * @param card          対象カード（リーダーまたはキャラ）
 * @param uid           対象 UID ('leader' or _uid)
 * @param playerSide    プレイヤー側の状態
 * @param simDonExtra   今回のシミュレーションで既に割り当てた追加 DON 枚数
 * @param isLeader      リーダーかどうか
 * @param playerLife    相手ライフ枚数（緊急度）
 */
function donValueFor(card, uid, playerSide, simDonExtra, isLeader, playerLife) {
  const currentPow = effectivePower(card, true) + simDonExtra * 1000;
  const newPow     = currentPow + 1000;

  // ── KO 実現価値: このDONによって相手レストキャラを倒せるか ──
  const restTargets = playerSide.field.filter(c => c.tapped);
  let koValue = 0;
  for (const rt of restTargets) {
    const defPow = rt.power || 0;
    if (newPow > defPow && currentPow <= defPow) {
      // このDONがKOを「可能」にする！
      koValue = Math.max(koValue, threatScore(rt) * 1.2);
    }
  }

  // ── プレッシャー価値: 相手ライフへのプレッシャー ──
  let pressureValue = 600; // ベースライン
  if (isLeader) {
    if (playerLife <= 1) pressureValue = 2200; // フィニッシュ圏内は最優先
    else if (playerLife <= 2) pressureValue = 1500;
    else if (playerLife <= 3) pressureValue = 1000;
    else pressureValue = 700;
  }

  // ── 閾値越えボーナス: よく使われるカウンタラインを超えるか ──
  // （4000 / 5000 / 6000 / 7000 / 8000 / 10000 などが実効ライン）
  const thresholds = [4000, 5000, 6000, 7000, 8000, 10000, 12000];
  let thresholdBonus = 0;
  for (const t of thresholds) {
    if (newPow >= t && currentPow < t) {
      thresholdBonus = 900;
      break;
    }
  }

  return Math.max(koValue, pressureValue) + thresholdBonus;
}

/**
 * DON 配分シミュレーション用: 指定UID のカードに DON を追加したコピーを返す
 */
function simulateAddDon(cpuSide, targetUid, count) {
  if (targetUid === 'leader') {
    return {
      ...cpuSide,
      leader: { ...cpuSide.leader, donAttached: (cpuSide.leader.donAttached || 0) + count },
    };
  }
  return {
    ...cpuSide,
    field: cpuSide.field.map(c =>
      c._uid === targetUid
        ? { ...c, donAttached: (c.donAttached || 0) + count }
        : c
    ),
  };
}

// ─── ① 盤面評価関数（Phase 2: フェーズ適応 + リーダーパワー考慮）────
/**
 * 盤面状態をスコア化する（CPU 視点、高いほど CPU に有利）
 *
 * Phase 2 変更点:
 *   - ゲームフェーズごとに重みを切り替え
 *   - リーダーのパワーも盤面強度に反映（DON 配分のグリーディ計算用）
 *
 * @param {string} phase  'early' | 'mid' | 'late'  （省略時: 'mid'）
 */
export function scoreBoardState(cpuSide, playerSide, phase = 'mid') {
  const cpuFieldPow   = cpuSide.field.reduce((s, c) => s + effectivePower(c, true), 0);
  const cpuLeaderPow  = effectivePower(cpuSide.leader, true);
  const plFieldPow    = playerSide.field.reduce((s, c) => s + effectivePower(c, false), 0);
  const plLeaderPow   = effectivePower(playerSide.leader, false);
  const cpuBlockerCnt = cpuSide.field.filter(
    c => /【ブロッカー】/.test(c.effect || '') || c._hasBlocker
  ).length;

  // フェーズごとの重み係数
  // early: 手札・ブロッカー重視、フィールドパワーより展開スピード
  // mid  : バランス型
  // late : 相手ライフ削り・フィールドパワー最重視
  const weights = {
    early: {
      fieldPow: 0.7,  leaderPow: 0.35, hand: 650,
      enemyLife: -550, ownLife: 500,   don: 200,
      enemyField: 0.65, enemyLeader: 0.2, blocker: 1200,
    },
    mid: {
      fieldPow: 1.0,  leaderPow: 0.5,  hand: 500,
      enemyLife: -700, ownLife: 400,   don: 150,
      enemyField: 0.85, enemyLeader: 0.3, blocker: 800,
    },
    late: {
      fieldPow: 1.3,  leaderPow: 0.7,  hand: 350,
      enemyLife: -1000, ownLife: 250,  don: 100,
      enemyField: 1.1,  enemyLeader: 0.5, blocker: 500,
    },
  };
  const w = weights[phase] || weights.mid;

  return (
      cpuFieldPow     * w.fieldPow
    + cpuLeaderPow    * w.leaderPow
    + cpuSide.hand.length  * w.hand
    + playerSide.life.length * w.enemyLife
    + cpuSide.life.length   * w.ownLife
    + (cpuSide.donActive || 0) * w.don
    - plFieldPow      * w.enemyField
    - plLeaderPow     * w.enemyLeader
    + cpuBlockerCnt   * w.blocker
  );
}

// ─── ② カードプレイ選択（Phase 2: フェーズ対応）────────────────────
/**
 * 手札から登場させるカードの組み合わせを決定する
 *
 * Phase 2 変更点:
 *   - early フェーズでは効率閾値を下げて積極的に展開
 *   - late フェーズではコストが高いカードを強く優先
 */
function decideCardPlays(cpuSide, playerSide, turn) {
  const { hand, field, donActive } = cpuSide;
  const playDecisions = [];
  let remainingDon = donActive;
  const phase = getGamePhase(turn);

  const currentFieldCount = field.length;
  const maxField = 5;

  const needBlocker =
    cpuSide.life.length <= 2 &&
    !field.some(c => /【ブロッカー】/.test(c.effect || '') || c._hasBlocker);

  const candidates = hand
    .filter(c => c.card_type === 'CHARACTER' && (c.cost || 0) <= remainingDon)
    .map(c => ({
      card: c,
      efficiency: costEfficiency(c),
      isBlocker: /【ブロッカー】/.test(c.effect || '') || c._hasBlocker,
      hasRush:   /【速攻】/.test(c.effect || ''),
      cost:  c.cost  || 0,
      power: c.power || 0,
    }));

  if (candidates.length === 0) return { playDecisions, remainingDon };

  candidates.sort((a, b) => {
    if (needBlocker && a.isBlocker !== b.isBlocker) return a.isBlocker ? -1 : 1;
    if (a.hasRush !== b.hasRush) return a.hasRush ? -1 : 1;
    if (phase === 'late') {
      // late はコスト最大優先
      if (b.cost !== a.cost) return b.cost - a.cost;
    }
    if (Math.abs(a.efficiency - b.efficiency) > 500) return b.efficiency - a.efficiency;
    return b.cost - a.cost;
  });

  // フェーズごとの効率閾値: early は低くして展開優先
  const effThreshold = phase === 'early' ? 600 : phase === 'late' ? 1200 : 1000;

  for (const { card, cost } of candidates) {
    if (currentFieldCount + playDecisions.length >= maxField) break;
    if (cost > remainingDon) continue;

    const eff = costEfficiency(card);
    const isLowValue = eff < effThreshold && remainingDon - cost < 2;
    if (isLowValue && playDecisions.length > 0) continue;

    playDecisions.push({ type: 'play', uid: card._uid, cost });
    remainingDon -= cost;
  }

  return { playDecisions, remainingDon };
}

// ─── ③ DON!! 配分（Phase 2: グリーディーBest-First）────────────────
/**
 * DON!! の配分をグリーディーBest-First で決定する
 *
 * Phase 2 変更点:
 *   - KO ライン逆算 + 脅威スコアを組み合わせた donValueFor() で評価
 *   - 毎 DON ポイントごとに全対象の期待価値を比較して最良対象に割り振る
 *   - リーダーのパワーも評価に組み込み（ライフ残り枚数で緊急度調整）
 */
function decideDonAttachments(cpuSide, playerSide, remainingDon, playDecisions, turn) {
  if (remainingDon <= 0) return { donAttachments: [], remainingDon: 0 };

  const playerLife = playerSide.life.length;

  // 配分可能対象: アクティブなキャラ + アクティブなリーダー
  const targets = [
    ...cpuSide.field
      .filter(c => !c.tapped)
      .map(c => ({ card: c, uid: c._uid, isLeader: false })),
    ...(cpuSide.leader.tapped
      ? []
      : [{ card: cpuSide.leader, uid: 'leader', isLeader: true }]),
  ];

  if (targets.length === 0) return { donAttachments: [], remainingDon };

  // シミュレーション中の追加 DON カウント
  const simDon = {};
  targets.forEach(t => { simDon[t.uid] = 0; });

  let donLeft = remainingDon;

  // グリーディーループ: 1 DON ずつ最良対象に割り振る
  while (donLeft > 0) {
    let bestUid   = null;
    let bestValue = -Infinity;

    for (const { card, uid, isLeader } of targets) {
      const value = donValueFor(card, uid, playerSide, simDon[uid], isLeader, playerLife);
      if (value > bestValue) {
        bestValue = value;
        bestUid   = uid;
      }
    }

    if (bestUid !== null) simDon[bestUid]++;
    donLeft--;
  }

  // simDon をレスポンス形式に変換
  const donAttachments = Object.entries(simDon)
    .filter(([, count]) => count > 0)
    .map(([uid, count]) => ({ uid, count }));

  return { donAttachments, remainingDon: 0 };
}

// ─── ⑨ カウンタープレッシャー閾値 ────────────────────────────────
/**
 * 相手の手札枚数をもとに「このパワーなら攻撃する価値がある」閾値を返す
 *
 * 相手手札が多い → カウンターを持っている可能性が高い
 * → 攻撃に必要な最低パワーを引き上げ、無駄なアタックを減らす
 * ただし「カウンターを切らせる」意図でのアタックは有効なので過度には絞らない
 *
 * @returns {number} アタックを推奨する最低パワー
 */
function counterPressureThreshold(playerHandSize, playerLife) {
  if (playerLife <= 1) return 3000;   // フィニッシュ圏内: 何でも攻撃
  if (playerHandSize <= 2) return 4000; // 手札少ない: 通りやすい
  if (playerHandSize <= 4) return 5000; // 標準
  return 6000;                          // 手札多い: 高打点のみ
}

// ─── ④ アタック決定（Phase 2: 脅威スコア + カウンタープレッシャー）────
/**
 * アタック先を決定する
 *
 * Phase 2 変更点:
 *   - 相手キャラのソートを「コスト順」→「threatScore 順」に変更
 *   - カウンタープレッシャー閾値を取り入れ、非効率アタックを抑制
 *   - ゲームフェーズに応じたモード切り替え（early はブロッカー除去優先）
 *   - バニッシュ持ちは早期除去を強く優先
 */
function decideAttacks(cpuSide, playerSide, turn, playerOrder = 'first') {
  const attacks = [];
  // ターン1でアタック不可なのはCPUが先攻のとき（playerOrder === 'second'）のみ
  // CPUが後攻（playerOrder === 'first'）のターン1はアタック可能
  if (turn <= 1 && playerOrder === 'second') return attacks;

  const { field, leader } = cpuSide;
  const phase = getGamePhase(turn);

  const attackers = field.filter(
    c => !c.tapped && !c.cantAttack && (c._summonedTurn !== turn || c._hasRush || /【速攻】/.test(c.effect || ''))
  );
  const leaderCanAttack = !leader.tapped;

  // 脅威スコア順にソート（高脅威から優先除去）
  const restTargets = [...playerSide.field]
    .filter(c => c.tapped)
    .sort((a, b) => threatScore(b) - threatScore(a));

  const playerLife    = playerSide.life.length;
  const cpuLife       = cpuSide.life.length;
  const playerHand    = playerSide.hand?.length ?? 4; // 不明なら中央値

  const finishMode     = playerLife <= 1;
  const aggressiveMode = playerLife <= 3 && cpuLife >= 2;
  const defenseMode    = cpuLife <= 2;

  // カウンタープレッシャー閾値
  const minAtkPow = counterPressureThreshold(playerHand, playerLife);

  const usedTargetUids = new Set();

  // ── キャラアタック ──
  for (const atk of attackers) {
    const atkPow = effectivePower(atk, true);

    if (finishMode || aggressiveMode) {
      // フィニッシュ/アグレッシブ: リーダー直撃
      // ただしバニッシュ持ちのレストキャラがいれば先に除去（トリガー無効化リスク）
      const banishTgt = restTargets.find(
        t => !usedTargetUids.has(t._uid) &&
             /【バニッシュ】/.test(t.effect || '') &&
             atkPow > (t.power || 0)
      );
      if (banishTgt) {
        attacks.push({
          attackerUid: atk._uid, attackerType: 'character',
          targetUid: banishTgt._uid, targetType: 'character',
        });
        usedTargetUids.add(banishTgt._uid);
      } else {
        attacks.push({
          attackerUid: atk._uid, attackerType: 'character',
          targetUid: 'player-leader', targetType: 'leader',
        });
      }
      continue;
    }

    // early フェーズではブロッカー除去を最優先に
    const targetList = phase === 'early'
      ? [...restTargets].sort((a, b) => {
          const aIsBlock = /【ブロッカー】/.test(a.effect || '') ? 1 : 0;
          const bIsBlock = /【ブロッカー】/.test(b.effect || '') ? 1 : 0;
          if (aIsBlock !== bIsBlock) return bIsBlock - aIsBlock;
          return threatScore(b) - threatScore(a);
        })
      : restTargets;

    // 除去できる相手キャラを探す（脅威スコア高い順）
    let killed = false;
    for (const tgt of targetList) {
      if (usedTargetUids.has(tgt._uid)) continue;
      const defPow = tgt.power || 0;
      if (atkPow > defPow) {
        attacks.push({
          attackerUid: atk._uid, attackerType: 'character',
          targetUid: tgt._uid, targetType: 'character',
        });
        usedTargetUids.add(tgt._uid);
        killed = true;
        break;
      }
    }

    if (!killed) {
      if (defenseMode && restTargets.length > 0) continue;
      // カウンタープレッシャー閾値を超えていればリーダーへプレッシャー
      if (atkPow >= minAtkPow) {
        attacks.push({
          attackerUid: atk._uid, attackerType: 'character',
          targetUid: 'player-leader', targetType: 'leader',
        });
      }
    }
  }

  // ── リーダーアタック ──
  if (leaderCanAttack) {
    const ldrPow = effectivePower(leader, true);

    if (finishMode || aggressiveMode) {
      attacks.push({
        attackerUid: 'leader', attackerType: 'leader',
        targetUid: 'player-leader', targetType: 'leader',
      });
    } else {
      // 脅威度の高い相手キャラを優先除去
      const threatTgt = restTargets.find(
        t => !usedTargetUids.has(t._uid) && ldrPow > (t.power || 0)
      );
      if (threatTgt) {
        attacks.push({
          attackerUid: 'leader', attackerType: 'leader',
          targetUid: threatTgt._uid, targetType: 'character',
        });
        usedTargetUids.add(threatTgt._uid);
      } else if (!defenseMode || playerLife <= 3) {
        // カウンタープレッシャー閾値を確認
        if (ldrPow >= minAtkPow) {
          attacks.push({
            attackerUid: 'leader', attackerType: 'leader',
            targetUid: 'player-leader', targetType: 'leader',
          });
        }
      }
    }
  }

  return attacks;
}

// ─── メインエントリ ──────────────────────────────────────────────
/**
 * CPU のメインフェーズ全行動を決定する
 * @returns { playDecisions, donAttachments, attacks }
 */
export function cpuDecide(cpuSide, playerSide, turn, playerOrder = 'first') {
  const { leaderEffect } = cpuSide;
  const leaderCardNumber = cpuSide.leader?.card_number;

  // ① カードプレイ（リーダー固有ロジック）
  let cardPlaysResult;
  if      (leaderCardNumber === IM_LEADER_ID)   cardPlaysResult = decideImCardPlays(cpuSide, playerSide, turn);
  else if (leaderCardNumber === ENEL_LEADER_ID)  cardPlaysResult = decideEnelCardPlays(cpuSide, playerSide, turn);
  else if (leaderCardNumber === NAMI_LEADER_ID)  cardPlaysResult = decideNamiCardPlays(cpuSide, playerSide, turn);
  else if (leaderCardNumber === LUCY_LEADER_ID)  cardPlaysResult = decideLucyCardPlays(cpuSide, playerSide, turn);
  else                                            cardPlaysResult = decideCardPlays(cpuSide, playerSide, turn);
  const { playDecisions, remainingDon: donAfterPlay } = cardPlaysResult;

  // ② DON!! 配分（グリーディーBest-First）
  const { donAttachments } =
    decideDonAttachments(cpuSide, playerSide, donAfterPlay, playDecisions, turn);

  // ③ アタック（リーダー効果による禁止チェック含む）
  let attacks = decideAttacks(cpuSide, playerSide, turn, playerOrder);
  if (leaderEffect?.leaderCannotAttack) {
    attacks = attacks.filter(a => a.attackerType !== 'leader');
  }

  return { playDecisions, donAttachments, attacks };
}

// ─── ブロッカー判断（Phase 2: scoreBoardState による精緻化）────────
/**
 * ブロッカーを使うかどうかを決める
 *
 * Phase 2 変更点:
 *   - lethal (ライフ 0 になる攻撃) を厳密に判定
 *   - 残りライフと攻撃力で段階的に判断（Phase 1 より細かい閾値）
 *   - ブロッカーが複数いる場合: 最弱のブロッカーで受けて強力なブロッカーを温存
 *
 * @returns blockerUid or null
 */
export function cpuDecideBlocker(blockers, attackPower, leaderLife, cpuLeaderCardNumber) {
  if (blockers.length === 0) return null;

  // イムリーダーは五老星をブロッカーに使わない（トラッシュへ送り込むのが目標）
  if (cpuLeaderCardNumber === IM_LEADER_ID) return null;

  // ライフ残り 1 = 次に通ったらゲームオーバー → 必ずブロック
  const isLethal = leaderLife <= 1;

  // 段階的ブロック判断（Phase 2: より細かい閾値）
  const shouldBlock =
    isLethal ||
    (leaderLife <= 2 && attackPower >= 5000) ||  // Phase 1: 6000 → 5000 に引き下げ（より積極的に守る）
    (leaderLife <= 3 && attackPower >= 7000) ||  // Phase 1: 8000 → 7000 に引き下げ
    (leaderLife <= 4 && attackPower >= 10000);   // 新規: 高パワーアタックは早めにブロック

  if (!shouldBlock) return null;

  // ブロッカーが 1 体だけの場合: lethal でなければ温存
  if (blockers.length === 1 && !isLethal) return null;

  // 最も弱いブロッカーで受けて資源を節約
  // ただし lethal の場合は「確実に守れるブロッカー（パワー問わず）」を選ぶ
  return [...blockers]
    .sort((a, b) => (a.power || 0) - (b.power || 0))[0]._uid;
}

// ─── トリガー発動判断 ─────────────────────────────────────────────
/**
 * トリガー効果を発動するかどうか決める
 * CPU は原則として常に発動する
 */
export function cpuDecideTrigger(_card) {
  return true;
}
