import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "plate-images";
  const cronSecret = process.env.CRON_SECRET?.trim();

  return NextResponse.json({
    ok: Boolean(url && serviceRoleKey && cronSecret),
    supabaseUrlConfigured: Boolean(url),
    serviceRoleConfigured: Boolean(serviceRoleKey),
    storageBucket: bucket,
    cronSecretConfigured: Boolean(cronSecret),
  });
}
