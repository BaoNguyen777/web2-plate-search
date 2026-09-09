const DEFAULT_BUCKET = "plate-images";

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the deployment environment."
    );
  }

  return { url, serviceRoleKey, bucket };
}

export function supabaseHeaders(contentType?: string): HeadersInit {
  const { serviceRoleKey } = getSupabaseConfig();
  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  if (contentType) headers["Content-Type"] = contentType;
  return headers;
}

export function storageObjectUrl(bucket: string, path: string) {
  return `${getSupabaseConfig().url}/storage/v1/object/${encodeURIComponent(bucket)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function storageSignUrl(bucket: string, path: string) {
  return `${getSupabaseConfig().url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
