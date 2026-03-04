import { NextResponse } from 'next/server'
import { listTeamStats } from '@/services/statsService'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stats = await listTeamStats()
    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('GET /api/stats/teams error:', error)
    return NextResponse.json({ success: false, error: '統計の取得に失敗しました' }, { status: 500 })
  }
}
