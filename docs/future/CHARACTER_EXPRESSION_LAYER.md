# Character Expression Layer

## Purpose

Character Expression Layer は、Compassが観測・理解した内容を、ユーザーにとって親しみやすく、愛着を持ちやすく、共有しやすい形で表現するための将来構想である。

Compassの本体は、Evidence・Reflection・Understanding Candidate・UserModelを中心とした、根拠付きで慎重な理解システムである。
しかし、そのままでは体験がやや硬く、ユーザーが直感的に楽しめる要素や、他者と共有しやすい魅力が不足する可能性がある。

そのため、Compassでは将来的に、理解の本体とは別に、理解内容を「キャラクター」という形で表現する層を導入する。

この層の目的は、以下の4つである。

- ユーザー理解を、より感覚的で親しみやすい形で伝える
- 「まだ理解が育っていない状態」も魅力的に表現する
- ユーザーに愛着と継続利用の動機を与える
- SNS共有や会話のきっかけとなる、拡散性のある体験をつくる

---

## Core Principle

Character Expression Layer は、**理解そのもの**ではなく、**理解を表現するための層**である。

Compassは、UserModelを根拠付き仮説として慎重に扱う。
そのため、キャラクター表現をUserModel本体と混同してはならない。

### 原則

1. キャラクターはUserModel本体ではない  
2. キャラクターはEvidenceおよび確認済み理解をもとに生成される  
3. 根拠が不十分な段階では、完成形を出さず未成熟な姿で表現する  
4. キャラクター表現を逆流させてUserModelを更新してはならない  
5. キャラクターはあくまで参考的・娯楽的な表現であり、人格の断定ではない  
6. ユーザーが気に入らない場合、非表示・再生成・解釈変更ができる余地を残す  

---

## Relationship to UserModel

Compassにおける理解の正式な流れは、以下である。

```text
DailyLog / SleepRecord / その他観測データ
        ↓
Analysis
        ↓
Evidence
        ↓
Understanding Candidate
        ↓
User Confirmation
        ↓
UserModel
