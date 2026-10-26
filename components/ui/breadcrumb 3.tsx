import { Fragment } from "react";
import { Icon } from "./icon";
export type BreadcrumbProps = {
  items: readonly { label: string; href?: string }[];
  label?: string;
  className?: string;
};
export function Breadcrumb({
  items,
  label = "현재 위치",
  className = "",
}: BreadcrumbProps) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-2 type-label">
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            <li className="inline-flex min-h-8 items-center gap-2">
              {index > 0 && (
                <Icon name="chevron-right" className="text-content-secondary" />
              )}
              {index === items.length - 1 ? (
                <span aria-current="page" className="text-content">
                  {item.label}
                </span>
              ) : item.href ? (
                <a
                  href={item.href}
                  className="text-content-secondary hover:underline"
                >
                  {item.label}
                </a>
              ) : (
                <span className="text-content-secondary">{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
