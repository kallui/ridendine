#!/usr/bin/env node
/**
 * Forwards CLI filters into env vars, then runs the GTFS smoke vitest suite.
 *
 * Prefer calling this file directly (npm may swallow --flags on some versions):
 *
 *   node scripts/gtfs-smoke/cli.mjs
 *   node scripts/gtfs-smoke/cli.mjs --city=vancouver
 *   node scripts/gtfs-smoke/cli.mjs --id=TL-1
 *   node scripts/gtfs-smoke/cli.mjs --id=TL-1 --restaurants
 *
 * Always overwritten on each run:
 *   scripts/gtfs-smoke/reports/last-run.log      — full console output
 *   scripts/gtfs-smoke/reports/last-report.md    — stop-name review tables
 */
import { spawn } from "node:child_process";
import { mkdirSync, createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const reportsDir = path.join(root, "scripts/gtfs-smoke/reports");
const logPath = path.join(reportsDir, "last-run.log");

function parseArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return undefined;
}

const city = parseArg("city");
const caseId = parseArg("id") ?? parseArg("case");
const restaurants = process.argv.includes("--restaurants");
const env = { ...process.env, FORCE_COLOR: "0" };
if (city) env.SMOKE_CITY = city;
if (caseId) env.SMOKE_CASE = caseId;
if (restaurants) env.SMOKE_RESTAURANTS = "true";

mkdirSync(reportsDir, { recursive: true });
const logStream = createWriteStream(logPath, { flags: "w" });

const header = [
  `GTFS smoke run — ${new Date().toISOString()}`,
  `cwd: ${root}`,
  `filters: city=${city ?? env.SMOKE_CITY ?? "*"} id=${caseId ?? env.SMOKE_CASE ?? "*"} restaurants=${restaurants || env.SMOKE_RESTAURANTS === "true"}`,
  "",
].join("\n");

logStream.write(header);
process.stdout.write(header);

if (!city && !caseId && !env.SMOKE_CITY && !env.SMOKE_CASE) {
  const tip =
    "Running ALL GTFS smoke cases (slow). Filter with:\n" +
    "  node scripts/gtfs-smoke/cli.mjs --city=vancouver\n" +
    "  node scripts/gtfs-smoke/cli.mjs --id=TL-1\n" +
    "  node scripts/gtfs-smoke/cli.mjs --id=TL-1 --restaurants\n\n";
  logStream.write(tip);
  process.stdout.write(tip);
}

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "--config", "vitest.smoke.config.ts", "--reporter=verbose"],
  {
    cwd: root,
    env,
    shell: process.platform === "win32",
  },
);

function tee(chunk, toStdout) {
  const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
  logStream.write(text);
  if (toStdout) process.stdout.write(text);
  else process.stderr.write(text);
}

child.stdout.on("data", (chunk) => tee(chunk, true));
child.stderr.on("data", (chunk) => tee(chunk, false));

child.on("error", (err) => {
  const msg = `Failed to start smoke run: ${err.message}\n`;
  logStream.write(msg);
  process.stderr.write(msg);
  logStream.end(() => process.exit(1));
});

child.on("close", (code) => {
  const footer = `\n---\nExit code: ${code ?? 1}\nLog file: ${logPath}\nReport: ${path.join(reportsDir, "last-report.md")}\n`;
  logStream.write(footer);
  process.stdout.write(footer);
  logStream.end(() => process.exit(code ?? 1));
});
