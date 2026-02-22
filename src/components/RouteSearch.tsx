"use client";

import { useEffect, useState } from "react";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";

interface RouteSearchProps {
  onSearch: (origin: string, destination: string) => void;
  isLoading?: boolean;
}

// Format a place for display the way Google Maps does:
// - Named places (restaurants, transit stops, etc.): "Name, City, Province"
// - Plain addresses: just the address, no duplication
// We detect duplication by checking if formatted_address already starts with the name.
function formatPlaceLabel(place: google.maps.places.PlaceResult): string {
  const name = place.name ?? "";
  const address = place.formatted_address ?? "";
  if (!name || address.toLowerCase().startsWith(name.toLowerCase())) {
    return address;
  }
  // Strip the name from the front of the address if it's there further in,
  // to avoid "Pho Tan, Pho Tan Restaurant, 3281..." edge cases
  return `${name}, ${address}`;
}

export default function RouteSearch({ onSearch, isLoading }: RouteSearchProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const [originLabel, setOriginLabel] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");

  const originAutoComplete = usePlacesAutocomplete();
  const destinationAutoComplete = usePlacesAutocomplete();

  useEffect(() => {
    const place = originAutoComplete.selectedPlace;
    if (place?.formatted_address) {
      setOrigin(place.formatted_address);
      setOriginLabel(formatPlaceLabel(place));
    }
  }, [originAutoComplete.selectedPlace]);

  useEffect(() => {
    const place = destinationAutoComplete.selectedPlace;
    if (place?.formatted_address) {
      setDestination(place.formatted_address);
      setDestinationLabel(formatPlaceLabel(place));
    }
  }, [destinationAutoComplete.selectedPlace]);

  // Auto-search when both fields are filled via autocomplete selection.
  // We watch selectedPlace (not origin/destination strings) so this only fires
  // on dropdown picks — not on every keystroke or swap.
  useEffect(() => {
    const o = originAutoComplete.selectedPlace?.formatted_address;
    const d = destinationAutoComplete.selectedPlace?.formatted_address;
    if (o && d) onSearch(o, d);
  }, [originAutoComplete.selectedPlace, destinationAutoComplete.selectedPlace]);

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setOriginLabel(destinationLabel);
    setDestinationLabel(originLabel);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(origin, destination);
  };

  return (
    <form
      className="bg-[#2a2a2a] p-3 sm:p-6 rounded-lg shadow-xl flex flex-col gap-2 sm:gap-4 border border-gray-800"
      onSubmit={handleSubmit}
    >
      {/* Origin + Destination with route line indicator */}
      <div className="flex gap-3">
        {/* Left: journey indicator */}
        <div className="flex flex-col items-center pt-[11px] pb-[11px] shrink-0 w-4">
          {/* Origin: hollow ring */}
          <div className="w-2.5 h-2.5 rounded-full border-2 border-primary shrink-0" />

          {/* Connector: chevrons */}
          <div className="flex flex-col items-center justify-center flex-1 gap-0.5 my-1">
            <svg
              width="8"
              height="5"
              viewBox="0 0 8 5"
              className="text-text-secondary"
              fill="none"
            >
              <path
                d="M1 1L4 4L7 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg
              width="8"
              height="5"
              viewBox="0 0 8 5"
              className="text-text-secondary/70"
              fill="none"
            >
              <path
                d="M1 1L4 4L7 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Destination: rotated diamond */}
          <div className="w-3 h-3 bg-primary rotate-45 rounded-sm shrink-0" />
        </div>

        {/* Right: inputs + swap button */}
        <div className="flex-1 flex flex-col">
          <input
            ref={originAutoComplete.inputRef}
            type="text"
            id="origin"
            className="w-full px-4 py-2 border border-gray-700 rounded-md 
                 bg-[#1a1a1a] text-gray-100 placeholder:text-gray-500 
                 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Starting point"
            value={originLabel}
            onChange={(e) => {
              setOriginLabel(e.target.value);
              setOrigin(e.target.value);
            }}
          />

          {/* Connector row with swap button */}
          <div className="flex justify-end items-center h-5 px-1">
            <button
              type="button"
              onClick={handleSwap}
              title="Swap origin and destination"
              className="text-text-muted hover:text-text-primary transition-colors text-sm leading-none"
            >
              ⇅
            </button>
          </div>

          {/* Destination input — search icon sits inside on mobile */}
          <div className="relative">
            <input
              ref={destinationAutoComplete.inputRef}
              type="text"
              id="destination"
              className="w-full px-4 py-2 pr-10 border border-gray-700 rounded-md
                   bg-[#1a1a1a] text-gray-100 placeholder:text-gray-500
                   focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Destination"
              value={destinationLabel}
              onChange={(e) => {
                setDestinationLabel(e.target.value);
                setDestination(e.target.value);
              }}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-primary disabled:text-gray-600 transition-colors"
              aria-label="Search"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
