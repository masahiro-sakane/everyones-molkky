import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatus } from '../ConnectionStatus'

describe('ConnectionStatus', () => {
  it('connecting ステータスで aria-label が付く', () => {
    render(<ConnectionStatus status="connecting" />)
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-label', '接続中...')
  })

  it('connected ステータスで aria-label が付く', () => {
    render(<ConnectionStatus status="connected" />)
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-label', 'リアルタイム同期中')
  })

  it('reconnecting ステータスで aria-label が付く', () => {
    render(<ConnectionStatus status="reconnecting" />)
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-label', '再接続中...')
  })

  it('disconnected ステータスで aria-label が付く', () => {
    render(<ConnectionStatus status="disconnected" />)
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-label', '切断中（5秒ごとに更新）')
  })

  it('role="status" と aria-live="polite" が付く', () => {
    render(<ConnectionStatus status="connected" />)
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-live', 'polite')
  })
})
