import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/participants/[id]/review-count - Get review count for a participant
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
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
