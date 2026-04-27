import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCuratorApi } from "@/lib/auth/apiAuth";

export async function POST(request: NextRequest) {
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  try {
    const supabase = createServerClient();
    const { weekNumber } = await request.json();

    if (!weekNumber || !Number.isFinite(Number(weekNumber))) {
      return NextResponse.json({ error: "Invalid week number" }, { status: 400 });
    }

    const { data: week, error: fetchError } = await supabase
      .from("weeks")
      .select("week_number, published_at")
      .eq("week_number", weekNumber)
      .single();

    if (fetchError || !week) {
      return NextResponse.json({ error: "Week not found" }, { status: 404 });
    }

    if (week.published_at) {
      return NextResponse.json({ error: "Week is already published" }, { status: 409 });
    }

    const publishedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("weeks")
      .update({ published_at: publishedAt })
      .eq("week_number", weekNumber);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, published_at: publishedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
