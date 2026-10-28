#!/usr/bin/env node
/**
 * Build a deterministic manifest for each bundled skill tree:
 * path, byte size and SHA-256 for every runtime file.
 *
 * Manifests live at `skills/<name>.manifest.json` and let CI prove that the
 * published package still contains exactly the files that were audited.
 * `.gitignore` is omitted because npm never publishes it.
 *
 * Usage:
 *   node scripts/build-manifest.mjs            write manifests
 *   node scripts/build-manifest.mjs --check    fail if any manifest is stale
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const SKILLS = [
  { key: 'oil-ui', directory: 'skills/oil-ui', manifest: 'skills/oil-ui.manifest.json' },
  {
    key: 'prompt-engineering-patterns',
    directory: 'skills/prompt-engineering-patterns',
    manifest: 'skills/prompt-engineering-patterns.manifest.json',
  },
  {
    key: 'mugidaisuki-ui',
    directory: 'skills/mugidaisuki-ui',
    manifest: 'skills/mugidaisuki-ui.manifest.json',
  },
];

const EXCLUDED_DIRS = new Set(['.git', '__pycache__', 'node_modules']);
const EXCLUDED_FILES = new Set(['.gitignore', '.DS_Store']);
const EXCLUDED_SUFFIXES = ['.pyc'];

function fail(message) {
  console.error(`manifest: ${message}`);
  process.exit(1);
}

async function walk(current, prefix = '') {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      files.push(...(await walk(absolute, rel)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (EXCLUDED_FILES.has(entry.name)) continue;
    if (EXCLUDED_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) continue;
    files.push({
      path: rel.split(sep).join('/'),
      bytes: (await stat(absolute)).size,
      sha256: createHash('sha256').update(await readFile(absolute)).digest('hex'),
    });
  }
  return files;
}

const generated = await import(pathToFileURL(join(root, 'lib', 'skills.generated.js')).href);

for (const definition of SKILLS) {
  const skill = generated.SKILLS.find((entry) => entry.key === definition.key);
  if (!skill) fail(`lib/skills.generated.js has no skill "${definition.key}"`);

  const files = (await walk(join(root, ...definition.directory.split('/')))).sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
  if (files.length === 0) fail(`${definition.directory} contains no files`);

  const manifest = {
    schemaVersion: 1,
    name: skill.name,
    version: skill.metadata.version ?? null,
    upstream: skill.metadata.upstream ?? null,
    source: {
      path: skill.source.path,
      sha256: skill.source.sha256,
      bodySha256: skill.source.bodySha256,
    },
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    files,
  };

  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestFile = join(root, ...definition.manifest.split('/'));

  if (checkOnly) {
    let current;
    try {
      current = await readFile(manifestFile, 'utf8');
    } catch {
      fail(`${definition.manifest} is missing; run \`npm run build\``);
    }
    if (current !== serialized) {
      fail(`${definition.manifest} is stale; run \`npm run build\` and commit the result`);
    }
    console.log(`ok: ${definition.manifest} lists ${files.length} files (${manifest.totalBytes} bytes)`);
  } else {
    await writeFile(manifestFile, serialized, 'utf8');
    console.log(`wrote ${definition.manifest} (${files.length} files, ${manifest.totalBytes} bytes)`);
  }
}
