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

    // Helper function to log email attempts
    const logEmailAttempt = async (
      participantId: string, // UUID from participants table
      participantEmail: string,
      status: 'sent' | 'failed',
      resendId?: string,
      errorMessage?: string
    ) => {
      try {
        await supabase.from('email_logs').insert({
          week_number: weekNumber,
          participant_id: participantId,
          participant_email: participantEmail,
          status,
          resend_id: resendId,
          error_message: errorMessage,
        });
      } catch (logError) {
        // Don't fail the email send if logging fails, just log to console
        console.error('Failed to log email attempt:', logError);
      }
    };

    // Send individual emails
    const emailPromises = participants.map(async (participant: any) => {
      const submitUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/submit?email=${encodeURIComponent(participant.email)}`;
      const firstName = participant.name.split(' ')[0];

      // Build HTML email body
      let htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Album Club – Week ${weekNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-bottom: 1px solid #1f1f1f;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Album Club</h1>
              <p style="margin: 8px 0 0; color: #a1a1a1; font-size: 16px;">Week ${weekNumber}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 32px 16px;">
              <p style="margin: 0; color: #e5e5e5; font-size: 16px; line-height: 1.5;">Hi ${firstName},</p>
            </td>
          </tr>
`;

      // Add previous week results if available
      if (reviewStats) {
        htmlBody += `
          <!-- Previous Week Results -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #111111; border: 1px solid #1f1f1f; border-radius: 12px; padding: 20px;">
                <h2 style="margin: 0 0 16px; color: #10b981; font-size: 18px; font-weight: 600;">📊 Week ${reviewStats.prevWeek} Results</h2>
`;

        if (reviewStats.contemporary.count > 0) {
          htmlBody += `
                <div style="margin-bottom: 16px;">
                  <p style="margin: 0 0 8px; color: #ffffff; font-size: 15px; font-weight: 600;">🔊 Contemporary</p>
                  <p style="margin: 0 0 4px; color: #a1a1a1; font-size: 14px;">Average: <span style="color: #10b981; font-weight: 600;">${reviewStats.contemporary.avgRating}/10</span> (${reviewStats.contemporary.count} ${reviewStats.contemporary.count === 1 ? 'review' : 'reviews'})</p>
`;
          if (reviewStats.contemporary.favoriteTracks.length > 0) {
            htmlBody += `
                  <p style="margin: 8px 0 4px; color: #d4d4d4; font-size: 13px; font-weight: 500;">Favorite tracks:</p>
`;
            reviewStats.contemporary.favoriteTracks.forEach((ft: any) => {
              htmlBody += `
                  <p style="margin: 2px 0; color: #a1a1a1; font-size: 13px; padding-left: 12px;">• ${ft.track} <span style="color: #737373;">– ${ft.name}</span></p>
`;
            });
          }
          htmlBody += `
                </div>
`;
        }

        if (reviewStats.classic.count > 0) {
          htmlBody += `
                <div>
                  <p style="margin: 0 0 8px; color: #ffffff; font-size: 15px; font-weight: 600;">💿 Classic (RS 500)</p>
                  <p style="margin: 0 0 4px; color: #a1a1a1; font-size: 14px;">Average: <span style="color: #10b981; font-weight: 600;">${reviewStats.classic.avgRating}/10</span> (${reviewStats.classic.count} ${reviewStats.classic.count === 1 ? 'review' : 'reviews'})</p>
`;
          if (reviewStats.classic.favoriteTracks.length > 0) {
            htmlBody += `
                  <p style="margin: 8px 0 4px; color: #d4d4d4; font-size: 13px; font-weight: 500;">Favorite tracks:</p>
`;
            reviewStats.classic.favoriteTracks.forEach((ft: any) => {
              htmlBody += `
                  <p style="margin: 2px 0; color: #a1a1a1; font-size: 13px; padding-left: 12px;">• ${ft.track} <span style="color: #737373;">– ${ft.name}</span></p>
`;
            });
          }
          htmlBody += `
                </div>
`;
        }

        htmlBody += `
              </div>
            </td>
          </tr>
`;
      }

      htmlBody += `
          <!-- This Week's Albums -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 600;">This Week's Albums</h2>

              <table width="100%" cellpadding="0" cellspacing="0">
`;

      // Contemporary album
      if (week.contemporary_title) {
        htmlBody += `
                <tr>
                  <td style="padding-bottom: 24px;">
                    <div style="background-color: #111111; border: 1px solid #1f1f1f; border-radius: 12px; overflow: hidden;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
`;
        if (week.contemporary_album_art_url) {
          htmlBody += `
                          <td width="120" valign="top" style="padding: 16px;">
                            <img src="${week.contemporary_album_art_url}" alt="${week.contemporary_title}" width="120" height="120" style="display: block; border-radius: 8px; border: 1px solid #262626;" />
                          </td>
`;
        }
        htmlBody += `
                          <td valign="top" style="padding: 16px ${week.contemporary_album_art_url ? '16px' : '16px'} 16px ${week.contemporary_album_art_url ? '0' : '16px'};">
                            <p style="margin: 0 0 4px; color: #10b981; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🔊 Contemporary</p>
                            <p style="margin: 0 0 4px; color: #ffffff; font-size: 17px; font-weight: 700; line-height: 1.3;">${week.contemporary_title}</p>
`;
        if (week.contemporary_artist) {
          htmlBody += `
                            <p style="margin: 0 0 12px; color: #a1a1a1; font-size: 14px;">${week.contemporary_artist}${week.contemporary_year ? ` • ${week.contemporary_year}` : ''}</p>
`;
        }
        if (week.contemporary_spotify_url) {
          htmlBody += `
                            <a href="${week.contemporary_spotify_url}" style="display: inline-block; background-color: #1db954; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-top: 4px;">▶ Listen on Spotify</a>
`;
        }
        htmlBody += `
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
`;
      }

      // Classic album
      if (week.classic_title) {
        htmlBody += `
                <tr>
                  <td style="padding-bottom: 24px;">
                    <div style="background-color: #111111; border: 1px solid #1f1f1f; border-radius: 12px; overflow: hidden;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
`;
        if (week.classic_album_art_url) {
          htmlBody += `
                          <td width="120" valign="top" style="padding: 16px;">
                            <img src="${week.classic_album_art_url}" alt="${week.classic_title}" width="120" height="120" style="display: block; border-radius: 8px; border: 1px solid #262626;" />
                          </td>
`;
        }
        htmlBody += `
                          <td valign="top" style="padding: 16px ${week.classic_album_art_url ? '16px' : '16px'} 16px ${week.classic_album_art_url ? '0' : '16px'};">
                            <p style="margin: 0 0 4px; color: #f59e0b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">💿 Classic (RS 500)</p>
                            <p style="margin: 0 0 4px; color: #ffffff; font-size: 17px; font-weight: 700; line-height: 1.3;">${week.classic_title}</p>
`;
        if (week.classic_artist) {
          htmlBody += `
                            <p style="margin: 0 0 ${week.rs_rank ? '4px' : '12px'}; color: #a1a1a1; font-size: 14px;">${week.classic_artist}${week.classic_year ? ` • ${week.classic_year}` : ''}</p>
`;
        }
        if (week.rs_rank) {
          htmlBody += `
                            <p style="margin: 0 0 12px; color: #737373; font-size: 12px;">Rolling Stone Rank: #${week.rs_rank}</p>
`;
        }
        if (week.classic_spotify_url) {
          htmlBody += `
                            <a href="${week.classic_spotify_url}" style="display: inline-block; background-color: #1db954; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-top: 4px;">▶ Listen on Spotify</a>
`;
        }
        htmlBody += `
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
`;
      }

      htmlBody += `
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px;">
                    <p style="margin: 0 0 12px; color: #ffffff; font-size: 15px; font-weight: 600;">Ready to share your thoughts?</p>
                    <a href="${submitUrl}" style="display: inline-block; background-color: #ffffff; color: #059669; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.3px;">Submit Your Review</a>
`;
      if (week.response_deadline) {
        htmlBody += `
                    <p style="margin: 16px 0 0; color: #d1fae5; font-size: 13px;">Deadline: ${formatDeadline(week.response_deadline)}</p>
`;
      }
      htmlBody += `
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #1f1f1f; background-color: #0a0a0a;">
              <p style="margin: 0; color: #737373; font-size: 13px; line-height: 1.5;">- Mike</p>
              <p style="margin: 12px 0 0; color: #525252; font-size: 12px;">Rate each album 1.0–10.0 and share your favorite tracks!</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      // Build plain text fallback
      let textBody = `Hi ${firstName},\n\n`;

      if (reviewStats) {
        textBody += `=== Week ${reviewStats.prevWeek} Results ===\n\n`;

        if (reviewStats.contemporary.count > 0) {
          textBody += `🔊 Contemporary: ${reviewStats.contemporary.avgRating}/10 (${reviewStats.contemporary.count} ${reviewStats.contemporary.count === 1 ? 'review' : 'reviews'})\n`;
          if (reviewStats.contemporary.favoriteTracks.length > 0) {
            textBody += `   Favorite tracks:\n`;
            reviewStats.contemporary.favoriteTracks.forEach((ft: any) => {
              textBody += `   • ${ft.track} – ${ft.name}\n`;
            });
          }
          textBody += `\n`;
        }

        if (reviewStats.classic.count > 0) {
          textBody += `💿 Classic: ${reviewStats.classic.avgRating}/10 (${reviewStats.classic.count} ${reviewStats.classic.count === 1 ? 'review' : 'reviews'})\n`;
          if (reviewStats.classic.favoriteTracks.length > 0) {
            textBody += `   Favorite tracks:\n`;
            reviewStats.classic.favoriteTracks.forEach((ft: any) => {
              textBody += `   • ${ft.track} – ${ft.name}\n`;
            });
          }
          textBody += `\n`;
        }

        textBody += `---\n\n`;
      }

      textBody += `Here are the picks for this week:\n\n`;

      if (week.contemporary_title) {
        textBody += `🔊 Contemporary: ${week.contemporary_title}`;
        if (week.contemporary_artist) textBody += ` – ${week.contemporary_artist}`;
        if (week.contemporary_year) textBody += ` (${week.contemporary_year})`;
        textBody += `\n`;
        if (week.contemporary_spotify_url) {
          textBody += `Listen: ${week.contemporary_spotify_url}\n`;
        }
        textBody += `\n`;
      }

      if (week.classic_title) {
        textBody += `💿 Classic (RS 500): ${week.classic_title}`;
        if (week.classic_artist) textBody += ` – ${week.classic_artist}`;
        if (week.classic_year) textBody += ` (${week.classic_year})`;
        if (week.rs_rank) textBody += ` [Rank #${week.rs_rank}]`;
        textBody += `\n`;
        if (week.classic_spotify_url) {
          textBody += `Listen: ${week.classic_spotify_url}\n`;
        }
        textBody += `\n`;
      }

      textBody += `Submit your review here:\n${submitUrl}\n\n`;

      if (week.response_deadline) {
        textBody += `Responses by: ${formatDeadline(week.response_deadline)}\n\n`;
      }

      textBody += `- Mike`;

      try {
        const result = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Album Club <onboarding@resend.dev>",
          to: participant.email,
          subject: `Album Club – Week ${weekNumber}`,
          html: htmlBody,
          text: textBody,
        });

        // Log successful send
        await logEmailAttempt(
          participant.id,
          participant.email,
          'sent',
          result.data?.id
        );

        return result;
      } catch (error) {
        // Log failed send
        await logEmailAttempt(
          participant.id,
          participant.email,
          'failed',
          undefined,
          error instanceof Error ? error.message : 'Unknown error'
        );

        throw error;
      }
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
