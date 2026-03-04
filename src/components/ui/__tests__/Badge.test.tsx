import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'

describe('Badge', () => {
  it('テキストが表示される', () => {
    render(<Badge>進行中</Badge>)
    expect(screen.getByText('進行中')).toBeInTheDocument()
  })

  it('variant=successで成功色が付く', () => {
    render(<Badge variant="success">成功</Badge>)
    expect(screen.getByText('成功').className).toContain('bg-success-100')
  })

  it('variant=dangerで危険色が付く', () => {
    render(<Badge variant="danger">失格</Badge>)
    expect(screen.getByText('失格').className).toContain('bg-danger-100')
  })

  it('variant=warningで警告色が付く', () => {
    render(<Badge variant="warning">注意</Badge>)
    expect(screen.getByText('注意').className).toContain('bg-warning-50')
  })
})
