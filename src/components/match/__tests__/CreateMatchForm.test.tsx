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
  {
    id: 'team-a',
    name: 'チームA',
    isSolo: false,
    members: [
      { userId: 'u1', user: { id: 'u1', name: '田中' } },
      { userId: 'u2', user: { id: 'u2', name: '佐藤' } },
    ],
  },
  { id: 'team-b', name: 'チームB', isSolo: false, members: [{ userId: 'u3', user: { id: 'u3', name: '鈴木' } }] },
  { id: 'team-c', name: 'チームC', isSolo: false, members: [] },
]

const mockUsers = [
  { id: 'u1', name: '田中' },
  { id: 'u2', name: '佐藤' },
]

describe('CreateMatchForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('チーム一覧が表示される', () => {
    render(<CreateMatchForm teams={mockTeams} users={mockUsers} />)
    expect(screen.getByText('チームA')).toBeInTheDocument()
    expect(screen.getByText('チームB')).toBeInTheDocument()
    expect(screen.getByText('チームC')).toBeInTheDocument()
  })

  it('メンバー数が表示される', () => {
    render(<CreateMatchForm teams={mockTeams} users={mockUsers} />)
    expect(screen.getByText('2人')).toBeInTheDocument()
    expect(screen.getByText('1人')).toBeInTheDocument()
    expect(screen.getByText('0人')).toBeInTheDocument()
  })

  it('チームが0のとき「チームがありません」が表示される', () => {
    render(<CreateMatchForm teams={[]} users={[]} />)
    expect(screen.getByText(/チームがありません/)).toBeInTheDocument()
  })

  it('初期状態では試合開始ボタンが無効', () => {
    render(<CreateMatchForm teams={mockTeams} users={mockUsers} />)
    expect(screen.getByRole('button', { name: /試合を開始/ })).toBeDisabled()
  })

  it('2チーム選択すると試合開始ボタンが有効になる', async () => {
    render(<CreateMatchForm teams={mockTeams} users={mockUsers} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /チームA/ }))
    await user.click(screen.getByRole('button', { name: /チームB/ }))
    expect(screen.getByRole('button', { name: /試合を開始/ })).not.toBeDisabled()
  })

  it('選択後に同じチームを押すと選択解除される', async () => {
    render(<CreateMatchForm teams={mockTeams} users={mockUsers} />)
    const user = userEvent.setup()
    const teamBtn = screen.getByRole('button', { name: /チームA/ })
    await user.click(teamBtn)
    expect(teamBtn).toHaveAttribute('aria-pressed', 'true')
    await user.click(teamBtn)
    expect(teamBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('2チーム以上選択すると投擲順プレビューが表示される', async () => {
    render(<CreateMatchForm teams={mockTeams} users={mockUsers} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /チームA/ }))
    await user.click(screen.getByRole('button', { name: /チームB/ }))
    expect(screen.getByText('チームの投擲順（選択順）')).toBeInTheDocument()
  })

  it('制限ルール選択肢が3つ表示される', () => {
    render(<CreateMatchForm teams={mockTeams} users={mockUsers} />)
    expect(screen.getByText('制限なし')).toBeInTheDocument()
    expect(screen.getByText('ターン制限')).toBeInTheDocument()
    expect(screen.getByText('時間制限')).toBeInTheDocument()
  })

  it('初期状態では「制限なし」が選択されている', () => {
    render(<CreateMatchForm teams={mockTeams} users={mockUsers} />)
    const noneRadio = screen.getByDisplayValue('NONE')
    expect(noneRadio).toBeChecked()
  })

  it('ターン制限を選択するとラウンド数入力が表示される', async () => {
    render(<CreateMatchForm teams={mockTeams} users={mockUsers} />)
    const user = userEvent.setup()
    await user.click(screen.getByDisplayValue('TURNS'))
    expect(screen.getByText('ラウンド数')).toBeInTheDocument()
    expect(screen.getByLabelText('ラウンド数を減らす')).toBeInTheDocument()
    expect(screen.getByLabelText('ラウンド数を増やす')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('時間制限を選択すると制限時間入力が表示される', async () => {
    render(<CreateMatchForm teams={mockTeams} users={mockUsers} />)
    const user = userEvent.setup()
    await user.click(screen.getByDisplayValue('TIME'))
    expect(screen.getByText('制限時間')).toBeInTheDocument()
    expect(screen.getByLabelText('制限時間を減らす')).toBeInTheDocument()
    expect(screen.getByLabelText('制限時間を増やす')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('ターン数の増減ボタンが機能する', async () => {
    render(<CreateMatchForm teams={mockTeams} users={mockUsers} />)
    const user = userEvent.setup()
    await user.click(screen.getByDisplayValue('TURNS'))
    const increaseBtn = screen.getByLabelText('ラウンド数を増やす')
    await user.click(increaseBtn)
    expect(screen.getByText('13')).toBeInTheDocument()
    const decreaseBtn = screen.getByLabelText('ラウンド数を減らす')
    await user.click(decreaseBtn)
    await user.click(decreaseBtn)
    expect(screen.getByText('11')).toBeInTheDocument()
  })
})
