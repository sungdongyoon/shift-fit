import { dateKey, monthKey, readSaved } from "../lib/schedule";
import type { PlannerStoreApi } from "./planner-store";

// Keep the original key and raw Schedule format so existing schedules need no migration.
export const STORAGE_KEY = "shiftfit.schedule.v1";
export type PlannerStorage = Pick<Storage, "getItem" | "setItem">;

export const connectPlannerStorage = (
  store: PlannerStoreApi,
  getStorage: () => PlannerStorage,
  now = new Date(),
) => {
  if (store.getState().storageStatus === "loading") {
    const month = monthKey(now.getFullYear(), now.getMonth());
    const view = { month, today: dateKey(month, now.getDate()), selected: "" };
    try {
      const saved = getStorage().getItem(STORAGE_KEY);
      store.setState({
        ...(saved !== null ? { data: readSaved(saved) } : {}),
        view,
        storageStatus: "saved",
      });
    } catch {
      // Never overwrite the original payload when restoration fails.
      store.setState({ view, storageStatus: "blocked" });
    }
  }

  // UI changes never write storage; saves happen synchronously after a data change.
  // Returning the unsubscribe also makes React Strict Mode effect replay safe.
  return store.subscribe((state, previous) => {
    if (state.data === previous.data || state.storageStatus === "blocked")
      return;
    try {
      getStorage().setItem(STORAGE_KEY, JSON.stringify(state.data));
      if (state.storageStatus !== "saved")
        store.setState({ storageStatus: "saved" });
    } catch {
      if (state.storageStatus !== "failed")
        store.setState({ storageStatus: "failed" });
    }
  });
};
