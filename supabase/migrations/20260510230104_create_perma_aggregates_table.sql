-- Create perma_aggregates table for pre-computed rolling window averages
create table if not exists public.perma_aggregates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  window_type text not null check (window_type in ('7d', '30d', '90d', '365d')),
  
  -- Rolling average values for each PERMA+4 dimension
  positive_emotion_avg numeric(3, 2),
  engagement_avg numeric(3, 2),
  relationships_avg numeric(3, 2),
  meaning_avg numeric(3, 2),
  achievement_avg numeric(3, 2),
  physical_health_avg numeric(3, 2),
  positive_mindset_avg numeric(3, 2),
  environment_avg numeric(3, 2),
  economic_security_avg numeric(3, 2),
  
  -- Trend metrics
  positive_emotion_trend numeric(3, 2),
  engagement_trend numeric(3, 2),
  relationships_trend numeric(3, 2),
  meaning_trend numeric(3, 2),
  achievement_trend numeric(3, 2),
  physical_health_trend numeric(3, 2),
  positive_mindset_trend numeric(3, 2),
  environment_trend numeric(3, 2),
  economic_security_trend numeric(3, 2),
  
  -- Volatility (standard deviation) for each dimension
  positive_emotion_volatility numeric(3, 2),
  engagement_volatility numeric(3, 2),
  relationships_volatility numeric(3, 2),
  meaning_volatility numeric(3, 2),
  achievement_volatility numeric(3, 2),
  physical_health_volatility numeric(3, 2),
  positive_mindset_volatility numeric(3, 2),
  environment_volatility numeric(3, 2),
  economic_security_volatility numeric(3, 2),
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- One aggregate per user per date per window type
  constraint unique_perma_aggregate unique(user_id, date, window_type)
);

-- Create indexes for efficient querying
create index if not exists perma_aggregates_user_id_idx on public.perma_aggregates(user_id);
create index if not exists perma_aggregates_date_idx on public.perma_aggregates(date);
create index if not exists perma_aggregates_user_date_idx on public.perma_aggregates(user_id, date);
create index if not exists perma_aggregates_window_type_idx on public.perma_aggregates(window_type);

-- Enable RLS
alter table public.perma_aggregates enable row level security;

-- RLS Policy: Users can only see their own aggregates
drop policy if exists "Users can view their own perma aggregates" on public.perma_aggregates;
create policy "Users can view their own perma aggregates"
  on public.perma_aggregates for select
  using (auth.uid() = user_id);

-- Note: Direct insert/update/delete on aggregates should be restricted.
-- These are computed server-side via functions/triggers, not user-editable.
drop policy if exists "Users cannot insert perma aggregates" on public.perma_aggregates;
create policy "Users cannot insert perma aggregates"
  on public.perma_aggregates for insert
  with check (false);

drop policy if exists "Users cannot update perma aggregates" on public.perma_aggregates;
create policy "Users cannot update perma aggregates"
  on public.perma_aggregates for update
  using (false)
  with check (false);

drop policy if exists "Users cannot delete perma aggregates" on public.perma_aggregates;
create policy "Users cannot delete perma aggregates"
  on public.perma_aggregates for delete
  using (false);

-- Create function to update updated_at timestamp
create or replace function update_perma_aggregates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
drop trigger if exists perma_aggregates_updated_at_trigger on public.perma_aggregates;
create trigger perma_aggregates_updated_at_trigger
  before update on public.perma_aggregates
  for each row
  execute function update_perma_aggregates_updated_at();
