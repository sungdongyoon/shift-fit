import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const GET = async (request: NextRequest) => {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let destination = "/login?notice=invalid-link";

  if (
    tokenHash &&
    (type === "email" || type === "signup" || type === "recovery")
  ) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (!error) destination = type === "recovery" ? "/update-password" : "/";
    } catch {
      // Only fixed local destinations are accepted, even when verification fails.
    }
  }

  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
};
