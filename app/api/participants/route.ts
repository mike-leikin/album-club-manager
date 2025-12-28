import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCuratorApi } from "@/lib/auth/apiAuth";
import type { ParticipantInsert } from "@/lib/types/database";

// GET /api/participants - List all participants
export async function GET(request: NextRequest) {
  // Check auth first
  const authError = await requireCuratorApi(request);
  if (authError) return authError;
  try {
    const supabase = createServerClient() as any;
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    let query = supabase
      .from("participants")
      .select("*")
      .order("name");

    // By default, only return active (non-deleted) participants
    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load participants";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/participants - Create a new participant
export async function POST(request: NextRequest) {
  // Check auth first
  const authError = await requireCuratorApi(request);
  if (authError) return authError;
  try {
    const supabase = createServerClient() as any;
    const body = (await request.json()) as ParticipantInsert;

    // Basic validation
    if (!body.name?.trim() || !body.email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("participants")
      .insert({
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
      })
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
      throw error;
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create participant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
