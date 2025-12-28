import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient() as any;

    // Fetch all data
    const [
      { data: participants, error: participantsError },
      { data: weeks, error: weeksError },
      { data: reviews, error: reviewsError },
      { data: rs500Albums, error: rs500Error },
    ] = await Promise.all([
      supabase.from("participants").select("*").order("name"),
      supabase.from("weeks").select("*").order("week_number"),
      supabase
        .from("reviews")
        .select(`
          *,
          participant:participants(name, email)
        `)
        .order("week_number"),
      supabase.from("rs_500_albums").select("*").order("rank"),
    ]);

    if (participantsError || weeksError || reviewsError || rs500Error) {
      throw new Error("Failed to fetch data from database");
    }

    // Create complete backup object
    const backup = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      data: {
        participants: participants || [],
        weeks: weeks || [],
        reviews: reviews || [],
        rs500Albums: rs500Albums || [],
      },
      stats: {
        totalParticipants: participants?.length || 0,
        totalWeeks: weeks?.length || 0,
        totalReviews: reviews?.length || 0,
        totalRS500Albums: rs500Albums?.length || 0,
      },
    };

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="album-club-backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export data" },
      { status: 500 }
    );
  }
}
