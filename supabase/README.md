# ShiftFit DB

`schema.sql`은 빈 Supabase 프로젝트에 적용하는 최종 스키마입니다. 기존 테이블 위에 반복 실행하지 않습니다. 실제 프로젝트에는 테이블/RLS 생성과 변경 행 저장 RPC 전환을 마이그레이션으로 적용했습니다.

## 구조

- `stores`: `owner_id` 고유 제약으로 계정당 매장 1개, `revision`으로 저장 충돌 확인.
- `employees`: 매장 공통 명단, UUID, 이름·색상·등록 월·정렬 순서.
- `schedule_months`: 매장과 월 조합 고유, 월별 휴무 기준.
- `shift_types`: 월 소속, 시간·색상·이름·archived. 활성 이름 중복 제한. 삭제해도 기존 배정이 참조하도록 archived 처리.
- `assignments`: 직원과 날짜 조합 고유, 다섯 일정 종류, 기타 메모. 날짜에서 월을 생성하고 같은 매장·월의 직원/타입만 연결하는 복합 외래 키 사용.

모든 업무 테이블에 RLS를 활성화합니다. 사용자 계정이 소유한 매장만 읽고 수정하며 익명 사용자의 테이블 접근과 RPC 실행은 거부합니다. RPC는 SECURITY INVOKER와 빈 search_path를 사용합니다.

## 읽기와 저장

`read_planner()`는 매장을 생성하지 않고 계정의 현재 근무표와 revision을 반환합니다. `save_planner_changes(p_revision, p_data)`는 첫 저장 시 기본 매장을 생성하고 해당 매장 행을 잠가 revision을 비교합니다. 오래된 요청은 SCHEDULE_CONFLICT(40001)로 거부합니다.

p_data에는 employees/months/types/assignments의 **변경한 행만** 넣습니다. deleted_employees/deleted_types/deleted_months/deleted_assignments에는 **삭제할 대상만** 명시합니다. 배열에 없다는 이유로 기존 데이터를 삭제하지 않습니다. 일부 변경이라도 실패하면 전부 롤백하며 성공할 때 revision을 증가시킵니다.

직원 삭제는 기존 동작대로 모든 월의 해당 배정을 함께 삭제합니다. 월별 확정본/보관 이력은 이번 스키마에 포함하지 않습니다. 근무/휴무 횟수는 배정에서 계산하며 별도 집계 테이블에 중복 저장하지 않습니다.

## 검증

`verify.sql`은 관리자 SQL 실행 환경에서 테스트 계정과 데이터를 트랜잭션 안에만 생성합니다. 계정 간 조회/삽입/수정 차단, 익명 차단, 원자적 저장, 변경 행 저장 시 기존 배정 보존, 실패 롤백, 버전 충돌, 매장 개수 제한을 확인하고 마지막에 ROLLBACK합니다. 중간 오류가 나면 열린 트랜잭션도 롤백한 뒤 원인을 확인합니다.

로컬 PostgreSQL 호환 엔진과 실제 Supabase에서 검증했습니다. 보안 Advisor에는 테이블·RLS·함수 관련 신규 경고가 없으며 기존 Auth 유출 비밀번호 보호 비활성화 경고는 별도 설정입니다.
