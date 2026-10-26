import type { ComponentPropsWithRef, ReactNode } from "react";
export type SwitchProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "role"
> & {
  label: ReactNode;
};
export const Switch = ({ label, className = "", ...props }: SwitchProps) => {
  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer items-center gap-3 type-body has-disabled:cursor-not-allowed has-disabled:text-content-disabled ${className}`}
    >
      <span className="relative inline-flex h-6 w-11 shrink-0">
        <input
          {...props}
          type="checkbox"
          role="switch"
          className="peer h-6 w-11 appearance-none rounded-full border border-line-input bg-surface checked:border-brand checked:bg-brand disabled:border-line disabled:bg-disabled"
        />
        <span className="pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-on-brand shadow-sm transition-transform peer-checked:translate-x-5 motion-reduce:transition-none" />
      </span>
      {label}
    </label>
  );
};
