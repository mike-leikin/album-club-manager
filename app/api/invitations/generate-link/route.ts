import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

type GenerateLinkPayload = {
  participant_id?: string;
  invitee_email?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;
    const body = (await request.json()) as GenerateLinkPayload;
    const participantId = body.participant_id;
    const inviteeEmail = body.invitee_email?.trim().toLowerCase();

    if (!participantId) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    // Look up referrer participant
    const { data: referrer, error: referrerError } = await supabase
      .from("participants")
      .select("id, name, email")
      .eq("id", participantId)
      .eq("deleted_at", null)
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json(
        { error: "Referrer not found" },
        { status: 404 }
      );
    }

    // If invitee_email is provided, create the invitation immediately
    if (inviteeEmail) {
      if (!isValidEmail(inviteeEmail)) {
        return NextResponse.json(
          { error: "Please enter a valid email address." },
          { status: 400 }
        );
      }

      // Prevent self-invitation
      if (inviteeEmail === referrer.email.toLowerCase()) {
        return NextResponse.json(
          { error: "You cannot invite yourself." },
          { status: 400 }
        );
      }

      // Check if invitee email already exists as a participant
      const { data: existingParticipant } = await supabase
        .from("participants")
        .select("id")
        .ilike("email", inviteeEmail)
        .limit(1)
        .single();

      if (existingParticipant) {
        return NextResponse.json(
          { error: "This person is already a member of Album Club." },
          { status: 409 }
        );
      }

      // Check for existing pending invitation
      const { data: existingInvitation } = await supabase
        .from("invitations")
        .select("id, status")
        .eq("invitee_email", inviteeEmail)
        .eq("status", "pending")
        .limit(1)
        .single();

      if (existingInvitation) {
        return NextResponse.json(
          { error: "This person has already been invited." },
          { status: 409 }
        );
      }

      // Create invitation record
      const { data: invitation, error: insertError } = await supabase
        .from("invitations")
        .insert({
          referrer_id: referrer.id,
          invitee_email: inviteeEmail,
          invite_method: "weekly_email_forward",
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

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const signupUrl = `${appUrl}/invite/${invitation.invite_token}`;

      return NextResponse.json({
        success: true,
        invitation_id: invitation.id,
        signup_url: signupUrl,
        referrer_name: referrer.name,
      });
    }

    // If no email provided, just return referrer info for the landing page
    return NextResponse.json({
      success: true,
      referrer_id: referrer.id,
      referrer_name: referrer.name,
    });
  } catch (error) {
    console.error("Error generating invite link:", error);
    const message =
      error instanceof Error ? error.message : "Unable to generate invite link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
