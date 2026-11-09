import test from "node:test";
import assert from "node:assert/strict";
import { createPlannerStore, hasUnsavedChanges } from "../stores/planner-store";
import {
  initial,
  getAssignment,
  DEFAULT_SHIFT_TYPES,
  counts,
  type Schedule,
} from "../lib/schedule";
import { toPlannerPayload, type PlannerPersistence } from "../lib/planner-data";

const NOW = new Date(2026, 10, 9);

const setup = (data: Schedule = structuredClone(initial)) => {
  let remote = structuredClone(data);
  let revision = 0;
  let fail = false;
  let conflict = false;
  let loads = 0;
  const writes: Schedule[] = [];
  const persistence: PlannerPersistence = {
    load: async () => {
      loads++;

      return { ok: true, value: { data: structuredClone(remote), revision } };
    },
    save: async (next, expected) => {
      writes.push(next);
      if (fail || conflict) return { ok: false, error: "저장 실패", conflict };
      assert.equal(expected, revision);
      remote = structuredClone(next);
      revision++;

      return { ok: true, value: revision };
    },
  };
  const store = createPlannerStore(persistence);

  return {
    store,
    writes,
    loads: () => loads,
    read: () => remote,
    fail: (value: boolean) => {
      fail = value;
    },
    conflict: (value: boolean) => {
      conflict = value;
    },
  };
};

const addEmployee = (store: ReturnType<typeof createPlannerStore>) => {
  assert.equal(
    store
      .getState()
      .saveEditor({ kind: "employee", name: "김지우", color: "#5686D6" }),
    null,
  );

  return store.getState().data.employees[0];
};

test("초기 조회는 쓰지 않으며 중복 로딩을 합치고 각 스토어를 분리한다", async () => {
  const first = setup();
  const second = setup();
  await Promise.all([
    first.store.getState().loadSchedule(NOW),
    first.store.getState().loadSchedule(NOW),
  ]);
  assert.equal(first.loads(), 1);
  assert.equal(first.writes.length, 0);
  addEmployee(first.store);
  assert.equal(second.store.getState().data.employees.length, 0);
  assert.equal(initial.employees.length, 0);
  assert.equal(first.store.getState().view.month, "2026-11");
});

test("편집은 자동 저장하지 않고 저장 버튼 호출 때만 변경 전체를 보낸다", async () => {
  const { store, writes, read } = setup();
  await store.getState().loadSchedule(NOW);
  const employee = addEmployee(store);
  store.getState().setOffTarget(9);
  store
    .getState()
    .saveEditor({
      kind: "assignment",
      date: "2026-11-04",
      employee: employee.id,
      category: "other",
      typeId: "",
      memo: "교육",
    });
  assert.equal(writes.length, 0);
  assert.equal(hasUnsavedChanges(store.getState()), true);
  assert.equal(await store.getState().saveSchedule(), true);
  assert.equal(writes.length, 1);
  assert.equal(store.getState().revision, 1);
  assert.equal(read().targets["2026-11"], 9);
  assert.equal(getAssignment(read(), "2026-11-04", employee.id).memo, "교육");
  assert.equal(hasUnsavedChanges(store.getState()), false);
  assert.equal(await store.getState().saveSchedule(), false);
  assert.equal(writes.length, 1);
});

test("저장 실패와 재시도는 작성 내용과 마지막 저장본을 보존한다", async () => {
  const { store, writes, fail } = setup();
  await store.getState().loadSchedule(NOW);
  const baseline = store.getState().baseline;
  addEmployee(store);
  const draft = store.getState().data;
  fail(true);
  assert.equal(await store.getState().saveSchedule(), false);
  assert.equal(store.getState().data, draft);
  assert.equal(store.getState().baseline, baseline);
  assert.equal(store.getState().revision, 0);
  assert.equal(store.getState().storageStatus, "failed");
  fail(false);
  assert.equal(await store.getState().saveSchedule(), true);
  assert.equal(writes.length, 2);
  assert.equal(hasUnsavedChanges(store.getState()), false);
});

test("저장 중 새 편집은 지워지지 않으며 중복 저장과 이동은 막는다", async () => {
  let finish!: (value: { ok: true; value: number }) => void;
  let calls = 0;
  const store = createPlannerStore({
    load: async () => ({
      ok: true,
      value: { data: structuredClone(initial), revision: 0 },
    }),
    save: async () => {
      calls++;

      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  await store.getState().loadSchedule(NOW);
  addEmployee(store);
  const submitted = store.getState().data;
  const pending = store.getState().saveSchedule();
  store.getState().setOffTarget(9);
  assert.equal(await store.getState().saveSchedule(), false);
  store.getState().navigateMonth(1);
  assert.equal(store.getState().view.month, "2026-11");
  finish({ ok: true, value: 1 });
  assert.equal(await pending, true);
  assert.equal(calls, 1);
  assert.equal(store.getState().baseline, submitted);
  assert.equal(store.getState().data.targets["2026-11"], 9);
  assert.equal(hasUnsavedChanges(store.getState()), true);
  assert.ok(store.getState().toast?.undo);
  store.getState().undoLastChange();
  assert.equal(hasUnsavedChanges(store.getState()), false);
});

test("미저장 월 이동은 계속 작성·저장 후 이동을 구분하고 실패 시 이동하지 않는다", async () => {
  const { store, fail } = setup();
  await store.getState().loadSchedule(NOW);
  addEmployee(store);
  store.getState().navigateMonth(1);
  assert.ok(store.getState().pendingNavigation);
  assert.equal(store.getState().view.month, "2026-11");
  await store.getState().resolveNavigation("cancel");
  assert.equal(store.getState().pendingNavigation, null);
  assert.equal(store.getState().data.employees.length, 1);
  store.getState().navigateMonth(1);
  fail(true);
  await store.getState().resolveNavigation("save");
  assert.equal(store.getState().view.month, "2026-11");
  assert.ok(store.getState().pendingNavigation);
  fail(false);
  await store.getState().resolveNavigation("save");
  assert.equal(store.getState().view.month, "2026-12");
  assert.equal(store.getState().pendingNavigation, null);
  assert.equal(hasUnsavedChanges(store.getState()), false);
});

test("저장하지 않고 이동하면 전역 직원과 월별 수정 모두 마지막 저장본으로 돌아간다", async () => {
  const { store, writes } = setup();
  await store.getState().loadSchedule(NOW);
  addEmployee(store);
  store.getState().setOffTarget(10);
  store.getState().navigateMonth(1);
  await store.getState().resolveNavigation("discard");
  assert.equal(store.getState().view.month, "2026-12");
  assert.equal(store.getState().data.employees.length, 0);
  assert.deepEqual(store.getState().data.targets, {});
  assert.equal(writes.length, 0);
});

test("충돌 시 덮어쓰지 않으며 명시적 변경 취소 후에만 최신 내용을 불러온다", async () => {
  const { store, writes, loads, conflict } = setup();
  await store.getState().loadSchedule(NOW);
  addEmployee(store);
  conflict(true);
  assert.equal(await store.getState().saveSchedule(), false);
  assert.equal(store.getState().conflict, true);
  assert.equal(await store.getState().saveSchedule(), false);
  assert.equal(writes.length, 1);
  await store.getState().loadSchedule(NOW);
  assert.equal(loads(), 1);
  store
    .getState()
    .requestLeave(
      "다시 불러오기",
      () => void store.getState().loadSchedule(NOW),
    );
  await store.getState().resolveNavigation("discard");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(loads(), 2);
  assert.equal(store.getState().data.employees.length, 0);
  assert.equal(store.getState().conflict, false);
});

test("불러오기 실패 상태는 편집을 차단하고 재시도로 회복한다", async () => {
  let fail = true;
  const store = createPlannerStore({
    load: async () =>
      fail
        ? { ok: false, error: "연결 실패" }
        : { ok: true, value: { data: structuredClone(initial), revision: 0 } },
    save: async () => ({ ok: false, error: "호출되면 안 됨" }),
  });
  await store.getState().loadSchedule(NOW);
  assert.equal(store.getState().storageStatus, "blocked");
  assert.ok(
    store
      .getState()
      .saveEditor({ kind: "employee", name: "차단", color: "#5686D6" }),
  );
  store.getState().loadExample();
  store.getState().setOffTarget(10);
  assert.equal(store.getState().data.employees.length, 0);
  assert.deepEqual(store.getState().data.targets, {});
  fail = false;
  await store.getState().loadSchedule(NOW);
  assert.equal(store.getState().storageStatus, "saved");
});

test("실행 취소는 미저장 상태와 선택 강조를 되돌리며 저장을 발생시키지 않는다", async () => {
  const { store, writes } = setup();
  await store.getState().loadSchedule(NOW);
  const employee = addEmployee(store);
  store.getState().selectEmployee(employee.id);
  store.getState().undoLastChange();
  assert.equal(store.getState().data.employees.length, 0);
  assert.equal(store.getState().view.selected, "");
  assert.equal(hasUnsavedChanges(store.getState()), false);
  assert.equal(writes.length, 0);
});

test("타입 삭제는 마지막 배정을 보존하고 직원 삭제는 연결된 일정을 제거한다", async () => {
  const data = structuredClone(initial);
  data.typesByMonth["2026-11"] = structuredClone(DEFAULT_SHIFT_TYPES);
  const { store } = setup(data);
  await store.getState().loadSchedule(NOW);
  const employee = addEmployee(store);
  store
    .getState()
    .saveEditor({
      kind: "assignment",
      date: "2026-11-04",
      employee: employee.id,
      category: "work",
      typeId: "close",
    });
  store
    .getState()
    .saveEditor({ kind: "type", ...DEFAULT_SHIFT_TYPES[2], end: "22:00" });
  store.getState().removeEditor({ kind: "type", ...DEFAULT_SHIFT_TYPES[2] });
  assert.equal(
    getAssignment(store.getState().data, "2026-11-04", employee.id).shift?.end,
    "22:00",
  );
  store.getState().removeEditor({ kind: "employee", ...employee });
  assert.deepEqual(store.getState().data.entries, {});
  store.getState().undoLastChange();
  assert.equal(store.getState().data.employees.length, 1);
});

test("미배정과 기타 메모는 분리되고 예시 데이터는 UUID로 DB 저장 가능하다", async () => {
  const { store, writes } = setup();
  await store.getState().loadSchedule(new Date(2026, 1, 1));
  store.getState().setOffTarget(8);
  store.getState().loadExample();
  const data = store.getState().data;
  data.employees.forEach((employee) =>
    assert.equal(counts(data, "2026-02", employee.id).off, 8),
  );
  assert.equal(toPlannerPayload(data).employees.length, 4);
  assert.equal(writes.length, 0);
});

test("로그아웃 같은 외부 이동도 저장·취소 선택이 끝난 뒤에만 실행한다", async () => {
  const { store } = setup();
  await store.getState().loadSchedule(NOW);
  addEmployee(store);
  let left = false;
  store.getState().requestLeave("로그아웃", () => {
    left = true;
  });
  await store.getState().resolveNavigation("cancel");
  assert.equal(left, false);
  store.getState().requestLeave("로그아웃", () => {
    left = true;
  });
  await store.getState().resolveNavigation("save");
  assert.equal(left, true);
});
