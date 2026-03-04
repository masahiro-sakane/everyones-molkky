import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateMatchForm } from '../CreateMatchForm'

vi.mock('@/app/actions/match', () => ({
  createMatchAction: vi.fn(),
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

const mockTeams = [
  { id: 'team-a', name: 'チームA', members: [{ userId: 'u1' }, { userId: 'u2' }] },
  { id: 'team-b', name: 'チームB', members: [{ userId: 'u3' }] },
  { id: 'team-c', name: 'チームC', members: [] },
]

describe('CreateMatchForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('チーム一覧が表示される', () => {
    render(<CreateMatchForm teams={mockTeams} />)
    expect(screen.getByText('チームA')).toBeInTheDocument()
    expect(screen.getByText('チームB')).toBeInTheDocument()
    expect(screen.getByText('チームC')).toBeInTheDocument()
  })

  it('メンバー数が表示される', () => {
    render(<CreateMatchForm teams={mockTeams} />)
    expect(screen.getByText('2人')).toBeInTheDocument()
    expect(screen.getByText('1人')).toBeInTheDocument()
    expect(screen.getByText('0人')).toBeInTheDocument()
  })

  it('チームが0のとき「チームがありません」が表示される', () => {
    render(<CreateMatchForm teams={[]} />)
    expect(screen.getByText(/チームがありません/)).toBeInTheDocument()
  })

  it('初期状態では試合開始ボタンが無効', () => {
    render(<CreateMatchForm teams={mockTeams} />)
    expect(screen.getByRole('button', { name: /試合を開始/ })).toBeDisabled()
  })

  it('2チーム選択すると試合開始ボタンが有効になる', async () => {
    render(<CreateMatchForm teams={mockTeams} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /チームA/ }))
    await user.click(screen.getByRole('button', { name: /チームB/ }))
    expect(screen.getByRole('button', { name: /試合を開始/ })).not.toBeDisabled()
  })

  it('選択後に同じチームを押すと選択解除される', async () => {
    render(<CreateMatchForm teams={mockTeams} />)
    const user = userEvent.setup()
    const teamBtn = screen.getByRole('button', { name: /チームA/ })
    await user.click(teamBtn)
    expect(teamBtn).toHaveAttribute('aria-pressed', 'true')
    await user.click(teamBtn)
    expect(teamBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('2チーム以上選択すると投擲順プレビューが表示される', async () => {
    render(<CreateMatchForm teams={mockTeams} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /チームA/ }))
    await user.click(screen.getByRole('button', { name: /チームB/ }))
    expect(screen.getByText('投擲順（選択順）')).toBeInTheDocument()
  })
})
