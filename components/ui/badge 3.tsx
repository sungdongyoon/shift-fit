import type { ComponentPropsWithRef } from "react";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

export const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-hover text-content-secondary",
  brand: "bg-brand-subtle text-brand-content",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
};
export type BadgeProps = ComponentPropsWithRef<"span"> & { tone?: Tone };
export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={`inline-flex min-h-7 items-center justify-center rounded px-3 type-caption ${toneClasses[tone]} ${className}`}
    />
  );
}
