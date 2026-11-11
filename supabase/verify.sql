-- Synthetic users and rows exist only inside this rolled-back transaction.
begin;
do $test$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  employee_a uuid := gen_random_uuid();
  type_a uuid := gen_random_uuid();
  store_a uuid;
  payload jsonb;
  result jsonb;
  rejected boolean;
begin
  insert into auth.users(id) values (user_a), (user_b);
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  execute 'set local role authenticated';
  payload := jsonb_build_object(
    'employees', jsonb_build_array(jsonb_build_object('id', employee_a, 'name', 'RLS 검증 직원', 'color', '#5686D6', 'registered_month', '2026-11-01', 'start_date', '2026-11-02', 'sort_order', 0)),
    'months', jsonb_build_array(jsonb_build_object('month', '2026-11-01', 'off_target', 8)),
    'types', jsonb_build_array(jsonb_build_object('id', type_a, 'month', '2026-11-01', 'name', '검증 오픈', 'start_time', '08:00', 'end_time', '17:00', 'color', '#5686D6', 'archived', false, 'sort_order', 0)),
    'assignments', jsonb_build_array(jsonb_build_object('employee_id', employee_a, 'work_date', '2026-11-04', 'category', 'work', 'shift_type_id', type_a))
  );
  if public.save_planner_changes(0, payload) <> 1 then raise exception 'initial save failed'; end if;
  result := public.read_planner();
  if jsonb_array_length(result->'employees') <> 1 or jsonb_array_length(result->'assignments') <> 1 then raise exception 'roundtrip failed'; end if;
  select id into store_a from public.stores where owner_id = user_a;

  if public.save_planner_changes(1, jsonb_build_object(
    'employees', jsonb_set(payload->'employees', '{0,name}', to_jsonb('행만 수정'::text)),
    'months', '[]'::jsonb, 'types', '[]'::jsonb, 'assignments', '[]'::jsonb
  )) <> 2 then raise exception 'patch save failed'; end if;
  result := public.read_planner();
  if jsonb_array_length(result->'assignments') <> 1 or jsonb_array_length(result->'types') <> 1 then raise exception 'patch removed unchanged rows'; end if;

  rejected := false;
  begin
    insert into public.assignments(store_id, employee_id, work_date, category)
      values (store_a, employee_a, '2026-11-01', 'off');
    set constraints all immediate;
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'assignment before start accepted'; end if;

  rejected := false;
  begin
    update public.employees set start_date = '2026-11-05' where id = employee_a;
    set constraints all immediate;
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception 'start date hid existing assignment'; end if;

  rejected := false;
  begin
    update public.employees set start_date = null where id = employee_a;
  exception when not_null_violation then rejected := true; end;
  if not rejected then raise exception 'missing start date accepted'; end if;

  rejected := false;
  begin perform public.save_planner_changes(0, payload);
  exception when serialization_failure then rejected := true; end;
  if not rejected then raise exception 'stale save was accepted'; end if;

  rejected := false;
  begin
    perform public.save_planner_changes(2, jsonb_set(payload, '{assignments,0,shift_type_id}', to_jsonb(gen_random_uuid())));
  exception when foreign_key_violation then rejected := true; end;
  if not rejected or (public.read_planner()->>'revision')::int <> 2 or public.read_planner()->'employees'->0->>'name' <> '행만 수정' then raise exception 'rollback failed'; end if;

  rejected := false;
  begin insert into public.stores(owner_id) values (user_a);
  exception when unique_violation then rejected := true; end;
  if not rejected then raise exception 'multiple stores accepted'; end if;

  perform set_config('request.jwt.claim.sub', user_b::text, true);
  if exists(select 1 from public.stores where id = store_a) or exists(select 1 from public.employees where id = employee_a) or
    exists(select 1 from public.schedule_months where store_id = store_a) or exists(select 1 from public.shift_types where id = type_a) or exists(select 1 from public.assignments where employee_id = employee_a)
  then raise exception 'cross-account read allowed'; end if;
  update public.employees set name = '침범' where id = employee_a;
  if found then raise exception 'cross-account update allowed'; end if;
  rejected := false;
  begin
    insert into public.employees(id,store_id,name,color,registered_month,start_date) values (gen_random_uuid(),store_a,'침범','#5686D6','2026-11-01','2026-11-01');
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'cross-account insert allowed'; end if;
  if jsonb_array_length(public.read_planner()->'employees') <> 0 then raise exception 'RPC leaked rows'; end if;

  execute 'set local role anon';
  rejected := false;
  begin perform public.read_planner();
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'anonymous RPC allowed'; end if;
  rejected := false;
  begin perform 1 from public.employees;
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'anonymous table read allowed'; end if;
  execute 'reset role';
end;
$test$;
rollback;
select 'PASS: RLS isolation, anonymous denial, atomic save, stale revision, one store; all synthetic rows rolled back' as verification;
