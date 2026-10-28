#!/usr/bin/env node
/**
 * Generate `lib/skills.generated.js` from the three bundled skills:
 * oil-ui, prompt-engineering-patterns and the mugidaisuki-ui workflow.
 *
 * Upstream SKILL.md files use a small YAML frontmatter subset (scalars, string
 * arrays, one nested map and folded block scalars). This script parses that
 * subset, validates the identity fields, strips the frontmatter from each body
 * and writes one deterministic ES module. It never fetches anything and has no
 * dependencies.
 *
 * Usage:
 *   node scripts/build.mjs            write the generated module
 *   node scripts/build.mjs --check    fail if the committed module is stale
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = join(root, 'lib', 'skills.generated.js');
const checkOnly = process.argv.includes('--check');

const UPSTREAM = {
  'oil-ui': {
    name: 'oil-ui',
    repository: 'https://github.com/oil-oil/oil-ui',
    license: 'MIT',
    copyright: 'oil-oil',
  },
  'prompt-engineering-patterns': {
    name: 'prompt-engineering-patterns',
    repository: 'https://github.com/wshobson/agents',
    license: 'MIT',
    copyright: 'Seth Hobson',
  },
};

const SKILLS = [
  {
    key: 'oil-ui',
    source: 'skills/oil-ui/SKILL.md',
    expectedName: 'oil-ui',
    bodyStart: '# oil-ui',
    metadata: (frontmatter, sha256) => ({
      version: frontmatter.metadata?.version,
      compatibility: frontmatter.metadata?.compatibility ?? '',
      upstream: { ...UPSTREAM['oil-ui'], skillSha256: sha256 },
      ...(Array.isArray(frontmatter['allowed-tools'])
        ? { allowedTools: frontmatter['allowed-tools'] }
        : {}),
    }),
  },
  {
    key: 'prompt-engineering-patterns',
    source: 'skills/prompt-engineering-patterns/SKILL.md',
    expectedName: 'prompt-engineering-patterns',
    bodyStart: '# Prompt Engineering Patterns',
    metadata: (frontmatter, sha256) => ({
      version: 'local',
      upstream: { ...UPSTREAM['prompt-engineering-patterns'], skillSha256: sha256 },
    }),
  },
  {
    key: 'mugidaisuki-ui',
    source: 'skills/mugidaisuki-ui/SKILL.md',
    expectedName: 'mugidaisuki-ui',
    bodyStart: '# mugidaisuki-ui',
    metadata: (frontmatter) => ({
      version: frontmatter.metadata?.version ?? '0.3.0',
      workflow: 'prompt-first',
    }),
  },
];

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

function splitFrontmatter(raw, source) {
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(raw);
  if (!match) fail(`${source} has no YAML frontmatter`);
  return { yaml: match[1], body: raw.slice(match[0].length) };
}

function parseScalar(raw, where) {
  const value = raw.trim();
  if (value.startsWith('"')) {
    if (!value.endsWith('"')) fail(`${where}: unterminated double-quoted scalar`);
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'")) {
    if (!value.endsWith("'")) fail(`${where}: unterminated single-quoted scalar`);
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}

function parseYamlSubset(text, sourceName) {
  const result = {};
  const lines = text.split(/\r?\n/);
  let index = 0;

  const readBlockScalar = (style, chomp) => {
    const block = [];
    while (index < lines.length) {
      const line = lines[index];
      if (line.trim() === '') {
        block.push('');
        index += 1;
        continue;
      }
      if (!/^\s/.test(line)) break;
      block.push(line);
      index += 1;
    }
    while (block.length > 0 && block[block.length - 1].trim() === '') block.pop();
    if (block.length === 0) return '';
    const indent = Math.min(
      ...block.filter((line) => line.trim() !== '').map((line) => line.match(/^\s*/)[0].length),
    );
    const stripped = block.map((line) => line.slice(Math.min(indent, line.length)));
    if (style === '|') {
      const joined = stripped.join('\n');
      return chomp === '-' ? joined : `${joined}\n`;
    }
    let folded = '';
    let afterBlank = true;
    for (const line of stripped) {
      if (line.trim() === '') {
        folded += '\n';
        afterBlank = true;
        continue;
      }
      folded += `${afterBlank ? '' : ' '}${line.trim()}`;
      afterBlank = false;
    }
    return chomp === '-' ? folded : `${folded}\n`;
  };

  const readBlock = (key) => {
    const block = [];
    while (index < lines.length) {
      const line = lines[index];
      if (line.trim() === '') {
        block.push(line);
        index += 1;
        continue;
      }
      if (!/^\s/.test(line)) break;
      block.push(line);
      index += 1;
    }
    while (block.length > 0 && block[block.length - 1].trim() === '') block.pop();
    if (block.length === 0) return '';
    const significant = block.filter((line) => line.trim() !== '');
    if (/^\s+-\s+/.test(significant[0])) {
      return significant.map((line, itemIndex) => {
        const match = /^\s+-\s+(.*)$/.exec(line);
        if (!match) {
          fail(`${sourceName}: expected a list item under "${key}" at ${line.trim()}`);
        }
        return parseScalar(match[1], `${sourceName}:${key}[${itemIndex}]`);
      });
    }
    const map = {};
    for (const line of significant) {
      const match = /^\s+([A-Za-z0-9_.-]+):(.*)$/.exec(line);
      if (!match) fail(`${sourceName}: unsupported indented line under "${key}": ${line.trim()}`);
      map[match[1]] = parseScalar(match[2], `${sourceName}:${key}.${match[1]}`);
    }
    return map;
  };

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === '' || line.trim().startsWith('#')) {
      index += 1;
      continue;
    }
    if (/^\s/.test(line)) fail(`${sourceName}: unexpected indentation: ${line.trim()}`);
    const match = /^([A-Za-z0-9_.-]+):(.*)$/.exec(line);
    if (!match) fail(`${sourceName}: unsupported frontmatter line: ${line.trim()}`);
    const key = match[1];
    const rest = match[2].trim();
    index += 1;
    const blockScalar = /^([|>])([+-]?)$/.exec(rest);
    if (blockScalar) {
      result[key] = readBlockScalar(blockScalar[1], blockScalar[2]);
      continue;
    }
    result[key] = rest === '' ? readBlock(key) : parseScalar(rest, `${sourceName}:${key}`);
  }
  return result;
}

const generatedSkills = [];

for (const definition of SKILLS) {
  const absoluteSource = join(root, ...definition.source.split('/'));
  const normalizedSource = (await readFile(absoluteSource, 'utf8')).replace(/\r\n/g, '\n');
  const { yaml, body } = splitFrontmatter(normalizedSource, definition.source);
  const frontmatter = parseYamlSubset(yaml, `${definition.source} frontmatter`);

  if (frontmatter.name !== definition.expectedName) {
    fail(
      `${definition.source}: expected skill name "${definition.expectedName}", found ${JSON.stringify(frontmatter.name)}`,
    );
  }
  if (typeof frontmatter.description !== 'string' || frontmatter.description.trim() === '') {
    fail(`${definition.source}: description must be a non-empty string`);
  }
  if (definition.key === 'oil-ui') {
    if (!frontmatter.metadata || typeof frontmatter.metadata.version !== 'string') {
      fail(`${definition.source}: metadata.version must be a non-empty string`);
    }
  }

  const bodyWithoutFrontmatter = body.startsWith('\n') ? body.slice(1) : body;
  if (!bodyWithoutFrontmatter.startsWith(definition.bodyStart)) {
    fail(`${definition.source}: body must start with "${definition.bodyStart}"`);
  }

  const sha256 = createHash('sha256').update(normalizedSource).digest('hex');
  const bodySha256 = createHash('sha256').update(bodyWithoutFrontmatter).digest('hex');
  const metadata = definition.metadata(frontmatter, sha256);
  const relativeDirectory = definition.source.slice(0, definition.source.lastIndexOf('/'));

  generatedSkills.push({
    key: definition.key,
    name: frontmatter.name,
    relativeDirectory,
    description: frontmatter.description,
    content: bodyWithoutFrontmatter,
    metadata,
    source: {
      path: relative(root, absoluteSource).split('\\').join('/'),
      sha256,
      bytes: Buffer.byteLength(normalizedSource),
      frontmatterBytes: Buffer.byteLength(normalizedSource) - Buffer.byteLength(body),
      bodySha256,
      bodyBytes: Buffer.byteLength(bodyWithoutFrontmatter),
    },
  });
}

const generated = `// Generated by scripts/build.mjs. Do not edit by hand.
// Bundled skills: ${generatedSkills.map((skill) => skill.key).join(', ')}
export const SKILLS = ${JSON.stringify(generatedSkills, null, 2)};
`;

if (checkOnly) {
  let current;
  try {
    current = await readFile(outputFile, 'utf8');
  } catch {
    fail('lib/skills.generated.js is missing; run `npm run build`');
  }
  if (current !== generated) {
    fail('lib/skills.generated.js is stale; run `npm run build` and commit the result');
  }
  console.log(`ok: lib/skills.generated.js matches ${generatedSkills.length} bundled skills`);
} else {
  await writeFile(outputFile, generated, 'utf8');
  for (const skill of generatedSkills) {
    console.log(
      `wrote ${skill.key}: ${skill.source.bytes} bytes, body ${skill.source.bodyBytes} bytes, sha256 ${skill.source.sha256.slice(0, 12)}…`,
    );
  }
}
