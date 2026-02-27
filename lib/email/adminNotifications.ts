import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailContent } from "./emailBuilder";

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// TYPES
// ============================================================================

export interface ReviewNotificationData {
  participantName: string;
  participantEmail: string;
  participantId: string;
  weekNumber: number;
  reviews: Array<{
    albumType: "contemporary" | "classic";
    rating: number;
    reviewText: string | null;
  }>;
}

export interface SignupNotificationData {
  participantName: string;
  participantEmail: string;
  referrerName: string | null;
}

interface Curator {
  id: string;
  email: string;
  name: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
};

export async function getCurators(
  supabase: SupabaseClient
): Promise<Curator[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("id, email, name")
    .eq("is_curator", true)
    .is("deleted_at", null);

  if (error) throw error;
  return (data as Curator[]) || [];
}

// ============================================================================
// EMAIL BUILDERS
// ============================================================================

export function buildReviewNotificationEmail(
  data: ReviewNotificationData
): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const moderationUrl = `${appUrl}/admin`;
  const safeName = escapeHtml(data.participantName);
  const safeEmail = escapeHtml(data.participantEmail);

  const reviewRows = data.reviews
    .map((review) => {
      const albumLabel =
        review.albumType === "contemporary" ? "Contemporary" : "Classic";
      const snippet = review.reviewText
        ? truncateText(review.reviewText, 100)
        : "No review text";
      const safeSnippet = escapeHtml(snippet);

      return `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #1f1f1f;">
                    <p style="margin: 0 0 4px; color: #10b981; font-size: 12px; font-weight: 600; text-transform: uppercase;">${albumLabel}</p>
                    <p style="margin: 0 0 4px; color: #ffffff; font-size: 15px;">Rating: <strong>${review.rating}/10</strong></p>
                    <p style="margin: 0; color: #a1a1a1; font-size: 13px; line-height: 1.4;">"${safeSnippet}"</p>
                  </td>
                </tr>`;
    })
    .join("");

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Review Submitted</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-bottom: 1px solid #1f1f1f;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">New Review Submitted</h1>
              <p style="margin: 8px 0 0; color: #a1a1a1; font-size: 14px;">Week ${data.weekNumber}</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 4px; color: #ffffff; font-size: 16px; font-weight: 600;">${safeName}</p>
              <p style="margin: 0 0 16px; color: #737373; font-size: 14px;">${safeEmail}</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                ${reviewRows}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 24px;">
              <a href="${moderationUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">View in Moderation Queue</a>
            </td>
          </tr>

          <tr>
            <td style="padding: 16px 32px; border-top: 1px solid #1f1f1f;">
              <p style="margin: 0; color: #525252; font-size: 11px;">You're receiving this because you're a curator.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    "New Review Submitted",
    `Week ${data.weekNumber}`,
    "",
    `${data.participantName} (${data.participantEmail})`,
    "",
  ];

  data.reviews.forEach((review) => {
    const albumLabel =
      review.albumType === "contemporary" ? "Contemporary" : "Classic";
    const snippet = review.reviewText
      ? truncateText(review.reviewText, 100)
      : "No review text";
    textLines.push(`${albumLabel}: ${review.rating}/10`);
    textLines.push(`"${snippet}"`);
    textLines.push("");
  });

  textLines.push(`View in moderation queue: ${moderationUrl}`);
  textLines.push("");
  textLines.push("---");
  textLines.push("You're receiving this because you're a curator.");

  return {
    htmlBody,
    textBody: textLines.join("\n"),
    subject: `New review submitted - ${data.participantName} (Week ${data.weekNumber})`,
  };
}

export function buildSignupNotificationEmail(
  data: SignupNotificationData
): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const participantsUrl = `${appUrl}/admin/participants`;
  const safeName = escapeHtml(data.participantName);
  const safeEmail = escapeHtml(data.participantEmail);
  const safeReferrer = data.referrerName ? escapeHtml(data.referrerName) : null;

  const referralText = safeReferrer
    ? `<p style="margin: 0; color: #a1a1a1; font-size: 14px;">Referred by: <span style="color: #10b981;">${safeReferrer}</span></p>`
    : `<p style="margin: 0; color: #a1a1a1; font-size: 14px;">Direct signup (no referral)</p>`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Member Signed Up</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-bottom: 1px solid #1f1f1f;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">New Member Signed Up</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 4px; color: #ffffff; font-size: 18px; font-weight: 600;">${safeName}</p>
              <p style="margin: 0 0 12px; color: #737373; font-size: 14px;">${safeEmail}</p>
              ${referralText}
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 24px;">
              <a href="${participantsUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">View Participants</a>
            </td>
          </tr>

          <tr>
            <td style="padding: 16px 32px; border-top: 1px solid #1f1f1f;">
              <p style="margin: 0; color: #525252; font-size: 11px;">You're receiving this because you're a curator.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    "New Member Signed Up",
    "",
    `${data.participantName} (${data.participantEmail})`,
    data.referrerName
      ? `Referred by: ${data.referrerName}`
      : "Direct signup (no referral)",
    "",
    `View participants: ${participantsUrl}`,
    "",
    "---",
    "You're receiving this because you're a curator.",
  ];

  return {
    htmlBody,
    textBody: textLines.join("\n"),
    subject: `New member signed up - ${data.participantName}`,
  };
}

// ============================================================================
// SEND FUNCTIONS
// ============================================================================

export async function sendReviewAdminNotification(
  supabase: SupabaseClient,
  data: ReviewNotificationData
): Promise<void> {
  const curators = await getCurators(supabase);

  // Exclude the submitter if they are a curator
  const recipients = curators.filter((c) => c.id !== data.participantId);

  if (recipients.length === 0) {
    return;
  }

  const emailContent = buildReviewNotificationEmail(data);

  // Send to all curators (excluding self)
  const sendPromises = recipients.map(async (curator) => {
    try {
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "Album Club <onboarding@resend.dev>",
        replyTo: process.env.RESEND_REPLY_TO_EMAIL,
        to: curator.email,
        subject: emailContent.subject,
        html: emailContent.htmlBody,
        text: emailContent.textBody,
      });
    } catch (error) {
      console.error(
        `Failed to send review notification to ${curator.email}:`,
        error
      );
    }
  });

  await Promise.allSettled(sendPromises);
}

export async function sendSignupAdminNotification(
  supabase: SupabaseClient,
  data: SignupNotificationData
): Promise<void> {
  const curators = await getCurators(supabase);

  if (curators.length === 0) {
    return;
  }

  const emailContent = buildSignupNotificationEmail(data);

  // Send to all curators
  const sendPromises = curators.map(async (curator) => {
    try {
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "Album Club <onboarding@resend.dev>",
        replyTo: process.env.RESEND_REPLY_TO_EMAIL,
        to: curator.email,
        subject: emailContent.subject,
        html: emailContent.htmlBody,
        text: emailContent.textBody,
      });
    } catch (error) {
      console.error(
        `Failed to send signup notification to ${curator.email}:`,
        error
      );
    }
  });

  await Promise.allSettled(sendPromises);
}
