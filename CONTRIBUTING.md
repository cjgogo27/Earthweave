# 参与贡献 / Contributing

欢迎通过 [Issues](https://github.com/cjgogo27/Earthweave/issues) 报告问题或讨论功能，并提交聚焦单个问题的 Pull Request。请说明触发条件、预期与实际结果；设备问题附浏览器、系统、头显型号与可复现步骤。

Open an [issue](https://github.com/cjgogo27/Earthweave/issues) to report a bug or discuss a feature, and keep pull requests focused. Include the trigger, expected and actual behavior, and reproduction steps. Device reports should include the browser, OS, and headset model.

## 开发流程 / Development

1. Fork 后按 [README](README.md) 或 [English README](README.en.md) 安装、迁移并启动开发服务。
2. 修改代码，保持中文与英文界面含义一致；用户内容不自动翻译。
3. 数据结构变化须提交新 SQL 迁移，不改写已发布迁移。
4. 运行与修改相关的测试、`npx tsc --noEmit` 与 `npm run build`。涉及上传、会话或导入时运行本地集成测试。
5. PR 中说明改变了什么、为何需要、怎样验证，以及尚未验证的设备或场景。

Install and migrate as described in the README, keep both UI languages consistent, add new migrations instead of rewriting published ones, and run relevant tests, type checking, and the build. Explain the behavior change and verification in the PR. Mark untested hardware explicitly; a build is not a headset test.

## 素材与许可 / Media and licensing

只提交你有权共享的测试素材，并保留来源、作者和许可。优先使用小型合成测试文件；不要提交 Cookie、数据库、用户上传、密钥、`.wrangler/`、`node_modules/` 或构建产物。

Submit only media you can share, with provenance and license information. Prefer small synthetic fixtures. Never commit cookies, databases, user uploads, credentials, runtime state, dependencies, or build output.

原创贡献适用仓库 [MIT License](LICENSE)；第三方代码与素材保留原始许可与通知。添加依赖或复制代码时更新 [NOTICE](NOTICE.md)，不要把第三方版权改成 Earthweave 的版权。

Original contributions use the repository's [MIT License](LICENSE). Retain third-party licenses and notices, update [NOTICE](NOTICE.md) when adding copied code or assets, and do not replace upstream copyright statements.

安全问题不要公开泄露复现所需的敏感数据，请按 [SECURITY.md](SECURITY.md) 联系维护者。

For security issues, use [SECURITY.md](SECURITY.md) instead of disclosing sensitive reproduction data in a public issue.
