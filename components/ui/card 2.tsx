import type { ReactNode } from "react";
export type CardProps = {
  title: string;
  subtitle?: string;
  description?: string;
  href?: string;
  mark?: ReactNode;
  badge?: ReactNode;
  className?: string;
};
export const Card = ({
  title,
  subtitle,
  description,
  href,
  mark,
  badge,
  className = "",
}: CardProps) => {
  const content = (
    <>
      {(mark || badge) && (
        <div className="flex items-start gap-4">
          {mark && (
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-subtle type-heading text-brand-content">
              {mark}
            </span>
          )}
          {badge}
        </div>
      )}
      <h3 className="line-clamp-2 type-headline text-content">{title}</h3>
      {subtitle && (
        <p className="type-label text-content-secondary">{subtitle}</p>
      )}
      {description && (
        <p className="type-body-small text-content-tertiary">{description}</p>
      )}
    </>
  );
  const styles = `flex min-w-0 flex-col gap-4 rounded-panel border border-line bg-surface p-6 ${className}`;
  return href ? (
    <a
      href={href}
      aria-label={title}
      className={`${styles} transition-colors hover:bg-surface-hover`}
    >
      {content}
    </a>
  ) : (
    <article className={styles}>{content}</article>
  );
};
