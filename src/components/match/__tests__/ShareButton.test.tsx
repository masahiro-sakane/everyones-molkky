import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareButton } from '../ShareButton'

const mockWriteText = vi.fn().mockResolvedValue(undefined)

describe('ShareButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: mockWriteText },
    })
  })

  it('共有URLの入力フィールドを表示する', () => {
    render(<ShareButton shareCode="ABC123" />)
    const input = screen.getByRole('textbox', { name: '試合共有URL' })
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('readonly')
  })

  it('コピーボタンを表示する', () => {
    render(<ShareButton shareCode="ABC123" />)
    expect(screen.getByRole('button', { name: 'URLをコピー' })).toBeInTheDocument()
  })

  it('URLに shareCode が含まれる', () => {
    render(<ShareButton shareCode="TESTCODE" />)
    const input = screen.getByRole('textbox', { name: '試合共有URL' })
    const value = input.getAttribute('value') ?? ''
    expect(value).toContain('TESTCODE')
  })

  it('コピーボタンをクリックできる（clipboard API は環境依存）', async () => {
    const user = userEvent.setup()
    render(<ShareButton shareCode="ABC123" />)
    // クリックしてもエラーにならない
    await expect(
      user.click(screen.getByRole('button', { name: 'URLをコピー' }))
    ).resolves.not.toThrow()
  })

  it('コピー後はボタンラベルが変わる', async () => {
    const user = userEvent.setup()
    render(<ShareButton shareCode="ABC123" />)
    await user.click(screen.getByRole('button', { name: 'URLをコピー' }))
    expect(screen.getByRole('button', { name: 'コピー済み' })).toBeInTheDocument()
  })
})
