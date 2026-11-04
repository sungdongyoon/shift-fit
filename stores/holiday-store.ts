import { createStore } from "zustand/vanilla";
import { bundledHolidays, holidaySource, parseHolidays, type HolidayMap } from "../lib/holidays";

export type HolidayEntry = {
  days: HolidayMap;
  status: "loading" | "ready" | "unavailable" | "error";
  checkedAt: number;
};

type HolidayStore = {
  years: Record<number, HolidayEntry>;
  load: (year: number) => Promise<void>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const createHolidayStore = (fetcher: typeof fetch = fetch) =>
  createStore<HolidayStore>()((set, get) => ({
    years: {},
    load: async (year) => {
      if (!Number.isInteger(year) || year < 1900 || year > 9999) return;

      const previous = get().years[year];

      if (
        previous?.status === "loading" ||
        (previous?.status === "ready" && Date.now() - previous.checkedAt < DAY_MS)
      ) return;

      const days = previous?.days ?? bundledHolidays[year] ?? {};
      const update = (entry: HolidayEntry) =>
        set((state) => ({ years: { ...state.years, [year]: entry } }));

      update({ days, status: "loading", checkedAt: 0 });

      try {
        const response = await fetcher(holidaySource(year), {
          signal: AbortSignal.timeout(5000),
        });

        if (response.status === 404) {
          update({ days, status: "unavailable", checkedAt: 0 });
          return;
        }

        if (!response.ok) throw new Error("공휴일 조회 실패");

        const fresh = parseHolidays(await response.json(), year);

        if (!Object.keys(fresh).length) {
          update({ days, status: "unavailable", checkedAt: 0 });
          return;
        }

        update({ days: fresh, status: "ready", checkedAt: Date.now() });
      } catch {
        // Keep bundled/previous data available when offline or the source fails.
        update({ days, status: "error", checkedAt: 0 });
      }
    },
  }));
