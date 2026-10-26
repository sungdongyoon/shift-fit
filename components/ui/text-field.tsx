"use client";
import { useId, type ComponentPropsWithRef } from "react";
export type TextFieldProps = ComponentPropsWithRef<"input"> & {
  label: string;
  helperText?: string;
  error?: string;
};
export const TextField = ({
  id,
  label,
  helperText,
  error,
  className = "",
  "aria-describedby": description,
  ...props
}: TextFieldProps) => {
  const generated = useId();
  const inputId = id ?? generated;
  const message = error || helperText;
  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={inputId} className="type-label text-content">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={
          [description, message ? `${inputId}-hint` : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`h-12 min-w-0 rounded-control border bg-surface px-3 type-body text-content placeholder:text-content-tertiary disabled:bg-disabled disabled:text-content-disabled ${error ? "border-danger" : "border-line-input"} ${className}`}
      />
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
