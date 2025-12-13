import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

type Params = {
  params: Promise<{ rank: string }>;
};

export async function PATCH(_request: Request, { params }: Params) {
  try {
    const { rank } = await params;
    const rankNumber = Number(rank);

    if (!Number.isFinite(rankNumber) || rankNumber < 1 || rankNumber > 500) {
      return NextResponse.json({ error: "Invalid rank" }, { status: 400 });
    }

    const supabase = createServerClient() as any;

    // Get current week number from latest week
    const { data: weekData } = await supabase
      .from("weeks")
      .select("*")
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    const currentWeek = weekData?.week_number || 0;

    // Get current album to read times_used
    const { data: album, error: fetchError } = await supabase
      .from("rs_500_albums")
      .select("*")
      .eq("rank", rankNumber)
      .single();

    if (fetchError || !album) {
      console.error("Error fetching album:", fetchError);
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 }
      );
    }

    const newTimesUsed = album.times_used + 1;

    // Update times_used and last_used_week
    const { error } = await supabase
      .from("rs_500_albums")
      .update({
        times_used: newTimesUsed,
        last_used_week: currentWeek,
        updated_at: new Date().toISOString(),
      })
      .eq("rank", rankNumber);

    if (error) {
      console.error("Error tracking usage:", error);
      return NextResponse.json(
        { error: "Failed to track usage" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to track usage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
