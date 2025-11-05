"use client";

import { useState } from "react";

export default function RouteSearch() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Handle form submission logic here
  };

  return (
    <form
      className="bg-white p-6 rounded-lg shadow-xl flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      {/* <label htmlFor="origin">Starting Point:</label> */}
      <input
        type="text"
        id="origin"
        className="w-full px-4 py-2 border border-gray-300 rounded-md 
             text-gray-900 placeholder:text-gray-500 
             focus:outline-none focus:ring-2 focus:ring-sky-500"
        placeholder="Enter starting point"
        value={origin}
        onChange={(e) => setOrigin(e.target.value)}
      />

      {/* <label htmlFor="destination">Destination:</label> */}
      <input
        type="text"
        id="destination"
        className="w-full px-4 py-2 border border-gray-300 rounded-md 
             text-gray-900 placeholder:text-gray-500 
             focus:outline-none focus:ring-2 focus:ring-sky-500"
        placeholder="Enter destination"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />

      <button
        className="w-full bg-sky-600 text-white py-3 px-4 rounded-md hover:bg-sky-700 transition-colors font-medium shadow-sm"
        type="submit"
      >
        Search
      </button>
    </form>
  );
}
