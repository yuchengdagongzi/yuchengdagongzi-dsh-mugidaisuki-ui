/**
 * Optional integration test against a real DeepSeek Harness runtime.
 *
 * It loads the actual `@deepseek-ai/cordis` Context and `@deepseek-ai/dsh-skill`
 * SkillRegistry from an unpacked DSH runtime, mounts this plugin with the
 * bundled oil-ui forced on, and reads all three skills back.
 *
 *   DSH_RUNTIME_DIR="C:\path\to\dsh" node --test --test-isolation=none test/integration.dsh.test.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const runtimeDir = process.env.DSH_RUNTIME_DIR;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test(
  'mounts oil-ui, prompt-engineering-patterns and mugidaisuki-ui in a real skill registry',
  { skip: runtimeDir ? false : 'set DSH_RUNTIME_DIR to an unpacked DSH runtime to run this test' },
  async () => {
    const require = createRequire(join(runtimeDir, 'package.json'));
    const cordis = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')).href);
    const skillModule = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-skill')).href);
    const systemPromptModule = await import(
      pathToFileURL(require.resolve('@deepseek-ai/dsh-system-prompt')).href
    );
    const plugin = await import(pathToFileURL(join(root, 'lib', 'index.js')).href);

    const { Context } = cordis;
    const SkillRegistry = skillModule.default;
    const ctx = new Context();

    await ctx.plugin(SkillRegistry);
    await ctx.plugin(systemPromptModule.default, {
      includeHarnessIdentity: false,
      includeRuntimeContext: false,
    });
    const pluginFiber = await ctx.plugin(plugin, { registerOilUi: true });

    const names = (await ctx.skills.list()).map((entry) => entry.name).sort();
    assert.deepEqual(names, ['mugidaisuki-ui', 'oil-ui', 'prompt-engineering-patterns']);

    const workflow = await ctx.skills.get('mugidaisuki-ui');
    assert.ok(workflow.content.startsWith('# mugidaisuki-ui'));
    assert.match(workflow.description, /提示词/);
    assert.deepEqual(workflow.resourceBase, {
      kind: 'directory',
      path: join(root, 'skills', 'mugidaisuki-ui'),
    });

    const prompt = await ctx.skills.get('prompt-engineering-patterns');
    assert.ok(prompt.content.startsWith('# Prompt Engineering Patterns'));
    assert.deepEqual(prompt.resourceBase, {
      kind: 'directory',
      path: join(root, 'skills', 'prompt-engineering-patterns'),
    });

    const oilUi = await ctx.skills.get('oil-ui');
    assert.ok(oilUi.content.startsWith('# oil-ui'));
    assert.ok(!oilUi.content.includes('${CLAUDE_SKILL_DIR}'));
    assert.deepEqual(oilUi.resourceBase, {
      kind: 'directory',
      path: join(root, 'skills', 'oil-ui'),
    });

    const rendered = skillModule.renderSkillContent(workflow);
    assert.match(rendered, /<skill_content name="mugidaisuki-ui">/);
    assert.match(rendered, /Base directory for this skill:/);

    await pluginFiber.dispose();
    assert.deepEqual(await ctx.skills.list(), []);

    await ctx.fiber.dispose();
  },
);
