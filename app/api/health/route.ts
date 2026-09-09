import { NextResponse } from "next/server";
import { readSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = readSupabaseConfig();
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        service: "web2-plate-search",
        supabase: false,
        supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL?.trim()),
        serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
        storageBucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || "plate-images",
        cronSecretConfigured,
        error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
      },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/plate_records?select=id&limit=1`,
      {
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
        },
        cache: "no-store",
      }
    );

    return NextResponse.json(
      {
        ok: response.ok && cronSecretConfigured,
        service: "web2-plate-search",
        supabase: response.ok,
        supabaseUrlConfigured: true,
        serviceRoleConfigured: true,
        storageBucket: config.bucket,
        cronSecretConfigured,
        databaseStatus: response.status,
        error: response.ok ? undefined : `Supabase HTTP ${response.status}`,
      },
      { status: response.ok && cronSecretConfigured ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "web2-plate-search",
        supabase: false,
        supabaseUrlConfigured: true,
        serviceRoleConfigured: true,
        storageBucket: config.bucket,
        cronSecretConfigured,
        error: error instanceof Error ? error.message : "Cannot reach Supabase.",
      },
      { status: 502 }
    );
  }
}
