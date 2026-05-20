import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { analyzePins } from '@/services/visionService'
import { checkRateLimit } from '@/lib/rateLimit'

const MAX_BASE64_BYTES = 5 * 1024 * 1024 // 5MB

const schema = z.object({
  imageBase64: z.string().min(100),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const allowed = checkRateLimit(`vision:${session.user.id}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'リクエストが多すぎます。1分後にお試しください' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が正しくありません' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '画像データが不正です' }, { status: 400 })
  }

  const { imageBase64 } = parsed.data
  if (imageBase64.length > MAX_BASE64_BYTES * 1.4) {
    return NextResponse.json({ error: '画像サイズが大きすぎます（5MB以下）' }, { status: 400 })
  }

  try {
    const result = await analyzePins(imageBase64)
    return NextResponse.json({ data: result })
  } catch {
    return NextResponse.json({ error: '画像解析に失敗しました' }, { status: 500 })
  }
}
