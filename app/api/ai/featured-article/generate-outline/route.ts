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

    const outlinePrompt = `You are planning an opinion piece. Read the full writing assignment below, then produce ONLY:

1. An outline with exactly 2-3 section headers (## format) and 2-3 bullet points of key arguments/angles for each section.
2. On a final line, write IMAGE_PROMPT: followed by a vivid 15-25 word description of a photorealistic editorial photo for this article. No text, no logos, no faces. Describe light, texture, setting.

WRITING ASSIGNMENT:
${prompt}

Return ONLY the outline and IMAGE_PROMPT line. No commentary.`

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [{ role: 'user', content: outlinePrompt }],
        max_tokens: 400,
        temperature: 0.9,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenRouter outline error:', err)
      return Response.json({ error: 'Outline generation failed', details: err }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''

    // Split out outline and image prompt
    let outline = raw
    let imagePrompt = ''

    const imagePromptIndex = raw.indexOf('IMAGE_PROMPT:')
    if (imagePromptIndex !== -1) {
      outline = raw.substring(0, imagePromptIndex).trim()
      imagePrompt = raw.substring(imagePromptIndex + 'IMAGE_PROMPT:'.length).trim()
      imagePrompt = imagePrompt.split('\n')[0].trim()
    }

    return Response.json({ outline, imagePrompt })
  } catch (error) {
    console.error('Error generating outline:', error)
    return Response.json({ error: 'Failed to generate outline' }, { status: 500 })
  }
}
