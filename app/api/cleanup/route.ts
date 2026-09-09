import { NextResponse } from "next/server";
import {
  getSupabaseConfig,
  storageObjectUrl,
  supabaseHeaders,
} from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { url, key, bucket } = getSupabaseConfig();
    const secret = process.env.CRON_SECRET?.trim();

    if (!secret) {
      return NextResponse.json(
        { success: false, error: "CRON_SECRET is not configured." },
        { status: 500 }
      );
    }

    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const query = new URL(`${url}/rest/v1/plate_records`);
    query.searchParams.set("created_at", `lt.${cutoff}`);
    query.searchParams.set("select", "id,image_path");
    query.searchParams.set("limit", "500");

    const headers = supabaseHeaders();
    const findResponse = await fetch(query, { headers, cache: "no-store" });

    if (!findResponse.ok) {
      const detail = await findResponse.text().catch(() => "");
      console.error("[plate cleanup] Supabase query failed", findResponse.status, detail);
      return NextResponse.json(
        { success: false, error: `Database HTTP ${findResponse.status}` },
        { status: 502 }
      );
    }

    const oldRecords = (await findResponse.json()) as Array<{
      id: string;
      image_path: string | null;
    }>;

    let deletedImages = 0;

    for (const record of oldRecords) {
      if (!record.image_path) continue;

      const response = await fetch(
        storageObjectUrl(bucket, record.image_path),
        { method: "DELETE", headers, cache: "no-store" }
      );

      if (response.ok || response.status === 404) {
        deletedImages += 1;
      } else {
        console.error(
          "[plate cleanup] Storage delete failed",
          response.status,
          record.image_path
        );
      }
    }

    // Delete DB rows only after the storage cleanup attempt.
    if (oldRecords.length) {
      const ids = oldRecords.map((record) => record.id).join(",");
      const deleteUrl = new URL(`${url}/rest/v1/plate_records`);
      deleteUrl.searchParams.set("id", `in.(${ids})`);

      const deleteResponse = await fetch(deleteUrl, {
        method: "DELETE",
        headers,
        cache: "no-store",
      });

      if (!deleteResponse.ok) {
        const detail = await deleteResponse.text().catch(() => "");
        console.error(
          "[plate cleanup] Database delete failed",
          deleteResponse.status,
          detail
        );
        return NextResponse.json(
          { success: false, error: `Database delete HTTP ${deleteResponse.status}` },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      deletedRecords: oldRecords.length,
      deletedImages,
      cutoff,
    });
  } catch (error) {
    console.error("[plate cleanup]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cleanup failed",
      },
      { status: 500 }
    );
  }
}
