-- 실제 계정과 기록을 변경하지 않고 합성 데이터로 검증한 뒤 모두 롤백합니다.
begin;
do $test$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  employee_a uuid := gen_random_uuid();
  store_a uuid;
  empty_changes jsonb := '{"employees":[],"months":[],"types":[],"assignments":[]}'::jsonb;
  employee_row jsonb;
  rejected boolean;
begin
  insert into auth.users(id) values (owner_a), (owner_b);
  perform set_config('request.jwt.claim.sub', owner_a::text, true);
  execute 'set local role authenticated';
  employee_row := jsonb_build_object('id', employee_a, 'name', '검증 직원', 'color', '#5686D6',
    'registered_month', '2026-11-01', 'start_date', '2026-11-01', 'sort_order', 0);
  perform public.save_planner_changes(0, empty_changes || jsonb_build_object(
    'employees', jsonb_build_array(employee_row),
    'months', '[{"month":"2026-11-01","off_target":8},{"month":"2026-12-01","off_target":8}]'::jsonb,
    'assignments', jsonb_build_array(
      jsonb_build_object('employee_id', employee_a, 'work_date', '2026-11-15', 'category', 'off'),
      jsonb_build_object('employee_id', employee_a, 'work_date', '2026-12-01', 'category', 'off')
    )
  ));
  select id into store_a from public.stores where owner_id = owner_a;
  execute 'set constraints all immediate';
  execute 'set constraints all deferred';

  -- 퇴사일 이후 기록을 남긴 저장은 전체 취소되어야 합니다.
  rejected := false;
  begin
    perform public.save_planner_changes(1, empty_changes || jsonb_build_object(
      'employees', jsonb_build_array(employee_row || '{"end_date":"2026-11-15"}'::jsonb)
    ));
    execute 'set constraints all immediate';
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception '퇴사일 이후 배정 허용'; end if;
  if (public.read_planner()->>'revision')::int <> 1 then raise exception '실패한 저장 버전 변경'; end if;
  if exists(select 1 from public.employees where id = employee_a and end_date is not null) then
    raise exception '실패한 퇴사일 반영';
  end if;

  -- 이후 배정 삭제와 퇴사일 변경은 한 번의 저장으로 적용합니다.
  perform public.save_planner_changes(1, empty_changes || jsonb_build_object(
    'employees', jsonb_build_array(employee_row || '{"end_date":"2026-11-15"}'::jsonb),
    'deleted_assignments', jsonb_build_array(jsonb_build_object('employee_id', employee_a, 'work_date', '2026-12-01'))
  ));
  execute 'set constraints all immediate';
  if jsonb_array_length(public.read_planner()->'assignments') <> 1 then raise exception '퇴사일 당일 기록 유실'; end if;
  if public.read_planner()->'employees'->0->>'end_date' <> '2026-11-15' then raise exception '퇴사일 조회 실패'; end if;

  -- 퇴사일을 모르는 구버전 화면이 직원 정보를 수정해도 퇴사는 유지합니다.
  perform public.save_planner_changes(2, empty_changes || jsonb_build_object('employees', jsonb_build_array(employee_row)));
  if not exists(select 1 from public.employees where id = employee_a and end_date = '2026-11-15') then
    raise exception '구버전 저장으로 퇴사일 유실';
  end if;

  rejected := false;
  begin
    insert into public.assignments(store_id, employee_id, work_date, category) values (store_a, employee_a, '2026-11-16', 'off');
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception '퇴사일 이후 직접 배정 허용'; end if;

  rejected := false;
  begin
    update public.employees set end_date = '2026-10-31' where id = employee_a;
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception '시작일 이전 퇴사 허용'; end if;

  perform set_config('request.jwt.claim.sub', owner_b::text, true);
  update public.employees set end_date = null where id = employee_a;
  if found then raise exception '타 계정 퇴사 변경 허용'; end if;
  if exists(select 1 from public.employees where id = employee_a) then raise exception '타 계정 직원 조회 허용'; end if;

  -- 명시적인 퇴사 취소는 날짜만 초기화하고 삭제된 배정은 복원하지 않습니다.
  perform set_config('request.jwt.claim.sub', owner_a::text, true);
  perform public.save_planner_changes(3, empty_changes || jsonb_build_object(
    'employees', jsonb_build_array(employee_row || '{"end_date":null}'::jsonb)
  ));
  if exists(select 1 from public.employees where id = employee_a and end_date is not null) then raise exception '퇴사 취소 실패'; end if;
  if jsonb_array_length(public.read_planner()->'assignments') <> 1 then raise exception '삭제 배정 재생성'; end if;
  execute 'reset role';
end;
$test$;
rollback;
select '통과: 퇴사일 경계·원자적 삭제·퇴사 취소·구버전 호환·RLS' as verification;
