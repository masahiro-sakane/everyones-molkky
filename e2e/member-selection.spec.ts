import { test, expect, type Page, type APIRequestContext, type Locator } from '@playwright/test'

/**
 * 試合作成時のメンバー選択UIに対するE2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - seed データが存在する (npm run prisma:seed)
 *   - チームA: 田中 太郎、鈴木 花子、佐藤 一郎
 *   - チームB: 山田 二郎、高橋 三郎、伊藤 四郎
 *   - チーム未所属: 大谷 翔平、佐々木 朗希、山本 由伸、村上 宗隆、吉田 正尚
 *
 * 注意:
 * - シードのユーザ名には半角スペースが含まれる（例: "田中 太郎"）
 * - メンバーボタンは選択時に順番数字が accessible name に含まれる
 *   "田中 太郎 1" (選択中) / "田中 太郎" (未選択)
 * - ▲▼ボタンの aria-label に "田中 太郎を上に移動" 等の文字列が含まれるため
 *   単純な name 一致では複数マッチする → aria-pressed の有無で絞り込む
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

async function cleanupMatches(request: APIRequestContext, shareCodes: string[]) {
  for (const code of shareCodes) {
    await request.delete(`${BASE_URL}/api/matches/${code}`).catch(() => {})
  }
}

async function openMatchCreatePage(page: Page) {
  await page.goto(`${BASE_URL}/matches/new`)
  await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()
}

/** チーム選択ボタン（参加チーム選択の grid 内、Badge を含む先頭一致） */
function teamButton(page: Page, teamName: string): Locator {
  // 参加チーム選択は aria-pressed を持つ button だが、メンバー選択も aria-pressed を持つ。
  // 「参加チームを選択」見出しを含む div の中の button を対象にする。
  return page
    .locator('div')
    .filter({ has: page.getByText('参加チームを選択', { exact: false }) })
    .getByRole('button', { name: teamName })
    .first()
}

/** チームのメンバー選択ボタン（チーム見出し直下のセクション div 内、aria-pressed を持つ button） */
function memberButton(page: Page, teamName: string, userName: string): Locator {
  // チーム見出し paragraph の直接の親 div（= そのチームのセクション）を xpath で取得
  const section = page
    .getByText(`${teamName} — 参加メンバーと投擲順`)
    .locator('xpath=..')
  // セクション内で aria-pressed を持つ button のみ（▲▼ボタンは aria-pressed を持たないので除外される）
  return section.locator('button[aria-pressed]').filter({
    hasText: userName,
  })
}

/** SSEで履歴件数が指定値に達するのを待つ */
async function waitForHistoryCount(page: Page, count: number, timeoutMs = 10_000) {
  await expect(page.getByRole('heading', { name: `投擲履歴（${count}回）` })).toBeVisible({
    timeout: timeoutMs,
  })
}

test.describe('試合作成 - メンバー選択UI', () => {
  test.setTimeout(60_000)

  test('チーム選択時にメンバー選択UIが表示される（seedメンバーが選択済み）', async ({ page }) => {
    await openMatchCreatePage(page)

    const teamA = teamButton(page, 'チームA')
    await expect(teamA).toBeVisible({ timeout: 10_000 })
    await teamA.click()
    await expect(teamA).toHaveAttribute('aria-pressed', 'true')

    // メンバー選択UI見出しが表示される
    await expect(page.getByText('チームA — 参加メンバーと投擲順')).toBeVisible()

    const tanaka = memberButton(page, 'チームA', '田中 太郎')
    const suzuki = memberButton(page, 'チームA', '鈴木 花子')
    const sato = memberButton(page, 'チームA', '佐藤 一郎')

    await expect(tanaka).toBeVisible()
    await expect(suzuki).toBeVisible()
    await expect(sato).toBeVisible()
    await expect(tanaka).toHaveAttribute('aria-pressed', 'true')
    await expect(suzuki).toHaveAttribute('aria-pressed', 'true')
    await expect(sato).toHaveAttribute('aria-pressed', 'true')
  })

  test('チーム未所属メンバーを追加して試合を開始できる', async ({ page, request }) => {
    const matchShareCodes: string[] = []

    try {
      await openMatchCreatePage(page)

      const teamA = teamButton(page, 'チームA')
      const teamB = teamButton(page, 'チームB')
      await expect(teamA).toBeVisible({ timeout: 10_000 })
      await expect(teamB).toBeVisible({ timeout: 10_000 })
      await teamA.click()
      await teamB.click()
      await expect(teamA).toHaveAttribute('aria-pressed', 'true')
      await expect(teamB).toHaveAttribute('aria-pressed', 'true')

      // チームAセクション内の「大谷 翔平」（未所属）ボタンを追加選択
      const ohtaniInA = memberButton(page, 'チームA', '大谷 翔平')
      await expect(ohtaniInA).toBeVisible()
      await expect(ohtaniInA).toHaveAttribute('aria-pressed', 'false')
      await ohtaniInA.click()
      await expect(ohtaniInA).toHaveAttribute('aria-pressed', 'true')

      // 試合を開始
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL(
        (url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new',
        { timeout: 15_000 }
      )

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      expect(shareCode).toBeTruthy()
      expect(shareCode).not.toBe('new')
      matchShareCodes.push(shareCode)

      // 試合画面の表示確認
      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('current-thrower')).toBeVisible()
    } finally {
      await cleanupMatches(request, matchShareCodes)
    }
  })

  test('メンバーを除外して試合を開始すると除外メンバーが投擲者に現れない', async ({ page, request }) => {
    const matchShareCodes: string[] = []

    try {
      await openMatchCreatePage(page)

      const teamA = teamButton(page, 'チームA')
      const teamB = teamButton(page, 'チームB')
      await expect(teamA).toBeVisible({ timeout: 10_000 })
      await teamA.click()
      await teamB.click()

      // チームAから「佐藤 一郎」を除外
      const satoInA = memberButton(page, 'チームA', '佐藤 一郎')
      await expect(satoInA).toBeVisible()
      await expect(satoInA).toHaveAttribute('aria-pressed', 'true')
      await satoInA.click()
      await expect(satoInA).toHaveAttribute('aria-pressed', 'false')

      // 試合開始
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL(
        (url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new',
        { timeout: 15_000 }
      )

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })
      const thrower = page.getByTestId('current-thrower')

      // カードビューに切り替え
      const cardToggle = page.getByTestId('view-toggle-card')
      if (await cardToggle.isVisible().catch(() => false)) {
        await cardToggle.click()
      }

      // 初手は田中 太郎（佐藤 一郎ではない）
      await expect(thrower).toContainText('田中 太郎')
      await expect(thrower).not.toContainText('佐藤 一郎')

      // 4ターン進める間、佐藤 一郎が現在投擲者に出ないことを検証
      for (let i = 0; i < 4; i++) {
        await page.getByTestId('miss-button').click()
        await waitForHistoryCount(page, i + 1)
        await expect(thrower).not.toContainText('佐藤 一郎')
      }
    } finally {
      await cleanupMatches(request, matchShareCodes)
    }
  })
})
