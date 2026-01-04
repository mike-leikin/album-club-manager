import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCurator } from "@/lib/auth/utils";

type ApprovePayload = {
  notes?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require curator authentication
    const session = await requireCurator();
    const supabase = createServerClient();

    const { id: invitationId } = await params;
    const body = (await request.json()) as ApprovePayload;
    const notes = body.notes?.trim();

    // Get curator participant ID
    const { data: curator, error: curatorError } = await supabase
      .from("participants")
      .select("id, name")
      .eq("auth_user_id", session.user.id)
      .single();

    if (curatorError || !curator) {
      return NextResponse.json(
        { error: "Curator not found" },
        { status: 404 }
      );
    }

    // Fetch invitation to verify it exists and is pending
    const { data: invitation, error: fetchError } = await supabase
      .from("invitations")
      .select(
        `
        id,
        invitee_email,
        invitee_name,
        invite_token,
        status,
        referrer:participants!invitations_referrer_id_fkey(
          id,
          name,
          email
        )
      `
      )
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Invitation is ${invitation.status}, not pending` },
        { status: 400 }
      );
    }

    // Update invitation to approved
    const { error: updateError } = await supabase
      .from("invitations")
      .update({
        status: "approved",
        reviewed_by: curator.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      })
      .eq("id", invitationId);

    if (updateError) {
      console.error("Failed to approve invitation:", updateError);
      return NextResponse.json(
        { error: "Failed to approve invitation" },
        { status: 500 }
      );
    }

    // TODO: Send approval email to invitee with signup link
    // TODO: Send notification to referrer that invite was approved
    // This will be implemented in Phase 5 (Email Templates)

    return NextResponse.json({
      success: true,
      message: "Invitation approved successfully",
    });
  } catch (error) {
    console.error("Error approving invitation:", error);
    const message =
      error instanceof Error ? error.message : "Unable to approve invitation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
