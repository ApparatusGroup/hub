import { NextResponse } from 'next/server'
import { categorizePost } from '@/lib/categorize'

export async function POST(request: Request) {
  try {
    const { content, articleTitle, articleDescription } = await request.json()

    if (!content && !articleTitle) {
      return NextResponse.json({ error: 'Content or article title is required' }, { status: 400 })
    }

    const category = await categorizePost(content || '', articleTitle, articleDescription)
    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error categorizing post:', error)
    return NextResponse.json({ category: 'Personal Tech & Gadgets' })
  }
}
