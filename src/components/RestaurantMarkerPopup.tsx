"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { motion, useReducedMotion } from "framer-motion";
import { Restaurant } from "@/app/page";
import { PHOTO_WIDTH } from "@/lib/place-photo";
import { RestaurantDetails } from "./RestaurantShared";
import RestaurantPhoto from "./RestaurantPhoto";
import { usePlacePhotos } from "@/hooks/usePlacePhotos";
import { useEffect, useRef } from "react";

interface RestaurantMarkerPopupProps {
  restaurant: Restaurant;
  position: google.maps.LatLngLiteral;
  fromName: string;
  open: boolean;
  onClose?: () => void;
  onOpenPhotos?: (restaurant: Restaurant) => void;
  onExited?: () => void;
  /** Preview from list hover: no close control, ignores pointer events. */
  preview?: boolean;
}

const openSpring = { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.75 };
const previewSpring = { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.55 };
const closeTween = { duration: 0.2, ease: [0.4, 0, 1, 1] as const };

export default function RestaurantMarkerPopup({
  restaurant,
  position,
  fromName,
  open,
  onClose,
  onOpenPhotos,
  onExited,
  preview = false,
}: RestaurantMarkerPopupProps) {
  const photos = usePlacePhotos(
    restaurant.placeId,
    restaurant.photoReference,
  );
  const photoCount = photos.length;
  const popupRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = popupRef.current;
    if (!el || preview) return;
    google.maps.OverlayView.preventMapHitsAndGesturesFrom(el);
  }, [preview, restaurant.placeId]);

  const phase = open ? "card" : "tag";
  const spring = preview ? previewSpring : openSpring;

  return (
    <AdvancedMarker
      position={position}
      zIndex={1000}
      onClick={(event) => event.stop()}
    >
      <div
        ref={popupRef}
        className={`restaurant-map-popup relative ${preview ? "pointer-events-none" : ""}`}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <motion.div
          className="relative origin-bottom"
          initial={reduceMotion ? "card" : "tag"}
          animate={phase}
          variants={{
            tag: {
              scale: reduceMotion ? 1 : 0.28,
              opacity: open ? 1 : 0,
              transition: open ? spring : closeTween,
            },
            card: {
              scale: 1,
              opacity: 1,
              transition: spring,
            },
          }}
          onAnimationComplete={(definition) => {
            if (definition === "tag" && !open) onExited?.();
          }}
        >
          <motion.div
            className="relative min-w-[280px] max-w-[320px] cursor-text overflow-hidden rounded-lg border-2 border-border border-b-restaurant bg-card-bg p-3 shadow-2xl"
            variants={{
              tag: {
                opacity: 0,
                y: reduceMotion ? 0 : 10,
                transition: { duration: 0.12 },
              },
              card: {
                opacity: 1,
                y: 0,
                transition: { delay: preview ? 0.02 : 0.06, duration: 0.22 },
              },
            }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-restaurant" />
            {!preview && onClose && (
              <div className="absolute right-2 top-2 z-10">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-card-bg/80 p-1.5 hover:bg-app-bg transition-colors"
                  aria-label="Close"
                >
                  <svg
                    className="h-5 w-5 text-gray-400 hover:text-gray-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenPhotos?.(restaurant);
              }}
              className={`group relative mb-3 block w-full overflow-hidden rounded-md ${
                preview ? "pointer-events-none" : ""
              }`}
              aria-label={`View photos of ${restaurant.name}`}
            >
              <RestaurantPhoto
                photoReference={
                  photos[0]?.photoReference ?? restaurant.photoReference
                }
                alt={restaurant.name}
                width={PHOTO_WIDTH.card}
                eager
                className="h-28 w-full"
                clickable
              />
              {photoCount > 1 && (
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {photoCount} photos
                </span>
              )}
            </button>

            <h3 className="mb-2 pr-6 text-base font-bold leading-tight text-text-primary">
              {restaurant.name}
            </h3>

            <RestaurantDetails restaurant={restaurant} variant="infowindow" />
          </motion.div>

          <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-[calc(100%-2px)]">
            <div className="h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-restaurant" />
          </div>
        </motion.div>

        <motion.div
          className="pointer-events-none absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center drop-shadow-sm"
          initial={reduceMotion ? false : "tag"}
          animate={phase}
          variants={{
            tag: {
              opacity: 1,
              scale: 1,
              transition: open ? { duration: 0.12 } : { delay: 0.04, duration: 0.14 },
            },
            card: {
              opacity: 0,
              scale: 1.08,
              transition: { duration: 0.16 },
            },
          }}
        >
          <div className="max-w-[11rem] truncate rounded-md bg-restaurant px-1.5 py-0.5 text-[11px] font-medium text-white">
            {fromName}
          </div>
          <div className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-restaurant" />
        </motion.div>
      </div>
    </AdvancedMarker>
  );
}
