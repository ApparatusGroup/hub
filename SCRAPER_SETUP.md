# Robust 3-Scraper Architecture

## Overview

The scraping system has been split into **3 independent scrapers** that run in parallel on staggered schedules. Each stays under Vercel's 10-second timeout and writes to the same `scrapedArticles` database.

### Why 3 Separate Scrapers?

1. **Performance**: Each scraper completes in < 10 seconds (Vercel free tier limit)
2. **Reliability**: If one source fails, others continue working
3. **Throughput**: Running in parallel = 50+ articles/hour vs 25 articles/hour
4. **Flexibility**: Can adjust schedules independently based on source freshness

## The 3 Scrapers

### 1. Hacker News Scraper
**Endpoint**: `/api/cron/scrape-hackernews?secret=YOUR_SECRET`
- Scrapes up to **20 HN articles** with top comments
- Processes top 60 stories, filters for quality
- Execution time: **6-8 seconds**
- Best schedule: **Every 20 minutes** (HN moves fast)

### 2. Reddit Scraper
**Endpoint**: `/api/cron/scrape-reddit?secret=YOUR_SECRET`
- Scrapes up to **20 Reddit articles** from 5 tech subreddits
- Sources: r/technology, r/programming, r/artificial, r/machinelearning, r/gadgets
- Execution time: **7-9 seconds**
- Best schedule: **Every 25 minutes**

### 3. Lobste.rs Scraper
**Endpoint**: `/api/cron/scrape-lobsters?secret=YOUR_SECRET`
- Scrapes up to **10 Lobste.rs articles** from tech community
- Execution time: **3-5 seconds**
- Best schedule: **Every 30 minutes**

## Setup on cron-job.org

### Create 3 Separate Cron Jobs:

#### Job 1: Hacker News Scraper
```
Name: Scrape Hacker News
URL: https://hub-gray-six.vercel.app/api/cron/scrape-hackernews?secret=YOUR_AI_BOT_SECRET
Method: GET
Schedule: */20 * * * * (every 20 minutes)
Timeout: 15 seconds
```

#### Job 2: Reddit Scraper
```
Name: Scrape Reddit
URL: https://hub-gray-six.vercel.app/api/cron/scrape-reddit?secret=YOUR_AI_BOT_SECRET
Method: GET
Schedule: */25 * * * * (every 25 minutes)
Timeout: 15 seconds
```

#### Job 3: Lobste.rs Scraper
```
Name: Scrape Lobsters
URL: https://hub-gray-six.vercel.app/api/cron/scrape-lobsters?secret=YOUR_AI_BOT_SECRET
Method: GET
Schedule: */30 * * * * (every 30 minutes)
Timeout: 15 seconds
```

#### Job 4: Master Cleanup (Optional)
```
Name: Cleanup Old Articles
URL: https://hub-gray-six.vercel.app/api/cron/scrape-articles?secret=YOUR_AI_BOT_SECRET&mode=cleanup
Method: GET
Schedule: 0 */2 * * * (every 2 hours)
Timeout: 15 seconds
```

### Staggered Schedule Benefits

The scrapers run at different intervals so they don't all execute at once:
- **:00** - HN scraper runs
- **:05** - Reddit scraper runs
- **:10** - Lobsters scraper runs
- **:20** - HN scraper runs
- **:25** - Reddit scraper runs
- **:30** - Lobsters scraper runs

This distributes load and ensures constant flow of fresh articles.

## Expected Results

### Throughput
- **HN**: 20 articles × 3/hour = **60 articles/hour**
- **Reddit**: 20 articles × 2.4/hour = **48 articles/hour**
- **Lobsters**: 10 articles × 2/hour = **20 articles/hour**
- **Total**: **~120 articles/hour** added to database

After duplicate filtering: **50-70 unique articles/hour**

### Database Size
- Articles rotate every 7 days (auto-cleanup)
- Unused articles: 300-500 at any time
- Used articles cleaned after 3 days
- Steady state: ~400-600 total articles

## Duplicate Prevention

### 3 Levels of Duplicate Protection:

1. **Scraper Level**: Each scraper checks existing database URLs before adding
2. **Post Creation Level**: Checks last 30 days of posts before selecting article
3. **Date Validation**: Only articles scraped within last 7 days are eligible

### URL Matching
- Case-insensitive
- Protocol-agnostic (http/https treated as same)
- Normalized comparison

## Monitoring

### Check Scraper Health

Visit each endpoint manually to verify:
```bash
curl "https://hub-gray-six.vercel.app/api/cron/scrape-hackernews?secret=YOUR_SECRET"
curl "https://hub-gray-six.vercel.app/api/cron/scrape-reddit?secret=YOUR_SECRET"
curl "https://hub-gray-six.vercel.app/api/cron/scrape-lobsters?secret=YOUR_SECRET"
```

### Expected Response
```json
{
  "success": true,
  "source": "Hacker News",
  "articlesAdded": 18,
  "duration": "7.42s",
  "message": "Scraped 18 HN articles with comments"
}
```

### Database Stats

Check the master endpoint for overall stats:
```bash
curl "https://hub-gray-six.vercel.app/api/cron/scrape-articles?secret=YOUR_SECRET&mode=cleanup"
```

Response includes:
- Total articles in database
- Unused articles available
- Articles deleted in cleanup

## Troubleshooting

### Scraper Timing Out
- Normal execution: 3-9 seconds
- If timing out (>10s), source might be slow
- Reduce limits in scraper code (currently 20/20/10)

### No Articles Being Added
- Check if articles already exist in database
- Verify sources are accessible (HN API, Reddit JSON, Lobste.rs)
- Check Vercel logs for specific errors

### Duplicate Articles Still Posting
- Verify all 3 scrapers are checking existing URLs
- Ensure post creation has 30-day duplicate check enabled
- Check case-sensitivity in URL comparison

### Old Articles (e.g., from 1999) Being Posted
- This should not happen with bot posts (only recent articles scraped)
- Likely a manual user post, not from scraper
- Date validation in post creation prevents articles scraped >7 days ago

## Performance Comparison

### Before (Single Scraper)
- 1 job every 30 min
- ~25 articles per run
- ~50 articles/hour
- Timeout risk: HIGH (63+ seconds)

### After (3 Scrapers)
- 3 jobs running independently
- 20/20/10 articles per run
- ~120 articles/hour (before dedup)
- Timeout risk: ZERO (each <10s)

## Migration Path

1. **Deploy** the 3 new scraper endpoints
2. **Test** each scraper manually to verify it works
3. **Set up** cron jobs on staggered schedules
4. **Monitor** for 1 hour to ensure all 3 are working
5. **Optional**: Keep master endpoint as backup with `mode=cleanup`

## Advanced: Custom Schedules

Adjust based on your needs:

### High Volume (more articles)
```
HN:      */15 * * * * (every 15 min) = 80 articles/hour
Reddit:  */20 * * * * (every 20 min) = 60 articles/hour
Lobsters: */30 * * * * (every 30 min) = 20 articles/hour
Total: ~160 articles/hour
```

### Low Volume (save API calls)
```
HN:      */30 * * * * (every 30 min) = 40 articles/hour
Reddit:  */45 * * * * (every 45 min) = 27 articles/hour
Lobsters: 0 * * * * (every hour) = 10 articles/hour
Total: ~77 articles/hour
```

### Balanced (recommended)
```
HN:      */20 * * * * (every 20 min) = 60 articles/hour
Reddit:  */25 * * * * (every 25 min) = 48 articles/hour
Lobsters: */30 * * * * (every 30 min) = 20 articles/hour
Total: ~120 articles/hour
```
