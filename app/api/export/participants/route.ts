import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCuratorApi } from "@/lib/auth/apiAuth";

function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = ["Name", "Email", "Total Reviews", "Created At"];

  const rows = data.map((p) => [
    p.name,
    p.email,
    p.review_count || 0,
    p.created_at || "",
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

    const supabase = createServerClient() as any;

    // Fetch participants
    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("*")
      .order("name");

    if (participantsError) {
      throw new Error("Failed to fetch participants");
    }

    // Get review counts for each participant
    const { data: reviewCounts, error: reviewError } = await supabase
      .from("reviews")
      .select("participant_id");

    if (reviewError) {
      throw new Error("Failed to fetch review counts");
    }

    // Count reviews per participant
    const counts = (reviewCounts || []).reduce((acc: any, review: any) => {
      acc[review.participant_id] = (acc[review.participant_id] || 0) + 1;
      return acc;
    }, {});

    // Add review counts to participants
    const participantsWithCounts = (participants || []).map((p: any) => ({
      ...p,
      review_count: counts[p.id] || 0,
    }));

    if (format === "csv") {
      const csv = convertToCSV(participantsWithCounts);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="album-club-participants-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON format
    return new NextResponse(JSON.stringify(participantsWithCounts, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="album-club-participants-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export participants error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export participants" },
      { status: 500 }
    );
  }
}
