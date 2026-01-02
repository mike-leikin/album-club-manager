import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { token, resubscribe = false } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Unsubscribe token is required" },
        { status: 400 }
      );
    }

    // Find participant by unsubscribe token
    const { data: participant, error: fetchError } = await supabase
      .from("participants")
      .select("*")
      .eq("unsubscribe_token", token)
      .single();

    if (fetchError || !participant) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token" },
        { status: 404 }
      );
    }

    // Update email subscription status
    const { error: updateError } = await (supabase
      .from("participants") as any)
      .update({
        email_subscribed: !resubscribe
      })
      .eq("id", (participant as any).id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update subscription status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      name: (participant as any).name,
      email: (participant as any).email,
      subscribed: !resubscribe,
      message: resubscribe
        ? "You have been resubscribed to weekly emails"
        : "You have been unsubscribed from weekly emails",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
