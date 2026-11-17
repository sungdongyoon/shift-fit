-- 선택 입력인 직원 직급을 추가합니다. 기존 직원은 직급 없이 유지합니다.
alter table public.employees add column position text
  check (position is null or char_length(btrim(position)) between 1 and 30);

create or replace function public.save_planner_changes(p_revision bigint, p_data jsonb) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
  current_store public.stores;
  employee_changes jsonb;
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

  -- 새 필드를 전송하지 않는 구버전 화면에서도 기존 퇴사일과 직급은 유지합니다.
  -- 새 화면이 명시적으로 null을 보내면 퇴사 처리를 취소합니다.
  select coalesce(jsonb_agg(jsonb_build_object('end_date', e.end_date, 'position', e.position) || item.value), '[]'::jsonb)
  into employee_changes
  from jsonb_array_elements(p_data->'employees') item
  left join public.employees e on e.id = (item.value->>'id')::uuid and e.store_id = current_store.id;

  insert into public.employees as e(id, store_id, name, color, registered_month, start_date, end_date, position, sort_order)
  select x.id, current_store.id, x.name, x.color, x.registered_month, x.start_date, x.end_date, nullif(btrim(x.position), ''), x.sort_order
  from jsonb_to_recordset(employee_changes) as x(id uuid, name text, color text, registered_month date, start_date date, end_date date, position text, sort_order integer)
  on conflict (id) do update set name = excluded.name, color = excluded.color,
    registered_month = excluded.registered_month, start_date = excluded.start_date, end_date = excluded.end_date, position = excluded.position, sort_order = excluded.sort_order, updated_at = now()
  where e.store_id = excluded.store_id and (e.name, e.color, e.registered_month, e.start_date, e.end_date, e.position, e.sort_order) is distinct from (excluded.name, excluded.color, excluded.registered_month, excluded.start_date, excluded.end_date, excluded.position, excluded.sort_order);

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
