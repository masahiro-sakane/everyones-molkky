import { NextRequest, NextResponse } from 'next/server'
import { getUserById, deleteUser } from '@/services/userService'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const user = await getUserById(id)
    if (!user) {
      return NextResponse.json({ success: false, error: 'ユーザーが見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('GET /api/users/[id] error:', error)
    return NextResponse.json({ success: false, error: 'ユーザーの取得に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await deleteUser(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error)
    return NextResponse.json({ success: false, error: 'ユーザーの削除に失敗しました' }, { status: 500 })
  }
}
