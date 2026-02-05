import { NextResponse } from 'next/server'
import { getTopNews } from '@/lib/news-service'

export async function POST(request: Request) {
  try {
    // Verify request has the secret key
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test fetching news
    const news = await getTopNews()

    if (!news || news.length === 0) {
      return NextResponse.json({
        error: 'No news articles found',
        details: 'NewsAPI returned no results. Check API key and query parameters.',
        count: 0
      }, { status: 404 })
    }

    // Return sample articles
    const sample = news.slice(0, 5).map(article => ({
      title: article.title,
      description: article.description,
      source: article.source.name,
      hasImage: !!article.urlToImage
    }))

    return NextResponse.json({
      success: true,
      count: news.length,
      sample,
      message: `Successfully fetched ${news.length} news articles`
    })
  } catch (error: any) {
    console.error('Error testing news:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch news',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
