import { NextRequest, NextResponse } from 'next/server'
import { addTeamMember, removeTeamMember } from '@/services/teamService'
import { ZodError } from 'zod'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: teamId } = await params
    const body = await request.json()
    const member = await addTeamMember(teamId, body)
    return NextResponse.json({ success: true, data: member }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 })
    }
    console.error('POST /api/teams/[id]/members error:', error)
    return NextResponse.json({ success: false, error: 'メンバーの追加に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id: teamId } = await params
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userIdは必須です' }, { status: 400 })
    }
    await removeTeamMember(teamId, userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/teams/[id]/members error:', error)
    return NextResponse.json({ success: false, error: 'メンバーの削除に失敗しました' }, { status: 500 })
  }
}
