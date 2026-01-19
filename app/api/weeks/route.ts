import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCuratorApi } from "@/lib/auth/apiAuth";

export async function POST(request: NextRequest) {
  // Check auth first
  const authError = await requireCuratorApi(request);
  if (authError) return authError;
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("weeks")
      .upsert(body, { onConflict: "week_number" })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to save week" },
        { status: 400 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request payload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const includeDrafts = searchParams.get('include_drafts') === 'true';
    const weekNumber = searchParams.get('week_number');

    if (weekNumber) {
      // Return specific week by week_number
      const { data, error } = await supabase
        .from("weeks")
        .select("*")
        .eq("week_number", parseInt(weekNumber))
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ data: null });
        }
        throw error;
      }

      return NextResponse.json({ data });
    } else if (all) {
      // Return all weeks
      let query = supabase
        .from("weeks")
        .select("*")
        .order("week_number", { ascending: false });

      if (!includeDrafts) {
        query = query.not("published_at", "is", null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return NextResponse.json({ data: data || [] });
    } else {
      // Return only the latest published week (existing behavior, draft-safe)
      const { data, error } = await supabase
        .from("weeks")
        .select("*")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // If no rows found, return null instead of error
        if (error.code === 'PGRST116') {
          return NextResponse.json({ data: null });
        }
        throw error;
      }

      return NextResponse.json({ data });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load weeks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Check auth first
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const weekNumber = searchParams.get('week_number');

    if (!weekNumber) {
      return NextResponse.json(
        { error: "week_number parameter is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("weeks")
      .delete()
      .eq("week_number", parseInt(weekNumber));

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to delete week" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete week";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
