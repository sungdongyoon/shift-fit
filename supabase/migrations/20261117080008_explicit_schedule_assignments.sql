-- 자동 표시하던 미배정 상태를 제거합니다. 실제 근무·휴무·연차·기타 기록은 유지합니다.
lock table public.stores, public.assignments in access exclusive mode;

-- 제거 대상이 있던 매장의 저장 버전을 올려 이전 화면의 덮어쓰기를 방지합니다.
with removed as (
  delete from public.assignments where category = 'unassigned' returning store_id
)
update public.stores set revision = revision + 1, updated_at = now()
where id in (select distinct store_id from removed);

alter table public.assignments drop constraint assignments_category_check;
alter table public.assignments add constraint assignments_category_check
  check (category in ('work', 'off', 'leave', 'other'));
