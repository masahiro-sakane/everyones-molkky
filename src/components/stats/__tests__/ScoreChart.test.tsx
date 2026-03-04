import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoreChart } from '../ScoreChart'
import type { ComponentProps } from 'react'

type Props = ComponentProps<typeof ScoreChart>

const teams: Props['teams'] = [
  { teamId: 'team-1', teamName: 'チームA' },
  { teamId: 'team-2', teamName: 'チームB' },
]

const snapshots: Props['snapshots'] = [
  { throwIndex: 0, teamId: 'team-1', teamName: 'チームA', score: 3, label: 'T1-1' },
  { throwIndex: 1, teamId: 'team-2', teamName: 'チームB', score: 5, label: 'T1-2' },
  { throwIndex: 2, teamId: 'team-1', teamName: 'チームA', score: 9, label: 'T2-1' },
]

describe('ScoreChart', () => {
  it('投擲データなしの場合はメッセージを表示する', () => {
    render(<ScoreChart snapshots={[]} teams={teams} />)
    expect(screen.getByText('投擲データがありません')).toBeInTheDocument()
  })

  it('SVGグラフを描画する', () => {
    const { container } = render(<ScoreChart snapshots={snapshots} teams={teams} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('aria-label でアクセシビリティラベルを持つ', () => {
    render(<ScoreChart snapshots={snapshots} teams={teams} />)
    expect(screen.getByRole('img', { name: 'スコア推移グラフ' })).toBeInTheDocument()
  })

  it('凡例にチーム名を表示する', () => {
    render(<ScoreChart snapshots={snapshots} teams={teams} />)
    expect(screen.getByText('チームA')).toBeInTheDocument()
    expect(screen.getByText('チームB')).toBeInTheDocument()
  })

  it('50点ゴールラインの凡例を表示する', () => {
    render(<ScoreChart snapshots={snapshots} teams={teams} />)
    expect(screen.getByText('50点（ゴール）')).toBeInTheDocument()
  })

  it('チームが1つでも描画できる', () => {
    const singleTeam = [{ teamId: 'team-1', teamName: 'チームA' }]
    const singleSnaps = [
      { throwIndex: 0, teamId: 'team-1', teamName: 'チームA', score: 10, label: 'T1-1' },
    ]
    const { container } = render(<ScoreChart snapshots={singleSnaps} teams={singleTeam} />)
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('チームA')).toBeInTheDocument()
  })

  it('heightプロパティが反映される', () => {
    const { container } = render(<ScoreChart snapshots={snapshots} teams={teams} height={300} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toContain('300')
  })

  it('Y軸に0〜50の目盛りが表示される', () => {
    render(<ScoreChart snapshots={snapshots} teams={teams} />)
    // SVG内のtextノードを確認
    const { container } = render(<ScoreChart snapshots={snapshots} teams={teams} />)
    const texts = container.querySelectorAll('text')
    const textContents = Array.from(texts).map((t) => t.textContent)
    expect(textContents).toContain('0')
    expect(textContents).toContain('50')
  })
})
