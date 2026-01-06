import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCuratorApi } from "@/lib/auth/apiAuth";
import { spotifyClient } from "@/lib/spotifyClient";
import type { Database } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  // Check auth first
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  try {
    const { rank, artist, album, year } = await request.json();

    if (!rank || !artist || !album || !year) {
      return NextResponse.json(
        { error: "Missing required fields: rank, artist, album, year" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Search Spotify with specific query using album and artist fields
    const searchQuery = `album:"${album}" artist:"${artist}"`;
    console.log('Searching Spotify:', searchQuery);

    const results = await spotifyClient.searchAlbums(searchQuery, 10);

    console.log(`Found ${results.length} results`);

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No Spotify results found for this album" },
        { status: 404 }
      );
    }

    // Find best match - prioritize correct year
    const bestMatch = results.find(r => {
      const spotifyYear = parseInt(r.release_date.split('-')[0]);
      return spotifyYear === year;
    }) || results[0];

    // Update the database
    const updateData: Database['public']['Tables']['rs_500_albums']['Update'] = {
      spotify_id: bestMatch.id,
      spotify_url: bestMatch.external_urls.spotify,
      album_art_url: bestMatch.images[0]?.url || null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from('rs_500_albums').update as any)(updateData)
      .eq('rank', rank);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Updated album #${rank}`,
      spotifyData: {
        name: bestMatch.name,
        artist: bestMatch.artists.map(a => a.name).join(', '),
        year: parseInt(bestMatch.release_date.split('-')[0]),
        url: bestMatch.external_urls.spotify,
        imageUrl: bestMatch.images[0]?.url,
      },
      allResults: results.map(r => ({
        name: r.name,
        artist: r.artists.map(a => a.name).join(', '),
        year: parseInt(r.release_date.split('-')[0]),
        url: r.external_urls.spotify,
      }))
    });

  } catch (error) {
    console.error('Fix RS500 album error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fix album" },
      { status: 500 }
    );
  }
}
