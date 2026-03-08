/**
 * Pitchfork RSS Client
 * Fetches and parses Pitchfork album review feeds (no API key required)
 */

export interface PitchforkReview {
  title: string;
  artist: string;
  score: number | null;
  isBestNewMusic: boolean;
  publishedAt: Date;
  reviewUrl: string;
}

const FEEDS = {
  all: 'https://pitchfork.com/rss/reviews/albums/',
  bestNewMusic: 'https://pitchfork.com/rss/reviews/best/albums/',
};

/**
 * Parse a score from a Pitchfork RSS description string.
 * The description typically contains text like "8.7" or "Best New Music" near the rating.
 */
function parseScore(description: string): number | null {
  // Pitchfork descriptions contain the score as a decimal number like "8.7" or "10.0"
  const match = description.match(/\b([0-9]|10)(\.[0-9])?\b/);
  if (!match) return null;
  const score = parseFloat(match[0]);
  if (isNaN(score) || score < 0 || score > 10) return null;
  return score;
}

/**
 * Parse the artist and album title from an RSS <title> element.
 * Pitchfork titles are typically in the format: "Artist: Album Title"
 */
function parseTitleField(raw: string): { artist: string; title: string } {
  const colonIndex = raw.indexOf(':');
  if (colonIndex === -1) {
    return { artist: raw.trim(), title: raw.trim() };
  }
  return {
    artist: raw.slice(0, colonIndex).trim(),
    title: raw.slice(colonIndex + 1).trim(),
  };
}

/**
 * Extract text content of a tag from raw XML string.
 * Returns all values (for repeated tags).
 */
function extractTagValues(xml: string, tag: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

/**
 * Extract CDATA content or plain text from a tag value.
 */
function unwrapCdata(value: string): string {
  const cdataMatch = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdataMatch ? cdataMatch[1].trim() : value;
}

/**
 * Parse raw RSS XML into an array of PitchforkReview objects.
 */
function parseRssFeed(xml: string, isBestNewMusicFeed: boolean): PitchforkReview[] {
  const reviews: PitchforkReview[] = [];

  // Split into <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const item = itemMatch[1];

    const titleRaw = unwrapCdata(extractTagValues(item, 'title')[0] ?? '');
    const link = unwrapCdata(extractTagValues(item, 'link')[0] ?? '');
    const pubDateStr = extractTagValues(item, 'pubDate')[0] ?? '';
    const description = unwrapCdata(extractTagValues(item, 'description')[0] ?? '');

    if (!titleRaw || !link) continue;

    const { artist, title } = parseTitleField(titleRaw);
    const publishedAt = pubDateStr ? new Date(pubDateStr) : new Date();
    const score = parseScore(description);
    const isBestNewMusic =
      isBestNewMusicFeed ||
      description.toLowerCase().includes('best new music') ||
      description.toLowerCase().includes('best new reissue');

    reviews.push({ title, artist, score, isBestNewMusic, publishedAt, reviewUrl: link });
  }

  return reviews;
}

/**
 * Fetch a single Pitchfork RSS feed URL and parse it.
 */
async function fetchFeed(url: string, isBestNewMusicFeed: boolean): Promise<PitchforkReview[]> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'AlbumClubManager/1.0' },
    next: { revalidate: 3600 }, // Cache for 1 hour (Next.js fetch cache)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Pitchfork RSS: ${response.status} ${url}`);
  }

  const xml = await response.text();
  return parseRssFeed(xml, isBestNewMusicFeed);
}

/**
 * Fetch recent Pitchfork album reviews from the past N weeks.
 * Deduplicates across both feeds, with Best New Music flagged.
 *
 * @param weeksBack - How many weeks of reviews to include (default: 2)
 */
export async function fetchRecentReviews(weeksBack: number = 2): Promise<PitchforkReview[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);

  const [allReviews, bnmReviews] = await Promise.all([
    fetchFeed(FEEDS.all, false).catch(() => [] as PitchforkReview[]),
    fetchFeed(FEEDS.bestNewMusic, true).catch(() => [] as PitchforkReview[]),
  ]);

  // Build a set of Best New Music review URLs for fast lookup
  const bnmUrls = new Set(bnmReviews.map((r) => r.reviewUrl));

  // Merge: mark items from the all-feed as BNM if they also appear in the BNM feed
  const merged = new Map<string, PitchforkReview>();

  for (const review of [...bnmReviews, ...allReviews]) {
    const key = review.reviewUrl;
    if (!merged.has(key)) {
      merged.set(key, {
        ...review,
        isBestNewMusic: review.isBestNewMusic || bnmUrls.has(key),
      });
    }
  }

  // Filter to the desired time window and sort newest first
  return Array.from(merged.values())
    .filter((r) => r.publishedAt >= cutoff)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
