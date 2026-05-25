import { NextRequest, NextResponse } from 'next/server'
import { getMatchWithScores, deleteMatch } from '@/services/matchService'
import { db } from '@/lib/db'
import { z, ZodError } from 'zod'

const patchSchema = z.object({
  startedAt: z.coerce.date().optional(),
}).strict()

type Params = { params: Promise<{ shareCode: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { shareCode } = await params
    const match = await getMatchWithScores(shareCode)
    if (!match) {
      return NextResponse.json({ success: false, error: '試合が見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: match })
  } catch (error) {
    console.error('GET /api/matches/[shareCode] error:', error)
    return NextResponse.json({ success: false, error: '試合の取得に失敗しました' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { shareCode } = await params
    const match = await getMatchWithScores(shareCode)
    if (!match) {
      return NextResponse.json({ success: false, error: '試合が見つかりません' }, { status: 404 })
    }
    const body = patchSchema.parse(await request.json())
    const updated = await db.match.update({
      where: { id: match.id },
      data: {
        ...(body.startedAt !== undefined ? { startedAt: body.startedAt } : {}),
      },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 })
    }
    console.error('PATCH /api/matches/[shareCode] error:', error)
    return NextResponse.json({ success: false, error: '試合の更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { shareCode } = await params
    const match = await getMatchWithScores(shareCode)
    if (!match) {
      return NextResponse.json({ success: false, error: '試合が見つかりません' }, { status: 404 })
    }
    // 進行中の試合は削除不可（終了済みまたは待機中のみ許可）
    if (match.status === 'IN_PROGRESS') {
      return NextResponse.json(
        { success: false, error: '進行中の試合は削除できません' },
        { status: 409 }
      )
    }
    await deleteMatch(match.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/matches/[shareCode] error:', error)
    return NextResponse.json({ success: false, error: '試合の削除に失敗しました' }, { status: 500 })
  }
}
