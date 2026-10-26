import type { ComponentPropsWithRef, ReactNode } from "react";
import { Icon } from "./icon";
export type CheckboxProps = Omit<ComponentPropsWithRef<"input">, "type"> & {
  label: ReactNode;
};
export const Checkbox = ({
  label,
  className = "",
  ...props
}: CheckboxProps) => {
  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer items-center gap-3 type-body has-disabled:cursor-not-allowed has-disabled:text-content-disabled ${className}`}
    >
      <span className="relative inline-flex size-6 shrink-0">
        <input
          {...props}
          type="checkbox"
          className="peer size-6 appearance-none rounded border border-line-input bg-surface checked:border-brand checked:bg-brand disabled:border-line disabled:bg-disabled"
        />
        <span className="pointer-events-none absolute inset-0 hidden text-on-brand peer-checked:block">
          <Icon name="check" />
        </span>
      </span>
      {label}
    </label>
  );
};
