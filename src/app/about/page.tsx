"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useThemeMode } from "@/hooks/useThemeMode";

export default function AboutPage() {
  const { themeMode, toggleTheme } = useThemeMode();

  return (
    <div className="min-h-screen bg-app-bg text-text-primary">
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
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            About Ride&apos;N&apos;Dine
          </h1>
          <p className="text-text-muted text-sm">
            A small tool for commuters who are also hungry.
          </p>
        </div>

        {/* The problem */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            The problem
          </h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>
              You commute every day, but you rarely discover the restaurants and
              cafes that exist along your route. You either default to the same
              spots or spend time separately searching for places — without
              knowing which ones are actually convenient to reach mid-commute.
            </p>
            <p>
              Ride&apos;N&apos;Dine maps your commute and surfaces food stops
              that are within a short walk of your transit path, so you can
              decide before you leave rather than while you&apos;re on the bus.
            </p>
          </div>
        </section>

        {/* How to use */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            How to use it
          </h2>
          <ol className="space-y-4">
            {[
              {
                step: "1",
                title: "Enter your route",
                body: "Type an origin and destination — anywhere in Metro Vancouver. The app works with transit routes (bus, SkyTrain, SeaBus).",
              },
              {
                step: "2",
                title: "Pick a route alternative",
                body: "If Google Maps suggests multiple transit options, choose the one that suits you. Each option shows estimated travel time.",
              },
              {
                step: "3",
                title: "Browse restaurants along the way",
                body: "The app finds food spots within a 5-minute walk of your transit path. Filter by rating or price, and tap any pin on the map for details.",
              },
              {
                step: "4",
                title: "Open in Google Maps",
                body: "Found somewhere you like? Tap the card to open the place directly in Google Maps and get walking directions.",
              },
            ].map(({ step, title, body }) => (
              <li key={step} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-text-secondary">
                  {step}
                </span>
                <div>
                  <p className="font-medium text-text-primary">{title}</p>
                  <p className="text-text-secondary text-sm leading-relaxed mt-0.5">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Limits */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Usage limits
          </h2>
          <p className="text-text-secondary leading-relaxed text-sm">
            Each session gets <strong className="text-text-primary">5 route searches per day</strong>. This keeps
            the app sustainable during beta — the limit resets at midnight and
            browsing restaurants on an already-searched route is free.
          </p>
        </section>

        {/* Footer / GitHub */}
        <div className="border-t border-border pt-8 flex items-center justify-between">
          <p className="text-text-muted text-sm">
            Built by{" "}
            <a
              href="https://github.com/kallui"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-hover transition-colors"
            >
              kallui
            </a>
          </p>
          <a
            href="https://github.com/kallui/ride-n-dine"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg
              className="h-5 w-5"
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
