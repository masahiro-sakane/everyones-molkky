import { NextRequest, NextResponse } from 'next/server'
import { getTeamStats } from '@/services/statsService'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const stats = await getTeamStats(id)
    if (!stats) {
      return NextResponse.json({ success: false, error: 'チームが見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('GET /api/stats/teams/[id] error:', error)
    return NextResponse.json({ success: false, error: '統計の取得に失敗しました' }, { status: 500 })
  }
}
