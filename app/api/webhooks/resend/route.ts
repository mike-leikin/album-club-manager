import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServerClient } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
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
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const supabase = createServerClient();
  const emailId = event.data?.email_id;

  if (!emailId) {
    return NextResponse.json({ received: true });
  }

  if (event.type === "email.opened") {
    await supabase
      .from("email_send_recipients")
      .update({ opened_at: new Date().toISOString() })
      .eq("resend_id", emailId)
      .is("opened_at", null);
  } else if (event.type === "email.clicked") {
    await supabase
      .from("email_send_recipients")
      .update({ clicked_at: new Date().toISOString() })
      .eq("resend_id", emailId)
      .is("clicked_at", null);
  }

  return NextResponse.json({ received: true });
}
