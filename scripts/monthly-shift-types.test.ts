import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SHIFT_TYPES, assign, getAssignment, initial, readSaved, type Schedule } from "../lib/schedule";
import { copyPreviousMonthTypes, previousMonthKey, removeScheduleEditor, saveScheduleEditor } from "../lib/schedule-commands";
import { createPlannerStore } from "../stores/planner-store";
import { connectPlannerStorage } from "../stores/planner-storage";

const employee = { id: "staff", name: "김지우", color: "#5686D6", from: "2026-11" };

const base = (): Schedule => ({
  ...structuredClone(initial),
  employees: [employee],
  typesByMonth: { "2026-11": structuredClone(DEFAULT_SHIFT_TYPES) },
});

test("이전 월 복사는 새 ID로 타입만 추가하며 기존 배정과 원본 월을 바꾸지 않는다", () => {
  const data = assign(base(), "2026-11-04", employee.id, { category: "work", shift: DEFAULT_SHIFT_TYPES[2] });
  data.typesByMonth["2026-11"][1].archived = true;
  const before = structuredClone(data);
  let sequence = 0;
  const result = copyPreviousMonthTypes(data, "2026-12", () => `copy-${sequence++}`);

  if (!result.ok) throw new Error(result.error);

  assert.equal(result.data.typesByMonth["2026-12"].length, 2);
  assert.equal(result.data.typesByMonth["2026-12"][1].name, "마감");
  assert.notEqual(result.data.typesByMonth["2026-12"][1].id, DEFAULT_SHIFT_TYPES[2].id);
  assert.deepEqual(result.data.entries, before.entries);
  assert.deepEqual(data, before);
  const edited = saveScheduleEditor(result.data, "2026-12", {
    kind: "type", ...result.data.typesByMonth["2026-12"][1], end: "22:00",
  });

  if (!edited.ok) throw new Error(edited.error);

  assert.equal(edited.data.typesByMonth["2026-11"][2].end, "23:00");
  assert.equal(getAssignment(edited.data, "2026-11-04", employee.id).shift?.end, "23:00");
});

test("복사는 같은 이름의 현재 월 타입을 덮어쓰지 않고 반복 실행해도 중복되지 않는다", () => {
  const data = base();
  data.typesByMonth["2026-12"] = [{ ...DEFAULT_SHIFT_TYPES[2], id: "dec-close", end: "22:00" }];
  let sequence = 0;
  const result = copyPreviousMonthTypes(data, "2026-12", () => `extra-${sequence++}`);

  if (!result.ok) throw new Error(result.error);

  assert.equal(result.data.typesByMonth["2026-12"].length, 3);
  assert.equal(result.data.typesByMonth["2026-12"][0].end, "22:00");
  assert.equal(copyPreviousMonthTypes(result.data, "2026-12").ok, false);
  assert.equal(copyPreviousMonthTypes(data, "2027-02").ok, false);
  assert.equal(previousMonthKey("2027-01"), "2026-12");
  const january = copyPreviousMonthTypes(result.data, "2027-01");
  assert.equal(january.ok, true);

  if (january.ok) assert.equal(january.data.typesByMonth["2027-01"].length, 3);
});

test("같은 ID라도 수정·삭제는 선택한 월에만 적용하고 다른 월은 유지한다", () => {
  let data = base();
  data.typesByMonth["2026-12"] = structuredClone(DEFAULT_SHIFT_TYPES);
  data = assign(data, "2026-11-04", employee.id, { category: "work", shift: DEFAULT_SHIFT_TYPES[2] });
  data = assign(data, "2026-12-04", employee.id, { category: "work", shift: DEFAULT_SHIFT_TYPES[2] });
  const result = saveScheduleEditor(data, "2026-12", {
    kind: "type", ...DEFAULT_SHIFT_TYPES[2], name: "저녁", end: "22:00", color: "#5686D6",
  });

  if (!result.ok) throw new Error(result.error);

  assert.equal(getAssignment(result.data, "2026-12-04", employee.id).shift?.end, "22:00");
  assert.deepEqual(getAssignment(result.data, "2026-11-04", employee.id).shift, DEFAULT_SHIFT_TYPES[2]);
  const removed = removeScheduleEditor(result.data, "2026-12", { kind: "type", ...DEFAULT_SHIFT_TYPES[2] });
  assert.equal(removed.data.typesByMonth["2026-12"][2].archived, true);
  assert.equal(removed.data.typesByMonth["2026-11"][2].archived, undefined);
  assert.equal(getAssignment(removed.data, "2026-12-04", employee.id).shift?.end, "22:00");
});

test("다른 월 타입을 새 배정이나 수정에 사용할 수 없다", () => {
  const data = base();
  assert.equal(saveScheduleEditor(data, "2026-12", { kind: "type", ...DEFAULT_SHIFT_TYPES[0] }).ok, false);
  assert.equal(saveScheduleEditor(data, "2026-12", {
    kind: "assignment", date: "2026-12-04", employee: employee.id, category: "work", typeId: "open",
  }).ok, false);
  assert.equal(saveScheduleEditor(data, "2026-11", {
    kind: "assignment", date: "2026-12-04", employee: employee.id, category: "work", typeId: "open",
  }).ok, false);
});

test("월 조회는 타입을 생성하지 않으며 복사는 저장되고 실행 취소로 복원된다", () => {
  let stored = JSON.stringify(base());
  let writes = 0;
  const store = createPlannerStore();
  const disconnect = connectPlannerStorage(store, () => ({
    getItem: () => stored,
    setItem: (_, value) => { stored = value; writes++; },
  }), new Date(2026, 10, 8));
  store.getState().navigateMonth(1);
  assert.equal(writes, 0);
  assert.equal(store.getState().data.typesByMonth["2026-12"], undefined);
  store.getState().copyPreviousMonthTypes();
  assert.equal(writes, 1);
  assert.equal(readSaved(stored).typesByMonth["2026-12"].length, 3);
  store.getState().copyPreviousMonthTypes();
  assert.equal(writes, 1);
  store.getState().undoLastChange();
  assert.equal(store.getState().data.typesByMonth["2026-12"], undefined);
  assert.deepEqual(readSaved(stored), base());
  disconnect();
});

test("v1·v2 전환은 기록된 월에 독립 타입을 만들고 배정 스냅샷을 보존한다", () => {
  for (const version of [1, 2]) {
    const saved = {
      version,
      employees: [employee],
      types: structuredClone(DEFAULT_SHIFT_TYPES),
      entries: { "2026-11-04:staff": { category: "work", shift: { ...DEFAULT_SHIFT_TYPES[2], end: "21:00" } } },
      targets: { "2026-12": 8 },
    };
    const restored = readSaved(JSON.stringify(saved), "2026-11");
    assert.equal(restored.version, 3);
    assert.deepEqual(restored.entries, saved.entries);
    assert.equal(restored.typesByMonth["2026-11"].length, 3);
    assert.equal(restored.typesByMonth["2026-12"].length, 3);
    assert.notEqual(restored.typesByMonth["2026-11"][0], restored.typesByMonth["2026-12"][0]);
    assert.equal(restored.typesByMonth["2027-01"], undefined);
    assert.deepEqual(readSaved(JSON.stringify(restored)), restored);
  }
});
