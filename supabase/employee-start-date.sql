-- Upgrade the existing schema. Apply once via Supabase migration.
alter table public.employees add column start_date date;
update public.employees e set start_date = least(e.registered_month, coalesce(
  (select min(a.work_date) from public.assignments a where a.store_id = e.store_id and a.employee_id = e.id),
  e.registered_month
));
alter table public.employees alter column start_date set not null;

-- Validate the final transaction state so moving a start date and removing earlier
-- assignments in the same save remains possible. Invoker privileges preserve RLS.
create function public.check_employee_start_date() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  employee_key uuid;
begin
  if tg_table_name = 'employees' then employee_key := new.id;
  else employee_key := new.employee_id; end if;
  if exists (
    select 1 from public.assignments a
    join public.employees e on e.store_id = a.store_id and e.id = a.employee_id
    where a.store_id = new.store_id and a.employee_id = employee_key and a.work_date < e.start_date
  ) then raise exception 'ASSIGNMENT_BEFORE_START_DATE' using errcode = '23514'; end if;
  return null;
end;
$$;
revoke all on function public.check_employee_start_date() from public, anon, authenticated;
create constraint trigger employee_start_date_check
  after insert or update on public.employees deferrable initially deferred
  for each row execute function public.check_employee_start_date();
create constraint trigger assignment_start_date_check
  after insert or update on public.assignments deferrable initially deferred
  for each row execute function public.check_employee_start_date();

create or replace function public.save_planner_changes(p_revision bigint, p_data jsonb) returns bigint
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

  insert into public.employees as e(id, store_id, name, color, registered_month, start_date, sort_order)
  select x.id, current_store.id, x.name, x.color, x.registered_month, x.start_date, x.sort_order
  from jsonb_to_recordset(p_data->'employees') as x(id uuid, name text, color text, registered_month date, start_date date, sort_order integer)
  on conflict (id) do update set name = excluded.name, color = excluded.color,
    registered_month = excluded.registered_month, start_date = excluded.start_date, sort_order = excluded.sort_order, updated_at = now()
  where e.store_id = excluded.store_id and (e.name, e.color, e.registered_month, e.start_date, e.sort_order) is distinct from (excluded.name, excluded.color, excluded.registered_month, excluded.start_date, excluded.sort_order);

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

-- Invalidate already-open drafts after the employee data shape changes.
update public.stores set revision = revision + 1, updated_at = now();
