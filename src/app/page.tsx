import Map from "@/components/Map";

export default function Home() {
  console.log(
    "API Key loaded:",
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "YES ✅" : "NO ❌"
  );

  return (
    <div className="h-screen w-screen">
      <Map centerCoordinate={{ lat: 37.7749, lng: -122.4194 }} zoomLevel={12} />
    </div>
  );
}
