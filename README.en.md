# dsh-mugidaisuki-ui

[中文](README.md)

A **DeepSeek Harness** plugin that bundles three things:

1. **`mugidaisuki-ui`** — a prompt-first workflow: after a design request, write a design prompt, present 2-3 style-prompt options, wait for the user's choice, then run oil-ui and iterate to the final deliverable.
2. **`prompt-engineering-patterns`** — prompt templates, structured outputs, chain-of-thought, few-shot, optimization and evaluation (MIT, Seth Hobson).
3. **`oil-ui`** — the complete design skill (MIT, oil-oil), shipped as a **fallback copy**. When the official `dsh-oil-ui` is installed, the plugin skips registering it to avoid a name collision.

- Plugin version: **0.3.0**
- Package/bundle name: **`dsh-mugidaisuki-ui`**
- Supported DSH: `0.2.1-rc.2` / `0.2.1-rc.3`
- Zero runtime dependencies; installing needs no build

> This is not an official oil-oil or DeepSeek project. The official native plugin is [dsh-oil-ui](https://github.com/oil-oil/dsh-oil-ui); it rewrites oil-ui into five `oil_ui_*` native tools. This plugin keeps oil-ui unchanged and adds a prompt-first workflow. When the official plugin is installed, this plugin uses its oil-ui instead of registering a duplicate.

## Prompt-first workflow

For a new interface, redesign or screenshot-recreation request:

1. **Restate the request**: product, users, primary task, deliverable, constraints; ask at most three direction-changing questions.
2. **Write design prompt v1**: role/task, real content, style source, visual direction, constraints, delivery, acceptance.
3. **Present 2-3 style-prompt options**: each with layout, typography, color, key imagery, motion and a ready-to-use prompt paragraph. Any two options must differ in at least two of those dimensions.
4. **Wait for the choice**: pick one, merge, or say "you decide / just do it". **Do not build the full page before this.**
5. **Save the prompt and execute**: write `design/prompts/round-01.md`, load the active `oil-ui` (official or bundled), and start building.
6. **Iterate**: each round begins with a revision prompt, then the build, a real screenshot, the gap versus the prompt, and one focused question. Append `round-02.md`, `round-03.md`…
7. **Deliver**: final prompt, chosen direction, what changed each round, real vs mocked content, evidence paths, remaining work.

The workflow skill ships with:

- [Design prompt template](skills/mugidaisuki-ui/references/design-prompt-template.md)
- [Six style-prompt archetypes](skills/mugidaisuki-ui/references/style-prompt-options.md) (editorial, Swiss, warm organic, brutalist, cinematic dark, playful toy)

A short system-prompt section routes new design requests through `mugidaisuki-ui`; the actual design work remains in oil-ui.

## Install

```bash
dsh plugin --profile desktop add github:yuchengdagongzi/dsh-mugidaisuki-ui
```

Use `--profile web` or `--profile headless` for those profiles.

If `dsh` is not on PATH, use the launcher shipped with the installation:

```powershell
& "<DeepSeek Harness install dir>\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add github:yuchengdagongzi/dsh-mugidaisuki-ui
```

Restart DSH afterwards.

### Coexistence with the official dsh-oil-ui

The `oil-ui` collision is handled automatically:

- If the official `dsh-oil-ui` is installed in the same profile, only `mugidaisuki-ui` and `prompt-engineering-patterns` are registered; oil-ui comes from the official plugin (with its native tools).
- If it is not installed, the bundled oil-ui fallback is registered as well (script mode).
- Force the choice in the profile's `cordis.patch.yml`:

```yaml
- id: mugidaisuki-ui
  config:
    registerOilUi: auto # auto | true | false
```

`true` makes the bundled copy shadow the same-name skill (not recommended alongside the official plugin); `false` registers only the workflow and prompt skills.

### Notes

- Do not force-register two copies of the same `oil-ui` name.
- A standalone `~/.dsh/skills/prompt-engineering-patterns` is shadowed by the bundled copy (same local source; see NOTICE).
- The oil-ui version check contacts `ui.oiloil.org` (at most once every 10 minutes, read-only version list); set `OIL_NO_UPDATE_CHECK=1` to disable.
- Screenshot/media scripts expect Chrome/Chromium/Edge and Python 3; only some steps need them.

## Renaming and licensing

- **oil-ui**: MIT, Copyright (c) 2026 oil-oil. Full license at [skills/oil-ui/LICENSE](skills/oil-ui/LICENSE).
- **prompt-engineering-patterns**: MIT, Copyright (c) 2024 Seth Hobson, from [wshobson/agents](https://github.com/wshobson/agents). License at [skills/prompt-engineering-patterns/LICENSE](skills/prompt-engineering-patterns/LICENSE).
- **mugidaisuki-ui workflow and plugin code**: MIT, Copyright (c) 2026 yuchengdagongzi, see [LICENSE](LICENSE).

**Is renaming legal?** MIT permits copying, modification, renaming and redistribution provided the copyright and permission notices are retained; this repository retains them. **Trademarks are separate**: MIT does not grant trademark rights. Do not present the Oil UI name/logo as your own or claim official endorsement. `mugidaisuki-ui` is a new name; check for conflicting trademarks/package names before publishing, and consult a lawyer for commercial use. This is not legal advice.

Rename history: `dsh-oil-ui-skill` → `dsh-mugi-ui` → **`dsh-mugidaisuki-ui`**. The registered `oil-ui` skill name never changed, preserving the byte-for-byte replica.

## Replica and verification

```text
$ OIL_UI_SOURCE_DIR="C:\Users\gongzi\.dsh\skills\oil-ui" \
  PROMPT_SKILL_SOURCE_DIR="C:\Users\gongzi\.dsh\skills\prompt-engineering-patterns" \
  npm run audit
ok  oil-ui: source 39/39 files byte-identical
ok  prompt-engineering-patterns: source 10/10 files byte-identical (+LICENSE added by packaging)
ok  mugidaisuki-ui: original workflow (no upstream source comparison)
...
ok: all bundled skills audited
```

- oil-ui: 38 runtime files + `.gitignore`, **39/39 byte-identical**
- prompt-engineering-patterns: 10 source files byte-identical; an upstream MIT LICENSE is added
- mugidaisuki-ui: three original files
- Three manifests record path, size and SHA-256 for every file
- The real DSH runtime integration test registers all three skills and reads each back; unit tests cover the oil-ui fallback policy, forced switches and system-prompt injection

Full results: [docs/verification.md](docs/verification.md).

## Development

```bash
npm run build   # generate lib/skills.generated.js and the three manifests
npm run check   # fail if generated files are stale
npm run audit   # manifests + links + optional byte-for-byte source comparison
npm run verify  # check + audit + structural checks + unit tests
```

Compare against the installed skills:

```bash
OIL_UI_SOURCE_DIR="C:\Users\gongzi\.dsh\skills\oil-ui" \
PROMPT_SKILL_SOURCE_DIR="C:\Users\gongzi\.dsh\skills\prompt-engineering-patterns" \
npm run audit
```

Optional real DSH runtime test:

```bash
DSH_RUNTIME_DIR=/path/to/dsh npm run test:integration
```

`DSH_RUNTIME_DIR` must contain the DSH runtime `package.json` and `node_modules` (for example an extracted `<install>/resources/app.asar/dsh/` directory).

### Updating upstream

1. Replace `skills/oil-ui/` or `skills/prompt-engineering-patterns/`
2. `npm run build`
3. Run `npm run audit` with the matching source env and confirm byte-for-byte equality
4. Update `CHANGELOG.md`
5. `npm run verify`

## Layout

```text
.
├─ lib/
│  ├─ index.js                 # registers three skills + routing system prompt
│  └─ skills.generated.js      # bodies, metadata and SHA-256 for all skills
├─ skills/
│  ├─ mugidaisuki-ui/          # prompt-first workflow (original)
│  ├─ prompt-engineering-patterns/  # MIT, Seth Hobson
│  ├─ oil-ui/                  # MIT, oil-oil (fallback)
│  └─ *.manifest.json          # three file inventories
├─ scripts/
│  ├─ build.mjs                # frontmatter parser + codegen
│  ├─ build-manifest.mjs       # three manifests
│  ├─ audit-skill.mjs          # manifests/source/links/inline-path audit
│  └─ verify.mjs               # package and resource checks
├─ test/
│  ├─ plugin.test.mjs
│  └─ integration.dsh.test.mjs
└─ .github/workflows/ci.yml
```

## License

Plugin code and `skills/mugidaisuki-ui/` are MIT; see [LICENSE](LICENSE). The two upstream skills retain their own licenses in their directories; full attribution is in [NOTICE.md](NOTICE.md).
