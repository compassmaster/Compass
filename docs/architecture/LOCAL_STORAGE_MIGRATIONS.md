---
status: Active
lastUpdated: "2026-07-21"
---

# LocalStorage Migration Policy

Compassは、ユーザーが入力・確認したデータを不必要に削除しない。

## Legacy demo UserModel migration

過去の開発版では、デモ用または初期プロフィールに近いUserModelが `localStorage` に保存される可能性があった。

この修正では、データ初期化ではなく、旧デモデータの一度限りのマイグレーションとして扱う。

- `localStorage.clear()` は使用しない。
- 削除対象は `compass_user_model` のみ。
- DailyLog、Insight、Candidate、UserModel update history は削除しない。
- `compass_migration_legacy_demo_user_model_removed_v1` を保存し、同じ削除判定を毎回実行しない。
- Evidenceなしで非空valueかつconfidenceを持つ旧UserModelは、根拠のないAI理解として無効化する。

## Evidence invariant

AIまたはReflection由来の理解は、Evidenceに裏付けられていなければUserModel理解として扱わない。

- Candidate適用時に `evidenceRefs` がない場合は拒否する。
- Compass Map表示時も、`value` と `confidence` があっても `evidenceList` が0件なら理解として表示しない。
- 空状態では「Compassは、まだあなたについて十分な理解を持っていません」と表示する。
