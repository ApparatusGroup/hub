#!/usr/bin/env python3
"""
Scrapes popular tech/AI posts from Twitter using snscrape
Analyzes viral patterns and common phrases
"""

import sys
import json
import re
from datetime import datetime, timedelta
from collections import Counter
from typing import List, Dict, Any

try:
    import snscrape.modules.twitter as sntwitter
except ImportError:
    print(json.dumps({"error": "snscrape not installed. Run: pip install snscrape"}))
    sys.exit(1)


def extract_keywords(text: str) -> List[str]:
    """Extract meaningful keywords from tweet text"""
    # Remove URLs, mentions, hashtags
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'#\w+', '', text)

    # Extract words (3+ characters)
    words = re.findall(r'\b\w{3,}\b', text.lower())

    # Filter out common words
    stop_words = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
                  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him',
                  'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way',
                  'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too',
                  'use', 'this', 'that', 'with', 'have', 'from', 'they', 'been',
                  'what', 'when', 'your', 'more', 'will', 'just', 'than', 'into'}

    return [w for w in words if w not in stop_words]


def extract_hashtags(text: str) -> List[str]:
    """Extract hashtags from text"""
    return re.findall(r'#(\w+)', text)


def extract_phrases(text: str) -> List[str]:
    """Extract 2-3 word phrases that might be viral patterns"""
    # Remove URLs and mentions first
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'@\w+', '', text)

    words = text.split()
    phrases = []

    # Extract 2-word phrases
    for i in range(len(words) - 1):
        phrase = f"{words[i]} {words[i+1]}".lower()
        if len(phrase) > 6:  # Meaningful phrases
            phrases.append(phrase)

    # Extract 3-word phrases
    for i in range(len(words) - 2):
        phrase = f"{words[i]} {words[i+1]} {words[i+2]}".lower()
        if len(phrase) > 10:  # Meaningful phrases
            phrases.append(phrase)

    return phrases


def scrape_viral_tweets(
    queries: List[str],
    min_likes: int = 100,
    max_tweets: int = 100,
    days_back: int = 7
) -> Dict[str, Any]:
    """
    Scrape viral tweets based on queries

    Args:
        queries: List of search queries
        min_likes: Minimum likes for a tweet to be considered viral
        max_tweets: Maximum tweets to fetch per query
        days_back: How many days back to search

    Returns:
        Dictionary with viral patterns analysis
    """

    since_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')

    all_tweets = []
    all_keywords = []
    all_hashtags = []
    all_phrases = []

    for query in queries:
        # Build search query with minimum likes filter
        search_query = f"{query} min_faves:{min_likes} since:{since_date} lang:en"

        tweet_count = 0

        try:
            for tweet in sntwitter.TwitterSearchScraper(search_query).get_items():
                if tweet_count >= max_tweets:
                    break

                tweet_data = {
                    'text': tweet.rawContent,
                    'likes': tweet.likeCount,
                    'retweets': tweet.retweetCount,
                    'replies': tweet.replyCount,
                    'date': tweet.date.isoformat() if tweet.date else None,
                    'user': tweet.user.username if tweet.user else None,
                }

                all_tweets.append(tweet_data)

                # Extract patterns
                all_keywords.extend(extract_keywords(tweet.rawContent))
                all_hashtags.extend(extract_hashtags(tweet.rawContent))
                all_phrases.extend(extract_phrases(tweet.rawContent))

                tweet_count += 1

        except Exception as e:
            print(f"Error scraping query '{query}': {str(e)}", file=sys.stderr)
            continue

    # Analyze patterns
    keyword_counts = Counter(all_keywords).most_common(50)
    hashtag_counts = Counter(all_hashtags).most_common(30)
    phrase_counts = Counter(all_phrases).most_common(40)

    # Calculate engagement metrics
    total_engagement = sum(t['likes'] + t['retweets'] + t['replies'] for t in all_tweets)
    avg_engagement = total_engagement / len(all_tweets) if all_tweets else 0

    return {
        'success': True,
        'stats': {
            'total_tweets': len(all_tweets),
            'total_engagement': total_engagement,
            'avg_engagement': round(avg_engagement, 2),
            'queries': queries,
            'date_range': f"Last {days_back} days",
            'scraped_at': datetime.now().isoformat()
        },
        'patterns': {
            'top_keywords': [{'word': k, 'count': c} for k, c in keyword_counts],
            'top_hashtags': [{'tag': h, 'count': c} for h, c in hashtag_counts],
            'top_phrases': [{'phrase': p, 'count': c} for p, c in phrase_counts]
        },
        'sample_tweets': all_tweets[:20]  # Return top 20 tweets as examples
    }


def main():
    """Main function to run the scraper"""

    # Tech/AI related queries that tend to go viral
    queries = [
        "AI breakthrough",
        "OpenAI OR Anthropic OR Claude",
        "machine learning",
        "GPT OR LLM",
        "artificial intelligence",
        "tech news",
        "startup launch",
        "new AI tool",
        "ChatGPT",
        "tech innovation"
    ]

    try:
        results = scrape_viral_tweets(
            queries=queries,
            min_likes=100,  # Tweets with at least 100 likes
            max_tweets=50,  # 50 tweets per query max
            days_back=7     # Last 7 days
        )

        # Output as JSON
        print(json.dumps(results, indent=2))

    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
