# NOTICE

## dsh-mugidaisuki-ui plugin

`dsh-mugidaisuki-ui` is the plugin/repository name; the mounted entry is
`mugidaisuki-ui`, the npm package/bundle name is `dsh-mugidaisuki-ui`, and the
registered upstream design skill remains **`oil-ui`**.

The DeepSeek Harness plugin code in `lib/`, `scripts/`, `test/`,
`cordis.patch.yml`, the README files and CI configuration is
Copyright (c) 2026 yuchengdagongzi, licensed under the MIT License in
[LICENSE](LICENSE).

## Bundled skills

### oil-ui

`skills/oil-ui/` is the Oil UI skill from
[oil-oil/oil-ui](https://github.com/oil-oil/oil-ui), version 0.23.9.

Copyright (c) 2026 oil-oil. Licensed under the MIT License; the upstream
license text is kept verbatim at `skills/oil-ui/LICENSE`.

The vendored copy is unmodified. `lib/skills.generated.js` is derived from
`skills/oil-ui/SKILL.md`: YAML frontmatter moves into plugin metadata and
`${CLAUDE_SKILL_DIR}` placeholders are resolved at registration time.
Everything else, including references, scripts, assets and tests, is copied
as-is.

The bundled copy is a fallback: when the official `dsh-oil-ui` package is
installed in the same profile, `lib/index.js` does not register `oil-ui` so the
official transformed skill (and its `oil_ui_*` tools) wins.

### prompt-engineering-patterns

`skills/prompt-engineering-patterns/` comes from the local install of
`prompt-engineering-patterns`, originally from
[wshobson/agents](https://github.com/wshobson/agents).

Copyright (c) 2024 Seth Hobson. Licensed under the MIT License; a copy of the
upstream license is added at
`skills/prompt-engineering-patterns/LICENSE` because the local skill directory
did not include one.

The local frontmatter description is harness-specific; the body and reference
files are vendored as installed. The skill is registered so the workflow can
load its prompt templates and optimization guidance.

### mugidaisuki-ui workflow

`skills/mugidaisuki-ui/` is original to this repository: a prompt-first design
workflow with a design-prompt template and six style-prompt archetypes.
Copyright (c) 2026 yuchengdagongzi, MIT.

## Renaming

The plugin was previously named `dsh-oil-ui-skill`, then `dsh-mugi-ui`, and is
now `dsh-mugidaisuki-ui`. The registered `oil-ui` skill name never changed, so
the vendored oil-ui content stays byte-for-byte identical to upstream.
MIT permits the plugin rename and redistribution provided the copyright and
permission notices above are retained.

## Trademarks and affiliation

`Oil UI`, `Oil UI Pro` and the Oil UI logo belong to oil-oil. MIT does not
grant trademark rights. This repository keeps the upstream files inside
`skills/oil-ui/` for compatibility and attribution, does not use the Oil UI
logo as its own project branding, and is not affiliated with or endorsed by
oil-oil or the DeepSeek Harness maintainers.

`mugidaisuki-ui` is not a registered trademark of this project; check for
conflicting names before commercial publication.
