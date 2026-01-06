import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Invite token is required" },
        { status: 400 }
      );
    }

    // Look up invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select(
        `
        id,
        invitee_email,
        invitee_name,
        status,
        invite_method,
        created_at,
        referrer:participants!invitations_referrer_id_fkey(
          id,
          name,
          email
        )
      `
      )
      .eq("invite_token", token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid or expired invitation link",
        },
        { status: 404 }
      );
    }

    // Check if invitation is approved
    if (invitation.status !== "approved") {
      if (invitation.status === "pending") {
        return NextResponse.json({
          valid: false,
          error: "This invitation is still awaiting curator approval",
        });
      } else if (invitation.status === "rejected") {
        return NextResponse.json({
          valid: false,
          error: "This invitation was declined",
        });
      } else if (invitation.status === "accepted") {
        return NextResponse.json({
          valid: false,
          error: "This invitation has already been used",
        });
      }
    }

    // Invitation is valid and approved
    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        invitee_email: invitation.invitee_email,
        invitee_name: invitation.invitee_name,
        referrer_name: invitation.referrer?.name || "Someone",
        created_at: invitation.created_at,
      },
    });
  } catch (error) {
    console.error("Error verifying invitation:", error);
    const message =
      error instanceof Error ? error.message : "Unable to verify invitation";
    return NextResponse.json(
      { valid: false, error: message },
      { status: 500 }
    );
  }
}
