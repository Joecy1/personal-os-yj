-- Create activity_context table for activity-scoped contextual metadata
create table public.activity_context (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  context_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for efficient querying
create index activity_context_activity_id_idx on public.activity_context(activity_id);

-- Enable RLS
alter table public.activity_context enable row level security;

-- RLS Policy: Users can view context for their own activities
create policy "Users can view context for their own activities"
  on public.activity_context for select
  using (
    exists (
      select 1 from public.activities
      where activities.id = activity_context.activity_id
      and activities.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert context for their own activities
create policy "Users can create context for their own activities"
  on public.activity_context for insert
  with check (
    exists (
      select 1 from public.activities
      where activities.id = activity_context.activity_id
      and activities.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update context for their own activities
create policy "Users can update context for their own activities"
  on public.activity_context for update
  using (
    exists (
      select 1 from public.activities
      where activities.id = activity_context.activity_id
      and activities.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.activities
      where activities.id = activity_context.activity_id
      and activities.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete context for their own activities
create policy "Users can delete context for their own activities"
  on public.activity_context for delete
  using (
    exists (
      select 1 from public.activities
      where activities.id = activity_context.activity_id
      and activities.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
create or replace function update_activity_context_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger activity_context_updated_at_trigger
  before update on public.activity_context
  for each row
  execute function update_activity_context_updated_at();
