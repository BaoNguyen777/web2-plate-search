# Web 2 — Plate Search

Mobile-first Next.js app for looking up license plates recognized by Web 1 + AI Server.

## Complete flow

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

## Supabase setup

Create a Storage bucket named `plate-images`. Keep it private because Web 2 generates short-lived signed URLs.

Run this SQL in Supabase:

```sql
create table if not exists public.plate_records (
  id uuid primary key,
  plate text not null,
  display_plate text not null,
  image_name text not null,
  image_path text not null,
  confidence numeric not null default 0,
  status text not null default 'Đã nhận diện',
  created_at timestamptz not null default now()
);

create index if not exists plate_records_plate_created_idx
on public.plate_records (plate, created_at desc);
```

The server uses the Supabase service-role key, so do **not** expose that key in client-side code or commit it to GitHub.

## Environment variables

### Web 1

```env
AI_API_URL=https://ai-server-production-c4e5.up.railway.app
AI_API_KEY=your_ai_key
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=plate-images
```

### Web 2

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=plate-images
CRON_SECRET=your_random_cleanup_secret
```

### GitHub Actions secrets for Web 2

```text
CLEANUP_URL=https://YOUR-WEB2-DOMAIN
CRON_SECRET=the_same_cleanup_secret
```

The workflow calls `/api/cleanup` hourly. It removes records and their stored images older than 24 hours. The search API also filters to the latest 24 hours, so expired data cannot appear in normal lookup even if cleanup has not run yet.

## API

### Web 2 search

```text
GET /api/search?plate=43A12345
```

Returns matching records and short-lived signed image URLs.

### Cleanup

```text
POST /api/cleanup
Authorization: Bearer <CRON_SECRET>
```

## Run locally

```bash
npm install
npm run dev
```

No CSV upload is required in Web 2 anymore. Web 1 sends recognized images into the shared storage/database automatically.
