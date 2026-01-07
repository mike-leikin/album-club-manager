import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCurator } from "@/lib/auth/utils";

export async function GET(request: NextRequest) {
  try {
    await requireCurator();

    const { searchParams } = new URL(request.url);
    const weekNumberParam = searchParams.get("week_number");
    const weekNumber = weekNumberParam ? parseInt(weekNumberParam, 10) : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    let query = supabase
      .from("email_sends")
      .select("*")
      .order("created_at", { ascending: false });

    if (weekNumber && !Number.isNaN(weekNumber)) {
      query = query.eq("week_number", weekNumber);
    }

    const { data: sends, error: sendsError } = await query;

    if (sendsError) {
      throw sendsError;
    }

    if (!sends || sends.length === 0) {
      return NextResponse.json({ sends: [] });
    }

    const sendIds = sends.map((send: { id: string }) => send.id);
    const { data: recipients, error: recipientsError } = await supabase
      .from("email_send_recipients")
      .select("send_id, status")
      .in("send_id", sendIds);

    if (recipientsError) {
      throw recipientsError;
    }

    const counts = new Map<
      string,
      { total: number; sent: number; failed: number }
    >();

    (recipients || []).forEach((recipient: { send_id: string; status: string }) => {
      if (!counts.has(recipient.send_id)) {
        counts.set(recipient.send_id, { total: 0, sent: 0, failed: 0 });
      }
      const counter = counts.get(recipient.send_id)!;
      counter.total += 1;
      if (recipient.status === "sent") {
        counter.sent += 1;
      } else if (recipient.status === "failed") {
        counter.failed += 1;
      }
    });

    const sendsWithCounts = sends.map((send: any) => {
      const count = counts.get(send.id) || { total: 0, sent: 0, failed: 0 };
      return {
        ...send,
        recipient_count: count.total,
        sent_count: count.sent,
        failed_count: count.failed,
      };
    });

    return NextResponse.json({ sends: sendsWithCounts });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Curator access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch email history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
