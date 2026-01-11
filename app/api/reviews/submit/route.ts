import { NextResponse } from "next/server";
import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { createServerClient } from "@/lib/supabaseClient";
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
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;
    const body = (await request.json()) as ReviewSubmission;

    // Validation
    if (!body.week_number || body.week_number < 1) {
      return NextResponse.json(
        { error: "Valid week number is required" },
        { status: 400 }
      );
    }

    if (!body.participant_email?.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!body.contemporary && !body.classic) {
      return NextResponse.json(
        { error: "At least one album review is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = body.participant_email.trim().toLowerCase();
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
          throw createError || participantError;
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
        return NextResponse.json(
          { error: "Contemporary rating must be between 0 and 10" },
          { status: 400 }
        );
      }

      const contemporaryReviewText = body.contemporary.review_text?.trim();
      if (
        contemporaryReviewText &&
        contemporaryReviewText.length > MAX_REVIEW_TEXT_LENGTH
      ) {
        return NextResponse.json(
          {
            error: `Contemporary review text must be ${MAX_REVIEW_TEXT_LENGTH} characters or fewer`,
          },
          { status: 400 }
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
        return NextResponse.json(
          { error: "Classic rating must be between 0 and 10" },
          { status: 400 }
        );
      }

      const classicReviewText = body.classic.review_text?.trim();
      if (classicReviewText && classicReviewText.length > MAX_REVIEW_TEXT_LENGTH) {
        return NextResponse.json(
          {
            error: `Classic review text must be ${MAX_REVIEW_TEXT_LENGTH} characters or fewer`,
          },
          { status: 400 }
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
      throw error;
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

    return NextResponse.json({
      success: true,
      message: `Successfully submitted ${reviewsToInsert.length} review(s)`,
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit reviews";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
