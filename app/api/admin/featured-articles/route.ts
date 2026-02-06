import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const AI_BOT_SECRET = process.env.AI_BOT_SECRET

function verifySecret(secret: string): boolean {
  return !!AI_BOT_SECRET && secret === AI_BOT_SECRET
}

// GET - List all featured articles (or download as JSON)
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || !verifySecret(secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const snapshot = await adminDb
      .collection('featuredArticles')
      .orderBy('createdAt', 'desc')
      .get()

    const articles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    // If download param is set, return as downloadable JSON file
    const download = req.nextUrl.searchParams.get('download')
    if (download === 'true') {
      return new NextResponse(JSON.stringify(articles, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="featured-articles-${new Date().toISOString().split('T')[0]}.json"`,
        },
      })
    }

    return NextResponse.json({ articles })
  } catch (error: any) {
    console.error('Error listing featured articles:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new featured article
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret, title, description, articleUrl, imageUrl, category } = body

    if (!secret || !verifySecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const article = {
      title,
      description: description || '',
      articleUrl: articleUrl || null,
      imageUrl: imageUrl || null,
      category: category || 'Personal Tech & Gadgets',
      pinned: true,
      createdAt: Date.now(),
    }

    const docRef = await adminDb.collection('featuredArticles').add(article)

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: `Featured article "${title}" created`,
    })
  } catch (error: any) {
    console.error('Error creating featured article:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove a featured article
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret, id } = body

    if (!secret || !verifySecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 })
    }

    await adminDb.collection('featuredArticles').doc(id).delete()

    return NextResponse.json({
      success: true,
      message: `Featured article ${id} deleted`,
    })
  } catch (error: any) {
    console.error('Error deleting featured article:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
