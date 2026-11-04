import test from "node:test";
import assert from "node:assert/strict";
import { bundledHolidays, parseHolidays } from "../lib/holidays.ts";
import { createHolidayStore } from "../stores/holiday-store.ts";

const item = (locdate, dateName, isHoliday = "Y") => ({ locdate, dateName, isHoliday });

test("음력 명절, 대체공휴일과 선거일의 실제 날짜를 제공한다", () => {
  const days = bundledHolidays[2026];

  assert.equal(days["2026-02-17"], "설날");
  assert.equal(days["2026-05-24"], "부처님오신날");
  assert.equal(days["2026-05-25"], "대체공휴일(부처님오신날)");
  assert.equal(days["2026-06-03"], "전국동시지방선거");
  assert.equal(days["2026-09-25"], "추석");
  assert.equal(days["2026-10-05"], "대체공휴일(개천절)");
  assert.equal(days["2026-10-06"], undefined);
});

test("비공휴일은 제외하고 같은 날의 공휴일은 이름을 합쳐 중복을 제거한다", () => {
  assert.deepEqual(parseHolidays([
    item(20260505, "어린이날"),
    item(20260505, "어린이날"),
    item(20260505, "추가 공휴일"),
    item(20260508, "어버이날", "N"),
  ], 2026), { "2026-05-05": "어린이날 · 추가 공휴일" });

  assert.throws(() => parseHolidays([item(20260230, "잘못된 날짜")], 2026));
  assert.throws(() => parseHolidays([item(20270101, "다른 연도")], 2026));
  assert.throws(() => parseHolidays({ data: [] }, 2026));
});

test("동시 요청과 같은 연도의 재조회는 중복 호출하지 않는다", async () => {
  let requests = 0;
  let finish;
  const store = createHolidayStore(() => {
    requests++;
    return new Promise((resolve) => { finish = resolve; });
  });
  const loading = store.getState().load(2026);

  await store.getState().load(2026);
  assert.equal(requests, 1);
  assert.equal(store.getState().years[2026].days["2026-09-25"], "추석");

  finish(Response.json([item(20260101, "1월1일")]));
  await loading;
  await store.getState().load(2026);
  assert.equal(requests, 1);
  assert.equal(store.getState().years[2026].status, "ready");
});

test("조회 실패 시 기본 공휴일을 유지하고 재시도하면 최신 정보를 반영한다", async () => {
  let fail = true;
  const store = createHolidayStore(async () => {
    if (fail) throw new Error("offline");
    return Response.json([item(20261225, "성탄절"), item(20261104, "임시공휴일")]);
  });

  await store.getState().load(2026);
  assert.equal(store.getState().years[2026].status, "error");
  assert.equal(store.getState().years[2026].days["2026-12-25"], "기독탄신일");

  fail = false;
  await store.getState().load(2026);
  assert.equal(store.getState().years[2026].status, "ready");
  assert.equal(store.getState().years[2026].days["2026-11-04"], "임시공휴일");
});

test("미제공 연도와 잘못된 응답을 공휴일 없음으로 오인하지 않는다", async () => {
  const store = createHolidayStore(async () => new Response(null, { status: 404 }));

  await store.getState().load(2030);
  assert.equal(store.getState().years[2030].status, "unavailable");
  assert.deepEqual(store.getState().years[2030].days, {});

  const invalid = createHolidayStore(async () => Response.json({ unexpected: true }));
  await invalid.getState().load(2026);
  assert.equal(invalid.getState().years[2026].status, "error");
  assert.equal(invalid.getState().years[2026].days["2026-02-17"], "설날");
});

test("연도를 빠르게 이동해도 늦게 도착한 응답이 다른 연도를 덮어쓰지 않는다", async () => {
  let finish2026;
  const store = createHolidayStore(async (url) => {
    if (url.endsWith("2026.json")) {
      return new Promise((resolve) => { finish2026 = resolve; });
    }
    return Response.json([item(20270101, "1월1일")]);
  });
  const first = store.getState().load(2026);

  await store.getState().load(2027);
  finish2026(Response.json([item(20260101, "1월1일")]));
  await first;

  assert.deepEqual(store.getState().years[2027].days, { "2027-01-01": "1월1일" });
  assert.deepEqual(store.getState().years[2026].days, { "2026-01-01": "1월1일" });
});
