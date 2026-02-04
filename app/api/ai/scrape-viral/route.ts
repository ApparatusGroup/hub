import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    // Verify request has the secret key
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Path to Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'scrape_viral_content.py')

    // Check if Python and snscrape are available
    try {
      await execAsync('python3 --version')
    } catch (error) {
      return NextResponse.json({
        error: 'Python3 not found. Please install Python 3.x'
      }, { status: 500 })
    }

    // Check if snscrape is installed
    try {
      await execAsync('python3 -c "import snscrape"')
    } catch (error) {
      return NextResponse.json({
        error: 'snscrape not installed. Run: pip install snscrape',
        install_command: 'pip install snscrape==0.7.0.20230622'
      }, { status: 500 })
    }

    // Run the Python scraper
    console.log('Running viral content scraper...')
    const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`, {
      timeout: 120000, // 2 minute timeout
    })

    if (stderr) {
      console.error('Scraper stderr:', stderr)
    }

    // Parse the JSON output from Python script
    const results = JSON.parse(stdout)

    if (!results.success) {
      return NextResponse.json({
        error: 'Scraping failed',
        details: results.error
      }, { status: 500 })
    }

    // Store results in Firestore
    const viralPatternsRef = adminDb.collection('viralPatterns').doc('latest')
    await viralPatternsRef.set({
      ...results,
      updatedAt: new Date(),
    })

    console.log(`Scraped ${results.stats.total_tweets} viral tweets`)

    return NextResponse.json({
      success: true,
      stats: results.stats,
      patterns: {
        keywords_count: results.patterns.top_keywords.length,
        hashtags_count: results.patterns.top_hashtags.length,
        phrases_count: results.patterns.top_phrases.length,
      },
      message: 'Viral patterns updated successfully'
    })

  } catch (error: any) {
    console.error('Error scraping viral content:', error)
    return NextResponse.json(
      {
        error: 'Failed to scrape viral content',
        details: error.message
      },
      { status: 500 }
    )
  }
}
