import type { ComponentPropsWithRef } from "react";
export type ButtonProps = ComponentPropsWithRef<"button"> & {
  appearance?: "primary" | "secondary" | "solid" | "outline" | "text";
  size?: "sm" | "md" | "lg";
};
const variants = {
  primary:
    "bg-brand text-on-brand enabled:hover:bg-brand-hover enabled:active:bg-brand-pressed",
  solid:
    "bg-brand text-on-brand enabled:hover:bg-brand-hover enabled:active:bg-brand-pressed",
  secondary:
    "border border-line bg-canvas text-brand-content enabled:hover:bg-surface-hover",
  outline:
    "border border-line bg-canvas text-brand-content enabled:hover:bg-surface-hover",
  text: "text-brand-content enabled:hover:bg-surface-hover",
};
export function Button({
  appearance = "solid",
  size = "md",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-control px-5 type-body-strong transition-colors disabled:cursor-not-allowed disabled:bg-disabled disabled:text-content-disabled ${size === "sm" ? "min-h-10" : size === "lg" ? "min-h-14" : "min-h-12"} ${variants[appearance]} ${className}`}
    />
  );
}
