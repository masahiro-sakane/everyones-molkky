import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * 3チーム以上の試合 E2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - DB が起動済み
 *
 * 検証内容:
 * - 3チームで試合を作成できること
 * - 投擲順が A→B→C→A→B→C... のサイクルで回ること
 * - 1チームが失格してもゲームが継続し、残りチームで投擲が続くこと
 * - 3チーム戦で50点達成したチームが勝利できること
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

async function switchToCardView(page: Page) {
  const cardToggle = page.getByTestId('view-toggle-card')
  if (await cardToggle.isVisible().catch(() => false)) {
    await cardToggle.click()
    await expect(page.getByText(/投擲履歴/)).toBeVisible({ timeout: 10_000 })
  }
}

async function waitForThrowRecorded(page: Page, _expectedCount: number) {
  // 投擲記録後にSSEでスコアが更新されるまで待機
  await page.waitForTimeout(800)
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

test.describe('複数チーム試合テスト', () => {
  test.setTimeout(180_000)

  test('3チームで試合を作成してスコアボードに全チームが表示される', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      // 3チームを作成
      const ts = Date.now()
      const teamAName = `E2E_3チームA_${ts}`
      const teamBName = `E2E_3チームB_${ts}`
      const teamCName = `E2E_3チームC_${ts}`

      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)
      const teamCId = await createTeamWithMember(page, teamCName, '投擲者C')
      teamIds.push(teamCId)

      // 3チームで試合を作成
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      const teamCButton = page.getByRole('button', { name: teamCName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })
      await expect(teamCButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()
      await teamCButton.click()

      // 3チームが選択されたことを確認
      await expect(teamAButton).toHaveAttribute('aria-pressed', 'true')
      await expect(teamBButton).toHaveAttribute('aria-pressed', 'true')
      await expect(teamCButton).toHaveAttribute('aria-pressed', 'true')

      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await switchToCardView(page)
      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })

      // スコアボードに3チーム全てが表示される
      await expect(page.getByText(teamAName).first()).toBeVisible()
      await expect(page.getByText(teamBName).first()).toBeVisible()
      await expect(page.getByText(teamCName).first()).toBeVisible()

      // 現在の投擲者コンポーネントが表示される
      await expect(page.getByTestId('current-thrower')).toBeVisible()
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('3チームの投擲順が A→B→C→A→B→C... のサイクルで回る', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const ts = Date.now()
      const teamAName = `E2E_順序A_${ts}`
      const teamBName = `E2E_順序B_${ts}`
      const teamCName = `E2E_順序C_${ts}`

      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)
      const teamCId = await createTeamWithMember(page, teamCName, '投擲者C')
      teamIds.push(teamCId)

      await page.goto(`${BASE_URL}/matches/new`)
      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      const teamCButton = page.getByRole('button', { name: teamCName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })
      await expect(teamCButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()
      await teamCButton.click()
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await switchToCardView(page)
      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })

      // ラウンド1: A→B→C
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordMiss(page, 1)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 2)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者C')
      await recordMiss(page, 3)

      // ラウンド2: A→B→C（サイクル確認）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordMiss(page, 4)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 5)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者C')
      await recordMiss(page, 6)

      // ラウンド3の最初も A（サイクルが正しく繰り返される）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('3チーム戦でチームAが50点達成して勝利できる', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const ts = Date.now()
      const teamAName = `E2E_勝利3A_${ts}`
      const teamBName = `E2E_勝利3B_${ts}`
      const teamCName = `E2E_勝利3C_${ts}`

      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)
      const teamCId = await createTeamWithMember(page, teamCName, '投擲者C')
      teamIds.push(teamCId)

      await page.goto(`${BASE_URL}/matches/new`)
      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      const teamCButton = page.getByRole('button', { name: teamCName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })
      await expect(teamCButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()
      await teamCButton.click()
      // ゲーム数を1に設定（デフォルト2から1回減らす）
      await page.getByLabel('ゲーム数を減らす').click()
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await switchToCardView(page)
      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })

      // 得点戦略:
      // チームAが毎ターン12点、チームB・Cはミスし続ける（失格にならないよう管理）
      // A:12 B:ミス C:ミス / A:12 B:得点 C:ミス / A:12 B:ミス C:得点 / A:12 B:ミス C:ミス /
      // A:2点 → 48+2=50 → 勝利
      //
      // チームBは2ターンに1回得点（連続ミスを3回以内に収める）
      // チームCも同様

      // ラウンド1
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 1)   // A: 12点

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 2)           // B: ミス1

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者C')
      await recordMiss(page, 3)           // C: ミス1

      // ラウンド2
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 4)   // A: 24点

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 5)    // B: 1点（連続リセット）

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者C')
      await recordSkittle(page, 1, 6)    // C: 1点（連続リセット）

      // ラウンド3
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 7)   // A: 36点

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 8)           // B: ミス1

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者C')
      await recordMiss(page, 9)           // C: ミス1

      // ラウンド4
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 10)  // A: 48点

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 11)   // B: 得点（連続リセット）

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者C')
      await recordSkittle(page, 1, 12)   // C: 得点（連続リセット）

      // ラウンド5: チームA 2番スキットル → 50点で勝利
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await page.getByTestId('mode-single').click()
      const skittle2 = page.getByTestId('score-2')
      await skittle2.scrollIntoViewIfNeeded()
      await skittle2.click()
      const confirmBtn = page.getByTestId('confirm-throw')
      await confirmBtn.scrollIntoViewIfNeeded()
      await confirmBtn.click()

      // 勝利画面の確認
      await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('match-result')).toContainText('試合終了')
      await expect(page.getByTestId('match-result')).toContainText(`${teamAName} の勝利！`)
      await expect(page.getByTestId('match-result')).toContainText('50点')
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('3チーム中1チームが失格してもゲームが継続し残り2チームで勝負できる', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const ts = Date.now()
      const teamAName = `E2E_失格3A_${ts}`
      const teamBName = `E2E_失格3B_${ts}`
      const teamCName = `E2E_失格3C_${ts}`

      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)
      const teamCId = await createTeamWithMember(page, teamCName, '投擲者C')
      teamIds.push(teamCId)

      await page.goto(`${BASE_URL}/matches/new`)
      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      const teamCButton = page.getByRole('button', { name: teamCName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })
      await expect(teamCButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()
      await teamCButton.click()
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await switchToCardView(page)
      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })

      // チームCを3回連続ミスで失格させながら、A・Bは通常進行
      //
      // ラウンド1: A(得点)→B(得点)→C(ミス1)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 1)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 2)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者C')
      await recordMiss(page, 3)          // C: ミス1

      // ラウンド2: A(得点)→B(得点)→C(ミス2)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 4)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 5)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者C')
      await recordMiss(page, 6)          // C: ミス2

      // ラウンド3: A(得点)→B(得点)→C(ミス3→失格)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 7)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 8)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者C')
      await recordMiss(page, 9)          // C: ミス3 → 失格

      // 失格後: チームCのターンがスキップされ、A→B→A→B...のサイクルになる
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A', { timeout: 5_000 })

      // ラウンド4（Cスキップ）: A→B
      await recordSkittle(page, 1, 10)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 11)

      // ラウンド5の最初もA（CはスキップされA→B→A...のまま）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')

      // ゲームはまだ継続している
      await expect(page.getByTestId('current-thrower')).toBeVisible()
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })
})
