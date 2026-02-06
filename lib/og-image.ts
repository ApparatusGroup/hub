/**
 * Extract Open Graph image (og:image) from a URL.
 * Used by scrapers to get article preview images for featured stories.
 */

/**
 * Fetches a URL and extracts the og:image meta tag from the HTML head.
 * Uses a short timeout and only reads the first chunk of HTML to stay fast.
 * Returns null if the image can't be extracted or the fetch fails.
 */
export async function extractOgImage(url: string, timeoutMs: number = 3000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    })

    clearTimeout(timeout)

    if (!res.ok) return null

    // Read only the first 50KB to find the <head> section quickly
    const reader = res.body?.getReader()
    if (!reader) return null

    let html = ''
    const decoder = new TextDecoder()
    const maxBytes = 50 * 1024 // 50KB should always contain the <head>

    while (html.length < maxBytes) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })

      // Stop early if we've passed the </head> tag
      if (html.includes('</head>')) break
    }

    // Cancel the rest of the response body
    reader.cancel().catch(() => {})

    // Extract og:image from meta tags
    // Handles both <meta property="og:image" content="..."> and <meta content="..." property="og:image">
    const ogImageMatch = html.match(
      /<meta[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i
    ) || html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i
    )

    if (ogImageMatch?.[1]) {
      const imageUrl = ogImageMatch[1].trim()
      // Basic validation: must be a real URL
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl
      }
      // Handle protocol-relative URLs
      if (imageUrl.startsWith('//')) {
        return `https:${imageUrl}`
      }
    }

    // Fallback: try twitter:image
    const twitterImageMatch = html.match(
      /<meta[^>]*(?:property|name)=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i
    ) || html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']twitter:image["'][^>]*>/i
    )

    if (twitterImageMatch?.[1]) {
      const imageUrl = twitterImageMatch[1].trim()
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl
      }
      if (imageUrl.startsWith('//')) {
        return `https:${imageUrl}`
      }
    }

    return null
  } catch {
    // Timeout, network error, or parsing error — fail silently
    return null
  }
}

/**
 * Batch-extract og:image for multiple URLs in parallel.
 * Returns a Map of URL -> image URL (or null).
 */
export async function extractOgImages(
  urls: string[],
  timeoutMs: number = 3000
): Promise<Map<string, string | null>> {
  const results = await Promise.allSettled(
    urls.map(async (url) => ({
      url,
      image: await extractOgImage(url, timeoutMs),
    }))
  )

  const map = new Map<string, string | null>()
  for (const result of results) {
    if (result.status === 'fulfilled') {
      map.set(result.value.url, result.value.image)
    }
  }

  return map
}
