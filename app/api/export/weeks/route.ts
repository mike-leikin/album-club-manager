import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCuratorApi } from "@/lib/auth/apiAuth";

function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = [
    "Week Number",
    "Deadline",
    "Contemporary Title",
    "Contemporary Artist",
    "Contemporary Year",
    "Contemporary Spotify URL",
    "Classic Title",
    "Classic Artist",
    "Classic Year",
    "Classic Spotify URL",
    "RS Rank",
    "Review Count",
    "Avg Contemporary Rating",
    "Avg Classic Rating",
  ];

  const rows = data.map((week) => [
    week.week_number,
    week.response_deadline || "",
    week.contemporary_title || "",
    week.contemporary_artist || "",
    week.contemporary_year || "",
    week.contemporary_spotify_url || "",
    week.classic_title || "",
    week.classic_artist || "",
    week.classic_year || "",
    week.classic_spotify_url || "",
    week.rs_rank || "",
    week.review_count || 0,
    week.avg_contemporary_rating || "",
    week.avg_classic_rating || "",
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export async function GET(request: NextRequest) {
  // Check auth first
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Fetch all weeks
    const { data: weeks, error: weeksError } = await supabase
      .from("weeks")
      .select("*")
      .order("week_number");

    if (weeksError) {
      throw new Error("Failed to fetch weeks");
    }

    // Fetch all reviews to calculate stats
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("week_number, contemporary_rating, classic_rating");

    if (reviewsError) {
      throw new Error("Failed to fetch reviews");
    }

    // Calculate stats per week
    const weekStats = (reviews || []).reduce((acc: any, review: any) => {
      if (!acc[review.week_number]) {
        acc[review.week_number] = {
          count: 0,
          contemporaryTotal: 0,
          contemporaryCount: 0,
          classicTotal: 0,
          classicCount: 0,
        };
      }

      acc[review.week_number].count++;

      if (review.contemporary_rating !== null) {
        acc[review.week_number].contemporaryTotal += review.contemporary_rating;
        acc[review.week_number].contemporaryCount++;
      }

      if (review.classic_rating !== null) {
        acc[review.week_number].classicTotal += review.classic_rating;
        acc[review.week_number].classicCount++;
      }

      return acc;
    }, {});

    // Add stats to weeks
    const weeksWithStats = (weeks || []).map((week: any) => {
      const stats = weekStats[week.week_number] || {
        count: 0,
        contemporaryTotal: 0,
        contemporaryCount: 0,
        classicTotal: 0,
        classicCount: 0,
      };

      return {
        ...week,
        review_count: stats.count,
        avg_contemporary_rating:
          stats.contemporaryCount > 0
            ? (stats.contemporaryTotal / stats.contemporaryCount).toFixed(1)
            : null,
        avg_classic_rating:
          stats.classicCount > 0
            ? (stats.classicTotal / stats.classicCount).toFixed(1)
            : null,
      };
    });

    if (format === "csv") {
      const csv = convertToCSV(weeksWithStats);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="album-club-weeks-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON format
    return new NextResponse(JSON.stringify(weeksWithStats, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="album-club-weeks-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export weeks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export weeks" },
      { status: 500 }
    );
  }
}
