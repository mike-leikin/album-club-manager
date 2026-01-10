import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

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

    // Find or create participant by email
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    let participantId = participant?.id;

    if (!participantId) {
      const { data: createdParticipant, error: createError } = await supabase
        .from("participants")
        .insert({
          email: normalizedEmail,
          name: deriveParticipantName(normalizedEmail),
        })
        .select("id")
        .single();

      if (createError || !createdParticipant) {
        const { data: existingParticipant } = await supabase
          .from("participants")
          .select("id")
          .eq("email", normalizedEmail)
          .single();

        if (!existingParticipant?.id) {
          throw createError || participantError;
        }

        participantId = existingParticipant.id;
      } else {
        participantId = createdParticipant.id;
      }
    }

    const reviewsToInsert = [];

    // Prepare contemporary review
    if (body.contemporary?.rating) {
      if (body.contemporary.rating < 0 || body.contemporary.rating > 10) {
        return NextResponse.json(
          { error: "Contemporary rating must be between 0 and 10" },
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
        review_text: body.contemporary.review_text?.trim() || null,
        moderation_status: 'pending',
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
        review_text: body.classic.review_text?.trim() || null,
        moderation_status: 'pending',
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
