-- Create daily_context table for tracking daily contextual metadata
create table public.daily_context (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sleep_hours numeric(3, 1),
  sleep_quality integer check (sleep_quality >= 1 and sleep_quality <= 10),
  stress_level integer check (stress_level >= 1 and stress_level <= 10),
  energy_level integer check (energy_level >= 1 and energy_level <= 10),
  location text,
  weather text,
  finances_sentiment text, -- 'positive', 'neutral', 'negative', or free text
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- One entry per user per day
  constraint unique_daily_context unique(user_id, date)
);

-- Create indexes for efficient querying
create index daily_context_user_id_idx on public.daily_context(user_id);
create index daily_context_date_idx on public.daily_context(date);
create index daily_context_user_date_idx on public.daily_context(user_id, date);

-- Enable RLS
alter table public.daily_context enable row level security;

-- RLS Policy: Users can only see their own context
create policy "Users can view their own daily context"
  on public.daily_context for select
  using (auth.uid() = user_id);

-- RLS Policy: Users can insert their own context
create policy "Users can create their own daily context"
  on public.daily_context for insert
  with check (auth.uid() = user_id);

-- RLS Policy: Users can update their own context
create policy "Users can update their own daily context"
  on public.daily_context for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policy: Users can delete their own context
create policy "Users can delete their own daily context"
  on public.daily_context for delete
  using (auth.uid() = user_id);

-- Create function to update updated_at timestamp
create or replace function update_daily_context_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger daily_context_updated_at_trigger
  before update on public.daily_context
  for each row
  execute function update_daily_context_updated_at();
