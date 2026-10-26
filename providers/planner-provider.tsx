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
import { connectPlannerStorage } from "@/stores/planner-storage";

const PlannerContext = createContext<PlannerStoreApi | null>(null);

export const PlannerProvider = ({ children }: { children: ReactNode }) => {
  const [store] = useState(createPlannerStore);

  useEffect(
    () => connectPlannerStorage(store, () => window.localStorage),
    [store],
  );

  return (
    <PlannerContext.Provider value={store}>{children}</PlannerContext.Provider>
  );
};

export const usePlannerStore = <T,>(
  selector: (state: PlannerStore) => T,
): T => {
  const store = useContext(PlannerContext);
  if (!store) throw new Error("PlannerProvider 내부에서 사용해 주세요.");
  return useStore(store, selector);
};
