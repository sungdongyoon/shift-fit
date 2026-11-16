import test from "node:test";
import assert from "node:assert/strict";
import { initial, type Schedule } from "../lib/schedule";
import { removeScheduleEditor } from "../lib/schedule-commands";
import { buildPlannerChanges, fromPlannerRows, toPlannerPayload } from "../lib/planner-data";
import { buildSchedulePdfData } from "../lib/schedule-pdf-data";
import { createPlannerStore, hasUnsavedChanges } from "../stores/planner-store";

const person = {
  id: "d3678de7-52fe-4d81-b9ec-0ba25a096eac", name: "직원", color: "#5686D6",
  from: "2026-10", startDate: "2026-10-01",
};

const sample = (): Schedule => ({
  ...structuredClone(initial), employees: [{ ...person }],
  employeeOffTargets: { "2026-10": { [person.id]: 8 } },
});

test("직원 삭제 시 구버전 휴무 메타데이터도 참조 오류 없이 정리한다", () => {
  const data = sample();
  const removed = removeScheduleEditor(data, "2026-11", { kind: "employee", ...person }).data;
  const changes = buildPlannerChanges(removed, data);
  assert.deepEqual(changes.deleted_employee_targets, [{ employee_id: person.id, month: "2026-10-01" }]);
  assert.deepEqual(changes.deleted_employees, [person.id]);
  assert.equal(toPlannerPayload(removed).employee_targets.length, 0);
});

test("기존 휴무 메타데이터는 DB 왕복 시 보존하지만 PDF에는 기준을 노출하지 않는다", () => {
  const data = sample();
  data.storeName = "00매장 00점";
  data.employeeOffTargets!["2026-11"] = { [person.id]: null };
  const payload = toPlannerPayload(data);
  const restored = fromPlannerRows({ ...payload, revision: 1 });
  assert.deepEqual(toPlannerPayload(restored.data), payload);
  const pdf = buildSchedulePdfData(restored.data, "2026-11", {});
  assert.equal(pdf.title, "00매장 00점 2026.11 근무표");
  assert.equal("target" in pdf, false);
  assert.equal("target" in pdf.employees[0], false);
  const changes = buildPlannerChanges(data, sample());
  assert.equal(changes.store_name, data.storeName);
  assert.deepEqual(changes.employee_targets, [{ employee_id: person.id, month: "2026-11-01", off_target: null }]);
  assert.equal(buildPlannerChanges(data, data).store_name, undefined);
  assert.equal(buildPlannerChanges(data, data).employee_targets.length, 0);
  assert.throws(() => toPlannerPayload({ ...data, storeName: " " }));
});

test("매장명 별도 저장 실패는 일정과 기존 매장명을 변경하지 않는다", async () => {
  let savedName: string | undefined;
  const store = createPlannerStore({
    load: async () => ({ ok: true, value: { data: sample(), revision: 0 } }),
    save: async (data) => {
      savedName = data.storeName;

      return { ok: false, error: "연결 오류" };
    },
  });
  await store.getState().loadSchedule(new Date(2026, 10, 1));
  assert.equal(await store.getState().saveStoreName("새 매장"), false);
  assert.equal(savedName, "새 매장");
  assert.equal(hasUnsavedChanges(store.getState()), false);
  assert.equal(store.getState().data.storeName, undefined);
  assert.equal(store.getState().storeNameSave.error, "연결 오류");
});

test("매장명 저장은 미저장 일정을 전송하지 않고 실행 취소도 저장한 이름을 유지한다", async () => {
  const data = { ...sample(), storeName: "기존 매장" };
  const sent: ReturnType<typeof buildPlannerChanges>[] = [];
  const store = createPlannerStore({
    load: async () => ({ ok: true, value: { data, revision: 0 } }),
    save: async (next, revision, baseline) => {
      sent.push(buildPlannerChanges(next, baseline));

      return { ok: true, value: revision + 1 };
    },
  });
  await store.getState().loadSchedule(new Date(2026, 10, 1));
  store.getState().saveEditor({ kind: "assignment", date: "2026-11-15", employee: person.id, category: "off", typeId: "" });
  assert.equal(await store.getState().saveStoreName("  새 매장  "), true);
  assert.equal(sent[0].store_name, "새 매장");
  assert.equal(sent[0].assignments.length, 0);
  assert.equal(sent[0].employees.length, 0);
  assert.equal(sent[0].employee_targets.length, 0);
  assert.equal(store.getState().baseline.entries[`2026-11-15:${person.id}`], undefined);
  assert.equal(store.getState().data.entries[`2026-11-15:${person.id}`].category, "off");
  assert.equal(hasUnsavedChanges(store.getState()), true);
  assert.equal(buildPlannerChanges(store.getState().data, store.getState().baseline).store_name, undefined);
  assert.equal(store.getState().revision, 1);
  store.getState().undoLastChange();
  assert.equal(store.getState().data.storeName, "새 매장");
  assert.equal(hasUnsavedChanges(store.getState()), false);
});

test("매장명 저장 중 중복 저장·이동은 막고 추가 일정 편집은 보존한다", async () => {
  let finish: () => void = () => {};
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  const store = createPlannerStore({
    load: async () => ({ ok: true, value: { data: sample(), revision: 0 } }),
    save: async () => {
      await pending;

      return { ok: true, value: 1 };
    },
  });
  await store.getState().loadSchedule(new Date(2026, 10, 1));
  const saving = store.getState().saveStoreName("별도 저장");
  assert.equal(await store.getState().saveStoreName("중복"), false);
  store.getState().saveEditor({ kind: "assignment", date: "2026-11-15", employee: person.id, category: "off", typeId: "" });
  assert.equal(await store.getState().saveSchedule(), false);
  store.getState().navigateMonth(1);
  assert.equal(store.getState().view.month, "2026-11");
  finish();
  assert.equal(await saving, true);
  assert.equal(store.getState().data.storeName, "별도 저장");
  assert.equal(store.getState().data.entries[`2026-11-15:${person.id}`].category, "off");
  assert.equal(hasUnsavedChanges(store.getState()), true);
});


test("일정 편집은 휴무 기준을 새로 만들거나 기존 호환 데이터를 변경하지 않는다", async () => {
  const data = sample();
  const store = createPlannerStore({
    load: async () => ({ ok: true, value: { data, revision: 0 } }),
    save: async () => ({ ok: true, value: 1 }),
  });
  await store.getState().loadSchedule(new Date(2026, 10, 1));
  store.getState().saveEditor({ kind: "assignment", date: "2026-11-15", employee: person.id, category: "off", typeId: "" });
  const changes = buildPlannerChanges(store.getState().data, store.getState().baseline);
  assert.equal(changes.assignments.length, 1);
  assert.deepEqual(changes.employee_targets, []);
  assert.deepEqual(changes.deleted_employee_targets, []);
  assert.deepEqual(store.getState().data.employeeOffTargets, data.employeeOffTargets);
});
