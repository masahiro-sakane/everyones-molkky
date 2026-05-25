import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * 試合作成から勝利まで通しで実行するE2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - DB に seed データが存在する (npm run prisma:seed)
 *
 * 得点戦略:
 * チームAが先攻。チームBはミス(0点)を連投。
 * チームA: 12点 x4投 + 2点 x1投 = 50点で勝利
 * (12+12+12+12=48 → 2番スキットル1本 = 50点)
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

/** Server Action の完了を待つ（SSEのため networkidle は使えないため投擲履歴の更新を待つ） */
async function waitForThrowRecorded(page: Page, _expectedCount: number) {
  // シートビューでは投擲履歴の表示形式が異なるため、現在投擲者の更新を別途検証する
  // ここでは Server Action の完了を SSE による refresh で検出
  await page.waitForTimeout(500) // SSE refresh の余地
}

/** カードビューに切り替え（E2Eで安定動作させるため） */
async function switchToCardView(page: Page) {
  const cardToggle = page.getByTestId('view-toggle-card')
  if (await cardToggle.isVisible().catch(() => false)) {
    await cardToggle.click()
  }
}

/** スキットル番号で1本だけ倒したことを記録する */
async function recordSkittle(page: Page, skittleNumber: number, throwCount: number) {
  // 1本モードに切替（再投擲時のデフォルトは1本モードだが念のため明示）
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

/** チームを作成してメンバーを追加する。チームIDを返す */
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

  // チーム名がページに表示されることを検証
  await expect(page.getByText(teamName)).toBeVisible()

  // メンバーを追加
  await page.getByTestId('add-member-button').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.getByTestId('member-name-input').fill(memberName)
  await page.getByTestId('add-member-submit').click()

  // メンバー追加後、メンバー名が表示されることを検証
  await expect(page.getByText(memberName)).toBeVisible({ timeout: 10_000 })

  return teamId
}

/** テストデータを削除する */
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

test.describe('試合フル通しテスト', () => {
  test.setTimeout(120_000)

  test('チーム作成 → 試合作成 → 投擲 → 勝利画面まで完走する', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      // ------------------------------------------------
      // 1. チームを2つ作成する
      // ------------------------------------------------
      const teamAName = `E2E_チームA_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_チームB_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      // ------------------------------------------------
      // 2. 試合を作成する
      // ------------------------------------------------
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      // 作成したチームを選択（data-testid で取得）
      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })

      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()

      // 選択されたことを確認（aria-pressed="true"）
      await expect(teamAButton).toHaveAttribute('aria-pressed', 'true')
      await expect(teamBButton).toHaveAttribute('aria-pressed', 'true')

      // ゲーム数を1に設定（デフォルト2から1回減らす）
      await page.getByLabel('ゲーム数を減らす').click()

      // 試合を開始
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const matchPath = new URL(page.url()).pathname
      const shareCode = matchPath.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      // ------------------------------------------------
      // 3. 試合画面が表示されること確認
      // ------------------------------------------------
      // 現在の投擲者コンポーネントが表示される
      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })
      // 最初の投擲者はチームA
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')

      // 安定動作のためカードビューに切り替え
      await switchToCardView(page)

      // スコアボードに両チームが表示される
      await expect(page.getByText(teamAName).first()).toBeVisible()
      await expect(page.getByText(teamBName).first()).toBeVisible()

      // スコア入力UIが表示される（新パネル）
      await expect(page.getByTestId('score-12')).toBeVisible()
      await expect(page.getByTestId('miss-button')).toBeVisible()

      // ------------------------------------------------
      // 4. 投擲を繰り返して勝利させる
      //
      // チームBは失格にならないよう2連続ミスの後に1点を挟む
      // ターン1: チームA → 12番スキットル (12点)
      // ターン2: チームB → ミス (1連続)
      // ターン3: チームA → 12番スキットル (24点)
      // ターン4: チームB → ミス (2連続)
      // ターン5: チームA → 12番スキットル (36点)
      // ターン6: チームB → 1番スキットル (連続リセット)
      // ターン7: チームA → 12番スキットル (48点)
      // ターン8: チームB → ミス (1連続)
      // ターン9: チームA → 2番スキットル (50点) → 勝利！
      // ------------------------------------------------

      // ターン1: チームA +12
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 1)

      // ターン2: チームB ミス（1連続）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 2)

      // ターン3: チームA +12 = 24点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 3)

      // ターン4: チームB ミス（2連続）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 4)

      // ターン5: チームA +12 = 36点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 5)

      // ターン6: チームB 1番スキットル（連続ミスカウントリセット）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1, 6)

      // ターン7: チームA +12 = 48点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12, 7)

      // ターン8: チームB ミス（1連続）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 8)

      // ターン9: チームA 2番スキットル → 50点で勝利
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      const singleMode = page.getByTestId('mode-single')
      if (await singleMode.isVisible().catch(() => false)) {
        await singleMode.click()
      }
      const score2 = page.getByTestId('score-2')
      await score2.scrollIntoViewIfNeeded()
      await score2.click()
      const confirmBtn = page.getByTestId('confirm-throw')
      await confirmBtn.scrollIntoViewIfNeeded()
      await confirmBtn.click()

      // ------------------------------------------------
      // 5. 勝利画面の確認
      // ------------------------------------------------
      await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('match-result')).toContainText('試合終了')
      await expect(page.getByTestId('match-result')).toContainText(`${teamAName} の勝利！`)
      await expect(page.getByTestId('match-result')).toContainText('50点')
      await expect(page.getByTestId('match-result')).toContainText('1位')
      // 新しい試合へのリンクが表示される
      await expect(page.getByRole('link', { name: '新しい試合を作成' })).toBeVisible()
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('試合作成後に観戦URLでアクセスできる', async ({ page, context, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamCName = `E2E_観戦チームC_${Date.now()}`
      const teamCId = await createTeamWithMember(page, teamCName, '観戦者C')
      teamIds.push(teamCId)

      const teamDName = `E2E_観戦チームD_${Date.now()}`
      const teamDId = await createTeamWithMember(page, teamDName, '観戦者D')
      teamIds.push(teamDId)

      // 試合作成
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      const teamCButton = page.getByRole('button', { name: teamCName })
      const teamDButton = page.getByRole('button', { name: teamDName })
      await expect(teamCButton).toBeVisible({ timeout: 10_000 })
      await expect(teamDButton).toBeVisible({ timeout: 10_000 })

      await teamCButton.click()
      await teamDButton.click()
      await expect(teamCButton).toHaveAttribute('aria-pressed', 'true')
      await expect(teamDButton).toHaveAttribute('aria-pressed', 'true')

      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const matchPath = new URL(page.url()).pathname
      const shareCode = matchPath.replace('/matches/', '')
      matchShareCodes.push(shareCode)
      expect(shareCode).toBeTruthy()
      expect(shareCode).not.toBe('new')

      // 試合ページが正しく表示されることを確認
      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('current-thrower')).toBeVisible()

      // 別タブで観戦ページにアクセス
      const watchPage = await context.newPage()
      await watchPage.goto(`${BASE_URL}/matches/${shareCode}/watch`)
      await expect(watchPage.getByText('観戦モード').first()).toBeVisible({ timeout: 10_000 })
      // スコアボード内のチーム名を確認
      await expect(watchPage.getByText(teamCName).first()).toBeVisible()
      await expect(watchPage.getByText(teamDName).first()).toBeVisible()

      await watchPage.close()
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })
})
