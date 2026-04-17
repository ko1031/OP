# Issue Auto-Fix Report — 2026-04-16

## Summary
- Issues reviewed: 4
- Fixed: 1
- Skipped: 3

---

## Fixed Issues

### #5 — [Bug] リーダー「サボ」の常時効果（相手パワーマイナス）が適用されない

- **Fix**: `useBattleState.js` の `getConditionalPowerBuff()` 関数に「自分のライフがN枚以上の場合、このリーダーのパワー-M」パターンを追加。また、CPU攻撃時のプレイヤーリーダー防御力計算でも `computeDefensePower()` を呼び出すよう修正し、パッシブ効果（パワー±）が反映されるようにした。

- **Root cause (修正前の挙動)**:
  - `getConditionalPowerBuff()` はパワー**加算**のパターンしか処理しておらず、「このリーダーのパワー-1000」のような**減算**パターンを未処理だった。
  - CPU がプレイヤーリーダーに攻撃する際の防御力計算が `(target.power + leaderPowerBuff)` のシンプルな加算のみで、`computeDefensePower()` を呼ばず `getConditionalPowerBuff()` も適用されていなかった。

- **Files changed**:
  - `deck-builder/src/hooks/useBattleState.js`

- **Commit**: `09d2179` — fix(Issue#5): リーダー「サボ」OP13-004の常時効果（ライフ4枚以上でパワー-1000）を実装

---

## Skipped Issues

### #6 — [要望] 開始フェイズ（リフレッシュ/ドロー/ドン!!）の自動実行機能
- **Reason**: 機能追加リクエスト（feature request）。リフレッシュ・ドロー・DON!!の3ステップを自動処理する UI オプションの実装が必要で、仕様が明確でないため自動修正の対象外。

### #8 — [Bug] プロモサボ(P-105)の【登場時】効果によるレストのドン!!付与が機能しない
- **Reason**: 修正に必要な変更が複雑すぎて自動修正の対象外。
  - P-105 の「ライフ上か下から1枚を手札に加えることができる」アクション（上/下を選択する UI）が未実装
  - 「レストのドン‼1枚を付与する」ターゲット選択 UI が未実装
  - `parseEntryEffect()` と `EntryEffectModal` への大幅な変更と新規ゲーム state 関数の追加が必要
  - 影響範囲が大きくリグレッションリスクが高い

### #10 — [Bug] キャラクター「サボ(OP13-120)」の【起動メイン】コスト増加効果が反映されない
- **Reason**: 修正に必要な変更が複雑すぎて自動修正の対象外。
  - 「次の相手のターン終了時まで、コスト+2」という期限付きコスト修正の state 管理が未実装
  - キャラカードに `temporaryCost` フィールドを追加し、対戦中の cost 判定（KO 判定等）に全て反映する必要がある
  - さらにターン終了時にリセットするロジックも必要
  - `parseActiveAbility()` のみならず複数のファイルへの大規模修正が必要

---

## Notes

- GitHub PAT（`.claude/secrets/github_pat.txt`）が不完全（値: `"g"`）のため、Issue へのコメント投稿はスキップしました。
  PAT を正しく設定すれば、次回の実行から自動コメントが可能になります。

## Next Steps

修正内容を確認の上、以下を実行してください：

```bash
cd /sessions/confident-friendly-galileo/mnt/GitHub--OP

# コミット内容の確認
git log --oneline -5
git show 09d2179

# 問題がなければプッシュ
git push origin main
```

その後、GitHub で Issue #5 を手動でクローズしてください。

Issue #8、#10 については、手動での実装計画を立てることをお勧めします：
- **#8**: `EntryEffectModal` に「ライフ上/下から1枚を選ぶ」UI + 「レストDON!!をターゲットに付与」UI を追加
- **#10**: キャラクターの一時的コスト修正を state で管理するシステムの設計・実装
