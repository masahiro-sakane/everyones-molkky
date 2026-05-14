# E2Eテスト パターンガイド

## 概要

本プロジェクトのE2Eテストは [Playwright](https://playwright.dev/) で実装されています。
テスト対象は `http://localhost:3000`（デフォルト）で、`BASE_URL` 環境変数で変更可能です。

## 前提条件

- `npm run dev` で開発サーバーが起動済み
- Docker で PostgreSQL が起動済み（`docker compose up -d`）
- テストはプロジェクトルートではなく **worktree ディレクトリ** から実行すること

```bash
cd .claude/worktrees/affectionate-chatelet-c0e83d
npx playwright test
```

## テストファイル一覧

| ファイル | 対象機能 | テスト数 |
|---|---|---|
| `match-flow.spec.ts` | 基本ナビゲーション・ページ表示確認 | 4 |
| `team-flow.spec.ts` | チーム作成・メンバー管理フロー | 7 |
| `full-match.spec.ts` | 試合フル通しテスト（チーム戦） | 2 |
| `solo-match.spec.ts` | 個人戦フロー | 4 |
| `match-limit.spec.ts` | ターン制限・時間制限ルール | 4 |
| `disqualification.spec.ts` | 失格ルール（3回連続ミス） | 2 |
| `over-score.spec.ts` | 50点超過→25点リセット | 2 |
| `fault.spec.ts` | フォルト（踏み越え・ドロップ等） | 4 |
| `multi-team.spec.ts` | 3チーム以上の試合 | 4 |

## UI構造に関する重要注意事項

### ビュー切替（SheetMatchBoard / MatchBoard）

試合ページ（`/matches/[shareCode]`）は `MatchView` コンポーネントが画面幅に応じてビューを切り替える。

| ビュー | 条件 | コンポーネント |
|---|---|---|
| スコアシート（sheet） | デスクトップ（768px以上）・初回デフォルト | `SheetMatchBoard` |
| カード（card） | モバイル・または手動切替後 | `MatchBoard` |

**E2Eテストはデスクトップ（Desktop Chrome）で実行されるため、デフォルトはシートビュー。**
カードビューにしか存在しないセレクターを使う前に必ず `switchToCardView` を呼ぶこと。

### ビュー別のセレクター対応表

| セレクター | カードビュー（MatchBoard） | シートビュー（SheetMatchBoard） |
|---|---|---|
| `投擲履歴（N回）` | あり（section内h2） | なし |
| `getByLabel('スコアボード')` | あり | なし（`スコアシート` に変わる） |
| `getByLabel('投擲記録')` | あり（section） | あり（aside） |
| `getByTestId('match-result')` | あり（MatchResult） | なし（WinnerBanner: `winner-banner`） |
| `view-toggle-card` / `view-toggle-sheet` | 両方に存在（ViewToggle） | 同左 |

## テストの構造

### タイムアウト設定

- 通常テスト: デフォルト（30秒）
- フル通しテスト: `test.setTimeout(120_000)`（試合完走のため2分に延長）

### 共通ヘルパー関数

全ファイルで同一パターンのヘルパー関数を使用しています。

#### `switchToCardView(page)` ★必須

試合ページ遷移後に必ず呼ぶ。カードビューに切り替え、`投擲履歴` セクションの出現を待つ。
`page.reload()` 後も再度呼ぶ必要がある。

```typescript
async function switchToCardView(page: Page) {
  await page.getByTestId('view-toggle-card').click()
  await expect(page.getByText(/投擲履歴/)).toBeVisible({ timeout: 10_000 })
}
```

#### `waitForThrowRecorded(page, expectedCount)`

投擲完了を投擲履歴のカウント表示で検知。SSEによりネットワークがidle状態にならないため
`networkidle` は使えない。カードビュー切替後のみ有効。

**注意**: ゲームが終了する投擲（最終ターン）には使わない。`MatchResult` が表示され
`投擲履歴` セクションが消えるためタイムアウトする。最終ターンは直接 `match-result` を待つ。

```typescript
async function waitForThrowRecorded(page: Page, expectedCount: number) {
  await expect(page.getByText(`投擲履歴（${expectedCount}回）`)).toBeVisible({ timeout: 15_000 })
}
```

#### `recordSkittle(page, skittleNumber, throwCount)`

スキットル番号を指定して投擲を確定する。`mode-single` に切り替えてから選択。

```typescript
async function recordSkittle(page: Page, skittleNumber: number, throwCount: number) {
  await page.getByTestId('mode-single').click()
  const skittleBtn = page.getByTestId(`score-${skittleNumber}`)
  await skittleBtn.scrollIntoViewIfNeeded()
  await skittleBtn.click()
  const confirmBtn = page.getByTestId('confirm-throw')
  await confirmBtn.scrollIntoViewIfNeeded()
  await confirmBtn.click()
  await waitForThrowRecorded(page, throwCount)
}
```

#### `recordMiss(page, throwCount)`

ミスボタンをクリックして0点の投擲を記録。ScoreInputPanel の `miss-button` を使う。

```typescript
async function recordMiss(page: Page, throwCount: number) {
  await page.getByTestId('miss-button').click()
  await waitForThrowRecorded(page, throwCount)
}
```

#### `recordFault(page, faultLabel, throwCount)`

フォルトタブに切り替えて種別を選択し確定する。

```typescript
async function recordFault(page: Page, faultLabel: string, throwCount: number) {
  await page.getByTestId('mode-fault').click()
  await page.getByRole('button', { name: faultLabel, exact: true }).click()
  await page.getByTestId('record-fault').click()
  await waitForThrowRecorded(page, throwCount)
}
```

#### `createTeamWithMember(page, teamName, memberName)`

チームを作成しメンバーを1人追加する。チームIDを返す。

```typescript
async function createTeamWithMember(page, teamName, memberName): Promise<string>
```

#### `createPlayer(request, playerName)`

個人戦用。API経由でプレイヤー（ユーザー）を作成する。ユーザーIDを返す。

```typescript
async function createPlayer(request: APIRequestContext, playerName: string): Promise<string>
```

#### `cleanup(request, teamIds/playerIds, matchShareCodes)`

テスト後にAPIで試合・チーム/プレイヤーを削除する。`finally` ブロックで必ず実行する。

```typescript
async function cleanup(request, teamIds, matchShareCodes) {
  for (const shareCode of matchShareCodes) {
    await request.delete(`${BASE_URL}/api/matches/${shareCode}`).catch(() => {})
  }
  for (const id of teamIds) {
    await request.delete(`${BASE_URL}/api/teams/${id}`).catch(() => {})
  }
}
```

## 重要なパターン・ノウハウ

### 試合ページ遷移後の標準フロー

```typescript
await page.getByTestId('start-match-submit').click()
await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
matchShareCodes.push(shareCode)

// デスクトップではシートビューがデフォルト → カードビューに切替
await switchToCardView(page)
await expect(page.getByLabel('投擲記録').getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })
```

### URL遷移の待ち方

`/matches/new` から `/matches/[shareCode]` への遷移はコールバック形式で `/new` を除外する。

```typescript
await page.waitForURL(
  (url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new'
)
```

### ページリロード後のビュー切替

`page.reload()` 後はデスクトップでシートビューに戻るため、再度 `switchToCardView` を呼ぶ。

```typescript
await page.reload()
await switchToCardView(page)
await expect(page.getByLabel('投擲記録').getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })
```

### テキストの完全一致

部分マッチを避けるため `{ exact: true }` を使う（例: `2番` が `12番` にマッチしないよう）。

```typescript
await expect(page.getByText('2', { exact: true })).toBeVisible()
```

### スコープ限定でのgetByText

同じテキストが複数箇所に出る場合、ラベルでスコープを絞る。

```typescript
await expect(page.getByLabel('スコアボード').getByText(teamAName)).toBeVisible()
```

### チーム選択の検証

チームが選択されているかどうかは `aria-pressed` 属性で確認する。

```typescript
await expect(teamAButton).toHaveAttribute('aria-pressed', 'true')
```

### ダイアログ内操作

```typescript
await page.getByTestId('add-member-button').click()
const dialog = page.getByRole('dialog')
await expect(dialog).toBeVisible()
await page.getByTestId('member-name-input').fill(memberName)
await page.getByTestId('add-member-submit').click()
```

### 時間制限テストの時刻操作

実際に時間が経過するのを待たずに、PATCH APIで `startedAt` を過去に書き換える。
リロード後はビュー切替が必要。

```typescript
const pastTime = new Date(Date.now() - 2 * 60 * 1000).toISOString()
await request.patch(`${BASE_URL}/api/matches/${shareCode}`, {
  data: { startedAt: pastTime },
})
await page.reload()
await switchToCardView(page)
```

### テストデータの命名規則

テスト間の干渉を防ぐため、テスト名にタイムスタンプを付与する。

```typescript
const teamAName = `E2E_チームA_${Date.now()}`
const playerAName = `E2E_個人A_${Date.now()}`
```

## 得点戦略 — 失格を避けるルール

**チームBを失格させないためには、3連続ミスを防ぐ必要がある。**
「2連続ミスしたら次のターンで1点を取ってカウントをリセット」する戦略を使う。

```
ターン2: B ミス(連続1)
ターン4: B ミス(連続2)
ターン6: B 1番スキットル（連続カウントリセット）← これがないとターン8でB失格
ターン8: B ミス(連続1)  ← OK
```

## テスト別 得点戦略

### full-match.spec.ts（チーム戦フル通し）

チームBを失格させないよう2連続ミスごとに1点を記録しながら、チームAを50点で勝利させる:

```
ターン1: A → 12番 (12点)
ターン2: B → ミス (連続1)
ターン3: A → 12番 (24点)
ターン4: B → ミス (連続2)
ターン5: A → 12番 (36点)
ターン6: B → 1番 (連続カウントリセット)
ターン7: A → 12番 (48点)
ターン8: B → ミス (連続1)
ターン9: A → 2番 (50点) → 勝利
```

### solo-match.spec.ts（個人戦フル通し）

プレイヤーAが50点で勝利、プレイヤーBは失格させない:

```
ターン1: A +12 = 12点
ターン2: B ミス(連続1)
ターン3: A +12 = 24点
ターン4: B 1本倒す（連続カウントリセット）
ターン5: A +12 = 36点
ターン6: B ミス(連続1)
ターン7: A +12 = 48点
ターン8: B ミス(連続2・失格にならない)
ターン9: A → 2番 (50点) → 勝利
```

### match-limit.spec.ts（ターン制限・2ラウンド）

2ラウンド制限でチームAの得点が高い状態でラウンドを終了させる:

```
ラウンド1:
  ターン1: A → 5番 (5点)
  ターン2: B → ミス (0点)
ラウンド2:
  ターン3: A → 3番 (8点)
  ターン4: B → ミス → 2ラウンド完了 → チームA(8点)が勝利
```

## 失格ルールパターン

### 2チームの場合（disqualification.spec.ts）

**重要**: 2チームのうち1チームが失格した場合、残り1チームが即座に「最後の1チーム」として
勝利判定される。失格後にゲームが継続することはない。

```
ターン6: チームB ミス3回目 → チームB失格
→ チームAが唯一の残存チームとして即座に勝利（点数は問わない）
→ MatchResult が表示される
```

検証パターン:

```typescript
// 最後のミスは waitForThrowRecorded を使わず、直接 miss-button をクリック
await page.getByTestId('miss-button').click()

// ゲームが即座に終了し、MatchResult が表示される
await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
await expect(page.getByTestId('match-result')).toContainText(`${teamAName} の勝利！`)
await expect(page.getByTestId('match-result')).toContainText(teamBName) // 失格チームも表示
```

### 3チームの場合（multi-team.spec.ts）

3チーム中1チームが失格しても、残り2チームがいるためゲームは継続する。
失格チームのターンはスキップされ、残り2チームのサイクルになる。

### 連続ミスカウントのリセット

得点（1本以上倒す）するとカウントがリセットされる。
2連続ミス→得点→2連続ミス = 合計4ミスでも失格にならない。

## オーバースコアパターン（over-score.spec.ts）

50点超過→25点リセット後の検証:

```typescript
// ゲームは継続（MatchResult でない）
await expect(page.getByLabel('投擲記録').getByText('投擲を記録')).toBeVisible()
await expect(page.getByTestId('match-result')).not.toBeVisible()
// 次ターンの投擲者が表示されること
await expect(page.getByTestId('current-thrower')).toContainText('投擲者B', { timeout: 5_000 })
```

## フォルトパターン（fault.spec.ts）

フォルト種別と対応するラベル:

| 種別 | ラベル | スコア影響 |
|---|---|---|
| `MISS` | `ミス（0本）` | スコア変更なし（0点投擲） |
| `DROP` | `ドロップ` | スコア変更なし（0点投擲） |
| `STEP_OVER` | `踏み越え` | 36点以下: スコア変更なし / 37点以上: 25点リセット |
| `WRONG_ORDER` | `順番違い` | スコア変更なし（0点投擲） |

フォルトを記録する前に種別を選択しないと `record-fault` ボタンは `disabled` のまま。

## 3チーム以上の試合パターン（multi-team.spec.ts）

3チーム選択して試合作成する場合も `aria-pressed="true"` で選択状態を確認:

```typescript
await teamAButton.click()
await teamBButton.click()
await teamCButton.click()
await expect(teamAButton).toHaveAttribute('aria-pressed', 'true')
await expect(teamBButton).toHaveAttribute('aria-pressed', 'true')
await expect(teamCButton).toHaveAttribute('aria-pressed', 'true')
```

投擲順サイクルの検証: A→B→C→A→B→C の順序を `current-thrower` の `containText` で追う。

## testidリスト

| testid | コンポーネント | 説明 |
|---|---|---|
| `score-{1-12}` | `ScoreInputPanel` | スキットル番号/本数選択ボタン |
| `mode-single` | `ScoreInputPanel` | 1本（番号指定）モードタブ |
| `mode-multi` | `ScoreInputPanel` | 複数本（本数指定）モードタブ |
| `confirm-throw` | `ScoreInputPanel` | 投擲確定ボタン |
| `miss-button` | `ScoreInputPanel` | ミス（0点）ボタン |
| `mode-score` | `ThrowRecorder` | 得点入力モード切替ボタン |
| `mode-fault` | `ThrowRecorder` | フォルトモード切替ボタン |
| `record-fault` | `ThrowRecorder` | フォルト記録確定ボタン |
| `current-thrower` | `CurrentThrower` | 現在の投擲者表示 |
| `match-result` | `MatchResult` | 試合結果表示（カードビューのみ） |
| `winner-banner` | `WinnerBanner` | 勝利バナー（シートビューのみ） |
| `view-toggle-card` | `ViewToggle` | カードビュー切替ボタン |
| `view-toggle-sheet` | `ViewToggle` | シートビュー切替ボタン |
| `start-match-submit` | `CreateMatchForm` | 試合開始ボタン |
| `create-team-submit` | チーム作成フォーム | チーム作成ボタン |
| `add-member-button` | チーム詳細 | メンバー追加ボタン |
| `member-name-input` | メンバー追加ダイアログ | メンバー名入力欄 |
| `add-member-submit` | メンバー追加ダイアログ | メンバー追加確定ボタン |
| `grand-total-{teamId}` | `ScoreSheetView` | チーム合計得点セル（シートビュー） |
| `rank-{1,2,3,...}` | `ScoreSheetView` | 最終順位表示（シートビュー） |

## テスト実行コマンド

```bash
# 全テスト実行（worktreeディレクトリから）
npx playwright test

# 特定ファイル実行
npx playwright test e2e/full-match.spec.ts

# UIモードで実行
npx playwright test --ui

# レポートを表示
npx playwright show-report
```

## Playwright設定（playwright.config.ts）

| 設定項目 | 値 | 理由 |
|---|---|---|
| `fullyParallel` | `false` | DB状態の競合を防ぐ |
| `workers` | `1` | シリアル実行で安定性確保 |
| `retries` | CI: 2, Local: 0 | CI環境のみリトライ |
| `reporter` | `html` | HTMLレポート生成 |
| `trace` | `on-first-retry` | リトライ時のみトレース取得 |
| `screenshot` | `only-on-failure` | 失敗時のみスクリーンショット |
