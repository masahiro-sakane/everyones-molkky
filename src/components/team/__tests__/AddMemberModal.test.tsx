import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddMemberModal } from '../AddMemberModal'

// Server Actionsをモック
vi.mock('@/app/actions/team', () => ({
  createUserAndAddMemberAction: vi.fn(),
  addExistingMemberAction: vi.fn(),
}))

// useActionStateのみモック（reactの他のhookは維持）
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

const mockUsers = [
  { id: 'user-1', name: '田中 太郎' },
  { id: 'user-2', name: '佐藤 花子' },
]

describe('AddMemberModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('モーダルが表示される', () => {
    render(
      <AddMemberModal
        teamId="team-1"
        existingUsers={mockUsers}
        memberUserIds={[]}
        onClose={onClose}
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('モーダルのタイトルが表示される', () => {
    render(
      <AddMemberModal
        teamId="team-1"
        existingUsers={mockUsers}
        memberUserIds={[]}
        onClose={onClose}
      />
    )
    expect(screen.getByText('メンバーを追加')).toBeInTheDocument()
  })

  it('デフォルトで新規ユーザーフォームが表示される', () => {
    render(
      <AddMemberModal
        teamId="team-1"
        existingUsers={mockUsers}
        memberUserIds={[]}
        onClose={onClose}
      />
    )
    expect(screen.getByLabelText(/名前/)).toBeInTheDocument()
  })

  it('既存ユーザータブに切り替えられる', async () => {
    render(
      <AddMemberModal
        teamId="team-1"
        existingUsers={mockUsers}
        memberUserIds={[]}
        onClose={onClose}
      />
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /既存ユーザーから追加/ }))
    expect(screen.getByLabelText(/ユーザーを選択/)).toBeInTheDocument()
  })

  it('メンバーに追加済みのユーザーはセレクトに表示されない', async () => {
    render(
      <AddMemberModal
        teamId="team-1"
        existingUsers={mockUsers}
        memberUserIds={['user-1']}
        onClose={onClose}
      />
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /既存ユーザーから追加/ }))
    expect(screen.queryByText('田中 太郎')).not.toBeInTheDocument()
    expect(screen.getByText('佐藤 花子')).toBeInTheDocument()
  })

  it('全員追加済みのとき追加できないメッセージが表示される', async () => {
    render(
      <AddMemberModal
        teamId="team-1"
        existingUsers={mockUsers}
        memberUserIds={['user-1', 'user-2']}
        onClose={onClose}
      />
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /既存ユーザーから追加/ }))
    expect(screen.getByText(/追加できるユーザーがいません/)).toBeInTheDocument()
  })

  it('閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
    render(
      <AddMemberModal
        teamId="team-1"
        existingUsers={mockUsers}
        memberUserIds={[]}
        onClose={onClose}
      />
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /閉じる/ }))
    expect(onClose).toHaveBeenCalled()
  })
})
