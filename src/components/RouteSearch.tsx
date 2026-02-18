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

  const originAutoComplete = usePlacesAutocomplete();
  const destinationAutoComplete = usePlacesAutocomplete();

  useEffect(() => {
    if (originAutoComplete.selectedPlace?.formatted_address) {
      setOrigin(originAutoComplete.selectedPlace.formatted_address);
    }
  }, [originAutoComplete.selectedPlace]);

  useEffect(() => {
    if (destinationAutoComplete.selectedPlace?.formatted_address) {
      setDestination(destinationAutoComplete.selectedPlace.formatted_address);
    }
  }, [destinationAutoComplete.selectedPlace]);

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
      {/* <label htmlFor="origin">Starting Point:</label> */}
      <input
        ref={originAutoComplete.inputRef}
        type="text"
        id="origin"
        className="w-full px-4 py-2 border border-gray-700 rounded-md 
             bg-[#1a1a1a] text-gray-100 placeholder:text-gray-500 
             focus:outline-none focus:ring-2 focus:ring-emerald-500"
        placeholder="Enter starting point"
        value={origin}
        onChange={(e) => setOrigin(e.target.value)}
      />

      {/* <label htmlFor="destination">Destination:</label> */}
      <input
        ref={destinationAutoComplete.inputRef}
        type="text"
        id="destination"
        className="w-full px-4 py-2 border border-gray-700 rounded-md 
             bg-[#1a1a1a] text-gray-100 placeholder:text-gray-500 
             focus:outline-none focus:ring-2 focus:ring-emerald-500"
        placeholder="Enter destination"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />

      <button
        className="w-full bg-emerald-600 text-white py-3 px-4 rounded-md hover:bg-emerald-700 transition-colors font-medium shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
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
        className="w-full bg-[#1a1a1a] text-gray-300 py-2 px-4 rounded-md hover:bg-[#0a0a0a] transition-colors text-sm font-medium border border-gray-800 disabled:bg-[#1a1a1a] disabled:cursor-not-allowed"
      >
        🧪 Test: Crowley Dr → WorkSafeBC Richmond
      </button>
    </form>
  );
}
