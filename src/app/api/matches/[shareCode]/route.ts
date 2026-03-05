import { NextRequest, NextResponse } from 'next/server'
import { getMatchByShareCode, deleteMatch } from '@/services/matchService'
import { db } from '@/lib/db'

type Params = { params: Promise<{ shareCode: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { shareCode } = await params
    const match = await getMatchByShareCode(shareCode)
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
    const match = await getMatchByShareCode(shareCode)
    if (!match) {
      return NextResponse.json({ success: false, error: '試合が見つかりません' }, { status: 404 })
    }
    const body = await request.json()
    const updated = await db.match.update({
      where: { id: match.id },
      data: {
        ...(body.startedAt !== undefined ? { startedAt: new Date(body.startedAt) } : {}),
      },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/matches/[shareCode] error:', error)
    return NextResponse.json({ success: false, error: '試合の更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { shareCode } = await params
    const match = await getMatchByShareCode(shareCode)
    if (!match) {
      return NextResponse.json({ success: false, error: '試合が見つかりません' }, { status: 404 })
    }
    await deleteMatch(match.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/matches/[shareCode] error:', error)
    return NextResponse.json({ success: false, error: '試合の削除に失敗しました' }, { status: 500 })
  }
}
