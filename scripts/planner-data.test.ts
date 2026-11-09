import test from "node:test";
import assert from "node:assert/strict";
import {
  fromPlannerRows,
  toPlannerPayload,
  buildPlannerChanges,
  parsePlannerChanges,
} from "../lib/planner-data";
import {
  createExampleSchedule,
  copyPreviousMonthTypes,
} from "../lib/schedule-commands";
import { initial, getAssignment } from "../lib/schedule";

const sample = () => createExampleSchedule(structuredClone(initial), "2026-11");

test("DB 행 변환은 직원·월별 타입·배정·메모와 미배정을 왕복 보존한다", () => {
  const data = sample();
  const employee = data.employees[0];
  data.entries[`2026-11-04:${employee.id}`] = {
    category: "other",
    memo: "교육",
  };
  data.entries[`2026-11-05:${employee.id}`] = { category: "unassigned" };
  data.typesByMonth["2026-11"][0].archived = true;
  const payload = toPlannerPayload(data);
  const result = fromPlannerRows({ ...payload, revision: 3 });
  assert.equal(result.revision, 3);
  assert.equal(result.data.employees.length, 4);
  assert.equal(result.data.typesByMonth["2026-11"][0].archived, true);
  assert.equal(
    getAssignment(result.data, "2026-11-04", employee.id).memo,
    "교육",
  );
  assert.equal(
    getAssignment(result.data, "2026-11-05", employee.id).category,
    "unassigned",
  );
  assert.deepEqual(toPlannerPayload(result.data), payload);
});

test("직원이 없는 월과 복사한 월별 타입도 독립적인 ID로 저장한다", () => {
  const empty = structuredClone(initial);
  empty.targets["2026-12"] = 9;
  assert.deepEqual(toPlannerPayload(empty).months, [
    { month: "2026-12-01", off_target: 9 },
  ]);
  const copied = copyPreviousMonthTypes(sample(), "2026-12");
  if (!copied.ok) throw new Error(copied.error);
  const types = toPlannerPayload(copied.data).types;
  assert.equal(new Set(types.map((type) => type.id)).size, 6);
});

test("교차 월 참조·없는 직원·잘못된 날짜·ID·시간·긴 메모를 저장 전에 거부한다", () => {
  const change = (edit: (data: ReturnType<typeof sample>) => void) => {
    const data = sample();
    edit(data);
    assert.throws(() => toPlannerPayload(data));
  };
  change((data) => {
    data.employees[0].id = "invalid";
  });
  change((data) => {
    data.typesByMonth["2026-11"][0].start = "25:00";
  });
  change((data) => {
    data.entries[`2026-11-31:${data.employees[0].id}`] = { category: "off" };
  });
  change((data) => {
    data.entries["2026-11-04:unknown"] = { category: "off" };
  });
  change((data) => {
    data.entries[`2026-12-04:${data.employees[0].id}`] = {
      category: "work",
      shift: data.typesByMonth["2026-11"][0],
    };
  });
  change((data) => {
    data.entries[`2026-11-04:${data.employees[0].id}`] = {
      category: "other",
      memo: "x".repeat(201),
    };
  });
  assert.throws(() => toPlannerPayload({ version: 2 }));
  assert.throws(() => fromPlannerRows({ revision: -1 }));
});

test("클라이언트가 보낸 소유자·매장 필드는 DB 저장 데이터에 포함하지 않는다", () => {
  const data = { ...sample(), owner_id: "foreign", store_id: "foreign" };
  const payload = toPlannerPayload(data);
  assert.equal(JSON.stringify(payload).includes("foreign"), false);
});

test("저장 요청은 변경 행만 포함하고 삭제 대상을 명시한다", () => {
  const baseline = sample();
  const updated = structuredClone(baseline);
  updated.employees[0].name = "수정한 이름";
  const key = `2026-11-04:${updated.employees[0].id}`;
  updated.entries[key] = { category: "other", memo: "교육" };
  const changes = buildPlannerChanges(updated, baseline);
  assert.equal(changes.employees.length, 1);
  assert.equal(changes.assignments.length, 1);
  assert.equal(changes.types.length, 0);
  assert.equal(changes.months.length, 0);
  assert.equal(changes.deleted_assignments.length, 0);
  assert.deepEqual(
    parsePlannerChanges({ ...changes, store_id: "ignored" }),
    changes,
  );
  delete updated.entries[key];
  assert.deepEqual(buildPlannerChanges(updated, baseline).deleted_assignments, [
    { employee_id: updated.employees[0].id, work_date: "2026-11-04" },
  ]);
  assert.throws(() => parsePlannerChanges({ employees: [] }));
});
