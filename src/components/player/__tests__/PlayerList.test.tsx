import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlayerList } from '../PlayerList'

vi.mock('@/app/actions/player', () => ({
  deletePlayerAction: vi.fn().mockResolvedValue(undefined),
}))

const mockPlayers = [
  { id: 'p1', name: '田中 太郎', teamMembers: [{ team: { id: 't1', name: 'チームA' } }] },
  { id: 'p2', name: '佐藤 花子', teamMembers: [] },
]

describe('PlayerList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('プレイヤー名とチームバッジが表示される', () => {
    render(<PlayerList players={mockPlayers} />)
    expect(screen.getByText('田中 太郎')).toBeInTheDocument()
    expect(screen.getByText('佐藤 花子')).toBeInTheDocument()
    expect(screen.getByText('チームA')).toBeInTheDocument()
  })

  it('プレイヤーが0人のとき空メッセージが表示される', () => {
    render(<PlayerList players={[]} />)
    expect(screen.getByText(/まだプレイヤーがいません/)).toBeInTheDocument()
  })

  it('チーム未所属のプレイヤーは「チーム未所属」と表示される', () => {
    render(<PlayerList players={mockPlayers} />)
    expect(screen.getByText('チーム未所属')).toBeInTheDocument()
  })

  it('編集ボタンが /players/{id}/edit へのリンクになっている', () => {
    render(<PlayerList players={mockPlayers} />)
    const editLink = screen.getByTestId('edit-player-p1').closest('a')
    expect(editLink).toHaveAttribute('href', '/players/p1/edit')
  })

  it('削除ボタンが存在する', () => {
    render(<PlayerList players={mockPlayers} />)
    expect(screen.getByTestId('delete-player-p1')).toBeInTheDocument()
    expect(screen.getByTestId('delete-player-p2')).toBeInTheDocument()
  })

  it('ul要素がgridクラスを持つ（タイル表示）', () => {
    const { container } = render(<PlayerList players={mockPlayers} />)
    const ul = container.querySelector('ul')
    expect(ul).not.toBeNull()
    expect(ul?.className).toMatch(/grid/)
  })
})
