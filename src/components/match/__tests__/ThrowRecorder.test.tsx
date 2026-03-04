import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThrowRecorder } from '../ThrowRecorder'

vi.mock('@/app/actions/match', () => ({
  recordThrowAction: vi.fn(),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useActionState: vi.fn((action: unknown, initialState: unknown) => [
      initialState,
      action,
      false,
    ]),
  }
})

describe('ThrowRecorder', () => {
  const defaultProps = {
    shareCode: 'TEST01',
    currentTeamId: 'team-1',
    currentUserId: 'user-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('スキットルモードとフォルトモードのタブが表示される', () => {
    render(<ThrowRecorder {...defaultProps} />)
    expect(screen.getByText('スキットル')).toBeInTheDocument()
    expect(screen.getByText('フォルト')).toBeInTheDocument()
  })

  it('初期状態はスキットルモード', () => {
    render(<ThrowRecorder {...defaultProps} />)
    // SkittleInput が表示されている（スキットル番号ボタンが存在する）
    expect(screen.getByRole('group', { name: 'スキットル選択' })).toBeInTheDocument()
  })

  it('フォルトタブに切り替えるとフォルト選択ボタンが表示される', async () => {
    const user = userEvent.setup()
    render(<ThrowRecorder {...defaultProps} />)
    await user.click(screen.getByText('フォルト'))
    expect(screen.getByText('ミス（0本）')).toBeInTheDocument()
    expect(screen.getByText('ドロップ')).toBeInTheDocument()
    expect(screen.getByText('踏み越え')).toBeInTheDocument()
    expect(screen.getByText('順番違い')).toBeInTheDocument()
  })

  it('フォルトモードでフォルトを選択するとボタンがハイライトされる', async () => {
    const user = userEvent.setup()
    render(<ThrowRecorder {...defaultProps} />)
    await user.click(screen.getByText('フォルト'))

    const missBtn = screen.getByText('ミス（0本）').closest('button')!
    await user.click(missBtn)

    expect(missBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('フォルトモードで未選択時は「フォルトを記録」ボタンが無効', async () => {
    const user = userEvent.setup()
    render(<ThrowRecorder {...defaultProps} />)
    await user.click(screen.getByText('フォルト'))

    const submitBtn = screen.getByText('フォルトを記録').closest('button')!
    expect(submitBtn).toBeDisabled()
  })

  it('disabled=trueの場合はタブが無効になる', () => {
    render(<ThrowRecorder {...defaultProps} disabled />)
    const tabs = screen.getAllByRole('button').filter((b) => ['スキットル', 'フォルト'].includes(b.textContent ?? ''))
    tabs.forEach((tab) => expect(tab).toBeDisabled())
  })
})
