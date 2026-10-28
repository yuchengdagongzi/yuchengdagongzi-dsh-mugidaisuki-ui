#!/usr/bin/env node
/**
 * Structural checks for the package: manifest wiring, bundle patch, generated
 * skill catalog, the three skill manifests and required resources. Runtime
 * behaviour is covered by `node --test`.
 */
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const checks = [];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function check(label, condition, detail = '') {
  checks.push({ label, ok: Boolean(condition), detail });
  if (!condition) problems.push(detail ? `${label}: ${detail}` : label);
}

const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
check('package name', manifest.name === 'dsh-mugidaisuki-ui', manifest.name);
check('package version', manifest.version === '0.3.0', manifest.version);
check('package type', manifest.type === 'module', manifest.type);
check('main entry', manifest.main === './lib/index.js', manifest.main);
check('dsh.bundle.patch', manifest.dsh?.bundle?.patch === './cordis.patch.yml');
check('node engine', manifest.engines?.node === '>=22.19.0', manifest.engines?.node);
check('license', manifest.license === 'MIT');
check('files include skills', manifest.files.includes('skills'));
check('files include lib', manifest.files.includes('lib'));

const pluginEntry = await readFile(join(root, 'lib', 'index.js'), 'utf8');
check('plugin name', /export const name = 'mugidaisuki-ui'/.test(pluginEntry));

const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8');
check(
  'bundle patch inserts the plugin',
  /-\s+insert:[\s\S]*id:\s*mugidaisuki-ui[\s\S]*name:\s*dsh-mugidaisuki-ui/.test(patch),
);

for (const file of [
  'lib/index.js',
  'lib/skills.generated.js',
  'skills/oil-ui/SKILL.md',
  'skills/oil-ui/LICENSE',
  'skills/oil-ui/references/design-direction.md',
  'skills/oil-ui/references/tools.md',
  'skills/oil-ui/scripts/check_update.sh',
  'skills/oil-ui/scripts/shoot.mjs',
  'skills/oil-ui/assets/vendor/alpine.min.js',
  'skills/oil-ui/assets/style-explorer.html',
  'skills/oil-ui.manifest.json',
  'skills/prompt-engineering-patterns/SKILL.md',
  'skills/prompt-engineering-patterns/LICENSE',
  'skills/prompt-engineering-patterns/references/prompt-templates.md',
  'skills/prompt-engineering-patterns/scripts/optimize-prompt.py',
  'skills/prompt-engineering-patterns.manifest.json',
  'skills/mugidaisuki-ui/SKILL.md',
  'skills/mugidaisuki-ui/references/design-prompt-template.md',
  'skills/mugidaisuki-ui/references/style-prompt-options.md',
  'skills/mugidaisuki-ui.manifest.json',
]) {
  check(`resource ${file}`, await exists(join(root, file)));
}

const generated = await import(pathToFileURL(join(root, 'lib', 'skills.generated.js')).href);
check('generated skill count', generated.SKILLS.length === 3, String(generated.SKILLS.length));
check(
  'generated skill names',
  generated.SKILLS.map((skill) => skill.name).join(',') ===
    'oil-ui,prompt-engineering-patterns,mugidaisuki-ui',
  generated.SKILLS.map((skill) => skill.name).join(','),
);
for (const skill of generated.SKILLS) {
  check(`generated body hash ${skill.key}`,
    createHash('sha256').update(skill.content).digest('hex') === skill.source.bodySha256);
  check(`generated body ${skill.key}`, skill.source.bodyBytes > 1_000, String(skill.source.bodyBytes));
}

for (const [file, minimumFiles, minimumBytes] of [
  ['skills/oil-ui.manifest.json', 38, 1_000_000],
  ['skills/prompt-engineering-patterns.manifest.json', 11, 50_000],
  ['skills/mugidaisuki-ui.manifest.json', 3, 8_000],
]) {
  const skillManifest = JSON.parse(await readFile(join(root, file), 'utf8'));
  check(`${file} count`, skillManifest.fileCount >= minimumFiles, String(skillManifest.fileCount));
  check(`${file} bytes`, skillManifest.totalBytes >= minimumBytes, String(skillManifest.totalBytes));
  check(`${file} has SKILL.md`, skillManifest.files.some((entry) => entry.path === 'SKILL.md'));
}

for (const item of checks) {
  console.log(`${item.ok ? 'ok  ' : 'FAIL'}  ${item.label}${item.detail ? ` (${item.detail})` : ''}`);
}

if (problems.length > 0) {
  console.error(`\n${problems.length} structural check(s) failed`);
  process.exit(1);
}
console.log(`\nok: ${checks.length} structural checks passed`);
