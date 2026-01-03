import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import type { Review, Participant } from "@/lib/types/database";

type ReviewWithParticipant = Review & {
  participant: Participant;
};

type ReviewStats = {
  contemporary: {
    avgRating: number | null;
    reviewCount: number;
    reviews: ReviewWithParticipant[];
  };
  classic: {
    avgRating: number | null;
    reviewCount: number;
    reviews: ReviewWithParticipant[];
  };
  totalParticipants: number;
  participationRate: number;
};

// GET /api/reviews?week_number=1 - Get all reviews for a specific week with stats
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekNumber = searchParams.get("week_number");

    if (!weekNumber) {
      return NextResponse.json(
        { error: "week_number query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient() as any;

    // Fetch reviews with participant info (only approved reviews for public)
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select(
        `
        *,
        participant:participants(*)
      `
      )
      .eq("week_number", parseInt(weekNumber))
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false });

    if (reviewsError) {
      throw reviewsError;
    }

    // Fetch total participant count
    const { count: totalParticipants, error: countError } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    // Calculate stats
    const contemporaryReviews = (reviews || []).filter(
      (r: ReviewWithParticipant) => r.album_type === "contemporary"
    );
    const classicReviews = (reviews || []).filter(
      (r: ReviewWithParticipant) => r.album_type === "classic"
    );

    const calcAvg = (reviewList: ReviewWithParticipant[]) => {
      if (reviewList.length === 0) return null;
      const sum = reviewList.reduce((acc, r) => acc + Number(r.rating), 0);
      return Math.round((sum / reviewList.length) * 10) / 10; // Round to 1 decimal
    };

    const uniqueParticipants = new Set(
      (reviews || []).map((r: ReviewWithParticipant) => r.participant_id)
    );

    const stats: ReviewStats = {
      contemporary: {
        avgRating: calcAvg(contemporaryReviews),
        reviewCount: contemporaryReviews.length,
        reviews: contemporaryReviews,
      },
      classic: {
        avgRating: calcAvg(classicReviews),
        reviewCount: classicReviews.length,
        reviews: classicReviews,
      },
      totalParticipants: totalParticipants || 0,
      participationRate:
        totalParticipants && totalParticipants > 0
          ? Math.round((uniqueParticipants.size / totalParticipants) * 100)
          : 0,
    };

    return NextResponse.json({ data: stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch reviews";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
