create table public.user_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null,
  data jsonb not null, -- WorkspaceData blob
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
