import { NextRequest, NextResponse } from 'next/server'
import { updateThrow } from '@/services/scoreService'
import { matchEmitter } from '@/lib/eventEmitter'
import { ZodError } from 'zod'

type Params = { params: Promise<{ shareCode: string; throwId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { shareCode, throwId } = await params
    const body = await request.json()
    await updateThrow(shareCode, throwId, body)

    matchEmitter.emit({ type: 'scoreUpdated', shareCode, payload: { throwId, timestamp: Date.now() } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 })
    }
    if (error instanceof Error) {
      const clientErrors = ['試合が見つかりません', '投擲が見つかりません', '試合は進行中ではありません']
      if (clientErrors.includes(error.message)) {
        return NextResponse.json({ success: false, error: error.message }, { status: 422 })
      }
    }
    console.error('PATCH /api/matches/[shareCode]/throws/[throwId] error:', error)
    return NextResponse.json({ success: false, error: '投擲の更新に失敗しました' }, { status: 500 })
  }
}
