"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fromPlannerRows,
  parsePlannerChanges,
  type PlannerResult,
  type PlannerSnapshot,
} from "@/lib/planner-data";

const databaseError = (code?: string, message?: string) => {
  if (code === "40001" || message?.includes("SCHEDULE_CONFLICT")) {
    return {
      error:
        "다른 창에서 근무표가 변경됐어요. 작성 내용을 확인한 뒤 최신 근무표를 다시 불러와 주세요.",
      conflict: true,
    };
  }
  if (code === "PGRST202" || code === "42P01")
    return {
      error: "근무표 저장소를 준비 중이에요. 잠시 후 다시 시도해 주세요.",
    };
  if (code === "42501")
    return {
      error: "근무표 접근 권한을 확인해 주세요. 다시 로그인해야 할 수 있어요.",
    };
  if (message?.includes("ASSIGNMENT_BEFORE_START_DATE"))
    return { error: "근무 시작일 이전에 배정된 일정이 있어요. 시작일과 일정을 확인해 주세요." };
  if (code === "23505")
    return {
      error: "같은 이름의 근무자나 근무 타입이 있어요. 이름을 확인해 주세요.",
    };

  return {
    error:
      "근무표를 처리하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.",
  };
};

export const loadPlanner = async (): Promise<
  PlannerResult<PlannerSnapshot>
> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: user, error: authError } = await supabase.auth.getUser();

    if (authError || !user.user)
      return { ok: false, error: "로그인 후 근무표를 불러와 주세요." };

    const { data, error } = await supabase.rpc("read_planner");

    if (error)
      return { ok: false, ...databaseError(error.code, error.message) };

    return { ok: true, value: fromPlannerRows(data) };
  } catch {
    return {
      ok: false,
      error: "근무표를 불러오지 못했어요. 연결 상태를 확인해 주세요.",
    };
  }
};

export const savePlanner = async (
  input: unknown,
  revision: number,
): Promise<PlannerResult<number>> => {
  if (!Number.isSafeInteger(revision) || revision < 0)
    return { ok: false, error: "저장 버전을 확인해 주세요." };

  let payload;

  try {
    payload = parsePlannerChanges(input);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "근무표 내용을 확인해 주세요.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: user, error: authError } = await supabase.auth.getUser();

    if (authError || !user.user)
      return { ok: false, error: "로그인 후 근무표를 저장해 주세요." };

    const { data, error } = await supabase.rpc("save_planner_changes", {
      p_revision: revision,
      p_data: payload,
    });

    if (error)
      return { ok: false, ...databaseError(error.code, error.message) };
    if (!Number.isSafeInteger(data) || data < 1)
      return {
        ok: false,
        error:
          "저장 결과를 확인하지 못했어요. 최신 근무표를 다시 불러와 주세요.",
      };

    return { ok: true, value: data };
  } catch {
    return {
      ok: false,
      error:
        "근무표를 저장하지 못했어요. 작성 내용은 유지되며 다시 저장할 수 있어요.",
    };
  }
};
