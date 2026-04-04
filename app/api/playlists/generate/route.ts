import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCuratorApi } from "@/lib/auth/apiAuth";
import { spotifyClient } from "@/lib/spotifyClient";

// POST /api/playlists/generate
// Body: { week_number: number }
// Auth: curator required
export async function POST(request: NextRequest) {
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  try {
    const { week_number } = await request.json();

    if (!week_number || typeof week_number !== "number") {
      return NextResponse.json(
        { error: "week_number is required and must be a number" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if a playlist already exists for this week
    const { data: existing } = await supabase
      .from("playlists")
      .select("spotify_playlist_url, track_count, tracks_not_found")
      .eq("week_number", week_number)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        playlistUrl: existing.spotify_playlist_url,
        trackCount: existing.track_count,
        tracksNotFound: existing.tracks_not_found,
        alreadyExisted: true,
      });
    }

    // Fetch the week data for album context
    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select(
        "week_number, contemporary_title, contemporary_artist, classic_title, classic_artist"
      )
      .eq("week_number", week_number)
      .single();

    if (weekError || !week) {
      return NextResponse.json(
        { error: `Week ${week_number} not found` },
        { status: 404 }
      );
    }

    // Fetch all approved reviews with a favorite track for this week
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("favorite_track, album_type")
      .eq("week_number", week_number)
      .eq("moderation_status", "approved")
      .not("favorite_track", "is", null);

    if (reviewsError) throw reviewsError;

    if (!reviews || reviews.length === 0) {
      return NextResponse.json(
        { error: `No favorite tracks found for Week ${week_number}` },
        { status: 400 }
      );
    }

    // Deduplicate tracks by normalized name, keeping album_type for context
    const seen = new Set<string>();
    const uniqueTracks: Array<{ name: string; albumType: string }> = [];
    for (const review of reviews) {
      if (!review.favorite_track) continue;
      const normalized = review.favorite_track.trim().toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueTracks.push({
          name: review.favorite_track.trim(),
          albumType: review.album_type,
        });
      }
    }

    // Search Spotify for each unique track using album context
    const trackUris: string[] = [];
    const tracksNotFound: string[] = [];

    for (const track of uniqueTracks) {
      try {
        const albumTitle =
          track.albumType === "contemporary"
            ? (week.contemporary_title ?? undefined)
            : (week.classic_title ?? undefined);
        const artistName =
          track.albumType === "contemporary"
            ? (week.contemporary_artist ?? undefined)
            : (week.classic_artist ?? undefined);

        const uri = await spotifyClient.searchTrack(
          track.name,
          albumTitle,
          artistName
        );

        if (uri) {
          trackUris.push(uri);
        } else {
          tracksNotFound.push(track.name);
        }
      } catch {
        // Don't abort the whole operation if one search fails
        tracksNotFound.push(track.name);
      }
    }

    if (trackUris.length === 0) {
      return NextResponse.json(
        {
          error: "None of the favorite tracks could be found on Spotify",
          tracksNotFound,
        },
        { status: 400 }
      );
    }

    const spotifyUserId = process.env.SPOTIFY_USER_ID;
    if (!spotifyUserId) {
      return NextResponse.json(
        { error: "SPOTIFY_USER_ID environment variable is not set" },
        { status: 500 }
      );
    }

    // Get user access token and create the playlist
    const userAccessToken = await spotifyClient.getUserAccessToken();

    const playlist = await spotifyClient.createPlaylist(
      `Album Club – Week ${week_number} Favorites`,
      `Favorite tracks picked by Album Club members for Week ${week_number}`,
      userAccessToken,
      spotifyUserId
    );

    await spotifyClient.addTracksToPlaylist(playlist.id, trackUris, userAccessToken);

    // Save to database
    const { error: insertError } = await supabase.from("playlists").insert({
      week_number,
      spotify_playlist_id: playlist.id,
      spotify_playlist_url: playlist.url,
      track_count: trackUris.length,
      tracks_not_found: tracksNotFound,
    });

    if (insertError) throw insertError;

    return NextResponse.json({
      playlistUrl: playlist.url,
      trackCount: trackUris.length,
      tracksNotFound,
      alreadyExisted: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
