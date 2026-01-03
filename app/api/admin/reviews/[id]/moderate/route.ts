import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCurator } from "@/lib/auth/utils";

type ModerationPayload = {
  action: 'approve' | 'hide' | 'unhide';
  notes?: string;
  // Optional: allow curator to edit review content
  rating?: number;
  favorite_track?: string;
  review_text?: string;
};

// POST /api/admin/reviews/[id]/moderate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireCurator();
    const body: ModerationPayload = await request.json();

    const supabase = createServerClient() as any;

    // Get curator's participant ID
    const { data: curator } = await supabase
      .from("participants")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single();

    if (!curator) {
      return NextResponse.json({ error: "Curator not found" }, { status: 404 });
    }

    // Build update object
    const updateData: any = {
      moderated_at: new Date().toISOString(),
      moderated_by: curator.id,
      updated_at: new Date().toISOString(),
    };

    // Set status based on action
    switch (body.action) {
      case 'approve':
        updateData.moderation_status = 'approved';
        break;
      case 'hide':
        updateData.moderation_status = 'hidden';
        break;
      case 'unhide':
        updateData.moderation_status = 'approved';
        break;
    }

    // Optional: Update notes if provided
    if (body.notes !== undefined) {
      updateData.moderation_notes = body.notes;
    }

    // Optional: Allow curator to edit review content
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.favorite_track !== undefined) updateData.favorite_track = body.favorite_track;
    if (body.review_text !== undefined) updateData.review_text = body.review_text;

    const { data: review, error } = await supabase
      .from("reviews")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        participant:participants!reviews_participant_id_fkey(id, name, email),
        moderator:participants!reviews_moderated_by_fkey(id, name, email)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({
      data: review,
      message: `Review ${body.action}d successfully`
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: "Curator access required" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Unable to moderate review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/reviews/[id]/moderate - Permanent deletion
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCurator();

    const supabase = createServerClient() as any;

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Review deleted permanently" });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: "Curator access required" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Unable to delete review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
