# みんなのモルック - API仕様

## 共通

### レスポンス形式

```json
// 成功
{ "success": true, "data": <T> }

// エラー
{ "success": false, "error": <string | ZodIssue[]> }
```

### ステータスコード

| コード | 意味 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | バリデーションエラー |
| 404 | リソースが見つからない |
| 422 | ビジネスロジックエラー |
| 500 | サーバーエラー |

---

## ユーザー

### GET /api/users
ユーザー一覧を取得する。

**レスポンス**
```json
{
  "success": true,
  "data": [
    { "id": "...", "name": "田中 太郎", "avatarUrl": null, "createdAt": "...", "updatedAt": "..." }
  ]
}
```

### POST /api/users
ユーザーを作成する。

**リクエスト**
```json
{ "name": "田中 太郎", "avatarUrl": "https://example.com/avatar.png" }
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | ✓ | ユーザー名（1〜50文字） |
| avatarUrl | string | - | アバター画像URL |

---

## チーム

### GET /api/teams
チーム一覧を取得する（メンバー情報含む）。

### POST /api/teams
チームを作成する。

**リクエスト**
```json
{ "name": "チームA" }
```

### GET /api/teams/[id]
指定IDのチームを取得する（メンバー情報含む）。

### PUT /api/teams/[id]
チーム情報を更新する。

**リクエスト**
```json
{ "name": "新チーム名" }
```

### DELETE /api/teams/[id]
チームを削除する。

### POST /api/teams/[id]/members
チームにメンバーを追加する。

**リクエスト**
```json
{ "userId": "user-id", "role": "member" }
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| userId | string | ✓ | 追加するユーザーのID |
| role | "captain" \| "member" | - | 役割（デフォルト: "member"） |

### DELETE /api/teams/[id]/members
チームからメンバーを削除する。

**リクエスト**
```json
{ "userId": "user-id" }
```

---

## 試合

### GET /api/matches
試合一覧を取得する。

### POST /api/matches
試合を作成する（同時にセット・ターンも初期化する）。

**リクエスト**
```json
{ "teamIds": ["team-id-1", "team-id-2"] }
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| teamIds | string[] | ✓ | 参加チームIDの配列（2〜10チーム、投擲順） |

**レスポンス例**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "IN_PROGRESS",
    "shareCode": "abc123",
    "matchTeams": [...],
    "sets": [{ "setNumber": 1, "turns": [{ "turnNumber": 1 }] }]
  }
}
```

### GET /api/matches/[shareCode]
shareCodeで試合詳細を取得する（投擲履歴含む）。

---

## 投擲

### POST /api/matches/[shareCode]/throws
投擲を記録する。スコア計算・勝利判定を自動で行う。

**リクエスト**
```json
{
  "userId": "user-id",
  "teamId": "team-id",
  "skittlesKnocked": [7],
  "faultType": null
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| userId | string | ✓ | 投擲者のユーザーID |
| teamId | string | ✓ | 投擲チームのID |
| skittlesKnocked | number[] | ✓ | 倒したスキットルの番号（1〜12、重複不可） |
| faultType | "MISS" \| "DROP" \| "STEP_OVER" \| "WRONG_ORDER" \| null | - | フォルトの種類 |

**得点計算ルール**
- 1本倒し: そのスキットルの番号が得点
- 複数本倒し: 倒した本数が得点
- フォルトあり: 0点（skittlesKnockedは無視）

**レスポンス例**
```json
{
  "success": true,
  "data": {
    "throw": { "id": "...", "score": 7, ... },
    "result": {
      "score": 7,
      "totalScore": 27,
      "consecutiveMisses": 0,
      "isDisqualified": false,
      "isWinner": false,
      "isFault": false,
      "faultType": null
    }
  }
}
```
