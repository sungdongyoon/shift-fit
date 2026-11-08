import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAuthConfig } from "@/lib/auth/config";

export const createSupabaseServerClient = async () => {
  const config = getAuthConfig();

  if (!config) throw new Error("Supabase 연결 설정을 확인해 주세요.");

  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. Proxy refreshes them before rendering.
        }
      },
    },
  });
};
