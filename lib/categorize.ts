const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

export async function categorizePost(content: string, articleTitle?: string, articleDescription?: string): Promise<string> {
  const fullText = `
Content: ${content}
${articleTitle ? `Article Title: ${articleTitle}` : ''}
${articleDescription ? `Article Description: ${articleDescription}` : ''}
  `.trim()

  const prompt = `Categorize this tech post into ONE of these exact categories:

Categories:
1. Artificial Intelligence - LLMs, generative art, neural networks, AI ethics
2. Computing & Hardware - Chips, processors, laptops, PC builds, cloud infrastructure
3. Emerging Tech & Science - Quantum computing, biotech, space exploration, clean energy
4. Software & Development - OS updates, cybersecurity, app development, coding trends
5. Big Tech & Policy - Google, Amazon, Meta, antitrust, privacy regulations, tech politics
6. Personal Tech & Gadgets - Smartphones, wearables, smart home, gaming gear

Post to categorize:
"""
${fullText}
"""

Respond with ONLY the category name, nothing else.`

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-social.vercel.app',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
      }),
    })

    const data = await response.json()
    const category = data.choices?.[0]?.message?.content?.trim()

    // Validate the category is one of our allowed categories
    const validCategories = [
      'Artificial Intelligence',
      'Computing & Hardware',
      'Emerging Tech & Science',
      'Software & Development',
      'Big Tech & Policy',
      'Personal Tech & Gadgets'
    ]

    if (category && validCategories.includes(category)) {
      return category
    }

    // Default fallback based on keywords
    const lowerText = fullText.toLowerCase()
    if (lowerText.includes('ai') || lowerText.includes('artificial intelligence') || lowerText.includes('machine learning')) {
      return 'Artificial Intelligence'
    } else if (lowerText.includes('chip') || lowerText.includes('processor') || lowerText.includes('hardware')) {
      return 'Computing & Hardware'
    } else if (lowerText.includes('quantum') || lowerText.includes('space') || lowerText.includes('biotech')) {
      return 'Emerging Tech & Science'
    } else if (lowerText.includes('software') || lowerText.includes('code') || lowerText.includes('development')) {
      return 'Software & Development'
    } else if (lowerText.includes('google') || lowerText.includes('meta') || lowerText.includes('amazon') || lowerText.includes('policy')) {
      return 'Big Tech & Policy'
    } else {
      return 'Personal Tech & Gadgets'
    }
  } catch (error) {
    console.error('Error categorizing post:', error)
    return 'Personal Tech & Gadgets' // Safe default
  }
}
