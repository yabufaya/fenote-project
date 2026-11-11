// Derive Vite build-time environment variables from root wrangler.jsonc.
// Cloudflare Workers Builds does NOT expose `[vars]` to the build command, so
// this bridges runtime config values to the two Vite builds. Any VITE_* value
// already provided by Cloudflare Build variables still takes precedence.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'wrangler.jsonc');

// Minimal JSONC parser: strip // and /* */ comments outside strings, then
// allow trailing commas. No extra package is needed in the build image.
function stripJsonComments(source) {
  let output = '';
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        output += char;
      }
      continue;
    }
    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }
    output += char;
  }
  return output;
}

const source = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(
  stripJsonComments(source).replace(/,(\s*[}\]])/g, '$1'),
);
const vars = config.vars || {};

const derived = {
  VITE_SUPABASE_URL: vars.SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: vars.SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_STORAGE_ENABLED: 'true',
  VITE_STORAGE_BUCKET_IMAGES: 'fenote-images',
  VITE_STORAGE_BUCKET_VIDEOS: 'fenote-videos',
  VITE_STORAGE_BUCKET_DOCUMENTS: 'fenote-documents',
  VITE_PUBLIC_SITE_URL: vars.PUBLIC_URL,
};

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

for (const [key, fallback] of Object.entries(derived)) {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing ${key} in Cloudflare Build variables and wrangler.jsonc vars`);
  }
  process.stdout.write(`export ${key}=${shellQuote(value)}\n`);
}
