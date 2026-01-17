import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabaseClient";
import { createApiLogger } from "@/lib/logger";
import { requireCurator } from "@/lib/auth/utils";
import { renderEmailTemplate, renderReminderEmailTemplate } from "@/lib/email/emailBuilder";
import * as Sentry from "@sentry/nextjs";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const logger = createApiLogger(requestId);

  try {
    const session = await requireCurator();
    const { id } = await params;
    const { participant_ids: participantIds } = await request.json();

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: "participant_ids is required" },
        { status: 400 }
      );
    }
    const uniqueParticipantIds = Array.from(new Set(participantIds));

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

    const { data: curator } = await supabase
      .from("participants")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single();

    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("id, name, email, unsubscribe_token, email_subscribed, reminder_email_subscribed, reminder_unsubscribe_token")
      .in("id", uniqueParticipantIds)
      .is("deleted_at", null);

    if (participantsError) {
      throw participantsError;
    }

    const participantMap = new Map(
      (participants || []).map((participant: any) => [participant.id, participant])
    );
    const missingIds = uniqueParticipantIds.filter(
      (participantId: string) => !participantMap.has(participantId)
    );
    const isReminder = send.email_type === "reminder";
    const isEligible = (participant: any) =>
      participant.email_subscribed &&
      (!isReminder || participant.reminder_email_subscribed);
    const eligibleParticipants = (participants || []).filter(isEligible);
    const unsubscribed = (participants || []).filter(
      (participant: any) => !isEligible(participant)
    );

    if (eligibleParticipants.length === 0) {
      return NextResponse.json(
        {
          error: "No eligible participants found",
          missing_ids: missingIds,
          unsubscribed_ids: unsubscribed.map((participant: any) => participant.id),
        },
        { status: 404 }
      );
    }

    const resendSendId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("email_sends").insert({
      id: resendSendId,
      week_number: send.week_number,
      email_type: send.email_type,
      subject: send.subject,
      html_body: send.html_body,
      text_body: send.text_body,
      created_by: curator?.id ?? null,
      source_send_id: send.id,
    });

    if (insertError) {
      throw insertError;
    }

    const logEmailAttempt = async (
      participantId: string,
      participantEmail: string,
      status: "sent" | "failed",
      resendId?: string,
      errorMessage?: string
    ) => {
      try {
        await supabase.from("email_logs").insert({
          week_number: send.week_number,
          participant_id: participantId,
          participant_email: participantEmail,
          status,
          resend_id: resendId,
          error_message: errorMessage,
        });
      } catch (logError) {
        logger.error(
          "Failed to log resend attempt",
          { participantEmail, requestId },
          logError instanceof Error ? logError : new Error(String(logError))
        );
      }
    };

    const logEmailSendRecipient = async (
      participantId: string,
      participantEmail: string,
      status: "sent" | "failed",
      resendId?: string,
      errorMessage?: string
    ) => {
      try {
        await supabase.from("email_send_recipients").insert({
          send_id: resendSendId,
          participant_id: participantId,
          participant_email: participantEmail,
          status,
          sent_at: new Date().toISOString(),
          resend_id: resendId,
          error_message: errorMessage,
        });
      } catch (logError) {
        logger.error(
          "Failed to log resend recipient",
          { participantEmail, requestId },
          logError instanceof Error ? logError : new Error(String(logError))
        );
      }
    };

    const template = {
      subject: send.subject,
      htmlBody: send.html_body,
      textBody: send.text_body,
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const sendEmail = async (participant: any) => {
      const personalized = isReminder
        ? renderReminderEmailTemplate(template, {
            id: participant.id,
            email: participant.email,
            name: participant.name,
            reminder_unsubscribe_token: participant.reminder_unsubscribe_token,
          })
        : renderEmailTemplate(template, {
            id: participant.id,
            email: participant.email,
            name: participant.name,
            unsubscribe_token: participant.unsubscribe_token,
          });

      try {
        const result = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Album Club <onboarding@resend.dev>",
          replyTo: process.env.RESEND_REPLY_TO_EMAIL,
          to: participant.email,
          subject: personalized.subject,
          html: personalized.htmlBody,
          text: personalized.textBody,
        });

        await logEmailAttempt(participant.id, participant.email, "sent", result.data?.id);
        await logEmailSendRecipient(participant.id, participant.email, "sent", result.data?.id);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await logEmailAttempt(participant.id, participant.email, "failed", undefined, errorMessage);
        await logEmailSendRecipient(participant.id, participant.email, "failed", undefined, errorMessage);
        throw error;
      }
    };

    const results: PromiseSettledResult<unknown>[] = [];
    for (let i = 0; i < eligibleParticipants.length; i += 2) {
      const batch = eligibleParticipants
        .slice(i, i + 2)
        .map((participant: any) => sendEmail(participant));
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);

      if (i + 2 < eligibleParticipants.length) {
        await sleep(1000);
      }
    }

    const sentCount = results.filter((result) => result.status === "fulfilled").length;
    const failedCount = results.filter((result) => result.status === "rejected").length;

    return NextResponse.json({
      resend_send_id: resendSendId,
      queued_count: eligibleParticipants.length,
      sent: sentCount,
      failed: failedCount,
      missing_ids: missingIds,
      unsubscribed_ids: unsubscribed.map((participant: any) => participant.id),
    });
  } catch (error) {
    logger.error(
      "Resend request failed",
      { requestId, errorMessage: error instanceof Error ? error.message : "Unknown error" },
      error instanceof Error ? error : new Error(String(error))
    );

    Sentry.captureException(error, {
      tags: { endpoint: "/api/email/send-history/:id/resend" },
      extra: { requestId },
    });

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Curator access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Failed to resend email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
