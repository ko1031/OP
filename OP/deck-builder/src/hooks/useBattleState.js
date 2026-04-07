// ─────────────────────────────────────────────────────────────────────
// useBattleState.js — CPU対戦用ゲーム状態管理フック
// ─────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { LEADER_EFFECTS } from './useGameState';
import { cpuDecide, cpuDecideBlocker, cpuDecideTrigger } from './cpuDecide';

// ─── ユーティリティ ───────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function autoTapDon(side, cost) {
  if (!cost || cost <= 0) return side;
  const n = Math.min(cost, side.donActive);
  return { ...side, donActive: side.donActive - n, donTapped: side.donTapped + n };
}

// ステージカードによるコスト削減を考慮した実効コストを返す
// 例: 聖地マリージョア → 天竜人キャラ（コスト2以上）のコストを-1
function computeEffectiveCost(card, playerSide) {
  let cost = card.cost || 0;
  const stageName = playerSide.stage?.name || '';
  if (
    stageName.includes('聖地マリージョア') &&
    card.card_type === 'CHARACTER' &&
    cost >= 2 &&
    (card.traits || []).includes('天竜人')
  ) {
    cost = Math.max(0, cost - 1);
  }
  return cost;
}

function hasTrigger(card) {
  return /【トリガー】/.test(card?.effect || '');
}
function hasDoubleAttack(card) {
  return /【ダブルアタック】/.test(card?.effect || '');
}
function hasBanish(card) {
  return /【バニッシュ】/.test(card?.effect || '');
}

// ─── KO・場離れ耐性チェック ────────────────────────────────────────
// 「このキャラは相手の効果でKOされない」（テキスト先頭から判定）
function isImmuneToEffectKo(card) {
  return /^このキャラは相手の効果でKOされない/.test(card?.effect || '');
}
// 「このキャラは相手の効果で場を離れない」
function isImmuneToEffectLeave(card) {
  return /^このキャラは相手の効果で場を離れない/.test(card?.effect || '');
}
// バトルでKOされない（常時 or DON!!×1付きで）
// ※カードテキストは「ドン!!×1」(ASCII !)と「ドン‼×1」(U+203C)が混在するため両方対応
function isBattleKoImmune(card) {
  const e = card?.effect || '';
  if (/^このキャラはバトルでKOされない/.test(e)) return true;
  if (/【ドン[!!‼]{1,2}×1】このキャラはバトルでKOされない/.test(e) && (card?.donAttached || 0) >= 1) return true;
  return false;
}

// ─── 条件パワーバフ計算 ───────────────────────────────────────────
// ownSide: カードの持ち主のサイド、oppSide: 相手サイド
function getConditionalPowerBuff(card, ownSide, oppSide) {
  let bonus = 0;
  const e = card?.effect || '';
  if (!e) return 0;

  // 自分のライフがN枚以下
  const myLifeM = e.match(/自分のライフが(\d+)枚以下の場合、(?:[^\n。]*?)(?:このキャラ[はの](?:、)?(?:[^\n。]*?)?|このキャラは)パワー[＋+](\d+)/);
  if (myLifeM && ownSide.life.length <= parseInt(myLifeM[1])) bonus += parseInt(myLifeM[2]);

  // 相手のライフがN枚以上
  const oppLifeM = e.match(/相手のライフが(\d+)枚以上の場合、(?:[^\n。]*?)(?:このキャラ[はの](?:、)?(?:[^\n。]*?)?|このキャラは)パワー[＋+](\d+)/);
  if (oppLifeM && oppSide.life.length >= parseInt(oppLifeM[1])) bonus += parseInt(oppLifeM[2]);

  // 自分の手札がN枚以下
  const handLteM = e.match(/(?:自分の)?手札が(\d+)枚以下の場合、(?:[^\n。]*?)(?:このキャラ[はの](?:、)?(?:[^\n。]*?)?|このキャラは)パワー[＋+](\d+)/);
  if (handLteM && ownSide.hand.length <= parseInt(handLteM[1])) bonus += parseInt(handLteM[2]);

  // 自分のデッキがN枚以下
  const deckLteM = e.match(/自分のデッキが(\d+)枚以下の場合、(?:[^\n。]*?)(?:このキャラ[はの](?:、)?(?:[^\n。]*?)?|このキャラは)パワー[＋+](\d+)/);
  if (deckLteM && ownSide.deck.length <= parseInt(deckLteM[1])) bonus += parseInt(deckLteM[2]);

  // 自分の場のDON!!がN枚以上
  const donGteM = e.match(/自分の(?:場の)?(?:ドン‼|DON!!)が(\d+)枚以上(?:ある場合|の場合)、(?:[^\n。]*?)(?:このキャラ[はの](?:、)?(?:[^\n。]*?)?|このキャラは)パワー[＋+](\d+)/);
  if (donGteM) {
    const totalDon = (ownSide.donActive || 0) + (ownSide.donTapped || 0);
    if (totalDon >= parseInt(donGteM[1])) bonus += parseInt(donGteM[2]);
  }

  // 自分のレストのDON!!がN枚以上
  const donRestGteM = e.match(/自分のレストの(?:ドン‼|DON!!)が(\d+)枚以上(?:ある場合|の場合)、(?:[^\n。]*?)(?:このキャラ[はの](?:、)?(?:[^\n。]*?)?|このキャラは)パワー[＋+](\d+)/);
  if (donRestGteM && (ownSide.donTapped || 0) >= parseInt(donRestGteM[1])) bonus += parseInt(donRestGteM[2]);

  // 相手のレストキャラがN枚以上
  const oppRestCharM = e.match(/相手のレストのキャラが(\d+)枚以上いる場合、(?:[^\n。]*?)(?:このキャラ[はの](?:、)?(?:[^\n。]*?)?|このキャラは)パワー[＋+](\d+)/);
  if (oppRestCharM && oppSide.field.filter(x => x.tapped).length >= parseInt(oppRestCharM[1])) bonus += parseInt(oppRestCharM[2]);

  // トラッシュN枚につきパワー+M（リーダー条件あり）
  const trashPerM = e.match(/自分のトラッシュ(\d+)枚につき、(?:[^\n。]*?)(?:このキャラ[はの](?:、)?(?:[^\n。]*?)?|このキャラは)パワー[＋+](\d+)/);
  if (trashPerM) bonus += Math.floor((ownSide.trash?.length || 0) / parseInt(trashPerM[1])) * parseInt(trashPerM[2]);

  return bonus;
}

// 攻撃パワー計算（自分ターン中バフ・DON!!パワー込み）
function computeAttackPower(card, ownSide, oppSide) {
  let power = (card.power || 0) + (card.donAttached || 0) * 1000;
  const e = card.effect || '';

  // 手札N枚につきパワー+M（OP01-072 スマイリー等）
  const handPerM = e.match(/自分の手札(\d+)枚につき、このキャラはパワー[＋+](\d+)/);
  if (handPerM) power += Math.floor((ownSide.hand?.length || 0) / parseInt(handPerM[1])) * parseInt(handPerM[2]);

  // 【自分のターン中】レストDON!!N枚につきパワー+M（EB01-014 サンジ）
  const donRestPerM = e.match(/【自分のターン中】自分のレストのドン‼?(\d+)枚につき、このキャラは、?パワー[＋+](\d+)/);
  if (donRestPerM) power += Math.floor((ownSide.donTapped || 0) / parseInt(donRestPerM[1])) * parseInt(donRestPerM[2]);

  // 共通条件バフ
  power += getConditionalPowerBuff(card, ownSide, oppSide);
  return power;
}

// 防御パワー計算（相手ターン中バフ込み・DON!!パワーなし）
function computeDefensePower(card, ownSide, oppSide) {
  let power = card.power || 0;
  const e = card.effect || '';

  // 【相手のターン中】無条件パワー+N（OP10-011チョッパー等）
  const oppTurnSimpleM = e.match(/【相手のターン中】このキャラのパワー[＋+](\d+)/);
  if (oppTurnSimpleM) power += parseInt(oppTurnSimpleM[1]);

  // 【相手のターン中】レストの場合パワー+N（OP14-026光月おでん等）
  const oppTurnRestM = e.match(/【相手のターン中】このキャラがレストの場合、このキャラのパワー[＋+](\d+)/);
  if (oppTurnRestM && card.tapped) power += parseInt(oppTurnRestM[1]);

  // 【相手のターン中】自分のリーダーが〇〇の場合パワー+N（OP12-053等）はリーダー情報が必要なためスキップ

  // 共通条件バフ
  power += getConditionalPowerBuff(card, ownSide, oppSide);
  return power;
}

// ─── DON!!デッキ返却時効果の解析・適用 ───────────────────────────────
// 返却効果のメタ情報を解析
function parseDonReturnEffect(card) {
  const e = card?.effect || '';
  if (!e) return null;
  // マッチパターン: 自分のターン中/相手のターン中 + ターン1回 + ドン!!デッキに戻された時
  const m = e.match(
    /(【自分のターン中】|【相手のターン中】|)((?:【ターン1回】)?)自分の場のドン[!!‼]{1,2}(?:が(\d+)枚以上)?(?:が)?(?:自分の効果によって)?ドン[!!‼]{1,2}デッキに戻された時、([^。\n]+(?:。[^。\n]+)?)/
  );
  if (!m) return null;
  const turnCond = m[1]; // 「【自分のターン中】」「【相手のターン中】」または空
  const onceCond = m[2]; // 「【ターン1回】」または空
  const minCount = m[3] ? parseInt(m[3]) : 1; // 最低N枚以上（省略時=1）
  const actionText = m[4].trim();

  // アクション種別を解析（テキスト表記揺れに対応: 「を、」「を」両方）
  let action = null;
  const don = 'ドン[!!‼]{1,2}';
  if (new RegExp(`${don}デッキから、?${don}1枚まで(?:を、?)?アクティブで追加し、さらに1枚まで(?:を、?)?レストで追加`).test(actionText)) {
    action = 'don+active+rest'; // 2枚追加（アクティブ+レスト）
  } else if (new RegExp(`${don}デッキから、?${don}1枚まで(?:を、?)?アクティブで追加`).test(actionText)) {
    action = 'don+active';
  } else if (new RegExp(`${don}デッキから、?${don}1枚まで(?:を、?)?レストで追加`).test(actionText)) {
    action = 'don+rest';
  } else if (/カード1枚を引き、手札1枚を捨てる/.test(actionText)) {
    action = 'draw1discard1';
  } else {
    action = 'manual'; // 手動処理が必要
  }

  return { turnCond, once: !!onceCond, minCount, action, actionText };
}

// DON!!返却後に場のキャラの返却時効果を適用（純粋関数）
// sideKey: 'player' or 'cpu', returnCount: 戻した枚数, isMyTurn: sideKeyのプレイヤーのターンか
function applyDonReturnEffectsOnState(ns, sideKey, returnCount, isMyTurn) {
  const side = ns[sideKey];
  let updated = ns;

  for (const card of side.field) {
    const meta = parseDonReturnEffect(card);
    if (!meta) continue;

    // ターン条件チェック
    if (meta.turnCond === '【自分のターン中】' && !isMyTurn) continue;
    if (meta.turnCond === '【相手のターン中】' && isMyTurn) continue;

    // 返却枚数条件チェック
    if (returnCount < meta.minCount) continue;

    // ターン1回制限チェック
    if (meta.once && card._donReturnEffectUsed) continue;

    const name = card.name;
    const currentSide = updated[sideKey];

    // ─ 効果適用 ────────────────────────────────────────────────
    if (meta.action === 'don+active' || meta.action === 'don+rest' || meta.action === 'don+active+rest') {
      const inZone = currentSide.donActive + currentSide.donTapped;
      const canAdd = currentSide.donDeck > 0 && inZone < currentSide.donMax;
      if (canAdd) {
        if (meta.action === 'don+active') {
          updated = addLog(`「${name}」効果: DON!!×1アクティブで追加`, {
            ...updated,
            [sideKey]: { ...currentSide, donDeck: currentSide.donDeck - 1, donActive: currentSide.donActive + 1 },
          });
        } else if (meta.action === 'don+rest') {
          updated = addLog(`「${name}」効果: DON!!×1レストで追加`, {
            ...updated,
            [sideKey]: { ...currentSide, donDeck: currentSide.donDeck - 1, donTapped: currentSide.donTapped + 1 },
          });
        } else { // don+active+rest
          const canAdd2 = currentSide.donDeck >= 2 && inZone + 1 < currentSide.donMax;
          const addCount = canAdd2 ? 2 : 1;
          const ns2 = canAdd2
            ? { donDeck: currentSide.donDeck - 2, donActive: currentSide.donActive + 1, donTapped: currentSide.donTapped + 1 }
            : { donDeck: currentSide.donDeck - 1, donActive: currentSide.donActive + 1 };
          updated = addLog(`「${name}」効果: DON!!×${addCount}追加（アクティブ+${canAdd2 ? 'レスト' : ''}）`, {
            ...updated,
            [sideKey]: { ...currentSide, ...ns2 },
          });
        }
      } else {
        updated = addLog(`「${name}」効果: DON!!デッキに残りなし`, updated);
      }
    } else if (meta.action === 'draw1discard1') {
      // ドロー実行。捨ては手動
      const cs = updated[sideKey];
      if (cs.deck.length > 0) {
        updated = addLog(`「${name}」効果: 1枚ドロー（手札1枚捨ては手動で）`, {
          ...updated,
          [sideKey]: { ...cs, deck: cs.deck.slice(1), hand: [...cs.hand, cs.deck[0]] },
        });
      }
    } else {
      // 手動処理が必要な効果はログのみ
      updated = addLog(`「${name}」効果発動可能: ${meta.actionText}（手動処理）`, updated);
    }

    // ターン1回フラグを立てる
    if (meta.once) {
      const cs2 = updated[sideKey];
      updated = {
        ...updated,
        [sideKey]: {
          ...cs2,
          field: cs2.field.map(f => f._uid === card._uid ? { ...f, _donReturnEffectUsed: true } : f),
        },
      };
    }
  }
  return updated;
}

function parseTriggerActions(card) {
  const eff = card?.effect || '';
  const actions = [];
  const drawM = eff.match(/【トリガー】[^。\n]*?(\d+)枚(?:を)?ドロー/);
  if (drawM) actions.push({ id: 'draw', count: parseInt(drawM[1]) });
  const donM = eff.match(/【トリガー】[^。\n]*?DON!![ーー−-](\d+)/);
  if (donM) actions.push({ id: 'donReturn', count: parseInt(donM[1]) });
  return actions;
}

// ─── モジュールレベルヘルパー ──────────────────────────────────────────
// バトルログ追加（純粋関数）
function addLog(msg, prev) {
  return {
    ...prev,
    battleLog: [{ msg, ts: Date.now() }, ...(prev.battleLog || [])].slice(0, 100),
  };
}

// イベントカードの【カウンター】パワー値をテキストから解析
function parseEventCounterValue(card) {
  if (card?.card_type !== 'EVENT') return 0;
  const e = card?.effect || '';
  if (!e.includes('【カウンター】')) return 0;
  const m = e.match(/パワー[+＋](\d+)/);
  return m ? parseInt(m[1]) : 0;
}

// キャラ・イベント問わずカウンター値を取得
function getCardCounterValue(card) {
  if (!card) return 0;
  if ((card.counter || 0) > 0) return card.counter;
  return parseEventCounterValue(card);
}

// イベントカードの【カウンター】効果を詳細解析
// 返り値: { donCost, powerBoost, effects: [{type, condition, count}] }
function parseCounterEventEffect(card) {
  if (card?.card_type !== 'EVENT') return null;
  const fullEffect = card?.effect || '';
  if (!fullEffect.includes('【カウンター】')) return null;

  // 【カウンター】以降のテキストを取得（次の【...】タグまで）
  const m = fullEffect.match(/【カウンター】([\s\S]*?)(?=【[^カウンター]|$)/);
  const counterText = m ? m[1] : fullEffect.split('【カウンター】')[1] || '';

  // DON!!コスト（例: ドン!!-1, ドン‼-2）
  const donCostM = counterText.match(/ドン[!!‼]{1,2}[-ー−](\d+)/);
  const donCost = donCostM ? parseInt(donCostM[1]) : 0;

  // 自分側へのパワーブースト（例: パワー+2000）
  const powerBoostM = counterText.match(/(?:自分の)?(?:リーダーか)?(?:キャラ(?:\d+枚)?(?:まで)?)?(?:を、このバトル中、)?パワー[+＋](\d+)/);
  const powerBoost = powerBoostM ? parseInt(powerBoostM[1]) : 0;

  const effects = [];

  // 相手キャラをレストにする
  const restM = counterText.match(/相手のコスト(\d+)以下のキャラ.*?レストにする|相手のキャラ\d*枚.*?レストにする|相手のアクティブのコスト(\d+)以下のキャラ.*?レストにする/);
  if (restM || /相手の[アクティブ]*?キャラ.*?レストにする/.test(counterText)) {
    const costCond = counterText.match(/相手の(?:アクティブの)?コスト(\d+)以下のキャラ.*?レストにする/);
    effects.push({
      type: 'rest',
      condition: costCond ? `コスト${costCond[1]}以下` : null,
      conditionFn: costCond ? (c => (c.cost || 0) <= parseInt(costCond[1])) : null,
    });
  }

  // 相手キャラをKOする
  if (/相手の.*?キャラ.*?KOする/.test(counterText)) {
    const koCostCond = counterText.match(/相手の(?:アクティブの)?コスト(\d+)以下のキャラ.*?KOする/);
    const koPowerCond = counterText.match(/相手の元々のパワー(\d+)以下のキャラ.*?KOする/);
    let condition = null;
    let conditionFn = null;
    if (koCostCond) {
      condition = `コスト${koCostCond[1]}以下`;
      conditionFn = (c => (c.cost || 0) <= parseInt(koCostCond[1]));
    } else if (koPowerCond) {
      condition = `元パワー${parseInt(koPowerCond[1]).toLocaleString()}以下`;
      conditionFn = (c => (c.power || 0) <= parseInt(koPowerCond[1]));
    }
    effects.push({ type: 'ko', condition, conditionFn });
  }

  // 相手キャラを手札に戻す
  if (/相手の.*?キャラ.*?手札に戻す/.test(counterText)) {
    const retCostCond = counterText.match(/相手の(?:コスト(\d+)以下の)?キャラ.*?手札に戻す/);
    const condition = retCostCond?.[1] ? `コスト${retCostCond[1]}以下` : null;
    effects.push({
      type: 'returnHand',
      condition,
      conditionFn: retCostCond?.[1] ? (c => (c.cost || 0) <= parseInt(retCostCond[1])) : null,
    });
  }

  // カードをドローする
  const drawM = counterText.match(/カード(\d+)枚.*?引く/);
  if (drawM) {
    effects.push({ type: 'draw', count: parseInt(drawM[1]) });
  }

  // 相手のパワー下げ（ログのみ）
  const powerMinusM = counterText.match(/相手の.*?パワー[-−](\d+)/);
  if (powerMinusM) {
    effects.push({ type: 'powerMinus', value: parseInt(powerMinusM[1]) });
  }

  // アタック対象変更（ログのみ）
  if (/アタックの対象を変更/.test(counterText)) {
    effects.push({ type: 'changeTarget' });
  }

  return { donCost, powerBoost, effects };
}

// CPU自動カウンター判断
// ターゲットがリーダーで攻撃が通る場合のみカウンターを使う
// ※ ONE PIECE TCG: アタック側が防御側「以上」なら攻撃成功 → 防御側は攻撃力を「超える」必要がある
function cpuAutoCounter(cpuSide, targetType, attackPower, defensePower) {
  if (targetType !== 'leader' || attackPower < defensePower) {
    return { bonus: 0, cards: [], donCost: 0 };
  }
  // 防御力が攻撃力を「超える」必要がある（同値では防げない）
  const needed = attackPower - defensePower + 1000;

  // 各候補カードのカウンター値と DON!! コストを計算
  // イベントカードは【カウンター】発動にDON!!コストが必要な場合がある
  const candidates = cpuSide.hand
    .filter(c => getCardCounterValue(c) > 0)
    .map(c => {
      const counterVal = getCardCounterValue(c);
      let donCost = 0;
      if (c.card_type === 'EVENT') {
        const parsed = parseCounterEventEffect(c);
        donCost = parsed?.donCost || 0;
      }
      return { card: c, counterVal, donCost };
    })
    .sort((a, b) => b.counterVal - a.counterVal);

  let bonus = 0;
  let totalDonCost = 0;
  let availableDon = cpuSide.donActive;
  const used = [];

  for (const { card, counterVal, donCost } of candidates) {
    if (bonus >= needed) break;
    // DON!! コストが支払えないイベントカードはスキップ
    if (donCost > 0 && availableDon < donCost) continue;
    bonus += counterVal;
    used.push(card);
    availableDon -= donCost;
    totalDonCost += donCost;
  }

  // カウンターしても防げない場合は使わない
  if (bonus < needed) return { bonus: 0, cards: [], donCost: 0 };
  return { bonus, cards: used, donCost: totalDonCost };
}

// ダメージステップの解決（プレイヤー/CPU共通）
// attackerCard: アタッカーカード（ダブルアタック・バニッシュ判定用）
function resolveDamageOnState(ns, atkKey, defKey, targetType, targetUid, attackPower, defensePower, attackerCard = null) {
  if (attackPower >= defensePower) {
    if (targetType === 'character') {
      const defSide = ns[defKey];
      const target = defSide.field.find(x => x._uid === targetUid);
      if (!target) return ns;
      // バトルKO耐性チェック（ヴェルゴ等）
      if (isBattleKoImmune(target)) {
        return addLog(`「${target.name}」はバトルでKOされない！`, ns);
      }
      const donBack = target.donAttached || 0;
      return addLog(`KO！「${target.name}」（DON!!×${donBack}返還）`, {
        ...ns,
        [defKey]: {
          ...defSide,
          field: defSide.field.filter(x => x._uid !== targetUid),
          trash: [...defSide.trash, target],
          donActive: defSide.donActive + donBack,
        },
      });
    } else {
      // リーダーへダメージ
      const defSide = ns[defKey];
      const defLabel = defKey === 'cpu' ? 'CPU' : 'プレイヤー';
      const isDouble = hasDoubleAttack(attackerCard);
      const isBanish = hasBanish(attackerCard);

      if (defSide.life.length === 0) {
        // ライフ0 → 即座に勝敗決定
        return addLog(`${atkKey === 'player' ? 'プレイヤー' : 'CPU'}の勝利！（ライフ0でリーダーにダメージ）`, { ...ns, winner: atkKey });
      }

      // ── バニッシュ（ライフ → トラッシュ、トリガーなし）────────────
      if (isBanish && !isDouble) {
        const [lifeCard, ...restLife] = defSide.life;
        return addLog(
          `【バニッシュ】${defLabel}ライフ ${defSide.life.length} → ${restLife.length}枚（トラッシュへ）`,
          { ...ns, [defKey]: { ...defSide, life: restLife, trash: [...defSide.trash, { ...lifeCard, faceDown: false }] } }
        );
      }

      // ── ダブルアタック（2ライフダメージ）────────────────────────
      if (isDouble) {
        if (defSide.life.length >= 2) {
          // 2枚同時に処理
          const [life1, life2, ...restLife] = defSide.life;
          const t1 = !isBanish && hasTrigger(life1);
          const t2 = !isBanish && hasTrigger(life2);
          let newHand = [...defSide.hand];
          let newTrash = [...defSide.trash];
          if (isBanish) {
            newTrash = [...newTrash, { ...life1, faceDown: false }, { ...life2, faceDown: false }];
          } else {
            newHand = [...newHand, { ...life1, faceDown: false }, { ...life2, faceDown: false }];
          }
          const newNs = addLog(
            `【ダブルアタック${isBanish ? '+バニッシュ' : ''}】${defLabel}ライフ ${defSide.life.length} → ${restLife.length}枚。「${life1.name}」${t1 ? '【トリガー】！' : ''}「${life2.name}」${t2 ? '【トリガー】！' : ''}`,
            { ...ns, [defKey]: { ...defSide, life: restLife, hand: newHand, trash: newTrash } }
          );
          if (t1) return { ...newNs, pendingTrigger: { card: life1, owner: defKey } };
          if (t2) return { ...newNs, pendingTrigger: { card: life2, owner: defKey } };
          return newNs;
        } else {
          // ライフ1枚: 1枚消費 → 2枚目ダメージで勝利（またはトリガー後勝利）
          const [lifeCard] = defSide.life;
          const triggered = !isBanish && hasTrigger(lifeCard);
          if (isBanish) {
            const ns1 = addLog(
              `【ダブルアタック+バニッシュ】${defLabel}ライフ1→0（トラッシュ）`,
              { ...ns, [defKey]: { ...defSide, life: [], trash: [...defSide.trash, { ...lifeCard, faceDown: false }] } }
            );
            return addLog(`【ダブルアタック】追加ダメージ → ${atkKey === 'player' ? 'プレイヤー' : 'CPU'}の勝利！`, { ...ns1, winner: atkKey });
          }
          const ns1 = addLog(
            `【ダブルアタック】${defLabel}ライフ1→0。「${lifeCard.name}」${triggered ? '【トリガー】！' : ''}`,
            { ...ns, [defKey]: { ...defSide, life: [], hand: [...defSide.hand, { ...lifeCard, faceDown: false }] } }
          );
          if (triggered) {
            // トリガー後に2枚目ダメージ（= 勝利）を適用するための保留フラグ
            return { ...ns1, pendingTrigger: { card: lifeCard, owner: defKey }, pendingSecondDamage: { atkKey } };
          }
          // トリガーなし: 2枚目ダメージで即座に勝利
          return addLog(`【ダブルアタック】追加ダメージ → ${atkKey === 'player' ? 'プレイヤー' : 'CPU'}の勝利！`, { ...ns1, winner: atkKey });
        }
      }

      // ── 通常ダメージ（1ライフ → 手札）────────────────────────────
      const [lifeCard, ...restLife] = defSide.life;
      const triggered = hasTrigger(lifeCard);
      const newNs = addLog(
        `${defLabel}ライフ ${defSide.life.length} → ${restLife.length}枚。「${lifeCard.name}」${triggered ? '【トリガー】！' : ''}`,
        { ...ns, [defKey]: { ...defSide, life: restLife, hand: [...defSide.hand, { ...lifeCard, faceDown: false }] } }
      );
      if (triggered) {
        return { ...newNs, pendingTrigger: { card: lifeCard, owner: defKey } };
      }
      return newNs;
    }
  } else {
    return addLog(`アタック失敗（${attackPower} < ${defensePower}）`, ns);
  }
}

// CPU攻撃キューから次のアタックを開始する
// リーダーへの攻撃 → ブロッカーステップ → カウンターステップ → ダメージ解決（プレイヤー操作）
// キャラへの攻撃  → ブロッカーステップ → カウンターステップ → ダメージ解決（プレイヤー操作）
// ※ONE PIECE TCGルール: キャラへの攻撃でもカウンターステップは存在する
function startCpuAttackOnState(ns, pendingAttacks) {
  let attacks = [...pendingAttacks];
  while (attacks.length > 0) {
    const [attack, ...remaining] = attacks;
    attacks = remaining;

    // ループ内で最新の ns から再取得（auto-resolve後に状態が変わるため）
    const c = ns.cpu;
    const p = ns.player;

    const attacker = attack.attackerType === 'leader'
      ? c.leader
      : c.field.find(x => x._uid === attack.attackerUid);
    if (!attacker || attacker.tapped) continue;

    // アタッカーをタップ
    const newCpu = attack.attackerType === 'leader'
      ? { ...c, leader: { ...c.leader, tapped: true } }
      : { ...c, field: c.field.map(x => x._uid === attack.attackerUid ? { ...x, tapped: true } : x) };

    // ターゲット取得
    let target, targetType, finalTargetUid;
    if (attack.targetType === 'leader') {
      target = p.leader;
      targetType = 'leader';
      finalTargetUid = 'player-leader';
    } else {
      target = p.field.find(x => x._uid === attack.targetUid);
      if (!target) continue; // ターゲットが既にいなければスキップ
      targetType = 'character';
      finalTargetUid = attack.targetUid;
    }

    // CPUターン: CPUの攻撃側はDONパワー有効、プレイヤーの防御側はDONパワー無効
    const attackPower = computeAttackPower(attacker, c, p);
    // リーダーへの攻撃はleaderPowerBuff（相手アタック時効果）を防御力に加算
    // キャラ防御時は【相手のターン中】バフを computeDefensePower で適用
    const defensePower = (targetType === 'leader'
      ? (target.power || 0) + (p.leaderPowerBuff || 0)
      : computeDefensePower(target, p, c));
    const targetName = targetType === 'leader' ? 'プレイヤーリーダー' : `「${target.name}」`;
    const logMsg = `CPU「${attacker.name}」(${attackPower}) が${targetName}(${defensePower})にアタック！`;

    if (targetType === 'leader') {
      // ─ リーダーへの攻撃: ブロッカー/カウンターステップ（プレイヤー操作必要）─
      const newNs = addLog(logMsg, { ...ns, cpu: newCpu, cpuPendingAttacks: remaining });
      const playerBlockers = p.field.filter(x => (/【ブロッカー】/.test(x.effect || '') || x._hasBlocker) && !x.tapped);
      const step = playerBlockers.length > 0 ? 'blocker' : 'counter';
      return {
        ...newNs,
        attackState: {
          attackerUid: attack.attackerUid,
          attackerType: attack.attackerType,
          owner: 'cpu',
          targetUid: finalTargetUid,
          targetType: 'leader',
          attackPower,
          defensePower,
          counterBonus: 0,
          step,
        },
      };
    } else {
      // ─ キャラへの攻撃: ブロッカーステップ→カウンターステップ（プレイヤー操作）─
      const newNs = addLog(logMsg, { ...ns, cpu: newCpu, cpuPendingAttacks: remaining });
      const playerBlockers = p.field.filter(x => (/【ブロッカー】/.test(x.effect || '') || x._hasBlocker) && !x.tapped && x._uid !== finalTargetUid);
      if (playerBlockers.length > 0) {
        // ブロッカーがいる場合: ブロッカー選択 → その後カウンターステップへ
        return {
          ...newNs,
          attackState: {
            attackerUid: attack.attackerUid,
            attackerType: attack.attackerType,
            owner: 'cpu',
            targetUid: finalTargetUid,
            targetType: 'character',
            attackPower,
            defensePower,
            counterBonus: 0,
            step: 'blocker',
            // noCounter 廃止: キャラ攻撃でもカウンターステップあり
          },
        };
      }
      // ブロッカーなし → カウンターステップへ（ルール通り）
      return {
        ...newNs,
        attackState: {
          attackerUid: attack.attackerUid,
          attackerType: attack.attackerType,
          owner: 'cpu',
          targetUid: finalTargetUid,
          targetType: 'character',
          attackPower,
          defensePower,
          counterBonus: 0,
          step: 'counter',
        },
      };
    }
  }

  // 全アタック終了
  if (!ns.winner && !ns.pendingTrigger) {
    return addLog('[CPU] エンドフェーズへ', { ...ns, subPhase: 'end', cpuPendingAttacks: [] });
  }
  return { ...ns, cpuPendingAttacks: [] };
}

// 各サイドの初期状態を構築
function buildSide(leader, deckCards, prefix) {
  const leaderEff = LEADER_EFFECTS[leader?.card_number] || {};
  const donDeckInit = leaderEff.donDeckInit ?? 10;
  const donMax = leaderEff.donMax ?? donDeckInit;

  const tagged = deckCards.map((c, i) => ({
    ...c,
    _uid: `${prefix}-${c.card_number}-${i}`,
  }));
  const shuffled = shuffle(tagged);
  const lifeCount = leader?.life ?? 5;
  const life = shuffled.splice(0, lifeCount).map(c => ({ ...c, faceDown: true }));
  const hand = shuffled.splice(0, 5);

  return {
    leader: { ...leader, tapped: false, donAttached: 0, _uid: `${prefix}-leader` },
    deck: shuffled,
    hand,
    life,
    field: [],
    stage: null,
    trash: [],
    donDeck: donDeckInit,
    donMax,
    donActive: 0,
    donTapped: 0,
    donLeader: 0,
    leaderEffect: leaderEff,
    searchReveal: [],
    leaderPowerBuff: 0,      // リーダーの一時パワーバフ（相手アタック時効果など）
    leaderAbilityUsed: false, // 相手アタック時効果の使用フラグ（ターン1回）
    lifeLeaveAbilityUsed: false, // ライフ離れ時効果の使用フラグ（ターン1回）
  };
}

// ─── メインフック ─────────────────────────────────────────────────────
export function useBattleState() {
  const [state, setState] = useState(null);

  // ── 対戦開始 ─────────────────────────────────────────────────────
  const startBattle = useCallback((playerLeader, playerDeckEntries, cpuLeader, cpuDeckEntries, playerOrder) => {
    const flatDeck = entries => (entries || []).flatMap(({ card, count }) =>
      Array.from({ length: count }, () => ({ ...card }))
    );
    const pSide = buildSide(playerLeader, flatDeck(playerDeckEntries), 'p');
    const cSide = buildSide(cpuLeader, flatDeck(cpuDeckEntries), 'c');
    const firstPlayer = playerOrder === 'first' ? 'player' : 'cpu';

    setState({
      phase: 'mulligan',
      turn: 1,
      activePlayer: firstPlayer,
      subPhase: 'refresh',
      playerOrder,
      player: pSide,
      cpu: cSide,
      attackState: null,
      pendingTrigger: null,
      pendingSecondDamage: null,
      cpuPendingAttacks: [],
      cpuThinking: false,
      battleLog: [{ msg: `対戦開始！ ${playerLeader?.name} vs CPU(${cpuLeader?.name})`, ts: Date.now() }],
      winner: null,
      pendingStageSetup: null,
    });
  }, []);

  // ── マリガン ─────────────────────────────────────────────────────
  const playerMulligan = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'mulligan') return prev;
      const p = prev.player;
      const combined = shuffle([...p.hand, ...p.deck]);
      const newHand = combined.splice(0, 5);
      return addLog('プレイヤーマリガン', { ...prev, player: { ...p, hand: newHand, deck: combined } });
    });
  }, []);

  const confirmMulligan = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'mulligan') return prev;
      let ns = prev;
      const avgCost = prev.cpu.hand.reduce((s, c) => s + (c.cost || 0), 0) / prev.cpu.hand.length;
      if (avgCost > 4.5) {
        const combined = shuffle([...prev.cpu.hand, ...prev.cpu.deck]);
        const newHand = combined.splice(0, 5);
        ns = addLog('CPUマリガン', { ...ns, cpu: { ...prev.cpu, hand: newHand, deck: combined } });
      }

      // ── ゲーム開始時ステージカードセットアップ（イム等）──────────────
      // CPU がステージセットアップリーダーの場合: 自動で場に出す
      const cLeaderEff = LEADER_EFFECTS[ns.cpu.leader?.card_number] || {};
      if (cLeaderEff.setupStageCard) {
        const sName = cLeaderEff.setupStageName || '聖地マリージョア';
        const cpuCandidates = ns.cpu.deck.filter(c => c.card_type === 'STAGE' && c.name?.includes(sName));
        if (cpuCandidates.length > 0) {
          // コスト最大のカードを自動選択（CPUは常に自動）
          const stageCard = cpuCandidates.reduce((a, b) => (b.cost || 0) > (a.cost || 0) ? b : a);
          const newCpuDeck = ns.cpu.deck.filter(c => c._uid !== stageCard._uid);
          ns = addLog(`CPU【${ns.cpu.leader.name}効果】デッキから「${stageCard.name}」を場に登場！`, {
            ...ns, cpu: { ...ns.cpu, deck: newCpuDeck, stage: { ...stageCard, tapped: false } },
          });
        }
      }

      // プレイヤーがステージセットアップリーダーの場合
      const pLeaderEff = LEADER_EFFECTS[ns.player.leader?.card_number] || {};
      if (pLeaderEff.setupStageCard) {
        const sName = pLeaderEff.setupStageName || '聖地マリージョア';
        const candidates = ns.player.deck.filter(c => c.card_type === 'STAGE' && c.name?.includes(sName));
        if (candidates.length === 1) {
          // 1枚のみなら自動登場
          const best = candidates[0];
          const newDeck = ns.player.deck.filter(c => c._uid !== best._uid);
          ns = addLog(`【${ns.player.leader.name}効果】デッキから「${best.name}」を場に登場！`, {
            ...ns,
            player: { ...ns.player, deck: newDeck, stage: { ...best, tapped: false } },
          });
        } else if (candidates.length > 1) {
          // 複数候補はモーダルで選択
          return addLog(`【${ns.player.leader.name}効果】デッキからステージカードを場に出せます`, {
            ...ns, phase: 'game', subPhase: 'refresh', pendingStageSetup: { candidates },
          });
        }
      }

      return addLog('マリガン確定！ゲーム開始', { ...ns, phase: 'game', subPhase: 'refresh' });
    });
  }, []);

  // ── フェーズ進行 ──────────────────────────────────────────────────
  const advancePhase = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'game') return prev;
      if (prev.pendingTrigger) return prev; // トリガー解決待ち中は進行しない
      const { subPhase, turn, activePlayer, playerOrder } = prev;
      const sideKey = activePlayer;
      const s = prev[sideKey];
      const label = activePlayer === 'player' ? 'プレイヤー' : 'CPU';

      if (subPhase === 'refresh') {
        const donFromField = s.field.reduce((sum, c) => sum + (c.donAttached || 0), 0);
        const donFromLeader = s.leader.donAttached || 0;
        const restored = s.donTapped + donFromField + donFromLeader;
        // リフレッシュ: タップ解除・DON!!回収・ターン1回フラグリセット（_donReturnEffectUsed含む）
        const newField = s.field.map(c => ({ ...c, tapped: false, donAttached: 0, _donReturnEffectUsed: false }));
        const newLeader = { ...s.leader, tapped: false, donAttached: 0 };
        return addLog(`[${label}] リフレッシュ${restored > 0 ? `・DON!!×${restored}回収` : ''}`, {
          ...prev,
          subPhase: 'draw',
          [sideKey]: {
            ...s, field: newField, leader: newLeader,
            donActive: s.donActive + restored, donTapped: 0, donLeader: 0,
            leaderPowerBuff: 0, leaderAbilityUsed: false, lifeLeaveAbilityUsed: false,
          },
        });
      }

      if (subPhase === 'draw') {
        const isFirstPlayer = (activePlayer === 'player' && playerOrder === 'first')
                           || (activePlayer === 'cpu'    && playerOrder === 'second');
        if (turn === 1 && isFirstPlayer) {
          return addLog(`[${label}] 先行1Tドローなし`, { ...prev, subPhase: 'don' });
        }
        if (s.deck.length === 0) {
          return addLog(`[${label}] デッキ切れ → 敗北`, {
            ...prev, winner: activePlayer === 'player' ? 'cpu' : 'player',
          });
        }
        const [drawn, ...rest] = s.deck;
        return addLog(`[${label}] ドロー: ${drawn.name}`, {
          ...prev,
          subPhase: 'don',
          [sideKey]: { ...s, deck: rest, hand: [...s.hand, drawn] },
        });
      }

      if (subPhase === 'don') {
        const isFirstPlayer = (activePlayer === 'player' && playerOrder === 'first')
                           || (activePlayer === 'cpu'    && playerOrder === 'second');
        const gain = (turn === 1 && isFirstPlayer) ? 1 : 2;
        const inZone = s.donActive + s.donTapped;
        const actual = Math.min(gain, s.donDeck, Math.max(0, s.donMax - inZone));
        return addLog(`[${label}] DON!!+${actual}枚`, {
          ...prev,
          subPhase: 'main',
          [sideKey]: { ...s, donDeck: s.donDeck - actual, donActive: s.donActive + actual },
        });
      }

      if (subPhase === 'main') {
        return addLog(`[${label}] エンドフェーズ`, { ...prev, subPhase: 'end' });
      }

      if (subPhase === 'end') {
        let ns = prev;
        const eff = s.leaderEffect?.onEndPhase;
        if (eff === 'lifeTopToHand' && s.life.length > 0) {
          const [top, ...rest] = s.life;
          const triggered = hasTrigger(top);
          ns = addLog(`[${label}] リーダー効果: ライフ→手札「${top.name}」${triggered ? '【トリガー】！' : ''}`, {
            ...ns, [sideKey]: { ...ns[sideKey], life: rest, hand: [...ns[sideKey].hand, { ...top, faceDown: false }] },
          });
          // ライフカードにトリガーがあれば pendingTrigger をセット
          if (triggered) {
            ns = { ...ns, pendingTrigger: { card: top, owner: sideKey } };
          }
        }
        if (eff === 'activateDon2' && s.donTapped > 0) {
          const act = Math.min(2, s.donTapped);
          ns = addLog(`[${label}] リーダー効果: DON!!×${act}アクティブ`, {
            ...ns, [sideKey]: { ...ns[sideKey], donTapped: ns[sideKey].donTapped - act, donActive: ns[sideKey].donActive + act },
          });
        }
        const nextPlayer = activePlayer === 'player' ? 'cpu' : 'player';
        const firstPlayer = playerOrder === 'first' ? 'player' : 'cpu';
        const nextTurn = nextPlayer === firstPlayer ? turn + 1 : turn;
        return addLog(`ターン${nextTurn}: ${nextPlayer === 'player' ? 'プレイヤー' : 'CPU'}のターン`, {
          ...ns, activePlayer: nextPlayer, subPhase: 'refresh', turn: nextTurn,
        });
      }

      return prev;
    });
  }, []);

  // ── プレイヤー: カードプレイ ──────────────────────────────────────
  const playerPlayCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player' || prev.subPhase !== 'main') return prev;
      const p = prev.player;
      const idx = p.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = p.hand[idx];
      if (card.card_type !== 'CHARACTER') return addLog('キャラクターのみ登場できます', prev);
      if (p.field.length >= 5) return addLog('フィールドが満員（最大5枚）', prev);
      // ステージ効果によるコスト削減を適用（例: 聖地マリージョア → 天竜人-1）
      const baseCost = card.cost || 0;
      const cost = computeEffectiveCost(card, p);
      const costNote = cost < baseCost ? `（聖地マリージョア-${baseCost - cost}）` : '';
      if (p.donActive < cost) return addLog(`コスト${cost}が足りません（アクティブDON!!: ${p.donActive}）`, prev);
      const afterDon = autoTapDon(p, cost);
      // _summonedTurn: 登場したターン番号を記録（速攻がなければそのターンアタック不可）
      const hasRush = /【速攻】/.test(card.effect || '');
      const newField = [...afterDon.field, { ...card, tapped: false, donAttached: 0, _summonedTurn: prev.turn, _hasRush: hasRush }];
      const newHand = afterDon.hand.filter((_, i) => i !== idx);
      return addLog(`「${card.name}」（コスト${cost}${costNote}）登場${hasRush ? '【速攻】' : ''}`, {
        ...prev, player: { ...afterDon, hand: newHand, field: newField },
      });
    });
  }, []);

  // ── プレイヤー: DON!!アタッチ ─────────────────────────────────────
  const playerAttachDon = useCallback((targetUid) => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player') return prev;
      const p = prev.player;
      if (p.donActive <= 0) return addLog('アクティブDON!!がありません', prev);
      if (targetUid === 'leader') {
        return addLog('DON!!をリーダーにアタッチ', {
          ...prev, player: {
            ...p, donActive: p.donActive - 1, donLeader: p.donLeader + 1,
            leader: { ...p.leader, donAttached: (p.leader.donAttached || 0) + 1 },
          },
        });
      }
      const card = p.field.find(c => c._uid === targetUid);
      if (!card) return prev;
      const newField = p.field.map(c => c._uid === targetUid ? { ...c, donAttached: (c.donAttached || 0) + 1 } : c);
      return addLog(`「${card.name}」にDON!!アタッチ`, {
        ...prev, player: { ...p, donActive: p.donActive - 1, field: newField },
      });
    });
  }, []);

  // ── プレイヤー: アタッカー選択 ────────────────────────────────────
  const playerSelectAttacker = useCallback((attackerUid) => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player' || prev.subPhase !== 'main') return prev;
      // ターン1は先攻・後攻ともアタック不可
      if (prev.turn <= 1) return addLog('最初のターンはアタックできません', prev);
      const p = prev.player;
      let attacker, attackerType;
      if (attackerUid === 'p-leader') {
        if (p.leader.tapped) return addLog('リーダーはすでにタップ済みです', prev);
        if (p.leaderEffect?.leaderCannotAttack) return addLog('このリーダーはアタックできません', prev);
        attacker = p.leader; attackerType = 'leader';
      } else {
        attacker = p.field.find(c => c._uid === attackerUid);
        if (!attacker) return prev;
        if (attacker.tapped) return addLog('このキャラはタップ済みです（アタック済み）', prev);
        // 登場ターンは速攻がなければアタック不可
        if (attacker._summonedTurn === prev.turn && !attacker._hasRush)
          return addLog('登場したばかりのキャラはアタックできません（速攻なし）', prev);
        attackerType = 'character';
      }
      return addLog(`「${attacker.name}」アタック宣言`, {
        ...prev, attackState: { attackerUid, attackerType, owner: 'player', step: 'select-target' },
      });
    });
  }, []);

  // ── プレイヤー: ターゲット選択 → CPUブロッカー → CPU自動カウンター → 解決待ち
  const playerSelectTarget = useCallback((targetUid) => {
    setState(prev => {
      if (!prev || !prev.attackState || prev.attackState.step !== 'select-target') return prev;
      const { attackerUid, attackerType } = prev.attackState;
      const p = prev.player;
      let c = prev.cpu;

      const attacker = attackerType === 'leader' ? p.leader : p.field.find(x => x._uid === attackerUid);
      if (!attacker) return prev;

      let target, targetType;
      if (targetUid === 'cpu-leader') {
        target = c.leader; targetType = 'leader';
      } else {
        target = c.field.find(x => x._uid === targetUid);
        targetType = 'character';
        if (!target) return prev;
        // アクティブ（レストでない）キャラには攻撃不可
        if (!target.tapped) return addLog('アクティブ状態のキャラにはアタックできません', prev);
      }

      // プレイヤーターン: プレイヤー攻撃側はDONパワー有効+自ターン中バフ、CPU防御側はDONパワー無効+相手ターン中バフ
      const attackPower = computeAttackPower(attacker, p, c);

      // アタッカーをタップ
      let newPlayer = p;
      if (attackerType === 'leader') {
        newPlayer = { ...p, leader: { ...p.leader, tapped: true } };
      } else {
        newPlayer = { ...p, field: p.field.map(x => x._uid === attackerUid ? { ...x, tapped: true } : x) };
      }

      let finalTargetUid = targetUid;
      let finalTargetType = targetType;
      // CPU防御: DONパワー無効・相手ターン中バフを計算（computeDefensePower = 【相手のターン中】はプレイヤーターン中なのでCPU側に適用なし）
      // ※ CPUにとってプレイヤーのターンは「相手のターン」なので computeDefensePower を適用
      let finalDefensePower = computeDefensePower(target, c, p);
      let ns = { ...prev, player: newPlayer };

      // ─ CPUブロッカーステップ（リーダーへの攻撃時のみ）───
      if (targetType === 'leader') {
        const blockers = c.field.filter(x => (/【ブロッカー】/.test(x.effect || '') || x._hasBlocker) && !x.tapped);
        if (blockers.length > 0) {
          const blockerUid = cpuDecideBlocker(blockers, attackPower, c.life.length);
          if (blockerUid) {
            const blocker = c.field.find(x => x._uid === blockerUid);
            c = { ...c, field: c.field.map(x => x._uid === blockerUid ? { ...x, tapped: true } : x) };
            ns = { ...ns, cpu: c };
            finalTargetUid = blockerUid;
            finalTargetType = 'character';
            finalDefensePower = computeDefensePower(blocker, c, p);
            ns = addLog(`CPU ブロッカー「${blocker.name}」(${finalDefensePower})で受ける！`, ns);
          }
        }
      }

      // ─ CPUカウンターステップ（自動）─────────────────────────
      const counterResult = cpuAutoCounter(ns.cpu, finalTargetType, attackPower, finalDefensePower);
      if (counterResult.cards.length > 0) {
        const usedUids = new Set(counterResult.cards.map(x => x._uid));
        const newCpuHand = ns.cpu.hand.filter(x => !usedUids.has(x._uid));
        const newCpuTrash = [...ns.cpu.trash, ...counterResult.cards.map(x => ({ ...x, faceDown: false }))];
        // イベントカードのDON!!コストを消費する
        const newCpuDonActive = ns.cpu.donActive - (counterResult.donCost || 0);
        const donCostLog = counterResult.donCost > 0 ? `（DON!!×${counterResult.donCost}消費）` : '';
        ns = addLog(
          `CPU カウンター「${counterResult.cards.map(x => x.name).join('・')}」+${counterResult.bonus}！${donCostLog}（防御力: ${finalDefensePower} → ${finalDefensePower + counterResult.bonus}）`,
          { ...ns, cpu: { ...ns.cpu, hand: newCpuHand, trash: newCpuTrash, donActive: newCpuDonActive } }
        );
        finalDefensePower += counterResult.bonus;
      }

      const defLabel = finalTargetType === 'leader' ? 'CPUリーダー' : (ns.cpu.field.find(x => x._uid === finalTargetUid)?.name || '');
      return addLog(`「${attacker.name}」(${attackPower}) → ${defLabel}(${finalDefensePower})`, {
        ...ns,
        attackState: {
          attackerUid, attackerType, owner: 'player',
          targetUid: finalTargetUid, targetType: finalTargetType,
          attackPower, defensePower: finalDefensePower,
          counterBonus: counterResult.bonus,
          step: 'resolving',
        },
      });
    });
  }, []);

  // ── アタック解決（プレイヤーが攻撃した場合）────────────────────────
  const resolveAttack = useCallback(() => {
    setState(prev => {
      if (!prev || !prev.attackState || prev.attackState.step !== 'resolving') return prev;
      if (prev.attackState.owner !== 'player') return prev;
      const { attackerUid, attackerType, targetUid, targetType, attackPower, defensePower } = prev.attackState;
      const p = prev.player;
      const attackerCard = attackerType === 'leader' ? p.leader : p.field.find(x => x._uid === attackerUid);
      const ns = { ...prev, attackState: null };
      return resolveDamageOnState(ns, 'player', 'cpu', targetType, targetUid, attackPower, defensePower, attackerCard);
    });
  }, []);

  // ── トリガー処理 ─────────────────────────────────────────────────
  const resolveTrigger = useCallback((activate) => {
    setState(prev => {
      if (!prev || !prev.pendingTrigger) return prev;
      const { card, owner } = prev.pendingTrigger;
      const ns = { ...prev, pendingTrigger: null };

      // ダブルアタック2枚目ダメージ保留処理のヘルパー
      const applySecondDamage = (state) => {
        if (!prev.pendingSecondDamage) return state;
        let result = { ...state, pendingSecondDamage: null };
        const { atkKey } = prev.pendingSecondDamage;
        const defKey = atkKey === 'player' ? 'cpu' : 'player';
        const defSide = result[defKey];
        if (defSide.life.length === 0) {
          // ライフ0 → 勝利
          return addLog(`【ダブルアタック】2枚目ダメージ → ${atkKey === 'player' ? 'プレイヤー' : 'CPU'}の勝利！`, { ...result, winner: atkKey });
        } else {
          // トリガーで何らかの理由でライフが増えた場合: 追加ダメージ
          const [life2, ...restLife2] = defSide.life;
          const t2 = hasTrigger(life2);
          result = addLog(`【ダブルアタック】2枚目ダメージ「${life2.name}」${t2 ? '【トリガー】！' : ''}`, {
            ...result, [defKey]: { ...defSide, life: restLife2, hand: [...defSide.hand, { ...life2, faceDown: false }] }
          });
          if (t2) result = { ...result, pendingTrigger: { card: life2, owner: defKey } };
          return result;
        }
      };

      if (!activate) {
        // 発動しない → カードは手札にそのまま（すでにresolveAttack/runCpuMainPhaseで手札に追加済み）
        return applySecondDamage(addLog(`トリガー「${card.name}」スキップ（手札へ）`, ns));
      }

      // 発動する → カードを手札からトラッシュへ移動
      let applied = {
        ...ns,
        [owner]: {
          ...ns[owner],
          hand: ns[owner].hand.filter(c => c._uid !== card._uid),
          trash: [...ns[owner].trash, { ...card, faceDown: false }],
        },
      };

      const actions = parseTriggerActions(card);
      for (const a of actions) {
        const side = applied[owner];
        if (a.id === 'draw') {
          const n = Math.min(a.count, side.deck.length);
          applied = addLog(`[${owner}] トリガー: ${n}枚ドロー`, {
            ...applied,
            [owner]: { ...side, deck: side.deck.slice(n), hand: [...side.hand, ...side.deck.slice(0, n)] },
          });
        }
        if (a.id === 'donReturn') {
          const n = Math.min(a.count, side.donTapped);
          applied = addLog(`[${owner}] トリガー: DON!!×${n}デッキに返却`, {
            ...applied,
            [owner]: { ...side, donTapped: side.donTapped - n, donDeck: side.donDeck + n },
          });
        }
      }
      return applySecondDamage(addLog(`トリガー「${card.name}」発動（トラッシュへ）`, applied));
    });
  }, []);

  // ── アタックキャンセル ─────────────────────────────────────────
  const cancelAttack = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      if (prev.attackState?.owner === 'player') {
        const { attackerUid, attackerType } = prev.attackState;
        const p = prev.player;
        let newPlayer = p;
        if (attackerType === 'leader') {
          newPlayer = { ...p, leader: { ...p.leader, tapped: false } };
        } else {
          newPlayer = { ...p, field: p.field.map(x => x._uid === attackerUid ? { ...x, tapped: false } : x) };
        }
        return { ...prev, attackState: null, player: newPlayer };
      }
      return { ...prev, attackState: null };
    });
  }, []);

  // ── プレイヤー: ブロッカーでブロック（CPU攻撃時）─────────────────
  const playerBlock = useCallback((blockerUid) => {
    setState(prev => {
      if (!prev?.attackState || prev.attackState.step !== 'blocker') return prev;
      if (prev.attackState.owner !== 'cpu') return prev;
      const p = prev.player;
      const blocker = p.field.find(x => x._uid === blockerUid);
      if (!blocker || (!/【ブロッカー】/.test(blocker.effect || '') && !blocker._hasBlocker)) return addLog('このキャラはブロッカーではありません', prev);
      if (blocker.tapped) return addLog('このキャラはすでにタップ済みです', prev);

      const newField = p.field.map(x => x._uid === blockerUid ? { ...x, tapped: true } : x);
      const defensePower = (blocker.power || 0); // プレイヤー防御側のDONパワーは無効（CPUターン）

      // ブロッカー後は常にカウンターステップへ（キャラ攻撃でも同様）
      return addLog(`「${blocker.name}」でブロック！（防御力: ${defensePower}）`, {
        ...prev,
        player: { ...p, field: newField },
        attackState: {
          ...prev.attackState,
          targetUid: blockerUid,
          targetType: 'character',
          defensePower,
          counterBonus: 0,
          step: 'counter',
        },
      });
    });
  }, []);

  // ── プレイヤー: ブロッカーステップスキップ ─────────────────────────
  const playerPassBlock = useCallback(() => {
    setState(prev => {
      if (!prev?.attackState || prev.attackState.step !== 'blocker') return prev;
      // キャラ攻撃・リーダー攻撃問わず、ブロッカーなし → カウンターステップへ
      return addLog('ブロッカーなし', { ...prev, attackState: { ...prev.attackState, step: 'counter' } });
    });
  }, []);

  // ── プレイヤー: カウンター発動（CPU攻撃時）────────────────────────
  const playerCounter = useCallback((cardUid) => {
    setState(prev => {
      if (!prev?.attackState || prev.attackState.step !== 'counter') return prev;
      if (prev.attackState.owner !== 'cpu') return prev;
      const p = prev.player;
      const card = p.hand.find(c => c._uid === cardUid);
      if (!card) return prev;
      // キャラカードの counter フィールド、またはイベントカードの効果テキストからカウンター値を取得
      const counterVal = getCardCounterValue(card);
      if (counterVal <= 0) return addLog('このカードにはカウンター値がありません', prev);

      // ── イベントカード固有の処理 ──────────────────────────────────────
      if (card.card_type === 'EVENT') {
        const parsed = parseCounterEventEffect(card);
        if (parsed) {
          // DON!!コストチェック
          if (parsed.donCost > 0 && p.donActive < parsed.donCost) {
            return addLog(
              `DON!!が足りません（必要: ${parsed.donCost}、手持ちアクティブ: ${p.donActive}）`,
              prev
            );
          }
          // カードを消費 & DON!!コスト消費
          const newHand = p.hand.filter(c => c._uid !== cardUid);
          const newTrash = [...p.trash, { ...card, faceDown: false }];
          const newDonActive = p.donActive - parsed.donCost;
          const newDonDeck = p.donDeck + parsed.donCost;

          // パワーブースト適用
          const newDefense = prev.attackState.defensePower + parsed.powerBoost;

          let logParts = [`カウンターイベント「${card.name}」`];
          if (parsed.donCost > 0) logParts.push(`DON!!-${parsed.donCost}`);
          if (parsed.powerBoost > 0) logParts.push(`+${parsed.powerBoost}（防御力: ${newDefense}）`);

          // 複合効果の処理
          let pendingEffects = parsed.effects.filter(
            ef => ef.type === 'rest' || ef.type === 'ko' || ef.type === 'returnHand'
          );
          let ns = addLog(logParts.join(' '), {
            ...prev,
            player: { ...p, hand: newHand, trash: newTrash, donActive: newDonActive, donDeck: newDonDeck },
            attackState: {
              ...prev.attackState,
              defensePower: newDefense,
              counterBonus: (prev.attackState.counterBonus || 0) + parsed.powerBoost,
            },
          });

          // ドロー効果を自動適用
          for (const ef of parsed.effects) {
            if (ef.type === 'draw' && ef.count > 0) {
              const pl = ns.player;
              const drawn = pl.deck.slice(0, ef.count);
              if (drawn.length > 0) {
                ns = addLog(`カウンター効果: カード${drawn.length}枚ドロー`, {
                  ...ns,
                  player: { ...pl, deck: pl.deck.slice(ef.count), hand: [...pl.hand, ...drawn.map(c => ({ ...c, faceDown: false }))] },
                });
              }
            } else if (ef.type === 'powerMinus') {
              ns = addLog(`カウンター効果:「相手のパワー-${ef.value}」（ターン中・手動確認）`, ns);
            } else if (ef.type === 'changeTarget') {
              ns = addLog(`カウンター効果:「アタックの対象を変更」（手動確認）`, ns);
            }
          }

          // ターゲット選択が必要な効果があれば pendingCounterEffect にセット
          if (pendingEffects.length > 0) {
            return {
              ...ns,
              attackState: {
                ...ns.attackState,
                pendingCounterEffect: pendingEffects[0],
              },
            };
          }
          return ns;
        }
      }

      // ── キャラカードカウンター（従来処理）────────────────────────────
      const newHand = p.hand.filter(c => c._uid !== cardUid);
      const newTrash = [...p.trash, { ...card, faceDown: false }];
      const newDefense = prev.attackState.defensePower + counterVal;

      return addLog(`カウンター「${card.name}」+${counterVal}！（防御力: ${newDefense}）`, {
        ...prev,
        player: { ...p, hand: newHand, trash: newTrash },
        attackState: {
          ...prev.attackState,
          defensePower: newDefense,
          counterBonus: (prev.attackState.counterBonus || 0) + counterVal,
        },
      });
    });
  }, []);

  // ── プレイヤー: カウンター効果のターゲットを選択（レスト/KO/手札戻し）──
  const playerSelectCounterEffectTarget = useCallback((targetUid) => {
    setState(prev => {
      if (!prev?.attackState?.pendingCounterEffect) return prev;
      const ef = prev.attackState.pendingCounterEffect;
      const cpu = prev.cpu;

      if (ef.type === 'rest') {
        const target = cpu.field.find(x => x._uid === targetUid);
        if (!target) return prev;
        const newCpuField = cpu.field.map(x => x._uid === targetUid ? { ...x, tapped: true } : x);
        return addLog(`カウンター効果:「${target.name}」をレストにした！`, {
          ...prev,
          cpu: { ...cpu, field: newCpuField },
          attackState: { ...prev.attackState, pendingCounterEffect: null },
        });
      }

      if (ef.type === 'ko') {
        const target = cpu.field.find(x => x._uid === targetUid);
        if (!target) return prev;
        const donBack = target.donAttached || 0;
        return addLog(`カウンター効果:「${target.name}」をKO！`, {
          ...prev,
          cpu: {
            ...cpu,
            field: cpu.field.filter(x => x._uid !== targetUid),
            trash: [...cpu.trash, { ...target, faceDown: false }],
            donActive: cpu.donActive + donBack,
          },
          attackState: { ...prev.attackState, pendingCounterEffect: null },
        });
      }

      if (ef.type === 'returnHand') {
        const target = cpu.field.find(x => x._uid === targetUid);
        if (!target) return prev;
        const donBack = target.donAttached || 0;
        return addLog(`カウンター効果:「${target.name}」を手札に戻した！`, {
          ...prev,
          cpu: {
            ...cpu,
            field: cpu.field.filter(x => x._uid !== targetUid),
            hand: [...cpu.hand, { ...target, donAttached: 0 }],
            donActive: cpu.donActive + donBack,
          },
          attackState: { ...prev.attackState, pendingCounterEffect: null },
        });
      }

      return prev;
    });
  }, []);

  // ── プレイヤー: カウンター効果をスキップ ─────────────────────────────
  const playerSkipCounterEffect = useCallback(() => {
    setState(prev => {
      if (!prev?.attackState?.pendingCounterEffect) return prev;
      const ef = prev.attackState.pendingCounterEffect;
      return addLog(`カウンター効果「${ef.type}」をスキップ`, {
        ...prev,
        attackState: { ...prev.attackState, pendingCounterEffect: null },
      });
    });
  }, []);

  // ── プレイヤー: カウンターステップ確定 → ダメージ解決 → 次のアタックへ
  // ── プレイヤー: キャラへの攻撃でブロッカー後 ダメージ解決 ─────────────
  const playerResolveCharAttack = useCallback(() => {
    setState(prev => {
      if (!prev?.attackState || prev.attackState.step !== 'resolve-char') return prev;
      const { attackerUid, attackerType, targetUid, targetType, attackPower, defensePower } = prev.attackState;
      const c = prev.cpu;
      const attackerCard = attackerType === 'leader' ? c.leader : c.field.find(x => x._uid === attackerUid);
      let ns = { ...prev, attackState: null };
      ns = resolveDamageOnState(ns, 'cpu', 'player', targetType, targetUid, attackPower, defensePower, attackerCard);
      if (ns.winner || ns.pendingTrigger) return ns;
      return startCpuAttackOnState(ns, ns.cpuPendingAttacks || []);
    });
  }, []);

  const playerConfirmCounter = useCallback(() => {
    setState(prev => {
      if (!prev?.attackState || prev.attackState.step !== 'counter') return prev;
      if (prev.attackState.owner !== 'cpu') return prev;
      const { attackerUid, attackerType, targetUid, targetType, attackPower, defensePower } = prev.attackState;
      const c = prev.cpu;
      const attackerCard = attackerType === 'leader' ? c.leader : c.field.find(x => x._uid === attackerUid);

      let ns = { ...prev, attackState: null };
      ns = resolveDamageOnState(ns, 'cpu', 'player', targetType, targetUid, attackPower, defensePower, attackerCard);

      // トリガーや勝利があれば一旦停止
      if (ns.winner || ns.pendingTrigger) {
        return ns;
      }

      // 次のCPU攻撃へ
      return startCpuAttackOnState(ns, ns.cpuPendingAttacks || []);
    });
  }, []);

  // ── CPU残りアタックを処理（トリガー解決後に呼ばれる）─────────────────
  const processCpuPendingAttack = useCallback(() => {
    setState(prev => {
      if (!prev || prev.winner || prev.pendingTrigger || prev.attackState) return prev;
      const pending = prev.cpuPendingAttacks || [];
      if (pending.length === 0) {
        // 全アタック終了、エンドフェーズへ
        if (prev.subPhase === 'main' && prev.activePlayer === 'cpu') {
          return addLog('[CPU] エンドフェーズへ', { ...prev, subPhase: 'end' });
        }
        return prev;
      }
      return startCpuAttackOnState(prev, pending);
    });
  }, []);

  // ── CPU メインフェーズ全自動実行 ─────────────────────────────────
  const runCpuMainPhase = useCallback(() => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'cpu' || prev.subPhase !== 'main') return prev;
      if (prev.cpuPendingAttacks?.length > 0) return prev; // 既にアタックキュー処理中
      const decisions = cpuDecide(prev.cpu, prev.player, prev.turn);
      let ns = { ...prev };

      // 1. カードプレイ
      for (const play of decisions.playDecisions) {
        const c = ns.cpu;
        const idx = c.hand.findIndex(x => x._uid === play.uid);
        if (idx < 0) continue;
        const card = c.hand[idx];
        if ((card.cost || 0) > c.donActive) continue;
        const afterDon = autoTapDon(c, card.cost || 0);
        const hasRush = /【速攻】/.test(card.effect || '');
        const newField = [...afterDon.field, { ...card, tapped: false, donAttached: 0, _summonedTurn: ns.turn, _hasRush: hasRush }];
        const newHand = afterDon.hand.filter((_, i) => i !== idx);
        ns = addLog(`CPU「${card.name}」登場`, { ...ns, cpu: { ...afterDon, hand: newHand, field: newField } });
      }

      // 2. DON!!アタッチ
      for (const att of decisions.donAttachments) {
        const c = ns.cpu;
        if (c.donActive <= 0) break;
        const toAttach = Math.min(att.count, c.donActive);
        if (att.uid === 'leader') {
          ns = addLog(`CPUリーダーにDON!!×${toAttach}アタッチ`, {
            ...ns, cpu: {
              ...c, donActive: c.donActive - toAttach, donLeader: c.donLeader + toAttach,
              leader: { ...c.leader, donAttached: (c.leader.donAttached || 0) + toAttach },
            },
          });
        } else {
          const tgt = c.field.find(x => x._uid === att.uid);
          if (!tgt) continue;
          ns = addLog(`CPU「${tgt.name}」にDON!!×${toAttach}アタッチ`, {
            ...ns, cpu: {
              ...c, donActive: c.donActive - toAttach,
              field: c.field.map(x => x._uid === att.uid ? { ...x, donAttached: (x.donAttached || 0) + toAttach } : x),
            },
          });
        }
      }

      // 3. アタック: 全アタックをキューに入れて順次実行
      const attackQueue = decisions.attacks;
      if (attackQueue.length === 0) {
        return addLog('[CPU] エンドフェーズへ', { ...ns, subPhase: 'end', cpuPendingAttacks: [] });
      }

      return startCpuAttackOnState({ ...ns, cpuPendingAttacks: [] }, attackQueue);
    });
  }, []);

  // ── プレイヤー手動操作 ─────────────────────────────────────────
  const playerDraw = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const n = Math.min(count, p.deck.length);
      if (n === 0) return addLog('デッキにカードがありません', prev);
      return addLog(`${n}枚ドロー`, {
        ...prev, player: { ...p, deck: p.deck.slice(n), hand: [...p.hand, ...p.deck.slice(0, n)] },
      });
    });
  }, []);

  const playerTrashCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const idx = p.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = p.hand[idx];
      return addLog(`「${card.name}」を手札からトラッシュ`, {
        ...prev, player: { ...p, hand: p.hand.filter((_, i) => i !== idx), trash: [...p.trash, card] },
      });
    });
  }, []);

  const playerTapDon = useCallback((count = 1) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const n = Math.min(count, p.donActive);
      if (n <= 0) return addLog('アクティブDON!!がありません', prev);
      return addLog(`DON!!×${n}レスト`, {
        ...prev, player: { ...p, donActive: p.donActive - n, donTapped: p.donTapped + n },
      });
    });
  }, []);

  // ── プレイヤー: フィールドカードタップ/アンタップ ────────────────────
  const playerToggleField = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.field.find(c => c._uid === uid);
      if (!card) return prev;
      const next = !card.tapped;
      return addLog(`「${card.name}」を${next ? 'タップ' : 'アンタップ'}`, {
        ...prev, player: { ...p, field: p.field.map(c => c._uid === uid ? { ...c, tapped: next } : c) },
      });
    });
  }, []);

  // ── プレイヤー: リーダータップ/アンタップ ────────────────────────────
  const playerToggleLeader = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const next = !p.leader.tapped;
      return addLog(`リーダーを${next ? 'タップ' : 'アンタップ'}`, {
        ...prev, player: { ...p, leader: { ...p.leader, tapped: next } },
      });
    });
  }, []);

  // ── プレイヤー: フィールドカードKO（トラッシュ）───────────────────────
  const playerTrashFieldCard = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.field.find(c => c._uid === uid);
      if (!card) return prev;
      const donBack = card.donAttached || 0;
      return addLog(`「${card.name}」KO → トラッシュ（DON!!×${donBack}返還）`, {
        ...prev, player: {
          ...p,
          field: p.field.filter(c => c._uid !== uid),
          trash: [...p.trash, card],
          donActive: p.donActive + donBack,
        },
      });
    });
  }, []);

  // ── プレイヤー: DONデタッチ（フィールドカード）────────────────────────
  const playerDetachDon = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.field.find(c => c._uid === uid);
      if (!card || (card.donAttached || 0) <= 0) return prev;
      return addLog(`「${card.name}」からDON!!を外す`, {
        ...prev, player: {
          ...p,
          field: p.field.map(c => c._uid === uid ? { ...c, donAttached: c.donAttached - 1 } : c),
          donActive: p.donActive + 1,
        },
      });
    });
  }, []);

  // ── プレイヤー: DONデタッチ（リーダー）──────────────────────────────
  const playerDetachDonLeader = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      if ((p.leader.donAttached || 0) <= 0) return prev;
      return addLog('リーダーからDON!!を外す', {
        ...prev, player: {
          ...p,
          leader: { ...p.leader, donAttached: p.leader.donAttached - 1 },
          donActive: p.donActive + 1, donLeader: p.donLeader - 1,
        },
      });
    });
  }, []);

  // ── プレイヤー: 手札→デッキトップ/ボトム ─────────────────────────────
  const playerReturnHandToTop = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.hand.find(c => c._uid === uid);
      if (!card) return prev;
      return addLog(`「${card.name}」をデッキトップへ`, {
        ...prev, player: { ...p, hand: p.hand.filter(c => c._uid !== uid), deck: [card, ...p.deck] },
      });
    });
  }, []);

  const playerReturnHandToBottom = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.hand.find(c => c._uid === uid);
      if (!card) return prev;
      return addLog(`「${card.name}」をデッキボトムへ`, {
        ...prev, player: { ...p, hand: p.hand.filter(c => c._uid !== uid), deck: [...p.deck, card] },
      });
    });
  }, []);

  // ── プレイヤー: フィールド→デッキトップ/ボトム ────────────────────────
  const playerReturnFieldToTop = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.field.find(c => c._uid === uid);
      if (!card) return prev;
      const donBack = card.donAttached || 0;
      return addLog(`「${card.name}」をデッキトップへ`, {
        ...prev, player: {
          ...p, field: p.field.filter(c => c._uid !== uid),
          deck: [card, ...p.deck], donActive: p.donActive + donBack,
        },
      });
    });
  }, []);

  const playerReturnFieldToBottom = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.field.find(c => c._uid === uid);
      if (!card) return prev;
      const donBack = card.donAttached || 0;
      return addLog(`「${card.name}」をデッキボトムへ`, {
        ...prev, player: {
          ...p, field: p.field.filter(c => c._uid !== uid),
          deck: [...p.deck, card], donActive: p.donActive + donBack,
        },
      });
    });
  }, []);

  // ── プレイヤー: トラッシュ→手札/デッキトップ ──────────────────────────
  const playerReturnTrashToHand = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.trash.find(c => c._uid === uid);
      if (!card) return prev;
      return addLog(`「${card.name}」をトラッシュから手札へ`, {
        ...prev, player: { ...p, trash: p.trash.filter(c => c._uid !== uid), hand: [...p.hand, card] },
      });
    });
  }, []);

  const playerReturnTrashToDeckTop = useCallback((uid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.trash.find(c => c._uid === uid);
      if (!card) return prev;
      return addLog(`「${card.name}」をトラッシュからデッキトップへ`, {
        ...prev, player: { ...p, trash: p.trash.filter(c => c._uid !== uid), deck: [card, ...p.deck] },
      });
    });
  }, []);

  // ── プレイヤー: ステージプレイ ──────────────────────────────────────
  const playerPlayStage = useCallback((cardUid) => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player' || prev.subPhase !== 'main') return prev;
      const p = prev.player;
      const idx = p.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = p.hand[idx];
      if (card.card_type !== 'STAGE') return prev;
      const cost = card.cost || 0;
      if (p.donActive < cost) return addLog(`コスト${cost}が足りません`, prev);
      const afterDon = autoTapDon(p, cost);
      const newHand = afterDon.hand.filter((_, i) => i !== idx);
      const oldStage = afterDon.stage;
      const newTrash = oldStage ? [...afterDon.trash, oldStage] : afterDon.trash;
      return addLog(`ステージ「${card.name}」セット${oldStage ? `（旧「${oldStage.name}」トラッシュ）` : ''}`, {
        ...prev, player: { ...afterDon, hand: newHand, stage: { ...card, tapped: false }, trash: newTrash },
      });
    });
  }, []);

  // ── プレイヤー: イベント使用 ──────────────────────────────────────
  const playerPlayEvent = useCallback((cardUid) => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player' || prev.subPhase !== 'main') return prev;
      const p = prev.player;
      const idx = p.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = p.hand[idx];
      if (card.card_type !== 'EVENT') return prev;
      const cost = card.cost || 0;
      if (p.donActive < cost) return addLog(`コスト${cost}が足りません`, prev);
      const afterDon = autoTapDon(p, cost);
      const newHand = afterDon.hand.filter((_, i) => i !== idx);
      return addLog(`イベント「${card.name}」（コスト${cost}）使用`, {
        ...prev, player: { ...afterDon, hand: newHand, trash: [...afterDon.trash, card] },
      });
    });
  }, []);

  // ── プレイヤー: サーチ ────────────────────────────────────────────
  const playerBeginSearch = useCallback((count) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const n = Math.min(count, p.deck.length);
      if (n <= 0) return addLog('デッキにカードがありません', prev);
      const revealed = p.deck.slice(0, n);
      return addLog(`デッキ上${n}枚を確認`, {
        ...prev, player: { ...p, deck: p.deck.slice(n), searchReveal: revealed },
      });
    });
  }, []);

  const playerResolveSearch = useCallback(({ toHand, toDeckTop, toDeckBottom }) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const rev = p.searchReveal || [];
      if (rev.length === 0) return prev;
      const handCards = rev.filter(c => toHand?.includes(c._uid));
      const topCards = (toDeckTop || []).map(uid => rev.find(c => c._uid === uid)).filter(Boolean);
      const bottomCards = rev.filter(c => toDeckBottom?.includes(c._uid));
      // 未割当カードはデッキボトムへ
      const assignedUids = new Set([...(toHand || []), ...(toDeckTop || []), ...(toDeckBottom || [])]);
      const unassigned = rev.filter(c => !assignedUids.has(c._uid));
      return addLog(`サーチ完了（手札${handCards.length}枚）`, {
        ...prev,
        player: {
          ...p,
          searchReveal: [],
          hand: [...p.hand, ...handCards],
          deck: [...topCards.reverse(), ...p.deck, ...bottomCards, ...unassigned],
        },
      });
    });
  }, []);

  const playerCancelSearch = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const rev = p.searchReveal || [];
      return addLog('サーチキャンセル', {
        ...prev, player: { ...p, searchReveal: [], deck: [...rev, ...p.deck] },
      });
    });
  }, []);

  // ── プレイヤー: DON!!優先返却（効果コスト用）────────────────────────
  // ※ 返却後にフィールドの「DON!!がデッキに戻された時」効果を自動発動
  const playerReturnDonToDeckPriority = useCallback((count) => {
    setState(prev => {
      if (!prev) return prev;
      let p = { ...prev.player };
      let remaining = count;
      // 優先: タップ済み → アクティブ
      const fromTapped = Math.min(remaining, p.donTapped);
      p.donTapped -= fromTapped; p.donDeck += fromTapped; remaining -= fromTapped;
      if (remaining > 0) {
        const fromActive = Math.min(remaining, p.donActive);
        p.donActive -= fromActive; p.donDeck += fromActive; remaining -= fromActive;
      }
      const actualReturned = count - remaining;
      let ns = addLog(`DON!!×${actualReturned}枚をデッキに返却`, { ...prev, player: p });
      // DON!!返却時効果の自動発動（プレイヤーのターン中のみ）
      if (actualReturned > 0 && ns.activePlayer === 'player' && ns.subPhase === 'main') {
        // フィールドキャラの効果
        ns = applyDonReturnEffectsOnState(ns, 'player', actualReturned, true);
        // リーダー効果（OP09-061 ルフィ等: DON!!が2枚以上デッキに戻った時）
        const leaderEff = ns.player.leaderEffect || {};
        if (leaderEff.donReturnEffect && !ns.player.leaderAbilityUsed) {
          const { minCount, action } = leaderEff.donReturnEffect;
          if (actualReturned >= (minCount || 1)) {
            const ps = ns.player;
            const inZone = ps.donActive + ps.donTapped;
            if (action === 'don+active+rest' && ps.donDeck > 0 && inZone < ps.donMax) {
              const canAdd2 = ps.donDeck >= 2 && inZone + 1 < ps.donMax;
              const ns2 = canAdd2
                ? { donDeck: ps.donDeck - 2, donActive: ps.donActive + 1, donTapped: ps.donTapped + 1 }
                : { donDeck: ps.donDeck - 1, donActive: ps.donActive + 1 };
              ns = addLog(`リーダー効果: DON!!×${canAdd2 ? 2 : 1}追加`, {
                ...ns, player: { ...ps, ...ns2, leaderAbilityUsed: true },
              });
            } else if (action === 'don+active' && ps.donDeck > 0 && inZone < ps.donMax) {
              ns = addLog('リーダー効果: DON!!×1アクティブ追加', {
                ...ns, player: { ...ps, donDeck: ps.donDeck - 1, donActive: ps.donActive + 1, leaderAbilityUsed: true },
              });
            }
          }
        }
      }
      return ns;
    });
  }, []);

  // ── プレイヤー: デッキシャッフル ──────────────────────────────────
  const playerShuffleDeck = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      return addLog('デッキをシャッフル', {
        ...prev, player: { ...prev.player, deck: shuffle(prev.player.deck) },
      });
    });
  }, []);

  // ── プレイヤー: ライフめくり ──────────────────────────────────────
  const playerFlipLife = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      if (p.life.length === 0) return addLog('ライフなし', prev);
      const [top, ...rest] = p.life;
      const triggered = hasTrigger(top);
      const ns = addLog(`ライフめくり: 「${top.name}」${triggered ? '【トリガー】！' : ''}`, {
        ...prev, player: { ...p, life: rest, hand: [...p.hand, { ...top, faceDown: false }] },
      });
      if (triggered) {
        return { ...ns, pendingTrigger: { card: top, owner: 'player' } };
      }
      return ns;
    });
  }, []);

  // ── プレイヤー: ゲーム開始時ステージカードセットアップ確定（イム等）──
  const playerConfirmStageSetup = useCallback((stageUid) => {
    setState(prev => {
      if (!prev?.pendingStageSetup) return prev;
      if (!stageUid) {
        // スキップ
        return addLog('ステージカード設置をスキップ', { ...prev, pendingStageSetup: null });
      }
      const p = prev.player;
      const stageCard = p.deck.find(c => c._uid === stageUid);
      if (!stageCard) return prev;
      const newDeck = p.deck.filter(c => c._uid !== stageUid);
      return addLog(`【イム効果】デッキから「${stageCard.name}」を場に登場！`, {
        ...prev,
        player: { ...p, deck: newDeck, stage: { ...stageCard, tapped: false } },
        pendingStageSetup: null,
      });
    });
  }, []);

  // ── プレイヤー: ステージ起動メイン（ステージをレスト）───────────────
  const playerUseStageAbility = useCallback(() => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player' || prev.subPhase !== 'main') return prev;
      const p = prev.player;
      if (!p.stage) return addLog('ステージがありません', prev);
      if (p.stage.tapped) return addLog('ステージはすでにレスト状態です', prev);
      return addLog(`ステージ「${p.stage.name}」をレスト（起動メイン発動）`, {
        ...prev, player: { ...p, stage: { ...p.stage, tapped: true } },
      });
    });
  }, []);

  // ── プレイヤー: レスト中のDON!!1枚をアクティブに（ゾウなど）──────
  const playerActivateTappedDon = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      if (p.donTapped <= 0) return addLog('レスト中のDON!!がありません', prev);
      return addLog('DON!!1枚をアクティブにする', {
        ...prev, player: { ...p, donTapped: p.donTapped - 1, donActive: p.donActive + 1 },
      });
    });
  }, []);

  // ── プレイヤー: DON!!デッキからDON!!1枚追加（鬼ヶ島など）──────────
  const playerAddDonFromDeck = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      if ((p.donDeck || 0) <= 0) return addLog('DON!!デッキが空です', prev);
      return addLog('DON!!デッキからDON!!1枚追加（アクティブ）', {
        ...prev, player: { ...p, donDeck: (p.donDeck || 0) - 1, donActive: p.donActive + 1 },
      });
    });
  }, []);

  // ── プレイヤー: 効果でCPUキャラ全体をレスト（方舟ノアなど）────────
  const playerRestAllCpuChars = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const c = prev.cpu;
      if (c.field.length === 0) return addLog('相手フィールドにキャラがいません', prev);
      return addLog(`効果: 相手キャラ${c.field.length}体を全てレスト！`, {
        ...prev, cpu: { ...c, field: c.field.map(x => ({ ...x, tapped: true })) },
      });
    });
  }, []);

  // ── プレイヤー: 五老星（OP13-082）起動メイン効果 ──────────────────
  // コスト: DON!!1枚レスト + 手札1枚捨て
  // 効果: 自分のキャラすべてをトラッシュへ → トラッシュからパワー5000の異名五老星5体まで登場
  const playerUseGoroseiAbility = useCallback((charUid, discardUid) => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player' || prev.subPhase !== 'main') return prev;
      const p = prev.player;
      // リーダーチェック
      if (!p.leader?.name?.includes('イム')) {
        return addLog('リーダーが「イム」ではありません', prev);
      }
      // DON!!チェック（1枚レスト）
      if (p.donActive < 1) {
        return addLog('アクティブDON!!が1枚必要です', prev);
      }
      // 手札チェック
      const discardCard = p.hand.find(c => c._uid === discardUid);
      if (!discardCard) return addLog('捨てるカードが見つかりません', prev);

      // コスト消費: DON!!1レスト + 手札捨て
      const newDonActive = p.donActive - 1;
      const newDonTapped = p.donTapped + 1;
      const newHand = p.hand.filter(c => c._uid !== discardUid);
      let newTrash = [...p.trash, { ...discardCard, faceDown: false }];

      // フィールドのキャラすべてをトラッシュへ（五老星本体含む）
      const trashedChars = p.field.map(c => ({ ...c, faceDown: false }));
      newTrash = [...newTrash, ...trashedChars];

      // トラッシュからパワー5000の《五老星》、カード名の異なるものを最大5体選択
      const seen = new Set();
      const toSummon = [];
      for (const c of newTrash) {
        if (toSummon.length >= 5) break;
        if (
          c.card_type === 'CHARACTER' &&
          (c.power || 0) === 5000 &&
          (c.traits || []).includes('五老星') &&
          !seen.has(c.name)
        ) {
          seen.add(c.name);
          toSummon.push(c);
        }
      }

      // トラッシュから召喚する分を除いてフィールドへ
      const summonUids = new Set(toSummon.map(c => c._uid));
      const finalTrash = newTrash.filter(c => !summonUids.has(c._uid));
      const newField = toSummon.map(c => ({
        ...c, tapped: false, donAttached: 0, _summonedTurn: prev.turn, _hasRush: false,
      }));

      return addLog(
        `【五老星・起動メイン】フィールド${trashedChars.length}体トラッシュ → トラッシュから五老星${toSummon.length}体登場！（${toSummon.map(c => c.name).join('、')}）`,
        {
          ...prev,
          player: {
            ...p,
            hand: newHand,
            field: newField,
            trash: finalTrash,
            donActive: newDonActive,
            donTapped: newDonTapped,
          },
        }
      );
    });
  }, []);

  // ── プレイヤー: ステージトラッシュ ────────────────────────────────
  const playerTrashStage = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      if (!p.stage) return prev;
      return addLog(`ステージ「${p.stage.name}」トラッシュ`, {
        ...prev, player: { ...p, stage: null, trash: [...p.trash, p.stage] },
      });
    });
  }, []);

  // ── リーダー能力: エネル（OP15-058）────────────────────────────────
  const playerUseEnelAbility = useCallback((activeCount, restedCount) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      if (prev.turn < 2) return addLog('エネル効果は第2ターン以降に使用できます', prev);
      const maxDon = p.leaderEffect?.donMax ?? (p.leaderEffect?.donDeckInit ?? 10);
      const actualActive = Math.min(activeCount, 1, p.donDeck);
      const afterActive = p.donDeck - actualActive;
      const currentInZone = p.donActive + p.donTapped + actualActive;
      const canRest = Math.max(0, maxDon - currentInZone);
      const actualRested = Math.min(restedCount, 4, afterActive, canRest);
      if (currentInZone > maxDon) return addLog('DON!!ゾーンが上限です', prev);
      return addLog(
        `【エネル起動メイン】DON!!+${actualActive}アクティブ、+${actualRested}レストで追加 → キャラにレストDON!!×${actualRested}付与`,
        {
          ...prev,
          player: {
            ...p,
            donDeck: afterActive - actualRested,
            donActive: p.donActive + actualActive,
            donTapped: p.donTapped + actualRested, // レストDON!!として追加
          },
        }
      );
    });
  }, []);

  // ── リーダー能力: ミホーク（OP14-020）────────────────────────────────
  const playerUseMihawkAbility = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const activate = Math.min(3, p.donTapped);
      let ns = { ...prev, player: { ...p, donActive: p.donActive + activate, donTapped: p.donTapped - activate } };
      return addLog(`【ミホーク起動メイン】DON!!×${activate}アクティブ`, ns);
    });
  }, []);

  // ── リーダー能力: スモーカー（OP10-001）────────────────────────────
  const playerUseSmokerAbility = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const hasPower7k = p.field.some(c => (c.power || 0) >= 7000);
      if (!hasPower7k) return addLog('パワー7000以上のキャラがいません（スモーカー効果不発）', prev);
      const activate = Math.min(2, p.donTapped);
      return addLog(`【スモーカー起動メイン】DON!!×${activate}アクティブ`, {
        ...prev, player: { ...p, donActive: p.donActive + activate, donTapped: p.donTapped - activate },
      });
    });
  }, []);

  // ── リーダー能力: サカズキ（OP05-041）────────────────────────────
  const playerUseAkainuAbility = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      if (p.deck.length === 0) return addLog('デッキにカードがありません（サカズキ効果）', prev);
      const [drawn, ...newDeck] = p.deck;
      return addLog(`【サカズキ効果】1枚ドロー「${drawn.name}」→手動で手札1枚をトラッシュしてください`, {
        ...prev, player: { ...p, deck: newDeck, hand: [...p.hand, drawn] },
      });
    });
  }, []);

  // ── DON!!複数アタッチ（リーダー効果用）────────────────────────────
  const playerAttachDonMulti = useCallback((cardUid, count) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.field.find(c => c._uid === cardUid);
      if (!card) return prev;
      const actualCount = Math.min(count, p.donTapped);
      if (actualCount <= 0) return addLog('レストDON!!が足りません', prev);
      const newField = p.field.map(c =>
        c._uid === cardUid ? { ...c, donAttached: (c.donAttached || 0) + actualCount } : c
      );
      return addLog(`DON!!×${actualCount}を「${card.name}」にアタッチ`, {
        ...prev, player: { ...p, field: newField, donTapped: p.donTapped - actualCount },
      });
    });
  }, []);

  // ── プレイヤー: 効果で手札からキャラを無料登場 ────────────────────
  const playerPlayFromHandFree = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const idx = p.hand.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = p.hand[idx];
      if (card.card_type !== 'CHARACTER') return addLog('キャラカードのみ登場できます', prev);
      if (p.field.length >= 5) return addLog('フィールドが満員です', prev);
      const hasRush = /【速攻】/.test(card.effect || '');
      const newHand = p.hand.filter((_, i) => i !== idx);
      const newField = [...p.field, { ...card, tapped: false, donAttached: 0, _summonedTurn: prev.turn, _hasRush: hasRush }];
      return addLog(`効果で「${card.name}」を登場！`, {
        ...prev, player: { ...p, hand: newHand, field: newField },
      });
    });
  }, []);

  // ── プレイヤー: 効果でトラッシュからキャラを登場 ────────────────────
  const playerPlayFromTrashFree = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const idx = p.trash.findIndex(c => c._uid === cardUid);
      if (idx < 0) return prev;
      const card = p.trash[idx];
      if (card.card_type !== 'CHARACTER') return addLog('キャラカードのみ登場できます', prev);
      if (p.field.length >= 5) return addLog('フィールドが満員です', prev);
      const hasRush = /【速攻】/.test(card.effect || '');
      const newTrash = p.trash.filter((_, i) => i !== idx);
      const newField = [...p.field, { ...card, tapped: false, donAttached: 0, faceDown: false, _summonedTurn: prev.turn, _hasRush: hasRush }];
      return addLog(`効果でトラッシュから「${card.name}」を登場！`, {
        ...prev, player: { ...p, trash: newTrash, field: newField },
      });
    });
  }, []);

  // ── プレイヤー: 効果でデッキトップをライフに追加 ──────────────────
  const playerAddLife = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      if (p.deck.length === 0) return addLog('デッキにカードがありません', prev);
      const [card, ...rest] = p.deck;
      return addLog('デッキトップ1枚をライフに追加', {
        ...prev, player: { ...p, deck: rest, life: [{ ...card, faceDown: true }, ...p.life] },
      });
    });
  }, []);

  // ── プレイヤー: 効果でCPUキャラをKO ─────────────────────────────────
  const playerKoCpuChar = useCallback((charUid) => {
    setState(prev => {
      if (!prev) return prev;
      const c = prev.cpu;
      const target = c.field.find(x => x._uid === charUid);
      if (!target) return prev;
      // 効果KO耐性チェック
      if (isImmuneToEffectKo(target) || isImmuneToEffectLeave(target)) {
        return addLog(`「${target.name}」は相手の効果でKO/場離れしない！`, prev);
      }
      const donBack = target.donAttached || 0;
      return addLog(`効果:「${target.name}」をKO！`, {
        ...prev, cpu: {
          ...c,
          field: c.field.filter(x => x._uid !== charUid),
          trash: [...c.trash, target],
          donActive: c.donActive + donBack,
        },
      });
    });
  }, []);

  // ── プレイヤー: 効果でCPUキャラをレスト ────────────────────────────
  const playerRestCpuChar = useCallback((charUid) => {
    setState(prev => {
      if (!prev) return prev;
      const c = prev.cpu;
      const target = c.field.find(x => x._uid === charUid);
      if (!target) return prev;
      return addLog(`効果:「${target.name}」をレストにする！`, {
        ...prev, cpu: {
          ...c,
          field: c.field.map(x => x._uid === charUid ? { ...x, tapped: true } : x),
        },
      });
    });
  }, []);

  // ── プレイヤー: 効果でCPUキャラをデッキ下へ ─────────────────────────
  const playerDeckBottomCpuChar = useCallback((charUid) => {
    setState(prev => {
      if (!prev) return prev;
      const c = prev.cpu;
      const target = c.field.find(x => x._uid === charUid);
      if (!target) return prev;
      // 場離れ耐性チェック
      if (isImmuneToEffectLeave(target)) {
        return addLog(`「${target.name}」は相手の効果で場を離れない！`, prev);
      }
      const donBack = target.donAttached || 0;
      return addLog(`効果:「${target.name}」をデッキ下へ！`, {
        ...prev, cpu: {
          ...c,
          field: c.field.filter(x => x._uid !== charUid),
          deck: [...c.deck, target],
          donActive: c.donActive + donBack,
        },
      });
    });
  }, []);

  // ── プレイヤー: 手札1枚をトラッシュ（効果コスト）────────────────────
  const playerDiscardHandCard = useCallback((cardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const card = p.hand.find(c => c._uid === cardUid);
      if (!card) return prev;
      return addLog(`効果コスト:「${card.name}」を手札から捨てる`, {
        ...prev, player: { ...p, hand: p.hand.filter(c => c._uid !== cardUid), trash: [...p.trash, card] },
      });
    });
  }, []);

  // ── プレイヤー: キャラに【ブロッカー】を付与（効果）────────────────
  const playerGiveCharBlocker = useCallback((charUid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const target = p.field.find(c => c._uid === charUid);
      if (!target) return prev;
      return addLog(`効果:「${target.name}」に【ブロッカー】を付与`, {
        ...prev, player: {
          ...p,
          field: p.field.map(c => c._uid === charUid ? { ...c, _hasBlocker: true } : c),
        },
      });
    });
  }, []);

  // ── リーダー相手アタック時効果発動（例: 青黄ナミ OP11-041）────────
  // discardCardUid: 手札から捨てるカードUID
  // effectType: 'leaderPower+2000' など
  const playerUseLeaderDefenseAbility = useCallback((discardCardUid) => {
    setState(prev => {
      if (!prev) return prev;
      const p = prev.player;
      const leaderEff = p.leaderEffect;
      if (!leaderEff?.hasOpponentAttackAbility) return addLog('このリーダーには相手アタック時効果がありません', prev);
      if (p.leaderAbilityUsed) return addLog('相手アタック時効果は既にこのターン使用済みです', prev);
      // DON!! 条件チェック
      const requiredDon = leaderEff.opponentAttackRequiresDon ?? 1;
      if (requiredDon > 0 && (p.leader.donAttached || 0) < requiredDon) {
        return addLog(`リーダーにDON!!×${requiredDon}以上が必要です`, prev);
      }
      // 手札から指定カードを捨てる
      const cardToDiscard = p.hand.find(c => c._uid === discardCardUid);
      if (!cardToDiscard) return addLog('手札にそのカードが見つかりません', prev);
      const newHand = p.hand.filter(c => c._uid !== discardCardUid);
      const newTrash = [...p.trash, cardToDiscard];
      // 効果適用
      const effectType = leaderEff.opponentAttackEffect || 'leaderPower+2000';
      let powerBuff = p.leaderPowerBuff || 0;
      if (effectType === 'leaderPower+2000') powerBuff += 2000;
      // attackStateのdefensePowerも更新
      const newAttackState = prev.attackState
        ? { ...prev.attackState, defensePower: (prev.attackState.defensePower || 0) + 2000 }
        : prev.attackState;
      return addLog(`【リーダー効果】「${cardToDiscard.name}」を捨て、このリーダーパワー+2000！`, {
        ...prev,
        player: { ...p, hand: newHand, trash: newTrash, leaderPowerBuff: powerBuff, leaderAbilityUsed: true },
        attackState: newAttackState,
      });
    });
  }, []);

  // ── プレイヤー: 自分ターン中ライフ→手札（ナミ等のライフ離れ効果用）
  const playerReturnLifeToHand = useCallback(() => {
    setState(prev => {
      if (!prev || prev.activePlayer !== 'player') return addLog('自分のターン中のみ使用できます', prev || {});
      const p = prev.player;
      if (p.life.length === 0) return addLog('ライフがありません', prev);
      const [topLife, ...restLife] = p.life;
      let ns = addLog(`ライフ上から1枚「${topLife.name}」を手札に加えた`, {
        ...prev,
        player: { ...p, life: restLife, hand: [...p.hand, { ...topLife, faceDown: false }] },
      });
      // ナミ等のリーダー効果: 自分ターン中ライフが離れた時、手札7枚以下なら1ドロー
      const leaderEff = ns.player.leaderEffect;
      if (leaderEff?.onLifeLeaveDraw && !ns.player.lifeLeaveAbilityUsed) {
        const handAfter = ns.player.hand;
        if (handAfter.length <= 7 && ns.player.deck.length > 0) {
          const [drawn, ...newDeck] = ns.player.deck;
          ns = addLog(`【${ns.player.leader.name}効果】ライフが離れた: 手札7枚以下のため1枚ドロー「${drawn.name}」`, {
            ...ns,
            player: {
              ...ns.player,
              deck: newDeck,
              hand: [...ns.player.hand, drawn],
              lifeLeaveAbilityUsed: true,
            },
          });
        }
      }
      return ns;
    });
  }, []);

  const resetBattle = useCallback(() => setState(null), []);

  return {
    state,
    startBattle,
    playerMulligan,
    confirmMulligan,
    advancePhase,
    playerPlayCard,
    playerPlayStage,
    playerPlayEvent,
    playerAttachDon,
    playerDetachDon,
    playerDetachDonLeader,
    playerSelectAttacker,
    playerSelectTarget,
    resolveAttack,
    resolveTrigger,
    cancelAttack,
    playerBlock,
    playerPassBlock,
    playerCounter,
    playerSelectCounterEffectTarget,
    playerSkipCounterEffect,
    playerConfirmStageSetup,
    playerUseGoroseiAbility,
    playerResolveCharAttack,
    playerConfirmCounter,
    processCpuPendingAttack,
    runCpuMainPhase,
    playerDraw,
    playerTrashCard,
    playerTrashFieldCard,
    playerTrashStage,
    playerToggleField,
    playerToggleLeader,
    playerReturnHandToTop,
    playerReturnHandToBottom,
    playerReturnFieldToTop,
    playerReturnFieldToBottom,
    playerReturnTrashToHand,
    playerReturnTrashToDeckTop,
    playerBeginSearch,
    playerResolveSearch,
    playerCancelSearch,
    playerReturnDonToDeckPriority,
    playerShuffleDeck,
    playerFlipLife,
    playerTapDon,
    playerUseEnelAbility,
    playerUseMihawkAbility,
    playerUseSmokerAbility,
    playerUseAkainuAbility,
    playerAttachDonMulti,
    playerPlayFromHandFree,
    playerPlayFromTrashFree,
    playerAddLife,
    playerKoCpuChar,
    playerRestCpuChar,
    playerDeckBottomCpuChar,
    playerDiscardHandCard,
    playerGiveCharBlocker,
    playerUseLeaderDefenseAbility,
    playerReturnLifeToHand,
    playerUseStageAbility,
    playerActivateTappedDon,
    playerAddDonFromDeck,
    playerRestAllCpuChars,
    resetBattle,
  };
}
