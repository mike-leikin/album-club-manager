import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabaseClient";
import { createApiLogger } from "@/lib/logger";
import { requireCuratorApi } from "@/lib/auth/apiAuth";
import { buildEmailContent, ReviewStats } from "@/lib/email/emailBuilder";
import * as Sentry from "@sentry/nextjs";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // Check auth first
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  const requestId = crypto.randomUUID();
  const logger = createApiLogger(requestId);

  try {
    logger.info("Test email send request received", { requestId });
    const { weekNumber } = await request.json();

    if (!weekNumber) {
      logger.warn("Test email request missing week number", { requestId });
      return NextResponse.json(
        { error: "Week number is required" },
        { status: 400 }
      );
    }

    logger.info("Sending test email for week", { weekNumber, requestId });

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
        { error: "Week not found. Please save the week first." },
        { status: 404 }
      );
    }

    // Get the authenticated curator's email
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      logger.error("Failed to get authenticated user", { requestId }, userError);
      return NextResponse.json(
        { error: "Failed to get user information" },
        { status: 401 }
      );
    }

    // Get curator's participant record
    const { data: curator, error: curatorError } = await supabase
      .from("participants")
      .select("*")
      .eq("email", user.email)
      .eq("is_curator", true)
      .single();

    if (curatorError || !curator) {
      logger.error("Curator participant record not found", { email: user.email, requestId }, curatorError);
      return NextResponse.json(
        { error: "Curator participant record not found" },
        { status: 404 }
      );
    }

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
      const { data: stats } = await supabase
        .from("reviews")
        .select(`
          *,
          participant:participants(name)
        `)
        .eq("week_number", prevWeek)
        .eq("moderation_status", "approved");

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

        // Calculate stats
        const contempReviews = stats.filter((r: any) => r.contemporary_rating !== null);
        const classicReviews = stats.filter((r: any) => r.classic_rating !== null);

        reviewStats = {
          prevWeek,
          prevWeekLabel,
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

    // Build email content using the shared utility
    const emailContent = buildEmailContent(week, curator, reviewStats, true);

    // Send test email
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Album Club <onboarding@resend.dev>",
      replyTo: process.env.RESEND_REPLY_TO_EMAIL,
      to: curator.email,
      subject: emailContent.subject,
      html: emailContent.htmlBody,
      text: emailContent.textBody,
    });

    logger.info('Test email sent successfully', {
      weekNumber,
      recipientEmail: curator.email,
      resendId: result.data?.id,
      requestId
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${curator.email}`,
      resendId: result.data?.id,
    });
  } catch (error) {
    logger.error("Test email send error", {
      requestId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : new Error(String(error)));

    Sentry.captureException(error, {
      tags: { endpoint: '/api/email/send-test' },
      extra: { requestId }
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test email" },
      { status: 500 }
    );
  }
}
