import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekNumber = searchParams.get('week_number');

    const supabase = createServerClient() as any;

    let query = supabase
      .from('email_logs')
      .select('*');

    if (weekNumber) {
      query = query.eq('week_number', parseInt(weekNumber));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching email logs:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const summary = {
      total: data.length,
      sent: data.filter((log: any) => log.status === 'sent').length,
      failed: data.filter((log: any) => log.status === 'failed').length,
      byWeek: {} as Record<number, { sent: number; failed: number; total: number }>,
    };

    // Group by week
    data.forEach((log: any) => {
      if (!summary.byWeek[log.week_number]) {
        summary.byWeek[log.week_number] = { sent: 0, failed: 0, total: 0 };
      }
      summary.byWeek[log.week_number].total++;
      if (log.status === 'sent') {
        summary.byWeek[log.week_number].sent++;
      } else if (log.status === 'failed') {
        summary.byWeek[log.week_number].failed++;
      }
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Email logs summary error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch email logs summary' },
      { status: 500 }
    );
  }
}
