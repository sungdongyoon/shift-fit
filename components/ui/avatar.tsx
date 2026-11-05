"use client";

import { useState } from "react";

export type AvatarProps = {
  src?: string;
  alt: string;
  initial?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
};

export const Avatar = ({
  src,
  alt,
  initial,
  size = "md",
  className = "",
}: AvatarProps) => {
  const [failedSource, setFailedSource] = useState<string>();
  const showImage = Boolean(src) && failedSource !== src;

  return (
    <span
      role="img"
      aria-label={alt}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-subtle type-label text-brand-content ${sizeClasses[size]} ${className}`}
    >
      {showImage ? (
        // Native img supports arbitrary consumer URLs without Next remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setFailedSource(src)}
        />
      ) : (
        <span aria-hidden="true">{initial ?? Array.from(alt)[0] ?? "?"}</span>
      )}
    </span>
  );
};
