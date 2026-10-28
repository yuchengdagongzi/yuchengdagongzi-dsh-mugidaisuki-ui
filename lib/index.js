/**
 * mugidaisuki-ui plugin entry for DeepSeek Harness.
 *
 * The plugin registers three bundled skills:
 *
 * - `mugidaisuki-ui` — the prompt-first workflow (always registered)
 * - `prompt-engineering-patterns` — prompt construction/refinement (always)
 * - `oil-ui` — the upstream design skill (fallback only)
 *
 * The bundled oil-ui is skipped when the official `dsh-oil-ui` package is
 * installed beside this plugin, so the two packages do not fight over the same
 * skill name. Set `registerOilUi: true` to force the bundled copy, or
 * `registerOilUi: false` to never register it.
 *
 * A short system-prompt section routes new design requests through the
 * prompt-first workflow; the actual design work stays in the oil-ui skill.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SKILLS } from './skills.generated.js';

export const name = 'mugidaisuki-ui';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);

/** Absolute directory per bundled skill key. */
export const skillDirectories = Object.fromEntries(
  SKILLS.map((skill) => [skill.key, join(root, ...skill.relativeDirectory.split('/'))]),
);

/** Whether the official dsh-oil-ui package is installed in the same profile. */
export function hasOfficialOilUi() {
  try {
    require.resolve('dsh-oil-ui/package.json');
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve whether the bundled oil-ui fallback should be registered.
 * @param {{ registerOilUi?: boolean | 'auto' }} config
 * @returns {boolean}
 */
export function shouldRegisterBundledOilUi(config = {}) {
  if (config.registerOilUi === true) return true;
  if (config.registerOilUi === false) return false;
  return !hasOfficialOilUi();
}

function prepareSkill(skill) {
  const directory = skillDirectories[skill.key];
  const content = skill.content.replaceAll(
    '${CLAUDE_SKILL_DIR}',
    directory.replaceAll('\\', '/'),
  );
  return {
    name: skill.name,
    description: skill.description,
    content,
    path: join(directory, 'SKILL.md'),
    source: 'bundled',
    resourceBase: { kind: 'directory', path: directory },
    metadata: skill.metadata,
  };
}

/**
 * Register one bundled skill by key.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {string} key
 * @returns {() => void} registry disposer
 */
export function registerSkill(ctx, key) {
  const skill = SKILLS.find((entry) => entry.key === key);
  if (!skill) throw new Error(`mugidaisuki-ui: unknown bundled skill "${key}"`);
  return ctx.skills.register(prepareSkill(skill));
}

/**
 * Keys to register for this configuration.
 * @param {{ registerOilUi?: boolean | 'auto' }} config
 * @returns {string[]}
 */
export function skillKeysFor(config = {}) {
  const includeOilUi = shouldRegisterBundledOilUi(config);
  return SKILLS.map((skill) => skill.key).filter((key) => key !== 'oil-ui' || includeOilUi);
}

const ROUTING_PROMPT = [
  'For any new UI or visual design request, load the mugidaisuki-ui skill first and follow its prompt-first workflow:',
  'write a concrete design prompt, present 2-3 genuinely distinct style-prompt options, and wait for the user to choose.',
  'After the choice, load the active oil-ui skill and iterate from real screenshots to the final deliverable.',
  'Do not start building the full page before the style prompt is chosen unless the user explicitly says to proceed without questions.',
  'Keep the chosen prompt and each revision under design/prompts/ in the project.',
].join(' ');

/**
 * Cordis plugin entry.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ registerOilUi?: boolean | 'auto' }} [config]
 */
export function apply(ctx, config = {}) {
  const keys = skillKeysFor(config);

  ctx.inject(['skills'], (skillsCtx) => {
    skillsCtx.effect(() => {
      const disposers = keys.map((key) => registerSkill(skillsCtx, key));
      return () => {
        for (const dispose of disposers) dispose();
      };
    });
  });

  ctx.inject(['systemPrompt'], (systemCtx) => {
    if (typeof systemCtx.systemPrompt?.section !== 'function') return;
    systemCtx.effect(() =>
      systemCtx.systemPrompt.section({
        name: 'mugidaisuki-ui',
        order: 69,
        interpolate: false,
        text: ROUTING_PROMPT,
      }),
    );
  });
}
