import test from "node:test";
import assert from "node:assert/strict";
import { employeeOffTarget, initial, snapshotEmployeeOffTargets, type Schedule } from "../lib/schedule";
import { removeScheduleEditor, applyMonthlyOffTargets } from "../lib/schedule-commands";
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

test("휴무 기준은 직전 월에서 이어받으며 0과 미지정도 구분해 보존한다", () => {
  const data = sample();
  assert.equal(employeeOffTarget(data, "2026-11", person.id), 8);
  data.employeeOffTargets!["2026-11"] = { [person.id]: null };
  assert.equal(employeeOffTarget(data, "2026-12", person.id), null);
  data.employeeOffTargets!["2026-12"] = { [person.id]: 0 };
  assert.equal(employeeOffTarget(data, "2027-01", person.id), 0);
  assert.equal(employeeOffTarget(data, "2026-10", person.id), 8);
  assert.equal(employeeOffTarget({ targets: { "2026-09": 7 } }, "2026-09", person.id), 7);
});

test("작성한 월의 기준은 이전 월 기준을 수정해도 유지하며 새 월 상속은 월 일수 이내이다", () => {
  const data = snapshotEmployeeOffTargets(sample(), "2026-12");
  data.employeeOffTargets!["2026-10"][person.id] = 4;
  assert.equal(employeeOffTarget(data, "2026-12", person.id), 8);
  data.employeeOffTargets!["2027-01"] = { [person.id]: 31 };
  assert.equal(employeeOffTarget(data, "2027-02", person.id), 28);
  assert.equal(employeeOffTarget({ targets: {}, employeeOffTargets: { "2028-01": { [person.id]: 31 } } }, "2028-02", person.id), 29);
});

test("월별 휴무 일괄 적용은 선택한 월만 변경하고 잘못된 횟수는 거부한다", () => {
  const data = sample();
  const result = applyMonthlyOffTargets(data, "2026-11", { [person.id]: null });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(employeeOffTarget(result.data, "2026-10", person.id), 8);
  assert.equal(employeeOffTarget(result.data, "2026-11", person.id), null);
  assert.equal(employeeOffTarget(result.data, "2026-12", person.id), null);
  for (const offTarget of [-1, 31, 1.5, NaN]) {
    assert.equal(applyMonthlyOffTargets(data, "2026-11", { [person.id]: offTarget }).ok, false);
  }
  assert.equal(data.employeeOffTargets!["2026-11"], undefined);
});

test("직원 삭제 시 월별 휴무 기준도 제거하고 DB 변경에는 삭제 키를 포함한다", () => {
  const data = sample();
  const removed = removeScheduleEditor(data, "2026-11", { kind: "employee", ...person }).data;
  const changes = buildPlannerChanges(removed, data);
  assert.deepEqual(changes.deleted_employee_targets, [{ employee_id: person.id, month: "2026-10-01" }]);
  assert.deepEqual(changes.deleted_employees, [person.id]);
  assert.equal(toPlannerPayload(removed).employee_targets.length, 0);
});

test("매장명과 직원별 기준은 DB 왕복·변경 행 저장·PDF에 반영된다", () => {
  const data = sample();
  data.storeName = "00매장 00점";
  data.employeeOffTargets!["2026-11"] = { [person.id]: null };
  const payload = toPlannerPayload(data);
  const restored = fromPlannerRows({ ...payload, revision: 1 });
  assert.deepEqual(toPlannerPayload(restored.data), payload);
  const pdf = buildSchedulePdfData(restored.data, "2026-11", {});
  assert.equal(pdf.title, "00매장 00점 2026.11 근무표");
  assert.equal(pdf.employees[0].target, null);
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

test("근무 타입 복사로 작성한 월도 이전 월의 휴무 기준 수정에 영향을 받지 않는다", () => {
  const data = sample();
  data.typesByMonth["2026-10"] = [{ id: crypto.randomUUID(), name: "오픈", start: "09:00", end: "18:00", color: person.color }];
  const store = createPlannerStore();
  store.setState({ data, baseline: data, storageStatus: "saved", view: { month: "2026-11", today: "2026-11-15", selected: "" } });
  store.getState().copyPreviousMonthTypes();
  assert.equal(store.getState().data.employeeOffTargets?.["2026-11"]?.[person.id], 8);
  store.setState({ view: { month: "2026-10", today: "2026-11-15", selected: "" } });
  assert.equal(store.getState().applyMonthlyOffTargets("2026-10", { [person.id]: null }), null);
  assert.equal(employeeOffTarget(store.getState().data, "2026-11", person.id), 8);
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

test("휴무 설정은 현재 월의 근무자만 대상으로 원자적으로 적용하고 캘린더 저장 전에는 통신하지 않는다", async () => {
  const data = sample();
  const second = { ...person, id: crypto.randomUUID(), name: "두 번째 직원" };
  data.employees.push(second);
  let writes = 0;
  const store = createPlannerStore({
    load: async () => ({ ok: true, value: { data, revision: 0 } }),
    save: async () => {
      writes++;

      return { ok: true, value: 1 };
    },
  });
  await store.getState().loadSchedule(new Date(2026, 10, 1));
  const before = structuredClone(store.getState().data);
  assert.ok(store.getState().applyMonthlyOffTargets("2026-12", { [person.id]: 8 }));
  assert.ok(store.getState().applyMonthlyOffTargets("2026-11", { [person.id]: 8, invalid: 4 }));
  assert.deepEqual(store.getState().data, before);
  assert.equal(store.getState().applyMonthlyOffTargets("2026-11", { [person.id]: 4, [second.id]: null }), null);
  assert.equal(employeeOffTarget(store.getState().data, "2026-11", second.id), null);
  assert.equal(writes, 0);
  assert.equal(await store.getState().saveSchedule(), true);
  assert.equal(writes, 1);
});
