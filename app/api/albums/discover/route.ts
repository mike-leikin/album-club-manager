import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireCuratorApi } from "@/lib/auth/apiAuth";
import { createServerClient } from "@/lib/supabaseClient";
import { spotifyClient } from "@/lib/spotifyClient";
import type { SpotifyAlbumSimplified } from "@/lib/spotifyClient";
import { fetchRecentReviews } from "@/lib/pitchforkClient";
import type { PitchforkReview } from "@/lib/pitchforkClient";

export interface DiscoveryResult {
  title: string;
  artist: string;
  year: string;
  spotifyUrl: string | null;
  albumArtUrl: string | null;
  pitchforkScore: number | null;
  isBestNewMusic: boolean;
  pitchforkReviewUrl: string | null;
  source: "pitchfork" | "spotify-new-releases" | "both";
  claudeFitScore: number;
  claudeExplanation: string;
}

type DiscoveryCandidate = Omit<DiscoveryResult, "claudeFitScore" | "claudeExplanation">;

interface ClubHistoryEntry {
  title: string;
  artist: string;
  year: string | null;
  avgRating: number | null;
}

interface ClaudeRanking {
  title: string;
  artist: string;
  claudeFitScore: number;
  claudeExplanation: string;
}

function candidateKey(artist: string, title: string): string {
  return `${artist.toLowerCase()}|||${title.toLowerCase()}`;
}

/**
 * Fetch the club's last N weeks of contemporary albums with average ratings.
 */
async function fetchClubHistory(limit: number = 10): Promise<ClubHistoryEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;

  const { data: weeks, error: weeksError } = await supabase
    .from("weeks")
    .select("week_number, contemporary_title, artist, year")
    .not("contemporary_title", "is", null)
    .order("week_number", { ascending: false })
    .limit(limit);

  if (weeksError || !weeks || weeks.length === 0) return [];

  const weekNumbers: number[] = weeks.map((w: { week_number: number }) => w.week_number);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("week_number, rating")
    .eq("album_type", "contemporary")
    .eq("moderation_status", "approved")
    .in("week_number", weekNumbers);

  const ratingsByWeek = new Map<number, number[]>();
  for (const review of reviews ?? []) {
    if (review.rating == null) continue;
    const list = ratingsByWeek.get(review.week_number) ?? [];
    list.push(Number(review.rating));
    ratingsByWeek.set(review.week_number, list);
  }

  return weeks.map((w: { week_number: number; contemporary_title: string; artist: string; year: string | null }) => {
    const ratings = ratingsByWeek.get(w.week_number) ?? [];
    const sum = ratings.reduce((a: number, b: number) => a + b, 0);
    const avgRating = ratings.length > 0 ? Math.round((sum / ratings.length) * 10) / 10 : null;
    return {
      title: w.contemporary_title,
      artist: w.artist,
      year: w.year,
      avgRating,
    };
  });
}

/**
 * Build a combined deduplicated candidate map from Pitchfork reviews and Spotify new releases.
 */
async function buildCandidates(
  pitchforkReviews: PitchforkReview[],
  spotifyNewReleases: SpotifyAlbumSimplified[]
): Promise<Map<string, DiscoveryCandidate>> {
  const candidates = new Map<string, DiscoveryCandidate>();

  // Enrich Pitchfork reviews with Spotify data in batches of 5
  const batchSize = 5;
  for (let i = 0; i < pitchforkReviews.length; i += batchSize) {
    const batch = pitchforkReviews.slice(i, i + batchSize);
    const enriched = await Promise.all(
      batch.map(async (review) => {
        try {
          const results = await spotifyClient.searchAlbums(`${review.artist} ${review.title}`, 1);
          return { review, spotifyAlbum: results[0] ?? null };
        } catch {
          return { review, spotifyAlbum: null };
        }
      })
    );

    for (const { review, spotifyAlbum } of enriched) {
      const key = candidateKey(review.artist, review.title);
      const year = spotifyAlbum
        ? spotifyAlbum.release_date.split("-")[0]
        : String(review.publishedAt.getFullYear());
      candidates.set(key, {
        title: review.title,
        artist: review.artist,
        year,
        spotifyUrl: spotifyAlbum?.external_urls.spotify ?? null,
        albumArtUrl: spotifyAlbum?.images[0]?.url ?? null,
        pitchforkScore: review.score,
        isBestNewMusic: review.isBestNewMusic,
        pitchforkReviewUrl: review.reviewUrl,
        source: "pitchfork",
      });
    }
  }

  // Add Spotify new releases, merging with existing Pitchfork entries
  for (const album of spotifyNewReleases) {
    const artistName = album.artists[0]?.name ?? "";
    const key = candidateKey(artistName, album.name);
    if (candidates.has(key)) {
      const existing = candidates.get(key)!;
      candidates.set(key, { ...existing, source: "both" });
    } else {
      candidates.set(key, {
        title: album.name,
        artist: artistName,
        year: album.release_date.split("-")[0],
        spotifyUrl: album.external_urls.spotify,
        albumArtUrl: album.images[0]?.url ?? null,
        pitchforkScore: null,
        isBestNewMusic: false,
        pitchforkReviewUrl: null,
        source: "spotify-new-releases",
      });
    }
  }

  return candidates;
}

/**
 * Use Claude to rank albums by predicted fit for the club's taste profile.
 * Falls back to a simple heuristic if the API key is missing or the call fails.
 */
async function rankWithClaude(
  candidates: DiscoveryCandidate[],
  clubHistory: ClubHistoryEntry[]
): Promise<ClaudeRanking[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || candidates.length === 0) {
    return fallbackRankings(candidates);
  }

  let client: Anthropic;
  try {
    client = new Anthropic({ apiKey });
  } catch {
    return fallbackRankings(candidates);
  }

  const historyText =
    clubHistory.length > 0
      ? clubHistory
          .map(
            (h) =>
              `- ${h.artist} – ${h.title}${h.year ? ` (${h.year})` : ""}` +
              (h.avgRating !== null ? `: avg ${h.avgRating}/10` : ": unrated")
          )
          .join("\n")
      : "No club history available yet.";

  const albumsText = candidates
    .map(
      (c, i) =>
        `${i + 1}. ${c.artist} – ${c.title} (${c.year})` +
        (c.pitchforkScore !== null ? `, Pitchfork: ${c.pitchforkScore}` : "") +
        (c.isBestNewMusic ? " [Best New Music]" : "")
    )
    .join("\n");

  const prompt = `You are a music curator assistant for a weekly album club.

The club has recently reviewed these contemporary albums (newest first):
${historyText}

Newly released albums from the past 2 weeks being considered for the club:
${albumsText}

For each album, provide a "claudeFitScore" (1-10) based on how well it might suit this club's taste, and a 1-2 sentence "claudeExplanation". Consider the Pitchfork score, Best New Music status, stylistic fit with the club's history, and general critical standing.

Return ONLY a valid JSON array with no additional text:
[{"title": "...", "artist": "...", "claudeFitScore": 8, "claudeExplanation": "..."}]`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") return fallbackRankings(candidates);

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return fallbackRankings(candidates);

    return JSON.parse(jsonMatch[0]) as ClaudeRanking[];
  } catch {
    return fallbackRankings(candidates);
  }
}

function fallbackRankings(candidates: DiscoveryCandidate[]): ClaudeRanking[] {
  return candidates.map((c) => ({
    title: c.title,
    artist: c.artist,
    claudeFitScore: c.isBestNewMusic ? 8 : c.pitchforkScore !== null ? 7 : 5,
    claudeExplanation: c.isBestNewMusic
      ? "Pitchfork Best New Music — highly recommended by critics."
      : c.pitchforkScore !== null
      ? `Reviewed by Pitchfork with a score of ${c.pitchforkScore}.`
      : "New release surfaced by Spotify.",
  }));
}

// GET /api/albums/discover?weeks=2
export async function GET(request: NextRequest) {
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const weeksBack = Math.min(
    Math.max(parseInt(searchParams.get("weeks") ?? "2", 10) || 2, 1),
    4
  );

  try {
    const [pitchforkReviews, spotifyNewReleases, clubHistory] = await Promise.all([
      fetchRecentReviews(weeksBack).catch((): PitchforkReview[] => []),
      spotifyClient.getNewReleases(20).catch((): SpotifyAlbumSimplified[] => []),
      fetchClubHistory(10).catch((): ClubHistoryEntry[] => []),
    ]);

    const candidatesMap = await buildCandidates(pitchforkReviews, spotifyNewReleases);
    const candidates = Array.from(candidatesMap.values());
    const rankings = await rankWithClaude(candidates, clubHistory);

    const rankingMap = new Map(
      rankings.map((r) => [candidateKey(r.artist, r.title), r])
    );

    const results: DiscoveryResult[] = candidates.map((c) => {
      const ranking = rankingMap.get(candidateKey(c.artist, c.title));
      return {
        ...c,
        claudeFitScore: ranking?.claudeFitScore ?? (c.isBestNewMusic ? 8 : 6),
        claudeExplanation:
          ranking?.claudeExplanation ??
          (c.isBestNewMusic
            ? "Pitchfork Best New Music selection."
            : "Recently released album."),
      };
    });

    // Sort: Best New Music first, then by Claude fit score descending
    results.sort((a, b) => {
      if (a.isBestNewMusic !== b.isBestNewMusic) return a.isBestNewMusic ? -1 : 1;
      return b.claudeFitScore - a.claudeFitScore;
    });

    return NextResponse.json({ results, clubHistory });
  } catch (error) {
    console.error("Album discovery error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch album recommendations",
      },
      { status: 500 }
    );
  }
}
