import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

// GET /api/playlists?week_number={n}
// Returns the playlist for a given week, or null if none exists.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekNumber = searchParams.get("week_number");

    if (!weekNumber) {
      return NextResponse.json(
        { error: "week_number query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("playlists")
      .select(
        "spotify_playlist_url, track_count, tracks_not_found, created_at"
      )
      .eq("week_number", parseInt(weekNumber))
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ data: data ?? null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
