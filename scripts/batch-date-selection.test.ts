import test from "node:test";
import assert from "node:assert/strict";
import {
  availableBatchDates,
  batchDateDisabledNotices,
  constrainBatchDateSelection,
  selectedBatchDates,
  type BatchDateSelection,
} from "../lib/batch-date-selection";
import { createPlannerStore } from "../stores/planner-store";
import { initial } from "../lib/schedule";
import { pdfTextWidth, truncatePdfText } from "../lib/pdf-text";

const first = {
  id: "first",
  name: "직원 1",
  color: "#5686D6",
  from: "2026-11",
  startDate: "2026-11-15",
  endDate: "2026-11-20",
};
const second = {
  ...first,
  id: "second",
  name: "직원 2",
  startDate: "2026-11-22",
  endDate: undefined,
};
const selection: BatchDateSelection = {
  mode: "dates",
  dates: ["2026-11-01", "2026-11-15", "2026-11-21", "2026-11-30"],
  start: "2026-11-01",
  end: "2026-11-30",
  weekdays: [0, 6],
};

test("직원을 선택하기 전에는 날짜가 없고 입사·퇴사 당일은 선택 가능하다", () => {
  assert.deepEqual(availableBatchDates([first], "2026-11", []), []);
  const dates = availableBatchDates([first], "2026-11", [first.id]);
  assert.equal(dates[0], "2026-11-15");
  assert.equal(dates.at(-1), "2026-11-20");
  assert.equal(dates.length, 6);
});

test("선택한 모든 직원의 공통 재직 날짜만 활성화하고 선택 해제 시 범위를 넓힌다", () => {
  const early = { ...second, startDate: "2026-11-01" };
  const employees = [first, early];
  const together = availableBatchDates(employees, "2026-11", [
    first.id,
    early.id,
  ]);
  assert.equal(together.includes("2026-11-01"), false);
  assert.equal(together.includes("2026-11-14"), false);
  assert.equal(together[0], "2026-11-15");
  assert.equal(together.at(-1), "2026-11-20");
  const earlyOnly = availableBatchDates(employees, "2026-11", [early.id]);
  assert.equal(earlyOnly[0], "2026-11-01");
  assert.equal(earlyOnly.length, 30);
});

test("공통 재직 기간이 없거나 선택 직원이 사라지면 날짜를 모두 비활성화한다", () => {
  assert.deepEqual(
    availableBatchDates([first, second], "2026-11", [first.id, second.id]),
    [],
  );
  assert.deepEqual(
    availableBatchDates([first], "2026-11", [first.id, "missing"]),
    [],
  );
});

test("직원 정보가 바뀐 오래된 폼도 적용 시 공통 재직 날짜를 재검사한다", () => {
  const early = { ...second, startDate: "2026-11-01" };
  const data = { ...initial, employees: [first, early] };
  const store = createPlannerStore();
  store.setState({
    data,
    storageStatus: "saved",
    view: { month: "2026-11", today: "2026-11-18", selected: "" },
  });
  store.getState().openBatchAssignment();
  const request = {
    month: "2026-11",
    employeeIds: [first.id, early.id],
    dates: ["2026-11-01"],
    category: "off" as const,
    typeId: "",
  };
  assert.match(store.getState().saveBatchAssignment(request)!, /모두가 재직/);
  assert.deepEqual(store.getState().data.entries, {});
  assert.equal(
    store.getState().saveBatchAssignment({ ...request, dates: ["2026-11-15"] }),
    null,
  );
  assert.equal(Object.keys(store.getState().data.entries).length, 2);
});

test("근무자 변경은 부적합한 직접 선택을 해제하고 기간 입력도 유효한 범위로 제한한다", () => {
  const dates = availableBatchDates([first], "2026-11", [first.id]);
  const constrained = constrainBatchDateSelection(selection, dates, "2026-11");
  assert.deepEqual(constrained.dates, ["2026-11-15"]);
  assert.equal(constrained.start, "2026-11-15");
  assert.equal(constrained.end, "2026-11-20");
  assert.equal(selection.dates.length, 4);
});

test("기간·요일 방식에서도 재직 가능한 날짜만 실제 배정 대상으로 선택한다", () => {
  const early = { ...second, startDate: "2026-11-01" };
  const available = availableBatchDates([first, early], "2026-11", [
    first.id,
    early.id,
  ]);
  const constrained = constrainBatchDateSelection(
    { ...selection, mode: "weekdays" },
    available,
    "2026-11",
  );
  assert.deepEqual(selectedBatchDates("2026-11", constrained, available), [
    "2026-11-15",
  ]);
});

test("세로 PDF의 이름 폭은 숫자 접미사를 보존하고 긴 한글은 칸 안에서 말줄임한다", () => {
  assert.equal(truncatePdfText("근무자 10", 35, 6.5), "근무자 10");
  const name = truncatePdfText("이름이아주긴근무자", 35, 6.5);
  assert.equal(name.endsWith("…"), true);
  assert.ok(pdfTextWidth(name, 6.5) <= 35);
});

test("비활성 날짜가 있으면 해당 직원의 입사 전·퇴사 후 안내를 표시한다", () => {
  assert.deepEqual(batchDateDisabledNotices([first], [first.id], "2026-11"), [
    "※ 직원 1의 입사일 이전 날짜는 비활성화 되었습니다.",
    "※ 직원 1의 퇴사일 이후 날짜는 비활성화 되었습니다.",
  ]);
  assert.deepEqual(
    batchDateDisabledNotices([first, second], [first.id, second.id], "2026-11"),
    [
      "※ 직원 1, 직원 2의 입사일 이전 날짜는 비활성화 되었습니다.",
      "※ 직원 1의 퇴사일 이후 날짜는 비활성화 되었습니다.",
    ],
  );
});

test("미선택·재직 기간 안의 월에는 비활성 안내를 표시하지 않는다", () => {
  assert.deepEqual(batchDateDisabledNotices([first], [], "2026-11"), []);
  const employee = { ...first, startDate: "2026-11-01", endDate: "2026-11-30" };
  assert.deepEqual(
    batchDateDisabledNotices([employee], [employee.id], "2026-11"),
    [],
  );
  assert.deepEqual(
    batchDateDisabledNotices(
      [{ ...employee, startDate: undefined }],
      [employee.id],
      "2026-11",
    ),
    [],
  );
});
