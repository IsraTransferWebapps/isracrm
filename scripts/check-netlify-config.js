#!/usr/bin/env node

/**
 * Pre-build safety check for netlify.toml.
 *
 * Prevents two known foot-guns:
 *  1. Using "durable" on HTML/page routes (causes stale CSS after deploys).
 *  2. Missing required env vars during Netlify CI builds.
 *
 * Run automatically via: npm run build  (see package.json prebuild hook)
 */

const fs = require('fs');
const path = require('path');

const errors = [];

// ── 1. Check netlify.toml for durable on non-static routes ──────────────

const tomlPath = path.join(__dirname, '..', 'netlify.toml');
const toml = fs.readFileSync(tomlPath, 'utf-8');

// Parse [[headers]] blocks manually (good enough — no TOML parser needed)
const headerBlocks = toml.split('[[headers]]').slice(1); // skip preamble

for (const block of headerBlocks) {
  const forMatch = block.match(/for\s*=\s*"([^"]+)"/);
  const route = forMatch ? forMatch[1] : '(unknown)';

  // Strip comments before checking — avoid false positives from "# don't use durable"
  const valueLines = block
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');

  // "durable" is only safe on content-hashed paths like /_next/static/*
  if (valueLines.includes('durable') && !route.includes('_next/static')) {
    errors.push(
      `netlify.toml: "durable" found on route "${route}".\n` +
      `    This causes stale HTML after deploys (CSS/JS 404s).\n` +
      `    Only use "durable" on content-hashed paths like /_next/static/*.`
    );
  }
}

// ── 2. Check required env vars (only in Netlify CI, not local dev) ──────

if (process.env.NETLIFY === 'true') {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(
        `Missing env var: ${key}\n` +
        `    Add it in Netlify → Project settings → Environment variables.`
      );
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────

if (errors.length > 0) {
  console.error('\n❌ Pre-build check failed:\n');
  errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}\n`));
  process.exit(1);
} else {
  console.log('✓ Pre-build checks passed');
}
