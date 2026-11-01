# Deploying CVNest to Cloudflare Workers

CVNest runs on Cloudflare Workers through [OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`). The app is still a normal Next.js app: `npm run dev` and `npm run build` are unchanged.

## Environments

| | Preview | Production |
| --- | --- | --- |
| Git branch | `staging` | `main` |
| Worker | `cvnest-preview` | `cvnest-production` |
| URL | https://cvnest-preview.emadilramzan.workers.dev | https://cvnest-production.emadilramzan.workers.dev |
| Wrangler environment | `preview` | `production` |
| `NEXT_PUBLIC_SITE_URL` | The preview URL | The production URL |
| `NEXT_PUBLIC_INDEXABLE` | `false` | `false` |

Each Worker has its own versions, rollback history and browser origin, so resumes saved on one are not visible on the other.

No `cvnest` Worker exists, and none should. `wrangler.jsonc` names both Workers explicitly. A command without `--env` targets `cvnest-preview`, never production.

## How it is served

- Every page is prerendered by `next build`. Nothing revalidates and there are no API routes.
- `open-next.config.ts` uses the static assets cache, so prerendered pages, RSC payloads and the social images are read from Workers Static Assets.
- There is no R2 bucket, KV namespace, D1 database, Queue or Durable Object. The Worker only needs its `ASSETS` binding.
- Resume data stays in the visitor's browser (`localStorage` and IndexedDB). PDF export uses the browser's print window. Neither touches the Worker.

## Commands

| Command | What it does | Needs a Cloudflare login |
| --- | --- | --- |
| `npm run dev` | Next.js dev server, for everyday work | No |
| `npm run preview` | Builds, then runs the Worker locally in `workerd` on port 8787 | No |
| `npm run build:preview` | Builds the Worker with the preview URL | No |
| `npm run build:production` | Builds the Worker with the production URL | No |
| `npm run upload:preview` | Builds and uploads a preview version without sending it traffic | Yes |
| `npm run upload:production` | Builds and uploads a production version without sending it traffic | Yes |
| `npm run deploy:preview` | Builds and deploys to `cvnest-preview` | Yes |
| `npm run deploy:production` | Builds and deploys to `cvnest-production` | Yes |

The deploy scripts serve real traffic, and they always rebuild, because the site URL is compiled into the build. Never pair a `build:` script with a deploy to the other environment.

`npm run build` is only `next build`. It does not create `.open-next`, so it can't be deployed. Do not change it to call OpenNext: `opennextjs-cloudflare build` runs it, so that would loop.

To run a browser suite against the local Worker, start `npm run preview`, then run:

```bash
BASE_URL=http://localhost:8787 node tests/e2e/<suite>.test.mjs
```

Suites that wait for `networkidle0` can time out on this port. The local preview serves HTTP/1.1 and can stall on prefetches that a navigation aborts, until Chrome hits its limit of six connections per host. The same Worker behind a local HTTP/2 proxy did not stall in 60 navigations, so this comes from local serving. Run those suites through an HTTP/2 proxy, or against a deployed preview URL.

## Verifying the target before a deploy

1. Check that the Worker name for the environment is the one you expect:

   ```bash
   npx wrangler versions list --env preview
   npx wrangler versions list --env production
   ```

2. Check the build size and bindings without deploying:

   ```bash
   npm run build:preview
   npx wrangler deploy --dry-run --env preview
   ```

3. Check the built site URL. This should print the URL of the environment you built:

   ```bash
   grep -o 'rel="canonical" href="[^"]*"' .next/server/app/index.html
   ```

## Workers Builds

Each Worker has its own Workers Builds connection, under Worker > Settings > Build. Both use the repository `adil-ramzan/cvnest`.

| Setting | `cvnest-preview` | `cvnest-production` |
| --- | --- | --- |
| Git branch | `staging` | `main` |
| Build command | `npm run build:preview` | `npm run build:production` |
| Deploy command | `npx wrangler deploy --env preview` | `npx wrangler deploy --env production` |
| Builds for non-production branches | Off | Off |
| Root directory | Empty | Empty |
| Build variables | None | None |

- The build command must be an OpenNext build. With `npm run build`, the deploy fails with `Could not find compiled Open Next config`, because `.open-next` is ignored by git and `next build` does not create it.
- `npx wrangler deploy` detects the OpenNext project and calls `opennextjs-cloudflare deploy`, passing `--env` along.
- The site URL and indexing flag are set inside the build scripts, so no build variables are needed. A dashboard value with the same name would be overridden.
- In Workers Builds, Wrangler checks that the Worker it resolves is the one the build is connected to, and stops if that Worker is different or missing. A wrong `--env` fails the build, and it can't create a `cvnest` Worker.
- That check only runs in Workers Builds. It does not protect commands run from a terminal.
- Every push to a connected branch deploys. Pushing to `staging` updates the preview URL.

The build token is chosen on the same settings page. The default token Cloudflare generates is enough, because it includes Workers Scripts: Edit. If you select your own, it must be a user token that can reach both Workers. A token that has been deleted or rolled fails the build until you select a new one.

## Environment variables and secrets

The application needs no secrets. Two public, build-time variables configure it, and the `build:` scripts set them:

| Name | Used for | Without it |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical links, Open Graph URLs, the sitemap, `robots.txt` | `http://localhost:3000` |
| `NEXT_PUBLIC_INDEXABLE` | Allows search engines, only when exactly `true` | Indexing stays off |

They are compiled into the build, so changing one needs a new build. They are not Worker runtime variables.

Do not set `NEXT_PUBLIC_INDEXABLE=true` until the custom domain is configured and the legal pages are complete.

Only the Wrangler CLI needs credentials, and only outside an interactive `wrangler login`:

| Name | Used for | Where it goes |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Non-interactive upload or deploy. Needs the Workers Scripts: Edit permission. | CI secret store. Never commit it. |
| `CLOUDFLARE_ACCOUNT_ID` | Selects the account when the token can reach more than one. | CI variable. |

Local Worker-only values go in `.dev.vars`, which is ignored by git. CVNest does not need that file today.

## Search engines

While `NEXT_PUBLIC_INDEXABLE` is not `true`, indexing is blocked in two ways:

- Pages carry a `noindex, nofollow` robots meta tag.
- `next.config.ts` sends `X-Robots-Tag: noindex, nofollow` on everything the Worker serves.

`robots.txt` allows all crawling in this mode and lists no sitemap. Crawlers have to fetch a page to read its `noindex`, so blocking them would leave those signals unseen. `sitemap.xml` is still served, with the environment's URL.

## Security headers

`next.config.ts` sets the headers for everything the Worker serves, including cached pages: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and, on HTTPS URLs, `Strict-Transport-Security`.

`public/_headers` covers only files served directly from static assets, such as `/_next/static` and `/fonts/print`. Cloudflare does not apply it to responses from the Worker.

- `script-src` needs `'unsafe-inline'`. Pages are prerendered, so there is no per-request nonce for Next's inline scripts. A nonce would mean rendering every page on request.
- `style-src` needs `'unsafe-inline'` for template designs and the PDF page rules.
- `img-src` allows `data:` and `blob:` for sample and uploaded photos.
- Adding an external script, font, image or API means adding its origin to the policy.
- `Strict-Transport-Security` has no `includeSubDomains` or `preload`. Decide on those when the custom domain is set up.

## Cloudflare account setup

1. The Free plan's 3 MiB compressed Worker limit fits the current build, which is about 2.0 MiB. The 100,000 daily requests are shared by every Worker on the account.
2. Run `npx wrangler login` once on the deploying machine.

## Moving to a custom domain

1. Add the domain to the account as a zone, then attach it to `cvnest-production` as a custom domain.
2. Change `NEXT_PUBLIC_SITE_URL` in the `build:production` script.
3. Decide how `www` should behave and add a redirect if it is used.
4. Keep the workers.dev URL working for a while and ask users to download a backup first. Saved resumes belong to the exact URL, so a redirect would strand them.

## Rollback

Every deploy creates a Worker version. Run `npx wrangler deployments list --env production`, then `npx wrangler rollback <version-id> --env production`. Use `--env preview` for the preview Worker.

A rollback does not change Git, so revert the commit too. Otherwise the next push deploys the same code again.

## Keeping it working

- Keep pages static. A page that starts revalidating needs a writable cache such as R2, because the static assets cache is read-only.
- Do not add `export const runtime = "edge"`, or a Node middleware or `proxy` file. OpenNext does not support either yet.
- Check the Worker size after adding server-side dependencies: `npm run build:preview`, then `npx wrangler deploy --dry-run --env preview`. The size limit counts the gzip figure.
- `@opennextjs/cloudflare` and `wrangler` are pinned to exact versions. Upgrade them together, and rerun the browser suites against `npm run preview` afterwards.
