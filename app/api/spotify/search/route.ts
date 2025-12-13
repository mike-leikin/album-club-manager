import { NextRequest, NextResponse } from "next/server";
import { spotifyClient } from "@/lib/spotifyClient";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Search Spotify with a limit of 10 results
    const results = await spotifyClient.searchAlbums(query, 10);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Spotify search error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to search Spotify",
      },
      { status: 500 }
    );
  }
}
