import test from "node:test";
import assert from "node:assert/strict";
import { buildSchedulePdfData } from "../lib/schedule-pdf-data";
import { assign, getAssignment, initial, readSaved, type Schedule } from "../lib/schedule";

import { saveScheduleEditor } from "../lib/schedule-commands";

const employee = { id: "employee", name: "김지우", color: "#5686D6", from: "2026-05" };
const base = (): Schedule => ({ ...structuredClone(initial), employees: [employee] });

test("PDF는 선택한 월의 모든 직원과 네 종류의 횟수, 공휴일을 포함한다", () => {
  let data = assign(base(), "2026-05-01", employee.id, { category: "work", shift: initial.types[0] });
  data = assign(data, "2026-05-02", employee.id, { category: "leave" });
  data = assign(data, "2026-05-03", employee.id, { category: "other", memo: "외부 지원" });
  data.employees.push({ ...employee, id: "future", from: "2026-06" });
  data.employees.push({ ...employee, id: "past", from: "2026-01", until: "2026-04" });
  data.targets["2026-05"] = 9;
  const before = structuredClone(data);
  const output = buildSchedulePdfData(data, "2026-05", { "2026-05-05": "어린이날" });

  assert.equal(output.filename, "shiftfit-2026-05.pdf");
  assert.equal(output.target, 9);
  assert.equal(output.employees.length, 1);
  assert.deepEqual(output.employees[0].counts, { work: 1, off: 28, leave: 1, other: 1 });
  const days = output.calendars[0].weeks.flat();
  assert.equal(days.find((day) => day.date === "2026-05-05")?.holiday, "어린이날");
  assert.equal(days.find((day) => day.date === "2026-05-03")?.rows[0].assignment.memo, "외부 지원");
  assert.equal(days.filter((day) => day.isCurrentMonth).length, 31);
  assert.ok(days.filter((day) => !day.isCurrentMonth).every((day) => day.rows.length === 0));
  assert.deepEqual(data, before);
});

test("기존 배정의 삭제·변경된 타입도 PDF 범례에 보존한다", () => {
  const data = assign(base(), "2026-05-01", employee.id, { category: "work", shift: initial.types[0] });
  data.types[0].archived = true;
  data.types.push({ ...initial.types[0], name: "새 오픈", start: "07:00" });
  const output = buildSchedulePdfData(data, "2026-05", {});

  assert.equal(output.shiftTypes.filter((shift) => shift.name === "오픈").length, 1);
  assert.equal(output.shiftTypes.filter((shift) => shift.name === "새 오픈").length, 1);
});

test("직원이 많으면 그룹을 나누되 매일 모든 이름을 한 번씩 출력한다", () => {
  const data = base();
  data.employees = Array.from({ length: 19 }, (_, index) => ({ ...employee, id: `employee-${index}`, name: `근무자 ${index}` }));
  const output = buildSchedulePdfData(data, "2026-05", {});
  const firstDayRows = output.calendars.flatMap((calendar) =>
    calendar.weeks.flat().find((day) => day.date === "2026-05-01")!.rows,
  );

  assert.equal(output.calendars.length, 4);
  assert.equal(firstDayRows.length, 19);
  assert.equal(new Set(firstDayRows.map((row) => row.employee.id)).size, 19);
  assert.equal(output.employees.length, 19);
  assert.ok(output.employees.every((person) => person.counts.off === 31));
});

test("출력할 직원이나 올바른 월이 없으면 PDF 생성을 거부한다", () => {
  assert.throws(() => buildSchedulePdfData(initial, "2026-05", {}));
  assert.throws(() => buildSchedulePdfData(base(), "2026-13", {}));
  assert.throws(() => buildSchedulePdfData(base(), "", {}));
});

test("타입 수정은 모든 월에 반영되고 복원과 PDF에서도 동일 타입 범례가 중복되지 않는다", () => {
  const data = assign(base(), "2026-05-04", employee.id, {
    category: "work", shift: initial.types[2],
  });
  data.entries[`2026-06-04:${employee.id}`] = {
    category: "work", shift: structuredClone(initial.types[2]),
  };
  data.entries[`2026-05-05:${employee.id}`] = {
    category: "other", memo: "교육",
  };
  const original = structuredClone(data);
  const updatedType = {
    ...data.types[2], name: "저녁 마감", start: "15:00", end: "00:00", color: "#5686D6",
  };
  const result = saveScheduleEditor(data, "2026-05", { kind: "type", ...updatedType });

  if (!result.ok) throw new Error(result.error);

  for (const date of ["2026-05-04", "2026-06-04"]) {
    assert.deepEqual(getAssignment(result.data, date, employee.id).shift, updatedType);
  }

  assert.deepEqual(data, original);
  assert.equal(getAssignment(result.data, "2026-05-05", employee.id).memo, "교육");
  const legacy = structuredClone(original);
  legacy.types[2] = updatedType;
  const restored = readSaved(JSON.stringify(legacy));
  assert.deepEqual(getAssignment(restored, "2026-05-04", employee.id).shift, updatedType);
  const output = buildSchedulePdfData(restored, "2026-05", {});
  assert.deepEqual(output.shiftTypes.filter((shift) => shift.id === updatedType.id), [updatedType]);
  assert.deepEqual(output.calendars[0].weeks.flat().find((day) => day.date === "2026-05-04")?.rows[0].assignment.shift, updatedType);
  const archived = structuredClone(legacy);
  archived.types[2].archived = true;
  assert.deepEqual(getAssignment(readSaved(JSON.stringify(archived)), "2026-05-04", employee.id).shift, original.types[2]);
});
