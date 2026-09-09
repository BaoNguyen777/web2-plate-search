import { NextResponse } from "next/server";
import { getSupabaseConfig, storageSignUrl, supabaseHeaders } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const SELECT_FIELDS =
  "id,plate,display_plate,image_name,image_path,confidence,status,created_at";

type PlateRecord = Record<string, unknown>;

function normalizePlate(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

async function getRequestedPlate(request: Request) {
  const url = new URL(request.url);
  const queryPlate =
    url.searchParams.get("plate") ||
    url.searchParams.get("licensePlate") ||
    url.searchParams.get("q") ||
    "";

  if (queryPlate.trim()) return queryPlate;

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";

    try {
      if (contentType.includes("application/json")) {
        const body = (await request.json()) as Record<string, unknown>;
        return body.plate ?? body.licensePlate ?? body.q ?? "";
      }

      if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        const form = await request.formData();
        return form.get("plate") ?? form.get("licensePlate") ?? form.get("q") ?? "";
      }
    } catch {
      return "";
    }
  }

  return "";
}

async function queryRecords(
  url: string,
  plate: string,
  since: string
): Promise<PlateRecord[]> {
  const dbUrl = new URL(`${url}/rest/v1/plate_records`);
  dbUrl.searchParams.set(
    "select",
    SELECT_FIELDS
  );
  dbUrl.searchParams.set(
    "created_at",
    `gte.${since}`
  );
  dbUrl.searchParams.set("order", "created_at.desc");
  dbUrl.searchParams.set("limit", "100");

  // Fetch only recent rows visible to the read-only key, then normalize on the
  // server. This handles values such as 68H11024, 68H-110.24, and whitespace
  // differences even if the database formatting is inconsistent.
  const response = await fetch(dbUrl, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[plate search] Supabase query failed", response.status, detail);
    throw new Error(`Database HTTP ${response.status}`);
  }

  const records = (await response.json()) as PlateRecord[];
  return records.filter((record) => {
    const storedPlate = normalizePlate(record.plate);
    const displayPlate = normalizePlate(record.display_plate);
    return storedPlate === plate || displayPlate === plate;
  });
}

export async function GET(request: Request) {
  return search(request);
}

export async function POST(request: Request) {
  return search(request);
}

async function search(request: Request) {
  try {
    const { url, bucket } = getSupabaseConfig();
    const rawPlate = await getRequestedPlate(request);
    const plate = normalizePlate(rawPlate);

    if (!plate) {
      return NextResponse.json(
        { found: false, count: 0, records: [], error: "Thiếu biển số." },
        { status: 400 }
      );
    }

    const since = new Date(Date.now() - DAY_MS).toISOString();
    const records = await queryRecords(url, plate, since);

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
        count: 0,
        records: [],
        error: error instanceof Error ? error.message : "Không thể tra cứu.",
      },
      { status: 500 }
    );
  }
}
