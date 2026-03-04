import { NextResponse } from 'next/server'
import { listUserStats } from '@/services/statsService'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stats = await listUserStats()
    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('GET /api/stats/users error:', error)
    return NextResponse.json({ success: false, error: '統計の取得に失敗しました' }, { status: 500 })
  }
}
