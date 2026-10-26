"use client";
import { useId, useRef, type ReactNode } from "react";
export type TabItem = {
  value: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
};
export type TabsProps = {
  items: readonly TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  className?: string;
};
export function Tabs({
  items,
  value,
  onValueChange,
  label,
  className = "",
}: TabsProps) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index >= 0);
  const selected = items.findIndex(
    (item) => item.value === value && !item.disabled,
  );
  const active = selected >= 0 ? selected : enabled[0];
  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex overflow-x-auto">
        {items.map((item, index) => (
          <button
            key={item.value}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={index === active}
            tabIndex={index === active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(event) => {
              if (
                !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const position = enabled.indexOf(index);
              const next =
                event.key === "Home"
                  ? enabled[0]
                  : event.key === "End"
                    ? enabled.at(-1)
                    : enabled[
                        (position +
                          (event.key === "ArrowRight" ? 1 : -1) +
                          enabled.length) %
                          enabled.length
                      ];
              if (next !== undefined) {
                buttons.current[next]?.focus();
                onValueChange(items[next].value);
              }
            }}
            className={`min-h-12 min-w-0 flex-1 border-b-2 px-4 type-body-strong whitespace-nowrap disabled:text-content-disabled ${index === active ? "border-brand text-brand-content" : "border-transparent text-content-secondary enabled:hover:bg-surface-hover"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.value}
          id={`${id}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${index}`}
          hidden={index !== active}
          tabIndex={0}
          className="py-5 type-body"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
