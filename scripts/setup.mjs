#!/usr/bin/env node
/**
 * First-time setup: installs all dependencies and creates .env if missing.
 * Run: npm run setup
 */
import { execSync } from "child_process";
import { existsSync, copyFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, cwd = root) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

function ensureEnv(dir, example) {
  const envPath = resolve(root, dir, ".env");
  const examplePath = resolve(root, dir, example);
  if (!existsSync(envPath) && existsSync(examplePath)) {
    copyFileSync(examplePath, envPath);
    console.log(`  ✓ Aangemaakt: ${dir}/.env (van ${example})`);
  }
}

console.log("🔧 Syntess Rapport setup\n");

// 1. Root deps (concurrently)
run("npm install");

// 2. Backend deps
run("npm install", resolve(root, "backend"));

// 3. Frontend deps
run("npm install", resolve(root, "frontend"));

// 4. .env files
ensureEnv("backend", ".env.example");
ensureEnv("frontend", ".env.example");

console.log(`
✅ Setup klaar!

Volgende stap:
  npm run dev          → start backend + frontend

Inloggen: http://localhost:3000/login
  gebruiker: admin
  wachtwoord: admin

Backend API: http://localhost:3001/api/v1/health

Voor echte DB: zet MOCK_MODE=false in backend/.env en vul de FB_* variabelen in.
`);
