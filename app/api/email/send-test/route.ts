import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient as createAdminClient } from "@/lib/supabaseClient";
import { createApiLogger } from "@/lib/logger";
import { requireCuratorApi } from "@/lib/auth/apiAuth";
import { buildEmailContent, ReviewStats } from "@/lib/email/emailBuilder";
import * as Sentry from "@sentry/nextjs";
import { createServerClient } from '@supabase/ssr'
import { getFirstName } from "@/lib/utils/names";
import { formatDateOnlyEastern } from "@/lib/utils/dates";

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

    // Create Supabase client with session context from cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    );

    // Use admin client for database queries
    const adminClient = createAdminClient() as any;

    // Fetch week data
    const { data: week, error: weekError } = await adminClient
      .from("weeks")
      .select("*")
      .eq("week_number", weekNumber)
      .maybeSingle();

    if (weekError) {
      const weekLoadError = new Error(weekError.message);
      logger.error("Failed to load week for test email", { weekNumber, requestId }, weekLoadError);
      return NextResponse.json(
        { error: "Failed to load week" },
        { status: 500 }
      );
    }

    if (!week) {
      logger.info("Week not found for test email", { weekNumber, requestId });
      return NextResponse.json(
        { error: "Week not found. Please save the week first." },
        { status: 404 }
      );
    }

    // Get the authenticated user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      logger.error("Failed to get authenticated user", { requestId }, userError || undefined);
      return NextResponse.json(
        { error: "Failed to get user information" },
        { status: 401 }
      );
    }

    // Get curator's participant record using admin client
    const { data: curator, error: curatorError } = await adminClient
      .from("participants")
      .select("*")
      .eq("email", user.email)
      .eq("is_curator", true)
      .maybeSingle();

    if (curatorError) {
      const curatorLoadError = new Error(curatorError.message);
      logger.error(
        "Failed to load curator participant record",
        { email: user.email, requestId },
        curatorLoadError
      );
      return NextResponse.json(
        { error: "Failed to load curator participant record" },
        { status: 500 }
      );
    }

    if (!curator) {
      logger.info("Curator participant record not found", { email: user.email, requestId });
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
      return formatDateOnlyEastern(dateStr, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    // Fetch previous week's review stats (if available, only approved reviews)
    let reviewStats: ReviewStats | null = null;
    const prevWeek = weekNumber - 1;
    if (prevWeek > 0) {
      const { data: stats, error: statsError } = await adminClient
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
        const { data: prevWeekData, error: prevWeekError } = await adminClient
          .from("weeks")
          .select(
            "created_at, contemporary_title, contemporary_artist, classic_title, classic_artist"
          )
          .eq("week_number", prevWeek)
          .single();
        if (!prevWeekError && prevWeekData?.created_at) {
          prevWeekLabel = formatWeekLabel(prevWeekData.created_at, prevWeek);
        }

        // Calculate stats (supports current and legacy review schemas)
        const contempRatings: number[] = [];
        const classicRatings: number[] = [];
        const contempReviews: Array<{ name: string; rating: number; favoriteTrack?: string | null; reviewText: string }> = [];
        const classicReviews: Array<{ name: string; rating: number; favoriteTrack?: string | null; reviewText: string }> = [];

        const addRating = (target: number[], value: any) => {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) {
            target.push(parsed);
          }
        };

        const addReview = (
          target: Array<{ name: string; rating: number; favoriteTrack?: string | null; reviewText: string }>,
          text: any,
          name: string | null | undefined,
          rating: number | string | null | undefined,
          favoriteTrack: string | null | undefined
        ) => {
          if (typeof text !== "string") return;
          const trimmed = text.trim();
          if (!trimmed) return;
          const parsedRating = Number(rating);
          target.push({
            reviewText: trimmed,
            name: getFirstName(name),
            rating: Number.isFinite(parsedRating) ? parsedRating : 0,
            favoriteTrack: favoriteTrack?.trim() || null,
          });
        };

        stats.forEach((review: any) => {
          const participantName = review.participant?.name ?? "Unknown";
          if (review.album_type === "contemporary") {
            addRating(contempRatings, review.rating);
            addReview(contempReviews, review.review_text, participantName, review.rating, review.favorite_track);
            return;
          }
          if (review.album_type === "classic") {
            addRating(classicRatings, review.rating);
            addReview(classicReviews, review.review_text, participantName, review.rating, review.favorite_track);
            return;
          }

          // Legacy combined review rows (pre album_type)
          if (review.contemporary_rating !== null && review.contemporary_rating !== undefined) {
            addRating(contempRatings, review.contemporary_rating);
            addReview(
              contempReviews,
              review.contemporary_comments ?? review.review_text,
              participantName,
              review.contemporary_rating,
              null
            );
          }
          if (review.classic_rating !== null && review.classic_rating !== undefined) {
            addRating(classicRatings, review.classic_rating);
            addReview(
              classicReviews,
              review.classic_comments ?? review.review_text,
              participantName,
              review.classic_rating,
              null
            );
          }
        });

        const buildAlbumLabel = (artist?: string | null, title?: string | null) => {
          const safeArtist = artist?.trim();
          const safeTitle = title?.trim();
          if (safeArtist && safeTitle) return `${safeArtist} - ${safeTitle}`;
          return safeArtist || safeTitle || "Album";
        };

        // Shuffle reviews so order isn't based on submission time
        const shuffle = <T>(arr: T[]): T[] => {
          const s = [...arr];
          for (let i = s.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [s[i], s[j]] = [s[j], s[i]];
          }
          return s;
        };

        reviewStats = {
          prevWeek,
          prevWeekLabel,
          contemporary: {
            avgRating: contempRatings.length > 0
              ? (contempRatings.reduce((sum, rating) => sum + rating, 0) / contempRatings.length).toFixed(1)
              : null,
            count: contempRatings.length,
            albumLabel: buildAlbumLabel(
              prevWeekData?.contemporary_artist,
              prevWeekData?.contemporary_title
            ),
            reviews: shuffle(contempReviews),
          },
          classic: {
            avgRating: classicRatings.length > 0
              ? (classicRatings.reduce((sum, rating) => sum + rating, 0) / classicRatings.length).toFixed(1)
              : null,
            count: classicRatings.length,
            albumLabel: buildAlbumLabel(
              prevWeekData?.classic_artist,
              prevWeekData?.classic_title
            ),
            reviews: shuffle(classicReviews),
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
