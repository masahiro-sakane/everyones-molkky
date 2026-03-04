import { NextRequest, NextResponse } from 'next/server'
import { recordThrow } from '@/services/scoreService'
import { matchEmitter } from '@/lib/eventEmitter'
import { ZodError } from 'zod'

type Params = { params: Promise<{ shareCode: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { shareCode } = await params
    const body = await request.json()
    const result = await recordThrow(shareCode, body)

    // SSE イベント発行
    const eventType = result.result.isWinner ? 'matchFinished' : 'scoreUpdated'
    matchEmitter.emit({
      type: eventType,
      shareCode,
      payload: {
        throwId: result.throw.id,
        teamId: result.throw.teamId,
        score: result.result.score,
        totalScore: result.result.totalScore,
        consecutiveMisses: result.result.consecutiveMisses,
        isDisqualified: result.result.isDisqualified,
        isWinner: result.result.isWinner,
        timestamp: Date.now(),
      },
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 })
    }
    if (error instanceof Error) {
      const clientErrors = ['試合が見つかりません', '試合は進行中ではありません', '進行中のセットがありません', '進行中のターンがありません']
      if (clientErrors.includes(error.message)) {
        return NextResponse.json({ success: false, error: error.message }, { status: 422 })
      }
    }
    console.error('POST /api/matches/[shareCode]/throws error:', error)
    return NextResponse.json({ success: false, error: '投擲の記録に失敗しました' }, { status: 500 })
  }
}
