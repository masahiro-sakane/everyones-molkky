import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * ターン制限・時間制限のE2Eテスト
 *
 * 前提:
 * - dev server (npm run dev) が起動済み
 * - DB に seed データが存在する (npm run prisma:seed)
 *
 * ターン制限テスト戦略:
 * - ターン制限を 2ラウンドに設定（最小限のラウンド数で制限超過を検証）
 * - チームAが全ターン得点、チームBがミスし続ける
 * - 2ラウンド完了（4投擲）時点でターン制限超過 → チームAが最高得点で勝利
 *
 * 時間制限テスト戦略:
 * - 時間制限を 1分に設定して試合を作成
 * - PATCH APIで startedAt を2分前に書き換えて時間切れ状態を作る
 * - ラウンドの最後の投擲を行って勝利判定を発動させる
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

/** Server Action の完了を待つ（SSEのため networkidle は使えない） */
async function waitForThrowRecorded(page: Page, expectedCount: number) {
  await expect(page.getByText(`投擲履歴（${expectedCount}回）`)).toBeVisible({ timeout: 15_000 })
}

/** スキットル番号ボタンをクリックして確定する */
async function recordSkittle(page: Page, skittleNumber: number, throwCount: number) {
  const skittleBtn = page.getByTestId(`skittle-${skittleNumber}`)
  await skittleBtn.scrollIntoViewIfNeeded()
  await skittleBtn.click()
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

test.describe('制限ルールテスト', () => {
  test.setTimeout(120_000)

  test('ターン制限: 2ラウンドで終了し最高得点チームが勝利する', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      // 1. チームを2つ作成する
      const teamAName = `E2E_ターン制限A_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_ターン制限B_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      // 2. ターン制限2ラウンドで試合を作成する
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()

      // ターン制限を選択してラウンド数を2に設定
      await page.locator('input[name="limitType"][value="TURNS"]').click()
      await expect(page.getByLabel('ラウンド数を減らす')).toBeVisible()

      // デフォルト12から2まで減らす（10回クリック）
      const decreaseBtn = page.getByLabel('ラウンド数を減らす')
      for (let i = 0; i < 10; i++) {
        await decreaseBtn.click()
      }
      await expect(page.getByText('2', { exact: true })).toBeVisible()

      // 試合を開始
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const matchPath = new URL(page.url()).pathname
      const shareCode = matchPath.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      // 3. 試合画面が表示されること確認
      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // ターン制限状況が表示される
      await expect(page.getByLabel('ターン制限状況')).toBeVisible()
      // 「0 / 2」のラウンド表示を確認
      const limitStatus = page.getByLabel('ターン制限状況')
      await expect(limitStatus).toContainText('0')
      await expect(limitStatus).toContainText('2')

      // 4. 2ラウンド分の投擲を行う
      // ラウンド1
      // ターン1: チームA → 5番スキットル (5点)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 5, 1)

      // ターン2: チームB → ミス (0点)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 2)

      // ラウンド2（1ラウンド完了後に残り1ラウンドの表示を確認）
      await expect(limitStatus).toContainText('1')

      // ターン3: チームA → 3番スキットル (8点)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 3, 3)

      // ターン4: チームB → ミス (0点) → 2ラウンド完了で制限超過 → チームA勝利
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await page.getByTestId('miss-button').click()

      // 5. 勝利画面の確認
      await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('match-result')).toContainText('試合終了')
      await expect(page.getByTestId('match-result')).toContainText(`${teamAName} の勝利！`)
      // チームAのスコアは8点（5+3）
      await expect(page.getByTestId('match-result')).toContainText('8点')
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('ターン制限: ラウンド進行に従い残りラウンド表示が減少する', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      // チームを2つ作成する
      const teamAName = `E2E_ターン表示A_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_ターン表示B_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      // ターン制限3ラウンドで試合を作成する
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()

      await page.locator('input[name="limitType"][value="TURNS"]').click()
      await expect(page.getByLabel('ラウンド数を減らす')).toBeVisible()

      // デフォルト12から3に設定（9回クリック）
      const decreaseBtn = page.getByLabel('ラウンド数を減らす')
      for (let i = 0; i < 9; i++) {
        await decreaseBtn.click()
      }
      await expect(page.getByText('3', { exact: true })).toBeVisible()

      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const matchPath = new URL(page.url()).pathname
      const shareCode = matchPath.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      const limitStatus = page.getByLabel('ターン制限状況')
      await expect(limitStatus).toBeVisible()
      // 開始時: 0 / 3、残り3ラウンド
      await expect(limitStatus).toContainText('残り 3 ラウンド')

      // ラウンド1完了（2投擲）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 1)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 2)

      // 1ラウンド完了後: 1 / 3、残り2ラウンド
      await expect(limitStatus).toContainText('残り 2 ラウンド')

      // ラウンド2完了（2投擲）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 1, 3)
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 4)

      // 2ラウンド完了後: 2 / 3、残り1ラウンド（警告状態）
      await expect(limitStatus).toContainText('残り 1 ラウンド')
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('時間制限: 時間切れ後の投擲で最高得点チームが勝利する', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      // 1. チームを2つ作成する
      const teamAName = `E2E_時間制限A_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_時間制限B_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      // 2. 時間制限1分で試合を作成する
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()

      // 時間制限を選択して1分に設定（デフォルト20分から19回減らす）
      await page.locator('input[name="limitType"][value="TIME"]').click()
      await expect(page.getByLabel('制限時間を減らす')).toBeVisible()

      const decreaseBtn = page.getByLabel('制限時間を減らす')
      for (let i = 0; i < 19; i++) {
        await decreaseBtn.click()
      }
      // 20 - (19 * 5) = ... 最小値1分に達するまで
      // 実際は5分刻みなので20→15→10→5→1（4回で最小値に到達するが最小値は1）
      // decreaseBtn は Math.max(1, v - 5) なので 20→15→10→5→1→1→...
      // 4回クリックで最小値1に到達
      await expect(page.getByLabel('時間制限状況')).not.toBeVisible() // まだ試合未開始

      // 1分になるまで減らす（5分刻みで20→15→10→5→1）
      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const matchPath = new URL(page.url()).pathname
      const shareCode = matchPath.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      // 3. 試合画面が表示されること確認
      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // 時間制限状況が表示される
      await expect(page.getByLabel('時間制限状況')).toBeVisible()
      // カウントダウン表示（00:xx形式）
      const limitStatus = page.getByLabel('時間制限状況')
      await expect(limitStatus).toContainText('残り時間')

      // 4. 1ラウンド目の投擲（チームAが得点、チームBがミス）
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 7, 1)

      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await recordMiss(page, 2)

      // 5. PATCH APIで startedAt を2分前に設定して時間切れ状態にする
      const pastTime = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      const patchRes = await request.patch(`${BASE_URL}/api/matches/${shareCode}`, {
        data: { startedAt: pastTime },
      })
      expect(patchRes.ok()).toBeTruthy()

      // ページをリロードして時間切れ表示を反映
      await page.reload()
      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // 時間切れ表示の確認
      await expect(page.getByLabel('時間制限状況')).toBeVisible()
      await expect(limitStatus).toContainText('時間終了')

      // 6. ラウンド2: チームAが得点 → ラウンド終了でチームA勝利が確定する
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者A')
      await recordSkittle(page, 3, 3)

      // ラウンドの最後はチームBの投擲（ミス）→ 時間切れ判定でチームA勝利
      await expect(page.getByTestId('current-thrower')).toContainText('投擲者B')
      await page.getByTestId('miss-button').click()

      // 7. 勝利画面の確認
      await expect(page.getByTestId('match-result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('match-result')).toContainText('試合終了')
      await expect(page.getByTestId('match-result')).toContainText(`${teamAName} の勝利！`)
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })

  test('時間制限: 試合開始直後はカウントダウンが表示される', async ({ page, request }) => {
    const teamIds: string[] = []
    const matchShareCodes: string[] = []

    try {
      const teamAName = `E2E_時間表示A_${Date.now()}`
      const teamAId = await createTeamWithMember(page, teamAName, '投擲者A')
      teamIds.push(teamAId)

      const teamBName = `E2E_時間表示B_${Date.now()}`
      const teamBId = await createTeamWithMember(page, teamBName, '投擲者B')
      teamIds.push(teamBId)

      // 時間制限20分で試合を作成（デフォルト値）
      await page.goto(`${BASE_URL}/matches/new`)
      await expect(page.getByRole('heading', { name: '試合を作成' })).toBeVisible()

      const teamAButton = page.getByRole('button', { name: teamAName })
      const teamBButton = page.getByRole('button', { name: teamBName })
      await expect(teamAButton).toBeVisible({ timeout: 10_000 })
      await expect(teamBButton).toBeVisible({ timeout: 10_000 })

      await teamAButton.click()
      await teamBButton.click()

      // 時間制限を選択（デフォルト20分）
      await page.locator('input[name="limitType"][value="TIME"]').click()
      await expect(page.getByLabel('制限時間を減らす')).toBeVisible()
      // デフォルト20分のまま開始（tabular-numsスタイルの数値表示を確認）
      await expect(page.locator('.tabular-nums').getByText('20', { exact: true })).toBeVisible()

      await page.getByTestId('start-match-submit').click()
      await page.waitForURL((url) => url.pathname.startsWith('/matches/') && url.pathname !== '/matches/new')

      const matchPath = new URL(page.url()).pathname
      const shareCode = matchPath.replace('/matches/', '')
      matchShareCodes.push(shareCode)

      await expect(page.getByText('投擲を記録')).toBeVisible({ timeout: 10_000 })

      // 時間制限ステータスが表示される
      const limitStatus = page.getByLabel('時間制限状況')
      await expect(limitStatus).toBeVisible()
      await expect(limitStatus).toContainText('残り時間')

      // MM:SS 形式のカウントダウンが表示される（19:xx または 20:00）
      await expect(limitStatus).toContainText(':')

      // 3分以上残っているので警告色でないことを確認
      await expect(limitStatus).not.toHaveClass(/warning/)
    } finally {
      await cleanup(request, teamIds, matchShareCodes)
    }
  })
})
