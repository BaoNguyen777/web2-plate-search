# Web 2 — Plate Search

Mobile-first Next.js app for looking up license plates recognized by Web 1 + AI Server.

## Architecture

```text
Web 1
  │ upload image
  ▼
AI Server (YOLO + PaddleOCR)
  │ licensePlate / confidence
  ▼
Web 1 server route
  ├── Supabase Storage → original image
  └── Supabase Postgres → plate metadata
          │
          ▼
Web 2 /api/search
  ├── find plate from last 24 hours
  └── create a 1-hour signed image URL
          │
          ▼
Mobile Web 2 → plate + matching image
```

## 1. Supabase setup

Create or use one Supabase project shared by Web 1 and Web 2.

Run [`supabase/schema.sql`](./supabase/schema.sql) once in **Supabase → SQL Editor**. It creates `public.plate_records`, the required indexes, and a **private** Storage bucket named `plate-images`.

The bucket must remain private. Web 2 creates a short-lived signed URL on the server, so the original image is never made public.

### Required table contract

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid | Record id |
| `plate` | text | Normalized plate used for lookup |
| `display_plate` | text | Plate shown to the user |
| `image_name` | text | Original image filename |
| `image_path` | text | Path inside `plate-images` |
| `confidence` | numeric | AI confidence |
| `status` | text | Recognition status |
| `created_at` | timestamptz | Retention timestamp |

## 2. Environment variables

Copy `.env.example` to `.env.local` for local development.

### Web 1 and Web 2 must use the same Supabase project

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=plate-images
```

Web 2 additionally requires:

```env
CRON_SECRET=YOUR_LONG_RANDOM_SECRET
```

**Important:** use the exact variable name `SUPABASE_SERVICE_ROLE_KEY`. Do not use `SUPABASE_KEY`, `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`, or expose the service-role key to client-side code.

The service-role key bypasses RLS and must only exist in server-side/Vercel environment variables. Never commit `.env.local` or real secrets.

## 3. Vercel deployment

In the Web 2 Vercel project, open **Settings → Environment Variables** and add these variables for the environments you deploy (`Production`, and `Preview` if needed):

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
CRON_SECRET
```

Recommended value:

```text
SUPABASE_STORAGE_BUCKET=plate-images
```

After adding or changing environment variables, **redeploy** Web 2. Existing deployments do not automatically receive newly added variables.

After deployment, verify:

```text
GET https://YOUR-WEB2-DOMAIN/api/health
```

A correctly configured deployment returns `ok: true` without exposing any secret value.

## 4. Cleanup

GitHub Actions runs `.github/workflows/cleanup.yml` hourly. Add these repository secrets:

```text
CLEANUP_URL=https://YOUR-WEB2-DOMAIN
CRON_SECRET=THE_SAME_VALUE_AS_VERCEL
```

The workflow calls:

```text
POST /api/cleanup
Authorization: Bearer <CRON_SECRET>
```

Cleanup removes records and their stored images older than 24 hours. The search endpoint also applies the 24-hour filter, so expired records are not returned even if cleanup is temporarily delayed.

## 5. Web 1 integration

Web 1 must write the recognized image and its metadata into the **same Supabase project** and the same `plate_records` table.

Web 1 environment:

```env
AI_API_URL=https://ai-server-production-c4e5.up.railway.app
AI_API_KEY=your_ai_key
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=plate-images
```

For every successful recognition, Web 1 should:

1. Upload the original image to `plate-images`.
2. Store the resulting Storage path in `plate_records.image_path`.
3. Store the normalized plate in `plate_records.plate`.
4. Store the human-readable value in `display_plate`.
5. Store confidence, status, and `created_at`.

## 6. API

### Search

```text
GET /api/search?plate=43A12345
```

Search accepts formats such as `43A12345`, `43A-123.45`, and `43a 12345`. Results are limited to the latest 24 hours and include a short-lived signed image URL when the stored image exists.

### Cleanup

```text
POST /api/cleanup
Authorization: Bearer <CRON_SECRET>
```

### Health

```text
GET /api/health
```

Reports whether the required server-side configuration is present. It never returns secret values.

## 7. Local run

```bash
npm install
npm run dev
```

No CSV upload is required in Web 2. Web 1 sends recognized images into the shared Supabase Storage/database automatically.
