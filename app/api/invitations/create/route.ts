import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireAuth } from "@/lib/auth/utils";

type CreateInvitationPayload = {
  invitee_email?: string;
  invitee_name?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Get current participant
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, name, email, referral_count")
      .eq("auth_user_id", session.user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = (await request.json()) as CreateInvitationPayload;
    const inviteeEmail = body.invitee_email?.trim().toLowerCase();
    const inviteeName = body.invitee_name?.trim();

    if (!inviteeEmail || !isValidEmail(inviteeEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Prevent self-invitation
    if (inviteeEmail === participant.email.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot invite yourself." },
        { status: 400 }
      );
    }

    // Check if invitee email already exists as a participant
    const { data: existingParticipant } = await supabase
      .from("participants")
      .select("id, email")
      .ilike("email", inviteeEmail)
      .limit(1)
      .single();

    if (existingParticipant) {
      return NextResponse.json(
        { error: "This person is already a member of Album Club." },
        { status: 409 }
      );
    }

    // Check for existing pending invitation for this email
    const { data: existingInvitation } = await supabase
      .from("invitations")
      .select("id, status, referrer_id")
      .eq("invitee_email", inviteeEmail)
      .eq("status", "pending")
      .limit(1)
      .single();

    if (existingInvitation) {
      if (existingInvitation.referrer_id === participant.id) {
        return NextResponse.json(
          { error: "You already have a pending invitation for this email." },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          { error: "This person has already been invited by someone else." },
          { status: 409 }
        );
      }
    }

    // Create invitation record
    const { data: invitation, error: insertError } = await supabase
      .from("invitations")
      .insert({
        referrer_id: participant.id,
        invitee_email: inviteeEmail,
        invitee_name: inviteeName || null,
        invite_method: "email",
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create invitation:", insertError);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    // TODO: Send curator notification email
    // This will be implemented in Phase 5 (Email Templates)

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        invitee_email: invitation.invitee_email,
        invitee_name: invitation.invitee_name,
        status: invitation.status,
        created_at: invitation.created_at,
      },
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    const message =
      error instanceof Error ? error.message : "Unable to create invitation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
