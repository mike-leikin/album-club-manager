import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";
import { requireCurator } from "@/lib/auth/utils";
import type { Database } from "@/lib/types/database";

type BulkModerationPayload = {
  reviewIds: string[];
  action: 'approve' | 'hide' | 'delete';
  notes?: string;
};

// POST /api/admin/reviews/bulk - Bulk moderation actions
export async function POST(request: NextRequest) {
  try {
    const session = await requireCurator();
    const body: BulkModerationPayload = await request.json();

    if (!body.reviewIds || body.reviewIds.length === 0) {
      return NextResponse.json({ error: "No reviews selected" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get curator's participant ID
    const { data: curator } = await supabase
      .from("participants")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single<{ id: string }>();

    if (!curator) {
      return NextResponse.json({ error: "Curator not found" }, { status: 404 });
    }

    if (body.action === 'delete') {
      // Permanent deletion
      const { error } = await supabase
        .from("reviews")
        .delete()
        .in("id", body.reviewIds);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `${body.reviewIds.length} reviews deleted`,
        count: body.reviewIds.length
      });
    } else {
      // Approve or hide
      const status = body.action === 'approve' ? 'approved' : 'hidden';

      const updateData: Database['public']['Tables']['reviews']['Update'] = {
        moderation_status: status,
        moderated_at: new Date().toISOString(),
        moderated_by: curator.id,
        updated_at: new Date().toISOString(),
        ...(body.notes && { moderation_notes: body.notes }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("reviews").update as any)(updateData)
        .in("id", body.reviewIds);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `${body.reviewIds.length} reviews ${body.action}d`,
        count: body.reviewIds.length
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: "Curator access required" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Unable to perform bulk action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
