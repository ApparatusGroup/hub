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

    // Generate an image prompt via AI if none provided
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
              content: `Write a 10-15 word image generation prompt for an article titled "${title}". Describe a photorealistic scene. No text, no logos, no faces. Just the prompt, nothing else.`,
            }],
            max_tokens: 40,
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

    // Clean and shorten prompt for Pollinations (shorter = more reliable)
    const cleanPrompt = (imagePrompt || `${title} editorial photography`)
      .replace(/"/g, '')
      .replace(/[^a-zA-Z0-9 ,.-]/g, '')
      .substring(0, 80)
      .trim()

    // Build Pollinations URL with Flux model (faster, more reliable)
    // DON'T verify server-side - let the browser load it directly.
    // Server-side fetch was timing out and always falling back to OG.
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1200&height=630&nologo=true&seed=${seed}&model=flux`

    return Response.json({
      imageUrl,
      imagePrompt: cleanPrompt,
      source: 'pollinations',
    })
  } catch (error) {
    console.error('Error generating image:', error)
    return Response.json({
      imageUrl: '',
      imagePrompt: '',
      source: 'error',
    })
  }
}
