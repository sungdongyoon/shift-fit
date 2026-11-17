import test from "node:test";
import assert from "node:assert/strict";
import { initial, type Schedule, type ShiftType } from "../lib/schedule";
import { saveScheduleEditor } from "../lib/schedule-commands";
import { monthlyWorkMinutes, formatWorkTime } from "../lib/work-time";

const employee = { id: "employee", name: "검증 직원", color: "#5686D6", from: "2026-11", startDate: "2026-11-01" };
const shift: ShiftType = { id: "shift", name: "오픈", start: "09:00", end: "18:00", color: "#5686D6" };

const sample = (): Schedule => ({
  ...structuredClone(initial),
  employees: [{ ...employee }],
  typesByMonth: { "2026-11": [{ ...shift }] },
  entries: {
    "2026-11-01:employee": { category: "work", shift: { ...shift } },
    "2026-11-02:employee": { category: "work", shift: { ...shift, start: "22:30", end: "06:15" } },
    "2026-11-03:employee": { category: "off" },
    "2026-11-04:employee": { category: "leave" },
    "2026-11-05:employee": { category: "other" },
    "2026-11-06:employee": { category: "unassigned" },
    "2026-11-30:employee": { category: "work", shift: { ...shift, start: "23:00", end: "02:00" } },
    "2026-12-01:employee": { category: "work", shift: { ...shift } },
    "2026-11-01:other": { category: "work", shift: { ...shift } },
  },
});

test("월별·직원별 근무만 분 단위로 합산하며 야간 근무는 배정 월에 포함한다", () => {
  assert.equal(monthlyWorkMinutes(sample(), "2026-11", employee), 1185);
  assert.equal(monthlyWorkMinutes(sample(), "2026-12", employee), 540);
  assert.equal(monthlyWorkMinutes(sample(), "2026-10", employee), 0);
});

test("시작일·퇴사일 밖의 배정은 제외하며 경계 당일은 포함한다", () => {
  assert.equal(monthlyWorkMinutes(sample(), "2026-11", {
    ...employee, startDate: "2026-11-02", endDate: "2026-11-02",
  }), 465);
});

test("근무 타입 시간 수정과 일정 변경을 즉시 합산에 반영한다", () => {
  const data = sample();
  data.entries = { "2026-11-01:employee": { category: "work", shift } };
  const result = saveScheduleEditor(data, "2026-11", {
    kind: "type", ...shift, end: "17:30",
  });
  if (!result.ok) throw new Error(result.error);
  assert.equal(monthlyWorkMinutes(result.data, "2026-11", employee), 510);
  result.data.entries["2026-11-01:employee"] = { category: "off" };
  assert.equal(monthlyWorkMinutes(result.data, "2026-11", employee), 0);
});

test("근무 시간은 0시간 또는 시간·분으로 표시하며 하루를 넘겨도 누적한다", () => {
  assert.equal(formatWorkTime(0), "0시간");
  assert.equal(formatWorkTime(9600), "160시간");
  assert.equal(formatWorkTime(1185), "19시간 45분");
});
