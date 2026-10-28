import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  apply,
  hasOfficialOilUi,
  name as pluginName,
  registerSkill,
  shouldRegisterBundledOilUi,
  skillDirectories,
  skillKeysFor,
} from '../lib/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function createFakeContext() {
  const registrations = [];
  const disposers = [];
  const sections = [];
  const ctx = {
    skills: {
      register(skill) {
        registrations.push(skill);
        const dispose = () => {};
        disposers.push(dispose);
        return dispose;
      },
      async list() {
        return [];
      },
    },
    systemPrompt: {
      section(definition) {
        sections.push(definition);
        return () => {};
      },
    },
    effect(callback) {
      return callback();
    },
    inject(services, callback) {
      assert.equal(services.length, 1);
      callback(ctx);
    },
  };
  return { ctx, registrations, disposers, sections };
}

test('plugin identity and bundled skill directories', () => {
  assert.equal(pluginName, 'mugidaisuki-ui');
  assert.deepEqual(Object.keys(skillDirectories).sort(), [
    'mugidaisuki-ui',
    'oil-ui',
    'prompt-engineering-patterns',
  ]);
});

test('oil-ui fallback policy can be forced either way', () => {
  assert.equal(shouldRegisterBundledOilUi({ registerOilUi: true }), true);
  assert.equal(shouldRegisterBundledOilUi({ registerOilUi: false }), false);
  assert.equal(
    shouldRegisterBundledOilUi({}),
    !hasOfficialOilUi(),
    'auto mode follows whether dsh-oil-ui is installed beside the plugin',
  );
  assert.deepEqual(skillKeysFor({ registerOilUi: true }), [
    'oil-ui',
    'prompt-engineering-patterns',
    'mugidaisuki-ui',
  ]);
  assert.deepEqual(skillKeysFor({ registerOilUi: false }), [
    'prompt-engineering-patterns',
    'mugidaisuki-ui',
  ]);
});

test('apply registers the workflow, the prompt skill and the oil-ui fallback', async () => {
  const { ctx, registrations, sections } = createFakeContext();
  apply(ctx, { registerOilUi: true });

  assert.deepEqual(registrations.map((skill) => skill.name), [
    'oil-ui',
    'prompt-engineering-patterns',
    'mugidaisuki-ui',
  ]);

  for (const skill of registrations) {
    assert.ok(skill.content.length > 1_000);
    assert.ok(skill.path.endsWith('SKILL.md'));
    assert.equal(skill.resourceBase.kind, 'directory');
    assert.ok(skill.resourceBase.path.startsWith(root));
    assert.equal(skill.source, 'bundled');
    assert.equal(skill.metadata.version.length > 0, true);  }

  const oilUi = registrations.find((skill) => skill.name === 'oil-ui');
  assert.equal(oilUi.metadata.version, '0.23.9');
  assert.ok(oilUi.content.startsWith('# oil-ui'));
  assert.ok(!oilUi.content.includes('${CLAUDE_SKILL_DIR}'));
  assert.ok(oilUi.content.includes(skillDirectories['oil-ui'].replaceAll('\\', '/')));

  const workflow = registrations.find((skill) => skill.name === 'mugidaisuki-ui');
  assert.match(workflow.description, /提示词/);
  assert.ok(workflow.content.startsWith('# mugidaisuki-ui'));
  assert.ok(workflow.content.includes('风格提示词方案'));

  assert.equal(sections.length, 1);
  assert.equal(sections[0].name, 'mugidaisuki-ui');
  assert.match(sections[0].text, /prompt-first workflow/);
});

test('apply can omit the bundled oil-ui', () => {
  const { ctx, registrations } = createFakeContext();
  apply(ctx, { registerOilUi: false });
  assert.deepEqual(registrations.map((skill) => skill.name), [
    'prompt-engineering-patterns',
    'mugidaisuki-ui',
  ]);
});

test('registerSkill loads one skill and rejects unknown keys', () => {
  const { ctx, registrations } = createFakeContext();
  const dispose = registerSkill(ctx, 'mugidaisuki-ui');
  assert.equal(typeof dispose, 'function');
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].name, 'mugidaisuki-ui');
  assert.throws(() => registerSkill(ctx, 'nope'), /unknown bundled skill/);
});

test('package metadata matches the plugin wiring', async () => {
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.name, 'dsh-mugidaisuki-ui');
  assert.equal(manifest.version, '0.3.0');
  assert.equal(manifest.main, './lib/index.js');
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  assert.ok(manifest.files.includes('skills'));
  assert.ok(manifest.files.includes('lib'));
});

test('bundle patch mounts this package by name', async () => {
  const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /-\s+insert:/);
  assert.match(patch, /id:\s*mugidaisuki-ui/);
  assert.match(patch, /name:\s*dsh-mugidaisuki-ui/);
});

test('generated catalog records body hashes for all skills', async () => {
  const generated = await import('../lib/skills.generated.js');
  assert.equal(generated.SKILLS.length, 3);
  for (const skill of generated.SKILLS) {
    assert.match(skill.source.sha256, /^[0-9a-f]{64}$/);
    assert.match(skill.source.bodySha256, /^[0-9a-f]{64}$/);
    assert.ok(skill.source.bodyBytes > 1_000);
    assert.equal(
      createHash('sha256').update(skill.content).digest('hex'),
      skill.source.bodySha256,
    );
  }
});

test('skill manifests inventory all three trees', async () => {
  for (const [file, minimum] of [
    ['skills/oil-ui.manifest.json', 38],
    ['skills/prompt-engineering-patterns.manifest.json', 11],
    ['skills/mugidaisuki-ui.manifest.json', 3],
  ]) {
    const manifest = JSON.parse(await readFile(join(root, file), 'utf8'));
    assert.equal(manifest.schemaVersion, 1);
    assert.ok(manifest.fileCount >= minimum);
    assert.equal(manifest.files.length, manifest.fileCount);
    assert.ok(manifest.files.some((entry) => entry.path === 'SKILL.md'));
    assert.ok(manifest.files.every((entry) => /^[0-9a-f]{64}$/.test(entry.sha256)));
  }
});

test('required skill resources exist', async () => {
  for (const file of [
    'skills/oil-ui/scripts/shoot.mjs',
    'skills/prompt-engineering-patterns/references/prompt-templates.md',
    'skills/prompt-engineering-patterns/scripts/optimize-prompt.py',
    'skills/mugidaisuki-ui/references/design-prompt-template.md',
    'skills/mugidaisuki-ui/references/style-prompt-options.md',
  ]) {
    await access(join(root, file));
  }
});
