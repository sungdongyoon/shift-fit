import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SHIFT_TYPES, initial, assign, counts, getAssignment, readSaved, daysInMonth } from '../lib/schedule.ts';
import { removeScheduleEditor } from '../lib/schedule-commands.ts';

const employee = { id: 'employee-1', name: '테스트 직원', color: '#5686D6', from: '2026-10' };
const zeroCounts = { work: 0, off: 0, leave: 0, other: 0 };

const base = () => ({ ...structuredClone(initial), employees: [employee], typesByMonth: { '2026-10': structuredClone(DEFAULT_SHIFT_TYPES) } });

test('근무자를 등록해도 배정 없는 날짜에 기본 일정이나 집계를 생성하지 않는다', () => {
  assert.equal(getAssignment(base(), '2026-10-01', employee.id), undefined);
  assert.deepEqual(counts(base(), '2026-10', employee.id), zeroCounts);
  assert.equal(daysInMonth('2028-02'), 29);
  assert.deepEqual(counts(base(), '2028-02', employee.id), zeroCounts);
});

test('같은 날 다시 배정하면 기존 일정 하나만 교체한다', () => {
  let data = assign(base(), '2026-10-01', employee.id, { category: 'work', shift: DEFAULT_SHIFT_TYPES[0] });
  data = assign(data, '2026-10-01', employee.id, { category: 'leave' });
  assert.equal(Object.keys(data.entries).length, 1);
  assert.deepEqual(counts(data, '2026-10', employee.id), { ...zeroCounts, leave: 1 });
});

test('배정 삭제는 휴무를 만들지 않고 해당 날짜의 이름표를 제거한다', () => {
  const data = assign(base(), '2026-10-02', employee.id, { category: 'other' });
  const result = removeScheduleEditor(data, '2026-10', {
    kind: 'assignment', date: '2026-10-02', employee: employee.id, category: 'other', typeId: '', original: true,
  });
  assert.equal(getAssignment(result.data, '2026-10-02', employee.id), undefined);
  assert.deepEqual(counts(result.data, '2026-10', employee.id), zeroCounts);
  assert.equal(data.entries[`2026-10-02:${employee.id}`].category, 'other');
});

test('배정은 타입 객체의 외부 직접 변경으로부터 복사본을 보호한다', () => {
  const data = base();
  const original = structuredClone(data.typesByMonth['2026-10'][0]);
  const assigned = assign(data, '2026-10-01', employee.id, { category: 'work', shift: data.typesByMonth['2026-10'][0] });
  data.typesByMonth['2026-10'][0].name = '변경된 오픈';
  assert.deepEqual(getAssignment(assigned, '2026-10-01', employee.id).shift, original);
});

test('월별 집계는 실제 배정만 세고 연차와 기타를 휴무로 계산하지 않는다', () => {
  let data = assign(base(), '2026-10-01', employee.id, { category: 'leave' });
  data = assign(data, '2026-10-02', employee.id, { category: 'other' });
  assert.deepEqual(counts(data, '2026-10', employee.id), { ...zeroCounts, leave: 1, other: 1 });
  assert.deepEqual(counts(data, '2026-11', employee.id), zeroCounts);
});

test('저장·복원은 실제 배정과 빈 날짜, 이전 휴무 메타데이터를 보존한다', () => {
  const data = assign(base(), '2026-10-01', employee.id, { category: 'off' });
  data.targets['2026-10'] = 8;
  const restored = readSaved(JSON.stringify(data));
  assert.deepEqual(restored, data);
  assert.equal(getAssignment(restored, '2026-10-02', employee.id), undefined);
  assert.throws(() => readSaved('{invalid'));
  assert.throws(() => readSaved(JSON.stringify({ ...data, version: 4 })));
});

test('이전 저장본의 미배정 행만 제거하며 근무와 휴무는 보존한다', () => {
  for (const version of [1, 2, 3]) {
    const data = { ...base(), version, types: structuredClone(DEFAULT_SHIFT_TYPES), entries: {
      '2026-10-01:employee-1': { category: 'unassigned' },
      '2026-10-02:employee-1': { category: 'off' },
      '2026-10-03:employee-1': { category: 'work', shift: DEFAULT_SHIFT_TYPES[0] },
    } };
    const restored = readSaved(JSON.stringify(data), '2026-10');
    assert.equal(getAssignment(restored, '2026-10-01', employee.id), undefined);
    assert.equal(getAssignment(restored, '2026-10-02', employee.id).category, 'off');
    assert.equal(getAssignment(restored, '2026-10-03', employee.id).category, 'work');
    assert.equal(counts(restored, '2026-10', employee.id).off, 1);
  }
});

test('이전 자동 휴무 메타데이터가 있어도 날짜에 일정을 자동 생성하지 않는다', () => {
  const data = base();
  data.employees[0] = { ...employee, until: '2026-11', legacyOffThrough: '2026-12' };
  assert.equal(getAssignment(data, '2026-10-01', employee.id), undefined);
  assert.deepEqual(counts(data, '2026-10', employee.id), zeroCounts);
});
