"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useThemeMode } from "@/hooks/useThemeMode";

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { themeMode, toggleTheme } = useThemeMode();

  return (
    <div className="h-screen overflow-y-auto bg-app-bg text-text-primary">
      <Navbar themeMode={themeMode} onToggleTheme={toggleTheme} />

      <main className="max-w-2xl mx-auto px-6 pt-28 pb-16">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to app
          </Link>
        </div>

        {/* MDX content */}
        <div className="mdx-content mb-10">{children}</div>

        {/* Footer */}
        <div className="border-t border-border pt-8 flex items-center justify-between text-[0.9375rem]">
          <p className="text-text-muted">
            -{" "}
            <span className="inline-flex items-center gap-1">
              <a
                href="https://github.com/kallui"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:text-brand-hover transition-colors"
              >
                kallui
              </a>
              <span
                className="kiki-mascot"
                role="img"
                aria-label="Kiki"
              />
            </span>
          </p>
          <a
            href="https://github.com/kallui/ride-n-dine"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg
              className="h-[1.1em] w-[1.1em]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            View on GitHub
          </a>
        </div>
      </main>
    </div>
  );
}
