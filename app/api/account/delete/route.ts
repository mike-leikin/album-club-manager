import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import type { Database } from "@/lib/types/database";

export async function POST(_request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get participant data
    const { data: participant, error: fetchError } = await supabase
      .from("participants")
      .select("*")
      .eq("auth_user_id", session.user.id)
      .single<Database['public']['Tables']['participants']['Row']>();

    if (fetchError || !participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Soft delete the participant (set deleted_at timestamp)
    const updateData: Database['public']['Tables']['participants']['Update'] = {
      deleted_at: new Date().toISOString()
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from("participants").update as any)(updateData)
      .eq("id", participant.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
