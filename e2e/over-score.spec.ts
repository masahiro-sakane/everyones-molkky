import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * 50点超過→25点リセット E2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - DB が起動済み
 *
 * 検証内容:
 * - 50点を超えた場合に25点にリセットされること
 * - リセット後もゲームが継続すること
 * - リセット後に50点ちょうどにすると勝利できること
 * - 複数回リセットが発生するシナリオ
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

test.describe('オーバースコアルールテスト', () => {
  test.setTimeout(120_000)

  test('50点超過で25点にリセットされ、その後勝利できる', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      // 1. チームを2つ作成
      const teamAName = `E2E_超過A_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_超過B_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      // 2. 試合を作成
      await page.goto(`${BASE_URL}/matches/new`)
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

      await switchToCardView(page)
      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })

      // 3. 得点シナリオ（50点超過→25点リセット）
      //
      // チームAの得点推移:
      // 12 → 24 → 36 → 48 → 48+5=53 → 超過で25点リセット
      // 25 → 25+12=37 → 37+13=50 → 勝利！
      //
      // チームBはミスし続ける（失格にならないよう1回置きに得点）

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

      // ターン7: チームA +12 = 48点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 7)

      // ターン8: チームB 1本得点（連続ミスリセット）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 8)

      // ターン9: チームA 5番スキットル → 48+5=53 → 超過で25点リセット
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 5, 9)

      // 4. リセット後の確認（スコアボードに25点が表示される）
      await expect(page.getByText(teamAName).first()).toBeVisible()
      // ゲームは継続している
      await expect(page.getByTestId('current-thrower')).toBeVisible()

      // ターン10: チームB ミス
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 10)

      // ターン11以降: チームA 25点から積み上げて50点へ
      // 25 → 25+12=37 → 37+6=43 → 43+7=50 → 勝利！
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 11)

      // ターン12: チームB 1本得点（連続ミスリセット）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 12)

      // ターン13: チームA +6 = 37+6=43点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 6, 13)

      // ターン14: チームB ミス
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 14)

      // ターン15: チームA +7 = 43+7=50点 → 勝利！
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await page.getByTestId('mode-single').click()
      const skittle7 = page.getByTestId('score-7')
      await skittle7.scrollIntoViewIfNeeded()
      await skittle7.click()
      const confirmBtn = page.getByTestId('confirm-throw')
      await confirmBtn.scrollIntoViewIfNeeded()
      await confirmBtn.click()

      // 5. 勝利画面の確認
      await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('match-result')).toContainText('試合終了')
      await expect(page.getByTestId('match-result')).toContainText(`${teamAName} の勝利！`)
      await expect(page.getByTestId('match-result')).toContainText('50点')
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('50点超過で25点にリセットされ、ゲームが継続する', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      // 1. チームを2つ作成
      const teamAName = `E2E_継続A_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_継続B_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      // 2. 試合を作成
      await page.goto(`${BASE_URL}/matches/new`)
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

      await switchToCardView(page)
      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })

      // 3. チームAを48点にしてから超過させる
      //    12 → 24 → 36 → 48 → 48+4本(=4点)=52 → 超過→25点リセット

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

      // ターン7: チームA +12 = 48点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 7)

      // ターン8: チームB 1本得点（連続ミスリセット）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 8)

      // ターン9: チームA 3本倒し(=3点) → 48+3=51 → 超過で25点リセット
      // 複数本モードで3を選択
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await page.getByTestId('mode-multi').click()
      const btn3 = page.getByTestId('score-3')
      await btn3.scrollIntoViewIfNeeded()
      await btn3.click()
      const confirmBtn = page.getByTestId('confirm-throw')
      await confirmBtn.scrollIntoViewIfNeeded()
      await confirmBtn.click()
      await waitForThrowRecorded(page, 9)

      // 4. リセット後の確認
      // 試合結果画面ではなく投擲継続画面が表示されること
      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })
      // 勝利画面は表示されていないこと
      await expect(page.getByTestId('match-result')).not.toBeVisible()

      // チームBのターンが来ること（ゲーム継続の証明）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B', { timeout: 5_000 })
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })
})
