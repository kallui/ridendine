"use client";

import { useEffect, useState } from "react";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";

interface RouteSearchProps {
  onSearch: (origin: string, destination: string) => void;
  isLoading?: boolean;
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
      setOriginLabel(
        place.name
          ? `${place.name}, ${place.formatted_address}`
          : place.formatted_address,
      );
    }
  }, [originAutoComplete.selectedPlace]);

  useEffect(() => {
    const place = destinationAutoComplete.selectedPlace;
    if (place?.formatted_address) {
      setDestination(place.formatted_address);
      setDestinationLabel(
        place.name
          ? `${place.name}, ${place.formatted_address}`
          : place.formatted_address,
      );
    }
  }, [destinationAutoComplete.selectedPlace]);

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

  const handlePresetSearch = () => {
    const presetOrigin = "3433 Crowley Dr, Vancouver, BC V5R 6C5, Canada";
    const presetDestination =
      "6951 Westminster Hwy, Richmond, BC V7C 1C6, Canada";
    setOrigin(presetOrigin);
    setDestination(presetDestination);
    onSearch(presetOrigin, presetDestination);
  };

  return (
    <form
      className="bg-[#2a2a2a] p-6 rounded-lg shadow-xl flex flex-col gap-4 border border-gray-800"
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

          <input
            ref={destinationAutoComplete.inputRef}
            type="text"
            id="destination"
            className="w-full px-4 py-2 border border-gray-700 rounded-md 
                 bg-[#1a1a1a] text-gray-100 placeholder:text-gray-500 
                 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Destination"
            value={destinationLabel}
            onChange={(e) => {
              setDestinationLabel(e.target.value);
              setDestination(e.target.value);
            }}
          />
        </div>
      </div>

      <button
        className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-primary-hover transition-colors font-medium shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "Search"}
      </button>

      {/* Preset Test Button */}
      <button
        type="button"
        onClick={handlePresetSearch}
        disabled={isLoading}
        className="w-full bg-app-bg text-gray-300 py-2 px-4 rounded-md hover:bg-black transition-colors text-sm font-medium border border-gray-800 disabled:bg-app-bg disabled:cursor-not-allowed"
      >
        🧪 Test: Crowley Dr → WorkSafeBC Richmond
      </button>
    </form>
  );
}
