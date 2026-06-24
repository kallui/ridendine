import Link from "next/link";
import Image from "next/image";

interface NavbarProps {
  themeMode: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Navbar({ themeMode, onToggleTheme }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-card-bg/95 backdrop-blur-md text-text-primary px-6 py-3 shadow-lg border-b border-border">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center opacity-90 hover:opacity-100 transition-opacity">
          <Image
            src="/logo-64.png"
            alt="Ride'N'Dine"
            width={48}
            height={48}
            className="h-12 w-12"
            priority
          />
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/about"
            className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            About
          </Link>

          <a
            href="https://github.com/kallui/ride-n-dine"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            aria-label="View on GitHub"
            title="View on GitHub"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
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
      </div>
    </nav>
  );
}
