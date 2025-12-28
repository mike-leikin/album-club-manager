import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCuratorApi } from "@/lib/auth/apiAuth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/participants/[id]/restore - Restore a soft-deleted participant
export async function POST(request: NextRequest, context: RouteContext) {
  // Check auth first
  const authError = await requireCuratorApi(request);
  if (authError) return authError;
  try {
    const { id } = await context.params;
    const supabase = createServerClient() as any;

    // Restore by setting deleted_at to null
    const { data, error } = await supabase
      .from("participants")
      .update({ deleted_at: null })
      .eq("id", id)
      .not("deleted_at", "is", null) // Only restore if currently deleted
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Participant not found or not deleted" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to restore participant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
