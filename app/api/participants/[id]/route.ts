import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdatePayload = {
  name?: string;
  email?: string;
};

// PUT /api/participants/[id] - Update a participant
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createServerClient() as any;
    const body = (await request.json()) as UpdatePayload;

    // Basic validation
    if (body.name !== undefined && !body.name?.trim()) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    if (body.email !== undefined && !body.email?.trim()) {
      return NextResponse.json(
        { error: "Email cannot be empty" },
        { status: 400 }
      );
    }

    // Build update object
    const updates: any = {};
    if (body.name) updates.name = body.name.trim();
    if (body.email) updates.email = body.email.trim().toLowerCase();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("participants")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A participant with this email already exists" },
          { status: 409 }
        );
      }
      // Handle not found
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Participant not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update participant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/participants/[id] - Soft delete a participant
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createServerClient() as any;

    // Get review count before deletion
    const { count: reviewCount } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("participant_id", id);

    // Soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .from("participants")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null); // Only delete if not already deleted

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      reviewCount: reviewCount || 0
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete participant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
