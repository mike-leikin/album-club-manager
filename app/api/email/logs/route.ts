import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekNumber = searchParams.get('week_number');
    const participantId = searchParams.get('participant_id');
    const status = searchParams.get('status');

    const supabase = createServerClient() as any;

    let query = supabase
      .from('email_logs')
      .select(`
        *,
        participant:participants(id, name, email)
      `)
      .order('sent_at', { ascending: false });

    // Apply filters if provided
    if (weekNumber) {
      query = query.eq('week_number', parseInt(weekNumber));
    }

    if (participantId) {
      query = query.eq('participant_id', parseInt(participantId));
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching email logs:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ logs: data });
  } catch (error) {
    console.error('Email logs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}
