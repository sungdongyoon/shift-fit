import test from "node:test";
import assert from "node:assert/strict";
import { counts, employeesInMonth, initial, isEmployeeVisibleOn, type Schedule } from "../lib/schedule";
import { saveScheduleEditor } from "../lib/schedule-commands";
import { buildSchedulePdfData } from "../lib/schedule-pdf-data";
import { buildPlannerChanges, fromPlannerRows, toPlannerPayload } from "../lib/planner-data";
import { createPlannerStore } from "../stores/planner-store";

const employee = {
  id: "d3678de7-52fe-4d81-b9ec-0ba25a096eac",
  name: "테스트 직원",
  color: "#5686D6",
  from: "2026-10",
  startDate: "2026-10-01",
};
const editor = { kind: "employee", ...employee, endDate: "2026-11-15" } as const;

const sample = (): Schedule => ({
  ...structuredClone(initial),
  employees: [{ ...employee }],
  entries: {
    [`2026-10-31:${employee.id}`]: { category: "off" },
    [`2026-11-15:${employee.id}`]: { category: "off" },
    [`2026-11-16:${employee.id}`]: { category: "other", memo: "교육" },
    [`2026-12-01:${employee.id}`]: { category: "leave" },
  },
});

const retire = (data = sample()) => {
  const result = saveScheduleEditor(data, "2026-11", editor);
  if (!result.ok) throw new Error(result.error);

  return result.data;
};

test("퇴사일 당일까지 노출하며 월 중 퇴사자도 해당 월 명단과 집계에 포함한다", () => {
  const data = retire();
  const retired = data.employees[0];
  assert.equal(isEmployeeVisibleOn(retired, "2026-11-15"), true);
  assert.equal(isEmployeeVisibleOn(retired, "2026-11-16"), false);
  assert.equal(employeesInMonth([retired], "2026-10").length, 1);
  assert.equal(employeesInMonth([retired], "2026-11").length, 1);
  assert.equal(employeesInMonth([retired], "2026-12").length, 0);
  assert.deepEqual(counts(data, "2026-11", employee.id), { work: 0, off: 1, leave: 0, other: 0 });
  assert.equal(counts(data, "2026-12", employee.id).work, 0);
});

test("다른 월을 포함한 퇴사일 이후 배정만 삭제하고 다른 직원 기록은 유지한다", () => {
  const data = sample();
  const otherKey = "2026-12-01:other";
  data.entries[otherKey] = { category: "off" };
  const next = retire(data);
  assert.deepEqual(Object.keys(next.entries).sort(), [
    `2026-10-31:${employee.id}`, `2026-11-15:${employee.id}`, otherKey,
  ]);
  assert.equal(Object.keys(data.entries).length, 5);
});

test("잘못된 퇴사일을 거부하고 퇴사일 이후 배정 진입과 저장을 막는다", () => {
  for (const endDate of ["2026-09-30", "2026-11-31", "invalid"]) {
    assert.equal(saveScheduleEditor(sample(), "2026-11", { ...editor, endDate }).ok, false);
  }
  const data = retire();
  assert.equal(saveScheduleEditor(data, "2026-11", {
    kind: "assignment", date: "2026-11-16", employee: employee.id, category: "off", typeId: "",
  }).ok, false);
  const store = createPlannerStore();
  store.setState({ data, storageStatus: "saved", view: { month: "2026-11", today: "2026-11-16", selected: employee.id } });
  store.getState().addAssignment("2026-11-16");
  assert.equal(store.getState().editor, null);
  store.getState().editAssignment("2026-11-16", employee.id);
  assert.equal(store.getState().editor, null);
});

test("PDF도 퇴사일 당일까지만 이름과 횟수를 표시한다", () => {
  const pdf = buildSchedulePdfData(retire(), "2026-11", {});
  const days = pdf.calendars[0].weeks.flat();
  assert.equal(days.find((day) => day.date === "2026-11-15")!.rows.length, 1);
  assert.equal(days.find((day) => day.date === "2026-11-16")!.rows.length, 0);
  assert.equal(pdf.employees[0].counts.off, 1);
});

test("퇴사일과 삭제 배정을 함께 저장하며 DB 왕복에서 퇴사일이 유지된다", () => {
  const data = retire();
  const changes = buildPlannerChanges(data, sample());
  assert.equal(changes.employees[0].end_date, "2026-11-15");
  assert.equal(changes.deleted_assignments.length, 2);
  const payload = toPlannerPayload(data);
  const loaded = fromPlannerRows({ ...payload, revision: 1 });
  assert.equal(loaded.data.employees[0].endDate, "2026-11-15");
  assert.deepEqual(toPlannerPayload(loaded.data), payload);
  data.entries[`2026-11-16:${employee.id}`] = { category: "off" };
  assert.throws(() => toPlannerPayload(data));
});

test("실행 취소는 퇴사일과 삭제 배정을 함께 복원하며 퇴사 취소는 삭제 일정을 재생성하지 않는다", () => {
  const store = createPlannerStore();
  const data = sample();
  store.setState({ data, storageStatus: "saved", view: { month: "2026-11", today: "2026-11-16", selected: employee.id } });
  assert.equal(store.getState().saveEditor(editor), null);
  assert.equal(store.getState().view.selected, "");
  assert.equal(store.getState().data.employees[0].endDate, "2026-11-15");
  store.getState().undoLastChange();
  assert.deepEqual(store.getState().data, data);
  const retired = retire();
  const edited = saveScheduleEditor(retired, "2026-11", { ...editor, name: "수정", endDate: undefined });
  assert.equal(edited.ok, true);
  const canceled = saveScheduleEditor(retired, "2026-11", { ...editor, endDate: "" });
  if (!canceled.ok) throw new Error(canceled.error);
  assert.equal(canceled.data.employees[0].endDate, undefined);
  assert.deepEqual(canceled.data.entries, retired.entries);
  const legacyEditor = { kind: "employee", ...employee } as const;
  const legacy = saveScheduleEditor(retired, "2026-11", legacyEditor);
  if (!legacy.ok) throw new Error(legacy.error);
  assert.equal(legacy.data.employees[0].endDate, "2026-11-15");
});
