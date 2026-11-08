"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAuthConfig, getSiteUrl } from "@/lib/auth/config";
import {
  validateAuthInput,
  type AuthFormState,
  type AuthMode,
} from "@/lib/auth/forms";
import { runAuthRequest } from "@/lib/auth/requests";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const submitAuth = async (
  mode: AuthMode,
  _previous: AuthFormState,
  form: FormData,
): Promise<AuthFormState> => {
  if (!getAuthConfig())
    return {
      error: "인증 서비스 연결을 준비 중이에요. 잠시 후 다시 이용해 주세요.",
    };

  const input = validateAuthInput(mode, form);

  if (typeof input === "string") return { error: input };

  let result;

  try {
    const supabase = await createSupabaseServerClient();
    result = await runAuthRequest(mode, input, supabase.auth, getSiteUrl());
  } catch {
    return {
      error: "인증 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
      email: input.email,
    };
  }

  if (result.destination) {
    revalidatePath("/", "layout");
    redirect(result.destination);
  }

  return { ...result, email: input.email };
};

export const signOut = async () => {
  let failed = false;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    failed = Boolean(error);
  } catch {
    failed = true;
  }

  if (failed) redirect("/login?notice=signout-failed");

  revalidatePath("/", "layout");
  redirect("/login");
};
