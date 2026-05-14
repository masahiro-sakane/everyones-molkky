import { NextRequest, NextResponse } from 'next/server'
import { addTeamMember, removeTeamMember } from '@/services/teamService'
import { z, ZodError } from 'zod'

const deleteMemberSchema = z.object({ userId: z.string().min(1) }).strict()

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
    const { userId } = deleteMemberSchema.parse(await request.json())
    await removeTeamMember(teamId, userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 })
    }
    console.error('DELETE /api/teams/[id]/members error:', error)
    return NextResponse.json({ success: false, error: 'メンバーの削除に失敗しました' }, { status: 500 })
  }
}
