import { test, expect } from '@playwright/test'

/**
 * チーム作成 → メンバー追加フロー
 * ※ このテストは実行前に dev server (npm run dev) と DB が起動済みであること
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

test.describe('チーム管理フロー', () => {
  // テスト後に作成したチームを削除する
  const createdTeamIds: string[] = []

  test.afterEach(async ({ request }) => {
    for (const id of createdTeamIds) {
      await request.delete(`${BASE_URL}/api/teams/${id}`).catch(() => {
        // クリーンアップ失敗は無視
      })
    }
    createdTeamIds.length = 0
  })

  test('チーム一覧ページが表示される', async ({ page }) => {
    await page.goto(`${BASE_URL}/teams`)
    await expect(page.getByRole('heading', { name: 'チーム一覧' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'チームを作成' })).toBeVisible()
  })

  test('チーム作成フォームが表示される', async ({ page }) => {
    await page.goto(`${BASE_URL}/teams/new`)
    await expect(page.getByRole('heading', { name: 'チームを作成' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'チーム名' })).toBeVisible()
    await expect(page.getByTestId('create-team-submit')).toBeVisible()
  })

  test('チームを作成できる', async ({ page }) => {
    await page.goto(`${BASE_URL}/teams/new`)

    const teamName = `E2Eテストチーム_${Date.now()}`
    await page.getByRole('textbox', { name: 'チーム名' }).fill(teamName)
    await page.getByTestId('create-team-submit').click()

    // チーム詳細ページにリダイレクト（/teams/new ではなく /teams/[id] へ）
    await page.waitForURL((url) => url.pathname.startsWith('/teams/') && url.pathname !== '/teams/new')

    // チームIDを記録（後でクリーンアップ）
    const teamId = page.url().split('/teams/')[1]
    createdTeamIds.push(teamId)

    // チーム名が表示されることを検証
    await expect(page.getByText(teamName)).toBeVisible()
    // メンバー追加ボタンが表示されることを検証
    await expect(page.getByTestId('add-member-button')).toBeVisible()
  })

  test('チーム名が空の場合はエラーを表示する', async ({ page }) => {
    await page.goto(`${BASE_URL}/teams/new`)
    await page.getByTestId('create-team-submit').click()
    // エラーメッセージが表示されることを検証
    await expect(page.getByText('チーム名は1文字以上で入力してください')).toBeVisible()
    // フォームのページに留まることを検証
    await expect(page.getByRole('heading', { name: 'チームを作成' })).toBeVisible()
  })

  test('チームにメンバーを追加できる', async ({ page }) => {
    // チームを作成
    await page.goto(`${BASE_URL}/teams/new`)
    const teamName = `E2Eメンバーテスト_${Date.now()}`
    await page.getByRole('textbox', { name: 'チーム名' }).fill(teamName)
    await page.getByTestId('create-team-submit').click()
    await page.waitForURL((url) => url.pathname.startsWith('/teams/') && url.pathname !== '/teams/new')

    const teamId = page.url().split('/teams/')[1]
    createdTeamIds.push(teamId)

    // メンバー追加ボタンをクリック
    await page.getByTestId('add-member-button').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // メンバー名を入力して追加
    const memberName = `テストメンバー_${Date.now()}`
    await page.getByTestId('member-name-input').fill(memberName)
    await page.getByTestId('add-member-submit').click()

    // 追加成功後にダイアログが閉じ、メンバー数が更新されることを検証
    await expect(page.getByText(/メンバー（\d+人）/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(memberName)).toBeVisible()
  })

  test('チーム統計ページが表示される', async ({ page }) => {
    await page.goto(`${BASE_URL}/stats/teams`)
    await expect(page.getByRole('heading', { name: 'チーム統計' })).toBeVisible()
  })

  test('プレイヤー統計ページが表示される', async ({ page }) => {
    await page.goto(`${BASE_URL}/stats/users`)
    await expect(page.getByRole('heading', { name: 'プレイヤー統計' })).toBeVisible()
  })
})
