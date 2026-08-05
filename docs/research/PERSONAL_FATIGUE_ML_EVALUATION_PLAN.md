---
status: Proposed
dependsOn: ["Issue #97 ML-ready Dataset Projection"]
usedBy: ["D-0019"]
lastUpdated: "2026-08-05"
---
# 最初の個人向け疲労度ML実験 — 評価計画（Issue #98）

## 目的、Source of Authority、非目的

一人の本人データで翌日の自己申告疲労度を予測する最初のオフライン実験について、実装前の評価契約を定める。目的は複雑なモデルを作ることではなく、単純な個人内baselineをfuture leakageなしに安定して上回る情報があるかを確認することである。

入力のSource of AuthorityはIssue #97の非永続・読み取り専用`ML_READY_DATASET_V1`だけとする。実験側でraw Repositoryを再joinせず、`schemaVersion`、`featureDefinition`、timezone、rule version、source failure、missing reason、source ID、leakage traceをrun manifestへ記録する。

本Issueではproductionモデル、学習・推論処理、UI、外部API、クラウド学習、ニューラルネットワーク、新しい永続化を実装しない。Analysis / Evidence / Understanding / Formal UserModelへ接続せず、**UserModelを自動更新しない**。結果は診断、治療、受診要否その他の**医療判断に使用しない**。

### D-0019との境界

[D-0019](../architecture/D-0019-fatigue-dimensions-and-scheduling-boundary.md)は将来の`physicalFatigue` / `mentalFatigue`を独立軸として定義するが、本評価計画のtargetは既存`DailyLog.fatigue`による総合／未分離疲労だけである。D-0019を理由に既存rowを二軸へ変換せず、`ML_READY_DATASET_V1`へtargetやfeatureを追加しない。

身体・精神を評価する場合は、将来の`ML_READY_DATASET_V2`、軸別target definition、missing / source audit、最低サンプル数、baseline、walk-forward、採用gateを定めた別計画を作る。V1とV2、または身体と精神のtargetを同じrunへ暗黙に連結しない。

## target、予測時点、feature availability cutoff

- feature日を`D`、targetを`targetDate = D+1`のDailyLog疲労度とする。予測時点はrowのIANA timezoneにおける**D+1 00:00**で、projectionの`featureCutoffInstant`を使う。
- 同日複数targetはIssue #97の`LATEST_CREATED_AT_THEN_ID_ASC` v1に従う。`createdAt`が最新の候補、同値ならIDのcode-point昇順で先頭の1件を採用する。`targetAdopted` / `targetExcluded`と候補数を残し、平均等へ変更しない。
- target欠損rowは教師あり指標の分母から外すがcoverageの分母には含め、targetを補完しない。
- `TARGET_DATE_MIDNIGHT_STRICTLY_BEFORE` v1を維持する。featureに使えるのは`createdAt`、存在する`updatedAt`、Weatherの`fetchedAt`がすべてcutoffより**厳密に前**とprojectionが判定したRecordだけであり、同値は利用不可とする。
- D+1以後の訂正、最終status、target、全期間統計をfeature、補完、前処理、parameter選択へ流用しない。Issue #97のfeatureだけを使い、title、note、sourceExcerpt等の本文、NLP特徴、個人間データは使わない。

## baseline

各評価originで、その時点までに利用可能なprojection列だけから次の4本を評価する。nullなら予測を出さない。

1. **前日疲労**: `fatigueLag1`。
2. **3日平均**: `fatigueMean3Days`（#97と同じく3暦日すべてが揃った場合のみ）。
3. **7日平均**: `fatigueMean7Days`（7暦日すべてが揃った場合のみ）。
4. **expanding personal mean**: originより前にlabelが利用可能になった本人targetだけの算術平均。最低7件まで予測せず、test labelを逐次混入させない。

比較可能rowでMAEが最小のものを**strongest baseline**とする。モデル対各baselineとstrongest baselineのpaired結果を併記する。coverageを上げるための0、全体平均、未来を含む平均による補完は禁止する。

## Walk-forward validation

random split、shuffle、通常のk-foldは禁止する。`targetDate`昇順（tieは`featureDate`、採用target ID順）に並べ、expanding-window walk-forwardを行う。

1. 最初の**21 targetありrow**を初期training windowとする。
2. 以後を連続する**7 targetありrow**のtest blockにする。各foldはtestより過去だけでfitし、次foldで直前blockをtrainingへ追加する。最後の1〜6件も評価する。
3. scaling、欠損処理、feature選択、regularization、hyperparameterはfoldのtraining内だけでfitする。調整はtraining末尾の時系列validationまたはnested walk-forwardで行い、testで調整しない。
4. baselineとcandidateは同じdataset / rule version、timezone、前処理、seed、library versionで評価する。versionが変わったrowを暗黙に連結せず、新runとして再projectionする。
5. fold別に加え、全out-of-fold予測のmicro集計を正式値とする。日付重複、training/test overlap、cutoff違反が1件でもあればrunを無効にする。

## 指標

### 主指標: MAE

連続予測を疲労尺度の範囲へclipし、丸めずにmean absolute errorを求める。モデルとbaselineの両方が予測できtargetがあるpaired rowで比較する。strongest baselineよりout-of-fold MAEが小さいことを最低条件とし、時系列block bootstrapによるMAE差の95%区間も報告する。

### 補助指標

- **exact accuracy**: clip後に最近傍の尺度値へ丸め（`.5`は上側）、targetと一致する割合。
- **±1 accuracy**: 同じ丸め済み予測とtargetの絶対差が1以下の割合。
- **baseline win rate**: paired rowで`|model-target| < |baseline-target|`となる割合。tieはwinにせず、4本別とstrongest baselineについて示す。
- **coverage**: `予測を返しtargetもあるrow / targetがある全評価row`。併せて`targetありrow / projection全row`、feature / missing reason別欠損率、source failure率を示す。

全指標に分子・分母、fold別値、期間を併記する。MAEを良くするためcoverageを落とすモデルは不採用とし、candidate coverageはstrongest baseline以上を原則とする。

## 最低・推奨サンプル数と段階

件数はcutoff監査を通過しtargetがありwalk-forwardで評価可能な本人row数であり、単なる暦日数ではない。

| 段階 | 必要条件 | 扱い |
| --- | --- | --- |
| **学習不可** | 28件未満、またはcutoff / version / source監査失敗 | 品質記述だけ。fit、score、優劣表示をしない |
| **実験可能** | **28件以上（最低サンプル数）**、1 test block以上 | ローカルの探索的walk-forwardのみ。ユーザー向け予測は禁止 |
| **暫定表示可能** | 60件以上、4 test block以上、採用gateを全て満たす | 将来の別Issueで、実験的・低確信・非医療と明示した限定表示を検討可能 |
| **安定評価可能** | **90件以上（推奨サンプル数）**、6 test block以上、直近28件でもgate維持 | 個人内再現性を評価可能。productionを自動承認しない |

paired件数が閾値を下回れば一段階下げる。90件は統計的保証ではなくreview基準で、効果量と不確実性を併記する。small tree ensembleはtargetあり180件以上かつ評価test 60件以上の場合だけ候補にできる。

## candidate modelと採用gate

複雑さの低い順に次だけを比較する。

1. **regularized linear regression**（Ridgeを第一候補、必要ならElastic Net）。
2. **ordinal logistic regression**。class確率の期待値をMAE、argmaxをaccuracyに用いる。
3. **small tree ensemble**。上記180 / 60件条件を満たす場合だけ、浅い木、少数木、固定seed、制限した探索範囲で比較する。

候補に残すには、(a) paired MAEがstrongest baselineより小さい、(b) MAE差95%区間の上端が0未満、(c)直近28件でもMAEがbaseline以下、(d) coverageがbaseline以上、(e)foldの過半数でMAE勝利、(f)重大なleakage / integrity違反なし、をすべて満たす。**baselineを安定して上回らないモデルは不採用**とし、accuracyだけの勝利や一部期間だけの勝利で覆さない。同等なら単純で説明しやすいものを選ぶ。

## リスクとレビュー

- **future leakage**: cutoff後の作成・訂正・取得、target、全期間fit前処理、random split、現在の最終Recordによる過去改変を禁止し、`leakageExclusions`とsource IDをfoldごとに監査する。
- **過学習**: regularization、少数の事前固定candidate、nested time-aware tuning、seed固定、全out-of-fold結果を用いる。test確認後のfeature追加は新version / runにする。
- **drift**: fold別・月別・直近28件のMAE、target分布、欠損率、coverageを比較する。生活、入力習慣、timezone、source変更を注記し、直近悪化時は表示停止または再評価する。
- **欠損**: nullと`NO_RECORD` / `INSUFFICIENT_HISTORY` / `SOURCE_FAILED` / `LEAKAGE_EXCLUDED` / provider reasonを区別する。indicatorや補完はtraining内で定義し、targetは補完しない。
- **説明可能性**: linear / ordinalは係数の符号・尺度・fold安定性、treeは分離を守ったpermutation importance等を示す。importanceを因果、人格、疾病の説明にしない。不安定・説明不能ならbaselineより優先しない。

## model version、再学習、削除、backup境界

将来のartifactは`modelVersion`、algorithm / hyperparameter、training期間とrow ID hash、dataset schema / feature / rule version、timezone、前処理、library version、seed、評価、作成日時を持つ。datasetや前処理変更時は上書きせず新versionとして全walk-forwardをやり直す。

再学習は自動・オンラインにせず、本人の明示操作または明示的ローカル保守を起点とする。新モデルが全gateを満たすまで旧モデルを置換しない。drift、source・schema変更、重大な欠損増加、gate未達を再評価理由とする。削除要求ではartifact、manifest、派生cacheを列挙して削除し、元RecordやUserModelを巻き添えにしない。元Record削除後は影響するartifactを無効化し、再評価なしに使わない。

本IssueではlocalStorage keyもbackup resourceも追加しない。将来のartifactはprivacy、互換性、削除伝播、復元時再検証を別Decisionで定めるまで**backup対象外**とする。復元で再学習、推論、UserModel更新を開始せず、raw projection、予測、target、本文をクラウドへ送信しない。

## 実験レポート

各runは匿名本人ID、期間、件数と段階、projection / rule / model version、cutoff監査、fold境界、4 baselineと全candidateの全指標、paired分母、95%区間、coverage / missing / source failure、drift、説明、採否理由を記載する。単一個人・自己申告・観察データであり医療用途でなくUserModelを更新しないことを明記する。結論は`不採用`、`追加データ待ち`、`暫定候補`のいずれかとし、本計画だけでproduction化、UI、継続学習を承認しない。
