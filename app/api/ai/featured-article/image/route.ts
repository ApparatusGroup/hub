import { NextResponse } from 'next/server'
import { adminStorage } from '@/lib/firebase-admin'
import crypto from 'crypto'

// Image generation + upload needs more than the default 10s
export const maxDuration = 25

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

    const apiKey = process.env.OPENROUTER_API_KEY || ''
    const prompt = (providedPrompt || `${title} editorial photography`).substring(0, 200)

    // Generate image via OpenRouter (DALL-E 3)
    if (apiKey) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'openai/dall-e-3',
            prompt: `${prompt}. Photorealistic editorial photograph, no text, no logos, no watermarks.`,
            n: 1,
            size: '1792x1024',
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const imageData = data.data?.[0]

          // DALL-E 3 returns a URL
          if (imageData?.url) {
            const imgRes = await fetch(imageData.url)
            if (imgRes.ok) {
              const buffer = Buffer.from(await imgRes.arrayBuffer())
              if (buffer.length > 1000) {
                const imageUrl = await uploadToStorage(buffer)
                return NextResponse.json({ imageUrl, imagePrompt: prompt, source: 'openrouter-dalle3' })
              }
            }
          }

          // Or it might return base64
          if (imageData?.b64_json) {
            const buffer = Buffer.from(imageData.b64_json, 'base64')
            const imageUrl = await uploadToStorage(buffer)
            return NextResponse.json({ imageUrl, imagePrompt: prompt, source: 'openrouter-dalle3' })
          }
        } else {
          console.error('OpenRouter image gen error:', await response.text())
        }
      } catch (err) {
        console.error('OpenRouter image gen failed:', err)
      }
    }

    // Fallback: Pollinations (free, no key) — fetch and store permanently
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
        const buffer = Buffer.from(await imgRes.arrayBuffer())
        if (buffer.length > 1000) {
          const imageUrl = await uploadToStorage(buffer)
          return NextResponse.json({ imageUrl, imagePrompt: cleanPrompt, source: 'pollinations' })
        }
      }
    } catch (err) {
      console.error('Pollinations fetch timed out or failed:', err)
    }

    return NextResponse.json({ imageUrl: '', imagePrompt: prompt, source: 'none' })
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json({ imageUrl: '', imagePrompt: '', source: 'error' })
  }
}
