#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { buildWeeklyEmailTemplate } from '../lib/email/emailBuilder';
import type { ReviewStats } from '../lib/email/emailBuilder';
import { getFirstName } from '../lib/utils/names';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const weekArg = args.find((arg) => arg.startsWith('--week='));
const startWeekArg = args.find((arg) => arg.startsWith('--start-week='));
const endWeekArg = args.find((arg) => arg.startsWith('--end-week='));
const groupByArg = args.find((arg) => arg.startsWith('--group-by='));
const groupBy = groupByArg?.split('=')[1] || 'day';

const weekFilter = weekArg ? parseInt(weekArg.split('=')[1], 10) : null;
const startWeek = startWeekArg ? parseInt(startWeekArg.split('=')[1], 10) : null;
const endWeek = endWeekArg ? parseInt(endWeekArg.split('=')[1], 10) : null;

const formatWeekLabel = (
  dateStr: string | null | undefined,
  fallbackWeekNumber?: number
) => {
  if (!dateStr) {
    return fallbackWeekNumber ? `Week ${fallbackWeekNumber}` : 'Album Club';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return fallbackWeekNumber ? `Week ${fallbackWeekNumber}` : 'Album Club';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const getBucketKey = (sentAt: string | null, weekNumber: number) => {
  if (groupBy === 'week') {
    return `${weekNumber}:week`;
  }

  if (!sentAt) {
    return `${weekNumber}:unknown`;
  }

  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) {
    return `${weekNumber}:unknown`;
  }
  return `${weekNumber}:${date.toISOString().slice(0, 10)}`;
};

const getDayRange = (sentAt: string) => {
  const date = new Date(sentAt);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

const buildReviewStats = async (
  weekNumber: number
): Promise<ReviewStats | null> => {
  const prevWeek = weekNumber - 1;
  if (prevWeek <= 0) return null;

  const { data: stats } = await supabase
    .from('reviews')
    .select('*, participant:participants!reviews_participant_id_fkey(name)')
    .eq('week_number', prevWeek)
    .eq('moderation_status', 'approved');

  if (!stats || stats.length === 0) {
    return null;
  }

  let prevWeekLabel = `Week ${prevWeek}`;
  const { data: prevWeekData } = await supabase
    .from('weeks')
    .select('created_at, contemporary_title, contemporary_artist, classic_title, classic_artist')
    .eq('week_number', prevWeek)
    .single();

  if (prevWeekData?.created_at) {
    prevWeekLabel = formatWeekLabel(prevWeekData.created_at, prevWeek);
  }

  const contempRatings: number[] = [];
  const classicRatings: number[] = [];
  const contempReviews: Array<{ name: string; reviewText: string }> = [];
  const classicReviews: Array<{ name: string; reviewText: string }> = [];

  const addRating = (target: number[], value: any) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      target.push(parsed);
    }
  };

  const addReviewText = (
    target: Array<{ name: string; reviewText: string }>,
    text: any,
    name: string | null | undefined
  ) => {
    if (typeof text !== 'string') return;
    const trimmed = text.trim();
    if (!trimmed) return;
    target.push({ reviewText: trimmed, name: getFirstName(name) });
  };

  stats.forEach((review: any) => {
    const participantName = review.participant?.name ?? 'Unknown';
    if (review.album_type === 'contemporary') {
      addRating(contempRatings, review.rating);
      addReviewText(contempReviews, review.review_text, participantName);
      return;
    }
    if (review.album_type === 'classic') {
      addRating(classicRatings, review.rating);
      addReviewText(classicReviews, review.review_text, participantName);
      return;
    }

    if (review.contemporary_rating !== null && review.contemporary_rating !== undefined) {
      addRating(contempRatings, review.contemporary_rating);
      addReviewText(contempReviews, review.contemporary_comments ?? review.review_text, participantName);
    }
    if (review.classic_rating !== null && review.classic_rating !== undefined) {
      addRating(classicRatings, review.classic_rating);
      addReviewText(classicReviews, review.classic_comments ?? review.review_text, participantName);
    }
  });

  const buildAlbumLabel = (artist?: string | null, title?: string | null) => {
    const safeArtist = artist?.trim();
    const safeTitle = title?.trim();
    if (safeArtist && safeTitle) return `${safeArtist} - ${safeTitle}`;
    return safeArtist || safeTitle || 'Album';
  };

  return {
    prevWeek,
    prevWeekLabel,
    contemporary: {
      avgRating:
        contempRatings.length > 0
          ? (contempRatings.reduce((sum, rating) => sum + rating, 0) / contempRatings.length).toFixed(1)
          : null,
      count: contempRatings.length,
      albumLabel: buildAlbumLabel(
        prevWeekData?.contemporary_artist,
        prevWeekData?.contemporary_title
      ),
      reviews: contempReviews,
    },
    classic: {
      avgRating:
        classicRatings.length > 0
          ? (classicRatings.reduce((sum, rating) => sum + rating, 0) / classicRatings.length).toFixed(1)
          : null,
      count: classicRatings.length,
      albumLabel: buildAlbumLabel(prevWeekData?.classic_artist, prevWeekData?.classic_title),
      reviews: classicReviews,
    },
  };
};

const fetchEmailLogs = async () => {
  const logs: any[] = [];
  const pageSize = 1000;
  let start = 0;

  while (true) {
    let query = supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: true })
      .range(start, start + pageSize - 1);

    if (weekFilter !== null) {
      query = query.eq('week_number', weekFilter);
    } else {
      if (startWeek !== null) {
        query = query.gte('week_number', startWeek);
      }
      if (endWeek !== null) {
        query = query.lte('week_number', endWeek);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    logs.push(...data);
    start += pageSize;
  }

  return logs;
};

async function main() {
  console.log('📬 Backfilling email_sends from email_logs');
  console.log(`   Grouping: ${groupBy}`);
  if (dryRun) console.log('   Dry run: no writes will be made');

  const logs = await fetchEmailLogs();

  if (logs.length === 0) {
    console.log('✅ No email_logs found. Nothing to backfill.');
    return;
  }

  console.log(`   Loaded ${logs.length} email log(s)`);

  const groups = new Map<
    string,
    { weekNumber: number; bucket: string; logs: any[]; minSentAt: string | null }
  >();

  logs.forEach((log) => {
    const weekNumber = log.week_number;
    const bucket = getBucketKey(log.sent_at, weekNumber);
    if (!groups.has(bucket)) {
      groups.set(bucket, {
        weekNumber,
        bucket,
        logs: [],
        minSentAt: log.sent_at || null,
      });
    }
    const group = groups.get(bucket)!;
    group.logs.push(log);
    if (log.sent_at) {
      if (!group.minSentAt || log.sent_at < group.minSentAt) {
        group.minSentAt = log.sent_at;
      }
    }
  });

  const weekNumbers = Array.from(new Set(Array.from(groups.values()).map((g) => g.weekNumber)));

  const { data: weeksData, error: weeksError } = await supabase
    .from('weeks')
    .select('*')
    .in('week_number', weekNumbers);

  if (weeksError) {
    throw weeksError;
  }

  const weeksByNumber = new Map(
    (weeksData || []).map((week: any) => [week.week_number, week])
  );

  const existingSendsByWeek = new Map<number, any[]>();
  for (const weekNumber of weekNumbers) {
    const { data: existingSends } = await supabase
      .from('email_sends')
      .select('id, created_at, source_send_id')
      .eq('week_number', weekNumber)
      .is('source_send_id', null);
    existingSendsByWeek.set(weekNumber, existingSends || []);
  }

  let createdSendCount = 0;
  let createdRecipientCount = 0;
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    if (a.weekNumber === b.weekNumber) {
      return (a.minSentAt || '').localeCompare(b.minSentAt || '');
    }
    return a.weekNumber - b.weekNumber;
  });

  for (const group of sortedGroups) {
    const week = weeksByNumber.get(group.weekNumber);
    if (!week) {
      console.warn(`⚠️  Week ${group.weekNumber} not found. Skipping.`);
      continue;
    }

    const minSentAt = group.minSentAt || week.created_at || new Date().toISOString();
    const existingSends = existingSendsByWeek.get(group.weekNumber) || [];

    if (groupBy === 'week') {
      if (existingSends.length > 0) {
        console.log(`↪️  Week ${group.weekNumber}: send already exists, skipping.`);
        continue;
      }
    } else {
      const { start, end } = getDayRange(minSentAt);
      const hasExisting = existingSends.some((send) => {
        return send.created_at >= start && send.created_at < end;
      });
      if (hasExisting) {
        console.log(`↪️  Week ${group.weekNumber} ${start.slice(0, 10)} already exists, skipping.`);
        continue;
      }
    }

    const reviewStats = await buildReviewStats(group.weekNumber);
    const template = buildWeeklyEmailTemplate(week, reviewStats);

    if (dryRun) {
      console.log(
        `🧪 Would create send for Week ${group.weekNumber} (${group.logs.length} recipients)`
      );
      continue;
    }

    const { data: sendInsert, error: sendInsertError } = await supabase
      .from('email_sends')
      .insert({
        week_number: group.weekNumber,
        email_type: 'weekly_prompt',
        subject: template.subject,
        html_body: template.htmlBody,
        text_body: template.textBody,
        created_at: minSentAt,
      })
      .select('id')
      .single();

    if (sendInsertError) {
      console.error(`❌ Failed to create send for week ${group.weekNumber}:`, sendInsertError.message);
      continue;
    }

    const sendId = sendInsert.id;
    createdSendCount += 1;

    const recipientRows = group.logs.map((log) => ({
      send_id: sendId,
      participant_id: log.participant_id,
      participant_email: log.participant_email,
      status: log.status === 'sent' ? 'sent' : 'failed',
      sent_at: log.sent_at,
      resend_id: log.resend_id,
      error_message: log.error_message,
    }));

    const recipientChunks = chunk(recipientRows, 500);
    for (const recipientChunk of recipientChunks) {
      const { error: recipientError } = await supabase
        .from('email_send_recipients')
        .insert(recipientChunk);
      if (recipientError) {
        console.error(`❌ Failed to insert recipients for week ${group.weekNumber}:`, recipientError.message);
        break;
      }
      createdRecipientCount += recipientChunk.length;
    }

    console.log(
      `✅ Week ${group.weekNumber}: created send with ${group.logs.length} recipient log(s)`
    );
  }

  console.log('\n🎉 Backfill complete');
  console.log(`   Sends created: ${createdSendCount}`);
  console.log(`   Recipient rows created: ${createdRecipientCount}`);
}

main().catch((error) => {
  console.error('❌ Backfill failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
