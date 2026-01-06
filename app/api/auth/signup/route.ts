import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseClient";

type SignupPayload = {
  name?: string;
  email?: string;
  acceptedTerms?: boolean;
  invite_token?: string;
};

function sanitizeName(value: string) {
  const withoutTags = value.replace(/<[^>]*>/g, "");
  return withoutTags.replace(/\s+/g, " ").trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function shouldUpdateExistingName(existingName: string, email: string) {
  const normalizedExisting = existingName.trim().toLowerCase();
  const emailPrefix = email.split("@")[0] || "";
  return (
    normalizedExisting.length === 0 ||
    normalizedExisting === email ||
    normalizedExisting === emailPrefix
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupPayload;
    const rawName = typeof body.name === "string" ? body.name : "";
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const name = sanitizeName(rawName);
    const email = rawEmail.trim().toLowerCase();
    const acceptedTerms = body.acceptedTerms === true;
    const inviteToken = body.invite_token;

    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Please provide your full name." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!acceptedTerms) {
      return NextResponse.json(
        { error: "You must accept the terms to continue." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = createServerClient() as any;

    // If invite token provided, verify it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let invitation: any = null;
    if (inviteToken) {
      const { data: inviteData, error: inviteError } = await adminClient
        .from("invitations")
        .select(
          `
          id,
          invitee_email,
          status,
          referrer_id,
          referrer:participants!invitations_referrer_id_fkey(
            id,
            name,
            referral_count
          )
        `
        )
        .eq("invite_token", inviteToken)
        .single();

      if (inviteError || !inviteData) {
        return NextResponse.json(
          { error: "Invalid or expired invitation link." },
          { status: 400 }
        );
      }

      if (inviteData.status !== "approved") {
        return NextResponse.json(
          { error: "This invitation has not been approved yet." },
          { status: 400 }
        );
      }

      if (inviteData.invitee_email.toLowerCase() !== email) {
        return NextResponse.json(
          { error: "Email does not match the invitation." },
          { status: 400 }
        );
      }

      invitation = inviteData;
    }
    const { data: existingParticipants, error: existingError } =
      await adminClient
        .from("participants")
        .select("id, name, email, auth_user_id")
        .ilike("email", email)
        .limit(1);

    if (existingError) {
      throw existingError;
    }

    const existingParticipant = existingParticipants?.[0];

    if (existingParticipant?.auth_user_id) {
      return NextResponse.json(
        { error: "Account already exists. Please log in instead." },
        { status: 409 }
      );
    }

    if (existingParticipant?.id) {
      // Update existing participant
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      if (shouldUpdateExistingName(existingParticipant.name, email)) {
        updateData.name = name;
      }
      if (invitation) {
        updateData.referred_by = invitation.referrer_id;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await adminClient
          .from("participants")
          .update(updateData)
          .eq("id", existingParticipant.id);

        if (updateError) {
          throw updateError;
        }
      }

      // If this was an invited signup for existing participant, update invitation and referrer
      if (invitation) {
        // Update invitation to accepted
        await adminClient
          .from("invitations")
          .update({
            status: "accepted",
            accepted_at: new Date().toISOString(),
            invitee_participant_id: existingParticipant.id,
          })
          .eq("id", invitation.id);

        // Increment referrer's referral count
        await adminClient
          .from("participants")
          .update({
            referral_count: invitation.referrer.referral_count + 1,
          })
          .eq("id", invitation.referrer_id);

        // TODO: Send success email to referrer
        // This will be implemented in Phase 5 (Email Templates)
      }
    } else {
      const { data: newParticipant, error: insertError } = await adminClient
        .from("participants")
        .insert({
          name,
          email,
          is_curator: false,
          referred_by: invitation ? invitation.referrer_id : null,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return NextResponse.json(
            { error: "Account already exists. Please log in instead." },
            { status: 409 }
          );
        }
        throw insertError;
      }

      // If this was an invited signup, update the invitation and referrer
      if (invitation && newParticipant) {
        // Update invitation to accepted
        await adminClient
          .from("invitations")
          .update({
            status: "accepted",
            accepted_at: new Date().toISOString(),
            invitee_participant_id: newParticipant.id,
          })
          .eq("id", invitation.id);

        // Increment referrer's referral count
        await adminClient
          .from("participants")
          .update({
            referral_count: invitation.referrer.referral_count + 1,
          })
          .eq("id", invitation.referrer_id);

        // TODO: Send success email to referrer
        // This will be implemented in Phase 5 (Email Templates)
      }
    }

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/auth/callback?redirect=${encodeURIComponent(
      "/welcome"
    )}`;

    const { error: otpError } = await authClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: name,
        },
      },
    });

    if (otpError) {
      throw otpError;
    }

    return NextResponse.json({
      success: true,
      message: "Check your email for a magic link.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start signup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
