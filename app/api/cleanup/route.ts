import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function config() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "plate-images";
  const secret = process.env.CRON_SECRET?.trim();
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  return { url, key, bucket, secret };
}

export async function POST(request: Request) {
  try {
    const { url, key, bucket, secret } = config();
    if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const query = new URL(`${url}/rest/v1/plate_records`);
    query.searchParams.set("created_at", `lt.${cutoff}`);
    query.searchParams.set("select", "id,image_path");
    query.searchParams.set("limit", "500");

    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    const findResponse = await fetch(query, { headers, cache: "no-store" });
    if (!findResponse.ok) return NextResponse.json({ success: false, error: `Database HTTP ${findResponse.status}` }, { status: 502 });

    const oldRecords = await findResponse.json() as Array<{ id: string; image_path: string | null }>;
    let deletedImages = 0;

    for (const record of oldRecords) {
      if (!record.image_path) continue;
      const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${record.image_path}`, { method: "DELETE", headers, cache: "no-store" });
      if (response.ok || response.status === 404) deletedImages += 1;
    }

    if (oldRecords.length) {
      const ids = oldRecords.map((record) => record.id);
      const deleteUrl = new URL(`${url}/rest/v1/plate_records`);
      deleteUrl.searchParams.set("id", `in.(${ids.join(",")})`);
      await fetch(deleteUrl, { method: "DELETE", headers, cache: "no-store" });
    }

    return NextResponse.json({ success: true, deletedRecords: oldRecords.length, deletedImages, cutoff });
  } catch (error) {
    console.error("[plate cleanup]", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Cleanup failed" }, { status: 500 });
  }
}
