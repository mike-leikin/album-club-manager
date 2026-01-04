import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabaseClient";
import { createApiLogger } from "@/lib/logger";
import { requireCuratorApi } from "@/lib/auth/apiAuth";
import * as Sentry from "@sentry/nextjs";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // Check auth first
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  const requestId = crypto.randomUUID();
  const logger = createApiLogger(requestId);

  try {
    logger.info("Email send request received", { requestId });
    const { weekNumber } = await request.json();

    if (!weekNumber) {
      logger.warn("Email send request missing week number", { requestId });
      return NextResponse.json(
        { error: "Week number is required" },
        { status: 400 }
      );
    }

    logger.info("Sending emails for week", { weekNumber, requestId });

    const supabase = createServerClient() as any;

    // Fetch week data
    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("*")
      .eq("week_number", weekNumber)
      .single();

    if (weekError || !week) {
      logger.error("Week not found", { weekNumber, requestId }, weekError);
      return NextResponse.json(
        { error: "Week not found" },
        { status: 404 }
      );
    }

    // Fetch all active, subscribed participants
    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("*")
      .is("deleted_at", null)
      .eq("email_subscribed", true)
      .order("name");

    if (participantsError || !participants || participants.length === 0) {
      logger.error("No participants found", { weekNumber, requestId }, participantsError);
      return NextResponse.json(
        { error: "No participants found" },
        { status: 404 }
      );
    }

    logger.info("Participants loaded", { count: participants.length, weekNumber, requestId });

    const formatWeekLabel = (
      dateStr: string | null | undefined,
      fallbackWeekNumber?: number
    ) => {
      if (!dateStr) {
        return fallbackWeekNumber ? `Week ${fallbackWeekNumber}` : "Album Club";
      }
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return fallbackWeekNumber ? `Week ${fallbackWeekNumber}` : "Album Club";
      }
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    const weekLabel = formatWeekLabel(week.created_at, weekNumber);

    // Fetch previous week's review stats (if available, only approved reviews)
    let reviewStats = null;
    const prevWeek = weekNumber - 1;
    if (prevWeek > 0) {
      const { data: stats } = await supabase
        .from("reviews")
        .select(`
          *,
          participant:participants(name)
        `)
        .eq("week_number", prevWeek)
        .eq("moderation_status", "approved");

      if (stats && stats.length > 0) {
        let prevWeekLabel = `Week ${prevWeek}`;
        const { data: prevWeekData, error: prevWeekError } = await supabase
          .from("weeks")
          .select("created_at")
          .eq("week_number", prevWeek)
          .single();
        if (!prevWeekError && prevWeekData?.created_at) {
          prevWeekLabel = formatWeekLabel(prevWeekData.created_at, prevWeek);
        }

        // Calculate stats
        const contempReviews = stats.filter((r: any) => r.contemporary_rating !== null);
        const classicReviews = stats.filter((r: any) => r.classic_rating !== null);

        reviewStats = {
          prevWeek,
          prevWeekLabel,
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
        // Don't fail the email send if logging fails
        logger.error('Failed to log email attempt to database', {
          participantEmail,
          weekNumber,
          requestId
        }, logError instanceof Error ? logError : new Error(String(logError)));
      }
    };

    // Send individual emails
    const emailPromises = participants.map(async (participant: any) => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const submitUrl = `${appUrl}/submit?email=${encodeURIComponent(participant.email)}`;
      const unsubscribeUrl = `${appUrl}/unsubscribe?token=${participant.unsubscribe_token}`;
      const firstName = participant.name.split(' ')[0];

      // Build HTML email body
      let htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Album Club – ${weekLabel}</title>
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
              <p style="margin: 8px 0 0; color: #a1a1a1; font-size: 16px;">${weekLabel}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 32px 16px;">
              <p style="margin: 0; color: #e5e5e5; font-size: 16px; line-height: 1.5;">Hi ${firstName},</p>
            </td>
          </tr>
`;

      // Add curator message if present
      if (week.curator_message) {
        const escapedMessage = week.curator_message
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

        htmlBody += `
          <!-- Curator Message -->
          <tr>
            <td style="padding: 0 32px 20px;">
              <div style="background: #1e293b; border-left: 3px solid #22c55e; padding: 15px; border-radius: 4px;">
                <p style="color: #e2e8f0; margin: 0; white-space: pre-wrap; font-size: 15px; line-height: 1.6;">${escapedMessage}</p>
              </div>
            </td>
          </tr>
`;
      }

      // Add previous week results if available
      if (reviewStats) {
        htmlBody += `
          <!-- Previous Week Results -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #111111; border: 1px solid #1f1f1f; border-radius: 12px; padding: 20px;">
                <h2 style="margin: 0 0 16px; color: #10b981; font-size: 18px; font-weight: 600;">📊 ${reviewStats.prevWeekLabel} Results</h2>
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

          <!-- Forward to Friend -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; background-color: #0a0a0a; border-top: 1px solid #1f1f1f;">
              <p style="margin: 0 0 12px; color: #a1a1aa; font-size: 14px;">Love Album Club? Invite a friend!</p>
              <a href="${appUrl}/invite-friend?ref=${participant.id}" style="display: inline-block; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Forward to a Friend</a>
            </td>
          </tr>

          <!-- Unsubscribe -->
          <tr>
            <td style="padding: 20px 32px; text-align: center; background-color: #0a0a0a;">
              <p style="margin: 0; color: #525252; font-size: 11px;">
                <a href="${unsubscribeUrl}" style="color: #737373; text-decoration: underline;">Unsubscribe from weekly emails</a>
              </p>
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

      // Add curator message if present
      if (week.curator_message) {
        textBody += `${week.curator_message}\n\n`;
      }

      if (reviewStats) {
        textBody += `=== ${reviewStats.prevWeekLabel} Results ===\n\n`;

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

      textBody += `- Mike\n\n`;
      textBody += `---\n`;
      textBody += `Unsubscribe: ${unsubscribeUrl}`;

      try {
        const result = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Album Club <onboarding@resend.dev>",
          replyTo: process.env.RESEND_REPLY_TO_EMAIL,
          to: participant.email,
          subject: `Album Club – ${weekLabel}`,
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

    // Log detailed results
    const failedEmails = results
      .map((r, i) => ({ result: r, participant: participants[i] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ result, participant }) => ({
        email: participant.email,
        error: result.status === 'rejected' ? result.reason : null
      }));

    if (failedCount > 0) {
      logger.warn('Some emails failed to send', {
        weekNumber,
        total: participants.length,
        sent: successCount,
        failed: failedCount,
        failedEmails,
        requestId
      });
    } else {
      logger.info('All emails sent successfully', {
        weekNumber,
        total: participants.length,
        requestId
      });
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failedCount,
      total: participants.length,
    });
  } catch (error) {
    logger.error("Email send error", {
      requestId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : new Error(String(error)));

    Sentry.captureException(error, {
      tags: { endpoint: '/api/email/send-week' },
      extra: { requestId }
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send emails" },
      { status: 500 }
    );
  }
}
