import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberList } from '../MemberList'

vi.mock('@/app/actions/team', () => ({
  removeMemberAction: vi.fn().mockResolvedValue({ message: 'メンバーを削除しました' }),
  createUserAndAddMemberAction: vi.fn(),
  addExistingMemberAction: vi.fn(),
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

const mockMembers = [
  {
    userId: 'user-1',
    role: 'captain',
    user: { id: 'user-1', name: '田中 太郎' },
  },
  {
    userId: 'user-2',
    role: 'member',
    user: { id: 'user-2', name: '佐藤 花子' },
  },
]

const mockUsers = [
  { id: 'user-1', name: '田中 太郎' },
  { id: 'user-2', name: '佐藤 花子' },
  { id: 'user-3', name: '鈴木 一郎' },
]

describe('MemberList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('メンバー数のヘッダーが表示される', () => {
    render(<MemberList teamId="team-1" members={mockMembers} allUsers={mockUsers} />)
    expect(screen.getByText(/メンバー \(2人\)/)).toBeInTheDocument()
  })

  it('メンバー一覧が表示される', () => {
    render(<MemberList teamId="team-1" members={mockMembers} allUsers={mockUsers} />)
    expect(screen.getByText('田中 太郎')).toBeInTheDocument()
    expect(screen.getByText('佐藤 花子')).toBeInTheDocument()
  })

  it('キャプテンにバッジが表示される', () => {
    render(<MemberList teamId="team-1" members={mockMembers} allUsers={mockUsers} />)
    expect(screen.getByText('キャプテン')).toBeInTheDocument()
  })

  it('メンバーが0人のときメッセージが表示される', () => {
    render(<MemberList teamId="team-1" members={[]} allUsers={mockUsers} />)
    expect(screen.getByText(/まだメンバーがいません/)).toBeInTheDocument()
  })

  it('メンバーを追加ボタンが表示される', () => {
    render(<MemberList teamId="team-1" members={mockMembers} allUsers={mockUsers} />)
    expect(screen.getByRole('button', { name: /メンバーを追加/ })).toBeInTheDocument()
  })

  it('削除ボタンにアクセシブルなラベルが付く', () => {
    render(<MemberList teamId="team-1" members={mockMembers} allUsers={mockUsers} />)
    expect(screen.getByRole('button', { name: /田中 太郎をメンバーから削除/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /佐藤 花子をメンバーから削除/ })).toBeInTheDocument()
  })

  it('メンバーを追加ボタンをクリックするとモーダルが開く', async () => {
    render(<MemberList teamId="team-1" members={mockMembers} allUsers={mockUsers} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /メンバーを追加/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('空のチームでもメンバーを追加ボタンが表示される', () => {
    render(<MemberList teamId="team-1" members={[]} allUsers={mockUsers} />)
    expect(screen.getByRole('button', { name: /メンバーを追加/ })).toBeInTheDocument()
  })
})
