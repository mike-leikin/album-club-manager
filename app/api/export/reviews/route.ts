import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCuratorApi } from "@/lib/auth/apiAuth";

function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";

  // Define headers
  const headers = [
    "Week Number",
    "Participant Name",
    "Participant Email",
    "Contemporary Album",
    "Contemporary Artist",
    "Contemporary Rating",
    "Contemporary Favorite Track",
    "Contemporary Comments",
    "Classic Album",
    "Classic Artist",
    "Classic Rating",
    "Classic Favorite Track",
    "Classic Comments",
    "Submitted At",
  ];

  // Create CSV rows
  const rows = data.map((review) => [
    review.week_number,
    review.participant?.name || "",
    review.participant?.email || "",
    review.contemporary_album || "",
    review.contemporary_artist || "",
    review.contemporary_rating || "",
    review.contemporary_favorite_track || "",
    review.contemporary_comments ? `"${review.contemporary_comments.replace(/"/g, '""')}"` : "",
    review.classic_album || "",
    review.classic_artist || "",
    review.classic_rating || "",
    review.classic_favorite_track || "",
    review.classic_comments ? `"${review.classic_comments.replace(/"/g, '""')}"` : "",
    review.created_at || "",
  ]);

  // Combine headers and rows
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export async function GET(request: NextRequest) {
  // Check auth first
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json"; // json or csv

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Fetch all reviews with participant details
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select(`
        *,
        participant:participants(name, email)
      `)
      .order("week_number")
      .order("created_at");

    if (error) {
      throw new Error("Failed to fetch reviews");
    }

    if (format === "csv") {
      const csv = convertToCSV(reviews || []);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="album-club-reviews-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON format
    return new NextResponse(JSON.stringify(reviews || [], null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="album-club-reviews-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export reviews error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export reviews" },
      { status: 500 }
    );
  }
}
