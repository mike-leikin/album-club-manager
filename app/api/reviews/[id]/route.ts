import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireAuth } from "@/lib/auth/utils";

// PATCH /api/reviews/[id] - Update a review (participant can only update their own)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    const body = await request.json();
    const { rating, favorite_track, review_text } = body;

    // Validate rating if provided
    if (rating !== undefined && (rating < 0 || rating > 10)) {
      return NextResponse.json(
        { error: "Rating must be between 0 and 10" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Get participant ID from auth user ID
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Verify the review belongs to this participant
    const { data: existingReview, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .eq("participant_id", participant.id)
      .single();

    if (fetchError || !existingReview) {
      return NextResponse.json(
        { error: "Review not found or you don't have permission to edit it" },
        { status: 404 }
      );
    }

    // Update the review
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (rating !== undefined) updateData.rating = rating;
    if (favorite_track !== undefined) updateData.favorite_track = favorite_track;
    if (review_text !== undefined) updateData.review_text = review_text;

    const { data: updatedReview, error: updateError } = await supabase
      .from("reviews")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ data: updatedReview });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message =
      error instanceof Error ? error.message : "Unable to update review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/reviews/[id] - Delete a review (participant can only delete their own)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Get participant ID from auth user ID
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Verify the review belongs to this participant
    const { data: existingReview, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .eq("participant_id", participant.id)
      .single();

    if (fetchError || !existingReview) {
      return NextResponse.json(
        { error: "Review not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    // Delete the review
    const { error: deleteError } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message =
      error instanceof Error ? error.message : "Unable to delete review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
