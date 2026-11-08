import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { getAuthConfig } from "./config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  // Session expiry checks read the clock; keep SDK initialization out of prerendering.
  // This must stay outside try/catch so Next.js can suspend prerendering normally.
  await connection();

  if (!getAuthConfig()) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) return null;

    return { id: data.user.id, email: data.user.email ?? "" };
  } catch {
    return null;
  }
});
