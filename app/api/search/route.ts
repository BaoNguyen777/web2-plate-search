import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function config() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "plate-images";
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  return { url, key, bucket };
}

function headers(contentType?: string): HeadersInit {
  const { key } = config();
  const value: HeadersInit = { apikey: key, Authorization: `Bearer ${key}` };
  if (contentType) value["Content-Type"] = contentType;
  return value;
}

function normalizePlate(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function GET(request: Request) {
  try {
    const { url, bucket } = config();
    const query = new URL(request.url).searchParams.get("plate") || "";
    const plate = normalizePlate(query);
    if (!plate) return NextResponse.json({ found: false, records: [], error: "Thiếu biển số." }, { status: 400 });

    const dbUrl = new URL(`${url}/rest/v1/plate_records`);
    dbUrl.searchParams.set("plate", `eq.${plate}`);
    dbUrl.searchParams.set("select", "id,plate,display_plate,image_name,image_path,confidence,status,created_at");
    dbUrl.searchParams.set("created_at", `gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`);
    dbUrl.searchParams.set("order", "created_at.desc");
    dbUrl.searchParams.set("limit", "20");

    const response = await fetch(dbUrl, { headers: headers(), cache: "no-store" });
    if (!response.ok) return NextResponse.json({ found: false, records: [], error: `Database HTTP ${response.status}` }, { status: 502 });

    const records = await response.json() as Array<Record<string, unknown>>;
    const signedRecords = await Promise.all(records.map(async (record) => {
      const path = String(record.image_path || "");
      let imageUrl: string | null = null;

      if (path) {
        const signResponse = await fetch(`${url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${path}`, {
          method: "POST",
          headers: headers("application/json"),
          body: JSON.stringify({ expiresIn: 3600 }),
          cache: "no-store"
        });
        if (signResponse.ok) {
          const signed = await signResponse.json() as { signedURL?: string };
          if (signed.signedURL) {
            imageUrl = signed.signedURL.startsWith("http") ? signed.signedURL : `${url}/storage/v1${signed.signedURL}`;
          }
        }
      }

      return {
        id: record.id,
        plate: record.display_plate || record.plate,
        imageName: record.image_name,
        confidence: record.confidence,
        status: record.status,
        createdAt: record.created_at,
        imageUrl
      };
    }));

    return NextResponse.json({ found: signedRecords.length > 0, count: signedRecords.length, records: signedRecords });
  } catch (error) {
    console.error("[plate search]", error);
    return NextResponse.json({ found: false, records: [], error: error instanceof Error ? error.message : "Không thể tra cứu." }, { status: 500 });
  }
}
