import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SkittleInput } from '@/components/match/SkittleInput'

// SkittleButtonのaria-labelは「N番スキットル」または「N番スキットル（選択中）」
const getSkittle = (n: number) =>
  screen.getByRole('button', { name: `${n}番スキットル` })

describe('SkittleInput', () => {
  it('12本のスキットルボタンが全て表示される', () => {
    render(<SkittleInput onConfirm={vi.fn()} />)
    for (let i = 1; i <= 12; i++) {
      expect(getSkittle(i)).toBeInTheDocument()
    }
  })

  it('スキットルを選択するとaria-pressedがtrueになる', async () => {
    render(<SkittleInput onConfirm={vi.fn()} />)
    await userEvent.click(getSkittle(7))
    expect(screen.getByRole('button', { name: '7番スキットル（選択中）' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('選択後に得点プレビューが表示される', async () => {
    render(<SkittleInput onConfirm={vi.fn()} />)
    await userEvent.click(getSkittle(7))
    expect(screen.getByText('7点')).toBeInTheDocument()
  })

  it('複数選択すると本数が得点になる', async () => {
    render(<SkittleInput onConfirm={vi.fn()} />)
    await userEvent.click(getSkittle(1))
    await userEvent.click(getSkittle(2))
    await userEvent.click(getSkittle(3))
    expect(screen.getByText('3点')).toBeInTheDocument()
  })

  it('確定ボタンで選択したスキットルがコールバックに渡される', async () => {
    const onConfirm = vi.fn()
    render(<SkittleInput onConfirm={onConfirm} />)
    await userEvent.click(getSkittle(5))
    await userEvent.click(screen.getByRole('button', { name: /5点を確定する/ }))
    expect(onConfirm).toHaveBeenCalledWith([5])
  })

  it('ミスボタンで空配列がコールバックに渡される', async () => {
    const onConfirm = vi.fn()
    render(<SkittleInput onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: /ミス/ }))
    expect(onConfirm).toHaveBeenCalledWith([])
  })

  it('確定後に選択がリセットされる', async () => {
    const onConfirm = vi.fn()
    render(<SkittleInput onConfirm={onConfirm} />)
    await userEvent.click(getSkittle(7))
    await userEvent.click(screen.getByRole('button', { name: /7点を確定する/ }))
    expect(getSkittle(7)).toHaveAttribute('aria-pressed', 'false')
  })

  it('同じスキットルを再クリックで選択解除できる', async () => {
    render(<SkittleInput onConfirm={vi.fn()} />)
    await userEvent.click(getSkittle(7))
    expect(screen.getByRole('button', { name: '7番スキットル（選択中）' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: '7番スキットル（選択中）' }))
    expect(getSkittle(7)).toHaveAttribute('aria-pressed', 'false')
  })

  it('disabled時は全スキットルが無効化される', () => {
    render(<SkittleInput onConfirm={vi.fn()} disabled />)
    expect(getSkittle(7)).toBeDisabled()
  })

  it('クリアボタンで選択をリセットできる', async () => {
    render(<SkittleInput onConfirm={vi.fn()} />)
    await userEvent.click(getSkittle(7))
    await userEvent.click(screen.getByRole('button', { name: /クリア/ }))
    expect(getSkittle(7)).toHaveAttribute('aria-pressed', 'false')
  })
})
