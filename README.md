# 共境 Earthweave

[English](README.en.md) · [在线体验](https://earthweave-world-20261024.open-puppy-9264.chatgpt.site) · [GitHub 源码](https://github.com/cjgogo27/Earthweave) · [部署指南](docs/deployment.md) · [VR 实机清单](docs/vr-test.md)

由大家共同补充的视觉地球：在地球上找到地点，上传照片、全景或视频，或从网络媒体直链导入，再通过电脑、手机或兼容 WebXR 的头显浏览。

**无需账户，也无需 GPT / ChatGPT 登录。** 网站用当前浏览器的匿名会话识别你的上传。首次打开页面会自动建立会话；清除 Cookie、会话过期或换用其他浏览器后，会失去此前上传内容的管理权限。当前没有账户找回或跨设备所有权同步。

这是可运行、可继续开发的开源原型，**不是已完成的全球真实三维重建**。全景支持在拍摄点转头观看；不会把普通图片自动变成可自由行走的三维世界。自动重建、Panoramax 联邦、空间音频与触觉仍未接入。

## 能做什么

- 在交互地球和地点列表中选择场景。
- 上传 JPG、PNG、WebP、MP4、WebM，支持普通与 360° 媒体，单文件最多 32 MiB。
- 导入受支持的 HTTPS 媒体直链，保留来源 URL、原作者署名和许可。
- 普通影像平面展示；真实的 2:1 等距柱状投影全景可拖动环顾，并在兼容设备上进入 WebXR。
- 当前浏览器管理自己的上传；可举报内容、在本机收藏地点。
- 中文 / English 界面切换；用户填写的标题与描述保留原文。
- 使用 Cloudflare D1 和 R2 持久化元数据与媒体，采用 React、Vinext、Three.js。

公开浏览不代表完成了生产级社区治理。举报目前保存待处理记录；尚无完整管理后台、人工审核流程或自动隐私模糊化。

## 本地启动

需要 Node.js 22.13 或更高版本及 npm。开发可在 Windows、macOS 或 Linux 上运行；本地开发不需要 OpenAI 密钥或 ChatGPT 账户。

```sh
git clone https://github.com/cjgogo27/Earthweave.git
cd Earthweave
npm ci
npm run db:migrate
npm run dev
```

打开终端打印的地址，通常为 `http://127.0.0.1:5173`。`db:migrate` 将 `drizzle/` 的待执行迁移应用于 `.wrangler/state` 中的本地 D1，不会改动远程数据库。新迁移加入后再次运行即可；不要手工重复执行已经应用的 SQL。

手机和头显使用部署后的 HTTPS 地址。头显里的 `localhost` 指向头显本身，不是开发电脑。

## 独立部署到 Cloudflare

```sh
npx wrangler login
npx wrangler d1 create earthweave
npx wrangler r2 bucket create earthweave-media
```

将创建结果中的真实 D1 `database_id` 写入 `wrangler.json`，保留绑定名 `DB` 与 `BUCKET`，并确认数据库和存储桶名称对应自己创建的资源。

```sh
npm run build
npm run deploy
```

`deploy` 会检查 D1 ID、构建应用、应用远程迁移并部署 Worker。创建和使用 Cloudflare 资源由部署者自己的账户承担；详见 [完整部署说明](docs/deployment.md)。GitHub Pages 只能托管静态内容，不能运行本项目的 API、D1 或 R2 后端。

源码中保留部分可选 Sites 辅助文件，但应用运行和独立部署不依赖 Sites 登录。

## 网络导入范围

服务器接受以下**准确媒体域名**的 HTTPS 默认端口直链：`dl.polyhaven.org`、`upload.wikimedia.org`、`images.unsplash.com`、`videos.pexels.com`。下载最长 20 秒，最多 32 MiB，最多跟随 3 次重定向，每一跳重新校验域名。

其他公共 HTTPS 直链可尝试浏览器 CORS 获取；被来源跨域策略阻止时，按来源网站允许的方式下载后上传。普通网页、YouTube 页面与需要登录的页面不是媒体直链。系统不抓取网页，也不通过链接自动推断拍摄地点。

用户须填写坐标、原作者/来源和适用许可，并主动确认分享权利。记录中的上传者表示本站贡献者，不等于外部原作者。允许访问某个域名不意味着该网站的所有素材都使用同一许可。

## 匿名所有权

服务端通过 HttpOnly Cookie 维护随机匿名会话，D1 只保存令牌哈希。会话最长有效期为 365 天，不能作为账号恢复凭证使用。请在上传时保存自己的原始文件。

- 清除 Cookie 或会话到期后，旧内容仍可浏览，但当前浏览器不再拥有删除权限。
- 在另一台设备可以浏览公开内容，但不会继承原设备的“我的贡献”或删除权限。
- 早期版本的 GPT 作者记录保留原作者 ID，不会自动转移给匿名访客；需要维护者按可信依据人工处理。
- 本机收藏和语言偏好另存于浏览器本地存储，不提供云同步。

具体接口与安全边界见 [架构说明](docs/architecture.md)。

## 检查与测试

```sh
npm test
npx tsc --noEmit
npm run build
```

启动并迁移本地开发服务后：

```sh
node tests/smoke.mjs
node tests/import-smoke.mjs
```

集成测试默认目标为 `http://127.0.0.1:5173`，可通过 `BASE_URL` 指定其他 loopback 地址。网络导入测试需要互联网，脚本只清理自己创建的测试记录。最终测试结果应以当前代码实际运行输出为准；旧登录版本的检查结果不能证明匿名会话版本已经通过。

**尚未完成真实手机、VR 头显和浏览器视觉布局验收。** 构建成功不等于设备兼容性验证。首次体验请使用 [10 步双语测试清单](docs/vr-test.md)，视频需单独测试。

## 开发、路线与许可

修改 `db/schema.ts` 后运行 `npm run db:generate`，审查新增 SQL，再运行 `npm run db:migrate`。代码结构、数据流和部署选择见 [架构](docs/architecture.md)；相近项目与重建方向见 [调研](docs/research.md)。欢迎通过 [Issues](https://github.com/cjgogo27/Earthweave/issues) 和 Pull Request 参与，先阅读 [贡献指南](CONTRIBUTING.md)。

原创应用代码使用 [MIT License](LICENSE)，版权声明为 `Copyright (c) 2026 Earthweave contributors`。第三方代码保留原许可；NASA 地球贴图、Poly Haven CC0 示例及用户媒体不因代码采用 MIT 而被重新授权，详见 [NOTICE](NOTICE.md)。

维护联系：cj3332740@outlook.com。安全问题请参考 [SECURITY.md](SECURITY.md)。
