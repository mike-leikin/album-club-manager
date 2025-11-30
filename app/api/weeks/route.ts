import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

export async function POST(request: Request) {
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

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("weeks")
      .select("*")
      .order("week_number", { ascending: false })
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load latest week";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
