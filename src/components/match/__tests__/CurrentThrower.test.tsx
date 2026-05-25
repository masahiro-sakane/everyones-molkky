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
    expect(screen.getByText('(チームA)')).toBeInTheDocument()
  })

  it('次の投擲者が表示される', () => {
    render(
      <CurrentThrower
        teamName="チームA"
        throwerName="田中 太郎"
        teamOrder={1}
        totalTeams={2}
        nextThrowerName="佐藤 花子"
      />
    )
    expect(screen.getByText('次:')).toBeInTheDocument()
    expect(screen.getByText('佐藤 花子')).toBeInTheDocument()
  })

  it('次の投擲者が未設定のとき「次:」は表示されない', () => {
    render(
      <CurrentThrower
        teamName="チームA"
        throwerName="田中 太郎"
        teamOrder={1}
        totalTeams={2}
      />
    )
    expect(screen.queryByText('次:')).not.toBeInTheDocument()
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
    const avatar = document.querySelector('[aria-hidden="true"]')
    expect(avatar?.textContent).toBe('田')
  })

  it('action propに渡したノードが表示される', () => {
    render(
      <CurrentThrower
        teamName="チームA"
        throwerName="田中 太郎"
        teamOrder={1}
        totalTeams={2}
        action={<button>AI</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'AI' })).toBeInTheDocument()
  })
})
