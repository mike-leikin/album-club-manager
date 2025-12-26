import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabaseClient";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { weekNumber } = await request.json();

    if (!weekNumber) {
      return NextResponse.json(
        { error: "Week number is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient() as any;

    // Fetch week data
    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("*")
      .eq("week_number", weekNumber)
      .single();

    if (weekError || !week) {
      return NextResponse.json(
        { error: "Week not found" },
        { status: 404 }
      );
    }

    // Fetch all participants
    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("*")
      .order("name");

    if (participantsError || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: "No participants found" },
        { status: 404 }
      );
    }

    // Fetch previous week's review stats (if available)
    let reviewStats = null;
    const prevWeek = weekNumber - 1;
    if (prevWeek > 0) {
      const { data: stats } = await supabase
        .from("reviews")
        .select(`
          *,
          participant:participants(name)
        `)
        .eq("week_number", prevWeek);

      if (stats && stats.length > 0) {
        // Calculate stats
        const contempReviews = stats.filter((r: any) => r.contemporary_rating !== null);
        const classicReviews = stats.filter((r: any) => r.classic_rating !== null);

        reviewStats = {
          prevWeek,
          contemporary: {
            avgRating: contempReviews.length > 0
              ? (contempReviews.reduce((sum: number, r: any) => sum + r.contemporary_rating, 0) / contempReviews.length).toFixed(1)
              : null,
            count: contempReviews.length,
            favoriteTracks: contempReviews
              .filter((r: any) => r.contemporary_favorite_track)
              .map((r: any) => ({ track: r.contemporary_favorite_track, name: r.participant.name }))
              .slice(0, 3),
          },
          classic: {
            avgRating: classicReviews.length > 0
              ? (classicReviews.reduce((sum: number, r: any) => sum + r.classic_rating, 0) / classicReviews.length).toFixed(1)
              : null,
            count: classicReviews.length,
            favoriteTracks: classicReviews
              .filter((r: any) => r.classic_favorite_track)
              .map((r: any) => ({ track: r.classic_favorite_track, name: r.participant.name }))
              .slice(0, 3),
          },
        };
      }
    }

    // Format deadline
    const formatDeadline = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    };

    // Send individual emails
    const emailPromises = participants.map(async (participant: any) => {
      const submitUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/submit?email=${encodeURIComponent(participant.email)}`;

      // Build email body
      let emailBody = `Hi ${participant.name.split(' ')[0]},\n\n`;

      // Add previous week results if available
      if (reviewStats) {
        emailBody += `=== Week ${reviewStats.prevWeek} Results ===\n\n`;

        if (reviewStats.contemporary.count > 0) {
          emailBody += `🔊 Contemporary: ${reviewStats.contemporary.avgRating}/10 (${reviewStats.contemporary.count} ${reviewStats.contemporary.count === 1 ? 'review' : 'reviews'})\n`;
          if (reviewStats.contemporary.favoriteTracks.length > 0) {
            emailBody += `   Favorite tracks:\n`;
            reviewStats.contemporary.favoriteTracks.forEach((ft: any) => {
              emailBody += `   • ${ft.track} – ${ft.name}\n`;
            });
          }
          emailBody += `\n`;
        }

        if (reviewStats.classic.count > 0) {
          emailBody += `💿 Classic: ${reviewStats.classic.avgRating}/10 (${reviewStats.classic.count} ${reviewStats.classic.count === 1 ? 'review' : 'reviews'})\n`;
          if (reviewStats.classic.favoriteTracks.length > 0) {
            emailBody += `   Favorite tracks:\n`;
            reviewStats.classic.favoriteTracks.forEach((ft: any) => {
              emailBody += `   • ${ft.track} – ${ft.name}\n`;
            });
          }
          emailBody += `\n`;
        }

        emailBody += `---\n\n`;
      }

      emailBody += `Here are the picks for this week:\n\n`;

      // Contemporary album
      if (week.contemporary_title) {
        emailBody += `🔊 Contemporary: ${week.contemporary_title}`;
        if (week.contemporary_artist) emailBody += ` – ${week.contemporary_artist}`;
        if (week.contemporary_year) emailBody += ` (${week.contemporary_year})`;
        emailBody += `\n`;
        if (week.contemporary_spotify_url) {
          emailBody += `Listen: ${week.contemporary_spotify_url}\n`;
        }
        emailBody += `\n`;
      }

      // Classic album
      if (week.classic_title) {
        emailBody += `💿 Classic (RS 500): ${week.classic_title}`;
        if (week.classic_artist) emailBody += ` – ${week.classic_artist}`;
        if (week.classic_year) emailBody += ` (${week.classic_year})`;
        if (week.rs_rank) emailBody += ` [Rank #${week.rs_rank}]`;
        emailBody += `\n`;
        if (week.classic_spotify_url) {
          emailBody += `Listen: ${week.classic_spotify_url}\n`;
        }
        emailBody += `\n`;
      }

      emailBody += `Please rate each album on a 1.0–10.0 scale and share any quick thoughts.\n\n`;
      emailBody += `Submit your review here:\n${submitUrl}\n\n`;

      if (week.response_deadline) {
        emailBody += `Responses by: ${formatDeadline(week.response_deadline)}\n\n`;
      }

      emailBody += `- Mike`;

      return resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Album Club <onboarding@resend.dev>",
        to: participant.email,
        subject: `Album Club – Week ${weekNumber}`,
        text: emailBody,
      });
    });

    const results = await Promise.allSettled(emailPromises);

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.filter((r) => r.status === "rejected").length;

    // Log results for debugging
    console.log('Email sending results:', {
      total: participants.length,
      sent: successCount,
      failed: failedCount,
      results: results.map((r, i) => ({
        participant: participants[i].email,
        status: r.status,
        error: r.status === 'rejected' ? r.reason : null,
        resendResponse: r.status === 'fulfilled' ? JSON.stringify(r.value) : null,
      }))
    });

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failedCount,
      total: participants.length,
    });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send emails" },
      { status: 500 }
    );
  }
}
