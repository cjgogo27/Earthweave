# 相近项目与复用方向

调研日期：2026-10-24。以下链接优先使用项目官网、官方文档和源码仓库。结论区分已核验能力与本项目建议；“可复用”不代表当前应用已经完成集成。

## 已有项目

| 项目 | 与目标的关系 | 许可与复用边界 |
| --- | --- | --- |
| [Panoramax](https://docs.panoramax.fr/) | 最接近“共同上传、共同维护”的街景照片平台；开源软件栈、可自建实例与联邦目录 | 图片许可按实例处理；本次未逐个核验全部组件 LICENSE，不统一标注为某种代码许可 |
| [CesiumJS](https://cesium.com/platform/cesiumjs) | WGS84 三维地球、地形/影像、3D Tiles、glTF，适合未来大规模地理浏览 | 官网明确 Apache-2.0；引擎开源不代表影像、地形与托管服务都免费或同一许可 |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | 社区维护的道路、地名、建筑等基础地理数据 | ODbL；要求署名并遵守数据许可。它不是全球照片或卫星影像库 |
| [Mapillary API](https://help.mapillary.com/hc/en-us/articles/360010234680-Accessing-imagery-and-data-through-the-Mapillary-API) | 众包街景平台与数据接口，可作为外部来源 | 官方说明图片使用 [CC BY-SA](https://help.mapillary.com/hc/en-us/articles/115001770409-CC-BY-SA-license-for-open-data)；API 访问与再分发仍应检查适用条款 |
| [COLMAP](https://github.com/colmap/colmap) | 多视角几何重建与相机姿态估计 | New BSD；依赖库许可独立，不把它等同于最终模型内容许可 |
| [Nerfstudio](https://github.com/nerfstudio-project/nerfstudio) | NeRF 与高斯重建开发框架，可处理多种相机采集数据 | Apache-2.0；GPU 计算、数据准备和质量验证属于独立服务工作 |
| [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D) | Three.js 高斯点查看器；支持 PLY/SPLAT/KSPLAT，明确提供 WebXR | MIT；可作为后续三维结果浏览组件，不能替代重建 |
| [Spark](https://github.com/sparkjsdev/spark) | Three.js 高斯点渲染、多种文件格式与移动端优化方向 | MIT；设备性能应使用实际资产验证 |

Google 的 [Photorealistic 3D Tiles](https://developers.google.com/maps/documentation/tile/3d-tiles) 是另一类参照：它提供许多人口密集地区的真实三维瓦片，可交给兼容渲染器显示，但需要 API key、计费账户和服务条款，并非众包开放数据底座。

## 为什么采用分层方案

Panoramax 解决共享照片与地理位置；CesiumJS 解决全球地理可视化；COLMAP/Nerfstudio 解决从合适素材计算局部空间；WebXR 解决向兼容头显输出。单独一项并不能提供完整的、实时的、精确的地球模拟。

本项目选择先实现地球入口与上传/浏览闭环。可改进的重点是：同一个地点汇集不同设备素材、明确区分普通与全景内容、进入沉浸浏览、保留来源与作者、支持内容维护。相比直接从全球三维重建起步，这条路线能先验证采集与体验是否有用。

当前地球由 Three.js 展示，不宣称已采用 CesiumJS。Panoramax、Mapillary、COLMAP、Nerfstudio、GaussianSplats3D 和 Spark 均为后续可选方案，不因出现在此表中就成为本项目已接入的依赖。

## 已实现的网络导入范围

本版的 `/api/import` 是有限媒体来源的导入器，不是 Panoramax 联邦或互联网爬虫。它从允许域名上的 HTTPS 直链读取文件，保留来源 URL 与原作者署名，要求用户填写坐标和确认许可，并复制到本站存储。其他来源可通过浏览器 CORS 尝试导入，失败时回退到用户下载再上传。

当前服务器允许 `dl.polyhaven.org`、`upload.wikimedia.org`、`images.unsplash.com`、`videos.pexels.com`。这份域名清单是请求边界，不是统一授权清单；素材许可必须按原始资源分别核对。示例预设中的地点信息与作者信息也不等同于自动识别新链接的地点。

相较于仅接受本机文件，这一步让开放素材更容易被整理到地点中，同时保留来源。真正的联邦互通还需要外部记录 ID、增量同步、删除/修订传播以及实例许可策略，仍是后续工作。

## 全景与三维的技术区别

一张完整 360° 图可映射到球内壁，用户在中心转头观看。它通常没有足够信息支持左右移动后的真实视差。普通照片更不包含背后与遮挡区域的信息。

Nerfstudio 的[自有数据说明](https://docs.nerf.studio/quickstart/custom_dataset.html)明确要求相机姿态；图片和视频流程使用 COLMAP 与 FFmpeg，并建议清晰、有重叠的采集。可将其作为未来采集向导和重建队列的依据，不应承诺任意几张网络照片都能重建可靠空间。

“能够从新角度渲染”也不自动意味着场景具有精确测量尺度、完整碰撞几何或真实物理属性。世界模拟、视觉重建和地理记录是不同范围的系统。本原型服务于后两者的入口。

## Panoramax 互通建议，未实现

参考其 [API 文档](https://docs.panoramax.fr/backend/api/api/)与[自建说明](https://docs.panoramax.fr/backend/install/install/)，先实现只读适配器，再决定是否部署实例或向联邦贡献。

跨实例导入应保存原始作者、实例、图片 ID、许可、拍摄与导入时间，以及对外链接。联邦接受的许可与图片要求见[官方联邦说明](https://docs.panoramax.fr/federated-catalog/)；不要在导入时删除署名或把原本开放的素材标成私有独占。

公开照片的隐私处理与内容授权需要单独设计。已有项目具备某项功能不代表本项目也已经拥有，例如自动人脸/车牌模糊、批量审核和完整的社区治理。

## 复用顺序

1. 稳定当前上传、存储、查看、作者删除和举报流程，完成实际手机及头显测试。
2. 为地点增加多时间版本与采集路线，并用真实小规模社区验证维护流程。
3. 在许可与来源清晰的前提下试接 Panoramax；需要更完整地理数据时评估 CesiumJS/OSM。
4. 在独立 GPU 节点接入 COLMAP + Nerfstudio，把重建结果当作可失败、可重试、有质量状态的产物。
5. 按实际设备与场景大小选择高斯点或网格查看器，建立压缩、分块、缓存与帧率预算。

所有软件许可与服务条款在实际接入时应重新核对固定版本；本文件记录的是本次调研结果，不替代后续版本的许可审查。
