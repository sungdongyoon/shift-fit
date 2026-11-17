-- 합성 데이터로 직급 저장을 확인하고 실제 데이터는 변경하지 않습니다.
begin;
do $test$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  employee_a uuid := gen_random_uuid();
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
    'employees', jsonb_build_array(employee_row || '{"position":"  매니저  "}'::jsonb)
  ));
  if public.read_planner()->'employees'->0->>'position' is distinct from '매니저' then raise exception '직급 조회 실패'; end if;

  perform public.save_planner_changes(1, empty_changes || jsonb_build_object('employees', jsonb_build_array(employee_row)));
  if public.read_planner()->'employees'->0->>'position' is distinct from '매니저' then raise exception '구버전 직급 유실'; end if;

  rejected := false;
  begin
    perform public.save_planner_changes(2, empty_changes || jsonb_build_object(
      'employees', jsonb_build_array(employee_row || jsonb_build_object('position', repeat('가', 31)))
    ));
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception '직급 길이 제한 미적용'; end if;
  if (public.read_planner()->>'revision')::int <> 2 then raise exception '실패한 저장 버전 변경'; end if;

  perform set_config('request.jwt.claim.sub', owner_b::text, true);
  update public.employees set position = '점장' where id = employee_a;
  if found then raise exception '타 계정 직급 변경 허용'; end if;
  if exists(select 1 from public.employees where id = employee_a) then raise exception '타 계정 직원 조회 허용'; end if;

  perform set_config('request.jwt.claim.sub', owner_a::text, true);
  perform public.save_planner_changes(2, empty_changes || jsonb_build_object(
    'employees', jsonb_build_array(employee_row || '{"position":null}'::jsonb)
  ));
  if exists(select 1 from public.employees where id = employee_a and position is not null) then raise exception '직급 제거 실패'; end if;
  execute 'reset role';
end;
$test$;
rollback;
select '통과: 직급 저장·조회·구버전 호환·길이 제한·제거·RLS' as verification;
