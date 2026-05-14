import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * 連続ミス警告表示のE2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - seed データが存在する (npm run prisma:seed)
 *   - チームA・チームB（各3人）
 *
 * シナリオ:
 * チームAとチームBが交互に投擲し、各チームでミスを2回ずつ記録すると
 * 次に投擲予定のチームに連続ミス警告「次にミスすると失格になります」が
 * 表示される。
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

async function cleanupMatches(request: APIRequestContext, shareCodes: string[]) {
  for (const code of shareCodes) {
    await request.delete(`${BASE_URL}/api/matches/${code}`).catch(() => {})
  }
}

/** SSEで履歴件数が指定値に達するのを待つ */
async function waitForHistoryCount(page: Page, count: number, timeoutMs = 10_000) {
  await expect(page.getByRole('heading', { name: `投擲履歴（${count}回）` })).toBeVisible({
    timeout: timeoutMs,
  })
}

/** ミスを記録して履歴件数の更新を待つ */
async function recordMissAndWait(page: Page, expectedCount: number) {
  await page.getByTestId('miss-button').click()
  await waitForHistoryCount(page, expectedCount)
}

/** カードビューに切り替え */
async function switchToCardView(page: Page) {
  const cardToggle = page.getByTestId('view-toggle-card')
  if (await cardToggle.isVisible().catch(() => false)) {
    await cardToggle.click()
  }
}

test.describe('連続ミス警告', () => {
  test.setTimeout(120_000)

  test('2連続ミス後の投擲予定チームに警告が表示される', async ({ page, request }) => {
    const matchShareCodes: string[] = []

    try {
      // チームAとチームBで試合作成
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      // Badgeを含むので部分一致でチームボタンを取得
      const teamAButton = page.getByRole('button', { name: 'チームA' }).first()
      const teamBButton = page.getByRole('button', { name: 'チームB' }).first()
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()
      await expect(teamAButton).toHaveAttribute('aria-pressed', 'true')
      await expect(teamBButton).toHaveAttribute('aria-pressed', 'true')

      await page.getByTestId('start-match-submit').click()
      await page.waitForURL(
        (url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new',
        { timeout: 15_000 }
      )

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      // 試合画面表示確認
      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('current-thrower')).toBeVisible()

      // カードビューに切り替え
      await switchToCardView(page)
      await expect(page.getByTestId('miss-button')).toBeVisible()

      // ターン1: チームA → ミス（A連続ミス=1）
      await recordMissAndWait(page, 1)
      // ターン2: チームB → ミス（B連続ミス=1）
      await recordMissAndWait(page, 2)
      // ターン3: チームA → ミス（A連続ミス=2）
      await recordMissAndWait(page, 3)
      // ターン4: チームB → ミス（B連続ミス=2）
      await recordMissAndWait(page, 4)

      // 次の投擲予定チームには連続ミス=2 のため警告バナーが表示される
      await expect(page.getByText('次にミスすると失格になります')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText(/連続ミス\s*2\s*\/\s*3/)).toBeVisible()
    } finally {
      await cleanupMatches(request, matchShareCodes)
    }
  })
})
