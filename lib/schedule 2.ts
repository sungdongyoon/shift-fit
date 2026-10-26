export type Category = 'work' | 'off' | 'leave' | 'other';
export type ShiftType = { id: string; name: string; start: string; end: string; color: string; archived?: boolean };
export type Employee = { id: string; name: string; color: string; from: string; until?: string };
export type Assignment = { category: Category; shift?: ShiftType };
export type Schedule = { version: 1; employees: Employee[]; types: ShiftType[]; entries: Record<string, Assignment>; targets: Record<string, number> };
export const labels: Record<Category, string> = { work: '근무', off: '휴무', leave: '연차', other: '기타' };
export const colors = ['#E15B56', '#D59627', '#42A184', '#5686D6', '#8B6AC8', '#C96999'];
export const initial: Schedule = { version: 1, employees: [], entries: {}, targets: {}, types: [
  { id: 'open', name: '오픈', start: '08:00', end: '17:00', color: colors[0] },
  { id: 'middle', name: '미들', start: '11:00', end: '20:00', color: colors[1] },
  { id: 'close', name: '마감', start: '14:00', end: '23:00', color: colors[4] },
] };
export function monthKey(year: number, month: number) { return `${year}-${String(month + 1).padStart(2, '0')}`; }
export function daysInMonth(month: string) { const [y, m] = month.split('-').map(Number); return new Date(y, m, 0).getDate(); }
export function dateKey(month: string, day: number) { return `${month}-${String(day).padStart(2, '0')}`; }
export function activeEmployees(data: Schedule, month: string) { return data.employees.filter(e => e.from <= month && (!e.until || e.until >= month)); }
export function getAssignment(data: Schedule, date: string, employee: string): Assignment { return data.entries[`${date}:${employee}`] ?? { category: 'off' }; }
export function assign(data: Schedule, date: string, employee: string, assignment: Assignment): Schedule {
  const entries = { ...data.entries };
  if (assignment.category === 'off') delete entries[`${date}:${employee}`];
  else entries[`${date}:${employee}`] = structuredClone(assignment);
  return { ...data, entries };
}
export function counts(data: Schedule, month: string, employee: string) {
  const result = { work: 0, off: 0, leave: 0, other: 0 };
  for (let day = 1; day <= daysInMonth(month); day++) result[getAssignment(data, dateKey(month, day), employee).category]++;
  return result;
}
export function assignmentColor(a: Assignment) { return a.category === 'work' ? a.shift?.color ?? '#5686D6' : ({ off: '#A3A6AE', leave: '#42A184', other: '#8B6AC8' }[a.category]); }
export function readSaved(raw: string): Schedule {
  const d = JSON.parse(raw) as Schedule;
  if (d.version !== 1 || !Array.isArray(d.employees) || !Array.isArray(d.types) || !d.entries || !d.targets) throw new Error('저장 형식을 확인해 주세요.');
  const validColor = (v: unknown) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  const validType = (t: ShiftType) => typeof t.id === 'string' && typeof t.name === 'string' && validColor(t.color) && /^\d{2}:\d{2}$/.test(t.start) && /^\d{2}:\d{2}$/.test(t.end);
  if (!d.types.every(validType) || !d.employees.every(e => typeof e.id === 'string' && typeof e.name === 'string' && validColor(e.color) && /^\d{4}-\d{2}$/.test(e.from))) throw new Error('저장된 직원 정보를 읽지 못했어요.');
  if (!Object.values(d.entries).every(a => a && Object.hasOwn(labels, a.category) && (a.category !== 'work' || (a.shift && validType(a.shift))))) throw new Error('저장된 배정을 읽지 못했어요.');
  if (!Object.values(d.targets).every(n => Number.isInteger(n) && n >= 0 && n <= 31)) throw new Error('휴무 기준이 올바르지 않아요.');
  return d;
}
