"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Restaurant } from "@/app/page";
import { PHOTO_WIDTH, attributionText, placePhotoSrc } from "@/lib/place-photo";
import { usePlacePhotos } from "@/hooks/usePlacePhotos";

interface PhotoLightboxProps {
  restaurant: Restaurant;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

export default function PhotoLightbox({
  restaurant,
  onClose,
}: PhotoLightboxProps) {
  const photos = usePlacePhotos(
    restaurant.placeId,
    restaurant.photoReference,
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  const count = photos.length;
  const active = count > 0 ? photos[Math.min(activeIndex, count - 1)] : null;
  const attribution = active?.htmlAttributions
    .map(attributionText)
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (count < 2) return;
      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => (index - 1 + count) % count);
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index + 1) % count);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, count]);

  function go(delta: number) {
    if (count < 2) return;
    setActiveIndex((index) => (index + delta + count) % count);
  }

  const lightbox = (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={`${restaurant.name} photos`}
      onClick={onClose}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{restaurant.name}</p>
          {count > 0 && (
            <p className="text-xs text-white/70">
              {Math.min(activeIndex, count - 1) + 1} of {count}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Close photos"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </header>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => {
          touchStartXRef.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartXRef.current;
          touchStartXRef.current = null;
          const end = event.changedTouches[0]?.clientX;
          if (start == null || end == null) return;
          const delta = end - start;
          if (delta > SWIPE_THRESHOLD) go(-1);
          if (delta < -SWIPE_THRESHOLD) go(1);
        }}
      >
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={placePhotoSrc(active.photoReference, PHOTO_WIDTH.gallery)}
            alt={`${restaurant.name} photo ${activeIndex + 1} of ${count}`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <p className="text-sm text-white/70">No photos available</p>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              aria-label="Previous photo"
            >
              <Chevron direction="left" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              aria-label="Next photo"
            >
              <Chevron direction="right" />
            </button>
          </>
        )}
      </div>

      <footer
        className="shrink-0 px-4 pb-5 pt-3"
        onClick={(event) => event.stopPropagation()}
      >
        {attribution && (
          <p className="mb-2 text-center text-[11px] text-white/60">
            Photo: {attribution}
          </p>
        )}
        {count > 1 && (
          <div className="flex justify-center gap-1.5 overflow-x-auto">
            {photos.map((photo, index) => (
              <button
                key={photo.photoReference}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded border-2 ${
                  index === activeIndex
                    ? "border-white"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
                aria-label={`Show photo ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={placePhotoSrc(photo.photoReference, PHOTO_WIDTH.thumb)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(lightbox, document.body);
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={direction === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
      />
    </svg>
  );
}
