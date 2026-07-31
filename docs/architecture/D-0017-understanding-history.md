# D-0017 Understanding変更履歴

- Status: Accepted
- Date: 2026-07-31

## 決定

Understanding Candidateへの回答変更、およびUnderstanding Objectの生成・意味のある更新・解除を、`compass_understanding_history_v1`へappend-onlyイベントとして保存する。履歴は説明・監査・時間変化表示用であり、現在状態のSource of Truthではない。現在状態はCandidate Response RepositoryとUnderstanding Object Repositoryが引き続き担う。

イベントはCandidateの表示文とObjectのbefore/after snapshotを持ち、保存・取得時に防御的コピーする。導入以前の履歴は現在状態からbackfillしない。件数制限による自動削除・圧縮も行わない。旧バックアップにresourceがなければ空の履歴として復元し、推測しない。

## 対象外と依存関係

maturityの自動昇格・降格は扱わない。Event Sourcingへ移行しない。Formal UserModel Resolverは履歴を直接参照せず、現在のUnderstanding Objectだけを解決する。
