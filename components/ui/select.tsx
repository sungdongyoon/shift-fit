"use client";

import { useId, type ComponentPropsWithRef } from "react";
import { FaChevronDown } from "react-icons/fa6";

export type SelectProps = Omit<ComponentPropsWithRef<"select">, "children"> & {
  label: string;
  placeholder?: string;
  options: readonly {
    value: string;
    label: string;
    disabled?: boolean;
  }[];
  error?: string;
  helperText?: string;
};

export const Select = ({
  id,
  label,
  options,
  placeholder,
  error,
  helperText,
  className = "",
  "aria-describedby": description,
  ...props
}: SelectProps) => {
  const generated = useId();
  const inputId = id ?? generated;
  const message = error || helperText;

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={inputId} className="type-label text-content">
        {label}
      </label>
      <div className="relative">
        <select
          {...props}
          id={inputId}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={
            [description, message ? `${inputId}-hint` : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={`h-12 w-full min-w-0 appearance-none rounded-control border bg-surface pr-12 pl-3 type-body text-content disabled:bg-disabled disabled:text-content-disabled ${error ? "border-danger" : "border-line-input"} ${className}`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} {...option}>
              {option.label}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-content-secondary">
          <FaChevronDown className="size-3" />
        </span>
      </div>
      {message && (
        <p
          id={`${inputId}-hint`}
          className={`type-caption ${error ? "text-danger" : "text-content-tertiary"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
};
