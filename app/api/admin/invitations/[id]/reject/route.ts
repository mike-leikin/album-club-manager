import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCurator } from "@/lib/auth/utils";

type RejectPayload = {
  reason?: string;
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
    const body = (await request.json()) as RejectPayload;
    const reason = body.reason?.trim();

    // Get curator participant ID
    const { data: curator, error: curatorError } = await supabase
      .from("participants")
      .select("id")
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
      .select("id, status")
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Type assertion for invitation status
    const invitationStatus = invitation.status as string;
    if (invitationStatus !== "pending") {
      return NextResponse.json(
        { error: `Invitation is ${invitationStatus}, not pending` },
        { status: 400 }
      );
    }

    // Update invitation to rejected
    const { error: updateError } = await supabase
      .from("invitations")
      .update({
        status: "rejected",
        reviewed_by: curator.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reason || null,
      })
      .eq("id", invitationId);

    if (updateError) {
      console.error("Failed to reject invitation:", updateError);
      return NextResponse.json(
        { error: "Failed to reject invitation" },
        { status: 500 }
      );
    }

    // TODO: Optionally send notification to referrer
    // This will be implemented in Phase 5 (Email Templates)

    return NextResponse.json({
      success: true,
      message: "Invitation rejected",
    });
  } catch (error) {
    console.error("Error rejecting invitation:", error);
    const message =
      error instanceof Error ? error.message : "Unable to reject invitation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
