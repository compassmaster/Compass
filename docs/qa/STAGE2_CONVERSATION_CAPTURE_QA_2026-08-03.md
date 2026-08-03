# Stage 2 Conversation Capture QA結果

<!-- STAGE2_QA_REPORT_2026_08_03 -->

- Issue: #85
- Parent: #72
- 実施日: 2026-08-02〜2026-08-03
- 環境: Windows / Chromium系ブラウザ / local development server
- 検証基準main: `10b1add2dedfb08864f07c7dbbb4e5889829176e`

## 判定

Stage 2 — Conversation Captureの主要な実ブラウザ体験は合格。途中で発見した確認前削除のHigh不具合はIssue #86 / PR #87で修正し、修正後の再QAも合格した。

## 確認済み

- 明示発言でだけ構造化DailyLog flowを開始。
- DATE → MOOD → FATIGUE → NOTE → EVENTSを一問ずつ表示。
- 未選択・不正入力のerror表示と対象fieldへのfocus復帰。
- back時の入力保持、note / eventsの「なし」、eventsの空白正規化。
- Candidateの内容、保存先、対象日、目的、source excerpt、値の由来、未保存状態の表示。
- 修正適用前の最終確認禁止、修正後の自動保存なし。
- rejectでCandidateを消し、同一session内の再提案抑制理由を表示。
- READYだけで保存可能、COMMITTING中の二重操作禁止、COMMITTED表示。
- 保存値の一致、同日複数Record、会話全文・Candidate ID・Message ID・deduplicationKeyの非保存。
- 保存後の正しいRecordへのVIEW / EDIT / DELETE、編集対象の一意性、provenance保持。
- 削除dialog表示前のRecord維持、cancel後のfocus復帰、明示confirmによる対象Recordだけの削除。
- 編集・削除後に古いCOMMITTED receiptをactive表示へ残さない。
- reload後に保存済みDailyLogだけを維持し、Conversation session / Candidateを復元しない。
- 360px / 390px / 768px / desktopの対象画面で横scroll、文字切れ、button重なり、dialog画面外表示なし。
- keyboardで主要操作を完了し、focus-visibleを確認。
- backup export / preview / restore、provenance付きDailyLogの復元、Conversation transient stateの非復元。
- backup resource数を増やしていない。

## 自動確認

PR #87のCIで `npm ci`、`npm run lint`、`npm run build`、Vitest DOM統合テストを含む `npm test` が成功した。Stage 2完了文書PRではCIに `git diff --check` を追加し、4項目を同一PRで再確認する。

## 発見・解消した不具合

### Issue #86: 確認前削除

Conversationの「保存した記録を削除する」から、確認dialogを操作する前にRecordが削除され得た。PR #87でopenとconfirmを別イベント境界へ分離し、次を追加した。

- 次フレームまでconfirm無効。
- pending Record IDと表示Record IDの一致確認。
- click / Enter / Space / StrictMode / stale target / missing Record / 同日複数Record / 削除失敗のDOM統合テスト。
- 失敗時のRecord維持、dialog close、alert、変更通知抑制。

修正後の実ブラウザQAで、確認前維持、cancel、再open、明示confirm、対象Recordだけの削除を確認した。

## 非ブロッキング項目

- 物理端末のsoft keyboard。
- スクリーンリーダーの実読み上げ。
- 却下抑制メッセージを、より自然な日本語へ改善すること。

これらはStage 2の保存安全性と完了判定を妨げないが、後続のアクセシビリティ／UX改善で扱う。
