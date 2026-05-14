import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThrowRecorder } from '../ThrowRecorder'

describe('ThrowRecorder', () => {
  const defaultProps = {
    shareCode: 'TEST01',
    currentTeamId: 'team-1',
    currentUserId: 'user-1',
    onOptimisticThrow: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('得点入力モードとフォルトモードのタブが表示される', () => {
    render(<ThrowRecorder {...defaultProps} />)
    expect(screen.getByTestId('mode-score')).toBeInTheDocument()
    expect(screen.getByTestId('mode-fault')).toBeInTheDocument()
  })

  it('初期状態は得点入力モード（ScoreInputPanel）', () => {
    render(<ThrowRecorder {...defaultProps} />)
    expect(screen.getByRole('group', { name: 'スコア入力' })).toBeInTheDocument()
  })

  it('初期モードは常に複数本モード', () => {
    render(<ThrowRecorder {...defaultProps} />)
    expect(screen.getByTestId('mode-multi')).toHaveAttribute('aria-selected', 'true')
  })

  it('フォルトタブに切り替えるとフォルト選択ボタンが表示される', async () => {
    const user = userEvent.setup()
    render(<ThrowRecorder {...defaultProps} />)
    await user.click(screen.getByTestId('mode-fault'))
    expect(screen.getByText('ミス（0本）')).toBeInTheDocument()
    expect(screen.getByText('ドロップ')).toBeInTheDocument()
    expect(screen.getByText('踏み越え')).toBeInTheDocument()
    expect(screen.getByText('順番違い')).toBeInTheDocument()
  })

  it('フォルトモードでフォルトを選択するとボタンがハイライトされる', async () => {
    const user = userEvent.setup()
    render(<ThrowRecorder {...defaultProps} />)
    await user.click(screen.getByTestId('mode-fault'))

    const missBtn = screen.getByText('ミス（0本）').closest('button')!
    await user.click(missBtn)

    expect(missBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('フォルトモードで未選択時は「フォルトを記録」ボタンが無効', async () => {
    const user = userEvent.setup()
    render(<ThrowRecorder {...defaultProps} />)
    await user.click(screen.getByTestId('mode-fault'))

    const submitBtn = screen.getByText('フォルトを記録').closest('button')!
    expect(submitBtn).toBeDisabled()
  })

  it('disabled=trueの場合は得点/フォルトタブが無効になる', () => {
    render(<ThrowRecorder {...defaultProps} disabled />)
    expect(screen.getByTestId('mode-score')).toBeDisabled()
    expect(screen.getByTestId('mode-fault')).toBeDisabled()
  })
})
