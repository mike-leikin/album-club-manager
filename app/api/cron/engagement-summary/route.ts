import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabaseClient";
import {
  getCurators,
  buildEngagementSummaryEmail,
  type EngagementSummaryRecipient,
} from "@/lib/email/adminNotifications";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("Authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Find weekly sends from 3–14 days ago that haven't had a summary sent yet
  const { data: pendingSends, error: sendsError } = await supabase
    .from("email_sends")
    .select("id, week_number, subject, created_at")
    .eq("email_type", "weekly_prompt")
    .lte("created_at", threeDaysAgo)
    .gte("created_at", fourteenDaysAgo)
    .is("engagement_summary_sent_at", null)
    .order("created_at", { ascending: false });

  if (sendsError) {
    console.error("Failed to fetch pending sends:", sendsError);
    return NextResponse.json({ error: sendsError.message }, { status: 500 });
  }

  if (!pendingSends || pendingSends.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const curators = await getCurators(supabase);
  if (curators.length === 0) {
    return NextResponse.json({ processed: 0, reason: "no curators" });
  }

  let processed = 0;

  for (const send of pendingSends) {
    // Fetch engagement data for this send
    const { data: rows, error: rowsError } = await supabase
      .from("email_send_recipients")
      .select("participant_email, opened_at, clicked_at, status, participant:participants(name)")
      .eq("send_id", send.id)
      .eq("status", "sent");

    if (rowsError) {
      console.error(`Failed to fetch recipients for send ${send.id}:`, rowsError);
      continue;
    }

    const recipients: EngagementSummaryRecipient[] = (rows || []).map((r: any) => ({
      name: r.participant?.name || r.participant_email,
      email: r.participant_email,
      opened: !!r.opened_at,
      clicked: !!r.clicked_at,
    }));

    const sentCount = recipients.length;
    const openedCount = recipients.filter((r) => r.opened).length;
    const clickedCount = recipients.filter((r) => r.clicked).length;

    const emailContent = buildEngagementSummaryEmail({
      weekNumber: send.week_number,
      subject: send.subject,
      sentAt: send.created_at,
      sentCount,
      openedCount,
      clickedCount,
      recipients,
    });

    // Send to all curators
    await Promise.allSettled(
      curators.map((curator) =>
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Album Club <onboarding@resend.dev>",
          replyTo: process.env.RESEND_REPLY_TO_EMAIL,
          to: curator.email,
          subject: emailContent.subject,
          html: emailContent.htmlBody,
          text: emailContent.textBody,
        })
      )
    );

    // Mark summary as sent
    await supabase
      .from("email_sends")
      .update({ engagement_summary_sent_at: new Date().toISOString() })
      .eq("id", send.id);

    processed++;
  }

  return NextResponse.json({ processed });
}
