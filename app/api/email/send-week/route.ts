import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabaseClient";
import { createApiLogger } from "@/lib/logger";
import { requireCuratorApi } from "@/lib/auth/apiAuth";
import { buildWeeklyEmailTemplate, renderEmailTemplate } from "@/lib/email/emailBuilder";
import type { ReviewStats } from "@/lib/email/emailBuilder";
import * as Sentry from "@sentry/nextjs";
import { createServerClient as createAuthClient } from "@supabase/ssr";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // Check auth first
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  const requestId = crypto.randomUUID();
  const logger = createApiLogger(requestId);

  try {
    logger.info("Email send request received", { requestId });
    const { weekNumber } = await request.json();

    if (!weekNumber) {
      logger.warn("Email send request missing week number", { requestId });
      return NextResponse.json(
        { error: "Week number is required" },
        { status: 400 }
      );
    }

    logger.info("Sending emails for week", { weekNumber, requestId });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Fetch week data
    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("*")
      .eq("week_number", weekNumber)
      .single();

    if (weekError || !week) {
      logger.error("Week not found", { weekNumber, requestId }, weekError);
      return NextResponse.json(
        { error: "Week not found" },
        { status: 404 }
      );
    }

    // Fetch all active, subscribed participants
    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("*")
      .is("deleted_at", null)
      .eq("email_subscribed", true)
      .order("name");

    if (participantsError || !participants || participants.length === 0) {
      logger.error("No participants found", { weekNumber, requestId }, participantsError);
      return NextResponse.json(
        { error: "No participants found" },
        { status: 404 }
      );
    }

    logger.info("Participants loaded", { count: participants.length, weekNumber, requestId });

    const formatWeekLabel = (
      dateStr: string | null | undefined,
      fallbackWeekNumber?: number
    ) => {
      if (!dateStr) {
        return fallbackWeekNumber ? `Week ${fallbackWeekNumber}` : "Album Club";
      }
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return fallbackWeekNumber ? `Week ${fallbackWeekNumber}` : "Album Club";
      }
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    // Fetch previous week's review stats (if available, only approved reviews)
    let reviewStats: ReviewStats | null = null;
    const prevWeek = weekNumber - 1;
    if (prevWeek > 0) {
      const { data: stats, error: statsError } = await supabase
        .from("reviews")
        .select(`
          *,
          participant:participants!reviews_participant_id_fkey(name)
        `)
        .eq("week_number", prevWeek)
        .eq("moderation_status", "approved");

      if (statsError) {
        logger.warn("Failed to load previous week review stats", {
          weekNumber,
          requestId,
          error: statsError.message,
        });
      }

      if (stats && stats.length > 0) {
        let prevWeekLabel = `Week ${prevWeek}`;
        const { data: prevWeekData, error: prevWeekError } = await supabase
          .from("weeks")
          .select("created_at")
          .eq("week_number", prevWeek)
          .single();
        if (!prevWeekError && prevWeekData?.created_at) {
          prevWeekLabel = formatWeekLabel(prevWeekData.created_at, prevWeek);
        }

        // Calculate stats (supports current and legacy review schemas)
        const contempRatings: number[] = [];
        const classicRatings: number[] = [];
        const contempFavorites: Array<{ track: string; name: string }> = [];
        const classicFavorites: Array<{ track: string; name: string }> = [];

        const addRating = (target: number[], value: any) => {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) {
            target.push(parsed);
          }
        };

        const addFavorite = (
          target: Array<{ track: string; name: string }>,
          track: any,
          name: string | null | undefined
        ) => {
          if (typeof track !== "string") return;
          const trimmed = track.trim();
          if (!trimmed) return;
          target.push({ track: trimmed, name: name?.trim() || "Unknown" });
        };

        stats.forEach((review: any) => {
          const participantName = review.participant?.name ?? "Unknown";
          if (review.album_type === "contemporary") {
            addRating(contempRatings, review.rating);
            addFavorite(contempFavorites, review.favorite_track, participantName);
            return;
          }
          if (review.album_type === "classic") {
            addRating(classicRatings, review.rating);
            addFavorite(classicFavorites, review.favorite_track, participantName);
            return;
          }

          // Legacy combined review rows (pre album_type)
          if (review.contemporary_rating !== null && review.contemporary_rating !== undefined) {
            addRating(contempRatings, review.contemporary_rating);
            addFavorite(
              contempFavorites,
              review.contemporary_favorite_track,
              participantName
            );
          }
          if (review.classic_rating !== null && review.classic_rating !== undefined) {
            addRating(classicRatings, review.classic_rating);
            addFavorite(
              classicFavorites,
              review.classic_favorite_track,
              participantName
            );
          }
        });

        reviewStats = {
          prevWeek,
          prevWeekLabel,
          contemporary: {
            avgRating: contempRatings.length > 0
              ? (contempRatings.reduce((sum, rating) => sum + rating, 0) / contempRatings.length).toFixed(1)
              : null,
            count: contempRatings.length,
            favoriteTracks: contempFavorites.slice(0, 3),
          },
          classic: {
            avgRating: classicRatings.length > 0
              ? (classicRatings.reduce((sum, rating) => sum + rating, 0) / classicRatings.length).toFixed(1)
              : null,
            count: classicRatings.length,
            favoriteTracks: classicFavorites.slice(0, 3),
          },
        };
      }
    }

    let curatorId: string | null = null;
    const hasCookieStore = typeof (request as any).cookies?.get === "function";
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
        logger.warn("Failed to resolve curator user for email send", {
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

    const emailTemplate = buildWeeklyEmailTemplate(week, reviewStats);
    const sendId = crypto.randomUUID();
    let activeSendId: string | null = sendId;

    try {
      const { error: sendInsertError } = await supabase.from("email_sends").insert({
        id: sendId,
        week_number: weekNumber,
        email_type: "weekly_prompt",
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
        "Failed to create email send record",
        { weekNumber, requestId },
        sendLogError instanceof Error ? sendLogError : new Error(String(sendLogError))
      );
    }

    // Helper function to log email attempts
    const logEmailAttempt = async (
      participantId: string, // UUID from participants table
      participantEmail: string,
      status: 'sent' | 'failed',
      resendId?: string,
      errorMessage?: string
    ) => {
      try {
        await supabase.from('email_logs').insert({
          week_number: weekNumber,
          participant_id: participantId,
          participant_email: participantEmail,
          status,
          resend_id: resendId,
          error_message: errorMessage,
        });
      } catch (logError) {
        // Don't fail the email send if logging fails
        logger.error('Failed to log email attempt to database', {
          participantEmail,
          weekNumber,
          requestId
        }, logError instanceof Error ? logError : new Error(String(logError)));
      }
    };

    const logEmailSendRecipient = async (
      participantId: string,
      participantEmail: string,
      status: 'sent' | 'failed',
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
          "Failed to log email send recipient",
          { participantEmail, weekNumber, requestId },
          logError instanceof Error ? logError : new Error(String(logError))
        );
      }
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Send individual emails
    const sendEmail = async (participant: any) => {
      const personalized = renderEmailTemplate(emailTemplate, {
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

        await logEmailAttempt(participant.id, participant.email, 'sent', result.data?.id);
        await logEmailSendRecipient(participant.id, participant.email, 'sent', result.data?.id);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Email send failed', {
          participant: participant.email,
          weekNumber,
          requestId,
          error: errorMessage,
        });

        await logEmailAttempt(participant.id, participant.email, 'failed', undefined, errorMessage);
        await logEmailSendRecipient(participant.id, participant.email, 'failed', undefined, errorMessage);
        throw error;
      }
    };

    const results: PromiseSettledResult<unknown>[] = [];
    for (let i = 0; i < participants.length; i += 2) {
      const batch = participants.slice(i, i + 2).map((participant: any) => sendEmail(participant));
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);

      if (i + 2 < participants.length) {
        await sleep(1000);
      }
    }

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.filter((r) => r.status === "rejected").length;

    // Log detailed results
    const failedEmails = results
      .map((r, i) => ({ result: r, participant: participants[i] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ result, participant }) => ({
        email: participant.email,
        error: result.status === 'rejected' ? result.reason : null
      }));

    if (failedCount > 0) {
      logger.warn('Some emails failed to send', {
        weekNumber,
        total: participants.length,
        sent: successCount,
        failed: failedCount,
        failedEmails,
        requestId
      });
    } else {
      logger.info('All emails sent successfully', {
        weekNumber,
        total: participants.length,
        requestId
      });
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failedCount,
      total: participants.length,
    });
  } catch (error) {
    logger.error("Email send error", {
      requestId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : new Error(String(error)));

    Sentry.captureException(error, {
      tags: { endpoint: '/api/email/send-week' },
      extra: { requestId }
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send emails" },
      { status: 500 }
    );
  }
}
