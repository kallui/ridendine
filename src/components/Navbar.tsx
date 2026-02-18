export default function Navbar() {
  return (
    <nav className="bg-card-bg text-white px-6 py-4 shadow-lg border-b border-gray-800">
      <div className="flex items-center justify-between">
        <a
          href="/"
          className="text-2xl font-bold text-primary hover:text-primary-hover transition-colors"
        >
          Ride&apos;N&apos;Dine
        </a>
      </div>
    </nav>
  );
}
