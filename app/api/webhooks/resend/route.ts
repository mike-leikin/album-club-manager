import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServerClient } from "@/lib/supabaseClient";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 400 });
  }

  const body = await request.text();

  let event: { type: string; data: { email_id: string } };
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch {
    console.error("[resend-webhook] Signature verification failed — check RESEND_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const emailId = event.data?.email_id;

  console.log(`[resend-webhook] Received ${event.type} for email_id=${emailId ?? "(none)"}`);

  if (!emailId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServerClient();

  if (event.type === "email.opened") {
    const { data: updated, error } = await supabase
      .from("email_send_recipients")
      .update({ opened_at: new Date().toISOString() })
      .eq("resend_id", emailId)
      .is("opened_at", null)
      .select("id");

    if (error) {
      console.error("[resend-webhook] DB update failed for email.opened:", error.message);
      Sentry.captureException(error, { extra: { emailId, eventType: event.type } });
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      console.warn(`[resend-webhook] email.opened: no recipient matched resend_id=${emailId} (already recorded or unknown ID)`);
    }
  } else if (event.type === "email.clicked") {
    const { data: updated, error } = await supabase
      .from("email_send_recipients")
      .update({ clicked_at: new Date().toISOString() })
      .eq("resend_id", emailId)
      .is("clicked_at", null)
      .select("id");

    if (error) {
      console.error("[resend-webhook] DB update failed for email.clicked:", error.message);
      Sentry.captureException(error, { extra: { emailId, eventType: event.type } });
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      console.warn(`[resend-webhook] email.clicked: no recipient matched resend_id=${emailId} (already recorded or unknown ID)`);
    }
  }

  return NextResponse.json({ received: true });
}
