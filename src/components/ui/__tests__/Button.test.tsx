import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('ラベルが表示される', () => {
    render(<Button>クリック</Button>)
    expect(screen.getByRole('button', { name: 'クリック' })).toBeInTheDocument()
  })

  it('クリックイベントが発火する', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>クリック</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled時はクリックできない', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>クリック</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('isLoading時はスピナーが表示される', () => {
    render(<Button isLoading>保存中</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('variantがprimaryのとき正しいクラスが付く', () => {
    render(<Button variant="primary">Primary</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-brand-500')
  })

  it('variantがdangerのとき正しいクラスが付く', () => {
    render(<Button variant="danger">Danger</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-danger-500')
  })

  it('sizeがlgのとき正しいクラスが付く', () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('h-10')
  })
})
