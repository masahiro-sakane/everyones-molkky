import Anthropic from '@anthropic-ai/sdk'
import type { PinAnalysisResult } from '@/types/vision'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `あなたはモルックの試合アシスタントです。
ユーザーが送信する画像はモルックのフィールドを撮影したものです。
フィールドには1〜12の番号が書かれた木製のスキットル（ピン）が立っているか倒れています。
画像を解析し、立っているスキットルの番号と倒れているスキットルの番号をJSONで返してください。`

const USER_PROMPT = `この画像のモルックフィールドを解析してください。
立っているスキットル（ピン）の番号と、倒れているスキットルの番号を特定してください。
番号が見えないスキットルは除外してください。

必ず以下のJSON形式のみで返答してください：
{
  "standingPins": [番号の配列],
  "fallenPins": [番号の配列],
  "confidence": 0〜1の数値（認識の確信度）
}`

export async function analyzePins(imageBase64: string): Promise<PinAnalysisResult> {
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          { type: 'text', text: USER_PROMPT },
        ],
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSONが見つかりません')
    const parsed = JSON.parse(jsonMatch[0])
    return {
      standingPins: (parsed.standingPins ?? []).filter((n: unknown) => typeof n === 'number' && n >= 1 && n <= 12),
      fallenPins: (parsed.fallenPins ?? []).filter((n: unknown) => typeof n === 'number' && n >= 1 && n <= 12),
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      rawResponse: raw,
    }
  } catch {
    return { standingPins: [], fallenPins: [], confidence: 0, rawResponse: raw }
  }
}
