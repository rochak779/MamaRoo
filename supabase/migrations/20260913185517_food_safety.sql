create table public.food_safety_items (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('en', 'hi')),
  name text not null,
  status text not null check (status in ('safe', 'moderation', 'avoid')),
  short_text text not null,
  long_text text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index food_safety_items_locale_idx on public.food_safety_items (locale, sort_order);

alter table public.food_safety_items enable row level security;
create policy "active food safety items are readable" on public.food_safety_items
  for select to authenticated using (is_active = true);
