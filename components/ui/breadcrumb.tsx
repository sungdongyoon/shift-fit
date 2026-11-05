import { Icon } from "./icon";

export type BreadcrumbProps = {
  items: readonly {
    label: string;
    href?: string;
  }[];
  label?: string;
  className?: string;
};

const BreadcrumbLabel = ({
  item,
  isCurrent,
}: {
  item: BreadcrumbProps["items"][number];
  isCurrent: boolean;
}) => {
  if (isCurrent) {
    return <span aria-current="page" className="text-content">{item.label}</span>;
  }

  if (item.href) {
    return <a href={item.href} className="text-content-secondary hover:underline">{item.label}</a>;
  }

  return <span className="text-content-secondary">{item.label}</span>;
};

export const Breadcrumb = ({
  items,
  label = "현재 위치",
  className = "",
}: BreadcrumbProps) => {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-2 type-label">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="inline-flex min-h-8 items-center gap-2">
            {index > 0 && (
              <Icon name="chevron-right" className="text-content-secondary" />
            )}
            <BreadcrumbLabel item={item} isCurrent={index === items.length - 1} />
          </li>
        ))}
      </ol>
    </nav>
  );
};
