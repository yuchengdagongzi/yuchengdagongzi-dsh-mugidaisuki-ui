# AGENTS.md

This repository packages three skills as the **dsh-mugidaisuki-ui** DeepSeek
Harness plugin. Keep the runtime thin: it registers skills plus one short
routing system-prompt section; it does not implement design tools or commands.

## Identity

- Plugin/repository/package: `dsh-mugidaisuki-ui`
- Mounted entry id: `mugidaisuki-ui`
- Registered skills:
  - `mugidaisuki-ui` — original prompt-first workflow (always)
  - `prompt-engineering-patterns` — vendored prompt skill (always)
  - `oil-ui` — vendored design skill, fallback only

## Rules

- `skills/oil-ui/` and `skills/prompt-engineering-patterns/` are vendored
  upstream content. Do not hand-edit them for packaging reasons; keep their
  licenses intact.
- `skills/mugidaisuki-ui/` is original workflow content. Keep it about process:
  prompt → style options → user choice → oil-ui execution → iterative polish.
  Do not turn it into a second oil-ui rewrite.
- The bundled `oil-ui` must not override the official `dsh-oil-ui`. Keep the
  `registerOilUi: auto | true | false` policy: `auto` skips the bundled copy
  when `dsh-oil-ui` is resolvable in the same profile.
- `lib/skills.generated.js` and `skills/*.manifest.json` are generated. Never
  edit them by hand; run `npm run build` and commit both.
- `lib/index.js` must stay dependency-free at runtime. Imports are limited to
  Node builtins and the generated module.
- One short system-prompt routing section is allowed (it routes new design
  requests to the workflow). Do not add tools, slash commands or background
  work.
- Run `npm run verify` before claiming the work is done. When the source skills
  are available, also run:
  `OIL_UI_SOURCE_DIR=<source> PROMPT_SKILL_SOURCE_DIR=<source> npm run audit`
  and confirm every file is byte-identical.
- If you have an unpacked DSH runtime, run the optional integration test with
  `DSH_RUNTIME_DIR` set.
- Do not commit `node_modules`, tarballs, build leftovers or local DSH profile
  data.

## Layout

- `lib/index.js` — registers the three skills and the routing system prompt.
- `scripts/build.mjs` — parses all `SKILL.md` frontmatter and writes
  `lib/skills.generated.js`; `--check` verifies freshness.
- `scripts/build-manifest.mjs` — writes/checks the three skill inventories.
- `scripts/audit-skill.mjs` — manifest, optional source comparison, link and
  inline-path audit.
- `scripts/verify.mjs` — package wiring and resource checks.
- `test/plugin.test.mjs` — unit tests with a fake context.
- `test/integration.dsh.test.mjs` — optional real `SkillRegistry` test.

## Upstream sync

1. Replace `skills/oil-ui/` or `skills/prompt-engineering-patterns/`.
2. `npm run build`
3. `OIL_UI_SOURCE_DIR=<oil-ui> PROMPT_SKILL_SOURCE_DIR=<prompt-skill> npm run audit`
4. Update `CHANGELOG.md`.
5. `npm run verify`
