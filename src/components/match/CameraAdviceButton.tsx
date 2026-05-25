'use client'

import { useState } from 'react'
import { CameraCaptureDialog } from './CameraCaptureDialog'
import type { AdviceContext } from '@/types/vision'

type CameraAdviceButtonProps = {
  ctx: AdviceContext
  onOpenChange?: (open: boolean) => void
}

export function CameraAdviceButton({ ctx, onOpenChange }: CameraAdviceButtonProps) {
  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    setOpen(true)
    onOpenChange?.(true)
  }

  const handleClose = () => {
    setOpen(false)
    onOpenChange?.(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-0/20 text-neutral-0 text-xs font-semibold hover:bg-neutral-0/30 transition-colors"
        aria-label="カメラでAI投擲アドバイスを取得"
        title="AIアドバイス"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
        </svg>
        AI
      </button>

      {open && (
        <CameraCaptureDialog ctx={ctx} onClose={handleClose} />
      )}
    </>
  )
}
