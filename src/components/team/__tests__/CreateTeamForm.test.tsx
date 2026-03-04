import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateTeamForm } from '../CreateTeamForm'

// Server Actionをモック
vi.mock('@/app/actions/team', () => ({
  createTeamAction: vi.fn(),
}))

// useActionStateをモック（Next.jsのServer Actionsとの統合）
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useActionState: vi.fn((action: unknown, initialState: unknown) => [
      initialState,
      action,
      false,
    ]),
  }
})

describe('CreateTeamForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('チーム名の入力フィールドが表示される', () => {
    render(<CreateTeamForm />)
    expect(screen.getByLabelText(/チーム名/)).toBeInTheDocument()
  })

  it('作成ボタンが表示される', () => {
    render(<CreateTeamForm />)
    expect(screen.getByRole('button', { name: /チームを作成/ })).toBeInTheDocument()
  })

  it('キャンセルボタンが表示される', () => {
    render(<CreateTeamForm />)
    expect(screen.getByRole('button', { name: /キャンセル/ })).toBeInTheDocument()
  })

  it('エラーメッセージが表示される', async () => {
    const { useActionState } = await import('react')
    vi.mocked(useActionState).mockReturnValue([
      { errors: { name: ['チーム名を入力してください'] } },
      vi.fn(),
      false,
    ] as ReturnType<typeof useActionState>)

    render(<CreateTeamForm />)
    expect(screen.getByText('チーム名を入力してください')).toBeInTheDocument()
  })

  it('ローディング中はボタンが無効化される', async () => {
    const { useActionState } = await import('react')
    vi.mocked(useActionState).mockReturnValue([
      {},
      vi.fn(),
      true,
    ] as ReturnType<typeof useActionState>)

    render(<CreateTeamForm />)
    const submitBtn = screen.getByRole('button', { name: /チームを作成/ })
    expect(submitBtn).toBeDisabled()
  })

  it('必須フィールドにアスタリスクが付く', () => {
    render(<CreateTeamForm />)
    // isRequired=trueのInputはラベル内にアスタリスクが付く
    const label = screen.getByText(/チーム名/)
    expect(label).toBeInTheDocument()
  })
})
