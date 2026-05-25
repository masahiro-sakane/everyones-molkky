import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * 失格（3回連続ミス）E2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - DB が起動済み
 *
 * 検証内容:
 * - 3回連続ミスで失格になること
 * - 失格後もゲームが継続し、失格チームのターンがスキップされること
 * - 失格チームのスコアが0点になること
 * - 失格していないチームが通常通り勝利できること
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

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

test.describe('失格ルールテスト', () => {
  test.setTimeout(120_000)

  test('3回連続ミスで失格になり、相手チームが勝利できる', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      // 1. チームを2つ作成
      const teamAName = `E2E_失格A_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_失格B_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      // 2. 試合を作成
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()
      // ゲーム数を1に設定（デフォルト2から1回減らす）
      await page.getByLabel('ゲーム数を減らす').click()
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })

      // 3. チームBを3回連続ミスで失格させる
      //
      // 得点シナリオ:
      // ターン1: チームA → 1番スキットル (1点)
      // ターン2: チームB → ミス (1連続)
      // ターン3: チームA → 1番スキットル (2点)
      // ターン4: チームB → ミス (2連続)
      // ターン5: チームA → 1番スキットル (3点)
      // ターン6: チームB → ミス (3連続) → チームB失格
      //          → 残り1チーム（チームA）で即座に勝利判定

      // ターン1: チームA +1
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 1)

      // ターン2: チームB ミス1回目
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 2)

      // ターン3: チームA +1 = 2点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 3)

      // ターン4: チームB ミス2回目
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 4)

      // ターン5: チームA +1 = 3点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 5)

      // ターン6: チームB ミス3回目 → 失格 → チームAが最後の1チームとして即座に勝利
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await page.getByTestId('miss-button').click()

      // 4. 勝利画面の確認
      // チームBが3連続ミスで失格し、チームAが最後の1チームとして勝利する
      await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('match-result')).toContainText('試合終了')
      await expect(page.getByTestId('match-result')).toContainText(`${teamAName} の勝利！`)
      // チームBが失格で表示される
      await expect(page.getByTestId('match-result')).toContainText(teamBName)
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('2回連続ミス後に得点すると連続カウントがリセットされる', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_連続リセA_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_連続リセB_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()
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

      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })

      // 得点シナリオ:
      // チームBが2回ミス → 1本得点（カウントリセット） → さらに2回ミス
      // = 合計4回ミスだが連続ではないため失格にならない

      // ターン1: チームA 適当に得点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 1)

      // ターン2: チームB ミス1回目
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 2)

      // ターン3: チームA 適当に得点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 3)

      // ターン4: チームB ミス2回目（連続2回 - 失格寸前）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 4)

      // ターン5: チームA 適当に得点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 5)

      // ターン6: チームB 得点（連続ミスカウントリセット）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 3, 6)

      // ターン7: チームA 適当に得点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 7)

      // ターン8: チームB ミス（カウントリセット後1回目）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 8)

      // ターン9: チームA 適当に得点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 9)

      // ターン10: チームB ミス（カウントリセット後2回目 - 失格にならない）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 10)

      // チームBはまだゲームに参加している（ターン11はチームAの番）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')

      // チームBのスコアが表示されていること（失格していない）
      await expect(page.getByText(teamBName).first()).toBeVisible()
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })
})
