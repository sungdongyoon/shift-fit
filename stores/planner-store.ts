import type { PlannerPersistence } from "../lib/planner-data";
import { createStore } from "zustand/vanilla";
import type { Editor } from "../lib/editor";
import {
  createExampleSchedule,
  copyPreviousMonthTypes,
  removeScheduleEditor,
  saveScheduleEditor,
} from "../lib/schedule-commands";
import {
  dateKey,
  isEmployeeVisibleOn,
  daysInMonth,
  DEFAULT_OFF_TARGET,
  getAssignment,
  getMonthShiftTypes,
  initial,
  monthKey,
  type Schedule,
} from "../lib/schedule";

type ViewState = {
  month: string;
  today: string;
  selected: string;
};

type ToastState = {
  message: string;
  undo?: Schedule;
} | null;

export type StorageStatus =
  | "loading"
  | "saved"
  | "saving"
  | "blocked"
  | "failed";

export type PlannerState = {
  data: Schedule;
  view: ViewState;
  editor: Editor | null;
  toast: ToastState;
  storageStatus: StorageStatus;
  baseline: Schedule;
  revision: number;
  persistenceError: string | null;
  conflict: boolean;
  pendingNavigation: { label: string; proceed: () => void } | null;
};

type PlannerActions = {
  loadSchedule: (now?: Date) => Promise<void>;
  saveSchedule: () => Promise<boolean>;
  requestLeave: (label: string, proceed: () => void) => void;
  resolveNavigation: (choice: "save" | "discard" | "cancel") => Promise<void>;
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
  copyPreviousMonthTypes: () => void;
  notify: (message: string) => void;
  dismissToast: () => void;
  undoLastChange: () => void;
};

export type PlannerStore = PlannerState & PlannerActions;

// Created by the provider, never shared between server requests or workspaces.
export const hasUnsavedChanges = (
  state: Pick<PlannerState, "data" | "baseline">,
) =>
  state.data !== state.baseline &&
  JSON.stringify(state.data) !== JSON.stringify(state.baseline);

export const createPlannerStore = (persistence?: PlannerPersistence) =>
  createStore<PlannerStore>()((set, get) => {
    const original = structuredClone(initial);
    let loadRequest: Promise<void> | null = null;

    const editable = () =>
      get().storageStatus !== "loading" && get().storageStatus !== "blocked";

    const commit = (
      data: Schedule,
      message: string,
      extra: Partial<PlannerState> = {},
    ) => {
      if (!editable()) return;

      set((state) => ({
        data,
        toast: { message, undo: state.data },
        ...extra,
      }));
    };

    return {
      data: original,
      baseline: original,
      revision: 0,
      persistenceError: null,
      conflict: false,
      pendingNavigation: null,
      view: { month: "", today: "", selected: "" },
      editor: null,
      toast: null,
      storageStatus: "loading",
      loadSchedule: (now = new Date()) => {
        if (loadRequest) return loadRequest;
        if (get().storageStatus === "saving" || hasUnsavedChanges(get()))
          return Promise.resolve();

        const month = monthKey(now.getFullYear(), now.getMonth());
        set((state) => ({
          storageStatus: "loading",
          persistenceError: null,
          view: state.view.month
            ? state.view
            : { month, today: dateKey(month, now.getDate()), selected: "" },
        }));
        loadRequest = (async () => {
          try {
            if (!persistence) throw new Error("저장소 연결이 필요해요.");
            const result = await persistence.load();

            if (!result.ok) {
              set({ storageStatus: "blocked", persistenceError: result.error });

              return;
            }

            set({
              data: result.value.data,
              baseline: result.value.data,
              revision: result.value.revision,
              storageStatus: "saved",
              persistenceError: null,
              conflict: false,
              editor: null,
              toast: null,
            });
          } catch {
            set({
              storageStatus: "blocked",
              persistenceError:
                "근무표를 불러오지 못했어요. 다시 시도해 주세요.",
            });
          }
        })().finally(() => {
          loadRequest = null;
        });

        return loadRequest;
      },
      saveSchedule: async () => {
        const state = get();

        if (
          !editable() ||
          state.storageStatus === "saving" ||
          state.conflict ||
          !hasUnsavedChanges(state)
        )
          return false;

        const snapshot = state.data;
        set({ storageStatus: "saving", persistenceError: null });

        try {
          if (!persistence) throw new Error("저장소 연결이 필요해요.");
          const result = await persistence.save(snapshot, state.revision, state.baseline);

          if (!result.ok) {
            set({
              storageStatus: "failed",
              persistenceError: result.error,
              conflict: Boolean(result.conflict),
            });

            return false;
          }

          // Keep edits made while this request was pending; only this snapshot became saved.
          set((current) => {
            const remaining = hasUnsavedChanges({ data: current.data, baseline: snapshot });

            return {
              baseline: snapshot,
              revision: result.value,
              storageStatus: "saved",
              persistenceError: null,
              toast: remaining
                ? { ...current.toast, message: "요청한 내용은 저장됐어요. 추가 편집은 한 번 더 저장해 주세요." }
                : { message: "근무표를 저장했어요." },
            };
          });

          return true;
        } catch {
          set({
            storageStatus: "failed",
            persistenceError:
              "저장하지 못했어요. 작성 내용은 유지돼요. 다시 저장해 주세요.",
          });

          return false;
        }
      },
      requestLeave: (label, proceed) => {
        if (get().storageStatus === "saving") {
          get().notify("저장이 끝난 뒤 이동해 주세요.");

          return;
        }
        if (hasUnsavedChanges(get())) {
          set({ pendingNavigation: { label, proceed } });

          return;
        }
        proceed();
      },
      resolveNavigation: async (choice) => {
        const pending = get().pendingNavigation;

        if (!pending || get().storageStatus === "saving") return;
        if (choice === "cancel") {
          set({ pendingNavigation: null });

          return;
        }
        if (choice === "save") {
          if (!(await get().saveSchedule()) || hasUnsavedChanges(get())) return;
        } else {
          set((state) => ({ data: state.baseline, editor: null, toast: null }));
        }
        set({ pendingNavigation: null });
        pending.proceed();
      },
      openEditor: (editor) => {
        if (editable()) set({ editor });
      },
      closeEditor: () => set({ editor: null }),
      addAssignment: (date) => {
        if (!editable()) return;

        const { data, view, notify, openEditor } = get();
        const employees = data.employees.filter((employee) => isEmployeeVisibleOn(employee, date));
        if (!employees.length) {
          notify("해당 날짜에 근무를 시작한 근무자가 없어요. 근무 시작일을 확인해 주세요.");

          return;
        }

        const types = getMonthShiftTypes(data, view.month).filter(
          (type) => !type.archived,
        );
        const selectedEmployee = employees.find(
          (employee) => employee.id === view.selected,
        );

        openEditor({
          kind: "assignment",
          date,
          employee: selectedEmployee?.id ?? employees[0].id,
          category: "unassigned",
          typeId: types[0]?.id ?? "",
        });
      },
      editAssignment: (date, employee) => {
        if (!editable()) return;

        const { data, view, openEditor } = get();
        const person = data.employees.find((item) => item.id === employee);

        if (!person || !isEmployeeVisibleOn(person, date)) return;

        const assignment = getAssignment(data, date, employee);
        openEditor({
          kind: "assignment",
          date,
          employee,
          category: assignment.category,
          memo: assignment.memo ?? "",
          typeId:
            assignment.shift?.id ??
            getMonthShiftTypes(data, view.month).find((type) => !type.archived)
              ?.id ??
            "",
          original: true,
        });
      },
      saveEditor: (editor) => {
        if (!editable()) return "근무표를 불러온 뒤 수정해 주세요.";

        const { data, view } = get();
        const result = saveScheduleEditor(data, view.month, editor);
        if (!result.ok) return result.error;
        commit(result.data, result.message, { editor: null });

        return null;
      },
      removeEditor: (editor) => {
        if (!editable()) return;

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
        const target = monthKey(date.getFullYear(), date.getMonth());
        get().requestLeave("월 이동", () =>
          set((state) => ({
            view: { ...state.view, month: target, selected: "" },
            editor: null,
            toast: null,
          })),
        );
      },
      goToToday: () => {
        const month = get().view.today.slice(0, 7);

        if (!month || month === get().view.month) return;

        get().requestLeave("오늘로 이동", () =>
          set((state) => ({
            view: { ...state.view, month, selected: "" },
            editor: null,
            toast: null,
          })),
        );
      },
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
        if (!editable()) return;

        const { data, view } = get();
        if (
          !view.month ||
          !Number.isInteger(target) ||
          target < 0 ||
          target > daysInMonth(view.month) ||
          (data.targets[view.month] ?? DEFAULT_OFF_TARGET) === target
        ) {
          return;
        }

        commit(
          { ...data, targets: { ...data.targets, [view.month]: target } },
          "월 휴무 기준을 변경했어요.",
        );
      },
      copyPreviousMonthTypes: () => {
        if (!editable()) return;

        const { data, view, notify } = get();

        if (!view.month) return;

        const result = copyPreviousMonthTypes(data, view.month);

        if (!result.ok) {
          notify(result.error);

          return;
        }

        commit(result.data, result.message);
      },
      loadExample: () => {
        if (!editable()) return;

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
        if (!editable()) return;

        const { toast, view } = get();
        const previous = toast?.undo;

        if (!previous) return;

        const hasSelectedEmployee = previous.employees.some(
          (employee) => employee.id === view.selected,
        );

        set({
          data: previous,
          view: { ...view, selected: hasSelectedEmployee ? view.selected : "" },
          toast: { message: "이전 상태로 되돌렸어요." },
        });
      },
    };
  });

export type PlannerStoreApi = ReturnType<typeof createPlannerStore>;
