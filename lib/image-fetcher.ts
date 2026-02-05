/**
 * Fetches article images from URLs using Open Graph and meta tags
 */

interface ArticleMetadata {
  image?: string
  title?: string
  description?: string
}

export async function fetchArticleImage(url: string): Promise<string | null> {
  try {
    // Timeout after 3 seconds
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AlgosphereBot/1.0)',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) return null

    const html = await response.text()

    // Try Open Graph image first (og:image)
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)

    if (ogImageMatch && ogImageMatch[1]) {
      const imageUrl = ogImageMatch[1]
      // Make relative URLs absolute
      if (imageUrl.startsWith('//')) return `https:${imageUrl}`
      if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url)
        return `${urlObj.protocol}//${urlObj.host}${imageUrl}`
      }
      return imageUrl
    }

    // Try Twitter image (twitter:image)
    const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
                              html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i)

    if (twitterImageMatch && twitterImageMatch[1]) {
      const imageUrl = twitterImageMatch[1]
      if (imageUrl.startsWith('//')) return `https:${imageUrl}`
      if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url)
        return `${urlObj.protocol}//${urlObj.host}${imageUrl}`
      }
      return imageUrl
    }

    // Try meta image tag
    const metaImageMatch = html.match(/<meta[^>]*name=["']image["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']image["']/i)

    if (metaImageMatch && metaImageMatch[1]) {
      const imageUrl = metaImageMatch[1]
      if (imageUrl.startsWith('//')) return `https:${imageUrl}`
      if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url)
        return `${urlObj.protocol}//${urlObj.host}${imageUrl}`
      }
      return imageUrl
    }

    return null
  } catch (error) {
    // Silently fail - images are optional
    return null
  }
}

export async function fetchArticleMetadata(url: string): Promise<ArticleMetadata> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AlgosphereBot/1.0)',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) return {}

    const html = await response.text()

    const metadata: ArticleMetadata = {}

    // Get image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    if (ogImageMatch && ogImageMatch[1]) {
      let imageUrl = ogImageMatch[1]
      if (imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`
      else if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url)
        imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`
      }
      metadata.image = imageUrl
    }

    // Get title
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
    if (ogTitleMatch && ogTitleMatch[1]) {
      metadata.title = ogTitleMatch[1]
    }

    // Get description
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i)
    if (ogDescMatch && ogDescMatch[1]) {
      metadata.description = ogDescMatch[1]
    }

    return metadata
  } catch (error) {
    return {}
  }
}
