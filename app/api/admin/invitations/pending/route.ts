import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCurator } from "@/lib/auth/utils";

export async function GET(request: NextRequest) {
  try {
    // Require curator authentication
    await requireCurator();
    const supabase = createServerClient();

    // Fetch all pending invitations with referrer details
    const { data: invitations, error } = await supabase
      .from("invitations")
      .select(
        `
        id,
        invitee_email,
        invitee_name,
        invite_method,
        created_at,
        referrer:participants!invitations_referrer_id_fkey(
          id,
          name,
          email,
          referral_count,
          created_at
        )
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }); // Oldest first for FIFO processing

    if (error) {
      console.error("Error fetching pending invitations:", error);
      return NextResponse.json(
        { error: "Failed to fetch pending invitations" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: invitations || [],
    });
  } catch (error) {
    console.error("Error in pending invitations endpoint:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch pending invitations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
