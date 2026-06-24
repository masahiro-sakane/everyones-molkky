import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScoreInputPanel } from '@/components/match/ScoreInputPanel'

describe('ScoreInputPanel', () => {
  describe('レンダリング', () => {
    it('1〜12 のボタンが全て表示される', () => {
      render(<ScoreInputPanel isFirstThrow={false} onConfirm={vi.fn()} />)
      for (let n = 1; n <= 12; n++) {
        expect(screen.getByTestId(`score-${n}`)).toBeInTheDocument()
      }
    })

    it('複数本モードと1本モードの切替タブが表示される', () => {
      render(<ScoreInputPanel isFirstThrow={false} onConfirm={vi.fn()} />)
      expect(screen.getByTestId('mode-multi')).toBeInTheDocument()
      expect(screen.getByTestId('mode-single')).toBeInTheDocument()
    })

    it('ミスボタンと確定ボタンが表示される', () => {
      render(<ScoreInputPanel isFirstThrow={false} onConfirm={vi.fn()} />)
      expect(screen.getByTestId('miss-button')).toBeInTheDocument()
      expect(screen.getByTestId('confirm-throw')).toBeInTheDocument()
    })
  })

  describe('初期モード', () => {
    it('常に複数本モードがデフォルト選択される', () => {
      render(<ScoreInputPanel isFirstThrow={true} onConfirm={vi.fn()} />)
      expect(screen.getByTestId('mode-multi')).toHaveAttribute('aria-selected', 'true')
    })

    it('isFirstThrow=false でも複数本モードがデフォルト', () => {
      render(<ScoreInputPanel isFirstThrow={false} onConfirm={vi.fn()} />)
      expect(screen.getByTestId('mode-multi')).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('1本モード（番号入力）', () => {
    it('番号を選択すると aria-checked が true になる', async () => {
      render(<ScoreInputPanel isFirstThrow={false} onConfirm={vi.fn()} />)
      await userEvent.click(screen.getByTestId('mode-single'))
      await userEvent.click(screen.getByTestId('score-7'))
      expect(screen.getByTestId('score-7')).toHaveAttribute('aria-checked', 'true')
    })

    it('確定で skittlesKnocked=[番号] がコールバックされる', async () => {
      const onConfirm = vi.fn()
      render(<ScoreInputPanel isFirstThrow={false} onConfirm={onConfirm} />)
      await userEvent.click(screen.getByTestId('mode-single'))
      await userEvent.click(screen.getByTestId('score-9'))
      await userEvent.click(screen.getByTestId('confirm-throw'))
      expect(onConfirm).toHaveBeenCalledWith([9])
    })

    it('別の番号を選択すると選択が切り替わる', async () => {
      render(<ScoreInputPanel isFirstThrow={false} onConfirm={vi.fn()} />)
      await userEvent.click(screen.getByTestId('mode-single'))
      await userEvent.click(screen.getByTestId('score-3'))
      await userEvent.click(screen.getByTestId('score-8'))
      expect(screen.getByTestId('score-3')).toHaveAttribute('aria-checked', 'false')
      expect(screen.getByTestId('score-8')).toHaveAttribute('aria-checked', 'true')
    })

    it('同じ番号を再クリックすると選択解除される', async () => {
      render(<ScoreInputPanel isFirstThrow={false} onConfirm={vi.fn()} />)
      await userEvent.click(screen.getByTestId('mode-single'))
      await userEvent.click(screen.getByTestId('score-5'))
      await userEvent.click(screen.getByTestId('score-5'))
      expect(screen.getByTestId('score-5')).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('複数本モード（本数入力）', () => {
    it('確定で skittlesKnocked=[0,0,0] がコールバックされる', async () => {
      const onConfirm = vi.fn()
      render(<ScoreInputPanel isFirstThrow={true} onConfirm={onConfirm} />)
      await userEvent.click(screen.getByTestId('score-3'))
      await userEvent.click(screen.getByTestId('confirm-throw'))
      expect(onConfirm).toHaveBeenCalledWith([0, 0, 0])
    })

    it('5本を選択すると skittlesKnocked=[0,0,0,0,0] になる', async () => {
      const onConfirm = vi.fn()
      render(<ScoreInputPanel isFirstThrow={true} onConfirm={onConfirm} />)
      await userEvent.click(screen.getByTestId('score-5'))
      await userEvent.click(screen.getByTestId('confirm-throw'))
      expect(onConfirm).toHaveBeenCalledWith([0, 0, 0, 0, 0])
    })
  })

  describe('モード切替', () => {
    it('モードを切り替えても選択が維持される', async () => {
      render(<ScoreInputPanel isFirstThrow={false} onConfirm={vi.fn()} />)
      await userEvent.click(screen.getByTestId('mode-single'))
      await userEvent.click(screen.getByTestId('score-7'))
      await userEvent.click(screen.getByTestId('mode-multi'))
      expect(screen.getByTestId('score-7')).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('ミス', () => {
    it('onMiss が渡されている場合はミスボタンで onMiss のみ呼ばれる', async () => {
      const onConfirm = vi.fn()
      const onMiss = vi.fn()
      render(
        <ScoreInputPanel
          isFirstThrow={false}
          onConfirm={onConfirm}
          onMiss={onMiss}
        />
      )
      await userEvent.click(screen.getByTestId('miss-button'))
      // onMiss が渡されている場合は onMiss のみ呼ばれ、onConfirm は呼ばれない
      expect(onMiss).toHaveBeenCalledOnce()
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('onMiss が未渡しの場合はミスボタンで onConfirm([]) が呼ばれる', async () => {
      const onConfirm = vi.fn()
      render(<ScoreInputPanel isFirstThrow={false} onConfirm={onConfirm} />)
      await userEvent.click(screen.getByTestId('miss-button'))
      expect(onConfirm).toHaveBeenCalledWith([])
    })
  })

  describe('disabled / isLoading', () => {
    it('disabled で全ボタンが無効化される', () => {
      render(
        <ScoreInputPanel isFirstThrow={false} onConfirm={vi.fn()} disabled />
      )
      expect(screen.getByTestId('score-1')).toBeDisabled()
      expect(screen.getByTestId('miss-button')).toBeDisabled()
      expect(screen.getByTestId('confirm-throw')).toBeDisabled()
    })

    it('未選択時は確定ボタンが無効化される', () => {
      render(<ScoreInputPanel isFirstThrow={false} onConfirm={vi.fn()} />)
      expect(screen.getByTestId('confirm-throw')).toBeDisabled()
    })
  })
})
