const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.82

export async function compressImageToBase64(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob)
  const { width, height } = bitmap

  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const compressed = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY })
  return blobToBase64(compressed)
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // "data:image/jpeg;base64,..." の "," 以降だけ返す
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
