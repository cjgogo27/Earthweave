# Notices and third-party materials

The root [MIT License](LICENSE) applies to original Earthweave application code and documentation. It does not replace upstream licenses or relicense photographs, videos, geospatial data, or user contributions. Third-party copyright and permission notices must be retained when redistributing their code or assets.

The small WebP images in `public/previews/` are resized copies of the corresponding NASA map and Poly Haven panoramas described below; the original media and credits are preserved.

## Bundled visual assets

### `public/earth.jpg`

- NASA Blue Marble: land surface, ocean color, and sea ice, 2048 × 1024 JPEG, 266,599 bytes.
- Downloaded directly from [NASA GSFC](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg); stored under the application filename without claiming Earthweave authorship.
- Credit: NASA Goddard Space Flight Center; image by Reto Stöckli; enhancements by Robert Simmon. [Official background and credits](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/).
- NASA imagery is generally not subject to copyright in the United States and is supplied under [NASA's Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/), including source acknowledgment and restrictions on implying endorsement. NASA logos and separately identified third-party material are not covered by a blanket permission.
- This texture is NASA material, not MIT-licensed Earthweave artwork. It is a historical composite used for orientation, not live satellite imagery or a precision map. No NASA endorsement is implied.

### `public/media/venice.jpg`

- **Venice Sunset**, Greg Zaal / Poly Haven, **CC0-1.0**.
- [Asset page](https://polyhaven.com/a/venice_sunset) · [Original tonemapped JPEG](https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/venice_sunset.jpg).
- Photographer-supplied location: latitude 45.4303, longitude 12.3541.

### `public/media/spruit.jpg`

- **Spruit Sunrise**, Greg Zaal / Poly Haven, **CC0-1.0**.
- [Asset page](https://polyhaven.com/a/spruit_sunrise) · [Original tonemapped JPEG](https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/spruit_sunrise.jpg).
- Photographer-supplied location: latitude −26.1227, longitude 28.0154.

[Poly Haven asset license](https://polyhaven.com/license). Both images are demonstration captures, not uploads by the current visitor. Their recording dates are not asserted by this application. CC0 status does not extend to unrelated content fetched from other services.

## Vendored source and preserved license files

| Material | License and preserved notice |
| --- | --- |
| Sites Vite integration | MIT, Copyright (c) 2026 OpenAI; full text retained in [`scripts/vite/sites-vite-plugin.LICENSE`](scripts/vite/sites-vite-plugin.LICENSE) |
| Vendored shadcn Tailwind material and associated copied UI patterns | MIT, Copyright (c) 2023 shadcn; full text retained in [`vendor/shadcn-tailwind-4.13.0.LICENSE.md`](vendor/shadcn-tailwind-4.13.0.LICENSE.md) |

The repository retains optional starter/Sites helpers. Their inclusion does not imply that OpenAI operates, endorses, or requires an account for this application. Do not remove existing license files when adapting the starter.

## Package dependencies

The lockfile identifies exact installed versions. Dependencies remain under their package-distributed licenses, including their transitive dependencies. The following summary is not a replacement for those full notices:

| Package | Installed license |
| --- | --- |
| React / React DOM | MIT |
| Three.js | MIT; Copyright © 2010–2026 three.js authors |
| Lucide React | ISC; its LICENSE also includes MIT notices for icons derived from Feather, Copyright (c) 2013-present Cole Bemis |
| Vinext | MIT |
| Vite | MIT |
| Tailwind CSS | MIT |
| Drizzle ORM | Apache-2.0 |
| Next.js | MIT |

Inspect the LICENSE/NOTICE files in the respective package distributions when redistributing bundled code. Do not replace their copyright statements with the project's copyright. Other package and transitive-license details are available through `package-lock.json` and the installed packages.

## Contributions and imported content

User uploads and network imports retain the selected content license and recorded provenance. `author` denotes the uploader in this application; `sourceAttribution` identifies an original creator or source when supplied. Neither a repository fork nor an MIT code license grants access to a deployment's private database, session tokens, or media objects.

## 中文说明

本项目原创代码适用 MIT；NASA 地图、Poly Haven CC0 示例、第三方库与用户媒体分别保留各自使用条款。代码开源不意味着所有图片都变成 MIT，也不自动授予其他网站素材的使用权。请保留原作者署名、来源链接和随仓库附带的许可原文。
