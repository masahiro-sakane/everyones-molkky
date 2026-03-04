import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThrowHistory } from '../ThrowHistory'

const mockThrows = [
  {
    id: 't1',
    score: 5,
    skittlesKnocked: [5],
    isFault: false,
    faultType: null,
    user: { name: '田中 太郎' },
    teamName: 'チームA',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't2',
    score: 0,
    skittlesKnocked: [],
    isFault: false,
    faultType: null,
    user: { name: '佐藤 花子' },
    teamName: 'チームB',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't3',
    score: 0,
    skittlesKnocked: [],
    isFault: true,
    faultType: 'STEP_OVER',
    user: { name: '鈴木 一郎' },
    teamName: 'チームA',
    createdAt: new Date().toISOString(),
  },
]

describe('ThrowHistory', () => {
  it('投擲がないときメッセージが表示される', () => {
    render(<ThrowHistory throws={[]} />)
    expect(screen.getByText(/まだ投擲がありません/)).toBeInTheDocument()
  })

  it('投擲者名が表示される', () => {
    render(<ThrowHistory throws={mockThrows} />)
    expect(screen.getByText('田中 太郎')).toBeInTheDocument()
    expect(screen.getByText('佐藤 花子')).toBeInTheDocument()
  })

  it('倒したスキットルが表示される', () => {
    render(<ThrowHistory throws={mockThrows} />)
    expect(screen.getByText('[5]')).toBeInTheDocument()
  })

  it('ミスが表示される', () => {
    render(<ThrowHistory throws={mockThrows} />)
    expect(screen.getByText('ミス')).toBeInTheDocument()
  })

  it('踏み越えフォルトが表示される', () => {
    render(<ThrowHistory throws={mockThrows} />)
    expect(screen.getByText('踏み越え')).toBeInTheDocument()
  })

  it('スコアが表示される', () => {
    render(<ThrowHistory throws={mockThrows} />)
    expect(screen.getByText('+5')).toBeInTheDocument()
  })

  it('最新の投擲が先頭に表示される（逆順）', () => {
    render(<ThrowHistory throws={mockThrows} />)
    const items = screen.getAllByText(/チームA|チームB/)
    // 最後のthrow (鈴木/チームA) が先頭に来るはず
    expect(items[0].textContent).toBe('チームA')
  })
})
