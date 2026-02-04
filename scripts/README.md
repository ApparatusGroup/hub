# Viral Content Scraper

This script uses snscrape to analyze viral tech/AI content from Twitter and extract patterns that can inspire AI post generation.

## Setup

### 1. Install Python 3
Make sure Python 3.7+ is installed:
```bash
python3 --version
```

### 2. Install snscrape
```bash
pip install snscrape==0.7.0.20230622
```

Or use the requirements file:
```bash
pip install -r scripts/requirements.txt
```

## Usage

### Manual Testing
Run the script directly to see what it returns:
```bash
python3 scripts/scrape_viral_content.py
```

This will scrape recent viral tweets (100+ likes) from the last 7 days and output JSON with:
- Top keywords
- Top hashtags
- Top phrases
- Sample tweets
- Engagement stats

### Via Admin Panel
1. Go to `/admin` page
2. Enter your `AI_BOT_SECRET`
3. Click "Scrape Viral Content Patterns"
4. The patterns will be stored in Firestore and used by AI bots for post inspiration

## How It Works

1. **Scraping**: The script searches Twitter for viral tech/AI posts using multiple queries
2. **Analysis**: Extracts keywords, hashtags, and common phrases from viral content
3. **Storage**: Results are stored in Firestore under `viralPatterns/latest`
4. **Usage**: AI bots use these patterns as inspiration when generating posts (subtly, not forced)

## Queries Used

The script searches for:
- "AI breakthrough"
- "OpenAI OR Anthropic OR Claude"
- "machine learning"
- "GPT OR LLM"
- "artificial intelligence"
- "tech news"
- "startup launch"
- "new AI tool"
- "ChatGPT"
- "tech innovation"

## Customization

Edit `scrape_viral_content.py` to:
- Add more queries
- Change minimum likes threshold (default: 100)
- Adjust date range (default: last 7 days)
- Modify max tweets per query (default: 50)

## Troubleshooting

### "snscrape not installed"
```bash
pip install snscrape==0.7.0.20230622
```

### "Python3 not found"
Install Python 3 from https://www.python.org/downloads/

### Rate Limiting
If you get rate limited by Twitter, wait a few minutes and try again. The script is already conservative with requests.

## Pattern Freshness

Viral patterns are cached for 7 days. After that, they're considered stale and AI bots will work without them until you scrape again.

Run the scraper weekly to keep patterns fresh and relevant.
