# dsh-mugidaisuki-ui

[English](README.en.md)

一个 **DeepSeek Harness** 插件，把三件事装在一起：

1. **`mugidaisuki-ui`** — 提示词优先的工作流：用户提需求后，先写设计提示词，再给 2–3 个风格提示词方案，等用户选定后才调用 oil-ui 做页面，并按轮次打磨到成品。
2. **`prompt-engineering-patterns`** — 提示词模板、结构化输出、CoT、few-shot、优化与评估方法（MIT，Seth Hobson）。
3. **`oil-ui`** — 完整的设计 Skill（MIT，oil-oil），作为**后备副本**分发；检测到官方 `dsh-oil-ui` 时自动跳过注册，避免抢同名 Skill。

- 插件版本：**0.3.0**
- 包名/bundle：**`dsh-mugidaisuki-ui`**
- 支持：DSH `0.2.1-rc.2` / `0.2.1-rc.3`
- 运行时零依赖，安装时不需要构建

> 本插件不是 oil-oil 或 DeepSeek 官方项目。官方原生插件是 [dsh-oil-ui](https://github.com/oil-oil/dsh-oil-ui)，它把 oil-ui 改写成 5 个 `oil_ui_*` 原生工具；本插件保留 oil-ui 原文，并新增提示词工作流。官方插件已安装时，本插件会自动使用官方 oil-ui，不再注册自己的副本。

## 工作流：先提示词，后页面

用户提出新界面/改版/截图还原需求后：

1. **接住需求**：复述产品、用户、主任务、交付物、约束；最多问三个会改变方向的问题。
2. **写设计提示词 v1**：角色/任务、真实内容、风格来源、视觉方向、约束、交付、验收。
3. **给 2–3 个风格提示词方案**：每个方向带版式/字体/色彩/主视觉/动效和一段可直接使用的提示词；任意两个方向至少两项不同，不能只换颜色。
4. **等用户选**：选一个、合并，或说“你定/直接做”。**选之前不写完整页面**。
5. **保存提示词并执行**：写入 `design/prompts/round-01.md`，加载当前生效的 `oil-ui`（官方或内置）开始制作。
6. **逐轮打磨**：每轮先写修改提示词，再改页面，截真实画面，说明差距，只问一个聚焦问题；提示词追加到 `round-02.md`、`round-03.md`。
7. **交付**：最终提示词、方向理由、每轮改了什么、真实/占位内容、证据路径、未完成项。

工作流 Skill 自带：

- [设计提示词模板](skills/mugidaisuki-ui/references/design-prompt-template.md)
- [6 种风格提示词方案](skills/mugidaisuki-ui/references/style-prompt-options.md)（编辑杂志、瑞士、温暖手作、粗野主义、电影感暗色、玩具感）

插件还会注入一段很短的 system prompt，要求新设计需求先走 `mugidaisuki-ui` 工作流；具体设计方法仍由 oil-ui 负责。

## 安装

```bash
dsh plugin --profile desktop add github:yuchengdagongzi/dsh-mugidaisuki-ui
```

Web / Headless 把 `desktop` 换成 `web` / `headless`。

`dsh` 不在 PATH 时，用安装目录里的启动器：

```powershell
& "<DeepSeek Harness 安装目录>\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add github:yuchengdagongzi/dsh-mugidaisuki-ui
```

重启 DSH 后即可使用。

### 和官方 dsh-oil-ui 共存

`oil-ui` 同名冲突的处理是**自动的**：

- 检测到同 profile 安装了官方 `dsh-oil-ui` → 只注册 `mugidaisuki-ui` 和 `prompt-engineering-patterns`，oil-ui 用官方的（保留原生工具）
- 没有官方插件 → 额外注册内置的 oil-ui 副本（用脚本模式工作）
- 强制开启/关闭内置副本，在 profile 的 `cordis.patch.yml` 加：

```yaml
- id: mugidaisuki-ui
  config:
    registerOilUi: auto # auto | true | false
```

`true` 会让内置副本覆盖同名 Skill（不推荐和官方插件同时用）；`false` 只注册工作流和提示词 Skill。

### 其他说明

- 不要把本插件和官方 `dsh-oil-ui` 同时**强制**注册同名 oil-ui。
- 独立安装的 `~/.dsh/skills/prompt-engineering-patterns` 会被插件内置版本覆盖（内容来自同一份本机副本，见 NOTICE）。
- oil-ui 的版本检查会访问 `ui.oiloil.org`（最多每 10 分钟一次，只读版本列表）；设 `OIL_NO_UPDATE_CHECK=1` 关闭。
- 截图/素材脚本需要 Chrome/Chromium/Edge 和 Python 3；不是每个步骤都用到。

## 改名与许可

- **oil-ui**：MIT，Copyright (c) 2026 oil-oil。完整许可证在 [skills/oil-ui/LICENSE](skills/oil-ui/LICENSE)。插件保留了 MIT 文本和 NOTICE，未删除来源。
- **prompt-engineering-patterns**：MIT，Copyright (c) 2024 Seth Hobson，来自 [wshobson/agents](https://github.com/wshobson/agents)。许可证在 [skills/prompt-engineering-patterns/LICENSE](skills/prompt-engineering-patterns/LICENSE)。
- **mugidaisuki-ui 工作流与插件代码**：MIT，Copyright (c) 2026 yuchengdagongzi，见 [LICENSE](LICENSE)。

**改名合法吗？** MIT 允许复制、修改、改名和再分发，条件是保留版权声明和许可证文本；本仓库保留了。**商标要单独看**：MIT 不授予商标权，不要把 `Oil UI` 的 logo/品牌当作自己的，也不要声称官方或背书。`mugidaisuki-ui` 是一个新名字，发布前仍建议确认没有同名商标/包名冲突；商业使用请咨询律师。这不是法律意见。

改名历史：`dsh-oil-ui-skill` → `dsh-mugi-ui` → **`dsh-mugidaisuki-ui`**。注册的 `oil-ui` 名称始终未改，保证逐字节复刻。

## 复刻与验证

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

- oil-ui：38 个运行时文件 + `.gitignore`，与源目录 **39/39 逐字节一致**
- prompt-engineering-patterns：10 个源文件逐字节一致，打包另加一份上游 MIT LICENSE
- mugidaisuki-ui：本仓库原创的 3 个文件
- 三个 manifest 记录每个文件的路径、大小、SHA-256
- 真实 DSH 运行时集成测试会注册三个 Skill 并逐个读回；单元测试覆盖 oil-ui 自动降级、强制开关和 system prompt 注入

详细结果见 [docs/verification.md](docs/verification.md)。

## 开发

```bash
npm run build   # 生成 lib/skills.generated.js 和三个 manifest
npm run check   # 检查生成文件是否过期
npm run audit   # manifest + 链接 + 可选源目录逐字节比较
npm run verify  # check + audit + 结构检查 + 单元测试
```

和安装的 Skill 做逐字节比较：

```bash
OIL_UI_SOURCE_DIR="C:\Users\gongzi\.dsh\skills\oil-ui" \
PROMPT_SKILL_SOURCE_DIR="C:\Users\gongzi\.dsh\skills\prompt-engineering-patterns" \
npm run audit
```

可选真实 DSH 运行时测试：

```bash
DSH_RUNTIME_DIR=/path/to/dsh npm run test:integration
```

`DSH_RUNTIME_DIR` 指向包含 DSH 运行时 `package.json` 和 `node_modules` 的目录（例如解包后的 `<安装目录>/resources/app.asar` 里的 `dsh/`）。

### 更新上游

1. 替换 `skills/oil-ui/` 或 `skills/prompt-engineering-patterns/`
2. `npm run build`
3. 对应源目录跑 `npm run audit`，确认逐字节一致
4. 更新 `CHANGELOG.md`
5. `npm run verify`

## 目录

```text
.
├─ lib/
│  ├─ index.js                 # 注册三个 Skill + 路由 system prompt
│  └─ skills.generated.js      # 三个 Skill 的正文、元数据和 SHA-256
├─ skills/
│  ├─ mugidaisuki-ui/          # 提示词优先工作流（原创）
│  ├─ prompt-engineering-patterns/  # MIT, Seth Hobson
│  ├─ oil-ui/                  # MIT, oil-oil（后备副本）
│  └─ *.manifest.json          # 三份文件清单
├─ scripts/
│  ├─ build.mjs                # frontmatter 解析 + 三个 Skill 代码生成
│  ├─ build-manifest.mjs       # 三份 manifest
│  ├─ audit-skill.mjs          # 清单/源目录/链接/内联路径审计
│  └─ verify.mjs               # 包结构与资源检查
├─ test/
│  ├─ plugin.test.mjs
│  └─ integration.dsh.test.mjs
└─ .github/workflows/ci.yml
```

## 许可

插件代码与 `skills/mugidaisuki-ui/` 使用 MIT，见 [LICENSE](LICENSE)。两个上游 Skill 的许可证分别保留在各自目录，完整归属见 [NOTICE.md](NOTICE.md)。
