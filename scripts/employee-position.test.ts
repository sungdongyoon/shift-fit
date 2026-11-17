import test from "node:test";
import assert from "node:assert/strict";
import { initial } from "../lib/schedule";
import { saveScheduleEditor } from "../lib/schedule-commands";
import { buildPlannerChanges, fromPlannerRows, toPlannerPayload } from "../lib/planner-data";

const editor = { kind: "employee", name: "검증 직원", color: "#5686D6", startDate: "2026-11-01" } as const;
const employeeId = "d3678de7-52fe-4d81-b9ec-0ba25a096eac";

const create = (position?: string) => {
  const result = saveScheduleEditor(structuredClone(initial), "2026-11", { ...editor, position }, () => employeeId);
  if (!result.ok) throw new Error(result.error);

  return result.data;
};

test("직급은 자유 입력이며 생략·공백은 직급 없음으로 저장한다", () => {
  assert.equal(create().employees[0].position, undefined);
  assert.equal(create("   ").employees[0].position, undefined);
  assert.equal(create("  매니저 / 주임  ").employees[0].position, "매니저 / 주임");
  assert.equal(saveScheduleEditor(initial, "2026-11", { ...editor, position: "가".repeat(31) }).ok, false);
});

test("직급을 수정·제거할 수 있으며 필드를 모르는 이전 편집은 기존 직급을 유지한다", () => {
  const data = create("매니저");
  const unchanged = saveScheduleEditor(data, "2026-11", { ...editor, id: employeeId, name: "수정 이름" });
  if (!unchanged.ok) throw new Error(unchanged.error);
  assert.equal(unchanged.data.employees[0].position, "매니저");
  for (const position of ["점장", ""]) {
    const result = saveScheduleEditor(data, "2026-11", { ...editor, id: employeeId, position });
    if (!result.ok) throw new Error(result.error);
    assert.equal(result.data.employees[0].position, position || undefined);
  }
  assert.equal(data.employees[0].position, "매니저");
});

test("직급은 DB 왕복에 보존되고 직급 제거도 변경 행에 포함한다", () => {
  const data = create("매니저");
  const payload = toPlannerPayload(data);
  assert.equal(payload.employees[0].position, "매니저");
  const restored = fromPlannerRows({ ...payload, revision: 1 }).data;
  assert.equal(restored.employees[0].position, "매니저");
  assert.deepEqual(toPlannerPayload(restored), payload);
  const removed = create();
  assert.equal(buildPlannerChanges(removed, data).employees[0].position, null);
});
