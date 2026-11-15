-- 합성 계정과 테스트 데이터는 검증이 끝나면 모두 롤백합니다.
begin;
do $test$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  employee_a uuid := gen_random_uuid();
  employee_b uuid := gen_random_uuid();
  store_a uuid;
  empty_changes jsonb := '{"employees":[],"months":[],"types":[],"assignments":[]}'::jsonb;
  payload jsonb;
  result jsonb;
  rejected boolean;
begin
  insert into auth.users(id) values (owner_a), (owner_b);
  perform set_config('request.jwt.claim.sub', owner_a::text, true);
  execute 'set local role authenticated';
  payload := empty_changes || jsonb_build_object(
    'store_name', '검증 매장 1호점',
    'employees', jsonb_build_array(
      jsonb_build_object('id', employee_a, 'name', '직원', 'color', '#5686D6', 'registered_month', '2026-11-01', 'start_date', '2026-11-01', 'sort_order', 0),
      jsonb_build_object('id', employee_b, 'name', '파트타이머', 'color', '#5686D6', 'registered_month', '2026-11-01', 'start_date', '2026-11-01', 'sort_order', 1)
    ),
    'months', '[{"month":"2026-11-01","off_target":8},{"month":"2026-12-01","off_target":8}]'::jsonb,
    'employee_targets', jsonb_build_array(
      jsonb_build_object('employee_id', employee_a, 'month', '2026-11-01', 'off_target', 8),
      jsonb_build_object('employee_id', employee_b, 'month', '2026-11-01', 'off_target', null)
    )
  );
  if public.save_planner_changes(0, payload) <> 1 then raise exception '첫 저장 실패'; end if;
  result := public.read_planner();
  select id into store_a from public.stores where owner_id = owner_a;
  if result->>'store_name' <> '검증 매장 1호점' or jsonb_array_length(result->'employee_targets') <> 2 then
    raise exception '매장명·휴무 기준 조회 실패';
  end if;
  if not exists(select 1 from public.employee_month_settings where employee_id = employee_b and off_target is null) then
    raise exception '미지정 기준 유실';
  end if;

  payload := empty_changes || jsonb_build_object('employee_targets', jsonb_build_array(
    jsonb_build_object('employee_id', employee_a, 'month', '2026-12-01', 'off_target', 0)
  ));
  perform public.save_planner_changes(1, payload);
  if not exists(select 1 from public.employee_month_settings where employee_id = employee_a and month = '2026-11-01' and off_target = 8) then
    raise exception '다른 월 기준 변경';
  end if;

  rejected := false;
  begin
    perform public.save_planner_changes(2, empty_changes || jsonb_build_object(
      'store_name', '실패 시 취소할 매장명',
      'employee_targets', jsonb_build_array(jsonb_build_object('employee_id', employee_a, 'month', '2026-11-01', 'off_target', 31))
    ));
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception '월 일수 초과 허용'; end if;
  if public.read_planner()->>'store_name' <> '검증 매장 1호점' or (public.read_planner()->>'revision')::int <> 2 then
    raise exception '저장 실패 시 일부 변경 반영';
  end if;

  perform public.save_planner_changes(2, empty_changes);
  if jsonb_array_length(public.read_planner()->'employee_targets') <> 3 then raise exception '구버전 저장 시 기준 유실'; end if;

  perform public.save_planner_changes(3, empty_changes || jsonb_build_object('months', '[{"month":"2026-11-01","off_target":9}]'::jsonb));
  if not exists(select 1 from public.employee_month_settings where employee_id = employee_a and month = '2026-11-01' and off_target = 9) then raise exception '구버전 공통 기준 변경 미반영'; end if;
  if not exists(select 1 from public.employee_month_settings where employee_id = employee_b and off_target is null) then raise exception '구버전 저장이 미지정 기준 변경'; end if;

  perform set_config('request.jwt.claim.sub', owner_b::text, true);
  if exists(select 1 from public.employee_month_settings where store_id = store_a) then raise exception '타 계정 휴무 조회 허용'; end if;
  rejected := false;
  begin
    insert into public.employee_month_settings values (store_a, employee_b, '2026-12-01', 4, now(), now());
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception '타 계정 휴무 생성 허용'; end if;
  update public.employee_month_settings set off_target = 3 where store_id = store_a;
  if found then raise exception '타 계정 휴무 변경 허용'; end if;
  delete from public.employee_month_settings where store_id = store_a;
  if found then raise exception '타 계정 휴무 삭제 허용'; end if;

  perform set_config('request.jwt.claim.sub', owner_a::text, true);
  perform public.save_planner_changes(4, empty_changes || jsonb_build_object('deleted_employees', jsonb_build_array(employee_a)));
  if exists(select 1 from public.employee_month_settings where employee_id = employee_a) then raise exception '퇴사 직원 휴무 기준 잔존'; end if;

  execute 'set local role anon';
  rejected := false;
  begin perform 1 from public.employee_month_settings;
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception '비로그인 휴무 조회 허용'; end if;
  execute 'reset role';
end;
$test$;
rollback;
select '통과: 매장명·직원별 기준·미지정·월 분리·저장 원자성·RLS·구버전 호환·직원 삭제' as verification;
