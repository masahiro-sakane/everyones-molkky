import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DisqualificationAlert } from '../DisqualificationAlert'

describe('DisqualificationAlert', () => {
  it('チーム名が表示される', () => {
    render(<DisqualificationAlert teamName="チームA" />)
    expect(screen.getByText('チームA')).toBeInTheDocument()
  })

  it('失格メッセージが表示される', () => {
    render(<DisqualificationAlert teamName="チームA" />)
    expect(screen.getByText(/3回連続ミスにより失格/)).toBeInTheDocument()
  })

  it('role="alert"が付く', () => {
    render(<DisqualificationAlert teamName="チームA" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('onDismissが渡された場合は閉じるボタンが表示される', () => {
    const onDismiss = vi.fn()
    render(<DisqualificationAlert teamName="チームA" onDismiss={onDismiss} />)
    expect(screen.getByRole('button', { name: /アラートを閉じる/ })).toBeInTheDocument()
  })

  it('閉じるボタンをクリックするとonDismissが呼ばれる', async () => {
    const onDismiss = vi.fn()
    render(<DisqualificationAlert teamName="チームA" onDismiss={onDismiss} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /アラートを閉じる/ }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('onDismissがない場合は閉じるボタンが表示されない', () => {
    render(<DisqualificationAlert teamName="チームA" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
