import { NextRequest, NextResponse } from 'next/server'
import { createUser, listUsers } from '@/services/userService'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const users = await listUsers()
    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ success: false, error: 'ユーザー一覧の取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = await createUser(body)
    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 })
    }
    console.error('POST /api/users error:', error)
    return NextResponse.json({ success: false, error: 'ユーザーの作成に失敗しました' }, { status: 500 })
  }
}
