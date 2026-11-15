"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { PanelHeading } from "./panel-heading";
import { daysInMonth, DEFAULT_OFF_TARGET, employeeOffTarget, employeesInMonth, type Employee } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";

type OffTargetDraft = { count: string; noFixedTarget: boolean };

type OffTargetInputProps = {
  label: string;
  value: OffTargetDraft;
  max: number;
  onChange: (value: OffTargetDraft) => void;
};

const parseTarget = (draft: OffTargetDraft, max: number): number | null | undefined => {
  if (draft.noFixedTarget) return null;
  if (!draft.count.trim()) return undefined;

  const count = Number(draft.count);

  return Number.isInteger(count) && count >= 0 && count <= max ? count : undefined;
};

const OffTargetInput = ({ label, value, max, onChange }: OffTargetInputProps) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
    <label className="flex items-center gap-2 text-xs text-content-secondary">
      <span className="sr-only">{label} 휴무 횟수</span>
      <input
        type="number"
        min={0}
        max={max}
        step={1}
        required
        disabled={value.noFixedTarget}
        value={value.noFixedTarget ? "" : value.count}
        onChange={(event) => onChange({ ...value, count: event.target.value })}
        className="h-9 w-20 rounded-md border border-line bg-canvas px-2 text-xs text-content disabled:bg-canvas-subtle"
      />
      회
    </label>
    <label className="flex items-center gap-2 text-[11px] text-content-secondary">
      <input
        type="checkbox"
        checked={value.noFixedTarget}
        onChange={(event) => onChange({ ...value, noFixedTarget: event.target.checked })}
        className="size-4 accent-brand"
      />
      <span className="sr-only">{label} </span>정해진 휴무 없음
    </label>
  </div>
);

type MonthlyOffTargetFormProps = { month: string; employees: Employee[]; onClose: () => void };

const MonthlyOffTargetForm = ({ month, employees, onClose }: MonthlyOffTargetFormProps) => {
  const data = usePlannerStore((state) => state.data);
  const apply = usePlannerStore((state) => state.applyMonthlyOffTargets);

  const [drafts, setDrafts] = useState<Record<string, OffTargetDraft>>(() => Object.fromEntries(
    employees.map((employee) => {
      const target = employeeOffTarget(data, month, employee.id);

      return [employee.id, { count: String(target ?? DEFAULT_OFF_TARGET), noFixedTarget: target === null }];
    }),
  ));
  const [bulk, setBulk] = useState<OffTargetDraft>({ count: String(DEFAULT_OFF_TARGET), noFixedTarget: false });
  const [error, setError] = useState("");
  const max = daysInMonth(month);

  const applyBulk = () => {
    if (parseTarget(bulk, max) === undefined) {
      setError(`휴무 횟수는 0~${max}회로 입력해 주세요.`);

      return;
    }
    setDrafts(Object.fromEntries(employees.map((employee) => [employee.id, { ...bulk }])));
    setError("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targets: Record<string, number | null> = {};

    for (const employee of employees) {
      const target = parseTarget(drafts[employee.id], max);

      if (target === undefined) {
        setError(`${employee.name}의 휴무 횟수를 0~${max}회로 입력해 주세요.`);

        return;
      }
      targets[employee.id] = target;
    }

    const message = apply(month, targets);

    if (message) {
      setError(message);

      return;
    }
    onClose();
  };

  return (
    <div>
      <div className="mb-5 rounded-control bg-canvas-subtle p-3">
        <h3 className="mb-3 text-xs font-semibold">일괄 설정</h3>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <OffTargetInput label="일괄" value={bulk} max={max} onChange={setBulk} />
          <button type="button" onClick={applyBulk} className="shrink-0 rounded-md border border-line bg-canvas px-3 py-2 text-[11px] text-content-secondary hover:bg-surface-hover">
            전체 적용
          </button>
        </div>
      </div>
      <form onSubmit={submit}>
        <h3 className="mb-3 text-xs font-semibold">근무자별 설정</h3>
        <div className="max-h-[40dvh] space-y-3 overflow-y-auto pr-1">
          {employees.map((employee) => (
            <div key={employee.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line p-3">
              <span className="min-w-0 text-xs font-semibold text-content [overflow-wrap:anywhere]">{employee.name}</span>
              <OffTargetInput
                label={employee.name}
                value={drafts[employee.id]}
                max={max}
                onChange={(value) => setDrafts((current) => ({ ...current, [employee.id]: value }))}
              />
            </div>
          ))}
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-2 text-xs text-content-secondary">취소</button>
          <button type="submit" className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-on-brand">적용</button>
        </div>
      </form>
    </div>
  );
};

export const MonthlyOffTargetSettings = () => {
  const [open, setOpen] = useState(false);

  const month = usePlannerStore((state) => state.view.month);
  const employees = usePlannerStore((state) => state.data.employees);
  const status = usePlannerStore((state) => state.storageStatus);
  const visibleEmployees = month ? employeesInMonth(employees, month) : [];
  const ready = status !== "loading" && status !== "blocked";

  return (
    <section>
      <PanelHeading title="월별 휴무 설정" />
      <button
        type="button"
        disabled={!ready || !visibleEmployees.length}
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-md border border-line bg-canvas py-2 text-[11px] text-content-secondary enabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {month.replace("-", ".")} 휴무 설정
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`${month.replace("-", ".")} 월별 휴무 설정`}
        className="max-w-[560px] [&_h2]:text-base"
        footer={<></>}
      >
        {open && <MonthlyOffTargetForm key={month} month={month} employees={visibleEmployees} onClose={() => setOpen(false)} />}
      </Dialog>
    </section>
  );
};
