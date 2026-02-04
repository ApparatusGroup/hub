/**
 * Test script to verify viral patterns are working end-to-end
 * Run with: node --loader ts-node/esm test-viral-flow.js
 * Or build first: npm run build && node test-viral-flow.js
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (same as lib/firebase-admin.ts)
if (!getApps().length) {
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey
      .replace(/\\\\n/g, '\\n')
      .replace(/\\n/g, '\n');

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    });
  } else {
    initializeApp();
  }
}

const db = getFirestore();

async function testViralPatternsFlow() {
  console.log('\n🔍 Testing Viral Patterns Flow...\n');

  try {
    // Step 1: Check if viral patterns exist in Firestore
    console.log('1️⃣  Checking Firestore for viral patterns...');
    const viralDoc = await db.collection('viralPatterns').doc('latest').get();

    if (!viralDoc.exists) {
      console.log('❌ No viral patterns found in Firestore');
      console.log('   → Click "Analyze Trending Topics" in admin panel first\n');
      return;
    }

    const data = viralDoc.data();
    console.log('✅ Found viral patterns in Firestore');
    console.log(`   → Updated: ${data.updatedAt?.toDate?.() || data.stats?.scraped_at}`);
    console.log(`   → Articles analyzed: ${data.stats?.total_articles || 0}`);

    // Step 2: Verify data structure
    console.log('\n2️⃣  Verifying data structure...');

    if (!data.patterns) {
      console.log('❌ Missing patterns object');
      return;
    }

    const { top_keywords, top_hashtags, top_phrases } = data.patterns;

    console.log(`✅ Data structure valid`);
    console.log(`   → Keywords: ${top_keywords?.length || 0}`);
    console.log(`   → Hashtags: ${top_hashtags?.length || 0}`);
    console.log(`   → Phrases: ${top_phrases?.length || 0}`);

    // Step 3: Show sample data
    console.log('\n3️⃣  Sample trending data:');

    if (top_keywords?.length > 0) {
      console.log('\n   📊 Top 10 Keywords:');
      top_keywords.slice(0, 10).forEach((k, i) => {
        console.log(`      ${i + 1}. ${k.word} (${k.count})`);
      });
    }

    if (top_hashtags?.length > 0) {
      console.log('\n   #️⃣  Top 10 Hashtags:');
      top_hashtags.slice(0, 10).forEach((h, i) => {
        console.log(`      ${i + 1}. #${h.tag} (${h.count})`);
      });
    }

    if (top_phrases?.length > 0) {
      console.log('\n   💬 Top 10 Phrases:');
      top_phrases.slice(0, 10).forEach((p, i) => {
        console.log(`      ${i + 1}. "${p.phrase}" (${p.count})`);
      });
    }

    // Step 4: Simulate what AI bots see
    console.log('\n4️⃣  Simulating AI bot context...\n');

    const getRandomItems = (arr, count) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    };

    const sampleKeywords = getRandomItems(top_keywords || [], 8).map(k => k.word);
    const samplePhrases = getRandomItems(top_phrases || [], 5).map(p => p.phrase);

    const viralContext = `
CURRENT TRENDING TOPICS (use these for inspiration - don't force them):
- Trending keywords: ${sampleKeywords.join(', ')}
- Viral phrases: ${samplePhrases.join(', ')}

Your post should feel natural and authentic. Only use trending topics if they genuinely fit your personality and interests. Don't force trends into your content.`;

    console.log('   📝 AI Bot would receive this context:');
    console.log(viralContext.split('\n').map(line => `   ${line}`).join('\n'));

    // Step 5: Check staleness
    console.log('\n5️⃣  Checking data freshness...');
    const updatedAt = data.updatedAt?.toDate?.() || new Date(data.stats?.scraped_at);
    const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate > 7) {
      console.log(`⚠️  Data is ${daysSinceUpdate.toFixed(1)} days old (considered stale)`);
      console.log('   → Re-run "Analyze Trending Topics" to refresh\n');
    } else {
      console.log(`✅ Data is fresh (${daysSinceUpdate.toFixed(1)} days old)\n`);
    }

    console.log('✅ All checks passed! Viral patterns are working correctly.\n');

  } catch (error) {
    console.error('\n❌ Error testing viral patterns:', error.message);
    console.error(error);
  }
}

testViralPatternsFlow();
