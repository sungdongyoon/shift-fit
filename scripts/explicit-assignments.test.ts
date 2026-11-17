import test from "node:test";
import assert from "node:assert/strict";
import { initial, counts, type Schedule } from "../lib/schedule";
import { createPlannerStore } from "../stores/planner-store";
import { buildPlannerChanges, toPlannerPayload, fromPlannerRows } from "../lib/planner-data";
import { saveScheduleEditor } from "../lib/schedule-commands";
import { buildSchedulePdfData } from "../lib/schedule-pdf-data";

const first = { id: "d3678de7-52fe-4d81-b9ec-0ba25a096eac", name: "직원 1", color: "#5686D6", from: "2026-11", startDate: "2026-11-01" };
const second = { ...first, id: "a3678de7-52fe-4d81-b9ec-0ba25a096eac", name: "직원 2" };
const sample = (): Schedule => ({ ...structuredClone(initial), employees: [first, second] });

const setup = () => {
  const store = createPlannerStore();
  store.setState({ data: sample(), storageStatus: "saved", view: { month: "2026-11", today: "2026-11-17", selected: "" } });

  return store;
};

test("추가는 재직 중이며 해당 날짜에 배정 없는 직원을 선택하고 모두 배정되면 차단한다", () => {
  const store = setup();
  store.getState().addAssignment("2026-11-17");
  assert.equal(store.getState().batchAssignment?.date, "2026-11-17");
  assert.equal(store.getState().saveBatchAssignment({
    month: "2026-11", dates: ["2026-11-17"], employeeIds: [first.id, second.id], category: "off", typeId: "",
  }), null);
  store.getState().addAssignment("2026-11-17");
  assert.equal(store.getState().batchAssignment, null);
  assert.match(store.getState().toast!.message, /추가할 수 있는 근무자/);
});

test("새 배정 폼의 오래된 선택은 기존 일정을 덮어쓰지 않으며 빈 날짜 편집도 차단한다", () => {
  const store = setup();
  store.getState().editAssignment("2026-11-17", first.id);
  assert.equal(store.getState().editor, null);
  const data = sample();
  data.entries[`2026-11-17:${first.id}`] = { category: "off" };
  const result = saveScheduleEditor(data, "2026-11", {
    kind: "assignment", employee: first.id, date: "2026-11-17", category: "leave", typeId: "", original: false,
  });
  assert.equal(result.ok, false);
  assert.equal(data.entries[`2026-11-17:${first.id}`].category, "off");
});

test("배정 삭제는 실행 취소 가능하며 수동 저장에 명시적인 삭제로 전달된다", () => {
  const store = setup();
  const data = sample();
  data.entries[`2026-11-17:${first.id}`] = { category: "off" };
  store.setState({ data });
  store.getState().editAssignment("2026-11-17", first.id);
  const editor = store.getState().editor!;
  store.getState().removeEditor(editor);
  const changes = buildPlannerChanges(store.getState().data, data);
  assert.equal(changes.deleted_assignments.length, 1);
  assert.deepEqual(store.getState().data.entries, {});
  store.getState().undoLastChange();
  assert.deepEqual(store.getState().data.entries, data.entries);
  const payload = toPlannerPayload(store.getState().data);
  assert.deepEqual(fromPlannerRows({ ...payload, revision: 1 }).data.entries, data.entries);
});

test("직원이 많아도 빈 PDF는 달력 한 장이며 실제 배정만 이름표로 출력한다", () => {
  const data = sample();
  data.employees = Array.from({ length: 20 }, (_, index) => ({ ...first, id: `employee-${index}` }));
  const empty = buildSchedulePdfData(data, "2026-11", {});
  assert.equal(empty.calendars.length, 1);
  assert.ok(empty.calendars[0].weeks.flat().every((day) => day.rows.length === 0));
  data.entries["2026-11-17:employee-0"] = { category: "off" };
  const pdf = buildSchedulePdfData(data, "2026-11", {});
  assert.equal(pdf.calendars.length, 1);
  assert.equal(pdf.calendars[0].weeks.flat().reduce((sum, day) => sum + day.rows.length, 0), 1);
  assert.deepEqual(counts(data, "2026-11", "employee-0"), { work: 0, off: 1, leave: 0, other: 0 });
});
