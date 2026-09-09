import { NextResponse } from "next/server";
import { readSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = readSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        service: "web2-plate-search",
        supabase: false,
        supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL?.trim()),
        publishableKeyConfigured: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY?.trim()),
        storageBucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || "plate-images",
        accessMode: "read-only",
        error: "SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is missing.",
      },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/plate_records?select=id&limit=1`, {
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
      },
      cache: "no-store",
    });

    return NextResponse.json(
      {
        ok: response.ok,
        service: "web2-plate-search",
        supabase: response.ok,
        supabaseUrlConfigured: true,
        publishableKeyConfigured: true,
        storageBucket: config.bucket,
        databaseStatus: response.status,
        accessMode: "read-only",
        error: response.ok ? undefined : `Supabase HTTP ${response.status}`,
      },
      { status: response.ok ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "web2-plate-search",
        supabase: false,
        supabaseUrlConfigured: true,
        publishableKeyConfigured: true,
        storageBucket: config.bucket,
        accessMode: "read-only",
        error: error instanceof Error ? error.message : "Cannot reach Supabase.",
      },
      { status: 502 }
    );
  }
}
