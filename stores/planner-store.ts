import { createStore } from "zustand/vanilla";
import type { Editor } from "../lib/editor";
import {
  createExampleSchedule,
  removeScheduleEditor,
  saveScheduleEditor,
} from "../lib/schedule-commands";
import {
  activeEmployees,
  daysInMonth,
  getAssignment,
  initial,
  monthKey,
  type Schedule,
} from "../lib/schedule";

type ViewState = { month: string; today: string; selected: string };
type ToastState = { message: string; undo?: Schedule } | null;
export type StorageStatus = "loading" | "saved" | "blocked" | "failed";

export type PlannerState = {
  data: Schedule;
  view: ViewState;
  editor: Editor | null;
  toast: ToastState;
  storageStatus: StorageStatus;
};

type PlannerActions = {
  openEditor: (editor: Editor) => void;
  closeEditor: () => void;
  addAssignment: (date: string) => void;
  editAssignment: (date: string, employee: string) => void;
  saveEditor: (editor: Editor) => string | null;
  removeEditor: (editor: Editor) => void;
  navigateMonth: (delta: number) => void;
  goToToday: () => void;
  selectEmployee: (employee: string) => void;
  clearSelection: () => void;
  setOffTarget: (target: number) => void;
  loadExample: () => void;
  notify: (message: string) => void;
  dismissToast: () => void;
  undoLastChange: () => void;
};

export type PlannerStore = PlannerState & PlannerActions;

// Created by the provider, never shared between server requests or workspaces.
export const createPlannerStore = () =>
  createStore<PlannerStore>()((set, get) => {
    const commit = (
      data: Schedule,
      message: string,
      extra: Partial<PlannerState> = {},
    ) => {
      set((state) => ({
        data,
        toast: { message, undo: state.data },
        ...extra,
      }));
    };

    return {
      data: structuredClone(initial),
      view: { month: "", today: "", selected: "" },
      editor: null,
      toast: null,
      storageStatus: "loading",
      openEditor: (editor) => {
        if (get().storageStatus !== "loading") set({ editor });
      },
      closeEditor: () => set({ editor: null }),
      addAssignment: (date) => {
        const { data, view, notify, openEditor } = get();
        const employees = activeEmployees(data, view.month);
        if (!employees.length)
          return notify("먼저 우측에서 근무자를 추가해 주세요.");
        const types = data.types.filter((type) => !type.archived);
        openEditor({
          kind: "assignment",
          date,
          employee:
            employees.find((employee) => employee.id === view.selected)?.id ??
            employees[0].id,
          category: types.length ? "work" : "off",
          typeId: types[0]?.id ?? "",
        });
      },
      editAssignment: (date, employee) => {
        const { data, openEditor } = get();
        const assignment = getAssignment(data, date, employee);
        openEditor({
          kind: "assignment",
          date,
          employee,
          category: assignment.category,
          typeId: assignment.shift
            ? "__existing"
            : (data.types.find((type) => !type.archived)?.id ?? ""),
          original: true,
        });
      },
      saveEditor: (editor) => {
        const { data, view } = get();
        const result = saveScheduleEditor(data, view.month, editor);
        if (!result.ok) return result.error;
        commit(result.data, result.message, { editor: null });
        return null;
      },
      removeEditor: (editor) => {
        const { data, view } = get();
        const result = removeScheduleEditor(data, view.month, editor);
        commit(result.data, result.message, {
          editor: null,
          ...(editor.kind === "employee"
            ? { view: { ...view, selected: "" } }
            : {}),
        });
      },
      navigateMonth: (delta) => {
        const { view } = get();
        if (!view.month) return;
        const [year, month] = view.month.split("-").map(Number);
        const date = new Date(year, month - 1 + delta, 1);
        set({
          view: {
            ...view,
            month: monthKey(date.getFullYear(), date.getMonth()),
            selected: "",
          },
        });
      },
      goToToday: () =>
        set((state) => ({
          view: {
            ...state.view,
            month: state.view.today.slice(0, 7),
            selected: "",
          },
        })),
      selectEmployee: (employee) =>
        set((state) => ({
          view: {
            ...state.view,
            selected: state.view.selected === employee ? "" : employee,
          },
        })),
      clearSelection: () =>
        set((state) => ({ view: { ...state.view, selected: "" } })),
      setOffTarget: (target) => {
        const { data, view } = get();
        if (
          !view.month ||
          !Number.isInteger(target) ||
          target < 0 ||
          target > daysInMonth(view.month) ||
          data.targets[view.month] === target
        )
          return;
        commit(
          { ...data, targets: { ...data.targets, [view.month]: target } },
          "월 휴무 기준을 변경했어요.",
        );
      },
      loadExample: () => {
        const { data, view } = get();
        if (!view.month || data.employees.length) return;
        commit(
          createExampleSchedule(data, view.month),
          "예시 근무표를 불러왔어요. 실행 취소로 되돌릴 수 있어요.",
        );
      },
      notify: (message) =>
        set((state) => ({ toast: { ...state.toast, message } })),
      dismissToast: () => set({ toast: null }),
      undoLastChange: () => {
        const previous = get().toast?.undo;
        if (previous)
          set({
            data: previous,
            toast: { message: "이전 상태로 되돌렸어요." },
          });
      },
    };
  });

export type PlannerStoreApi = ReturnType<typeof createPlannerStore>;
