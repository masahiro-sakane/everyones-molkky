import { NextRequest, NextResponse } from 'next/server'
import { createTeam, listTeams } from '@/services/teamService'
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
    const body = await request.json()
    const team = await createTeam(body)
    return NextResponse.json({ success: true, data: team }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 })
    }
    console.error('POST /api/teams error:', error)
    return NextResponse.json({ success: false, error: 'チームの作成に失敗しました' }, { status: 500 })
  }
}
