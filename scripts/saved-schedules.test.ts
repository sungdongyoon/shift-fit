import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SHIFT_TYPES, getAssignment, initial, readSaved } from "../lib/schedule";
import { createSavedMonth } from "../lib/saved-schedules";
import { buildSchedulePdfData } from "../lib/schedule-pdf-data";
import { createPlannerStore, displayedSchedule } from "../stores/planner-store";
import { connectPlannerStorage } from "../stores/planner-storage";

const employee = { id: "staff", name: "김지우", color: "#5686D6", from: "2026-11" };
const base = () => ({
  ...structuredClone(initial),
  employees: [{ ...employee }],
  typesByMonth: { "2026-11": structuredClone(DEFAULT_SHIFT_TYPES) },
  entries: {
    "2026-11-04:staff": { category: "work" as const, shift: structuredClone(DEFAULT_SHIFT_TYPES[2]) },
    "2026-11-05:staff": { category: "other" as const, memo: "교육" },
  },
  targets: { "2026-11": 8 },
});

const setup = () => {
  let raw = JSON.stringify(base());
  let fail = false;
  let writes = 0;
  const store = createPlannerStore();
  const disconnect = connectPlannerStorage(store, () => ({
    getItem: () => raw,
    setItem: (_, value) => {
      if (fail) throw new Error("quota");
      raw = value;
      writes++;
    },
  }), new Date(2026, 10, 8));

  return { store, disconnect, read: () => raw, writes: () => writes, fail: () => { fail = true; } };
};

test("저장본은 월 전체 일정·이름·타입·휴무 기준·공휴일을 독립적으로 보관한다", () => {
  const data = base();
  const holidays = { "2026-11-01": "예시 공휴일", "2026-12-01": "다른 월" };
  const record = createSavedMonth(data, "2026-11", holidays, () => "saved-1", new Date("2026-11-08T03:00:00Z"));
  data.employees[0].name = "변경";
  data.typesByMonth["2026-11"][2].end = "22:00";
  data.targets["2026-11"] = 9;
  holidays["2026-11-01"] = "변경";

  assert.equal(record.version, 1);
  assert.equal(record.data.employees[0].name, "김지우");
  assert.equal(record.data.typesByMonth["2026-11"][2].end, "23:00");
  assert.equal(record.data.targets["2026-11"], 8);
  assert.equal(Object.keys(record.data.entries).length, 30);
  assert.equal(getAssignment(record.data, "2026-11-06", employee.id).category, "unassigned");
  assert.deepEqual(record.holidays, { "2026-11-01": "예시 공휴일" });
  assert.equal("savedMonths" in record.data, false);
});

test("직원 삭제와 타입 변경 후에도 저장본 조회·PDF는 당시 정보를 사용한다", () => {
  const { store, disconnect } = setup();
  store.getState().saveMonth({ "2026-11-01": "예시 공휴일" });
  const record = store.getState().data.savedMonths![0];
  store.getState().saveEditor({ kind: "type", ...DEFAULT_SHIFT_TYPES[2], end: "22:00" });
  store.getState().navigateMonth(1);
  store.getState().removeEditor({ kind: "employee", ...employee });
  assert.equal(store.getState().data.employees.length, 0);
  store.getState().showSavedMonth(record.id);
  const shown = displayedSchedule(store.getState());
  assert.equal(store.getState().view.month, "2026-11");
  assert.equal(shown.employees[0].name, "김지우");
  assert.equal(getAssignment(shown, "2026-11-04", employee.id).shift?.end, "23:00");
  const pdf = buildSchedulePdfData(shown, record.month, record.holidays);
  assert.equal(pdf.employees[0].name, "김지우");
  assert.equal(pdf.employees[0].counts.work, 1);
  assert.equal(pdf.employees[0].counts.other, 1);
  assert.equal(pdf.calendars[0].weeks.flat().find((day) => day.date === "2026-11-01")?.holiday, "예시 공휴일");
  store.getState().showWorkingMonth();
  assert.equal(displayedSchedule(store.getState()).employees.length, 0);
  disconnect();
});

test("같은 월은 새 버전을 추가하고 다른 월은 v1부터 시작하며 새로고침 후 보존된다", () => {
  const { store, read, disconnect } = setup();
  store.getState().saveMonth({});
  store.getState().setOffTarget(9);
  store.getState().saveMonth({});
  store.getState().navigateMonth(1);
  store.getState().saveMonth({});
  const data = readSaved(read());
  assert.deepEqual(data.savedMonths!.map((record) => [record.month, record.version]), [
    ["2026-11", 1], ["2026-11", 2], ["2026-12", 1],
  ]);
  assert.equal(data.savedMonths![0].data.targets["2026-11"], 8);
  assert.equal(data.savedMonths![1].data.targets["2026-11"], 9);
  assert.equal(new Set(data.savedMonths!.map((record) => record.id)).size, 3);
  disconnect();
});

test("저장본 조회는 자동 저장을 유발하지 않고 모든 데이터 변경 명령을 차단한다", () => {
  const { store, writes, disconnect } = setup();
  store.getState().saveMonth({});
  const data = store.getState().data;
  const beforeWrites = writes();
  store.getState().showSavedMonth(data.savedMonths![0].id);
  store.getState().openEditor({ kind: "employee", name: "추가", color: "#5686D6" });
  store.getState().addAssignment("2026-11-01");
  store.getState().editAssignment("2026-11-04", employee.id);
  store.getState().setOffTarget(10);
  store.getState().copyPreviousMonthTypes();
  store.getState().loadExample();
  store.getState().removeEditor({ kind: "employee", ...employee });
  store.getState().undoLastChange();
  store.getState().saveMonth({});
  assert.ok(store.getState().saveEditor({ kind: "employee", ...employee, name: "변경" }));
  assert.equal(store.getState().data, data);
  assert.equal(store.getState().editor, null);
  assert.equal(writes(), beforeWrites);
  store.getState().navigateMonth(1);
  assert.equal(store.getState().selectedSavedMonth, null);
  assert.equal(writes(), beforeWrites);
  disconnect();
});

test("저장 공간 부족 시 새 기록을 성공으로 남기지 않고 작업본을 보존한다", () => {
  const { store, fail, disconnect } = setup();
  const before = store.getState().data;
  fail();
  store.getState().saveMonth({});
  assert.equal(store.getState().data, before);
  assert.equal(store.getState().data.savedMonths, undefined);
  assert.equal(store.getState().storageStatus, "failed");
  assert.match(store.getState().toast!.message, /보관하지 못/);
  disconnect();
});

test("이후 변경 실행 취소는 저장 기록을 지우지 않고 손상 기록은 복원을 거부한다", () => {
  const { store, read, disconnect } = setup();
  store.getState().saveMonth({});
  const record = store.getState().data.savedMonths![0];
  store.getState().removeEditor({ kind: "employee", ...employee });
  store.getState().undoLastChange();
  assert.equal(store.getState().data.employees.length, 1);
  assert.deepEqual(store.getState().data.savedMonths, [record]);
  const data = readSaved(read());
  assert.throws(() => readSaved(JSON.stringify({ ...data, savedMonths: [record, record] })));
  assert.throws(() => readSaved(JSON.stringify({ ...data, savedMonths: [{ ...record, data: { ...record.data, savedMonths: [] } }] })));
  assert.throws(() => readSaved(JSON.stringify({ ...data, savedMonths: [{ ...record, data: { ...record.data, employees: [null] } }] })));
  disconnect();
});


test("저장 기록 삭제는 작업본·다른 저장본을 보존하고 조회 중인 기록만 닫는다", () => {
  const { store, read, disconnect } = setup();
  store.getState().saveMonth({});
  store.getState().saveMonth({});
  const [first, second] = store.getState().data.savedMonths!;
  const working = store.getState().data;
  store.getState().showSavedMonth(first.id);
  store.getState().deleteSavedMonth(second.id);
  assert.equal(store.getState().selectedSavedMonth?.id, first.id);
  assert.deepEqual(readSaved(read()).savedMonths, [first]);
  store.getState().deleteSavedMonth(first.id);
  assert.equal(store.getState().selectedSavedMonth, null);
  assert.equal(store.getState().view.month, first.month);
  assert.equal(displayedSchedule(store.getState()).employees, working.employees);
  assert.equal(store.getState().data.entries, working.entries);
  assert.deepEqual(readSaved(read()).savedMonths, []);
  store.getState().setOffTarget(9);
  store.getState().undoLastChange();
  assert.deepEqual(store.getState().data.savedMonths, []);
  disconnect();
});

test("저장 기록 삭제 실패 시 목록과 읽기 전용 조회 상태를 유지한다", () => {
  const { store, fail, read, disconnect } = setup();
  store.getState().saveMonth({});
  const record = store.getState().data.savedMonths![0];
  store.getState().showSavedMonth(record.id);
  const before = store.getState().data;
  fail();
  store.getState().deleteSavedMonth(record.id);
  assert.equal(store.getState().data, before);
  assert.equal(store.getState().selectedSavedMonth?.id, record.id);
  assert.deepEqual(readSaved(read()).savedMonths, [record]);
  assert.match(store.getState().toast!.message, /삭제하지 못/);
  disconnect();
});

test("없는 기록과 복원 차단 상태에서는 삭제하지 않는다", () => {
  const { store, writes, disconnect } = setup();
  store.getState().saveMonth({});
  const data = store.getState().data;
  const beforeWrites = writes();
  store.getState().deleteSavedMonth("missing");
  store.setState({ storageStatus: "blocked" });
  store.getState().deleteSavedMonth(data.savedMonths![0].id);
  assert.equal(store.getState().data, data);
  assert.equal(writes(), beforeWrites);
  disconnect();
});
