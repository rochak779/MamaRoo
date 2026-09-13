create table public.guide_faqs (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('en', 'hi')),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index guide_faqs_locale_idx on public.guide_faqs (locale, sort_order);

alter table public.guide_faqs enable row level security;
create policy "active faqs are readable" on public.guide_faqs
  for select to authenticated using (is_active = true);

create table public.guide_schemes (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('en', 'hi')),
  name text not null,
  short_text text not null,
  long_text text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index guide_schemes_locale_idx on public.guide_schemes (locale, sort_order);

alter table public.guide_schemes enable row level security;
create policy "active schemes are readable" on public.guide_schemes
  for select to authenticated using (is_active = true);
