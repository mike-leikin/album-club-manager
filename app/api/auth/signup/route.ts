import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseClient";

type SignupPayload = {
  name?: string;
  email?: string;
  acceptedTerms?: boolean;
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

    const adminClient = createServerClient() as any;
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
      if (shouldUpdateExistingName(existingParticipant.name, email)) {
        const { error: updateError } = await adminClient
          .from("participants")
          .update({ name })
          .eq("id", existingParticipant.id);

        if (updateError) {
          throw updateError;
        }
      }
    } else {
      const { error: insertError } = await adminClient
        .from("participants")
        .insert({ name, email, is_curator: false });

      if (insertError) {
        if (insertError.code === "23505") {
          return NextResponse.json(
            { error: "Account already exists. Please log in instead." },
            { status: 409 }
          );
        }
        throw insertError;
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
