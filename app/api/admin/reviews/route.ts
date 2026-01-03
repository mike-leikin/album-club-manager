import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCurator } from "@/lib/auth/utils";

// GET /api/admin/reviews - Fetch all reviews with filters for admin panel
export async function GET(request: NextRequest) {
  try {
    await requireCurator();
    const { searchParams } = new URL(request.url);

    // Query parameters
    const weekNumber = searchParams.get("week_number");
    const status = searchParams.get("status"); // pending, approved, hidden
    const participantId = searchParams.get("participant_id");
    const albumType = searchParams.get("album_type"); // contemporary, classic

    const supabase = createServerClient() as any;

    let query = supabase
      .from("reviews")
      .select(`
        *,
        participant:participants!reviews_participant_id_fkey(id, name, email),
        moderator:participants!reviews_moderated_by_fkey(id, name, email)
      `)
      .order("created_at", { ascending: false });

    // Apply filters
    if (weekNumber) query = query.eq("week_number", parseInt(weekNumber));
    if (status && status !== 'all') query = query.eq("moderation_status", status);
    if (participantId) query = query.eq("participant_id", participantId);
    if (albumType && albumType !== 'all') query = query.eq("album_type", albumType);

    const { data: reviews, error } = await query;

    if (error) throw error;

    // Calculate summary statistics
    const stats = {
      total: reviews.length,
      pending: reviews.filter((r: any) => r.moderation_status === 'pending').length,
      approved: reviews.filter((r: any) => r.moderation_status === 'approved').length,
      hidden: reviews.filter((r: any) => r.moderation_status === 'hidden').length,
    };

    return NextResponse.json({ data: { reviews, stats } });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: "Curator access required" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Unable to fetch reviews";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
