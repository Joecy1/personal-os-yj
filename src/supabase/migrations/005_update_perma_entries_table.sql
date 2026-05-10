-- Update perma_entries table to support future Reflection Layer integration
alter table public.perma_entries
add column reflection_id uuid,
add column updated_at timestamp with time zone default now();

-- Create function to update updated_at timestamp for perma_entries
create or replace function update_perma_entries_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at (if not already present)
drop trigger if exists perma_entries_updated_at_trigger on public.perma_entries;
create trigger perma_entries_updated_at_trigger
  before update on public.perma_entries
  for each row
  execute function update_perma_entries_updated_at();
