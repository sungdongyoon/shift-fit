-- 합성 계정에서 명시적 일정 저장·삭제와 폐기한 상태 차단을 검증한 뒤 롤백합니다.
begin;
do $test$
declare
  owner_a uuid := gen_random_uuid();
  employee_a uuid := gen_random_uuid();
  empty_changes jsonb := '{"employees":[],"months":[],"types":[],"assignments":[]}'::jsonb;
  rejected boolean;
begin
  insert into auth.users(id) values (owner_a);
  perform set_config('request.jwt.claim.sub', owner_a::text, true);
  execute 'set local role authenticated';
  perform public.save_planner_changes(0, empty_changes || jsonb_build_object(
    'employees', jsonb_build_array(jsonb_build_object('id', employee_a, 'name', '검증 직원', 'color', '#5686D6',
      'registered_month', '2026-11-01', 'start_date', '2026-11-01', 'sort_order', 0)),
    'months', '[{"month":"2026-11-01","off_target":8}]'::jsonb
  ));
  if jsonb_array_length(public.read_planner()->'assignments') <> 0 then raise exception '직원 등록 시 일정 자동 생성'; end if;

  rejected := false;
  begin
    perform public.save_planner_changes(1, empty_changes || jsonb_build_object('assignments', jsonb_build_array(
      jsonb_build_object('employee_id', employee_a, 'work_date', '2026-11-01', 'category', 'unassigned')
    )));
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception '폐기한 상태 저장 허용'; end if;
  if (public.read_planner()->>'revision')::int <> 1 then raise exception '실패한 저장 버전 변경'; end if;

  perform public.save_planner_changes(1, empty_changes || jsonb_build_object('assignments', jsonb_build_array(
    jsonb_build_object('employee_id', employee_a, 'work_date', '2026-11-01', 'category', 'off')
  )));
  if jsonb_array_length(public.read_planner()->'assignments') <> 1 then raise exception '휴무 배정 저장 실패'; end if;
  perform public.save_planner_changes(2, empty_changes || jsonb_build_object('deleted_assignments', jsonb_build_array(
    jsonb_build_object('employee_id', employee_a, 'work_date', '2026-11-01')
  )));
  if jsonb_array_length(public.read_planner()->'assignments') <> 0 then raise exception '배정 삭제 후 빈 날짜 복원 실패'; end if;
  execute 'reset role';
end;
$test$;
rollback;
select '통과: 등록 시 빈 일정·폐기 상태 차단·명시적 휴무·배정 삭제' as verification;
