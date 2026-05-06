create table public.prd_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scope text not null default 'module', -- 'global' | 'module'
  module_key text not null default '', -- '' for global, otherwise route key like 'pomodoro'
  title text not null default '',
  problem text not null default '',
  users text not null default '',
  principles text not null default '',
  features jsonb not null default '[]'::jsonb,
  success_metrics text not null default '',
  non_goals text not null default '',
  status text not null default 'draft', -- draft | active | stable | archived
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prd_documents enable row level security;
create policy prd_own_all on public.prd_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger prd_set_updated before update on public.prd_documents for each row execute function public.set_updated_at();

create table public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  route text not null default '',
  module_key text not null default '',
  kind text not null default 'broken', -- works | broken | idea | question
  severity text not null default 'normal', -- low | normal | high
  title text not null default '',
  body text not null default '',
  status text not null default 'open', -- open | triaged | resolved | wont_fix
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feedback_items enable row level security;
create policy fb_own_all on public.feedback_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger fb_set_updated before update on public.feedback_items for each row execute function public.set_updated_at();