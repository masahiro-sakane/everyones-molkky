import { NextRequest, NextResponse } from 'next/server'
import { startNextSet } from '@/services/matchService'
import { matchEmitter } from '@/lib/eventEmitter'

type Params = { params: Promise<{ shareCode: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { shareCode } = await params
    await startNextSet(shareCode)

    matchEmitter.emit({ type: 'scoreUpdated', shareCode, payload: { timestamp: Date.now() } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      const clientErrors = [
        '試合が見つかりません',
        '現在のゲームがまだ完了していません',
        '全ゲームが完了しています',
      ]
      if (clientErrors.includes(error.message)) {
        return NextResponse.json({ success: false, error: error.message }, { status: 422 })
      }
    }
    console.error('POST /api/matches/[shareCode]/next-set error:', error)
    return NextResponse.json({ success: false, error: '次のゲームの開始に失敗しました' }, { status: 500 })
  }
}
