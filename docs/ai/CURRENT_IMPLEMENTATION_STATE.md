# Compass Agent Instructions

## Source of Truth

- 最新の実装は必ず origin/main を基準とする
- 古いブランチや過去の会話内容を正としない
- docs とコードが矛盾する場合は、作業前に報告する

## UserModel Invariants

- Evidenceのない理解をUserModelの有効な理解として扱わない
- `evidenceList.length === 0` のHypothesisはCompass Mapに表示しない
- EvidenceのないHypothesisのconfidenceはUIで割合表示しない
- デモ用の固定UserModelを本番初期値として使用しない

## Data Flow

DailyLog
→ Analysis
→ Evidence
→ Understanding Candidate
→ User Confirmation
→ UserModel

DailyLogから直接UserModelを確定しない。

## Migration Rules

- migration関数を追加した場合、必ず本番の読み込み経路に接続する
- migrationは冪等であること
- localStorageの既存データを考慮すること

## Completion Requirements

- `npm run build` を実行する
- 変更した機能の実行経路を確認する
- 変更ファイル一覧を報告する
- 未接続の関数や未使用コードがないか確認する
