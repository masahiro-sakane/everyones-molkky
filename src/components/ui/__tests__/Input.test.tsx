import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('ラベルが表示される', () => {
    render(<Input label="名前" />)
    expect(screen.getByLabelText('名前')).toBeInTheDocument()
  })

  it('入力できる', async () => {
    render(<Input label="名前" />)
    const input = screen.getByLabelText('名前')
    await userEvent.type(input, '田中')
    expect(input).toHaveValue('田中')
  })

  it('エラーメッセージが表示される', () => {
    render(<Input label="名前" error="名前は必須です" />)
    expect(screen.getByRole('alert')).toHaveTextContent('名前は必須です')
  })

  it('エラー時にaria-invalidが付く', () => {
    render(<Input label="名前" error="エラー" />)
    const input = screen.getByLabelText('名前')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('isRequiredのとき必須マークが表示される', () => {
    render(<Input label="名前" isRequired />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('ヒントが表示される', () => {
    render(<Input label="名前" hint="50文字以内" />)
    expect(screen.getByText('50文字以内')).toBeInTheDocument()
  })

  it('onChange が発火する', async () => {
    const onChange = vi.fn()
    render(<Input label="名前" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('名前'), 'a')
    expect(onChange).toHaveBeenCalled()
  })
})
