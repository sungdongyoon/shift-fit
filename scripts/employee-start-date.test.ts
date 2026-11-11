import test from "node:test";
import assert from "node:assert/strict";
import { counts, initial, isValidDate, isEmployeeVisibleOn, employeesInMonth, type Schedule } from "../lib/schedule";
import { saveScheduleEditor } from "../lib/schedule-commands";
import { buildSchedulePdfData } from "../lib/schedule-pdf-data";
import { fromPlannerRows, toPlannerPayload } from "../lib/planner-data";
import { createPlannerStore } from "../stores/planner-store";

const employee = {
  id: "d3678de7-52fe-4d81-b9ec-0ba25a096eac",
  name: "테스트 직원",
  color: "#5686D6",
  from: "2026-11",
  startDate: "2026-11-15",
};

const sample = (): Schedule => ({ ...structuredClone(initial), employees: [{ ...employee }] });

test("근무 시작일은 필수이며 실제 존재하는 날짜만 허용한다", () => {
  for (const startDate of ["", "2026-02-29", "2026-11-31", "2026-13-01"]) {
    assert.equal(isValidDate(startDate), false);
    assert.equal(saveScheduleEditor(initial, "2026-11", {
      kind: "employee", name: "신규", color: employee.color, startDate,
    }).ok, false);
  }
  assert.equal(isValidDate("2028-02-29"), true);
  const result = saveScheduleEditor(initial, "2026-11", {
    kind: "employee", name: "신규", color: employee.color, startDate: "2026-10-01",
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.employees[0].startDate, "2026-10-01");
});

test("시작일 당일부터 노출하고 그 전 날짜는 미배정·휴무 집계에서 제외한다", () => {
  assert.equal(isEmployeeVisibleOn(employee, "2026-11-14"), false);
  assert.equal(isEmployeeVisibleOn(employee, "2026-11-15"), true);
  assert.equal(employeesInMonth([employee], "2026-10").length, 0);
  assert.equal(employeesInMonth([employee], "2026-11").length, 1);
  assert.deepEqual(counts(sample(), "2026-10", employee.id), { work: 0, off: 0, leave: 0, other: 0, unassigned: 0 });
  assert.equal(counts(sample(), "2026-11", employee.id).unassigned, 16);
  assert.equal(counts(sample(), "2026-12", employee.id).unassigned, 31);
});

test("시작일 이전 배정을 막고 기존 일정을 숨기는 시작일 변경도 거부한다", () => {
  const data = sample();
  const assignment = { kind: "assignment", date: "2026-11-14", employee: employee.id, category: "off", typeId: "" } as const;
  assert.equal(saveScheduleEditor(data, "2026-11", assignment).ok, false);
  assert.equal(saveScheduleEditor(data, "2026-11", { ...assignment, date: employee.startDate }).ok, true);
  data.entries[`2026-11-15:${employee.id}`] = { category: "off" };
  const edit = { kind: "employee", ...employee, startDate: "2026-11-16" } as const;
  assert.equal(saveScheduleEditor(data, "2026-11", edit).ok, false);
  assert.equal(saveScheduleEditor(data, "2026-11", { ...edit, startDate: "2026-10-01" }).ok, true);
  assert.equal(data.employees[0].startDate, "2026-11-15");
});

test("PDF 날짜별 이름과 명단·횟수에 동일한 시작일 기준을 적용한다", () => {
  const data = sample();
  const pdf = buildSchedulePdfData(data, "2026-11", {});
  const days = pdf.calendars[0].weeks.flat();
  assert.equal(days.find((day) => day.date === "2026-11-14")!.rows.length, 0);
  assert.equal(days.find((day) => day.date === "2026-11-15")!.rows.length, 1);
  assert.equal(pdf.employees[0].counts.unassigned, 16);
  assert.throws(() => buildSchedulePdfData(data, "2026-10", {}));
});

test("DB 왕복은 등록 월과 별개인 시작일을 보존하고 잘못된 과거 배정을 거부한다", () => {
  const data = sample();
  const payload = toPlannerPayload(data);
  assert.equal(payload.employees[0].start_date, "2026-11-15");
  assert.equal(payload.employees[0].registered_month, "2026-11-01");
  assert.equal(fromPlannerRows({ ...payload, revision: 1 }).data.employees[0].startDate, employee.startDate);
  data.entries[`2026-11-14:${employee.id}`] = { category: "off" };
  assert.throws(() => toPlannerPayload(data));
});

test("달력 추가·수정 진입도 시작 전 근무자를 선택하지 않는다", () => {
  const store = createPlannerStore();
  store.setState({ data: sample(), storageStatus: "saved", view: { month: "2026-11", today: "2026-11-11", selected: employee.id } });
  store.getState().addAssignment("2026-11-14");
  assert.equal(store.getState().editor, null);
  store.getState().editAssignment("2026-11-14", employee.id);
  assert.equal(store.getState().editor, null);
  store.getState().addAssignment("2026-11-15");
  assert.equal(store.getState().editor?.kind, "assignment");
});
