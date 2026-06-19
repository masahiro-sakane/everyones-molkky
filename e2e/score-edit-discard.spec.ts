import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * スコアセル修正 / 試合記録破棄 E2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - DB が起動済み
 *
 * テストシナリオ:
 * 1. スコアシートの記録済みセルをクリック → ポップオーバーで得点を修正 → 合計に反映される
 * 2. 記録を破棄ボタン → 確認モーダル → 破棄 → ホームに遷移し試合が削除される
 * 3. 破棄の確認モーダルをキャンセルすると試合は残る
 *
 * これらの機能（ScoreCellEditPopover / DiscardMatchButton）は
 * SheetMatchBoard（シートビュー）にのみ存在する。
 * シートビューはデスクトップのデフォルトのため switchToCardView は不要。
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

/** スコアシートビューに切替（既定でシートだが念のため明示） */
async function switchToSheetView(page: Page) {
  const sheetToggle = page.getByTestId('view-toggle-sheet')
  if (await sheetToggle.isVisible().catch(() => false)) {
    await sheetToggle.click()
    await expect(page.getByRole('grid')).toBeVisible({ timeout: 5_000 })
  }
}

/** 得点入力モードに切替（フォルトパネルが開いている場合は閉じる） */
async function switchToScoreMode(page: Page) {
  const closeBtn = page.getByRole('button', { name: '閉じる' })
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click()
  }
}

/** スキットル番号ボタンをクリックして確定する（1本モード） */
async function recordSkittle(page: Page, skittleNumber: number) {
  await switchToScoreMode(page)
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
  await page.waitForTimeout(500)
}

/** ミス（0点）を記録する */
async function recordMiss(page: Page) {
  await switchToScoreMode(page)
  await page.getByTestId('miss-button').click()
  await page.waitForTimeout(500)
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
  await expect(page.getByText(teamName)).toBeVisible()

  await page.getByTestId('add-member-button').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.getByTestId('member-name-input').fill(memberName)
  await page.getByTestId('add-member-submit').click()
  await expect(page.getByText(memberName)).toBeVisible({ timeout: 10_000 })

  return teamId
}

/** 試合を作成してshareCodeを返す（1ゲーム） */
async function createMatch(
  page: Page,
  teamAName: string,
  teamBName: string
): Promise<string> {
  await page.goto(`${BASE_URL}/matches/new`)
  await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

  const teamAButton = page.getByRole('button', { name: teamAName })
  const teamBButton = page.getByRole('button', { name: teamBName })
  await expect(teamAButton).toBeVisible({ timeout: 10_000 })
  await expect(teamBButton).toBeVisible({ timeout: 10_000 })

  await teamAButton.click()
  await teamBButton.click()
  await page.getByLabel('ゲーム数を減らす').click()
  await page.getByTestId('start-match-submit').click()
  await page.waitForURL(
    (url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new',
    { timeout: 10_000 }
  )

  return new URL(page.url()).pathname.replace('/matches/', '')
}

/** チームIDを試合データから取得する */
async function getTeamIds(
  request: APIRequestContext,
  shareCode: string,
  teamAName: string,
  teamBName: string
): Promise<{ teamAId: string; teamBId: string }> {
  const matchRes = await request.get(`${BASE_URL}/api/matches/${shareCode}`)
  const matchData = await matchRes.json()
  const teamAData = matchData.data.matchTeams.find(
    (mt: { team: { name: string } }) => mt.team.name === teamAName
  )
  const teamBData = matchData.data.matchTeams.find(
    (mt: { team: { name: string } }) => mt.team.name === teamBName
  )
  return { teamAId: teamAData.teamId, teamBId: teamBData.teamId }
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

test.describe('スコアセル修正 / 試合記録破棄', () => {
  test.setTimeout(120_000)

  test('記録済みセルをクリックして得点を修正すると合計に反映される', async ({
    page,
    request,
  }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_修正A_${Date.now()}`
      const teamBName = `E2E_修正B_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      const shareCode = await createMatch(page, teamAName, teamBName)
      matchShareCodes.push(shareCode)

      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })
      await switchToSheetView(page)

      const { teamAId: teamAId2 } = await getTeamIds(request, shareCode, teamAName, teamBName)

      // チームAが3番（3点）を記録、チームBはミス
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 3)

      // チームA合計が 3 点になっていることを確認
      const teamATotal = page.getByTestId(`grand-total-${teamAId2}`)
      await expect(teamATotal).toContainText('3', { timeout: 5_000 })

      // 記録した最初のセル（チームA, 1投目 = throwIndex 1）をクリックして修正ポップオーバーを開く。
      // throwIndex は 1 始まり。シートには両チーム分の同 aria-label が出るため
      // スコアシート領域内の最初の一致セルに限定する。
      const cell = page
        .getByRole('grid', { name: 'スコアシート' })
        .getByRole('button', { name: '3番スキットル（1本倒し）' })
        .first()
      await cell.scrollIntoViewIfNeeded()
      await cell.click()

      const popover = page.getByRole('dialog', { name: '得点を修正' })
      await expect(popover).toBeVisible({ timeout: 5_000 })

      // 1本モードで 10番（10点）に修正
      await popover.getByRole('button', { name: '1本' }).click()
      await popover.getByRole('button', { name: '10', exact: true }).click()
      await page.getByTestId('edit-cell-save').click()

      // ポップオーバーが閉じ、合計が 10 点に更新される
      await expect(popover).not.toBeVisible({ timeout: 5_000 })
      await expect(teamATotal).toContainText('10', { timeout: 5_000 })

      // API 側でも skittlesKnocked が [10] に更新されていることを検証
      const matchRes = await request.get(`${BASE_URL}/api/matches/${shareCode}`)
      const matchData = await matchRes.json()
      const allThrows = matchData.data.sets
        .flatMap((s: { turns: { throws: { skittlesKnocked: number[] }[] }[] }) => s.turns)
        .flatMap((t: { throws: { skittlesKnocked: number[] }[] }) => t.throws)
      const hasTen = allThrows.some(
        (th: { skittlesKnocked: number[] }) =>
          th.skittlesKnocked.length === 1 && th.skittlesKnocked[0] === 10
      )
      expect(hasTen).toBe(true)
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('進行中の試合を破棄するとホームに遷移し試合が削除される', async ({
    page,
    request,
  }) => {
    // 進行中(IN_PROGRESS)の試合も破棄可能。破棄すると試合が削除されホームに遷移する。
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_破棄A_${Date.now()}`
      const teamBName = `E2E_破棄B_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      const shareCode = await createMatch(page, teamAName, teamBName)
      matchShareCodes.push(shareCode)

      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })
      await switchToSheetView(page)

      // 1投記録して進行中（IN_PROGRESS）にする
      await recordSkittle(page, 5)

      // 破棄ボタン → 確認モーダル → 破棄する
      await page.getByTestId('discard-match-button').click()
      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible()
      await expect(modal).toContainText('元に戻せません')
      await page.getByTestId('discard-confirm').click()

      // ホームに遷移する
      await page.waitForURL((url) => url.pathname === '/', { timeout: 10_000 })

      // 試合が削除されている（GET が 404 を返す）
      const res = await request.get(`${BASE_URL}/api/matches/${shareCode}`)
      expect(res.status()).toBe(404)
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('破棄をキャンセルすると試合は残る', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_破棄取消A_${Date.now()}`
      const teamBName = `E2E_破棄取消B_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      const shareCode = await createMatch(page, teamAName, teamBName)
      matchShareCodes.push(shareCode)

      await expect(page.getByTestId('current-thrower')).toBeVisible({ timeout: 10_000 })
      await switchToSheetView(page)

      // 破棄モーダルを開いてキャンセル
      await page.getByTestId('discard-match-button').click()
      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible()
      await page.getByTestId('discard-cancel').click()
      await expect(modal).not.toBeVisible({ timeout: 5_000 })

      // 試合ページに留まっており、試合は残っている
      expect(new URL(page.url()).pathname).toBe(`/matches/${shareCode}`)
      const res = await request.get(`${BASE_URL}/api/matches/${shareCode}`)
      expect(res.status()).toBe(200)
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })
})
