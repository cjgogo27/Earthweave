# VR 实机测试清单 / VR headset test checklist

这份清单用于首次真实头显验收，不是已经通过的测试报告。浏览器自动化与 VR 硬件测试尚未完成；本地 API、类型检查和构建不能证明头显兼容性。

Use this checklist for the first real headset session. It is not a completed test report. Browser automation and headset testing have not been completed; API tests and a successful build do not establish headset compatibility.

测试前记录：站点 HTTPS 地址、部署版本、日期、头显型号、系统版本、浏览器版本、网络环境。公开站点无需账户或 GPT 登录；浏览器自动建立匿名会话。不要用头显访问开发电脑的 `localhost`。

Before testing, record the HTTPS site URL, deployment version, date, headset model, OS, browser version, and network. The public site requires no account or GPT sign-in; the browser creates an anonymous session. A headset's `localhost` is not your development computer.

| 步骤 / Step | 操作 / Action | 预期 / Expected |
| --- | --- | --- |
| 1. 连接 / Connect | 用头显内支持 WebXR 的浏览器直接打开部署后的 HTTPS 网址，无需登录。 / Open the deployed HTTPS URL directly in a WebXR-compatible headset browser, without signing in. | 首页可访问，匿名会话自动建立；无证书错误或 GPT 登录拦截。仅看到网页不代表已进入 VR。 / The home page loads and creates an anonymous session without certificate errors or a GPT sign-in gate. Seeing the page alone does not mean VR is active. |
| 2. 双语 / Languages | 在首页切换中文与 English，再打开体验窗口。 / Switch between Chinese and English on the home page, then open the viewer. | 界面按钮、错误提示和辅助说明跟随语言；用户上传的标题与说明保留原文。 / Controls, messages, and help follow the chosen language. Contributor titles and descriptions remain unchanged. |
| 3. 地球入口 / Globe | 拖动地球，点击可见地点，或从地点列表选择示例。 / Rotate the globe and select a visible place, or choose a demo from the list. | 当前地点与卡片相符，可打开对应影像。无 WebGL 时应有提示，仍可使用地点列表。 / The selected place matches its card and opens the correct media. If WebGL is unavailable, a notice appears and the place list remains usable. |
| 4. 平面全景浏览 / Panorama on screen | 先打开示例全景，在普通浏览器视图中拖动环顾。 / Open a demo panorama and drag to look around before entering VR. | 图像加载完成，可看四周；没有持续黑屏。普通照片不应自动成为全景。 / The image loads and supports looking around without a persistent black screen. Standard photos are not converted into panoramas. |
| 5. 自有素材 / Your capture | 从手机上传一张你有权使用的真实 360° 等距柱状投影图，宽高比 2:1，文件小于 32 MB，并填写拍摄坐标。若测试链接导入，使用界面允许的直接媒体来源。 / Upload an authorized, genuine 360° equirectangular image from your phone, with a 2:1 ratio and file size below 32 MB, and enter its capture coordinates. For URL-import testing, use a direct media source allowed by the interface. | 头显刷新同一站点后能找到并打开记录。2:1 尺寸是格式检查，不证明照片内容真的覆盖 360°。 / After refreshing the same site on the headset, the record is available. A 2:1 ratio is a format check, not proof of complete 360° coverage. |
| 6. 进入 VR / Enter VR | 在全景加载完成后点击“进入 VR / Enter VR”，允许浏览器申请的沉浸会话。 / After the panorama loads, select Enter VR and allow the immersive session. | 进入头显沉浸显示，转头改变视角。不支持时显示可理解的提示，并保留拖动浏览。 / The headset enters immersive display and head rotation changes the view. Unsupported devices receive a useful message and retain drag browsing. |
| 7. 环顾与舒适度 / Look around | 保持在同一观看位置，缓慢向左、右、上、下环顾，观察接缝、方向和画面稳定性。 / Stay at the viewing point and slowly look left, right, up, and down. Observe seams, orientation, and stability. | 场景不跟着头部整体漂移，无明显翻转或持续抖动。这里是原地全景，不应把向前走误认为真正的三维漫游；不适时立即退出。 / The scene remains stable, without inversion or persistent jitter. This is a panorama at one capture point, not a walkable 3D world. Exit if uncomfortable. |
| 8. 退出与重试 / Exit and retry | 用头显系统的退出沉浸操作返回网页；若网页可见也可点“退出 VR”。重复进入/退出三次，并单独试一次拒绝许可后重试。 / Exit immersive mode through the headset system controls, or use Exit VR when the page is accessible. Repeat three times and also test denying permission before retrying. | 返回网页后可继续浏览；无卡死、重复会话或无法关闭的窗口。拒绝许可有提示并可重试。 / The page remains usable without stuck or duplicate sessions. Permission denial is explained and a retry remains possible. |
| 9. 可选视频 / Optional video | 用短的 2:1 全景 MP4/WebM 测试播放、暂停、拖动进度和静音，再进入/退出 VR。先在网页设置声音；当前没有专门的头显内播放器面板。 / Test play, pause, seeking, and mute with a short 2:1 panoramic MP4/WebM, then enter and exit VR. Set audio on the page first; there is no dedicated in-headset playback panel. | 支持该编码时可播放并恢复控制。记下黑屏、编码失败或无法播放的问题。未准备视频时标记“未测”，不能将照片通过算作视频通过。 / Supported encodings play and controls remain available afterward. Record black screens, codec errors, or playback failures. Mark this untested if no video is available; passing photo tests does not validate video. |
| 10. 保存与回退 / Persistence and fallback | 在手机刷新记录，再在不支持 VR 的浏览器打开；最后回到原上传浏览器，仅删除本次自建测试影像并刷新。 / Refresh the record on your phone, then open it in a browser without VR support. Return to the original uploading browser and delete only your temporary test capture. | 数据跨设备可见，但管理权不会跨浏览器同步；无 VR 时仍能拖动浏览。原浏览器删除后记录不再出现。不要先清 Cookie，否则会失去管理权。 / The record is visible across devices, but ownership is browser-specific. Non-VR browsing still works. After deletion in the original browser, the record disappears. Do not clear cookies first, as doing so loses management access. |

## 记录模板 / Result template

| 项目 / Field | 记录 / Value |
| --- | --- |
| 版本、网址、日期 / Version, URL, date | |
| 设备、系统、浏览器 / Device, OS, browser | |
| 步骤编号 / Step number | |
| 通过 / 失败 / 未测 · Pass / Fail / Untested | |
| 实际表现与错误原文 / Actual behavior and exact error | |
| 素材类型、尺寸、大小、编码 / Media type, dimensions, size, codec | |
| 能否稳定复现 / Reproducible? | |

优先分别定位访问权限、媒体加载、WebGL 与 WebXR 会话问题。出现灰色“进入 VR”按钮时，先确认使用的是全景、HTTPS 和支持沉浸式 VR 的浏览器；不要通过关闭浏览器安全设置来继续。

Separate access, media loading, WebGL, and WebXR-session failures when diagnosing an issue. If Enter VR is disabled, first confirm the media is a panorama and the browser supports immersive VR over HTTPS. Do not disable browser security settings to proceed.

参考 / Reference: [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API).
