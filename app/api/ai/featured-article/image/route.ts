export const runtime = 'edge'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function POST(request: Request) {
  try {
    const { secret, title, category, imagePrompt: providedPrompt } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY || ''
    const seed = Math.floor(Math.random() * 100000)

    // Step 1: If no image prompt was provided, generate one via AI
    let imagePrompt = providedPrompt || ''

    if (!imagePrompt || imagePrompt.length < 10) {
      try {
        const res = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'anthropic/claude-sonnet-4',
            messages: [{
              role: 'user',
              content: `Generate a short image prompt (under 20 words) for a photorealistic editorial cover image for an article titled: "${title}" (category: ${category}). Describe a specific visual scene with lighting and mood. No text, no logos, no people's faces. Just the prompt, nothing else.`,
            }],
            max_tokens: 60,
            temperature: 0.9,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          imagePrompt = data.choices?.[0]?.message?.content?.trim() || ''
        }
      } catch {
        // Fall through to title-based prompt
      }
    }

    // Step 2: Clean up the prompt for Pollinations
    // Keep it short and simple - long prompts cause failures
    const cleanPrompt = (imagePrompt || title)
      .replace(/[^a-zA-Z0-9 ,.-]/g, '')
      .substring(0, 120)
      .trim()

    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1200&height=630&nologo=true&seed=${seed}`

    // Step 3: Actually fetch the image to verify it generates
    let imageUrl = ''
    try {
      const imgRes = await fetch(pollinationsUrl, {
        signal: AbortSignal.timeout(18000), // 18s timeout (Edge has 25s)
      })

      if (imgRes.ok) {
        const contentType = imgRes.headers.get('content-type') || ''
        if (contentType.includes('image')) {
          // Image generated successfully - use the URL
          imageUrl = pollinationsUrl
        }
      }
    } catch {
      // Pollinations failed/timed out
    }

    // Step 4: If Pollinations failed, use OG fallback
    if (!imageUrl) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-gray-six.vercel.app'
      imageUrl = `${baseUrl}/api/og?${new URLSearchParams({
        title: title || 'Algosphere',
        ...(category && { category }),
      }).toString()}`
    }

    return Response.json({
      imageUrl,
      imagePrompt: cleanPrompt,
      source: imageUrl.includes('pollinations') ? 'pollinations' : 'og-fallback',
    })
  } catch (error) {
    console.error('Error generating image:', error)
    // Always return something
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-gray-six.vercel.app'
    return Response.json({
      imageUrl: `${baseUrl}/api/og?title=Algosphere`,
      imagePrompt: '',
      source: 'error-fallback',
    })
  }
}
