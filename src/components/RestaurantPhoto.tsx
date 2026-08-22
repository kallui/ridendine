"use client";

import { useState } from "react";
import { PHOTO_WIDTH, placePhotoSrc } from "@/lib/place-photo";

interface RestaurantPhotoProps {
  photoReference?: string;
  alt: string;
  width?: number;
  className?: string;
  sizes?: string;
  eager?: boolean;
  clickable?: boolean;
}

export default function RestaurantPhoto({
  photoReference,
  alt,
  width = PHOTO_WIDTH.thumb,
  className = "",
  sizes,
  eager = false,
  clickable = false,
}: RestaurantPhotoProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(photoReference) && !failed;
  const initial = alt.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`relative overflow-hidden bg-border/70 ${className}`}
      aria-hidden={!showImage}
    >
      {showImage ? (
        // Proxied Google Place Photo — not a remote next/image host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={placePhotoSrc(photoReference!, width)}
          alt={alt}
          width={width}
          height={width}
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className={`h-full w-full object-cover ${
            clickable
              ? "transition duration-200 group-hover:scale-[1.03] group-hover:brightness-90"
              : ""
          }`}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-text-muted">
          {initial}
        </div>
      )}
    </div>
  );
}
