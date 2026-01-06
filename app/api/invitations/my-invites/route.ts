import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireAuth } from "@/lib/auth/utils";

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Get current participant
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    // Build query
    let query = supabase
      .from("invitations")
      .select(
        `
        id,
        invitee_email,
        invitee_name,
        status,
        invite_method,
        created_at,
        reviewed_at,
        accepted_at,
        invitee_participant_id,
        invitee:participants!invitations_invitee_participant_id_fkey(
          id,
          name,
          email
        )
      `
      )
      .eq("referrer_id", participant.id)
      .order("created_at", { ascending: false });

    // Apply status filter if provided
    if (
      statusFilter &&
      ["pending", "approved", "rejected", "accepted"].includes(statusFilter)
    ) {
      query = query.eq("status", statusFilter);
    }

    const { data: invitations, error: invitationsError } = await query;

    if (invitationsError) {
      console.error("Error fetching invitations:", invitationsError);
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: invitations || [],
    });
  } catch (error) {
    console.error("Error in my-invites endpoint:", error);
    const message =
      error instanceof Error ? error.message : "Unable to fetch invitations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
