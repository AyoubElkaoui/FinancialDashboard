#!/usr/bin/env node
/**
 * Start backend + frontend simultaneously.
 * Run: npm run dev  (from project root)
 *
 * Auto-installs deps if node_modules are missing.
 */
import { existsSync } from "fs";
import { execSync, spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root      = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendDir  = resolve(root, "backend");
const frontendDir = resolve(root, "frontend");

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const BLUE   = "\x1b[34m";
const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM    = "\x1b[2m";

function ensureInstalled(dir, label) {
  if (!existsSync(resolve(dir, "node_modules"))) {
    console.log(`${YELLOW}📦 Installeer ${label} packages...${RESET}`);
    execSync("npm install", { cwd: dir, stdio: "inherit" });
  }
}

// ─── Free ports before starting ───────────────────────────────────────────────
function killPort(port) {
  // Try fuser first (Linux)
  try { execSync(`fuser -k ${port}/tcp 2>/dev/null`, { stdio: "ignore", shell: true }); return; } catch { /* */ }
  // Fallback: lsof (macOS / some Linux)
  try {
    const out = execSync(`lsof -ti:${port} 2>/dev/null`, { encoding: "utf8", shell: true }).trim();
    if (out) execSync(`kill -9 ${out} 2>/dev/null`, { stdio: "ignore", shell: true });
  } catch { /* port already free */ }
}

killPort(3001);
killPort(3000);
// Give OS a moment to release sockets
await new Promise(r => setTimeout(r, 600));

// ─── Auto-install ─────────────────────────────────────────────────────────────
ensureInstalled(root,        "root");
ensureInstalled(backendDir,  "backend");
ensureInstalled(frontendDir, "frontend");

// ─── Resolve local bin paths ──────────────────────────────────────────────────
const tsxBin  = resolve(backendDir,  "node_modules", ".bin", "tsx");
const nextBin = resolve(frontendDir, "node_modules", ".bin", "next");

// ─── Start a child process with labeled output ────────────────────────────────
function startProcess(label, color, bin, args, cwd, env = {}) {
  const proc = spawn(bin, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const printLines = (stream, isErr) => {
    stream.on("data", (chunk) => {
      chunk.toString().split("\n").filter(Boolean).forEach(line => {
        if (isErr) process.stderr.write(`${color}${BOLD}[${label}]${RESET} ${DIM}${line}${RESET}\n`);
        else       process.stdout.write(`${color}${BOLD}[${label}]${RESET} ${line}\n`);
      });
    });
  };

  printLines(proc.stdout, false);
  printLines(proc.stderr, true);

  proc.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n${RED}${BOLD}[${label}]${RESET} ${RED}gestopt met code ${code}${RESET}`);
    }
  });

  return proc;
}

// ─── Banner ───────────────────────────────────────────────────────────────────
console.log(`
${BOLD}╔══════════════════════════════════════╗
║  🚀  Syntess Rapport  —  dev mode    ║
╚══════════════════════════════════════╝${RESET}
  ${BLUE}${BOLD}[api]${RESET} http://localhost:3001
  ${GREEN}${BOLD}[web]${RESET} http://localhost:3000/login  ${DIM}(admin/admin)${RESET}
  ${DIM}Ctrl+C om te stoppen${RESET}
`);

// ─── Start servers ────────────────────────────────────────────────────────────
const backend = startProcess(
  "api", BLUE,
  tsxBin, ["watch", "src/index.ts"],
  backendDir,
  { NODE_ENV: "development" }
);

// Small delay so backend is ready before frontend issues API calls on first load
await new Promise(r => setTimeout(r, 1200));

const frontend = startProcess(
  "web", GREEN,
  nextBin, ["dev", "--port", "3000", "--turbopack"],
  frontendDir,
  { NEXT_TELEMETRY_DISABLED: "1" }
);

// ─── Graceful shutdown ────────────────────────────────────────────────────────
let stopping = false;

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\n${YELLOW}${BOLD}Stoppen...${RESET} (${signal})`);
  backend.kill("SIGTERM");
  frontend.kill("SIGTERM");
  setTimeout(() => process.exit(0), 1500);
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Herstart als een van de processen crasht en exit the dev script
backend.on("exit",  (code) => { if (!stopping && code !== 0 && code !== null) shutdown("backend-crash"); });
frontend.on("exit", (code) => { if (!stopping && code !== 0 && code !== null) shutdown("frontend-crash"); });

// Keep the process alive
process.stdin.resume();
