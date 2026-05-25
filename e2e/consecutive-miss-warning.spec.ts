import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * 連続ミス警告表示のE2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - DB が起動済み
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

async function cleanupTeams(request: APIRequestContext, teamIds: string[]) {
  for (const id of teamIds) {
    await request.delete(`${BASE_URL}/api/teams/${id}`).catch(() => {})
  }
}

/** 投擲が記録されて次のターンへ移行するのを待つ */
async function waitForHistoryCount(page: Page, _count: number, _timeoutMs = 10_000) {
  // 投擲記録後にSSEでスコアが更新されるまで待機
  await page.waitForTimeout(800)
}

/** ミスを記録して履歴件数の更新を待つ */
async function recordMissAndWait(page: Page, expectedCount: number) {
  await page.getByTestId('miss-button').click()
  await waitForHistoryCount(page, expectedCount)
}

async function createTeamWithMember(
  page: Page,
  teamName: string,
  memberName: string
): Promise<string> {
  await page.goto(`${BASE_URL}/teams/new`)
  await expect(page.getByRole('heading', { name: 'チームを作成' })).toBeVisible()
  await page.getByRole('textbox', { name: 'チーム名' }).fill(teamName)
  await page.getByTestId('create-team-submit').click()
  await page.waitForURL((url) => url.pathname.startsWith('/teams/') && url.pathname !== '/teams/new')

  const teamId = page.url().split('/teams/')[1]
  await expect(page.getByText(teamName)).toBeVisible()

  await page.getByTestId('add-member-button').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByTestId('member-name-input').fill(memberName)
  await page.getByTestId('add-member-submit').click()
  await expect(page.getByText(memberName)).toBeVisible({ timeout: 10_000 })

  return teamId
}

test.describe('連続ミス警告', () => {
  test.setTimeout(120_000)

  test('2連続ミス後の投擲予定チームに警告が表示される', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      // テスト用チームを作成
      const teamAName = `E2E_連続ミスA_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_連続ミスB_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      // 試合作成
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
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
      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })
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
      await cleanupTeams(request, teamIds)
    }
  })
})
