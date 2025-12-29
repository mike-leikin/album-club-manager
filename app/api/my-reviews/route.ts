import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireAuth } from "@/lib/auth/utils";
import type { Review, Week } from "@/lib/types/database";

type ReviewWithWeek = Review & {
  week: Week;
};

type ReviewStats = {
  totalReviews: number;
  contemporaryCount: number;
  classicCount: number;
  avgContemporaryRating: number | null;
  avgClassicRating: number | null;
  participationRate: number;
  totalWeeks: number;
};

// GET /api/my-reviews - Get all reviews for the authenticated user
export async function GET() {
  try {
    // Require authentication
    const session = await requireAuth();

    const supabase = createServerClient() as any;

    // Get participant ID from auth user ID
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Fetch all reviews for this participant with week data
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select(
        `
        *,
        week:weeks!inner(*)
      `
      )
      .eq("participant_id", participant.id)
      .order("week_number", { ascending: false });

    if (reviewsError) {
      throw reviewsError;
    }

    // Fetch total weeks count
    const { count: totalWeeks, error: weeksError } = await supabase
      .from("weeks")
      .select("*", { count: "exact", head: true });

    if (weeksError) {
      throw weeksError;
    }

    // Calculate statistics
    const contemporaryReviews = (reviews || []).filter(
      (r: Review) => r.album_type === "contemporary"
    );
    const classicReviews = (reviews || []).filter(
      (r: Review) => r.album_type === "classic"
    );

    const calcAvg = (reviewList: Review[]) => {
      if (reviewList.length === 0) return null;
      const sum = reviewList.reduce((acc, r) => acc + Number(r.rating), 0);
      return Math.round((sum / reviewList.length) * 10) / 10;
    };

    // Count unique weeks reviewed
    const uniqueWeeks = new Set((reviews || []).map((r: Review) => r.week_number));

    const stats: ReviewStats = {
      totalReviews: (reviews || []).length,
      contemporaryCount: contemporaryReviews.length,
      classicCount: classicReviews.length,
      avgContemporaryRating: calcAvg(contemporaryReviews),
      avgClassicRating: calcAvg(classicReviews),
      participationRate:
        totalWeeks && totalWeeks > 0
          ? Math.round((uniqueWeeks.size / totalWeeks) * 100)
          : 0,
      totalWeeks: totalWeeks || 0,
    };

    return NextResponse.json({
      data: {
        reviews: reviews || [],
        stats,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch reviews";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
