-- 매장 이름과 직원별 월 휴무 기준을 기존 수동 저장 트랜잭션에 연결합니다.
-- 근무자별 월 휴무 기준입니다. NULL은 정해진 휴무가 없음을 뜻합니다.
create table public.employee_month_settings (
  store_id uuid not null,
  employee_id uuid not null,
  month date not null check (extract(day from month) = 1),
  off_target integer check (off_target >= 0 and off_target <= extract(day from (month + interval '1 month - 1 day'))),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, month, employee_id),
  foreign key (store_id, employee_id) references public.employees(store_id, id) on delete cascade,
  foreign key (store_id, month) references public.schedule_months(store_id, month) on delete cascade
);
create index employee_month_settings_employee on public.employee_month_settings(store_id, employee_id);
alter table public.employee_month_settings enable row level security;
create policy employee_month_settings_owner on public.employee_month_settings
  for all to authenticated
  using (store_id in (select id from public.stores where owner_id = (select auth.uid())))
  with check (store_id in (select id from public.stores where owner_id = (select auth.uid())));
revoke all on public.employee_month_settings from public, anon;
grant select, insert, update, delete on public.employee_month_settings to authenticated;

-- 기존에 작성된 월은 기존 공통 휴무 기준을 직원별로 보존합니다. 이름과 배정은 변경하지 않습니다.
insert into public.employee_month_settings(store_id, employee_id, month, off_target)
select e.store_id, e.id, m.month, m.off_target
from public.employees e
join public.schedule_months m on m.store_id = e.store_id
where e.start_date <= (m.month + interval '1 month - 1 day')::date;

create or replace function public.read_planner() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  current_store public.stores;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into current_store from public.stores where owner_id = auth.uid();
  if not found then
    return jsonb_build_object('revision', 0, 'store_name', '나의 매장', 'employee_targets', '[]'::jsonb, 'employees', '[]'::jsonb, 'months', '[]'::jsonb, 'types', '[]'::jsonb, 'assignments', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'revision', current_store.revision,
    'store_name', current_store.name,
    'employee_targets', coalesce((select jsonb_agg(to_jsonb(t) order by month, employee_id) from public.employee_month_settings t where store_id = current_store.id), '[]'::jsonb),
    'employees', coalesce((select jsonb_agg(to_jsonb(e) order by sort_order, id) from public.employees e where store_id = current_store.id), '[]'::jsonb),
    'months', coalesce((select jsonb_agg(to_jsonb(m) order by month) from public.schedule_months m where store_id = current_store.id), '[]'::jsonb),
    'types', coalesce((select jsonb_agg(to_jsonb(t) order by sort_order, id) from public.shift_types t where store_id = current_store.id), '[]'::jsonb),
    'assignments', coalesce((select jsonb_agg(to_jsonb(a) order by work_date, employee_id) from public.assignments a where store_id = current_store.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.save_planner_changes(p_revision bigint, p_data jsonb) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
  current_store public.stores;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_revision is null or p_revision < 0 or p_data is null or
    (p_data ? 'store_name' and jsonb_typeof(p_data->'store_name') is distinct from 'string') or
    jsonb_typeof(coalesce(p_data->'employee_targets', '[]'::jsonb)) is distinct from 'array' or
    jsonb_typeof(coalesce(p_data->'deleted_employee_targets', '[]'::jsonb)) is distinct from 'array' or
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

  if p_data ? 'store_name' then
    update public.stores set name = btrim(p_data->>'store_name') where id = current_store.id;
  end if;

  delete from public.employee_month_settings t
  where t.store_id = current_store.id and exists (
    select 1 from jsonb_to_recordset(coalesce(p_data->'deleted_employee_targets', '[]'::jsonb)) as x(employee_id uuid, month date)
    where x.employee_id = t.employee_id and x.month = t.month
  );

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

  -- 구버전 화면의 공통 휴무 변경은 기존 공통 기준을 쓰던 직원에게만 반영합니다.
  if not (p_data ? 'employee_targets') then
    update public.employee_month_settings t
    set off_target = x.off_target, updated_at = now()
    from public.schedule_months m,
      jsonb_to_recordset(p_data->'months') as x(month date, off_target integer)
    where t.store_id = current_store.id and m.store_id = current_store.id
      and t.month = x.month and m.month = x.month
      and t.off_target is not distinct from m.off_target;
  end if;

  insert into public.schedule_months as m(store_id, month, off_target)
  select current_store.id, x.month, x.off_target from jsonb_to_recordset(p_data->'months') as x(month date, off_target integer)
  on conflict (store_id, month) do update set off_target = excluded.off_target, updated_at = now()
  where m.off_target is distinct from excluded.off_target;

  if not (p_data ? 'employee_targets') then
    insert into public.employee_month_settings(store_id, employee_id, month, off_target)
    select current_store.id, e.id, x.month, x.off_target
    from public.employees e
    cross join jsonb_to_recordset(p_data->'months') as x(month date, off_target integer)
    where e.store_id = current_store.id and e.start_date <= (x.month + interval '1 month - 1 day')::date
    on conflict (store_id, month, employee_id) do nothing;
  end if;

  insert into public.employee_month_settings as t(store_id, employee_id, month, off_target)
  select current_store.id, x.employee_id, x.month, x.off_target
  from jsonb_to_recordset(coalesce(p_data->'employee_targets', '[]'::jsonb)) as x(employee_id uuid, month date, off_target integer)
  on conflict (store_id, month, employee_id) do update
    set off_target = excluded.off_target, updated_at = now()
    where t.off_target is distinct from excluded.off_target;

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
