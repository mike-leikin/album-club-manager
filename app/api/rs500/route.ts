import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const showOnlyUncovered = searchParams.get("onlyUncovered") === "true";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

  let query = supabase
    .from("rs_500_albums")
    .select("*")
    .order("already_covered", { ascending: true }) // Uncovered albums first
    .order("rank", { ascending: true }); // Then by rank

  // Filter by already_covered if requested
  if (showOnlyUncovered) {
    query = query.eq("already_covered", false);
  }

  // Search by artist or album name
  if (search) {
    query = query.or(`artist.ilike.%${search}%,album.ilike.%${search}%`);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error("Error fetching RS 500 albums:", error);
    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 }
    );
  }

  return NextResponse.json({ albums: data || [] });
}
