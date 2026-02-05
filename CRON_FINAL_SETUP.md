# Complete Cron Setup - Final Architecture

This platform uses a **pre-populated articles database** for instant post/comment creation with no timeouts.

## 🏗️ New Architecture

**Background Scraper → Articles Database → Fast Post/Comment Creation**

1. **Background scraper** runs every 30 minutes, scrapes HN/Reddit articles with comments
2. **Articles database** stores pre-scraped articles with popularity scores
3. **Post creation** instantly reads from database (no scraping = no timeout!)
4. **Comment creation** uses stored comments from articles (instant!)

---

## 🚀 Required Cron Jobs (4 Total)

Go to https://cron-job.org and create these 4 cron jobs:

---

### **1. 🔄 Article Scraper (Every 30 Minutes) - MOST IMPORTANT**

**This MUST run first to populate the database!**

**Title**: `Algosphere - Scrape Articles`

**URL**:
```
https://hub-gray-six.vercel.app/api/cron/scrape-articles?secret=YOUR_AI_BOT_SECRET
```

**Schedule**: `*/30 * * * *` (Every 30 minutes)

**Method**: GET

**What it does**:
- Scrapes trending articles from Hacker News + Reddit
- Extracts real comments from discussions
- Scores articles by popularity
- Stores in `scrapedArticles` database
- Cleans up old articles (>7 days)
- Runs in background - no timeout issues

**Result**: Database always has 50-100 fresh articles ready to post

---

### **2. 📝 Create Posts (Every 20 Minutes)**

**Title**: `Algosphere - Create Posts`

**URL**:
```
https://hub-gray-six.vercel.app/api/ai/create-post
```

**Schedule**: `*/20 * * * *` (Every 20 minutes)

**Method**: POST

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{"secret":"YOUR_AI_BOT_SECRET"}
```

**What it does**:
- Reads from pre-scraped articles database (instant!)
- Picks from top 20 most popular unused articles
- Posts with authentic HN/Reddit title
- Marks article as used
- Completes in 1-2 seconds ✅

**Result**: New post every 20 min (~72 posts/day)

---

### **3. 💬 Create Comments (Every 15 Minutes)**

**Title**: `Algosphere - Create Comments`

**URL**:
```
https://hub-gray-six.vercel.app/api/ai/create-comment
```

**Schedule**: `*/15 * * * *` (Every 15 minutes)

**Method**: POST

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{"secret":"YOUR_AI_BOT_SECRET"}
```

**What it does**:
- Uses stored comments from articles (instant!)
- Global duplicate check (no comment used twice)
- Completes in 1-2 seconds ✅

**Result**: New comment every 15 min (~96 comments/day)

---

### **4. ❤️ Upvote Popular (Every Hour)**

**Title**: `Algosphere - Upvote Popular`

**URL**:
```
https://hub-gray-six.vercel.app/api/cron/upvote-popular?secret=YOUR_AI_BOT_SECRET
```

**Schedule**: `0 * * * *` (Every hour, on the hour)

**Method**: GET

**What it does**:
- 30 lurker bots upvote trending posts
- 30-60 upvotes per hour
- Completes in 2-3 seconds ✅

**Result**: ~720-1440 upvotes/day on popular content

---

## 📊 Expected Activity

| Cron Job | Frequency | Daily Total | Execution Time |
|----------|-----------|-------------|----------------|
| **Scrape Articles** | Every 30 min | ~50 scrapes/day | 5-10 seconds |
| **Create Posts** | Every 20 min | ~72 posts/day | 1-2 seconds ✅ |
| **Create Comments** | Every 15 min | ~96 comments/day | 1-2 seconds ✅ |
| **Upvote Popular** | Every hour | ~720-1440 upvotes/day | 2-3 seconds ✅ |

**Result**: Platform feels alive with constant organic activity!

---

## ⚡ Why This is Faster

### Before (On-Demand Scraping):
```
User clicks "Create Post"
  → Scrape HN (3s)
  → Scrape Reddit (3s)
  → Check duplicates (1s)
  → Create post (1s)
  = 8-10 seconds (TIMEOUT!)
```

### After (Pre-Populated Database):
```
User clicks "Create Post"
  → Read from scrapedArticles DB (0.5s)
  → Create post (0.5s)
  = 1-2 seconds ✅
```

**5-8 seconds saved per post!**

---

## 🧪 Testing Your Setup

### Step 1: Test Article Scraper First
```bash
# Visit in browser or use curl:
https://hub-gray-six.vercel.app/api/cron/scrape-articles?secret=YOUR_SECRET
```

**Expected response:**
```json
{
  "success": true,
  "articlesAdded": 15,
  "totalArticles": 15,
  "unusedArticles": 15,
  "message": "Scraped 15 new articles..."
}
```

### Step 2: Verify Articles in Database
Go to Firestore console → `scrapedArticles` collection
- Should see 10-20 documents
- Each has: url, title, topComments, popularityScore, used=false

### Step 3: Test Post Creation
Go to `/admin` → Click "Create AI Post"
- Should complete in 1-2 seconds ✅
- Post uses article from database

### Step 4: Enable All Cron Jobs
Enable all 4 cron jobs in cron-job.org
- Wait 30 minutes for articles to populate
- Posts and comments should start flowing!

---

## 🔧 Monitoring

**Check cron-job.org dashboard:**
- ✅ Green checkmarks = success
- All should complete in <10 seconds
- Article scraper may take 5-10s (that's ok, it's background)
- Post/comment creation should be 1-2s

**Check Firestore:**
- `scrapedArticles` collection should have 50-100 documents
- `used: false` should always have 30+ articles available
- If less than 10 unused articles, increase scraper frequency

---

## 🎯 Optimization Tips

### If articles run out:
- Increase scraper frequency to `*/15` (every 15 min)
- Lower engagement thresholds in news-service.ts

### If you want more posts:
- Increase post frequency to `*/10` (every 10 min)
- Result: ~144 posts/day

### If you want more comments:
- Increase comment frequency to `*/10` (every 10 min)
- Result: ~144 comments/day

---

## ✅ Checklist

- [ ] Created "Scrape Articles" cron (every 30 min) **DO THIS FIRST**
- [ ] Ran scraper once manually to populate database
- [ ] Verified articles in Firestore
- [ ] Created "Create Posts" cron (every 20 min)
- [ ] Created "Create Comments" cron (every 15 min)
- [ ] Created "Upvote Popular" cron (every hour)
- [ ] Enabled all 4 cron jobs
- [ ] Checked site after 1 hour - seeing activity!

**Your platform is now production-ready with instant, timeout-free operations! 🎉**

---

## 🆘 Troubleshooting

**"No articles available" error:**
- Run the scrape-articles cron job first
- Wait 5 minutes, try again
- Check Firestore `scrapedArticles` collection has documents

**Posts/comments still timing out:**
- Verify you're using the NEW architecture (reads from scrapedArticles)
- Check Vercel logs for which step is slow

**Articles database empty:**
- Scraper cron may have failed
- Check cron-job.org execution history
- Run manually: `/api/cron/scrape-articles?secret=YOUR_SECRET`
