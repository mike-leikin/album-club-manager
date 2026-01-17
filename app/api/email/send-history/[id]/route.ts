import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCurator } from "@/lib/auth/utils";
import { renderEmailTemplate, renderReminderEmailTemplate } from "@/lib/email/emailBuilder";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCurator();
    const { id } = await params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    const { data: send, error: sendError } = await supabase
      .from("email_sends")
      .select("*")
      .eq("id", id)
      .single();

    if (sendError || !send) {
      return NextResponse.json({ error: "Send not found" }, { status: 404 });
    }

    const { data: recipients, error: recipientsError } = await supabase
      .from("email_send_recipients")
      .select(`
        id,
        participant_id,
        participant_email,
        status,
        sent_at,
        resend_id,
        error_message,
        participant:participants(id, name, email, unsubscribe_token, reminder_unsubscribe_token)
      `)
      .eq("send_id", id)
      .order("sent_at", { ascending: false });

    if (recipientsError) {
      throw recipientsError;
    }

    let preview: { html_body: string; text_body: string } | null = null;
    const previewRecipient = (recipients || []).find(
      (recipient: any) => recipient.participant
    );

    if (previewRecipient?.participant) {
      const template = {
        subject: send.subject,
        htmlBody: send.html_body,
        textBody: send.text_body,
      };
      const isReminder = send.email_type === "reminder";
      const previewContent = isReminder
        ? renderReminderEmailTemplate(template, {
            id: previewRecipient.participant.id,
            email: previewRecipient.participant.email,
            name: previewRecipient.participant.name,
            reminder_unsubscribe_token: previewRecipient.participant.reminder_unsubscribe_token,
          })
        : renderEmailTemplate(template, {
            id: previewRecipient.participant.id,
            email: previewRecipient.participant.email,
            name: previewRecipient.participant.name,
            unsubscribe_token: previewRecipient.participant.unsubscribe_token,
          });

      preview = {
        html_body: previewContent.htmlBody,
        text_body: previewContent.textBody,
      };
    }

    const sanitizedRecipients = (recipients || []).map((recipient: any) => ({
      id: recipient.id,
      participant_id: recipient.participant_id,
      participant_email: recipient.participant_email,
      status: recipient.status,
      sent_at: recipient.sent_at,
      resend_id: recipient.resend_id,
      error_message: recipient.error_message,
      participant: recipient.participant
        ? {
            id: recipient.participant.id,
            name: recipient.participant.name,
            email: recipient.participant.email,
          }
        : null,
    }));

    return NextResponse.json({
      send,
      recipients: sanitizedRecipients,
      preview,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Curator access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch email send";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
