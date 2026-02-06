import { NextResponse } from 'next/server'
import { adminStorage } from '@/lib/firebase-admin'
import crypto from 'crypto'

// Image generation + upload needs more than the default 10s
export const maxDuration = 25

const TOGETHER_API_URL = 'https://api.together.xyz/v1/images/generations'

async function uploadToStorage(imageBuffer: Buffer): Promise<string> {
  const token = crypto.randomUUID()
  const filename = `article-images/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.png`
  const bucket = adminStorage.bucket()
  const file = bucket.file(filename)

  await file.save(imageBuffer, {
    metadata: {
      contentType: 'image/png',
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  })

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`
}

export async function POST(request: Request) {
  try {
    const { secret, title, category, imagePrompt: providedPrompt } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prompt = (providedPrompt || `${title} editorial photography`).substring(0, 200)

    // Option 1: Together AI FLUX (if key is set)
    const togetherKey = process.env.TOGETHER_API_KEY || ''
    if (togetherKey) {
      try {
        const response = await fetch(TOGETHER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${togetherKey}`,
          },
          body: JSON.stringify({
            model: 'black-forest-labs/FLUX.1-schnell',
            prompt: `${prompt}, editorial photography, high quality, 4k`,
            width: 1200,
            height: 630,
            steps: 4,
            n: 1,
            response_format: 'b64_json',
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const b64 = data.data?.[0]?.b64_json
          if (b64) {
            const buffer = Buffer.from(b64, 'base64')
            const imageUrl = await uploadToStorage(buffer)
            return NextResponse.json({ imageUrl, imagePrompt: prompt, source: 'together-flux' })
          }
        } else {
          console.error('Together AI error:', await response.text())
        }
      } catch (err) {
        console.error('Together AI failed:', err)
      }
    }

    // Option 2: Pollinations — fetch the actual image and upload to Firebase Storage
    const seed = Math.floor(Math.random() * 100000)
    const cleanPrompt = prompt
      .replace(/"/g, '')
      .replace(/[^a-zA-Z0-9 ,.-]/g, '')
      .substring(0, 80)
      .trim()

    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=536&nologo=true&seed=${seed}&model=flux`

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20000)
      const imgRes = await fetch(pollinationsUrl, { signal: controller.signal })
      clearTimeout(timeout)

      if (imgRes.ok) {
        const arrayBuf = await imgRes.arrayBuffer()
        const buffer = Buffer.from(arrayBuf)

        if (buffer.length > 1000) {
          const imageUrl = await uploadToStorage(buffer)
          return NextResponse.json({ imageUrl, imagePrompt: cleanPrompt, source: 'pollinations' })
        }
      }
    } catch (err) {
      console.error('Pollinations fetch timed out or failed:', err)
    }

    // Nothing worked — return empty
    return NextResponse.json({ imageUrl: '', imagePrompt: prompt, source: 'none' })
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json({ imageUrl: '', imagePrompt: '', source: 'error' })
  }
}
