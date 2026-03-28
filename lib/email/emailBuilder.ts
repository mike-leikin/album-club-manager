import { formatDateOnlyEastern } from "@/lib/utils/dates";

export interface EmailContent {
  htmlBody: string;
  textBody: string;
  subject: string;
}

export interface WeekData {
  week_number: number;
  created_at?: string | null;
  response_deadline?: string | null;
  curator_message?: string | null;
  contemporary_title?: string | null;
  contemporary_artist?: string | null;
  contemporary_year?: string | null;
  contemporary_spotify_url?: string | null;
  contemporary_album_art_url?: string | null;
  classic_title?: string | null;
  classic_artist?: string | null;
  classic_year?: string | null;
  classic_spotify_url?: string | null;
  classic_album_art_url?: string | null;
  rs_rank?: number | null;
}

export interface ReviewStats {
  prevWeek: number;
  prevWeekLabel: string;
  contemporary: {
    avgRating: string | null;
    count: number;
    albumLabel: string;
    reviews: Array<{ name: string; rating: number; favoriteTrack?: string | null; reviewText: string }>;
  };
  classic: {
    avgRating: string | null;
    count: number;
    albumLabel: string;
    reviews: Array<{ name: string; rating: number; favoriteTrack?: string | null; reviewText: string }>;
  };
}

export interface Participant {
  id: string;
  email: string;
  name: string;
  unsubscribe_token: string;
}

export interface ReminderParticipant {
  id: string;
  email: string;
  name: string;
  reminder_unsubscribe_token: string;
}

export interface ReviewConfirmationRecipient {
  email: string;
  name: string;
}

export interface ReviewConfirmationReview {
  albumType: "contemporary" | "classic";
  rating: number;
  favoriteTrack?: string | null;
  reviewText?: string | null;
  moderationStatus?: string | null;
}

type EmailPersonalization = {
  firstName: string;
  submitUrl: string;
  dashboardUrl: string;
  unsubscribeUrl: string;
  inviteUrl: string;
  settingsUrl: string;
};

const EMAIL_TEMPLATE_PLACEHOLDERS: EmailPersonalization = {
  firstName: "{{first_name}}",
  submitUrl: "{{submit_url}}",
  dashboardUrl: "{{dashboard_url}}",
  unsubscribeUrl: "{{unsubscribe_url}}",
  inviteUrl: "{{invite_url}}",
  settingsUrl: "{{settings_url}}",
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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
  return formatDateOnlyEastern(dateStr, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDeadline = (dateStr: string) =>
  formatDateOnlyEastern(dateStr, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const buildEmailContentFromParams = (
  week: WeekData,
  personalization: EmailPersonalization,
  reviewStats: ReviewStats | null,
  isTest: boolean = false
): EmailContent => {
  const { firstName, submitUrl, dashboardUrl, unsubscribeUrl, inviteUrl } = personalization;
  const weekLabel = formatWeekLabel(week.created_at, week.week_number);

  const buildReviewListHtml = (
    reviews: Array<{ name: string; rating: number; favoriteTrack?: string | null; reviewText: string }>
  ) => {
    if (reviews.length === 0) {
      return `
                <p style="margin: 8px 0 0; color: #737373; font-size: 15px;">No written reviews yet.</p>
`;
    }

    return reviews
      .map((review) => {
        const safeText = escapeHtml(review.reviewText);
        const safeName = escapeHtml(review.name);
        const safeFavoriteTrack = review.favoriteTrack ? escapeHtml(review.favoriteTrack) : null;
        return `
                <div style="margin-top: 12px; padding-left: 12px; border-left: 2px solid #1f1f1f;">
                  <p style="margin: 0 0 4px; color: #e5e5e5; font-size: 15px; font-weight: 600;">${safeName} – <span style="color: #10b981;">${review.rating.toFixed(1)}/10</span></p>${safeFavoriteTrack ? `
                  <p style="margin: 0 0 4px; color: #a1a1a1; font-size: 14px;">Fav: ${safeFavoriteTrack}</p>` : ''}
                  <p style="margin: 0; color: #e5e5e5; font-size: 16px; line-height: 1.5; white-space: pre-wrap;">${safeText}</p>
                </div>
`;
      })
      .join("");
  };

  const buildAlbumLabel = (label: string) =>
    escapeHtml(label || "Album");

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
        <table width="700" cellpadding="0" cellspacing="0" style="max-width: 700px; background-color: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 16px; overflow: hidden;">
${isTest ? `
          <!-- Test Email Banner -->
          <tr>
            <td style="padding: 16px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-bottom: 1px solid #92400e;">
              <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: center;">🧪 TEST EMAIL - This is how your email will look to participants</p>
            </td>
          </tr>
` : ''}
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

`;

  // Add previous week results if available
  if (reviewStats) {
    htmlBody += `
          <!-- Last Week's Albums -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="background-color: #111111; border: 1px solid #1f1f1f; border-radius: 12px; padding: 20px;">
                <h2 style="margin: 0 0 16px; color: #10b981; font-size: 20px; font-weight: 600;">Last week's albums</h2>
`;

    if (reviewStats.contemporary.count > 0) {
      htmlBody += `
                <div style="margin-bottom: 16px;">
                  <p style="margin: 0 0 8px; color: #ffffff; font-size: 17px; font-weight: 600;">${buildAlbumLabel(reviewStats.contemporary.albumLabel)}</p>
                  <p style="margin: 0 0 4px; color: #a1a1a1; font-size: 16px;">Average: <span style="color: #10b981; font-weight: 600;">${reviewStats.contemporary.avgRating || "N/A"}/10</span> (${reviewStats.contemporary.count} ${reviewStats.contemporary.count === 1 ? "review" : "reviews"})</p>
                  <p style="margin: 8px 0 0; color: #d4d4d4; font-size: 15px; font-weight: 500;">Reviews:</p>
${buildReviewListHtml(reviewStats.contemporary.reviews)}
                </div>
`;
    }

    if (reviewStats.classic.count > 0) {
      htmlBody += `
                <div>
                  <p style="margin: 0 0 8px; color: #ffffff; font-size: 17px; font-weight: 600;">${buildAlbumLabel(reviewStats.classic.albumLabel)}</p>
                  <p style="margin: 0 0 4px; color: #a1a1a1; font-size: 16px;">Average: <span style="color: #10b981; font-weight: 600;">${reviewStats.classic.avgRating || "N/A"}/10</span> (${reviewStats.classic.count} ${reviewStats.classic.count === 1 ? "review" : "reviews"})</p>
                  <p style="margin: 8px 0 0; color: #d4d4d4; font-size: 15px; font-weight: 500;">Reviews:</p>
${buildReviewListHtml(reviewStats.classic.reviews)}
                </div>
`;
    }

    htmlBody += `
                <div style="margin-top: 16px; text-align: center;">
                  <a href="${dashboardUrl}" style="color: #10b981; text-decoration: underline; font-size: 13px;">See past reviews on the dashboard</a>
                </div>
              </div>
            </td>
          </tr>
`;
  }

  htmlBody += `

          <!-- Forward to Friend -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; background-color: #0a0a0a; border-top: 1px solid #1f1f1f;">
              <p style="margin: 0 0 12px; color: #a1a1aa; font-size: 14px;">Love Album Club? Invite a friend!</p>
              <a href="${inviteUrl}" style="display: inline-block; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Forward to a Friend</a>
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

  if (isTest) {
    textBody += `🧪 TEST EMAIL - This is how your email will look to participants\n\n`;
  }

  // Add curator message if present
  if (week.curator_message) {
    textBody += `${week.curator_message}\n\n`;
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

  if (reviewStats) {
    textBody += `Last week's albums\n\n`;

    if (reviewStats.contemporary.count > 0) {
      textBody += `${reviewStats.contemporary.albumLabel}: ${reviewStats.contemporary.avgRating || "N/A"}/10 (${reviewStats.contemporary.count} ${reviewStats.contemporary.count === 1 ? "review" : "reviews"})\n`;
      if (reviewStats.contemporary.reviews.length > 0) {
        reviewStats.contemporary.reviews.forEach((review) => {
          const favPart = review.favoriteTrack ? `  Fav: ${review.favoriteTrack}\n` : '';
          textBody += `- ${review.name} – ${review.rating.toFixed(1)}/10\n${favPart}  "${review.reviewText}"\n`;
        });
      } else {
        textBody += `- No written reviews yet.\n`;
      }
      textBody += `\n`;
    }

    if (reviewStats.classic.count > 0) {
      textBody += `${reviewStats.classic.albumLabel}: ${reviewStats.classic.avgRating || "N/A"}/10 (${reviewStats.classic.count} ${reviewStats.classic.count === 1 ? "review" : "reviews"})\n`;
      if (reviewStats.classic.reviews.length > 0) {
        reviewStats.classic.reviews.forEach((review) => {
          const favPart = review.favoriteTrack ? `  Fav: ${review.favoriteTrack}\n` : '';
          textBody += `- ${review.name} – ${review.rating.toFixed(1)}/10\n${favPart}  "${review.reviewText}"\n`;
        });
      } else {
        textBody += `- No written reviews yet.\n`;
      }
      textBody += `\n`;
    }

    textBody += `See past reviews: ${dashboardUrl}\n\n`;
  }

  textBody += `---\n`;
  textBody += `Unsubscribe: ${unsubscribeUrl}`;

  const subject = isTest
    ? `[TEST] This week's album picks, ${firstName}`
    : `This week's album picks, ${firstName}`;

  return {
    htmlBody,
    textBody,
    subject,
  };
}

export function buildEmailContent(
  week: WeekData,
  participant: Participant,
  reviewStats: ReviewStats | null,
  isTest: boolean = false
): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return buildEmailContentFromParams(
    week,
    {
      firstName: participant.name.split(' ')[0],
      submitUrl: `${appUrl}/submit?email=${encodeURIComponent(participant.email)}`,
      dashboardUrl: `${appUrl}/dashboard`,
      unsubscribeUrl: `${appUrl}/unsubscribe?token=${participant.unsubscribe_token}`,
      inviteUrl: `${appUrl}/invite-friend?ref=${participant.id}`,
      settingsUrl: `${appUrl}/settings`,
    },
    reviewStats,
    isTest
  );
}

export function buildReviewConfirmationEmail(
  week: WeekData,
  recipient: ReviewConfirmationRecipient,
  reviews: ReviewConfirmationReview[]
): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const weekLabel = formatWeekLabel(week.created_at, week.week_number);
  const firstName = recipient.name.split(" ")[0] || recipient.name || "there";
  const safeFirstName = escapeHtml(firstName);
  const dashboardUrl = `${appUrl}/dashboard`;

  const formatModerationStatus = (status?: string | null) => {
    if (!status) return "Pending approval";
    switch (status) {
      case "approved":
        return "Approved";
      case "hidden":
        return "Hidden";
      case "pending":
      default:
        return "Pending approval";
    }
  };

  const buildAlbumDetails = (
    title?: string | null,
    artist?: string | null,
    year?: string | null
  ) => {
    const parts = [title, artist].filter(Boolean) as string[];
    let details = parts.join(" - ");
    if (year) {
      details = details ? `${details} (${year})` : year;
    }
    return details || "Album details unavailable";
  };

  let htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Album Club – ${weekLabel} Review Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 32px; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-bottom: 1px solid #1f1f1f;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Album Club</h1>
              <p style="margin: 8px 0 0; color: #a1a1a1; font-size: 15px;">Review Confirmation – ${weekLabel}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 16px;">
              <p style="margin: 0 0 12px; color: #e5e5e5; font-size: 16px; line-height: 1.5;">Hi ${safeFirstName},</p>
              <p style="margin: 0; color: #d4d4d4; font-size: 14px; line-height: 1.6;">Thanks for submitting your review. Here is what we received.</p>
            </td>
          </tr>
`;

  reviews.forEach((review) => {
    const albumLabel =
      review.albumType === "contemporary" ? "Contemporary" : "Classic";
    const albumDetails =
      review.albumType === "contemporary"
        ? buildAlbumDetails(
            week.contemporary_title,
            week.contemporary_artist,
            week.contemporary_year
          )
        : buildAlbumDetails(
            week.classic_title,
            week.classic_artist,
            week.classic_year
          );
    const favoriteTrack = review.favoriteTrack?.trim();
    const reviewText = review.reviewText?.trim();
    const moderationStatus = formatModerationStatus(review.moderationStatus);
    const safeAlbumDetails = escapeHtml(albumDetails);
    const safeFavoriteTrack = favoriteTrack ? escapeHtml(favoriteTrack) : null;
    const safeReviewText = reviewText ? escapeHtml(reviewText) : null;

    htmlBody += `
          <tr>
            <td style="padding: 0 32px 16px;">
              <div style="background-color: #111111; border: 1px solid #1f1f1f; border-radius: 12px; padding: 16px;">
                <h3 style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: 600;">${albumLabel}</h3>
                <p style="margin: 0 0 8px; color: #d4d4d4; font-size: 14px;"><strong>${safeAlbumDetails}</strong></p>
                <p style="margin: 0 0 6px; color: #a1a1a1; font-size: 14px;">Rating: <span style="color: #10b981; font-weight: 600;">${review.rating}/10</span></p>
                ${
                  safeFavoriteTrack
                    ? `<p style="margin: 0 0 6px; color: #a1a1a1; font-size: 14px;">Favorite track: ${safeFavoriteTrack}</p>`
                    : ""
                }
                <p style="margin: 8px 0 6px; color: #a1a1a1; font-size: 13px;">Review:</p>
                <div style="background-color: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 8px; padding: 12px;">
                  <p style="margin: 0; color: #e5e5e5; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${safeReviewText || "No review text submitted."}</p>
                </div>
                <p style="margin: 10px 0 0; color: #a1a1a1; font-size: 13px;">Status: ${moderationStatus}</p>
              </div>
            </td>
          </tr>
`;
  });

  htmlBody += `
          <tr>
            <td style="padding: 8px 32px 24px;">
              <p style="margin: 0 0 12px; color: #d4d4d4; font-size: 14px; line-height: 1.6;">You can view or edit your submission on your dashboard anytime, even while it is pending or hidden.</p>
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: 600;">Open Dashboard</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #1f1f1f;">
              <p style="margin: 0; color: #737373; font-size: 12px;">Album Club</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const textLines: string[] = [
    `Album Club - ${weekLabel} Review Confirmation`,
    "",
    `Hi ${firstName},`,
    "Thanks for submitting your review. Here is what we received.",
    "",
  ];

  reviews.forEach((review) => {
    const albumLabel =
      review.albumType === "contemporary" ? "Contemporary" : "Classic";
    const albumDetails =
      review.albumType === "contemporary"
        ? buildAlbumDetails(
            week.contemporary_title,
            week.contemporary_artist,
            week.contemporary_year
          )
        : buildAlbumDetails(
            week.classic_title,
            week.classic_artist,
            week.classic_year
          );
    const favoriteTrack = review.favoriteTrack?.trim();
    const reviewText = review.reviewText?.trim();
    const moderationStatus = formatModerationStatus(review.moderationStatus);

    textLines.push(albumLabel);
    textLines.push(`Album: ${albumDetails}`);
    textLines.push(`Rating: ${review.rating}/10`);
    if (favoriteTrack) {
      textLines.push(`Favorite track: ${favoriteTrack}`);
    }
    textLines.push(`Review: ${reviewText || "No review text submitted."}`);
    textLines.push(`Status: ${moderationStatus}`);
    textLines.push("");
  });

  textLines.push(`View or edit your submission: ${dashboardUrl}`);
  textLines.push(
    "You can view your submission on the dashboard even while it is pending or hidden."
  );

  return {
    htmlBody,
    textBody: textLines.join("\n"),
    subject: `Album Club – ${weekLabel} Review Confirmation`,
  };
}

export function buildReminderEmailTemplate(week: WeekData): EmailContent {
  const deadlineLabel = week.response_deadline
    ? formatDeadline(week.response_deadline)
    : null;
  const subject = deadlineLabel
    ? `${EMAIL_TEMPLATE_PLACEHOLDERS.firstName}, your reviews are due by ${deadlineLabel}`
    : `${EMAIL_TEMPLATE_PLACEHOLDERS.firstName}, your album reviews are due soon`;

  const buildAlbumLabel = (
    artist?: string | null,
    title?: string | null,
    year?: string | null
  ) => {
    const safeArtist = artist?.trim();
    const safeTitle = title?.trim();
    const safeYear = year?.trim();
    if (!safeArtist && !safeTitle && !safeYear) return null;
    const base = [safeArtist, safeTitle].filter(Boolean).join(" - ");
    const label = base || safeArtist || safeTitle || "Album";
    return safeYear ? `${label} (${safeYear})` : label;
  };

  const contemporaryLabel = buildAlbumLabel(
    week.contemporary_artist,
    week.contemporary_title,
    week.contemporary_year
  );
  const classicLabel = buildAlbumLabel(
    week.classic_artist,
    week.classic_title,
    week.classic_year
  );

  const deadlineHtml = deadlineLabel
    ? `
          <tr>
            <td style="padding: 0 32px 16px;">
              <p style="margin: 0; color: #e5e5e5; font-size: 15px; line-height: 1.5;">
                Reviews due by <strong style="color: #ffffff;">${deadlineLabel}</strong>.
              </p>
            </td>
          </tr>
`
    : "";

  const albumRows = [
    contemporaryLabel
      ? `
          <tr>
            <td style="padding: 0 0 10px;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Contemporary</p>
              <p style="margin: 4px 0 0; color: #ffffff; font-size: 15px; line-height: 1.5;">${escapeHtml(contemporaryLabel)}</p>
            </td>
          </tr>
`
      : null,
    classicLabel
      ? `
          <tr>
            <td style="padding: 0;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Classic</p>
              <p style="margin: 4px 0 0; color: #ffffff; font-size: 15px; line-height: 1.5;">${escapeHtml(classicLabel)}</p>
            </td>
          </tr>
`
      : null,
  ]
    .filter(Boolean)
    .join("");

  const albumsHtml = albumRows
    ? `
          <tr>
            <td style="padding: 0 32px 20px;">
              <p style="margin: 0 0 12px; color: #e5e5e5; font-size: 15px; font-weight: 600;">This week's albums</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${albumRows}
              </table>
            </td>
          </tr>
`
    : `
          <tr>
            <td style="padding: 0 32px 20px;">
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">Album details are coming soon.</p>
            </td>
          </tr>
`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Album Club – Review Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-bottom: 1px solid #1f1f1f;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Album Club</h1>
              <p style="margin: 8px 0 0; color: #a1a1a1; font-size: 16px;">Review Reminder</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px 8px;">
              <p style="margin: 0; color: #e5e5e5; font-size: 16px; line-height: 1.6;">Hi ${EMAIL_TEMPLATE_PLACEHOLDERS.firstName},</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 16px;">
              <p style="margin: 0; color: #e5e5e5; font-size: 15px; line-height: 1.6;">
                Friendly reminder: we haven&apos;t seen your reviews for this week&apos;s picks yet.
              </p>
            </td>
          </tr>
${deadlineHtml}
${albumsHtml}
          <tr>
            <td style="padding: 8px 32px 24px;">
              <a href="${EMAIL_TEMPLATE_PLACEHOLDERS.submitUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.2px;">
                Submit Your Review
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 16px;">
              <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                Manage preferences: <a href="${EMAIL_TEMPLATE_PLACEHOLDERS.settingsUrl}" style="color: #10b981; text-decoration: underline;">Settings</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 32px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
                <a href="${EMAIL_TEMPLATE_PLACEHOLDERS.unsubscribeUrl}" style="color: #737373; text-decoration: underline;">Unsubscribe from reminder emails</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const textLines: string[] = [
    `Hi ${EMAIL_TEMPLATE_PLACEHOLDERS.firstName},`,
    "",
    "Friendly reminder: we haven't seen your reviews for this week's picks yet.",
  ];

  if (deadlineLabel) {
    textLines.push("", `Reviews due by ${deadlineLabel}.`);
  }

  textLines.push("", "This week's albums:");
  if (contemporaryLabel) {
    textLines.push(`- Contemporary: ${contemporaryLabel}`);
  }
  if (classicLabel) {
    textLines.push(`- Classic: ${classicLabel}`);
  }
  if (!contemporaryLabel && !classicLabel) {
    textLines.push("- Album details are coming soon.");
  }

  textLines.push(
    "",
    "Submit your review:",
    EMAIL_TEMPLATE_PLACEHOLDERS.submitUrl,
    "",
    `Manage preferences: ${EMAIL_TEMPLATE_PLACEHOLDERS.settingsUrl}`,
    `Unsubscribe from reminder emails: ${EMAIL_TEMPLATE_PLACEHOLDERS.unsubscribeUrl}`
  );

  return {
    htmlBody,
    textBody: textLines.join("\n"),
    subject,
  };
}

export function buildWeeklyEmailTemplate(
  week: WeekData,
  reviewStats: ReviewStats | null
): EmailContent {
  return buildEmailContentFromParams(
    week,
    EMAIL_TEMPLATE_PLACEHOLDERS,
    reviewStats,
    false
  );
}

const applyReplacements = (
  input: string,
  replacements: Record<string, string>
) => {
  let output = input;
  Object.entries(replacements).forEach(([token, value]) => {
    output = output.replaceAll(token, value);
  });
  return output;
};

export function renderEmailTemplate(
  template: EmailContent,
  participant: Participant
): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const replacements = {
    [EMAIL_TEMPLATE_PLACEHOLDERS.firstName]: participant.name.split(' ')[0],
    [EMAIL_TEMPLATE_PLACEHOLDERS.submitUrl]: `${appUrl}/submit?email=${encodeURIComponent(participant.email)}`,
    [EMAIL_TEMPLATE_PLACEHOLDERS.dashboardUrl]: `${appUrl}/dashboard`,
    [EMAIL_TEMPLATE_PLACEHOLDERS.unsubscribeUrl]: `${appUrl}/unsubscribe?token=${participant.unsubscribe_token}`,
    [EMAIL_TEMPLATE_PLACEHOLDERS.inviteUrl]: `${appUrl}/invite-friend?ref=${participant.id}`,
    [EMAIL_TEMPLATE_PLACEHOLDERS.settingsUrl]: `${appUrl}/settings`,
  };

  return {
    subject: applyReplacements(template.subject, replacements),
    htmlBody: applyReplacements(template.htmlBody, replacements),
    textBody: applyReplacements(template.textBody, replacements),
  };
}

export function renderReminderEmailTemplate(
  template: EmailContent,
  participant: ReminderParticipant
): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const replacements = {
    [EMAIL_TEMPLATE_PLACEHOLDERS.firstName]: participant.name.split(' ')[0],
    [EMAIL_TEMPLATE_PLACEHOLDERS.submitUrl]: `${appUrl}/submit?email=${encodeURIComponent(participant.email)}`,
    [EMAIL_TEMPLATE_PLACEHOLDERS.dashboardUrl]: `${appUrl}/dashboard`,
    [EMAIL_TEMPLATE_PLACEHOLDERS.unsubscribeUrl]: `${appUrl}/unsubscribe?token=${participant.reminder_unsubscribe_token}&type=reminder`,
    [EMAIL_TEMPLATE_PLACEHOLDERS.inviteUrl]: `${appUrl}/invite-friend?ref=${participant.id}`,
    [EMAIL_TEMPLATE_PLACEHOLDERS.settingsUrl]: `${appUrl}/settings`,
  };

  return {
    subject: applyReplacements(template.subject, replacements),
    htmlBody: applyReplacements(template.htmlBody, replacements),
    textBody: applyReplacements(template.textBody, replacements),
  };
}
