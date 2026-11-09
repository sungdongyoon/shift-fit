-- ShiftFit: one store per account, monthly shift types, explicit manual saves.
-- Apply once through a Supabase migration. No existing user data is removed.
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default '나의 매장' check (char_length(btrim(name)) between 1 and 80),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  registered_month date not null check (extract(day from registered_month) = 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, id),
  unique (store_id, name) deferrable initially deferred
);

create table public.schedule_months (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  off_target integer not null default 8 check (
    off_target >= 0 and off_target <= extract(day from (month + interval '1 month - 1 day'))
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, month)
);

create table public.shift_types (
  id uuid primary key,
  store_id uuid not null,
  month date not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  start_time time not null,
  end_time time not null check (end_time <> start_time),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  archived boolean not null default false,
  active_name text generated always as (case when archived then null else name end) stored,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (store_id, month) references public.schedule_months(store_id, month) on delete cascade,
  unique (store_id, month, id),
  unique (store_id, month, active_name) deferrable initially deferred
);

create table public.assignments (
  store_id uuid not null,
  employee_id uuid not null,
  work_date date not null,
  month date generated always as (date_trunc('month', work_date::timestamp)::date) stored,
  category text not null check (category in ('work', 'off', 'leave', 'other', 'unassigned')),
  shift_type_id uuid,
  memo text check (memo is null or (category = 'other' and char_length(memo) <= 200)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, employee_id, work_date),
  foreign key (store_id, employee_id) references public.employees(store_id, id) on delete cascade,
  foreign key (store_id, month) references public.schedule_months(store_id, month) on delete cascade,
  foreign key (store_id, month, shift_type_id) references public.shift_types(store_id, month, id),
  check ((category = 'work' and shift_type_id is not null) or (category <> 'work' and shift_type_id is null))
);
create index assignments_month on public.assignments(store_id, month);
create index assignments_shift_type on public.assignments(store_id, month, shift_type_id);

alter table public.stores enable row level security;
alter table public.employees enable row level security;
alter table public.schedule_months enable row level security;
alter table public.shift_types enable row level security;
alter table public.assignments enable row level security;

create policy store_owner on public.stores for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy employee_owner on public.employees for all to authenticated
  using (store_id in (select id from public.stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from public.stores where owner_id = (select auth.uid())));
create policy month_owner on public.schedule_months for all to authenticated
  using (store_id in (select id from public.stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from public.stores where owner_id = (select auth.uid())));
create policy shift_type_owner on public.shift_types for all to authenticated
  using (store_id in (select id from public.stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from public.stores where owner_id = (select auth.uid())));
create policy assignment_owner on public.assignments for all to authenticated
  using (store_id in (select id from public.stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from public.stores where owner_id = (select auth.uid())));

revoke all on public.stores, public.employees, public.schedule_months, public.shift_types, public.assignments from public, anon;
grant select, insert, update, delete on public.stores, public.employees, public.schedule_months, public.shift_types, public.assignments to authenticated;

-- A single statement returns a consistent account-scoped snapshot. Reading never creates a store.
create function public.read_planner() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  current_store public.stores;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into current_store from public.stores where owner_id = auth.uid();
  if not found then
    return jsonb_build_object('revision', 0, 'employees', '[]'::jsonb, 'months', '[]'::jsonb, 'types', '[]'::jsonb, 'assignments', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'revision', current_store.revision,
    'employees', coalesce((select jsonb_agg(to_jsonb(e) order by sort_order, id) from public.employees e where store_id = current_store.id), '[]'::jsonb),
    'months', coalesce((select jsonb_agg(to_jsonb(m) order by month) from public.schedule_months m where store_id = current_store.id), '[]'::jsonb),
    'types', coalesce((select jsonb_agg(to_jsonb(t) order by sort_order, id) from public.shift_types t where store_id = current_store.id), '[]'::jsonb),
    'assignments', coalesce((select jsonb_agg(to_jsonb(a) order by work_date, employee_id) from public.assignments a where store_id = current_store.id), '[]'::jsonb)
  );
end;
$$;

-- The save button calls this once. Any constraint/RLS failure rolls back every change.
-- The store lock and expected revision prevent stale tabs from overwriting newer saves.
create function public.save_planner_changes(p_revision bigint, p_data jsonb) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
  current_store public.stores;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_revision is null or p_revision < 0 or p_data is null or
    jsonb_typeof(p_data->'employees') is distinct from 'array' or
    jsonb_typeof(p_data->'months') is distinct from 'array' or
    jsonb_typeof(p_data->'types') is distinct from 'array' or
    jsonb_typeof(p_data->'assignments') is distinct from 'array' or
    jsonb_typeof(coalesce(p_data->'deleted_employees', '[]'::jsonb)) is distinct from 'array' or
    jsonb_typeof(coalesce(p_data->'deleted_types', '[]'::jsonb)) is distinct from 'array' or
    jsonb_typeof(coalesce(p_data->'deleted_months', '[]'::jsonb)) is distinct from 'array' or
    jsonb_typeof(coalesce(p_data->'deleted_assignments', '[]'::jsonb)) is distinct from 'array'
  then raise exception 'INVALID_SCHEDULE' using errcode = '22023'; end if;

  insert into public.stores(owner_id) values (auth.uid()) on conflict (owner_id) do nothing;
  select * into strict current_store from public.stores where owner_id = auth.uid() for update;
  if current_store.revision <> p_revision then raise exception 'SCHEDULE_CONFLICT' using errcode = '40001'; end if;

  -- Remove dropped assignments before changing referenced employees and types.
  delete from public.assignments a where a.store_id = current_store.id and exists (
    select 1 from jsonb_to_recordset(coalesce(p_data->'deleted_assignments', '[]'::jsonb)) as x(employee_id uuid, work_date date)
    where x.employee_id = a.employee_id and x.work_date = a.work_date
  );
  delete from public.employees e where e.store_id = current_store.id and e.id in (select value::uuid from jsonb_array_elements_text(coalesce(p_data->'deleted_employees', '[]'::jsonb)));

  insert into public.employees as e(id, store_id, name, color, registered_month, sort_order)
  select x.id, current_store.id, x.name, x.color, x.registered_month, x.sort_order
  from jsonb_to_recordset(p_data->'employees') as x(id uuid, name text, color text, registered_month date, sort_order integer)
  on conflict (id) do update set name = excluded.name, color = excluded.color,
    registered_month = excluded.registered_month, sort_order = excluded.sort_order, updated_at = now()
  where e.store_id = excluded.store_id and (e.name, e.color, e.registered_month, e.sort_order) is distinct from (excluded.name, excluded.color, excluded.registered_month, excluded.sort_order);

  insert into public.schedule_months as m(store_id, month, off_target)
  select current_store.id, x.month, x.off_target from jsonb_to_recordset(p_data->'months') as x(month date, off_target integer)
  on conflict (store_id, month) do update set off_target = excluded.off_target, updated_at = now()
  where m.off_target is distinct from excluded.off_target;

  insert into public.shift_types as t(id, store_id, month, name, start_time, end_time, color, archived, sort_order)
  select x.id, current_store.id, x.month, x.name, x.start_time, x.end_time, x.color, x.archived, x.sort_order
  from jsonb_to_recordset(p_data->'types') as x(id uuid, month date, name text, start_time time, end_time time, color text, archived boolean, sort_order integer)
  on conflict (id) do update set name = excluded.name, start_time = excluded.start_time, end_time = excluded.end_time,
    color = excluded.color, archived = excluded.archived, sort_order = excluded.sort_order, updated_at = now()
  where t.store_id = excluded.store_id and t.month = excluded.month and (t.name, t.start_time, t.end_time, t.color, t.archived, t.sort_order) is distinct from (excluded.name, excluded.start_time, excluded.end_time, excluded.color, excluded.archived, excluded.sort_order);

  insert into public.assignments as a(store_id, employee_id, work_date, category, shift_type_id, memo)
  select current_store.id, x.employee_id, x.work_date, x.category, x.shift_type_id, nullif(x.memo, '')
  from jsonb_to_recordset(p_data->'assignments') as x(employee_id uuid, work_date date, category text, shift_type_id uuid, memo text)
  on conflict (store_id, employee_id, work_date) do update set category = excluded.category,
    shift_type_id = excluded.shift_type_id, memo = excluded.memo, updated_at = now()
  where (a.category, a.shift_type_id, a.memo) is distinct from (excluded.category, excluded.shift_type_id, excluded.memo);

  delete from public.shift_types t where t.store_id = current_store.id and t.id in (select value::uuid from jsonb_array_elements_text(coalesce(p_data->'deleted_types', '[]'::jsonb)));
  delete from public.schedule_months m where m.store_id = current_store.id and m.month in (select value::date from jsonb_array_elements_text(coalesce(p_data->'deleted_months', '[]'::jsonb)));
  update public.stores set revision = revision + 1, updated_at = now() where id = current_store.id
    returning revision into current_store.revision;
  return current_store.revision;
end;
$$;

revoke all on function public.read_planner(), public.save_planner_changes(bigint, jsonb) from public, anon;
grant execute on function public.read_planner(), public.save_planner_changes(bigint, jsonb) to authenticated;
