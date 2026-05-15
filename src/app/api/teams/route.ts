import { NextRequest, NextResponse } from 'next/server'
import { createTeam, listTeams } from '@/services/teamService'
import { auth } from '@/auth'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const teams = await listTeams()
    return NextResponse.json({ success: true, data: teams })
  } catch (error) {
    console.error('GET /api/teams error:', error)
    return NextResponse.json({ success: false, error: 'チーム一覧の取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
    }
    const body = await request.json()
    const team = await createTeam(body, session.user.id)
    return NextResponse.json({ success: true, data: team }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 })
    }
    console.error('POST /api/teams error:', error)
    return NextResponse.json({ success: false, error: 'チームの作成に失敗しました' }, { status: 500 })
  }
}
