export const runtime = 'edge'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function POST(request: Request) {
  try {
    const { secret, prompt, outline } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!prompt) {
      return Response.json({ error: 'Missing prompt' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY || ''

    // If we have an outline, instruct the model to follow it (faster, more focused generation)
    const fullPrompt = outline
      ? `${prompt}

Here is your outline. Follow this structure but write it as flowing prose, not bullet points. Do NOT include the outline headers verbatim if they sound like outline headers. Make them natural section titles:

${outline}

Write the article now. Markdown body only, no title. No IMAGE_PROMPT line.`
      : `${prompt}

After the article, on a new line, write exactly "IMAGE_PROMPT:" followed by a single line describing a photorealistic editorial image for this article. Describe a specific scene, setting, or visual concept. Be vivid and specific. Keep it under 30 words. No abstract concepts, no text in the image, no logos.`

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: outline ? 1000 : 1400,
        temperature: 1.0,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenRouter error:', err)
      return Response.json({ error: 'AI generation failed', details: err }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''

    // Split out the image prompt if present (only when no outline was provided)
    let articleBody = raw
    let imagePrompt = ''

    if (!outline) {
      const imagePromptIndex = raw.indexOf('IMAGE_PROMPT:')
      if (imagePromptIndex !== -1) {
        articleBody = raw.substring(0, imagePromptIndex).trim()
        imagePrompt = raw.substring(imagePromptIndex + 'IMAGE_PROMPT:'.length).trim()
        imagePrompt = imagePrompt.split('\n')[0].trim()
      }
    }

    if (!articleBody || articleBody.length < 100) {
      return Response.json({ error: 'Generated article too short' }, { status: 500 })
    }

    return Response.json({ articleBody, imagePrompt })
  } catch (error) {
    console.error('Error generating article:', error)
    return Response.json({ error: 'Failed to generate article' }, { status: 500 })
  }
}
