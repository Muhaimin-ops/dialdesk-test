-- DialDesk schema. Run once in Supabase → SQL Editor (safe to re-run).
-- Tenancy model: one row in `businesses` per tenant, users join via `members`.
-- Browser/dashboard access goes through RLS; the public widget path uses the service role
-- on the server and always scopes queries by business_id.

create extension if not exists "pgcrypto";

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  industry text not null default 'general',
  timezone text not null default 'UTC',
  agent_name text not null default 'Aria',
  greeting text not null default 'Thanks for calling. How can I help you today?',
  instructions text not null default '',
  knowledge text not null default '',
  voice text not null default 'af_heart',
  hours jsonb not null default '{"mon":{"open":"09:00","close":"17:00"},"tue":{"open":"09:00","close":"17:00"},"wed":{"open":"09:00","close":"17:00"},"thu":{"open":"09:00","close":"17:00"},"fri":{"open":"09:00","close":"17:00"},"sat":null,"sun":null}',
  slot_minutes int not null default 30 check (slot_minutes between 10 and 240),
  allowed_origins text[] not null default '{}',
  plan text not null default 'free' check (plan in ('free','pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  created_at timestamptz not null default now()
);
update public.businesses
set voice = case voice
  when 'marin' then 'af_heart'
  when 'cedar' then 'am_michael'
  when 'alloy' then 'af_bella'
  when 'ash' then 'am_adam'
  when 'ballad' then 'af_nicole'
  when 'coral' then 'af_sarah'
  when 'echo' then 'am_michael'
  when 'sage' then 'af_nova'
  when 'shimmer' then 'af_sarah'
  when 'verse' then 'af_nicole'
  else voice
end
where voice in ('marin', 'cedar', 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse');

create table if not exists public.members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index if not exists members_user_idx on public.members(user_id);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  transcript jsonb not null default '[]'
);
create index if not exists calls_business_started_idx on public.calls(business_id, started_at desc);

-- Serialize monthly usage checks so concurrent sessions cannot exceed a business's cap.
create or replace function public.start_call_if_under_limit(p_business_id uuid, p_call_limit integer)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_call_id uuid;
  month_start timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
begin
  if p_business_id is null or p_call_limit is null or p_call_limit < 1 then
    raise exception 'business id and a positive call limit are required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  if not exists (
    select 1 from public.businesses where id = p_business_id
  ) then
    return null;
  end if;

  if (
    select count(*)
    from public.calls
    where business_id = p_business_id and started_at >= month_start
  ) >= p_call_limit then
    return null;
  end if;

  insert into public.calls (business_id)
  values (p_business_id)
  returning id into new_call_id;

  return new_call_id;
end;
$$;
revoke all on function public.start_call_if_under_limit(uuid, integer) from public, anon, authenticated;
grant execute on function public.start_call_if_under_limit(uuid, integer) to service_role;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at timestamptz not null default now()
);
-- Hard guarantee against double booking, even under concurrent calls.
create unique index if not exists appointments_slot_uniq
  on public.appointments(business_id, starts_at) where status = 'confirmed';
create index if not exists appointments_business_start_idx on public.appointments(business_id, starts_at);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists leads_business_idx on public.leads(business_id, created_at desc);

-- ───────── Row level security ─────────
create or replace function public.is_member(bid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.members where business_id = bid and user_id = auth.uid())
$$;

alter table public.businesses enable row level security;
alter table public.members enable row level security;
alter table public.calls enable row level security;
alter table public.appointments enable row level security;
alter table public.leads enable row level security;

drop policy if exists members_select on public.members;
create policy members_select on public.members for select to authenticated using (user_id = auth.uid());

drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses for select to authenticated using (public.is_member(id));
drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists calls_select on public.calls;
create policy calls_select on public.calls for select to authenticated using (public.is_member(business_id));

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments for select to authenticated using (public.is_member(business_id));
drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments for update to authenticated
  using (public.is_member(business_id)) with check (public.is_member(business_id));

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select to authenticated using (public.is_member(business_id));

-- Column-level privileges: owners can edit agent settings but never billing/plan columns.
revoke insert, update, delete on public.businesses from authenticated, anon;
grant update (name, industry, timezone, agent_name, greeting, instructions, knowledge, voice, hours, slot_minutes, allowed_origins)
  on public.businesses to authenticated;
revoke insert, update, delete on public.members, public.calls, public.leads from authenticated, anon;
revoke insert, update, delete on public.appointments from authenticated, anon;
grant update (status, notes) on public.appointments to authenticated;
revoke all on public.businesses, public.members, public.calls, public.appointments, public.leads from anon;
