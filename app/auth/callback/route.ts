import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const GET = async (request: NextRequest) => {
  const code = request.nextUrl.searchParams.get("code");
  let destination = "/login?notice=invalid-link";

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        destination =
          request.nextUrl.searchParams.get("next") === "/update-password"
            ? "/update-password"
            : "/";
      }
    } catch {
      // Expired or reused links return to the login page without exposing tokens.
    }
  }

  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
};
