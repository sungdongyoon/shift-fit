"use client";
import type { ComponentPropsWithRef } from "react";
export type ChipProps = Omit<
  ComponentPropsWithRef<"button">,
  "onChange" | "aria-pressed"
> & {
  selected: boolean;
  onSelectedChange?: (selected: boolean) => void;
};
export const Chip = ({
  selected,
  onSelectedChange,
  onClick,
  children,
  className = "",
  type = "button",
  ...props
}: ChipProps) => {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={selected}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onSelectedChange?.(!selected);
      }}
      className={`group inline-flex min-h-11 items-center rounded-full disabled:cursor-not-allowed ${className}`}
    >
      <span
        className={`inline-flex min-h-9 items-center justify-center rounded-full border px-4 type-label group-disabled:border-line group-disabled:bg-surface group-disabled:text-content-disabled ${selected ? "border-focus bg-brand-subtle text-brand-content" : "border-line bg-surface text-content-secondary group-hover:bg-surface-hover"}`}
      >
        {children}
      </span>
    </button>
  );
};
