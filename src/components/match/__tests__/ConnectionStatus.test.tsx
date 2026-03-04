import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatus } from '../ConnectionStatus'

describe('ConnectionStatus', () => {
  it('connecting ステータスを表示する', () => {
    render(<ConnectionStatus status="connecting" />)
    expect(screen.getByText('接続中...')).toBeInTheDocument()
  })

  it('connected ステータスを表示する', () => {
    render(<ConnectionStatus status="connected" />)
    expect(screen.getByText('リアルタイム同期中')).toBeInTheDocument()
  })

  it('reconnecting ステータスを表示する', () => {
    render(<ConnectionStatus status="reconnecting" />)
    expect(screen.getByText('再接続中...')).toBeInTheDocument()
  })

  it('disconnected ステータスを表示する', () => {
    render(<ConnectionStatus status="disconnected" />)
    expect(screen.getByText('切断中（5秒ごとに更新）')).toBeInTheDocument()
  })

  it('role="status" と aria-live="polite" が付く', () => {
    render(<ConnectionStatus status="connected" />)
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-live', 'polite')
  })
})
