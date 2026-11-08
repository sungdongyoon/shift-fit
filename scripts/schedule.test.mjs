import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, activeEmployees, assign, counts, getAssignment, readSaved, daysInMonth } from '../lib/schedule.ts';

const employee = { id: 'employee-1', name: '테스트 직원', color: '#5686D6', from: '2026-10' };

const base = () => ({ ...structuredClone(initial), employees: [employee] });

test('새 직원의 모든 날짜는 미배정이며 휴무와 별도로 집계한다', () => {
  assert.deepEqual(counts(base(), '2026-10', employee.id), { work: 0, off: 0, leave: 0, other: 0, unassigned: 31 });
  assert.equal(daysInMonth('2028-02'), 29);
  assert.equal(counts(base(), '2028-02', employee.id).unassigned, 29);
});
test('같은 날 다시 배정하면 중복을 생성하지 않고 기존 일정만 교체한다', () => {
  let data = assign(base(), '2026-10-01', employee.id, { category: 'work', shift: initial.types[0] });
  data = assign(data, '2026-10-01', employee.id, { category: 'leave' });
  assert.equal(Object.keys(data.entries).length, 1);
  assert.deepEqual(counts(data, '2026-10', employee.id), { work: 0, off: 0, leave: 1, other: 0, unassigned: 30 });
});
test('배정 삭제는 휴무로 돌아가며 직원의 하루가 사라지지 않는다', () => {
  let data = assign(base(), '2026-10-02', employee.id, { category: 'other' });
  data = assign(data, '2026-10-02', employee.id, { category: 'off' });
  assert.equal(getAssignment(data, '2026-10-02', employee.id).category, 'off');
  assert.equal(counts(data, '2026-10', employee.id).off, 1);
});
test('배정은 타입 객체의 외부 직접 변경으로부터 복사본을 보호한다', () => {
  const data = base();
  const original = structuredClone(data.types[0]);
  const assigned = assign(data, '2026-10-01', employee.id, { category: 'work', shift: data.types[0] });
  data.types[0].name = '변경된 오픈'; data.types[0].color = '#000000'; data.types[0].archived = true;
  assert.deepEqual(getAssignment(assigned, '2026-10-01', employee.id).shift, original);
});
test('월별 집계는 서로 섞이지 않고 연차와 기타를 휴무로 계산하지 않는다', () => {
  let data = assign(base(), '2026-10-01', employee.id, { category: 'leave' });
  data = assign(data, '2026-10-02', employee.id, { category: 'other' });
  assert.deepEqual(counts(data, '2026-10', employee.id), { work: 0, off: 0, leave: 1, other: 1, unassigned: 29 });
  assert.equal(counts(data, '2026-11', employee.id).unassigned, 30);
});
test('등록 이전에는 표시하지 않고 비활성화 이후 월에는 숨기되 기존 월은 유지한다', () => {
  const data = base(); data.employees[0] = { ...employee, until: '2026-10' };
  assert.equal(activeEmployees(data, '2026-09').length, 0);
  assert.equal(activeEmployees(data, '2026-10').length, 1);
  assert.equal(activeEmployees(data, '2026-11').length, 0);
});
test('저장 후 복원하면 배정과 월 휴무 기준이 동일하다', () => {
  const data = assign(base(), '2026-10-01', employee.id, { category: 'work', shift: initial.types[0] });
  data.targets['2026-10'] = 8;
  assert.deepEqual(readSaved(JSON.stringify(data)), data);
  assert.throws(() => readSaved('{invalid'));
  assert.throws(() => readSaved(JSON.stringify({ ...data, version: 3 })));
});

test('휴무와 미배정은 저장·복원 후에도 구분된다', () => {
  let data = assign(base(), '2026-10-01', employee.id, { category: 'off' });
  const restored = readSaved(JSON.stringify(data));
  assert.equal(getAssignment(restored, '2026-10-01', employee.id).category, 'off');
  assert.equal(getAssignment(restored, '2026-10-02', employee.id).category, 'unassigned');
  data = assign(restored, '2026-10-01', employee.id, { category: 'unassigned' });
  assert.equal(counts(data, '2026-10', employee.id).off, 0);
  assert.equal(counts(data, '2026-10', employee.id).unassigned, 31);
});

test('v1의 기존 휴무 집계는 유지하고 새 월과 새 직원은 미배정으로 시작한다', () => {
  const legacy = { ...base(), version: 1, targets: { '2026-11': 8 } };
  legacy.entries['2026-11-04:employee-1'] = { category: 'work', shift: initial.types[0] };
  const restored = readSaved(JSON.stringify(legacy), '2026-10');
  assert.equal(restored.version, 2);
  assert.equal(counts(restored, '2026-10', employee.id).off, 31);
  assert.equal(counts(restored, '2026-11', employee.id).off, 29);
  assert.equal(counts(restored, '2026-12', employee.id).unassigned, 31);
  restored.employees.push({ ...employee, id: 'new' });
  assert.equal(getAssignment(restored, '2026-10-01', 'new').category, 'unassigned');
  const explicit = assign(restored, '2026-10-01', employee.id, { category: 'unassigned' });
  assert.equal(getAssignment(readSaved(JSON.stringify(explicit)), '2026-10-01', employee.id).category, 'unassigned');
  assert.equal(legacy.employees[0].legacyOffThrough, undefined);
});
