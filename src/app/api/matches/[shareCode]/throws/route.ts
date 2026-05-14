import { NextRequest, NextResponse } from 'next/server'
import { recordThrow } from '@/services/scoreService'
import { getMatchWithScores } from '@/services/matchService'
import { matchEmitter } from '@/lib/eventEmitter'
import { ZodError } from 'zod'

type Params = { params: Promise<{ shareCode: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { shareCode } = await params
    const body = await request.json()
    const clientId: string | undefined = body.clientId

    const result = await recordThrow(shareCode, body)

    // 最新の試合データを取得してレスポンスに含める（router.refresh()不要に）
    const freshMatch = await getMatchWithScores(shareCode)

    // SSE イベント発行（clientId を含めて投擲者自身がスキップできるようにする）
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
        ...(clientId ? { clientId } : {}),
      },
    })

    return NextResponse.json({ success: true, data: result, match: freshMatch }, { status: 201 })
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
