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

type WeekWithReviewStatus = Week & {
  reviews: {
    contemporary: Review | null;
    classic: Review | null;
  };
  isPastDeadline: boolean;
  isCurrentWeek: boolean;
};

// Helper function to check if deadline has passed
function isPastDeadline(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

// Helper function to determine current week
function determineCurrentWeek(allWeeks: Week[]): number | null {
  if (allWeeks.length === 0) return null;

  // Find weeks that haven't passed deadline
  const nonPastWeeks = allWeeks.filter(w => !isPastDeadline(w.response_deadline));

  // If there are non-past weeks, return the latest one
  if (nonPastWeeks.length > 0) {
    return Math.max(...nonPastWeeks.map(w => w.week_number));
  }

  // Otherwise, return the most recent week
  return Math.max(...allWeeks.map(w => w.week_number));
}

// GET /api/my-reviews - Get all reviews for the authenticated user
export async function GET(request: Request) {
  try {
    const supabase = createServerClient() as any;

    // Development mode: Allow email parameter for testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    const url = new URL(request.url);
    const devEmail = url.searchParams.get('email');

    let participant;

    if (isDevelopment && devEmail) {
      // Development bypass - look up participant by email
      const { data, error: participantError } = await supabase
        .from("participants")
        .select("id, name, is_curator")
        .eq("email", devEmail)
        .single();

      participant = data;

      if (participantError || !participant) {
        return NextResponse.json(
          {
            error: "Participant not found with that email.",
            details: `Email: ${devEmail}`
          },
          { status: 404 }
        );
      }
    } else {
      // Production: Require authentication
      const session = await requireAuth();

      // Get participant ID and curator status from auth user ID
      const { data, error: participantError } = await supabase
        .from("participants")
        .select("id, name, is_curator")
        .eq("auth_user_id", session.user.id)
        .single();

      participant = data;

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

    // Fetch ALL weeks (not just weeks with reviews)
    const { data: allWeeks, error: allWeeksError } = await supabase
      .from("weeks")
      .select("*")
      .order("week_number", { ascending: false });

    if (allWeeksError) {
      console.error("Error fetching weeks:", allWeeksError);
      throw allWeeksError;
    }

    // Create a map of week_number -> { contemporary, classic } reviews
    const reviewsMap = new Map<number, { contemporary: Review | null; classic: Review | null }>();
    (reviews || []).forEach((review: Review) => {
      if (!reviewsMap.has(review.week_number)) {
        reviewsMap.set(review.week_number, { contemporary: null, classic: null });
      }
      const weekReviews = reviewsMap.get(review.week_number)!;
      if (review.album_type === 'contemporary') {
        weekReviews.contemporary = review;
      } else if (review.album_type === 'classic') {
        weekReviews.classic = review;
      }
    });

    // Determine which week is "current"
    const currentWeekNumber = determineCurrentWeek(allWeeks || []);

    // Build WeekWithReviewStatus array
    const weeksWithStatus: WeekWithReviewStatus[] = (allWeeks || []).map((week: Week) => ({
      ...week,
      reviews: reviewsMap.get(week.week_number) || { contemporary: null, classic: null },
      isPastDeadline: isPastDeadline(week.response_deadline),
      isCurrentWeek: week.week_number === currentWeekNumber,
    }));

    // For backwards compatibility, also build the old reviewsWithWeeks format
    const weekNumbers = [...new Set((reviews || []).map((r: Review) => r.week_number))];
    const { data: weeks, error: weeksDataError } = weekNumbers.length > 0
      ? await supabase
          .from("weeks")
          .select("*")
          .in("week_number", weekNumbers)
      : { data: [], error: null };

    if (weeksDataError) {
      console.error("Error fetching weeks for reviews:", weeksDataError);
      throw weeksDataError;
    }

    const weeksMap = new Map((weeks || []).map((w: Week) => [w.week_number, w]));
    const reviewsWithWeeks = (reviews || []).map((r: Review) => ({
      ...r,
      week: weeksMap.get(r.week_number) || null,
    }));

    const totalWeeks = allWeeks?.length || 0;

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
        allWeeks: weeksWithStatus,
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
