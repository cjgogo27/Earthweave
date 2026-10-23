# 独立部署 / Independent deployment

本仓库可运行于 Cloudflare Workers + D1 + R2，不需要 OpenAI 密钥、ChatGPT 账户或 Sites 登录。Cloudflare 账户只供部署者管理基础设施，网站访客不需要该账户。

The application runs on Cloudflare Workers, D1, and R2 without an OpenAI API key, ChatGPT account, or Sites sign-in. A Cloudflare account is needed by the deployer, not by visitors.

## 本地开发 / Local development

需要 Node.js 22.13+ 和 npm，在项目根目录运行：

```sh
npm ci
npm run db:migrate
npm run dev
```

`db:migrate` 执行以下本地迁移命令：

```sh
wrangler d1 migrations apply DB --local --config wrangler.json --persist-to .wrangler/state
```

本地 D1/R2 状态保存在 `.wrangler/state`，不应提交到 Git。开发使用配置中的本地绑定，不需要先创建远程数据库。迁移文件由 Wrangler 跟踪，反复运行迁移命令只应用待执行项。

Local D1/R2 state lives in `.wrangler/state` and must not be committed. Remote resources are not required for local development. Wrangler tracks applied migrations and applies only pending ones.

## 创建资源 / Create resources

```sh
npx wrangler login
npx wrangler d1 create earthweave
npx wrangler r2 bucket create earthweave-media
```

将 D1 创建结果中的真实 UUID 写入 `wrangler.json` 对应 `database_id`。检查 `database_name` 与 `bucket_name`，确保对应本次创建的资源。应用绑定名保持 `DB` 和 `BUCKET`；如果改变绑定名，需要同步修改应用代码和类型声明。

Copy the real D1 UUID returned by creation into `database_id` in `wrangler.json`. Match `database_name` and `bucket_name` to your resources. Keep the `DB` and `BUCKET` binding names unless you also adapt the code and type declarations.

不要把 Cloudflare API Token 写入配置文件或提交到仓库。Wrangler 登录及部署凭据由部署环境管理。创建与使用资源受部署者账户的服务额度和计费设置约束。

Do not put Cloudflare API tokens in source configuration. Manage credentials through Wrangler or your deployment environment. Resource usage belongs to the deploying account and its service limits and billing settings.

## 构建与部署 / Build and deploy

```sh
npm run build
npm run deploy
```

部署脚本会校验真实 D1 ID、构建、应用远程 SQL 迁移，然后发布 Worker。它会改变远程应用和数据库；首次部署前检查资源归属，后续含破坏性数据库变更的版本应先备份并审查迁移。

The deploy script validates the D1 ID, builds the app, applies remote migrations, and deploys the Worker. It changes the remote application and database. Verify resource ownership, and review and back up before applying destructive schema changes.

部署后使用 Wrangler 返回的 HTTPS 地址，或配置自己的域名。不要仅凭构建退出码判断远程已上线；在返回的网址验证页面、`/api/scenes`、上传读回和删除测试记录。头显还需按 [VR 清单](vr-test.md)实测。

Use the HTTPS URL returned by deployment, or configure your own domain. A build exit code does not establish that a remote deployment is live. Verify the page, `/api/scenes`, upload/readback, and deletion of your own test record at the deployed URL, then run the [VR checklist](vr-test.md).

## 匿名会话与公开访问 / Anonymous sessions and public access

公开网站访客直接访问即可，应用自动建立 HttpOnly Cookie 会话。管理权只属于原上传浏览器；跨设备可浏览内容，但不会自动同步删除权限。清 Cookie 或过期后没有自动找回。详见 [架构说明](architecture.md)。

Public visitors can enter directly; the app creates an HttpOnly cookie session. Ownership stays in the uploading browser. Other devices can browse but do not inherit deletion authority. Clearing cookies or expiry provides no automatic recovery.

如果将应用放在额外访问网关后，该网关的限制独立于应用。要让公众直达，部署者需要配置网关的公开访问；不应重新接入 GPT 登录来建立上传者身份。

Any additional access gateway has its own policy. Public access must be configured at that layer; GPT sign-in is not required to identify upload owners.

## 不支持的部署方式 / Unsupported targets

- GitHub Pages 是静态托管，不能独立运行本项目的 API、D1 与 R2。GitHub 仓库是源码发布位置，不等于网站运行环境。
- 传统 Node/VPS 部署尚需适配 Worker API、数据库与对象存储绑定；不能把 `npm start` 直接当作完整生产部署。
- 仓库中的 Sites 辅助文件为可选兼容能力；独立 Cloudflare 路径使用 `wrangler.json`。

GitHub Pages cannot run this backend. A GitHub repository distributes source, not the running service. Traditional Node/VPS hosting requires adaptation of Worker APIs and storage bindings. Optional Sites helpers do not replace the standalone `wrangler.json` deployment path.
