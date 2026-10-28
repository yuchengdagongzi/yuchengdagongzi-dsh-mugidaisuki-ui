#!/usr/bin/env node
/**
 * Completeness audit for all bundled skills.
 *
 * For each skill it checks:
 *   1. the committed manifest matches the files on disk;
 *   2. when a source directory is supplied, the vendored tree is byte-for-byte
 *      identical (no file silently dropped or edited);
 *   3. local Markdown links and inline resource paths resolve;
 *   4. required runtime files exist.
 *
 * Optional source env vars:
 *   OIL_UI_SOURCE_DIR                 installed oil-ui skill
 *   PROMPT_SKILL_SOURCE_DIR           installed prompt-engineering-patterns skill
 *   (the mugidaisuki-ui workflow is original to this repository)
 */
import { createHash } from 'node:crypto';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SKILLS = [
  {
    key: 'oil-ui',
    directory: 'skills/oil-ui',
    manifest: 'skills/oil-ui.manifest.json',
    name: 'oil-ui',
    sourceEnv: 'OIL_UI_SOURCE_DIR',
    allowExtra: [],
    required: [
      'SKILL.md',
      'LICENSE',
      'references/tools.md',
      'scripts/check_update.sh',
      'scripts/check_update.py',
      'scripts/shoot.mjs',
      'scripts/curate-media.mjs',
      'scripts/build_explorer.py',
      'scripts/recommend_once.py',
      'assets/style-explorer.html',
      'assets/vendor/alpine.min.js',
      'assets/logo.png',
    ],
  },
  {
    key: 'prompt-engineering-patterns',
    directory: 'skills/prompt-engineering-patterns',
    manifest: 'skills/prompt-engineering-patterns.manifest.json',
    name: 'prompt-engineering-patterns',
    sourceEnv: 'PROMPT_SKILL_SOURCE_DIR',
    allowExtra: ['LICENSE'],
    required: [
      'SKILL.md',
      'LICENSE',
      'references/prompt-templates.md',
      'references/prompt-optimization.md',
      'assets/prompt-template-library.md',
      'scripts/optimize-prompt.py',
    ],
  },
  {
    key: 'mugidaisuki-ui',
    directory: 'skills/mugidaisuki-ui',
    manifest: 'skills/mugidaisuki-ui.manifest.json',
    name: 'mugidaisuki-ui',
    sourceEnv: null,
    allowExtra: [],
    required: [
      'SKILL.md',
      'references/design-prompt-template.md',
      'references/style-prompt-options.md',
    ],
  },
];

const EXCLUDED_DIRS = new Set(['.git', '__pycache__', 'node_modules']);
const EXCLUDED_FILES = new Set(['.gitignore', '.DS_Store']);
const EXCLUDED_SUFFIXES = ['.pyc'];

let failed = 0;

function fail(message) {
  failed += 1;
  console.error(`FAIL ${message}`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(absolutePath) {
  return {
    bytes: (await stat(absolutePath)).size,
    sha256: createHash('sha256').update(await readFile(absolutePath)).digest('hex'),
  };
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
    files.push({ path: rel.split(sep).join('/'), ...(await hashFile(absolute)) });
  }
  return files;
}

function index(files) {
  return new Map(files.map((file) => [file.path, file]));
}

async function auditSkill(definition) {
  const skillDir = join(root, ...definition.directory.split('/'));
  const manifestFile = join(root, ...definition.manifest.split('/'));
  const actual = await walk(skillDir);
  const actualMap = index(actual);
  const actualForSource = new Map(actualMap);
  const vendoredIgnore = join(skillDir, '.gitignore');
  if (await exists(vendoredIgnore)) {
    actualForSource.set('.gitignore', { path: '.gitignore', ...(await hashFile(vendoredIgnore)) });
  }
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  const manifestMap = index(manifest.files);

  for (const [path, file] of actualMap) {
    const recorded = manifestMap.get(path);
    if (!recorded) fail(`${definition.name}: manifest is missing ${path}`);
    else if (recorded.sha256 !== file.sha256 || recorded.bytes !== file.bytes) {
      fail(`${definition.name}: manifest hash mismatch for ${path}`);
    }
  }
  for (const path of manifestMap.keys()) {
    if (!actualMap.has(path)) fail(`${definition.name}: manifest lists missing file ${path}`);
  }
  console.log(`ok  ${definition.name}: manifest ${manifest.fileCount}/${manifest.fileCount} files match`);

  if (definition.sourceEnv) {
    const sourceDir = process.env[definition.sourceEnv]?.trim();
    if (!sourceDir) {
      console.log(`ok  ${definition.name}: source skipped (set ${definition.sourceEnv} to compare)`);
    } else if (!(await exists(sourceDir))) {
      fail(`${definition.name}: ${definition.sourceEnv} does not exist: ${sourceDir}`);
    } else {
      const sourceFiles = await walk(sourceDir);
      const sourceMap = index(sourceFiles);
      const sourceIgnore = join(sourceDir, '.gitignore');
      if (await exists(sourceIgnore)) {
        sourceMap.set('.gitignore', { path: '.gitignore', ...(await hashFile(sourceIgnore)) });
      }
      let same = 0;
      for (const [path, file] of sourceMap) {
        const vendored = actualForSource.get(path);
        if (!vendored) fail(`${definition.name}: source file not vendored: ${path}`);
        else if (vendored.sha256 !== file.sha256) fail(`${definition.name}: source file differs: ${path}`);
        else same += 1;
      }
      const extras = [...actualForSource.keys()].filter(
        (path) => !sourceMap.has(path) && !definition.allowExtra.includes(path),
      );
      for (const path of extras) fail(`${definition.name}: vendored file not in source: ${path}`);
      console.log(
        `ok  ${definition.name}: source ${same}/${sourceMap.size} files byte-identical` +
          (definition.allowExtra.length ? ` (+${definition.allowExtra.join(', ')} added by packaging)` : ''),
      );
    }
  } else {
    console.log(`ok  ${definition.name}: original workflow (no upstream source comparison)`);
  }

  const markdownFiles = ['SKILL.md'];
  const referencesDir = join(skillDir, 'references');
  for (const name of await readdir(referencesDir)) {
    if (name.endsWith('.md')) markdownFiles.push(`references/${name}`);
  }

  let localLinks = 0;
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const relFile of markdownFiles) {
    const absoluteFile = join(skillDir, ...relFile.split('/'));
    const text = await readFile(absoluteFile, 'utf8');
    for (const match of text.matchAll(linkPattern)) {
      let target = match[1].trim();
      if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
      target = target.replace(/\s+["'][^"']*["']\s*$/, '');
      if (!target || target.startsWith('#')) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      if (target.startsWith('/')) continue;
      target = decodeURIComponent(target.split('#')[0].split('?')[0]);
      if (!target) continue;
      localLinks += 1;
      const base = dirname(join(skillDir, ...relFile.split('/')));
      const resolved = join(base, target);
      const normalized = relative(skillDir, resolved);
      if (normalized.startsWith('..') || !(await exists(resolved))) {
        fail(`${definition.name}: broken link in ${relFile}: ${target}`);
      }
    }
  }

  let inlinePaths = 0;
  const inlinePattern = /`((?:scripts|references|assets)\/[^`\n]+)`/g;
  for (const relFile of markdownFiles) {
    const text = await readFile(join(skillDir, ...relFile.split('/')), 'utf8');
    for (const match of text.matchAll(inlinePattern)) {
      const target = match[1].trim().split(/\s+/)[0].replace(/[.,;:)]+$/, '');
      if (target.includes('*') || target.includes('?') || target.includes('<') || target.includes('{')) {
        continue;
      }
      inlinePaths += 1;
      if (!(await exists(join(skillDir, ...target.split('/'))))) {
        fail(`${definition.name}: inline path in ${relFile} does not exist: ${target}`);
      }
    }
  }

  for (const required of definition.required) {
    if (!(await exists(join(skillDir, ...required.split('/'))))) {
      fail(`${definition.name}: required file missing: ${required}`);
    }
  }

  console.log(`ok  ${definition.name}: ${localLinks} links, ${inlinePaths} inline paths, required files present`);
}

for (const definition of SKILLS) await auditSkill(definition);

if (failed > 0) {
  console.error(`\n${failed} skill audit problem(s)`);
  process.exit(1);
}
console.log('\nok: all bundled skills audited');
