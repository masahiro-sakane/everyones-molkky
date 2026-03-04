import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from '../StatCard'

describe('StatCard', () => {
  it('ラベルと値を表示する', () => {
    render(<StatCard label="勝率" value={75} />)
    expect(screen.getByText('勝率')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('単位を表示する', () => {
    render(<StatCard label="勝率" value={75} unit="%" />)
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('サブテキストを表示する', () => {
    render(<StatCard label="勝率" value={75} unit="%" sub="3勝 1敗" />)
    expect(screen.getByText('3勝 1敗')).toBeInTheDocument()
  })

  it('単位なしの場合は単位を表示しない', () => {
    render(<StatCard label="試合数" value={5} />)
    expect(screen.queryByText('%')).not.toBeInTheDocument()
  })

  it('サブテキストなしの場合は表示しない', () => {
    const { container } = render(<StatCard label="試合数" value={5} />)
    expect(container.querySelectorAll('p').length).toBe(2)  // label + value only
  })

  it('highlight=trueでブランドカラーのスタイルが適用される', () => {
    const { container } = render(<StatCard label="勝率" value={75} highlight />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('bg-brand-50')
  })

  it('highlight=falseでニュートラルカラーのスタイルが適用される', () => {
    const { container } = render(<StatCard label="試合数" value={5} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('bg-neutral-0')
  })

  it('文字列の値を表示できる', () => {
    render(<StatCard label="ラベル" value="テスト値" />)
    expect(screen.getByText('テスト値')).toBeInTheDocument()
  })

  it('値が0のときも表示する', () => {
    render(<StatCard label="試合数" value={0} unit="試合" />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
