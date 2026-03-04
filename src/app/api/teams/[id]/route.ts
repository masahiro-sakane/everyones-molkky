import { NextRequest, NextResponse } from 'next/server'
import { getTeamById, updateTeam, deleteTeam } from '@/services/teamService'
import { ZodError } from 'zod'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const team = await getTeamById(id)
    if (!team) {
      return NextResponse.json({ success: false, error: 'チームが見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: team })
  } catch (error) {
    console.error('GET /api/teams/[id] error:', error)
    return NextResponse.json({ success: false, error: 'チームの取得に失敗しました' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const team = await updateTeam(id, body)
    return NextResponse.json({ success: true, data: team })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 })
    }
    console.error('PUT /api/teams/[id] error:', error)
    return NextResponse.json({ success: false, error: 'チームの更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await deleteTeam(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/teams/[id] error:', error)
    return NextResponse.json({ success: false, error: 'チームの削除に失敗しました' }, { status: 500 })
  }
}
