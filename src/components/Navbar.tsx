interface NavbarProps {
  themeMode: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Navbar({ themeMode, onToggleTheme }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-card-bg/95 backdrop-blur-md text-text-primary px-6 py-3 shadow-lg border-b border-border">
      <div className="flex items-center justify-between">
        <a
          href="/"
          className="text-xl sm:text-2xl font-bold text-primary hover:text-primary-hover transition-colors"
        >
          Ride&apos;N&apos;Dine
        </a>
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-primary/50 transition-colors"
          aria-label="Toggle theme"
          title={
            themeMode === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          {themeMode === "dark" ? (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 3v2.5m0 13V21m9-9h-2.5M5.5 12H3m15.364 6.364-1.768-1.768M7.404 7.404 5.636 5.636m12.728 0-1.768 1.768M7.404 16.596l-1.768 1.768M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
              />
            </svg>
          )}
          <span className="sr-only">
            {themeMode === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"}
          </span>
        </button>
      </div>
    </nav>
  );
}
