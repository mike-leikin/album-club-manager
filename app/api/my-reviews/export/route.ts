import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireAuth } from "@/lib/auth/utils";
import type { Review, Week } from "@/lib/types/database";

type ParticipantSummary = { id: string; name: string };

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convertToCSV(reviews: Review[], weeksByNumber: Map<number, Week>): string {
  const headers = [
    "Week Number",
    "Album Type",
    "Album Title",
    "Artist",
    "Year",
    "Your Rating",
    "Favorite Track",
    "Review",
    "Album Recommendation",
    "Reviewed At",
  ];

  const rows = reviews.map((review) => {
    const week = weeksByNumber.get(review.week_number);
    const isContemporary = review.album_type === "contemporary";
    const title = week ? (isContemporary ? week.contemporary_title : week.classic_title) : null;
    const artist = week ? (isContemporary ? week.contemporary_artist : week.classic_artist) : null;
    const year = week ? (isContemporary ? week.contemporary_year : week.classic_year) : null;

    return [
      review.week_number,
      isContemporary ? "Contemporary" : "Classic",
      title,
      artist,
      year,
      review.rating,
      review.favorite_track,
      review.review_text,
      review.album_recommendation,
      review.created_at,
    ]
      .map(escapeCsvField)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// GET /api/my-reviews/export - Download the authenticated user's own reviews as CSV
export async function GET(request: Request) {
  try {
    const supabase = createServerClient();

    const isDevelopment = process.env.NODE_ENV === "development";
    const url = new URL(request.url);
    const devEmail = url.searchParams.get("email");

    let participant: ParticipantSummary | null = null;

    if (isDevelopment && devEmail) {
      const { data, error: participantError } = await supabase
        .from("participants")
        .select("id, name")
        .eq("email", devEmail)
        .single();

      participant = data;

      if (participantError || !participant) {
        return NextResponse.json(
          { error: "Participant not found with that email.", details: `Email: ${devEmail}` },
          { status: 404 }
        );
      }
    } else {
      const session = await requireAuth();

      const { data, error: participantError } = await supabase
        .from("participants")
        .select("id, name")
        .eq("auth_user_id", session.user.id)
        .single();

      participant = data;

      if (participantError || !participant) {
        return NextResponse.json(
          {
            error: "Participant not found. Your account may not be linked to a participant record.",
            details: `Logged in as: ${session.user.email}. Please contact the curator to link your account.`,
          },
          { status: 404 }
        );
      }
    }

    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("*")
      .eq("participant_id", participant.id)
      .order("week_number", { ascending: true });

    if (reviewsError) {
      throw reviewsError;
    }

    // Contemporary before classic within the same week
    const sortedReviews = [...(reviews || [])].sort((a, b) => {
      if (a.week_number !== b.week_number) return a.week_number - b.week_number;
      return a.album_type === b.album_type ? 0 : a.album_type === "contemporary" ? -1 : 1;
    });

    const weekNumbers = [...new Set(sortedReviews.map((r) => r.week_number))];
    const { data: weeks, error: weeksError } =
      weekNumbers.length > 0
        ? await supabase.from("weeks").select("*").in("week_number", weekNumbers)
        : { data: [] as Week[], error: null };

    if (weeksError) {
      throw weeksError;
    }

    const weeksByNumber = new Map((weeks || []).map((w) => [w.week_number, w]));
    const csv = convertToCSV(sortedReviews, weeksByNumber);
    const filenameSafeName = participant.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

    return new NextResponse(`﻿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameSafeName}-album-ratings-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Export my reviews error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export reviews" },
      { status: 500 }
    );
  }
}
