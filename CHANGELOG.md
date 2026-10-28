# Changelog

## 0.3.0

- Rename the plugin/repository/package to **dsh-mugidaisuki-ui**
  (mounted entry `mugidaisuki-ui`).
- Bundle **prompt-engineering-patterns** (MIT, Seth Hobson / wshobson/agents)
  and register it as a second skill.
- Add the original **mugidaisuki-ui** workflow skill:
  design prompt → 2-3 style-prompt options → user choice → oil-ui execution →
  iterative polish → final deliverable.
- Add a design-prompt template and six style-prompt archetypes under
  `skills/mugidaisuki-ui/references/`.
- Add a short system-prompt routing section so new design requests start with
  the prompt-first workflow.
- Register the bundled **oil-ui** only as a fallback: it is skipped when the
  official `dsh-oil-ui` package is installed in the same profile. Configurable
  with `registerOilUi: auto | true | false`.
- Generate all three skills into `lib/skills.generated.js` and build one
  manifest per skill tree.
- Extend the audit to all bundled skills, including per-skill optional source
  comparison and Markdown/inline-path checks.

## 0.2.0

- Rename the plugin/repository to **mugi-ui** and the npm package to
  **`dsh-mugi-ui`**. The registered skill remains **`oil-ui`** so the vendored
  content stays a perfect replica.
- Add `skills/oil-ui.manifest.json`: path, size and SHA-256 for all 38 runtime
  files in the vendored skill.
- Add `scripts/build-manifest.mjs` and `scripts/audit-skill.mjs`.
- The audit compares the vendored tree against `OIL_UI_SOURCE_DIR` when set and
  reports **39/39 files byte-identical** (including `.gitignore`), checks 44
  relative Markdown links and 4 inline paths.
- Record the generated body SHA-256 in the generated module.
- Document the MIT rename rules and the trademark/name-availability caveats.

## 0.1.0

- Initial release.
- Bundle upstream **oil-ui 0.23.9** (MIT) as a DSH skill plugin.
- Register `oil-ui` through `ctx.skills.register()` with the complete upstream
  skill tree as its `resourceBase`, so relative `references/`, `scripts/` and
  `assets/` paths resolve on the installed machine.
- Replace `${CLAUDE_SKILL_DIR}` in the skill body with the installed absolute
  path (forward slashes, for POSIX shells and Git Bash).
- Commit generated files so installing needs no build step.
- Add structural verification, unit tests, an optional real-DSH registry
  integration test and GitHub Actions CI.
