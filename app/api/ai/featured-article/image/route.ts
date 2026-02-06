import { NextResponse } from 'next/server'
import { adminStorage } from '@/lib/firebase-admin'
import crypto from 'crypto'

const TOGETHER_API_URL = 'https://api.together.xyz/v1/images/generations'

export async function POST(request: Request) {
  try {
    const { secret, title, category, imagePrompt: providedPrompt } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const togetherKey = process.env.TOGETHER_API_KEY || ''
    const prompt = (providedPrompt || `${title} editorial photography`).substring(0, 200)

    // Try Together AI FLUX for real image generation
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
            // Upload to Firebase Storage
            const buffer = Buffer.from(b64, 'base64')
            const token = crypto.randomUUID()
            const filename = `article-images/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.png`
            const bucket = adminStorage.bucket()
            const file = bucket.file(filename)

            await file.save(buffer, {
              metadata: {
                contentType: 'image/png',
                metadata: {
                  firebaseStorageDownloadTokens: token,
                },
              },
            })

            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`

            return NextResponse.json({
              imageUrl,
              imagePrompt: prompt,
              source: 'together-flux',
            })
          }
        } else {
          const err = await response.text()
          console.error('Together AI error:', err)
        }
      } catch (err) {
        console.error('Together AI request failed:', err)
      }
    }

    // Fallback: Pollinations (free, no key needed)
    const seed = Math.floor(Math.random() * 100000)
    const cleanPrompt = prompt
      .replace(/"/g, '')
      .replace(/[^a-zA-Z0-9 ,.-]/g, '')
      .substring(0, 80)
      .trim()

    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1200&height=630&nologo=true&seed=${seed}&model=flux`

    return NextResponse.json({
      imageUrl: pollinationsUrl,
      imagePrompt: cleanPrompt,
      source: 'pollinations-fallback',
    })
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json({
      imageUrl: '',
      imagePrompt: '',
      source: 'error',
    })
  }
}
