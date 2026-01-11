import { NextResponse } from "next/server";
import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { createServerClient } from "@/lib/supabaseClient";
import { createApiLogger } from "@/lib/logger";
import {
  buildReviewConfirmationEmail,
  type ReviewConfirmationReview,
  type WeekData,
} from "@/lib/email/emailBuilder";

const resend = new Resend(process.env.RESEND_API_KEY);

type ReviewSubmission = {
  week_number: number;
  participant_email: string;
  contemporary?: {
    rating: number;
    favorite_track?: string;
    review_text?: string;
  };
  classic?: {
    rating: number;
    favorite_track?: string;
    review_text?: string;
  };
};

const MAX_REVIEW_TEXT_LENGTH = 2000;

const getTrimmedLength = (value?: string | null): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return value.trim().length;
};

const buildLengthContext = (body?: ReviewSubmission | null) => ({
  review_text_lengths: {
    contemporary: getTrimmedLength(body?.contemporary?.review_text),
    classic: getTrimmedLength(body?.classic?.review_text),
  },
  favorite_track_lengths: {
    contemporary: getTrimmedLength(body?.contemporary?.favorite_track),
    classic: getTrimmedLength(body?.classic?.favorite_track),
  },
});

const buildSupabaseErrorDetails = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return null;
  }

  const supabaseError = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };

  return {
    message: supabaseError.message ?? null,
    code: supabaseError.code ?? null,
    details: supabaseError.details ?? null,
    hint: supabaseError.hint ?? null,
  };
};

function deriveParticipantName(email: string): string {
  const localPart = email.split("@")[0] || "";
  const cleaned = localPart.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "Guest Reviewer";
  }
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// POST /api/reviews/submit - Submit reviews for a week
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const logger = createApiLogger(requestId);
  const responseHeaders = { "X-Request-Id": requestId };
  const respond = (payload: Record<string, unknown>, init?: ResponseInit) =>
    NextResponse.json(
      { ...payload, request_id: requestId },
      {
        ...init,
        headers: {
          ...responseHeaders,
          ...(init?.headers || {}),
        },
      }
    );

  let supabase: any;
  let body: ReviewSubmission | null = null;
  let normalizedEmail: string | null = null;
  const userAgent = request.headers.get("user-agent") ?? null;

  const getParticipantEmail = () =>
    normalizedEmail ?? body?.participant_email?.trim() ?? null;

  const buildLogContext = () => {
    const lengthContext = buildLengthContext(body);

    return {
      request_id: requestId,
      week_number: body?.week_number ?? null,
      participant_email: getParticipantEmail(),
      has_contemporary: Boolean(body?.contemporary),
      has_classic: Boolean(body?.classic),
      contemporary_rating: body?.contemporary?.rating ?? null,
      classic_rating: body?.classic?.rating ?? null,
      review_text_lengths: lengthContext.review_text_lengths,
      favorite_track_lengths: lengthContext.favorite_track_lengths,
    };
  };

  const buildMetadata = () => {
    const lengthContext = buildLengthContext(body);

    return {
      contemporary_rating: body?.contemporary?.rating ?? null,
      classic_rating: body?.classic?.rating ?? null,
      review_text_lengths: lengthContext.review_text_lengths,
      favorite_track_lengths: lengthContext.favorite_track_lengths,
      user_agent: userAgent,
    };
  };

  const logSubmissionFailure = async ({
    status,
    errorMessage,
    errorCode,
    errorDetails,
    participantId,
  }: {
    status: "validation_failed" | "participant_not_found" | "db_error" | "unexpected_error";
    errorMessage: string;
    errorCode?: string | null;
    errorDetails?: Record<string, unknown> | null;
    participantId?: string | null;
  }) => {
    if (!supabase) {
      return;
    }

    try {
      await supabase.from("review_submission_logs").insert({
        request_id: requestId,
        week_number: body?.week_number ?? null,
        participant_email: getParticipantEmail(),
        participant_id: participantId ?? null,
        status,
        error_message: errorMessage,
        error_code: errorCode ?? null,
        error_details: errorDetails ?? null,
        metadata: buildMetadata(),
      });
    } catch (logError) {
      logger.warn("review_submit.log_persist_failed", { request_id: requestId }, logError as Error);
    }
  };

  const respondValidationError = async (message: string) => {
    logger.warn("review_submit.validation_failed", {
      ...buildLogContext(),
      validation_error: message,
    });
    await logSubmissionFailure({
      status: "validation_failed",
      errorMessage: message,
    });
    return respond({ error: message }, { status: 400 });
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase = createServerClient() as any;
    body = (await request.json()) as ReviewSubmission;

    const rawEmail = body.participant_email?.trim() ?? "";
    normalizedEmail = rawEmail ? rawEmail.toLowerCase() : null;

    logger.info("review_submit.received", buildLogContext());

    // Validation
    if (!body.week_number || body.week_number < 1) {
      return respondValidationError("Valid week number is required");
    }

    if (!body.participant_email?.trim()) {
      return respondValidationError("Email is required");
    }

    if (!body.contemporary && !body.classic) {
      return respondValidationError("At least one album review is required");
    }

    if (!normalizedEmail) {
      return respondValidationError("Email is required");
    }

    const derivedName = deriveParticipantName(normalizedEmail);

    // Find or create participant by email
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, name, email")
      .eq("email", normalizedEmail)
      .single();

    let participantId = participant?.id;
    let participantName = participant?.name?.trim() || derivedName;

    if (!participantId) {
      const { data: createdParticipant, error: createError } = await supabase
        .from("participants")
        .insert({
          email: normalizedEmail,
          name: participantName,
        })
        .select("id, name, email")
        .single();

      if (createError || !createdParticipant) {
        const { data: existingParticipant } = await supabase
          .from("participants")
          .select("id, name, email")
          .eq("email", normalizedEmail)
          .single();

        if (!existingParticipant?.id) {
          const errorMessage =
            createError instanceof Error
              ? createError.message
              : participantError instanceof Error
              ? participantError.message
              : "Participant not found";

          const errorDetails = buildSupabaseErrorDetails(createError || participantError);

          logger.warn("review_submit.participant_not_found", {
            ...buildLogContext(),
            error_message: errorMessage,
          });

          await logSubmissionFailure({
            status: "participant_not_found",
            errorMessage,
            errorCode: errorDetails?.code ?? null,
            errorDetails: errorDetails ?? null,
          });

          return respond({ error: errorMessage }, { status: 500 });
        }

        participantId = existingParticipant.id;
        participantName = existingParticipant.name?.trim() || participantName;
      } else {
        participantId = createdParticipant.id;
        participantName = createdParticipant.name?.trim() || participantName;
      }
    }

    const reviewsToInsert: Array<{
      week_number: number;
      participant_id: string;
      album_type: "contemporary" | "classic";
      rating: number;
      favorite_track: string | null;
      review_text: string | null;
      moderation_status: string;
    }> = [];

    // Prepare contemporary review
    if (body.contemporary?.rating) {
      if (body.contemporary.rating < 0 || body.contemporary.rating > 10) {
        return respondValidationError("Contemporary rating must be between 0 and 10");
      }

      const contemporaryReviewText = body.contemporary.review_text?.trim();
      if (
        contemporaryReviewText &&
        contemporaryReviewText.length > MAX_REVIEW_TEXT_LENGTH
      ) {
        return respondValidationError(
          `Contemporary review text must be ${MAX_REVIEW_TEXT_LENGTH} characters or fewer`
        );
      }

      // Delete existing contemporary review for this week/participant
      await supabase
        .from("reviews")
        .delete()
        .eq("week_number", body.week_number)
        .eq("participant_id", participantId)
        .eq("album_type", "contemporary");

      reviewsToInsert.push({
        week_number: body.week_number,
        participant_id: participantId,
        album_type: "contemporary",
        rating: body.contemporary.rating,
        favorite_track: body.contemporary.favorite_track?.trim() || null,
        review_text: contemporaryReviewText || null,
        moderation_status: "pending",
      });
    }

    // Prepare classic review
    if (body.classic?.rating) {
      if (body.classic.rating < 0 || body.classic.rating > 10) {
        return respondValidationError("Classic rating must be between 0 and 10");
      }

      const classicReviewText = body.classic.review_text?.trim();
      if (classicReviewText && classicReviewText.length > MAX_REVIEW_TEXT_LENGTH) {
        return respondValidationError(
          `Classic review text must be ${MAX_REVIEW_TEXT_LENGTH} characters or fewer`
        );
      }

      // Delete existing classic review for this week/participant
      await supabase
        .from("reviews")
        .delete()
        .eq("week_number", body.week_number)
        .eq("participant_id", participantId)
        .eq("album_type", "classic");

      reviewsToInsert.push({
        week_number: body.week_number,
        participant_id: participantId,
        album_type: "classic",
        rating: body.classic.rating,
        favorite_track: body.classic.favorite_track?.trim() || null,
        review_text: classicReviewText || null,
        moderation_status: "pending",
      });
    }

    // Insert reviews
    const { data, error } = await supabase
      .from("reviews")
      .insert(reviewsToInsert)
      .select();

    if (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Database insert failed";
      const errorDetails = buildSupabaseErrorDetails(error);

      logger.error(
        "review_submit.db_insert_failed",
        {
          ...buildLogContext(),
          participant_id: participantId,
          supabase_error: errorDetails,
        },
        error instanceof Error ? error : undefined
      );

      await logSubmissionFailure({
        status: "db_error",
        errorMessage,
        errorCode: errorDetails?.code ?? null,
        errorDetails: errorDetails ?? null,
        participantId,
      });

      return respond({ error: errorMessage }, { status: 500 });
    }

    const logEmailAttempt = async (
      status: "sent" | "failed",
      resendId?: string,
      errorMessage?: string
    ) => {
      try {
        await supabase.from("email_logs").insert({
          week_number: body.week_number,
          participant_id: participantId,
          participant_email: normalizedEmail,
          status,
          resend_id: resendId,
          error_message: errorMessage,
        });
      } catch (logError) {
        console.error("Failed to log review confirmation email attempt", logError);
      }
    };

    const confirmationReviews: ReviewConfirmationReview[] = (
      (data || reviewsToInsert) as Array<{
        album_type: "contemporary" | "classic";
        rating: number;
        favorite_track: string | null;
        review_text: string | null;
        moderation_status?: string | null;
      }>
    ).map((review) => ({
      albumType: review.album_type,
      rating: review.rating,
      favoriteTrack: review.favorite_track,
      reviewText: review.review_text,
      moderationStatus: review.moderation_status ?? "pending",
    }));

    let weekData: WeekData = { week_number: body.week_number };
    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select(
        "week_number, created_at, contemporary_title, contemporary_artist, contemporary_year, classic_title, classic_artist, classic_year"
      )
      .eq("week_number", body.week_number)
      .single();

    if (weekError) {
      console.error("Failed to load week data for confirmation email", weekError);
      Sentry.captureException(weekError, {
        tags: { endpoint: "/api/reviews/submit", action: "review_confirmation_week_fetch" },
        extra: { weekNumber: body.week_number },
      });
    } else if (week) {
      weekData = week;
    }

    try {
      const emailContent = buildReviewConfirmationEmail(
        weekData,
        { email: normalizedEmail, name: participantName },
        confirmationReviews
      );
      const result = await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "Album Club <onboarding@resend.dev>",
        replyTo: process.env.RESEND_REPLY_TO_EMAIL,
        to: normalizedEmail,
        subject: emailContent.subject,
        html: emailContent.htmlBody,
        text: emailContent.textBody,
      });

      await logEmailAttempt("sent", result.data?.id);
    } catch (emailError) {
      const errorMessage =
        emailError instanceof Error ? emailError.message : "Unknown error";
      await logEmailAttempt("failed", undefined, errorMessage);
      console.error("Review confirmation email send failed", emailError);
      Sentry.captureException(emailError, {
        tags: { endpoint: "/api/reviews/submit", action: "review_confirmation_email" },
        extra: { participantEmail: normalizedEmail, weekNumber: body.week_number },
      });
    }

    logger.info("review_submit.success", {
      request_id: requestId,
      participant_id: participantId,
      week_number: body.week_number,
      inserted_count: reviewsToInsert.length,
    });

    return respond({
      success: true,
      message: `Successfully submitted ${reviewsToInsert.length} review(s)`,
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit reviews";
    const errorDetails = buildSupabaseErrorDetails(error);

    logger.error(
      "review_submit.unexpected_error",
      {
        ...buildLogContext(),
        error_message: message,
        supabase_error: errorDetails,
      },
      error instanceof Error ? error : undefined
    );

    await logSubmissionFailure({
      status: "unexpected_error",
      errorMessage: message,
      errorCode: errorDetails?.code ?? null,
      errorDetails: errorDetails ?? null,
    });

    return respond({ error: message }, { status: 500 });
  }
}
