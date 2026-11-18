import test from "node:test";
import assert from "node:assert/strict";
import {
  employeesInMonth,
  sortEmployeesByStartDate,
  type Employee,
} from "../lib/schedule";

const employees: Employee[] = [
  {
    id: "late",
    name: "늦은 입사",
    color: "#5686D6",
    from: "2026-11",
    startDate: "2026-11-15",
  },
  { id: "legacy", name: "기존 직원", color: "#5686D6", from: "2026-10" },
  {
    id: "early",
    name: "빠른 입사",
    color: "#5686D6",
    from: "2026-11",
    startDate: "2026-11-01",
  },
  {
    id: "same",
    name: "같은 입사일",
    color: "#5686D6",
    from: "2026-11",
    startDate: "2026-11-01",
  },
];

test("입사일 오름차순으로 정렬하며 같은 입사일은 기존 순서를 유지하고 원본을 보존한다", () => {
  const before = structuredClone(employees);
  const result = sortEmployeesByStartDate(employees);

  assert.deepEqual(
    result.map((employee) => employee.id),
    ["legacy", "early", "same", "late"],
  );
  assert.deepEqual(employees, before);
  assert.notEqual(result, employees);
});

test("월별 목록도 재직 직원만 입사일순으로 반환한다", () => {
  const future = { ...employees[0], id: "future", startDate: "2026-12-01" };
  const retired = { ...employees[1], id: "retired", endDate: "2026-10-31" };
  const result = employeesInMonth([...employees, future, retired], "2026-11");

  assert.deepEqual(
    result.map((employee) => employee.id),
    ["legacy", "early", "same", "late"],
  );
});
