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

  it('初期状態は得点入力パネルが表示される', () => {
    render(<ThrowRecorder {...defaultProps} />)
    expect(screen.getByRole('group', { name: 'スコア入力' })).toBeInTheDocument()
  })

  it('初期モードは複数本モード', () => {
    render(<ThrowRecorder {...defaultProps} />)
    expect(screen.getByTestId('mode-multi')).toHaveAttribute('aria-selected', 'true')
  })

  it('「F」ボタンをクリックするとフォルト入力シートが開く', async () => {
    const user = userEvent.setup()
    render(<ThrowRecorder {...defaultProps} />)
    await user.click(screen.getByTestId('fault-open'))
    expect(screen.getByText('フォルト種別を選択')).toBeInTheDocument()
    expect(screen.getByText('ミス（0本）')).toBeInTheDocument()
    expect(screen.getByText('ドロップ')).toBeInTheDocument()
    expect(screen.getByText('踏み越え')).toBeInTheDocument()
    expect(screen.getByText('順番違い')).toBeInTheDocument()
  })

  it('フォルトシートでフォルトを選択するとボタンがハイライトされる', async () => {
    const user = userEvent.setup()
    render(<ThrowRecorder {...defaultProps} />)
    await user.click(screen.getByTestId('fault-open'))

    const missBtn = screen.getByText('ミス（0本）').closest('button')!
    await user.click(missBtn)

    expect(missBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('フォルトシートで未選択時は「フォルトを記録」ボタンが無効', async () => {
    const user = userEvent.setup()
    render(<ThrowRecorder {...defaultProps} />)
    await user.click(screen.getByTestId('fault-open'))

    const submitBtn = screen.getByTestId('record-fault')
    expect(submitBtn).toBeDisabled()
  })

  it('consecutiveMisses=2のとき連続ミス警告バナーが表示される', () => {
    render(<ThrowRecorder {...defaultProps} consecutiveMisses={2} />)
    const alerts = screen.getAllByRole('alert')
    expect(alerts.some((el) => el.textContent?.includes('連続ミス 2/3'))).toBe(true)
  })

  it('consecutiveMisses=1のとき警告バナーは表示されない', () => {
    render(<ThrowRecorder {...defaultProps} consecutiveMisses={1} />)
    expect(screen.queryByText(/連続ミス/)).not.toBeInTheDocument()
  })

  it('consecutiveMissesを渡さない（デフォルト0）とき警告バナーは表示されない', () => {
    render(<ThrowRecorder {...defaultProps} />)
    expect(screen.queryByText(/連続ミス/)).not.toBeInTheDocument()
  })
})
