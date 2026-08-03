---
status: Draft
dependsOn:
  - docs/03_要件定義.md
usedBy:
  - src/
lastUpdated: "2026-07-21"
---
# Architecture Directory

Compassのシステムアーキテクチャやデータフロー設計に関するドキュメントを格納するフォルダです。
要件定義を満たすための具体的なシステム構造や技術選定がここに記録されます。


## Documents

- [MVP Design Review](MVP_DESIGN_REVIEW.md): MVPを将来の負債にしないための優先レビューとリファクタリング方針。
- [D-0018 Calendar / Life Timeline の Domain・保存境界](D-0018-calendar-life-timeline-boundary.md): CalendarEventRecord、時間・timezone、Conversation provenance、privacy・ML・revision、読み取り専用Timelineの境界。
