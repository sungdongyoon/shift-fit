import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthCells, compareCalendarRows } from "../lib/calendar";
import { initial, readSaved, type Schedule } from "../lib/schedule";
import { createExampleSchedule, saveScheduleEditor } from "../lib/schedule-commands";
import { createPlannerStore } from "../stores/planner-store";
import { connectPlannerStorage } from "../stores/planner-storage";

const employee = { id: "employee", name: "김지우", color: "#5686D6", from: "2026-01" };

test("월간 그리드는 윤년, 연도 경계와 일요일 시작 월을 정확히 채운다", () => {
  const leapFebruary = buildMonthCells("2028-02");
  const februaryDays = leapFebruary.filter((cell) => cell.isCurrentMonth);

  assert.equal(februaryDays.length, 29);
  assert.equal(februaryDays.at(-1)?.date, "2028-02-29");
  assert.equal(leapFebruary[0].column, 0);
  assert.equal(leapFebruary.at(-1)?.column, 6);
  assert.equal(buildMonthCells("2027-01")[0].date, "2026-12-27");
  assert.equal(buildMonthCells("2026-02")[0].date, "2026-02-01");
  assert.equal(buildMonthCells("2026-02").length, 28);
  assert.deepEqual(buildMonthCells(""), []);
});

test("배정은 시작 시간, 이름순으로 정렬되고 근무 외 일정은 뒤에 표시한다", () => {
  const rows = [
    { employee: { ...employee, name: "휴무" }, assignment: { category: "off" } as const },
    { employee: { ...employee, name: "이도윤" }, assignment: { category: "work", shift: initial.types[0] } as const },
    { employee: { ...employee, name: "김지우" }, assignment: { category: "work", shift: initial.types[0] } as const },
    { employee: { ...employee, name: "마감" }, assignment: { category: "work", shift: initial.types[2] } as const },
  ];

  assert.deepEqual(rows.sort(compareCalendarRows).map((row) => row.employee.name), [
    "김지우", "이도윤", "마감", "휴무",
  ]);
});

test("일괄 생성한 예시는 원본을 변경하지 않고 기존 배정과 타입 스냅샷을 보존한다", () => {
  const data: Schedule = structuredClone(initial);
  data.entries["2025-12-01:old-employee"] = { category: "leave" };
  const before = structuredClone(data);
  const example = createExampleSchedule(data, "2026-01");

  assert.deepEqual(data, before);
  assert.deepEqual(example.entries["2025-12-01:old-employee"], { category: "leave" });
  const work = Object.values(example.entries).find((entry) => entry.category === "work")!;
  const snapshot = structuredClone(work.shift);
  example.types.forEach((type) => { type.name = "변경"; });
  assert.deepEqual(work.shift, snapshot);
});

test("분리된 편집 명령은 중복 이름을 거부하고 직원 이력을 유지한다", () => {
  const data: Schedule = { ...structuredClone(initial), employees: [employee] };
  const duplicate = saveScheduleEditor(data, "2026-11", {
    kind: "employee", name: " 김지우 ", color: "#5686D6",
  });
  assert.equal(duplicate.ok, false);

  const updated = saveScheduleEditor(data, "2026-11", {
    kind: "employee", id: employee.id, name: "변경된 이름", color: "#000000",
  });
  assert.equal(updated.ok, true);
  if (!updated.ok) return;

  assert.equal(updated.data.employees[0].from, "2026-01");
  assert.equal(data.employees[0].name, "김지우");
  assert.deepEqual(readSaved(JSON.stringify(updated.data)), updated.data);
});

test("손상된 목록과 배열 형태의 저장 사전은 복원 과정에서 거부한다", () => {
  for (const invalid of [
    { ...initial, types: [null] },
    { ...initial, employees: [null] },
    { ...initial, entries: [] },
    { ...initial, targets: [] },
  ]) {
    assert.throws(() => readSaved(JSON.stringify(invalid)));
  }
});

test("기본 휴무 기준을 그대로 입력하면 저장과 실행 취소를 만들지 않는다", () => {
  const store = createPlannerStore();
  let writes = 0;
  const disconnect = connectPlannerStorage(store, () => ({
    getItem: () => null,
    setItem: () => { writes++; },
  }), new Date(2026, 10, 5));

  store.getState().setOffTarget(8);
  assert.equal(writes, 0);
  assert.equal(store.getState().toast, null);

  disconnect();
});

test("직원 추가를 실행 취소하면 사라진 직원의 강조 상태도 해제한다", () => {
  const store = createPlannerStore();
  const disconnect = connectPlannerStorage(store, () => ({
    getItem: () => null,
    setItem: () => {},
  }), new Date(2026, 10, 5));

  store.getState().saveEditor({ kind: "employee", name: "추가 직원", color: "#5686D6" });
  const employeeId = store.getState().data.employees[0].id;
  store.getState().selectEmployee(employeeId);
  store.getState().undoLastChange();

  assert.equal(store.getState().data.employees.length, 0);
  assert.equal(store.getState().view.selected, "");
  disconnect();
});
