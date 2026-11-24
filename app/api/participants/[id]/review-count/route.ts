import { NextRequest, NextResponse } from "next/server";
import { requireCuratorApi } from "@/lib/auth/apiAuth";
import { createServerClient } from "@/lib/supabaseClient";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/participants/[id]/review-count - Get review count for a participant
export async function GET(request: NextRequest, context: RouteContext) {
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Get review count
    const { count, error } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("participant_id", id);

    if (error) {
      throw error;
    }

    // Get participant details
    const { data: participant } = await supabase
      .from("participants")
      .select("name, email")
      .eq("id", id)
      .single();

    return NextResponse.json({
      reviewCount: count || 0,
      participant: participant || null
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to get review count";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
