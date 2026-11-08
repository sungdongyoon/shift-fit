import type { NextRequest } from "next/server";
import { refreshAuthSession } from "@/lib/supabase/proxy";

export const proxy = (request: NextRequest) => refreshAuthSession(request);

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/update-password",
    "/auth/:path*",
  ],
};
