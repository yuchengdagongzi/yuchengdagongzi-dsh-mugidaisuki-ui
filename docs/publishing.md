# 发布到 GitHub

仓库已经初始化并提交到 `main`，只差创建一个远端仓库并推送。以下命令都在本目录执行。

## 1. 创建远端仓库

在 GitHub 网页新建一个 **空仓库**：

- 名称：`dsh-mugidaisuki-ui`（仓库、npm 包、bundle 名一致）
- 可见性：Public（或 Private，安装命令相应换成带权限的方式）
- 不要勾选 “Add a README file / .gitignore / license”，本仓库已经有这些文件

如果本机装了 `gh` 并已登录，也可以直接：

```bash
gh repo create yuchengdagongzi/dsh-mugidaisuki-ui --public --source=. --push
```

## 2. 推送

本仓库已经添加了 `origin`（`https://github.com/yuchengdagongzi/dsh-mugidaisuki-ui.git`）。远端空仓库建好后直接运行：

```bash
git push -u origin main
```

如果最终仓库地址不同：

```bash
git remote set-url origin https://github.com/<user>/<repo>.git
git push -u origin main
```

推送后 GitHub Actions 会按 `.github/workflows/ci.yml` 跑 `npm run verify`。

## 3. 打版本标签

当前版本是 `0.3.0`：

```bash
git tag v0.3.0
git push origin v0.3.0
```

可以在 GitHub Releases 里基于该标签发布说明，内容参考 `CHANGELOG.md`。

## 4. 验证安装

在另一台机器或全新的 profile 中：

```bash
dsh plugin --profile desktop add github:yuchengdagongzi/dsh-mugidaisuki-ui
```

然后重启 DSH，在对话里提一个界面需求。预期行为：

1. 先复述需求并写设计提示词
2. 给出 2–3 个风格提示词方案
3. 等你选择后才开始做页面
4. 每轮先改提示词再改界面，直到你确认成品

如果行为不对，检查：

- profile 的 `package.json` 的 `dsh.profile.bundles` 是否包含 `dsh-mugidaisuki-ui`；
- 是否和官方 `dsh-oil-ui` 同时**强制**注册了同名 oil-ui（默认 auto 会跳过内置副本）；
- 是否完全退出了 Desktop 再执行安装；
- 当前会话是否加载了新的 system prompt（需要重启 DSH）。

## 修改仓库地址或包名时

如果最终的用户名、仓库名或包名不是 `yuchengdagongzi/dsh-mugidaisuki-ui`，同步修改：

- `package.json` 的 `name`、`repository`、`homepage`、`bugs`
- `cordis.patch.yml` 的 `name`（必须等于 package name）
- `lib/index.js` 的 `export const name`（产品名）
- `README.md`、`README.en.md`、`docs/verification.md` 里的安装命令
- `NOTICE.md` 里如有引用

改完运行 `npm run verify` 再提交。Skill 内容、生成文件和 manifest 不受包名影响。
