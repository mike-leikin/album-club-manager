import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient as createAdminClient } from "@/lib/supabaseClient";
import { createApiLogger } from "@/lib/logger";
import { requireCuratorApi } from "@/lib/auth/apiAuth";
import {
  buildReminderEmailTemplate,
  renderReminderEmailTemplate,
} from "@/lib/email/emailBuilder";
import * as Sentry from "@sentry/nextjs";
import { createServerClient } from "@supabase/ssr";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const authError = await requireCuratorApi(request);
  if (authError) return authError;

  const requestId = crypto.randomUUID();
  const logger = createApiLogger(requestId);

  try {
    logger.info("Reminder test email request received", { requestId });
    const { weekNumber } = await request.json();

    // Create Supabase client with session context from cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const adminClient = createAdminClient();

    const { data: currentWeek, error: currentWeekError } = await adminClient
      .from("weeks")
      .select("*")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(1)
      .single();

    if (currentWeekError || !currentWeek) {
      const currentWeekLoadError = currentWeekError
        ? new Error(currentWeekError.message)
        : undefined;
      logger.error("Current week not found for reminder test", { requestId }, currentWeekLoadError);
      return NextResponse.json(
        { error: "Current week not found. Please save the week first." },
        { status: 404 }
      );
    }

    const parsedWeekNumber = Number(weekNumber);
    const targetWeekNumber = Number.isFinite(parsedWeekNumber)
      ? parsedWeekNumber
      : currentWeek.week_number;
    if (targetWeekNumber !== currentWeek.week_number) {
      return NextResponse.json(
        {
          error: `Reminder tests can only be sent for the current week (Week ${currentWeek.week_number})`,
        },
        { status: 400 }
      );
    }

    const { data: week, error: weekError } = await adminClient
      .from("weeks")
      .select("*")
      .eq("week_number", targetWeekNumber)
      .single();

    if (weekError || !week) {
      const weekLoadError = weekError ? new Error(weekError.message) : undefined;
      logger.error("Week not found for reminder test", { targetWeekNumber, requestId }, weekLoadError);
      return NextResponse.json(
        { error: "Week not found. Please save the week first." },
        { status: 404 }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      logger.error("Failed to get authenticated user", { requestId }, userError || undefined);
      return NextResponse.json(
        { error: "Failed to get user information" },
        { status: 401 }
      );
    }

    const { data: curator, error: curatorError } = await adminClient
      .from("participants")
      .select("*")
      .eq("email", user.email)
      .eq("is_curator", true)
      .single();

    if (curatorError || !curator) {
      const curatorLoadError = curatorError ? new Error(curatorError.message) : undefined;
      logger.error(
        "Curator participant record not found",
        { email: user.email, requestId },
        curatorLoadError
      );
      return NextResponse.json(
        { error: "Curator participant record not found" },
        { status: 404 }
      );
    }

    const template = buildReminderEmailTemplate(week);
    const personalized = renderReminderEmailTemplate(template, {
      id: curator.id,
      email: curator.email,
      name: curator.name,
      reminder_unsubscribe_token: curator.reminder_unsubscribe_token,
    });

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Album Club <onboarding@resend.dev>",
      replyTo: process.env.RESEND_REPLY_TO_EMAIL,
      to: curator.email,
      subject: personalized.subject,
      html: personalized.htmlBody,
      text: personalized.textBody,
    });

    logger.info("Reminder test email sent", {
      targetWeekNumber,
      recipientEmail: curator.email,
      resendId: result.data?.id,
      requestId,
    });

    return NextResponse.json({
      success: true,
      message: `Reminder test email sent to ${curator.email}`,
      resendId: result.data?.id,
    });
  } catch (error) {
    logger.error(
      "Reminder test email send error",
      { requestId, errorMessage: error instanceof Error ? error.message : "Unknown error" },
      error instanceof Error ? error : new Error(String(error))
    );

    Sentry.captureException(error, {
      tags: { endpoint: "/api/email/send-reminder-test" },
      extra: { requestId },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reminder test email" },
      { status: 500 }
    );
  }
}
