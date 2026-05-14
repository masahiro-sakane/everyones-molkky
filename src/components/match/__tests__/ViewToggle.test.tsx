import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewToggle } from '../ViewToggle'

describe('ViewToggle', () => {
  it('シートとカードの両方のタブが表示される', () => {
    render(<ViewToggle value="sheet" onChange={vi.fn()} />)
    expect(screen.getByTestId('view-toggle-sheet')).toBeInTheDocument()
    expect(screen.getByTestId('view-toggle-card')).toBeInTheDocument()
  })

  it('value=sheet のとき sheet が selected', () => {
    render(<ViewToggle value="sheet" onChange={vi.fn()} />)
    expect(screen.getByTestId('view-toggle-sheet')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('view-toggle-card')).toHaveAttribute('aria-selected', 'false')
  })

  it('クリックで onChange が呼ばれる', async () => {
    const onChange = vi.fn()
    render(<ViewToggle value="sheet" onChange={onChange} />)
    await userEvent.click(screen.getByTestId('view-toggle-card'))
    expect(onChange).toHaveBeenCalledWith('card')
  })
})
