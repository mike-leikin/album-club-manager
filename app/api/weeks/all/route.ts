import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("weeks")
      .select("*")
      .order("week_number", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch weeks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
