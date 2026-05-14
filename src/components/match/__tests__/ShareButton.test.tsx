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

  it('共有ボタンを表示する', () => {
    render(<ShareButton shareCode="ABC123" />)
    expect(screen.getByRole('button', { name: '観戦URLをコピー' })).toBeInTheDocument()
  })

  it('コピーボタンをクリックできる', async () => {
    const user = userEvent.setup()
    render(<ShareButton shareCode="ABC123" />)
    await expect(
      user.click(screen.getByRole('button', { name: '観戦URLをコピー' }))
    ).resolves.not.toThrow()
  })

  it('コピー後はボタンラベルが変わる', async () => {
    const user = userEvent.setup()
    render(<ShareButton shareCode="ABC123" />)
    await user.click(screen.getByRole('button', { name: '観戦URLをコピー' }))
    expect(screen.getByRole('button', { name: 'コピー済み' })).toBeInTheDocument()
  })
})
