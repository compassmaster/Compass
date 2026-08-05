---
status: Draft
dependsOn:
  - docs/03_要件定義.md
usedBy:
  - src/
lastUpdated: "2026-08-05"
---
# Architecture Directory

Compassのシステムアーキテクチャやデータフロー設計に関するドキュメントを格納するフォルダです。
要件定義を満たすための具体的なシステム構造や技術選定がここに記録されます。


## Documents

- [MVP Design Review](MVP_DESIGN_REVIEW.md): MVPを将来の負債にしないための優先レビューとリファクタリング方針。
- [D-0018 Calendar / Life Timeline の Domain・保存境界](D-0018-calendar-life-timeline-boundary.md): CalendarEventRecord、時間・timezone、Conversation provenance、privacy・ML・revision、読み取り専用Timelineの境界。
- [D-0019 身体的疲労・精神的疲労と予定提案の境界](D-0019-fatigue-dimensions-and-scheduling-boundary.md): 既存fatigueの後方互換、二軸の定義、入力・欠損・social energy・予定提案・ML versioningの境界。
- [D-0020 自由会話のLLM provider・secret・deployment境界](D-0020-llm-provider-secret-and-deployment-boundary.md): provider abstraction、server-side secret、環境別serverless構成、共通contract、privacy・cost controlの境界。
