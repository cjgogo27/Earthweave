# Earthweave

[中文](README.md) · [Live site](https://cjgogo27.github.io/Earthweave/) · [Source on GitHub](https://github.com/cjgogo27/Earthweave) · [Deployment guide](docs/deployment.md) · [VR test checklist](docs/vr-test.md)

**The GitHub Pages public atlas includes two walkable, simulated 3D environments, photographic panoramas, language switching and WebXR. Move with WASD or on-screen arrows, drag to look, and approach markers to operate the boat or windmill, change weather and adjust daylight. VR controllers support point-to-teleport. These scenes are authored interpretations, not reconstructions. Shared uploads and imports require the separately deployed full server.**

A collaborative visual Earth: choose a place, contribute photos, panoramas or videos, or import a direct media URL, then explore on a computer, phone, or WebXR-compatible headset.

**No account or GPT / ChatGPT sign-in is required.** An anonymous browser session identifies your uploads. Opening the site creates the session automatically. Clearing cookies, letting the session expire, or switching browsers loses management access to earlier uploads. There is currently no account recovery or ownership synchronization across devices.

This is a working open-source prototype, **not a completed reconstruction of the entire Earth**. Panoramas let you look around from a capture point; ordinary images do not automatically become walkable 3D worlds. Automatic reconstruction, Panoramax federation, spatial audio, and haptics are not implemented.

## Features

- Select locations on an interactive globe or from the place list.
- Upload JPG, PNG, WebP, MP4, or WebM; standard and 360° media are supported, up to 32 MiB per file.
- Import supported HTTPS media URLs while preserving the source URL, original attribution, and license.
- View standard media on a flat screen; drag to explore genuine 2:1 equirectangular panoramas, with optional WebXR on compatible hardware.
- Manage uploads belonging to the current browser, report content, and save bookmarks locally.
- Switch between Chinese and English; contributor-written titles and descriptions remain unchanged.
- Persist metadata in Cloudflare D1 and media in R2, using React, Vinext, and Three.js.

Public access does not mean production community moderation is complete. Reports are stored for review; a full moderation dashboard, human review process, and automatic privacy blurring are not implemented.

## Run locally

Requires Node.js 22.13 or newer and npm. Windows, macOS, and Linux are supported. Local development needs neither an OpenAI API key nor a ChatGPT account.

```sh
git clone https://github.com/cjgogo27/Earthweave.git
cd Earthweave
npm ci
npm run db:migrate
npm run dev
```

Open the URL printed by the server, usually `http://127.0.0.1:5173`. `db:migrate` applies pending SQL migrations from `drizzle/` to the local D1 state in `.wrangler/state`; it does not modify the remote database. Run it again after adding migrations rather than replaying applied SQL manually.

Phones and headsets should use the deployed HTTPS URL. A headset's `localhost` is not your development computer.

## Deploy independently on Cloudflare

```sh
npx wrangler login
npx wrangler d1 create earthweave
npx wrangler r2 bucket create earthweave-media
```

Copy the real D1 `database_id` into `wrangler.json`. Keep the `DB` and `BUCKET` binding names, and confirm the configured database and bucket names match your own resources.

```sh
npm run build
npm run deploy
```

`deploy` validates the D1 ID, builds the application, applies remote migrations, and deploys the Worker. The deploying account owns the Cloudflare resources and their usage. See the [deployment guide](docs/deployment.md). GitHub Pages cannot host this application's API, D1 database, or R2 backend.

The repository retains optional Sites helpers, but the application and independent deployment do not rely on Sites sign-in.

## Importing online media

Server imports allow only these exact HTTPS media hosts on the default port: `dl.polyhaven.org`, `upload.wikimedia.org`, `images.unsplash.com`, and `videos.pexels.com`. Downloads are limited to 20 seconds and 32 MiB, with at most three redirects; every redirect is validated again.

Other public HTTPS URLs can be attempted through browser CORS fetching. If the source blocks this, download the file in a way permitted by its owner and upload it. Web pages, YouTube pages, and authenticated download pages are not direct media files. The app does not scrape pages or infer the capture location from a URL.

Contributors enter coordinates, original attribution, and an applicable license, then explicitly confirm their right to share the media. The uploader is not necessarily the original creator. An allowed hostname does not grant a uniform license to all media on that service.

## Anonymous ownership

The server issues a random HttpOnly session cookie and stores only its token hash in D1. The session has a maximum lifetime of 365 days and provides no account-recovery mechanism. Keep your original media files.

- Clearing cookies or session expiry leaves previous media viewable but removes your browser's deletion authority.
- Another device can view public contributions but does not inherit your contribution list or ownership.
- Legacy GPT-linked author IDs are preserved and are not reassigned automatically to anonymous visitors; a maintainer must handle any justified ownership migration manually.
- Bookmarks and language preferences use browser-local storage without cloud synchronization.

See the [architecture](docs/architecture.md) for the session and authorization boundaries.

## Validation

```sh
npm test
npx tsc --noEmit
npm run build
```

With the migrated local development server running:

```sh
node tests/smoke.mjs
node tests/import-smoke.mjs
```

Integration scripts default to `http://127.0.0.1:5173`; `BASE_URL` can select another loopback address. The import test needs internet access. Scripts clean up only their own test records. Use actual results from the current source revision; results from the older sign-in version do not establish that anonymous sessions pass.

**Real phone, VR-headset, and browser visual acceptance testing has not been completed.** A successful build does not prove device compatibility. Use the [ten-step bilingual checklist](docs/vr-test.md) and test videos separately.

## Contributing and licensing

After editing `db/schema.ts`, run `npm run db:generate`, review the generated SQL, and run `npm run db:migrate`. See [architecture](docs/architecture.md), [project research](docs/research.md), and [contributing](CONTRIBUTING.md). Issues and pull requests are welcome at [cjgogo27/Earthweave](https://github.com/cjgogo27/Earthweave).

Original application code is licensed under the [MIT License](LICENSE), `Copyright (c) 2026 Earthweave contributors`. Third-party code retains its own licenses. NASA imagery, Poly Haven CC0 samples, and user media are not relicensed under MIT; see [NOTICE](NOTICE.md).

Maintainer contact: cj3332740@outlook.com. For security reports, see [SECURITY.md](SECURITY.md).
