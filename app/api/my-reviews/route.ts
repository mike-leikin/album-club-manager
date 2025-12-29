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

    // Get participant ID and curator status from auth user ID
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, name, is_curator")
      .eq("auth_user_id", session.user.id)
      .single();

    if (participantError || !participant) {
      console.error("Participant lookup failed:", {
        auth_user_id: session.user.id,
        email: session.user.email,
        error: participantError?.message,
      });

      return NextResponse.json(
        {
          error: "Participant not found. Your account may not be linked to a participant record.",
          details: `Logged in as: ${session.user.email}. Please contact the curator to link your account.`
        },
        { status: 404 }
      );
    }

    // Fetch all reviews for this participant
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("*")
      .eq("participant_id", participant.id)
      .order("week_number", { ascending: false });

    if (reviewsError) {
      console.error("Error fetching reviews:", reviewsError);
      throw reviewsError;
    }

    // Fetch week data for all unique week numbers
    const weekNumbers = [...new Set((reviews || []).map((r: Review) => r.week_number))];
    const { data: weeks, error: weeksDataError } = weekNumbers.length > 0
      ? await supabase
          .from("weeks")
          .select("*")
          .in("week_number", weekNumbers)
      : { data: [], error: null };

    if (weeksDataError) {
      console.error("Error fetching weeks:", weeksDataError);
      throw weeksDataError;
    }

    // Map weeks to reviews
    const weeksMap = new Map((weeks || []).map((w: Week) => [w.week_number, w]));
    const reviewsWithWeeks = (reviews || []).map((r: Review) => ({
      ...r,
      week: weeksMap.get(r.week_number) || null,
    }));

    // Fetch total weeks count
    const { count: totalWeeks, error: weeksError } = await supabase
      .from("weeks")
      .select("*", { count: "exact", head: true });

    if (weeksError) {
      throw weeksError;
    }

    // Calculate statistics
    const contemporaryReviews = reviewsWithWeeks.filter(
      (r: any) => r.album_type === "contemporary"
    );
    const classicReviews = reviewsWithWeeks.filter(
      (r: any) => r.album_type === "classic"
    );

    const calcAvg = (reviewList: any[]) => {
      if (reviewList.length === 0) return null;
      const sum = reviewList.reduce((acc, r) => acc + Number(r.rating), 0);
      return Math.round((sum / reviewList.length) * 10) / 10;
    };

    // Count unique weeks reviewed
    const uniqueWeeks = new Set(reviewsWithWeeks.map((r: any) => r.week_number));

    const stats: ReviewStats = {
      totalReviews: reviewsWithWeeks.length,
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
        reviews: reviewsWithWeeks,
        stats,
        participant: {
          name: participant.name,
          isCurator: participant.is_curator,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("my-reviews API error:", error);
    const message =
      error instanceof Error ? error.message : "Unable to fetch reviews";
    const stack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json({
      error: message,
      details: stack,
      type: typeof error,
    }, { status: 500 });
  }
}
