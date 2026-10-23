# 安全问题 / Security reports

请将潜在漏洞发送至 **cj3332740@outlook.com**，附代码版本、受影响接口、最小复现步骤和影响。使用自己创建的测试记录，不要获取、修改或删除他人内容。不要在公开 Issue 中发布会话 Cookie、凭据或用户媒体。

Report suspected vulnerabilities to **cj3332740@outlook.com**, including the revision, affected endpoint, minimal reproduction, and impact. Use records you created for testing. Do not access, modify, or delete another person's content, and do not expose session cookies, credentials, or user media in public issues.

项目尚处于原型阶段，没有承诺响应时限或安全审计认证。举报功能只保存内容报告，不是紧急安全响应机制。部署者负责自己的资源、升级、备份和内容处理。

This is a prototype without a guaranteed response time or security-audit certification. In-app content reports are not an emergency security channel. Deployers are responsible for their resources, updates, backups, and content handling.

## 当前边界 / Current boundaries

- 管理权绑定匿名浏览器 Cookie；清除、过期或更换浏览器会失去旧内容管理权，没有账户恢复。 / Ownership is tied to an anonymous browser cookie, with no account recovery after deletion, expiry, or a browser change.
- 每身份上传配额不阻止重新建立身份；公共部署需要额外网关限流和运营审核。 / Per-identity quotas do not prevent new identities; public deployments need additional gateway controls and moderation.
- 服务器仅从明确允许的 HTTPS 媒体域名导入，并校验重定向和大小。修改该策略时应重新检查 SSRF 和资源耗尽风险。 / Server imports use an explicit HTTPS host allowlist with redirect and size checks. Changes to this policy require review for SSRF and resource-exhaustion risks.
- 不应提交生产数据库、媒体对象或会话令牌。 / Production databases, media objects, and session tokens must not be committed.
