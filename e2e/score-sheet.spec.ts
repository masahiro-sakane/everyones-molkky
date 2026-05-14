import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * スコアシートビュー E2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - DB が起動済み
 *
 * テストシナリオ:
 * 1. 3回連続ミス（フォルト）で失格 → 相手チームが勝利
 * 2. 50点超過 → 25点リセット → その後50点到達で勝利
 * 3. フォルト（DROP/WRONG_ORDER）がシートに「F」で記録される
 * 4. ターン制限超過で試合決着
 * 5. 時間制限超過で試合決着
 *
 * スコアシートビューの確認ポイント:
 * - view-toggle-sheet でシートビューに切替
 * - cell-{teamId}-{throwIndex} でセルの存在確認（試合進行中に確認）
 * - grand-total-{teamId} で合計得点確認（試合進行中に確認）
 * - match-result でmatch終了後の勝利表示確認
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

async function waitForThrowRecorded(page: Page) {
  await page.waitForTimeout(500)
}

/** スコアシートビューに切替 */
async function switchToSheetView(page: Page) {
  const sheetToggle = page.getByTestId('view-toggle-sheet')
  if (await sheetToggle.isVisible().catch(() => false)) {
    await sheetToggle.click()
    await expect(page.getByRole('grid')).toBeVisible({ timeout: 5_000 })
  }
}

/** 得点入力モードに切替（フォルト後など） */
async function switchToScoreMode(page: Page) {
  const scoreMode = page.getByTestId('mode-score')
  if (await scoreMode.isVisible().catch(() => false)) {
    await scoreMode.click()
  }
}

/** スキットル番号ボタンをクリックして確定する（1本モード） */
async function recordSkittle(page: Page, skittleNumber: number) {
  // 得点入力モードに切り替え（フォルトタブが選択されている場合に備える）
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
  await waitForThrowRecorded(page)
}

/** ミス（0点）を記録する */
async function recordMiss(page: Page) {
  await switchToScoreMode(page)
  await page.getByTestId('miss-button').click()
  await waitForThrowRecorded(page)
}

/** フォルトを記録する */
async function recordFault(page: Page, faultLabel: string) {
  await page.getByTestId('mode-fault').click()
  await page.getByRole('button', { name: faultLabel }).click()
  await page.getByTestId('record-fault').click()
  await waitForThrowRecorded(page)
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

/** 試合を作成してshareCodeを返す（制限なし） */
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
  await page.getByTestId('start-match-submit').click()
  await page.waitForURL(
    (url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new',
    { timeout: 10_000 }
  )

  return new URL(page.url()).pathname.replace('/matches/', '')
}

test.describe('スコアシートビュー - 制限ルール網羅', () => {
  test.setTimeout(120_000)

  test('3回連続ミスで失格 → シートに × が表示されて相手チームが勝利する', async ({
    page,
    request,
  }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_シートA失格_${Date.now()}`
      const teamBName = `E2E_シートB_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      const shareCode = await createMatch(page, teamAName, teamBName)
      matchShareCodes.push(shareCode)

      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // シートビューに切替
      await switchToSheetView(page)

      const { teamAId: teamAId2, teamBId: teamBId2 } = await getTeamIds(
        request, shareCode, teamAName, teamBName
      )

      // 投擲戦略:
      // A 10点、B ミス1、A 1点、B ミス2、A 1点、B ミス3 → 失格
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 10)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1) // チームA合計: 12点

      // シートにチームAの得点が記録されていることをリアルタイムに確認
      const teamATotal = page.getByTestId(`grand-total-${teamAId2}`)
      await expect(teamATotal).toContainText('12', { timeout: 5_000 })

      // チームBの3回目のミス（失格）→ この投擲後に試合終了
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page)

      // 試合終了画面（match-result）が表示される
      await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('match-result')).toContainText('試合終了')
      await expect(page.getByTestId('match-result')).toContainText(`${teamAName} の勝利！`)
      await expect(page.getByTestId('match-result')).toContainText('12点')
      // match-result内でチームBの失格バッジが表示される
      await expect(page.getByTestId('match-result')).toContainText('失格')
      // 2位表示
      await expect(page.getByTestId('match-result')).toContainText('2位')
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('50点超過で25点リセット → シートに25↩が表示されてその後50点到達で勝利する', async ({
    page,
    request,
  }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_シートリセットA_${Date.now()}`
      const teamBName = `E2E_シートリセットB_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      const shareCode = await createMatch(page, teamAName, teamBName)
      matchShareCodes.push(shareCode)

      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // シートビューに切替
      await switchToSheetView(page)

      const { teamAId: teamAId2 } = await getTeamIds(request, shareCode, teamAName, teamBName)

      // 投擲戦略: A: 12x4=48点 → 5点で53点 → 超過リセットで25点
      //           B: 失格にならないよう1点を挟みながらミス

      // ラウンド1: A +12=12点、B 1点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1)

      // ラウンド2: A +12=24点、B ミス
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page)

      // ラウンド3: A +12=36点、B 1点（連続ミスリセット）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1)

      // ラウンド4: A +12=48点、B ミス
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page)

      // ラウンド5: A 5点 → 48+5=53点 → 超過で25点リセット
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 5)

      // シートにリセットセル「25↩」が表示されることを確認
      await expect(
        page.locator(`[data-testid^="cell-${teamAId2}"]`).filter({ hasText: '25↩' })
      ).toBeVisible({ timeout: 5_000 })

      // リセット後の合計スコアが25点
      const teamATotal = page.getByTestId(`grand-total-${teamAId2}`)
      await expect(teamATotal).toContainText('25', { timeout: 5_000 })

      // B: 連続ミスリセット用に1点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1)

      // 25点から50点へ: A +12=37点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page)

      // A +12=49点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 12)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 1)

      // A +1=50点 → 勝利（この投擲前にgrand-totalを確認）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await expect(teamATotal).toContainText('49', { timeout: 5_000 })

      await recordSkittle(page, 1)

      // 試合終了画面
      await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('match-result')).toContainText('試合終了')
      await expect(page.getByTestId('match-result')).toContainText(`${teamAName} の勝利！`)
      await expect(page.getByTestId('match-result')).toContainText('50点')
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('フォルト（DROP/WRONG_ORDER）が記録され → シートに「F」が表示される', async ({
    page,
    request,
  }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_フォルトA_${Date.now()}`
      const teamBName = `E2E_フォルトB_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      const shareCode = await createMatch(page, teamAName, teamBName)
      matchShareCodes.push(shareCode)

      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // シートビューに切替
      await switchToSheetView(page)

      const { teamAId: teamAId2 } = await getTeamIds(request, shareCode, teamAName, teamBName)

      // ラウンド1: チームA ドロップフォルト（0点・連続ミスカウント加算）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordFault(page, 'ドロップ')

      // チームB 通常投擲（得点入力モードに戻して記録）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordSkittle(page, 3)

      // ラウンド2: チームA 順番違いフォルト
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordFault(page, '順番違い')

      // シートにフォルトセル「F」が2つ表示されることを確認
      const faultCells = page.locator(`[data-testid^="cell-${teamAId2}"]`).filter({ hasText: 'F' })
      await expect(faultCells).toHaveCount(2, { timeout: 5_000 })

      // チームAの合計は0点（フォルトは得点なし）
      const teamATotal = page.getByTestId(`grand-total-${teamAId2}`)
      await expect(teamATotal).toContainText('0', { timeout: 5_000 })
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('ターン制限: 2ラウンドでシートが終了し最高得点チームが勝利する', async ({
    page,
    request,
  }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_シートターンA_${Date.now()}`
      const teamBName = `E2E_シートターンB_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      // ターン制限2ラウンドで試合を作成
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })
      await teamAButton.click()
      await teamBButton.click()

      // ターン制限を選択して2ラウンドに設定（デフォルト12から10回減らす）
      await page.locator('input[name="limitType"][value="TURNS"]').click()
      await expect(page.getByLabel('ラウンド数を減らす')).toBeVisible()
      const decreaseBtn = page.getByLabel('ラウンド数を減らす')
      for (let i = 0; i < 10; i++) {
        await decreaseBtn.click()
      }

      await page.getByTestId('start-match-submit').click()
      await page.waitForURL(
        (url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new',
        { timeout: 10_000 }
      )
      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // シートビューに切替
      await switchToSheetView(page)

      const { teamAId: teamAId2 } = await getTeamIds(request, shareCode, teamAName, teamBName)

      // ラウンド1: A 8点、B ミス
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 8)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page)

      // ラウンド2開始前にシートで得点を確認
      const teamATotal = page.getByTestId(`grand-total-${teamAId2}`)
      await expect(teamATotal).toContainText('8', { timeout: 5_000 })

      // ラウンド2: A 7点
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 7)

      // B のミスがラウンド2完了 → ターン制限発動
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await page.getByTestId('miss-button').click()

      // 試合終了画面
      await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('match-result')).toContainText('試合終了')
      await expect(page.getByTestId('match-result')).toContainText(`${teamAName} の勝利！`)
      await expect(page.getByTestId('match-result')).toContainText('15点')
      // match-result内に1位が表示される
      await expect(page.getByTestId('match-result')).toContainText('1位')
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('時間制限: 時間切れ後の投擲で最高得点チームが勝利する', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_シート時間A_${Date.now()}`
      const teamBName = `E2E_シート時間B_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      // 時間制限（最小値）で試合を作成
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })
      await teamAButton.click()
      await teamBButton.click()

      // 時間制限選択（デフォルト20分 → 最小値まで減らす）
      await page.locator('input[name="limitType"][value="TIME"]').click()
      await expect(page.getByLabel('制限時間を減らす')).toBeVisible()
      const decreaseBtn = page.getByLabel('制限時間を減らす')
      for (let i = 0; i < 19; i++) {
        await decreaseBtn.click()
      }

      await page.getByTestId('start-match-submit').click()
      await page.waitForURL(
        (url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new',
        { timeout: 10_000 }
      )
      const shareCode = new URL(page.url()).pathname.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // シートビューに切替
      await switchToSheetView(page)

      const { teamAId: teamAId2 } = await getTeamIds(request, shareCode, teamAName, teamBName)

      // ラウンド1: A 9点、B ミス
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 9)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page)

      // シートでチームAの得点を確認（9点）
      const teamATotal = page.getByTestId(`grand-total-${teamAId2}`)
      await expect(teamATotal).toContainText('9', { timeout: 5_000 })

      // PATCH APIで startedAt を2分前にして時間切れ状態を作る
      const pastTime = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      const patchRes = await request.patch(`${BASE_URL}/api/matches/${shareCode}`, {
        data: { startedAt: pastTime },
      })
      expect(patchRes.ok()).toBeTruthy()

      // ページをリロードして時間切れ表示を反映
      await page.reload()
      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // シートビューに再切替
      await switchToSheetView(page)

      // ラウンド2: A 6点、B ミス → ラウンド末で時間切れ判定発動
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 6)

      // Bのミス前にシートで合計15点を確認
      await expect(teamATotal).toContainText('15', { timeout: 5_000 })

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await page.getByTestId('miss-button').click()

      // 試合終了画面
      await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('match-result')).toContainText('試合終了')
      await expect(page.getByTestId('match-result')).toContainText(`${teamAName} の勝利！`)
      await expect(page.getByTestId('match-result')).toContainText('1位')
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })
})
