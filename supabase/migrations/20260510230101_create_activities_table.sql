-- Create activities table for tracking user interventions/behaviors
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  time time,
  activity_type text not null,
  duration_minutes integer,
  intensity integer check (intensity >= 1 and intensity <= 5),
  tags text[] default array[]::text[],
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for efficient querying
create index activities_user_id_idx on public.activities(user_id);
create index activities_date_idx on public.activities(date);
create index activities_user_date_idx on public.activities(user_id, date);
create index activities_activity_type_idx on public.activities(activity_type);
create unique index unique_activity_per_datetime
  on public.activities(user_id, date, activity_type, coalesce(time, '00:00'::time));

-- Enable RLS
alter table public.activities enable row level security;

-- RLS Policy: Users can only see their own activities
create policy "Users can view their own activities"
  on public.activities for select
  using (auth.uid() = user_id);

-- RLS Policy: Users can insert their own activities
create policy "Users can create their own activities"
  on public.activities for insert
  with check (auth.uid() = user_id);

-- RLS Policy: Users can update their own activities
create policy "Users can update their own activities"
  on public.activities for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policy: Users can delete their own activities
create policy "Users can delete their own activities"
  on public.activities for delete
  using (auth.uid() = user_id);

-- Create function to update updated_at timestamp
create or replace function update_activities_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger activities_updated_at_trigger
  before update on public.activities
  for each row
  execute function update_activities_updated_at();
