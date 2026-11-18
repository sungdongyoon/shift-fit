import test from "node:test";
import assert from "node:assert/strict";
import {
  applyBatchAssignments,
  datesForWeekdays,
  planBatchAssignments,
  type BatchAssignmentRequest,
} from "../lib/batch-assignments";
import { createPlannerStore, hasUnsavedChanges } from "../stores/planner-store";
import { buildPlannerChanges, toPlannerPayload } from "../lib/planner-data";
import { initial, type Schedule } from "../lib/schedule";

const first = {
  id: "d3678de7-52fe-4d81-b9ec-0ba25a096eac",
  name: "직원 1",
  color: "#5686D6",
  from: "2026-11",
  startDate: "2026-11-01",
};
const second = {
  ...first,
  id: "a3678de7-52fe-4d81-b9ec-0ba25a096eac",
  name: "직원 2",
  startDate: "2026-11-15",
  endDate: "2026-11-20",
};
const shift = {
  id: "b3678de7-52fe-4d81-b9ec-0ba25a096eac",
  name: "오픈",
  start: "09:00",
  end: "18:00",
  color: "#5686D6",
};
const sample = (): Schedule => ({
  ...structuredClone(initial),
  employees: [first, second],
  typesByMonth: { "2026-11": [shift] },
});
const request = (
  patch: Partial<BatchAssignmentRequest> = {},
): BatchAssignmentRequest => ({
  month: "2026-11",
  employeeIds: [first.id, second.id],
  dates: ["2026-11-14", "2026-11-15", "2026-11-20", "2026-11-21"],
  category: "work",
  typeId: shift.id,
  ...patch,
});

test("선택한 직원×날짜 중 기존 배정과 재직 기간 밖은 건너뛰고 미리보기와 결과가 일치한다", () => {
  const data = sample();
  data.entries[`2026-11-15:${first.id}`] = { category: "leave" };
  const result = planBatchAssignments(data, request());
  if (!result.ok) throw new Error(result.error);
  assert.equal(result.plan.additions.length, 5);
  assert.equal(result.plan.existingCount, 1);
  assert.equal(result.plan.outsideEmploymentCount, 2);
  const applied = applyBatchAssignments(data, result.plan);
  assert.equal(Object.keys(applied.entries).length, 6);
  assert.equal(applied.entries[`2026-11-15:${first.id}`].category, "leave");
  assert.equal(Object.keys(data.entries).length, 1);
  assert.equal(toPlannerPayload(applied).assignments.length, 6);
  assert.equal(buildPlannerChanges(applied, data).assignments.length, 5);
  applied.entries[`2026-11-14:${first.id}`].shift!.name = "외부 수정";
  assert.equal(data.typesByMonth["2026-11"][0].name, "오픈");
});

test("중복 선택은 한 번만 적용하고 휴무·연차·기타도 같은 경로로 배정한다", () => {
  for (const category of ["off", "leave", "other"] as const) {
    const result = planBatchAssignments(
      sample(),
      request({
        employeeIds: [first.id, first.id],
        dates: ["2026-11-15", "2026-11-15"],
        category,
        typeId: "",
        memo: " 교육  지원 ",
      }),
    );
    if (!result.ok) throw new Error(result.error);
    assert.equal(result.plan.additions.length, 1);
    assert.deepEqual(result.plan.additions[0].assignment, {
      category,
      ...(category === "other" ? { memo: "교육 지원" } : {}),
    });
  }
});

test("다른 월·잘못된 날짜·빈 선택·삭제된 타입·없는 직원은 일괄 적용 전에 거부한다", () => {
  for (const patch of [
    { dates: [] },
    { employeeIds: [] },
    { dates: ["2026-12-01"] },
    { dates: ["2026-11-31"] },
    { employeeIds: ["unknown"] },
    { typeId: "unknown" },
    { category: "other" as const, memo: "가".repeat(201) },
  ])
    assert.equal(planBatchAssignments(sample(), request(patch)).ok, false);
  const data = sample();
  data.typesByMonth["2026-11"][0] = { ...shift, archived: true };
  assert.equal(planBatchAssignments(data, request()).ok, false);
});

test("요일 선택은 해당 월과 지정 기간 안에서만 날짜를 만들며 윤년도 지원한다", () => {
  assert.deepEqual(
    datesForWeekdays("2026-11", "2026-11-01", "2026-11-08", [0, 6]),
    ["2026-11-01", "2026-11-07", "2026-11-08"],
  );
  assert.deepEqual(
    datesForWeekdays("2028-02", "2028-02-28", "2028-02-29", [2]),
    ["2028-02-29"],
  );
  assert.deepEqual(
    datesForWeekdays("2026-11", "2026-11-10", "2026-11-01", [1]),
    [],
  );
  assert.deepEqual(
    datesForWeekdays("2026-11", "2026-10-01", "2026-11-01", [1]),
    [],
  );
  assert.deepEqual(
    datesForWeekdays("2026-11", "2026-11-01", "2026-11-30", []),
    [],
  );
});

test("일괄 적용은 통신하지 않고 실행 취소 한 번으로 복원하며 저장은 한 번만 요청한다", async () => {
  const data = sample();
  let writes = 0;
  const store = createPlannerStore({
    load: async () => ({ ok: true, value: { data, revision: 0 } }),
    save: async () => {
      writes++;

      return { ok: true, value: 1 };
    },
  });
  await store.getState().loadSchedule(new Date(2026, 10, 17));
  store.getState().openBatchAssignment();
  assert.equal(
    store
      .getState()
      .saveBatchAssignment(request({ dates: ["2026-11-15", "2026-11-20"] })),
    null,
  );
  assert.equal(writes, 0);
  assert.equal(store.getState().batchAssignment, null);
  assert.equal(hasUnsavedChanges(store.getState()), true);
  store.getState().undoLastChange();
  assert.deepEqual(store.getState().data, data);
  store.getState().openBatchAssignment();
  store
    .getState()
    .saveBatchAssignment(request({ dates: ["2026-11-15", "2026-11-20"] }));
  assert.equal(await store.getState().saveSchedule(), true);
  assert.equal(writes, 1);
});

test("적용 직전 변경된 기존 일정도 보존하고 날짜별 추가에서 다른 날짜 요청은 거부한다", () => {
  const data = sample();
  const store = createPlannerStore();
  store.setState({
    data,
    storageStatus: "saved",
    view: { month: "2026-11", today: "2026-11-17", selected: "" },
  });
  store.getState().openBatchAssignment("2026-11-17");
  assert.match(store.getState().saveBatchAssignment(request())!, /다시/);
  const dates = ["2026-11-17"];
  const changed = {
    ...data,
    entries: { [`2026-11-17:${first.id}`]: { category: "leave" as const } },
  };
  store.setState({ data: changed });
  assert.equal(store.getState().saveBatchAssignment(request({ dates })), null);
  assert.equal(
    store.getState().data.entries[`2026-11-17:${first.id}`].category,
    "leave",
  );
  assert.equal(
    store.getState().data.entries[`2026-11-17:${second.id}`].category,
    "work",
  );
});
