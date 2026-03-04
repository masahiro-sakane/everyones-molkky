import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CurrentThrower } from '../CurrentThrower'

describe('CurrentThrower', () => {
  it('投擲者名とチーム名が表示される', () => {
    render(
      <CurrentThrower
        teamName="チームA"
        throwerName="田中 太郎"
        teamOrder={1}
        totalTeams={2}
      />
    )
    expect(screen.getByText('田中 太郎')).toBeInTheDocument()
    expect(screen.getByText('チームA')).toBeInTheDocument()
  })

  it('現在の投擲者ラベルが表示される', () => {
    render(
      <CurrentThrower
        teamName="チームA"
        throwerName="田中 太郎"
        teamOrder={1}
        totalTeams={2}
      />
    )
    expect(screen.getByText('現在の投擲者')).toBeInTheDocument()
  })

  it('チーム番号が表示される', () => {
    render(
      <CurrentThrower
        teamName="チームB"
        throwerName="佐藤 花子"
        teamOrder={2}
        totalTeams={3}
      />
    )
    expect(screen.getByText(/チーム 2 \/ 3/)).toBeInTheDocument()
  })

  it('投擲者名の頭文字がアバターに表示される', () => {
    render(
      <CurrentThrower
        teamName="チームA"
        throwerName="田中 太郎"
        teamOrder={1}
        totalTeams={2}
      />
    )
    // aria-hiddenなのでaria-hidden=trueで探す
    const avatar = document.querySelector('[aria-hidden="true"]')
    expect(avatar?.textContent).toBe('田')
  })
})
