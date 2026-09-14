-- ============================================================
-- FactorX Studios CMS - Supabase Schema
-- Project: factorx-studios
-- ============================================================

create extension if not exists pgcrypto;

-- -----------------------------
-- Helpers
-- -----------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------
-- Admins
-- -----------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

create policy "Admins can read own admin row"
on public.admins
for select
to authenticated
using (user_id = auth.uid());

-- -----------------------------
-- Services / Packages
-- -----------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  badge text,
  title text not null,
  short_description text,
  price numeric(12,2),
  price_label text,
  billing_label text,
  features jsonb not null default '[]'::jsonb,
  button_label text not null default 'Request a quote',
  enquiry_label text,
  colour_preset text not null default 'blue',
  sort_order integer not null default 0,
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

alter table public.services enable row level security;

create policy "Public can read active services"
on public.services
for select
to anon, authenticated
using (active = true or public.is_admin());

create policy "Admins can insert services"
on public.services
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update services"
on public.services
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete services"
on public.services
for delete
to authenticated
using (public.is_admin());

-- -----------------------------
-- Portfolio
-- -----------------------------
create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text,
  category text,
  short_description text,
  project_url text,
  image_path text,
  technologies jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger portfolio_projects_set_updated_at
before update on public.portfolio_projects
for each row execute function public.set_updated_at();

alter table public.portfolio_projects enable row level security;

create policy "Public can read active portfolio projects"
on public.portfolio_projects
for select
to anon, authenticated
using (active = true or public.is_admin());

create policy "Admins can insert portfolio projects"
on public.portfolio_projects
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update portfolio projects"
on public.portfolio_projects
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete portfolio projects"
on public.portfolio_projects
for delete
to authenticated
using (public.is_admin());

-- -----------------------------
-- Enquiries
-- -----------------------------
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  client_name text,
  email text,
  phone text,
  service_id uuid references public.services(id) on delete set null,
  service_name text,
  project_details text,
  status text not null default 'new'
    check (status in ('new','contacted','quoted','won','lost','closed')),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger enquiries_set_updated_at
before update on public.enquiries
for each row execute function public.set_updated_at();

alter table public.enquiries enable row level security;

create policy "Admins can read enquiries"
on public.enquiries
for select
to authenticated
using (public.is_admin());

create policy "Admins can update enquiries"
on public.enquiries
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete enquiries"
on public.enquiries
for delete
to authenticated
using (public.is_admin());

-- Safer public submission path
create or replace function public.submit_enquiry(
  p_client_name text default null,
  p_email text default null,
  p_phone text default null,
  p_service_id uuid default null,
  p_service_name text default null,
  p_project_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_service_name text;
begin
  if p_service_id is not null then
    select title
      into v_service_name
    from public.services
    where id = p_service_id
      and active = true;

    if v_service_name is null then
      raise exception 'Selected service is not available.';
    end if;
  else
    v_service_name := nullif(trim(p_service_name), '');
  end if;

  insert into public.enquiries (
    client_name,
    email,
    phone,
    service_id,
    service_name,
    project_details,
    source
  )
  values (
    nullif(trim(p_client_name), ''),
    nullif(trim(p_email), ''),
    nullif(trim(p_phone), ''),
    p_service_id,
    v_service_name,
    nullif(trim(p_project_details), ''),
    'website'
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_enquiry(text,text,text,uuid,text,text)
to anon, authenticated;

-- -----------------------------
-- Google Reviews mirror
-- -----------------------------
-- This table is the website-facing copy of reviews fetched by the backend.
-- Google API credentials will NOT be stored in browser code.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'google',
  external_review_id text,
  reviewer_name text not null,
  reviewer_photo_url text,
  rating numeric(2,1) not null
    check (rating >= 1 and rating <= 5),
  comment text,
  review_time timestamptz,
  review_url text,
  active boolean not null default true,
  pinned boolean not null default false,
  sort_order integer not null default 0,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, external_review_id)
);

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

create policy "Public can read active reviews"
on public.reviews
for select
to anon, authenticated
using (active = true or public.is_admin());

create policy "Admins can insert reviews"
on public.reviews
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update reviews"
on public.reviews
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete reviews"
on public.reviews
for delete
to authenticated
using (public.is_admin());

-- -----------------------------
-- Site Settings
-- -----------------------------
create table if not exists public.site_settings (
  setting_key text primary key,
  setting_value text not null default '',
  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "Public can read site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

create policy "Admins can insert site settings"
on public.site_settings
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update site settings"
on public.site_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete site settings"
on public.site_settings
for delete
to authenticated
using (public.is_admin());

-- -----------------------------
-- Seed FactorX settings
-- -----------------------------
insert into public.site_settings (setting_key, setting_value) values
  ('business_name', 'FactorX Studios'),
  ('whatsapp', '+27 76 426 7368'),
  ('phone', '+27 76 426 7368'),
  ('email', ''),
  ('country', 'South Africa'),
  ('homepage_eyebrow', 'WEB DESIGN & DEVELOPMENT, SOLVED.'),
  ('homepage_heading', 'Your business. Your next digital step.'),
  ('homepage_intro', 'Websites that bring your brand to life, with support to keep it moving.'),
  ('google_review_url', ''),
  ('google_place_id', ''),
  ('review_popup_enabled', 'true'),
  ('review_popup_interval_seconds', '14'),
  ('review_popup_duration_seconds', '7'),
  ('review_popup_min_rating', '4'),
  ('review_popup_position', 'bottom-right')
on conflict (setting_key) do nothing;

-- -----------------------------
-- Seed current FactorX services
-- -----------------------------
insert into public.services (
  badge, title, short_description, price, price_label, billing_label,
  features, button_label, enquiry_label, colour_preset, sort_order, active, featured
)
select
  'Starter',
  'One-page website',
  'A focused home for your business online.',
  2500,
  'R2,500',
  'Once-off',
  '["Custom one-page design","Mobile-friendly layout","Your services in one place","Social and contact links"]'::jsonb,
  'Request a quote',
  'One-page website',
  'orange',
  10,
  true,
  true
where not exists (
  select 1 from public.services where lower(title) = lower('One-page website')
);

insert into public.services (
  badge, title, short_description, price, price_label, billing_label,
  features, button_label, enquiry_label, colour_preset, sort_order, active, featured
)
select
  'Care',
  'Website maintenance',
  'Keep your website fresh after launch.',
  500,
  'R500',
  'Monthly',
  '["Ongoing website support","Content and image updates","Routine maintenance","A plan shaped to your needs"]'::jsonb,
  'Enquire about care',
  'Monthly website care',
  'blue',
  20,
  true,
  true
where not exists (
  select 1 from public.services where lower(title) = lower('Website maintenance')
);

insert into public.services (
  badge, title, price_label, billing_label, features,
  button_label, enquiry_label, colour_preset, sort_order, active
)
select
  'Business',
  'Business website',
  'Custom',
  'Quote',
  '["Multiple pages for your business","Custom responsive design","Services and portfolio sections","Contact and social integrations"]'::jsonb,
  'Request a quote',
  'Business website',
  'blue',
  30,
  true
where not exists (
  select 1 from public.services where lower(title) = lower('Business website')
);

insert into public.services (
  badge, title, price_label, billing_label, features,
  button_label, enquiry_label, colour_preset, sort_order, active
)
select
  'Commerce',
  'E-commerce website',
  'Custom',
  'Quote',
  '["A storefront for your products","Product catalogue and categories","Payment integration planning","Order management requirements"]'::jsonb,
  'Discuss your store',
  'E-commerce website',
  'blue',
  40,
  true
where not exists (
  select 1 from public.services where lower(title) = lower('E-commerce website')
);

insert into public.services (
  badge, title, price_label, billing_label, features,
  button_label, enquiry_label, colour_preset, sort_order, active
)
select
  'Systems',
  'Web applications',
  'Custom',
  'Quote',
  '["Dashboards and business tools","Database-driven applications","Workflows around your team","Features scoped to your project"]'::jsonb,
  'Discuss your idea',
  'Web application',
  'orange',
  50,
  true
where not exists (
  select 1 from public.services where lower(title) = lower('Web applications')
);

insert into public.services (
  badge, title, price_label, billing_label, features,
  button_label, enquiry_label, colour_preset, sort_order, active
)
select
  'Refresh',
  'Website redesign',
  'Custom',
  'Quote',
  '["A fresh look for your brand","Improved page structure","Better mobile layouts","Updated content and visuals"]'::jsonb,
  'Plan your refresh',
  'Website redesign',
  'orange',
  60,
  true
where not exists (
  select 1 from public.services where lower(title) = lower('Website redesign')
);

-- -----------------------------
-- Storage bucket for CMS media
-- -----------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'factorx-media',
  'factorx-media',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

create policy "Public can view FactorX media"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'factorx-media');

create policy "Admins can upload FactorX media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'factorx-media'
  and public.is_admin()
);

create policy "Admins can update FactorX media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'factorx-media'
  and public.is_admin()
)
with check (
  bucket_id = 'factorx-media'
  and public.is_admin()
);

create policy "Admins can delete FactorX media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'factorx-media'
  and public.is_admin()
);

-- -----------------------------
-- Grants
-- -----------------------------
grant select on public.services to anon, authenticated;
grant select on public.portfolio_projects to anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant select on public.site_settings to anon, authenticated;

grant all on public.services to authenticated;
grant all on public.portfolio_projects to authenticated;
grant all on public.enquiries to authenticated;
grant all on public.reviews to authenticated;
grant all on public.site_settings to authenticated;

-- Done.
