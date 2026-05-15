import { NextRequest, NextResponse } from 'next/server'
import { createMatch, listMatches } from '@/services/matchService'
import { auth } from '@/auth'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const matches = await listMatches()
    return NextResponse.json({ success: true, data: matches })
  } catch (error) {
    console.error('GET /api/matches error:', error)
    return NextResponse.json({ success: false, error: '試合一覧の取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
    }
    const body = await request.json()
    const match = await createMatch(body, session.user.id)
    return NextResponse.json({ success: true, data: match }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 })
    }
    console.error('POST /api/matches error:', error)
    return NextResponse.json({ success: false, error: '試合の作成に失敗しました' }, { status: 500 })
  }
}
