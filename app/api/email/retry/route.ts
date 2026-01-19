import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabaseClient";
import { formatDateOnlyEastern } from "@/lib/utils/dates";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { weekNumber, participantIds } = await request.json();

    if (!weekNumber) {
      return NextResponse.json(
        { error: "Week number is required" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Fetch week data
    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("*")
      .eq("week_number", weekNumber)
      .single();

    if (weekError || !week) {
      return NextResponse.json(
        { error: "Week not found" },
        { status: 404 }
      );
    }

    // Fetch participants who need retry
    let participantQuery = supabase
      .from("participants")
      .select("*");

    if (participantIds && participantIds.length > 0) {
      participantQuery = participantQuery.in('id', participantIds);
    } else {
      // If no specific participants, get all who have failed emails for this week
      const { data: failedLogs } = await supabase
        .from('email_logs')
        .select('participant_id')
        .eq('week_number', weekNumber)
        .eq('status', 'failed');

      if (failedLogs && failedLogs.length > 0) {
        const failedIds = failedLogs.map((log: any) => log.participant_id).filter(Boolean);
        if (failedIds.length > 0) {
          participantQuery = participantQuery.in('id', failedIds);
        } else {
          return NextResponse.json(
            { error: "No failed emails found for this week" },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "No failed emails found for this week" },
          { status: 404 }
        );
      }
    }

    const { data: participants, error: participantsError } = await participantQuery;

    if (participantsError || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: "No participants found to retry" },
        { status: 404 }
      );
    }

    // Fetch previous week's review stats (same logic as send-week)
    let reviewStats = null;
    const prevWeek = weekNumber - 1;
    if (prevWeek > 0) {
      const { data: stats } = await supabase
        .from("reviews")
        .select(`
          *,
          participant:participants!reviews_participant_id_fkey(name)
        `)
        .eq("week_number", prevWeek);

      if (stats && stats.length > 0) {
        const contempReviews = stats.filter((r: any) => r.contemporary_rating !== null);
        const classicReviews = stats.filter((r: any) => r.classic_rating !== null);

        reviewStats = {
          prevWeek,
          contemporary: {
            avgRating: contempReviews.length > 0
              ? (contempReviews.reduce((sum: number, r: any) => sum + r.contemporary_rating, 0) / contempReviews.length).toFixed(1)
              : null,
            count: contempReviews.length,
            favoriteTracks: contempReviews
              .filter((r: any) => r.contemporary_favorite_track)
              .map((r: any) => ({ track: r.contemporary_favorite_track, name: r.participant.name }))
              .slice(0, 3),
          },
          classic: {
            avgRating: classicReviews.length > 0
              ? (classicReviews.reduce((sum: number, r: any) => sum + r.classic_rating, 0) / classicReviews.length).toFixed(1)
              : null,
            count: classicReviews.length,
            favoriteTracks: classicReviews
              .filter((r: any) => r.classic_favorite_track)
              .map((r: any) => ({ track: r.classic_favorite_track, name: r.participant.name }))
              .slice(0, 3),
          },
        };
      }
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
        console.error('Failed to log email attempt:', logError);
      }
    };

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
      return formatDateOnlyEastern(dateStr, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    const weekLabel = formatWeekLabel(week.created_at, weekNumber);

    // Format deadline
    const formatDeadline = (dateStr: string) => {
      return formatDateOnlyEastern(dateStr, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Build and send emails (same logic as send-week route)
    const sendEmail = async (participant: any) => {
      const submitUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/submit?email=${encodeURIComponent(participant.email)}`;
      const firstName = participant.name.split(' ')[0];

      // Build HTML email body (simplified - copy from send-week if needed)
      let htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Album Club – ${weekLabel}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: sans-serif;">
  <h1>Album Club - ${weekLabel}</h1>
  <p>Hi ${firstName},</p>
  <p>This is a retry of the email for ${weekLabel}.</p>
  <a href="${submitUrl}">Submit Your Review</a>
</body>
</html>`;

      let textBody = `Hi ${firstName},\n\nThis is a retry of the email for ${weekLabel}.\n\nSubmit your review here:\n${submitUrl}\n\n- Mike`;

      try {
        const result = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Album Club <onboarding@resend.dev>",
          replyTo: process.env.RESEND_REPLY_TO_EMAIL,
          to: participant.email,
          subject: `Album Club – ${weekLabel}`,
          html: htmlBody,
          text: textBody,
        });

        await logEmailAttempt(
          participant.id,
          participant.email,
          'sent',
          result.data?.id
        );

        return result;
      } catch (error) {
        await logEmailAttempt(
          participant.id,
          participant.email,
          'failed',
          undefined,
          error instanceof Error ? error.message : 'Unknown error'
        );

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

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failedCount,
      total: participants.length,
    });
  } catch (error) {
    console.error("Email retry error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry emails" },
      { status: 500 }
    );
  }
}
