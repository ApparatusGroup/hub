export const runtime = 'edge'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function POST(request: Request) {
  try {
    const { secret, prompt } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!prompt) {
      return Response.json({ error: 'Missing prompt' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY || ''

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 1.0,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenRouter error:', err)
      return Response.json({ error: 'AI generation failed', details: err }, { status: 500 })
    }

    const data = await response.json()
    const articleBody = data.choices?.[0]?.message?.content?.trim()

    if (!articleBody || articleBody.length < 100) {
      return Response.json({ error: 'Generated article too short' }, { status: 500 })
    }

    return Response.json({ articleBody })
  } catch (error) {
    console.error('Error generating article:', error)
    return Response.json({ error: 'Failed to generate article' }, { status: 500 })
  }
}
