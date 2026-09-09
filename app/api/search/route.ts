import { NextResponse } from "next/server";
import { getSupabaseConfig, storageSignUrl, supabaseHeaders } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePlate(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export async function GET(request: Request) {
  try {
    const { url, bucket } = getSupabaseConfig();
    const query = new URL(request.url).searchParams.get("plate") || "";
    const plate = normalizePlate(query);

    if (!plate) {
      return NextResponse.json(
        { found: false, records: [], error: "Thiếu biển số." },
        { status: 400 }
      );
    }

    const dbUrl = new URL(`${url}/rest/v1/plate_records`);
    dbUrl.searchParams.set("plate", `eq.${plate}`);
    dbUrl.searchParams.set(
      "select",
      "id,plate,display_plate,image_name,image_path,confidence,status,created_at"
    );
    dbUrl.searchParams.set(
      "created_at",
      `gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`
    );
    dbUrl.searchParams.set("order", "created_at.desc");
    dbUrl.searchParams.set("limit", "20");

    const response = await fetch(dbUrl, {
      headers: supabaseHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[plate search] Supabase query failed", response.status, detail);
      return NextResponse.json(
        { found: false, records: [], error: `Database HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const records = (await response.json()) as Array<Record<string, unknown>>;

    const signedRecords = await Promise.all(
      records.map(async (record) => {
        const path = typeof record.image_path === "string" ? record.image_path : "";
        let imageUrl: string | null = null;

        if (path) {
          const signResponse = await fetch(storageSignUrl(bucket, path), {
            method: "POST",
            headers: supabaseHeaders("application/json"),
            body: JSON.stringify({ expiresIn: 3600 }),
            cache: "no-store",
          });

          if (signResponse.ok) {
            const signed = (await signResponse.json()) as { signedURL?: string };
            if (signed.signedURL) {
              imageUrl = signed.signedURL.startsWith("http")
                ? signed.signedURL
                : `${url}/storage/v1${signed.signedURL}`;
            }
          } else {
            console.error(
              "[plate search] Supabase signed URL failed",
              signResponse.status,
              path
            );
          }
        }

        return {
          id: record.id,
          plate: record.display_plate || record.plate,
          imageName: record.image_name,
          confidence: record.confidence,
          status: record.status,
          createdAt: record.created_at,
          imageUrl,
        };
      })
    );

    return NextResponse.json({
      found: signedRecords.length > 0,
      count: signedRecords.length,
      records: signedRecords,
    });
  } catch (error) {
    console.error("[plate search]", error);
    return NextResponse.json(
      {
        found: false,
        records: [],
        error: error instanceof Error ? error.message : "Không thể tra cứu.",
      },
      { status: 500 }
    );
  }
}
