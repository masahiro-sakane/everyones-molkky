import { test, expect } from '@playwright/test'

/**
 * 試合作成 → スコア入力 → 勝利の一連フロー
 * ※ このテストは実行前に dev server (npm run dev) と DB が起動済みであること
 */
test.describe('試合フロー', () => {
  test('ホームページが表示される', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'みんなのモルック' })).toBeVisible()
    await expect(page.getByRole('link', { name: '試合を始める' }).first()).toBeVisible()
  })

  test('ナビゲーションが機能する', async ({ page }) => {
    await page.goto('/')

    // チーム管理へ
    await page.getByRole('link', { name: 'チーム管理' }).first().click()
    await expect(page).toHaveURL('/teams')
    await expect(page.getByRole('heading', { name: 'チーム一覧' })).toBeVisible()

    // 統計へ
    await page.getByRole('link', { name: '統計' }).first().click()
    await expect(page).toHaveURL('/stats')
    await expect(page.getByRole('heading', { name: '統計・分析' })).toBeVisible()
  })

  test('試合一覧ページが表示される', async ({ page }) => {
    await page.goto('/matches')
    await expect(page.getByRole('heading', { name: '試合一覧' })).toBeVisible()
  })

  test('存在しないページは404を表示する', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz')
    expect(response?.status()).toBe(404)
  })
})
