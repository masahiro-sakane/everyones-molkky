import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * フォルト（踏み越え・ドロップ・順番違い）E2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - DB が起動済み
 *
 * 検証内容:
 * - フォルトタブへの切り替えが機能すること
 * - 各フォルト種別（MISS/DROP/STEP_OVER/WRONG_ORDER）を選択して記録できること
 * - STEP_OVER（踏み越え）: 37点以上の場合に25点リセット
 * - STEP_OVER（踏み越え）: 36点以下の場合はスコア変更なし（0点投擲のみ）
 * - その他フォルト（DROP/WRONG_ORDER）: スコア変更なし（0点投擲のみ）
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

async function switchToCardView(page: Page) {
  await page.getByTestId('view-toggle-card').click()
  await expect(page.getByText(/投擲履歴/)).toBeVisible({ timeout: 10_000 })
}

async function waitForThrowRecorded(page: Page, expectedCount: number) {
  await expect(page.getByText(`投擲履歴（${expectedCount}回）`)).toBeVisible({ timeout: 15_000 })
}

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

async function recordMiss(page: Page, throwCount: number) {
  await page.getByTestId('miss-button').click()
  await waitForThrowRecorded(page, throwCount)
}

/** フォルトタブに切り替えてフォルト種別を選択し記録する */
async function recordFault(page: Page, faultLabel: string, throwCount: number) {
  await page.getByTestId('mode-fault').click()
  await page.getByRole('button', { name: faultLabel, exact: true }).click()
  await page.getByTestId('record-fault').click()
  await waitForThrowRecorded(page, throwCount)
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

async function cleanup(
  request: APIRequestContext,
  teamIds: string[],
  matchShareCodes: string[]
) {
  for (const shareCode of matchShareCodes) {
    await request.delete(`${BASE_URL}/api/matches/${shareCode}`).catch(() => {})
  }
  for (const id of teamIds) {
    await request.delete(`${BASE_URL}/api/teams/${id}`).catch(() => {})
  }
}

test.describe('フォルトルールテスト', () => {
  test.setTimeout(120_000)

  test('フォルトタブに切り替えて各フォルト種別を選択できる', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_フォルトUI_A_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_フォルトUI_B_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      await page.goto(`${BASE_URL}/matches/new`)
      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await switchToCardView(page)
      await expect(page.getByLabel('投擲記録').getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // フォルトタブへ切り替え
      await page.getByTestId('mode-fault').click()

      // フォルト種別ボタンが全て表示される
      await expect(page.getByRole('button', { name: 'ミス（0本）', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'ドロップ', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: '踏み越え', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: '順番違い', exact: true })).toBeVisible()

      // 「フォルトを記録」ボタンは初期状態で非活性
      await expect(page.getByTestId('record-fault')).toBeDisabled()

      // フォルト種別を選択すると活性になる
      await page.getByRole('button', { name: 'ドロップ', exact: true }).click()
      await expect(page.getByRole('button', { name: 'ドロップ', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByTestId('record-fault')).not.toBeDisabled()

      // 得点入力タブに戻れる
      await page.getByTestId('mode-score').click()
      await expect(page.getByTestId('score-12')).toBeVisible()
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('ドロップフォルトを記録するとスコア変更なしで次のターンになる', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_ドロップA_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_ドロップB_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      await page.goto(`${BASE_URL}/matches/new`)
      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await switchToCardView(page)
      await expect(page.getByLabel('投擲記録').getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // ターン1: チームA → 10番スキットル (10点)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 10, 1)

      // ターン2: チームB → ドロップフォルト (スコア変更なし・0点)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordFault(page, 'ドロップ', 2)

      // ターン3: 次はチームAの番（ゲームが継続している）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')

      // チームBのスコアは0点のままであること（スコアボードで確認）
      await expect(page.getByLabel('スコアボード').getByText(teamBName)).toBeVisible()
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('踏み越えフォルト: 36点以下の場合はスコア変更なし', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_踏越36A_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_踏越36B_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      await page.goto(`${BASE_URL}/matches/new`)
      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await switchToCardView(page)
      await expect(page.getByLabel('投擲記録').getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // チームAを30点にしてから踏み越えフォルト（36点以下なのでスコア変更なし）
      // 12+12+6=30点

      // ターン1: チームA +12 = 12点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 1)

      // ターン2: チームB ミス
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 2)

      // ターン3: チームA +12 = 24点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 3)

      // ターン4: チームB 1本得点（連続ミスリセット）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 4)

      // ターン5: チームA +6 = 30点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 6, 5)

      // ターン6: チームB ミス
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 6)

      // ターン7: チームA → 踏み越えフォルト（30点 < 37点 → スコア変更なし）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordFault(page, '踏み越え', 7)

      // チームAのスコアは30点のままでゲーム継続
      await expect(page.getByText('投擲を記録')).toBeVisible()
      await expect(page.getByTestId('match-result')).not.toBeVisible()

      // 次はチームBの番
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B', { timeout: 5_000 })
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('踏み越えフォルト: 37点以上の場合は25点リセット', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_踏越37A_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_踏越37B_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      await page.goto(`${BASE_URL}/matches/new`)
      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await switchToCardView(page)
      await expect(page.getByLabel('投擲記録').getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // チームAを40点にしてから踏み越えフォルト（37点以上なので25点リセット）
      // 12+12+12+4=40点

      // ターン1: チームA +12 = 12点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 1)

      // ターン2: チームB ミス
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 2)

      // ターン3: チームA +12 = 24点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 3)

      // ターン4: チームB 1本得点（連続ミスリセット）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 4)

      // ターン5: チームA +12 = 36点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 5)

      // ターン6: チームB ミス
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 6)

      // ターン7: チームA +4 = 40点 (37点以上に到達)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 4, 7)

      // ターン8: チームB 1本得点（連続ミスリセット）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 8)

      // ターン9: チームA → 踏み越えフォルト（40点 ≥ 37点 → 25点リセット）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordFault(page, '踏み越え', 9)

      // ゲームは継続（勝利画面でない）
      await expect(page.getByText('投擲を記録')).toBeVisible()
      await expect(page.getByTestId('match-result')).not.toBeVisible()

      // チームAのスコアが25点にリセットされていること（スコアボードで確認）
      await expect(page.getByLabel('スコアボード').getByText(teamAName)).toBeVisible()

      // 次はチームBの番
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B', { timeout: 5_000 })
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })
})
