export const runtime = 'edge'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function POST(request: Request) {
  try {
    const { secret, reviewPrompt, articleBody } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!reviewPrompt || !articleBody) {
      // No review needed, return original
      return Response.json({ articleBody })
    }

    const apiKey = process.env.OPENROUTER_API_KEY || ''

    const fullPrompt = `${reviewPrompt}

Here is the article to review:

${articleBody}`

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 1200,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      // If review fails, return original article
      console.error('Review failed, using original article')
      return Response.json({ articleBody, reviewed: false })
    }

    const data = await response.json()
    const reviewed = data.choices?.[0]?.message?.content?.trim()

    // Only use reviewed version if it's substantial
    if (reviewed && reviewed.length > 200) {
      return Response.json({ articleBody: reviewed, reviewed: true })
    }

    return Response.json({ articleBody, reviewed: false })
  } catch (error) {
    console.error('Error reviewing article:', error)
    // Fail gracefully - return original
    return Response.json({ articleBody: request.body ? 'error' : '', reviewed: false })
  }
}
