import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabaseClient";
import { createApiLogger } from "@/lib/logger";
import { requireCuratorApi } from "@/lib/auth/apiAuth";
import {
  buildReminderEmailTemplate,
  renderReminderEmailTemplate,
} from "@/lib/email/emailBuilder";
import * as Sentry from "@sentry/nextjs";
import { createServerClient as createAuthClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

type ParticipantRow = Database["public"]["Tables"]["participants"]["Row"];
type ReviewParticipantRow = Pick<Database["public"]["Tables"]["reviews"]["Row"], "participant_id">;

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  const requestId = crypto.randomUUID();
  const logger = createApiLogger(requestId);

  try {
    const { weekNumber, dryRun = false } = await request.json();

    const supabase = createServerClient();

    const { data: currentWeek, error: currentWeekError } = await supabase
      .from("weeks")
      .select("*")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(1)
      .single();

    if (currentWeekError || !currentWeek) {
      logger.error("No current week found for reminder", { requestId }, currentWeekError);
      return NextResponse.json(
        { error: "Current week not found" },
        { status: 404 }
      );
    }

    const parsedWeekNumber = Number(weekNumber);
    if (weekNumber !== undefined && !Number.isFinite(parsedWeekNumber)) {
      return NextResponse.json(
        { error: "Invalid week number" },
        { status: 400 }
      );
    }

    const targetWeekNumber = Number.isFinite(parsedWeekNumber)
      ? parsedWeekNumber
      : currentWeek.week_number;
    if (targetWeekNumber !== currentWeek.week_number) {
      return NextResponse.json(
        {
          error: `Reminders can only be sent for the current week (Week ${currentWeek.week_number})`,
        },
        { status: 400 }
      );
    }

    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("*")
      .is("deleted_at", null)
      .eq("email_subscribed", true)
      .eq("reminder_email_subscribed", true)
      .order("name");

    if (participantsError || !participants) {
      logger.error("Failed to load participants for reminder", { requestId }, participantsError);
      return NextResponse.json(
        { error: "Failed to load participants" },
        { status: 500 }
      );
    }

    if (participants.length === 0) {
      return NextResponse.json(
        { error: "No participants found" },
        { status: 404 }
      );
    }

    const { data: reviewRows, error: reviewError } = await supabase
      .from("reviews")
      .select("participant_id")
      .eq("week_number", targetWeekNumber);

    if (reviewError) {
      logger.error("Failed to load reviews for reminder", { requestId }, reviewError);
      return NextResponse.json(
        { error: "Failed to load review data" },
        { status: 500 }
      );
    }

    const reviewedIds = new Set(
      (reviewRows as ReviewParticipantRow[] || [])
        .map((review) => review.participant_id)
        .filter((id): id is string => Boolean(id))
    );
    const recipients = participants.filter(
      (participant: ParticipantRow) => !reviewedIds.has(participant.id)
    );
    const skippedCount = participants.length - recipients.length;

    if (dryRun) {
      return NextResponse.json({
        success: true,
        week_number: targetWeekNumber,
        eligible: recipients.length,
        skipped: skippedCount,
        total: participants.length,
      });
    }

    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        skipped: skippedCount,
        total: participants.length,
      });
    }

    let curatorId: string | null = null;
    const hasCookieStore = typeof request.cookies.get === "function";
    if (
      hasCookieStore &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      const authClient = createAuthClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set() {},
            remove() {},
          },
        }
      );

      const { data: { user }, error: userError } = await authClient.auth.getUser();
      if (userError) {
        logger.warn("Failed to resolve curator user for reminder send", {
          requestId,
          error: userError.message,
        });
      }

      if (user?.id) {
        const { data: curator } = await supabase
          .from("participants")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();
        curatorId = curator?.id ?? null;
      }
    }

    const emailTemplate = buildReminderEmailTemplate(currentWeek);
    const sendId = crypto.randomUUID();
    let activeSendId: string | null = sendId;

    try {
      const { error: sendInsertError } = await supabase.from("email_sends").insert({
        id: sendId,
        week_number: targetWeekNumber,
        email_type: "reminder",
        subject: emailTemplate.subject,
        html_body: emailTemplate.htmlBody,
        text_body: emailTemplate.textBody,
        created_by: curatorId,
      });

      if (sendInsertError) {
        throw sendInsertError;
      }
    } catch (sendLogError) {
      activeSendId = null;
      logger.error(
        "Failed to create reminder email send record",
        { requestId, weekNumber: targetWeekNumber },
        sendLogError instanceof Error ? sendLogError : new Error(String(sendLogError))
      );
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
          week_number: targetWeekNumber,
          participant_id: participantId,
          participant_email: participantEmail,
          status,
          resend_id: resendId,
          error_message: errorMessage,
        });
      } catch (logError) {
        logger.error(
          "Failed to log reminder email attempt",
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
      if (!activeSendId) return;
      try {
        await supabase.from("email_send_recipients").insert({
          send_id: activeSendId,
          participant_id: participantId,
          participant_email: participantEmail,
          status,
          sent_at: new Date().toISOString(),
          resend_id: resendId,
          error_message: errorMessage,
        });
      } catch (logError) {
        logger.error(
          "Failed to log reminder email recipient",
          { participantEmail, requestId },
          logError instanceof Error ? logError : new Error(String(logError))
        );
      }
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const sendEmail = async (participant: ParticipantRow) => {
      const personalized = renderReminderEmailTemplate(emailTemplate, {
        id: participant.id,
        email: participant.email,
        name: participant.name,
        reminder_unsubscribe_token: participant.reminder_unsubscribe_token,
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
        logger.error(
          "Reminder email send failed",
          { participant: participant.email, requestId, error: errorMessage },
          error instanceof Error ? error : new Error(String(error))
        );
        await logEmailAttempt(participant.id, participant.email, "failed", undefined, errorMessage);
        await logEmailSendRecipient(participant.id, participant.email, "failed", undefined, errorMessage);
        throw error;
      }
    };

    const results: PromiseSettledResult<unknown>[] = [];
    for (let i = 0; i < recipients.length; i += 2) {
      const batch = recipients.slice(i, i + 2).map((participant) => sendEmail(participant));
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);

      if (i + 2 < recipients.length) {
        await sleep(1000);
      }
    }

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failedCount,
      skipped: skippedCount,
      total: participants.length,
    });
  } catch (error) {
    logger.error(
      "Reminder email send error",
      { requestId, errorMessage: error instanceof Error ? error.message : "Unknown error" },
      error instanceof Error ? error : new Error(String(error))
    );

    Sentry.captureException(error, {
      tags: { endpoint: "/api/email/send-reminder" },
      extra: { requestId },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reminders" },
      { status: 500 }
    );
  }
}
