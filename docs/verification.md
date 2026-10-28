# Verification

Recorded while packaging the local `oil-ui` (0.23.9) and
`prompt-engineering-patterns` skills on 2026-10-28, after renaming the plugin to
**dsh-mugidaisuki-ui** (mounted entry `mugidaisuki-ui`).

Environment: Windows, Node.js 24.21.0, DeepSeek Harness runtime `0.2.1-rc.3`.
The official `dsh-oil-ui` plugin is installed in this machine's profile; the
coexistence case is covered in section 5.

## 1. Structural checks and unit tests

```text
$ OIL_UI_SOURCE_DIR=... PROMPT_SKILL_SOURCE_DIR=... npm run verify
ok: 48 structural checks passed
...
✔ plugin identity and bundled skill directories
✔ oil-ui fallback policy can be forced either way
✔ apply registers the workflow, the prompt skill and the oil-ui fallback
✔ apply can omit the bundled oil-ui
✔ registerSkill loads one skill and rejects unknown keys
✔ package metadata matches the plugin wiring
✔ bundle patch mounts this package by name
✔ generated catalog records body hashes for all skills
✔ skill manifests inventory all three trees
✔ required skill resources exist
ℹ tests 11
ℹ pass 10
ℹ fail 0
ℹ skipped 1   (DSH_RUNTIME_DIR not set)
```

## 2. Skill fidelity audit

Each bundled skill has a manifest and an optional byte-for-byte source
comparison:

```text
$ OIL_UI_SOURCE_DIR="C:\Users\gongzi\.dsh\skills\oil-ui" \
  PROMPT_SKILL_SOURCE_DIR="C:\Users\gongzi\.dsh\skills\prompt-engineering-patterns" \
  npm run audit
ok  oil-ui: manifest 38/38 files match
ok  oil-ui: source 39/39 files byte-identical
ok  oil-ui: 44 links, 4 inline paths, required files present
ok  prompt-engineering-patterns: manifest 11/11 files match
ok  prompt-engineering-patterns: source 10/10 files byte-identical (+LICENSE added by packaging)
ok  prompt-engineering-patterns: 0 links, 1 inline paths, required files present
ok  mugidaisuki-ui: manifest 3/3 files match
ok  mugidaisuki-ui: original workflow (no upstream source comparison)
ok  mugidaisuki-ui: 2 links, 0 inline paths, required files present

ok: all bundled skills audited
```

- **oil-ui**: 38 runtime files plus `.gitignore` = 39/39 byte-identical. Only
  frontmatter → metadata and `${CLAUDE_SKILL_DIR}` substitution differ.
- **prompt-engineering-patterns**: 10 source files byte-identical; the package
  adds the upstream MIT license (the local skill directory had no LICENSE).
- **mugidaisuki-ui**: original workflow, three files
  (`SKILL.md` + two references).
- The three manifests record path, size and SHA-256 for every file.
- The prompt skill is stored with its original CRLF line endings; `.gitattributes`
  opts that directory out of EOL normalization. A clean `git archive HEAD`
  checkout kept CRLF (144/144 lines), all manifests matched, and
  `npm run verify` passed there, so the committed bytes—not just the dirty
  working tree—are what was audited.

## 3. Real DSH runtime integration

The extracted DSH runtime supplies the real `@deepseek-ai/cordis` `Context`,
`@deepseek-ai/dsh-skill` `SkillRegistry` and
`@deepseek-ai/dsh-system-prompt` service:

```text
$ DSH_RUNTIME_DIR=<extracted dsh runtime> npm run test:integration
✔ mounts oil-ui, prompt-engineering-patterns and mugidaisuki-ui in a real skill registry
ℹ pass 1
```

The test mounts the plugin with `registerOilUi: true` and asserts:

- the catalog lists `mugidaisuki-ui`, `oil-ui` and
  `prompt-engineering-patterns`;
- each skill loads with its full body;
- each `resourceBase` points at the matching directory under `skills/`;
- `renderSkillContent()` emits the `<skill_content>` wrapper and base-directory
  hint;
- the routing system-prompt section registers without error;
- disposing the plugin fiber removes all three skills.

## 4. Bundle patch mounting

A throwaway profile was created with only this package installed and
`dsh.profile.bundles: ["dsh-mugidaisuki-ui"]`, then:

```text
$ DSH_HOME=<throwaway-dsh-home> dsh --profile test --dump-config
# == dsh-mugidaisuki-ui
- id: mugidaisuki-ui
  name: dsh-mugidaisuki-ui
```

That confirms the loader reads `cordis.patch.yml` from the installed package,
uses the package name for resolution and mounts the entry as `mugidaisuki-ui`.

## 5. Coexistence with official dsh-oil-ui

This machine has the official `dsh-oil-ui` plugin installed. A profile-layout
simulation with a sibling `node_modules/dsh-oil-ui` produced:

```text
hasOfficialOilUi: true
auto keys: [ 'prompt-engineering-patterns', 'mugidaisuki-ui' ]
forced keys: [ 'oil-ui', 'prompt-engineering-patterns', 'mugidaisuki-ui' ]
auto registered: [ 'prompt-engineering-patterns', 'mugidaisuki-ui' ]
```

So the bundled oil-ui is skipped automatically, and the workflow uses the
official transformed oil-ui (with its `oil_ui_*` tools). `registerOilUi: true`
forces the bundled copy; `false` disables it even when no official plugin is
present.

## 6. Package contents

```text
$ npm pack --dry-run --json
63 files
```

The tarball contains `lib/`, `cordis.patch.yml`, all three skill trees
(38 + 11 + 3 files), the three manifests, `README*`, `LICENSE` and `NOTICE.md`.
There is no `prepare`/`postinstall` script, so a git install needs no build
allowance.

## 7. Not run here

- `dsh plugin --profile desktop add github:yuchengdagongzi/dsh-mugidaisuki-ui`
  was not run against the working Desktop profile: the GitHub remote does not
  exist yet and this environment has no GitHub credentials. The command and the
  manual profile edit are documented in the READMEs.
- A full Desktop launch with the plugin enabled was not performed. The real
  Cordis/SkillRegistry/SystemPrompt mount above covers the plugin contract; the
  profile dump covers the bundle wiring.
- Licensing/trademark discussion is in [README.md](../README.md#改名与许可); it
  is not a code verification.
