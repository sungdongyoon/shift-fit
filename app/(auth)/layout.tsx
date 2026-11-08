import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/auth-shell";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return <AuthShell>{children}</AuthShell>;
};

export default AuthLayout;
