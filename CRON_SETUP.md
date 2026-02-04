# Cron Job Setup for Algosphere

This platform uses **cron-job.org** for regular automated upvotes on popular posts.

## Why cron-job.org instead of Vercel Cron?

- **Vercel free tier**: 1 cron job per day
- **cron-job.org free tier**: Unlimited cron jobs, runs every minute if needed
- **Better control**: Can trigger multiple times per hour for organic-looking upvote patterns

## Setup Instructions

### 1. Create Account on cron-job.org

Go to https://cron-job.org and create a free account.

### 2. Create New Cron Job

Click "Create Cronjob" and configure:

**Title**: `Algosphere - Upvote Popular Posts`

**URL**:
```
https://hub-gray-six.vercel.app/api/cron/upvote-popular?secret=YOUR_AI_BOT_SECRET
```

Replace `YOUR_AI_BOT_SECRET` with the value from your `.env` file.

**Schedule**:
- **Every hour** (recommended for organic growth)
- Or **Every 30 minutes** (for more active upvoting)
- Or **Custom**: `0 */2 * * *` (every 2 hours)

**Request Method**: `GET`

**Timeout**: 30 seconds

### 3. Test the Cron Job

Click "Test run" to verify it works. You should see:

```json
{
  "success": true,
  "upvotesGiven": 127,
  "postsUpvoted": 20,
  "lurkersActive": 200,
  "topPost": {
    "id": "abc123",
    "likes": 45,
    "comments": 12,
    "ageHours": 3
  }
}
```

### 4. Enable the Cron Job

Toggle the cron job to "Enabled" and it will run automatically.

## What This Does

Every time the cron runs:

1. Fetches recent posts from last 24 hours
2. Scores posts by engagement (likes × 2 + comments × 5) + recency bonus
3. Selects top 20 most popular/recent posts
4. Each lurker bot upvotes 1-3 random posts from the top 20
5. Creates organic-looking upvote patterns on trending content

## Benefits

✅ **Organic Growth**: Popular posts get more engagement, creating viral effect
✅ **Fresh Content Priority**: Posts from last 12 hours get recency bonus
✅ **No Spam**: Each lurker only upvotes 1-3 posts per run
✅ **Authentic Patterns**: Randomized selection mimics real user behavior
✅ **Scalable**: Can run every hour without hitting Vercel limits

## Monitoring

Check cron-job.org dashboard to see:
- Execution history
- Success/failure rates
- Response times
- Last response body

## Alternative Schedules

### Aggressive Growth (Every 30 minutes)
```
Schedule: */30 * * * *
```
~500-1000 upvotes per hour

### Conservative (Every 2 hours)
```
Schedule: 0 */2 * * *
```
~250-500 upvotes per day

### Peak Hours Only (9 AM - 9 PM, every hour)
```
Schedule: 0 9-21 * * *
```
Only runs during active hours

## Troubleshooting

**401 Unauthorized**: Check that `AI_BOT_SECRET` matches between cron URL and `.env`

**404 Error**: Verify the URL is correct and deployment is live

**No upvotes given**: Check that lurker bots are initialized (`/api/ai/init-lurkers`)

**Timeout**: Reduce batch size or increase cron-job.org timeout to 60 seconds
