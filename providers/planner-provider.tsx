"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import {
  createPlannerStore,
  type PlannerStore,
  type PlannerStoreApi,
} from "@/stores/planner-store";
import { buildPlannerChanges } from "@/lib/planner-data";
import { loadPlanner, savePlanner } from "@/app/planner/actions";
import { hasUnsavedChanges } from "@/stores/planner-store";
import { UnsavedChangesDialog } from "@/components/planner/unsaved-changes-dialog";

const PlannerContext = createContext<PlannerStoreApi | null>(null);

export const PlannerProvider = ({ children }: { children: ReactNode }) => {
  const [store] = useState(() =>
    createPlannerStore({
      load: loadPlanner,
      save: (data, revision, baseline) =>
        savePlanner(buildPlannerChanges(data, baseline), revision),
    }),
  );

  useEffect(() => {
    void store.getState().loadSchedule();

    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges(store.getState())) return;

      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [store]);

  return (
    <PlannerContext.Provider value={store}>
      {children}
      <UnsavedChangesDialog />
    </PlannerContext.Provider>
  );
};

export const usePlannerStore = <T,>(
  selector: (state: PlannerStore) => T,
): T => {
  const store = useContext(PlannerContext);
  if (!store) throw new Error("PlannerProvider 내부에서 사용해 주세요.");

  return useStore(store, selector);
};
