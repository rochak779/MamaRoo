create table public.letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pregnancy_id uuid,
  gestational_week int not null check (gestational_week between 0 and 42),
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Keep a letter if its pregnancy record is removed, while preventing a
  -- leaked pregnancy UUID from ever being attached across user boundaries.
  constraint letters_pregnancy_owned_by_same_user
    foreign key (pregnancy_id, user_id)
    references public.pregnancies (id, user_id) on delete set null (pregnancy_id)
);

create index letters_user_time_idx on public.letters (user_id, created_at desc);

alter table public.letters enable row level security;
create policy "own letters are readable" on public.letters for select using (auth.uid() = user_id);
create policy "own letters are insertable" on public.letters for insert with check (auth.uid() = user_id);
create policy "own letters are updatable" on public.letters for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own letters are deletable" on public.letters for delete using (auth.uid() = user_id);

create trigger letters_touch before update on public.letters
  for each row execute function public.touch_updated_at();
