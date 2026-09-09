const DEFAULT_BUCKET = "plate-images";

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
  bucket: string;
};

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;

  if (!url || !publishableKey) return null;
  return { url, publishableKey, bucket };
}

export function getSupabaseConfig(): SupabaseConfig {
  const config = readSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the deployment environment."
    );
  }
  return config;
}

export function supabaseHeaders(contentType?: string): HeadersInit {
  const { publishableKey } = getSupabaseConfig();
  const headers: Record<string, string> = {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
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
