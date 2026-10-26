import test from "node:test";
import assert from "node:assert/strict";
import { createPlannerStore } from "../stores/planner-store";
import {
  connectPlannerStorage,
  STORAGE_KEY,
  type PlannerStorage,
} from "../stores/planner-storage";
import { counts, getAssignment, initial } from "../lib/schedule";
import { createExampleSchedule } from "../lib/schedule-commands";
import { editorFormReducer } from "../lib/editor";

const NOW = new Date(2026, 9, 26);
const makeStorage = (raw: string | null = null) => {
  const writes: string[] = [];
  let stored = raw;
  const storage: PlannerStorage = {
    getItem: (key) => {
      assert.equal(key, STORAGE_KEY);
      return stored;
    },
    setItem: (key, value) => {
      assert.equal(key, STORAGE_KEY);
      writes.push(value);
      stored = value;
    },
  };
  return { storage, writes, read: () => stored };
};

test("별도 화면의 Zustand 인스턴스끼리 직원과 월 상태를 공유하지 않는다", () => {
  const first = createPlannerStore();
  const second = createPlannerStore();
  const memory = makeStorage();
  const stop = connectPlannerStorage(first, () => memory.storage, NOW);
  first
    .getState()
    .saveEditor({ kind: "employee", name: "김지우", color: "#5686D6" });
  assert.equal(first.getState().data.employees.length, 1);
  assert.equal(second.getState().data.employees.length, 0);
  assert.equal(second.getState().view.month, "");
  assert.equal(initial.employees.length, 0);
  stop();
});

test("기존 localStorage 형식을 읽고 UI 조작 없이 데이터 변경당 한 번만 저장한다", () => {
  const saved = { ...structuredClone(initial), targets: { "2026-10": 9 } };
  const memory = makeStorage(JSON.stringify(saved));
  const store = createPlannerStore();
  const stop = connectPlannerStorage(store, () => memory.storage, NOW);
  assert.deepEqual(store.getState().data, saved);
  assert.equal(memory.writes.length, 0);
  store.getState().openEditor({ kind: "employee", name: "", color: "#5686D6" });
  store.getState().selectEmployee("any");
  store.getState().notify("UI 알림");
  store.getState().closeEditor();
  store.getState().navigateMonth(1);
  assert.equal(memory.writes.length, 0);
  store.getState().setOffTarget(7);
  assert.equal(memory.writes.length, 1);
  const parsed = JSON.parse(memory.writes[0]);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.targets["2026-11"], 7);
  assert.equal("view" in parsed, false);
  assert.equal("editor" in parsed, false);
  assert.equal("state" in parsed, false);
  stop();
});

test("Strict Mode의 연결·해제를 반복해도 과거 값으로 복원하거나 중복 저장하지 않는다", () => {
  const memory = makeStorage();
  const store = createPlannerStore();
  const disconnect = connectPlannerStorage(store, () => memory.storage, NOW);
  store.getState().navigateMonth(1);
  disconnect();
  const stop = connectPlannerStorage(
    store,
    () => memory.storage,
    new Date(2026, 11, 1),
  );
  assert.equal(store.getState().view.month, "2026-11");
  store.getState().setOffTarget(10);
  assert.equal(memory.writes.length, 1);
  stop();
  store.getState().setOffTarget(11);
  assert.equal(memory.writes.length, 1);
});

test("손상된 원본을 덮어쓰지 않으며 저장소 접근 오류도 처리한다", () => {
  for (const raw of ["{broken", "null", '{"version":2}']) {
    const memory = makeStorage(raw);
    const store = createPlannerStore();
    const stop = connectPlannerStorage(store, () => memory.storage, NOW);
    assert.equal(store.getState().storageStatus, "blocked");
    store.getState().setOffTarget(6);
    assert.equal(memory.read(), raw);
    assert.equal(memory.writes.length, 0);
    stop();
  }
  const store = createPlannerStore();
  const stop = connectPlannerStorage(
    store,
    () => {
      throw new Error("denied");
    },
    NOW,
  );
  assert.equal(store.getState().storageStatus, "blocked");
  assert.equal(store.getState().view.month, "2026-10");
  stop();
});

test("저장 공간 오류를 표시하고 다음 변경 시 저장을 재시도한다", () => {
  const store = createPlannerStore();
  let fail = true;
  let saved = "";
  const stop = connectPlannerStorage(
    store,
    () => ({
      getItem: () => null,
      setItem: (_key, value) => {
        if (fail) throw new Error("quota");
        saved = value;
      },
    }),
    NOW,
  );
  store.getState().setOffTarget(9);
  assert.equal(store.getState().storageStatus, "failed");
  fail = false;
  store.getState().setOffTarget(10);
  assert.equal(store.getState().storageStatus, "saved");
  assert.equal(JSON.parse(saved).targets["2026-10"], 10);
  stop();
});

test("저장 검증 실패 시 편집을 유지하고 성공·실행 취소는 저장 데이터에 반영된다", () => {
  const memory = makeStorage();
  const store = createPlannerStore();
  const stop = connectPlannerStorage(store, () => memory.storage, NOW);
  const draft = { kind: "employee", name: " ", color: "#5686D6" } as const;
  store.getState().openEditor(draft);
  assert.ok(store.getState().saveEditor(draft));
  assert.equal(store.getState().editor, draft);
  assert.equal(memory.writes.length, 0);
  assert.equal(store.getState().saveEditor({ ...draft, name: "김지우" }), null);
  assert.equal(store.getState().editor, null);
  assert.equal(store.getState().data.employees.length, 1);
  assert.equal(memory.writes.length, 1);
  store.getState().undoLastChange();
  assert.equal(store.getState().data.employees.length, 0);
  assert.equal(JSON.parse(memory.read()!).employees.length, 0);
  assert.equal(store.getState().toast?.undo, undefined);
  stop();
});

test("스토어를 통한 타입 수정·삭제 후에도 기존 배정 스냅샷을 다시 저장할 수 있다", () => {
  const store = createPlannerStore();
  const memory = makeStorage();
  const stop = connectPlannerStorage(store, () => memory.storage, NOW);
  store
    .getState()
    .saveEditor({ kind: "employee", name: "김지우", color: "#5686D6" });
  const employee = store.getState().data.employees[0].id;
  store
    .getState()
    .saveEditor({
      kind: "assignment",
      date: "2026-10-01",
      employee,
      category: "work",
      typeId: "open",
    });
  const original = structuredClone(
    getAssignment(store.getState().data, "2026-10-01", employee),
  );
  const type = store.getState().data.types[0];
  store
    .getState()
    .saveEditor({ kind: "type", ...type, start: "07:00", color: "#000000" });
  store.getState().removeEditor({ kind: "type", ...type });
  assert.equal(
    store
      .getState()
      .saveEditor({
        kind: "assignment",
        date: "2026-10-01",
        employee,
        category: "work",
        typeId: "__existing",
      }),
    null,
  );
  assert.deepEqual(
    getAssignment(store.getState().data, "2026-10-01", employee),
    original,
  );
  store
    .getState()
    .removeEditor({
      kind: "assignment",
      date: "2026-10-01",
      employee,
      category: "work",
      typeId: "__existing",
    });
  assert.equal(
    getAssignment(store.getState().data, "2026-10-01", employee).category,
    "off",
  );
  stop();
});

test("휴무 기준은 해당 월 일수 내에서만 허용하고 예시에서도 정확히 적용한다", () => {
  const store = createPlannerStore();
  const memory = makeStorage();
  const stop = connectPlannerStorage(
    store,
    () => memory.storage,
    new Date(2026, 1, 1),
  );
  for (const target of [NaN, -1, 29, 8.5])
    store.getState().setOffTarget(target);
  assert.equal(memory.writes.length, 0);
  for (const target of [0, 8, 20, 28]) {
    const sample = createExampleSchedule(
      { ...structuredClone(initial), targets: { "2026-02": target } },
      "2026-02",
    );
    sample.employees.forEach((employee) =>
      assert.equal(counts(sample, "2026-02", employee.id).off, target),
    );
  }
  stop();
});

test("폼 입력은 오류와 함께 하나의 reducer로 관리하고 변경 시 오래된 오류를 해제한다", () => {
  const draft = { kind: "employee", name: "", color: "#5686D6" } as const;
  const invalid = editorFormReducer(
    { draft, error: "" },
    { type: "error", message: "이름 필요" },
  );
  const next = editorFormReducer(invalid, {
    type: "change",
    draft: { ...draft, name: "김지우" },
  });
  assert.equal(next.error, "");
  assert.equal(next.draft.kind === "employee" && next.draft.name, "김지우");
  assert.equal(invalid.error, "이름 필요");
});
