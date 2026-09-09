-- Web 2 — Plate Search
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.plate_records (
  id uuid primary key default gen_random_uuid(),
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

create index if not exists plate_records_created_idx
  on public.plate_records (created_at desc);

-- Keep the bucket private. Web 2 creates signed URLs server-side.
insert into storage.buckets (id, name, public)
values ('plate-images', 'plate-images', false)
on conflict (id) do update set public = false;

-- Service-role access is used by the Next.js server routes.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY to browser/client code.
