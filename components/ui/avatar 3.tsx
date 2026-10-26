"use client";
import { useState } from "react";
export type AvatarProps = {
  src?: string;
  alt: string;
  initial?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};
export function Avatar({
  src,
  alt,
  initial,
  size = "md",
  className = "",
}: AvatarProps) {
  const [failed, setFailed] = useState<string>();
  return (
    <span
      role="img"
      aria-label={alt}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-subtle type-label text-brand-content ${size === "sm" ? "size-8" : size === "lg" ? "size-14" : "size-10"} ${className}`}
    >
      {src &&
      failed !==
        src /* Arbitrary consumer image URLs; no Next remotePatterns configuration required. */ ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(src)}
        />
      ) : (
        <span aria-hidden="true">{initial ?? Array.from(alt)[0] ?? "?"}</span>
      )}
    </span>
  );
}
