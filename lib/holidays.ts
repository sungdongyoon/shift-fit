import snapshot from "./korean-holidays.json";

export type HolidayMap = Record<string, string>;

// KASI Special Days data, distributed by this public mirror.
// https://www.data.go.kr/data/15012690/openapi.do
// https://github.com/raki-1203/korean-holidays (MIT)
export const holidaySource = (year: number) =>
  `https://raw.githubusercontent.com/raki-1203/korean-holidays/main/holidays/${year}.json`;

export const parseHolidays = (payload: unknown, year: number): HolidayMap => {
  if (!Array.isArray(payload)) throw new Error("공휴일 데이터 형식 오류");

  const names = new Map<string, Set<string>>();

  for (const item of payload) {
    if (!item || typeof item !== "object") {
      throw new Error("공휴일 데이터 형식 오류");
    }

    const { locdate, dateName, isHoliday } = item;

    if (isHoliday !== "Y" && isHoliday !== "N") {
      throw new Error("공휴일 데이터 형식 오류");
    }

    if (isHoliday !== "Y") continue;

    const raw = String(locdate);
    const month = Number(raw.slice(4, 6));
    const day = Number(raw.slice(6, 8));
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      !/^\d{8}$/.test(raw) ||
      Number(raw.slice(0, 4)) !== year ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day ||
      typeof dateName !== "string" ||
      !dateName.trim()
    ) {
      throw new Error("공휴일 날짜 또는 이름 오류");
    }

    const key = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    const existing = names.get(key) ?? new Set<string>();
    existing.add(dateName.trim());
    names.set(key, existing);
  }

  return Object.fromEntries(
    Array.from(names, ([date, holidays]) => [date, [...holidays].join(" · ")]),
  );
};

export const bundledHolidays = Object.fromEntries(
  Object.entries(snapshot).map(([year, items]) => [
    Number(year),
    parseHolidays(items, Number(year)),
  ]),
) as Record<number, HolidayMap>;
