import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
// APIRequestContext is used for player creation/cleanup via API

/**
 * 個人戦 E2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - DB が起動済み
 *
 * 得点戦略:
 * プレイヤーAが先攻。プレイヤーBはミス(0点)を連投。
 * プレイヤーA: 12点 x4投 + 2点 x1投 = 50点で勝利
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

/** 投擲完了を待つ（SSE refresh の余地を取る） */
async function waitForThrowRecorded(page: Page, _expectedCount: number) {
  await page.waitForTimeout(500)
}

/** カードビューに切替 */
async function switchToCardView(page: Page) {
  const cardToggle = page.getByTestId('view-toggle-card')
  if (await cardToggle.isVisible().catch(() => false)) {
    await cardToggle.click()
  }
}

/** スキットル番号ボタンをクリックして確定する（1本モード） */
async function recordSkittle(page: Page, skittleNumber: number, throwCount: number) {
  const singleMode = page.getByTestId('mode-single')
  if (await singleMode.isVisible().catch(() => false)) {
    await singleMode.click()
  }
  const scoreBtn = page.getByTestId(`score-${skittleNumber}`)
  await scoreBtn.scrollIntoViewIfNeeded()
  await scoreBtn.click()
  const confirmBtn = page.getByTestId('confirm-throw')
  await confirmBtn.scrollIntoViewIfNeeded()
  await confirmBtn.click()
  await waitForThrowRecorded(page, throwCount)
}

/** ミス（0点）を記録する */
async function recordMiss(page: Page, throwCount: number) {
  await page.getByTestId('miss-button').click()
  await waitForThrowRecorded(page, throwCount)
}

/** APIでプレイヤーを作成してIDを返す */
async function createPlayer(request: APIRequestContext, playerName: string): Promise<string> {
  const res = await request.post(`${BASE_URL}/api/users`, {
    data: { name: playerName },
  })
  const body = await res.json()
  if (!res.ok()) throw new Error(`プレイヤー作成失敗: ${JSON.stringify(body)}`)
  return body.data.id
}

/** テストデータを削除する */
async function cleanup(
  request: APIRequestContext,
  playerIds: string[],
  matchShareCodes: string[]
) {
  for (const shareCode of matchShareCodes) {
    await request.delete(`${BASE_URL}/api/matches/${shareCode}`).catch(() => {})
  }
  for (const id of playerIds) {
    await request.delete(`${BASE_URL}/api/users/${id}`).catch(() => {})
  }
}

test.describe('個人戦フロー', () => {
  test('個人戦を作成してプレイヤーが選択できる', async ({ page, request }) => {
    const playerIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      // 1. プレイヤーを2人作成
      const playerAName = `E2E_個人A_${Date.now()}`
      const playerBName = `E2E_個人B_${Date.now()}`
      const playerAId = await createPlayer(request, playerAName)
      playerIds.push(playerAId)
      const playerBId = await createPlayer(request, playerBName)
      playerIds.push(playerBId)

      // 2. 試合作成ページで「個人戦」タブに切り替える
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      await page.getByRole('button', { name: '個人戦' }).click()

      // プレイヤー選択UIが表示される
      await expect(page.getByText('参加プレイヤーを選択')).toBeVisible()

      // プレイヤーを選択
      const playerABtn = page.getByRole('button', { name: playerAName })
      const playerBBtn = page.getByRole('button', { name: playerBName })
      await expect(playerABtn).toBeVisible({ timeout: 10_000 })
      await expect(playerBBtn).toBeVisible({ timeout: 10_000 })

      await playerABtn.click()
      await playerBBtn.click()

      await expect(playerABtn).toHaveAttribute('aria-pressed', 'true')
      await expect(playerBBtn).toHaveAttribute('aria-pressed', 'true')

      // 投擲順プレビューが表示される
      await expect(page.getByText('投擲順', { exact: true })).toBeVisible()

      // 試合開始ボタンが有効になる
      const submitBtn = page.getByTestId('start-match-submit')
      await expect(submitBtn).not.toBeDisabled()

      // 3. 試合を開始
      await submitBtn.click()
      await page.waitForURL(
        (url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new',
        { timeout: 10_000 }
      )

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)
      expect(shareCode).toBeTruthy()

      // 4. 試合ページが表示される（個人戦）
      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })

      // 最初の投擲者はプレイヤーA
      await expect(page.getByTestId('current-thrower')).toContainText(playerAName)

      // 安定動作のためカードビューに切替
      await switchToCardView(page)

      // 現在の投擲者バーにプレイヤーAが表示される
      // （truncate スタイルで Playwright が hidden 判定するため toContainText で検証）
      await expect(page.getByTestId('current-thrower')).toContainText(playerAName)

      // スコアシートヘッダーに両プレイヤーが表示される（個人戦はチーム名 = プレイヤー名）
      await expect(page.getByRole('grid', { name: 'スコアシート' })).toContainText(playerAName)
      await expect(page.getByRole('grid', { name: 'スコアシート' })).toContainText(playerBName)
    } finally {
      await cleanup(request, playerIds, matchShareCodes)
    }
  })

  test('個人戦で投擲を記録して勝利まで完走できる', async ({ page, request }) => {
    const playerIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      // 1. プレイヤーを2人作成
      const playerAName = `E2E_勝者A_${Date.now()}`
      const playerBName = `E2E_敗者B_${Date.now()}`
      const playerAId = await createPlayer(request, playerAName)
      playerIds.push(playerAId)
      const playerBId = await createPlayer(request, playerBName)
      playerIds.push(playerBId)

      // 2. 個人戦を作成
      await page.goto(`${BASE_URL}/matches/new`)
      await page.getByRole('button', { name: '個人戦' }).click()

      const playerABtn = page.getByRole('button', { name: playerAName })
      const playerBBtn = page.getByRole('button', { name: playerBName })
      await expect(playerABtn).toBeVisible({ timeout: 10_000 })
      await expect(playerBBtn).toBeVisible({ timeout: 10_000 })

      await playerABtn.click()
      await playerBBtn.click()
      // ゲーム数を1に設定（デフォルト2から1回減らす）
      await page.getByLabel('ゲーム数を減らす').click()
      await page.getByTestId('start-match-submit').click()

      await page.waitForURL(
        (url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new',
        { timeout: 10_000 }
      )

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      // 安定動作のためカードビューに切替
      await switchToCardView(page)

      // 3. 得点戦略: A が 12x4+2=50点で勝利、B は失格にならないよう2連続ミスまで
      // ターン1: A +12 = 12点
      await expect(page.getByTestId('current-thrower')).toContainText(playerAName)
      await recordSkittle(page, 12, 1)

      // ターン2: B ミス(1連続)
      await expect(page.getByTestId('current-thrower')).toContainText(playerBName)
      await recordMiss(page, 2)

      // ターン3: A +12 = 24点
      await expect(page.getByTestId('current-thrower')).toContainText(playerAName)
      await recordSkittle(page, 12, 3)

      // ターン4: B 1本倒す（連続リセット）
      await expect(page.getByTestId('current-thrower')).toContainText(playerBName)
      await recordSkittle(page, 1, 4)

      // ターン5: A +12 = 36点
      await expect(page.getByTestId('current-thrower')).toContainText(playerAName)
      await recordSkittle(page, 12, 5)

      // ターン6: B ミス(1連続)
      await expect(page.getByTestId('current-thrower')).toContainText(playerBName)
      await recordMiss(page, 6)

      // ターン7: A +12 = 48点
      await expect(page.getByTestId('current-thrower')).toContainText(playerAName)
      await recordSkittle(page, 12, 7)

      // ターン8: B ミス(2連続・失格にはならない)
      await expect(page.getByTestId('current-thrower')).toContainText(playerBName)
      await recordMiss(page, 8)

      // ターン9: A 2番スキットル → 50点で勝利
      await expect(page.getByTestId('current-thrower')).toContainText(playerAName)
      const singleMode2 = page.getByTestId('mode-single')
      if (await singleMode2.isVisible().catch(() => false)) {
        await singleMode2.click()
      }
      const score2 = page.getByTestId('score-2')
      await score2.scrollIntoViewIfNeeded()
      await score2.click()
      const confirmBtn = page.getByTestId('confirm-throw')
      await confirmBtn.scrollIntoViewIfNeeded()
      await confirmBtn.click()

      // 4. 勝利画面の確認
      await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('match-result')).toContainText('試合終了')
      await expect(page.getByTestId('match-result')).toContainText(`${playerAName} の勝利！`)
      await expect(page.getByTestId('match-result')).toContainText('50点')
      await expect(page.getByRole('link', { name: '新しい試合を作成' })).toBeVisible()
    } finally {
      await cleanup(request, playerIds, matchShareCodes)
    }
  })

  test('1人しか選択しないと試合開始ボタンが無効のまま', async ({ page, request }) => {
    const playerIds: string[] = []

    try {
      const playerAName = `E2E_単独_${Date.now()}`
      const playerAId = await createPlayer(request, playerAName)
      playerIds.push(playerAId)

      await page.goto(`${BASE_URL}/matches/new`)
      await page.getByRole('button', { name: '個人戦' }).click()

      const playerABtn = page.getByRole('button', { name: playerAName })
      await expect(playerABtn).toBeVisible({ timeout: 10_000 })
      await playerABtn.click()

      await expect(page.getByTestId('start-match-submit')).toBeDisabled()
    } finally {
      await cleanup(request, playerIds, [])
    }
  })

  test('チーム戦タブと個人戦タブを切り替えられる', async ({ page }) => {
    await page.goto(`${BASE_URL}/matches/new`)
    await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

    // 初期状態はチーム戦
    await expect(page.getByText('参加チームを選択')).toBeVisible()

    // 個人戦に切り替え
    await page.getByRole('button', { name: '個人戦' }).click()
    await expect(page.getByText('参加プレイヤーを選択')).toBeVisible()
    await expect(page.getByText('参加チームを選択')).not.toBeVisible()

    // チーム戦に戻す
    await page.getByRole('button', { name: 'チーム戦' }).click()
    await expect(page.getByText('参加チームを選択')).toBeVisible()
    await expect(page.getByText('参加プレイヤーを選択')).not.toBeVisible()
  })
})
