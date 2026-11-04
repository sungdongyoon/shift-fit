"use client";

import { useEffect } from "react";
import { useStore } from "zustand";
import { bundledHolidays } from "@/lib/holidays";
import { createHolidayStore } from "@/stores/holiday-store";

// Only public holiday data is shared. Employee schedules stay in the planner provider.
const holidayStore = createHolidayStore();
const EMPTY_DAYS = {};

export const useHolidays = (year: number) => {
  const entry = useStore(holidayStore, (state) => state.years[year]);
  const load = useStore(holidayStore, (state) => state.load);

  useEffect(() => {
    if (year) void load(year);
  }, [year, load]);

  return {
    holidays: entry?.days ?? bundledHolidays[year] ?? EMPTY_DAYS,
    status: entry?.status,
    retry: () => void load(year),
  };
};
