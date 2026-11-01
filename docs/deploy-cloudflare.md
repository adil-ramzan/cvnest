# Deploying CVNest to Cloudflare Workers

CVNest runs on Cloudflare Workers through [OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`). The app is still a normal Next.js app: `npm run dev` and `npm run build` are unchanged.

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
| `npm run upload` | Builds and uploads a new Worker version without sending it traffic | Yes |
| `npm run deploy` | Builds and deploys to production | Yes |

`npm run deploy` serves real traffic. Use `npm run upload` when you want to look at a version first.

To run a browser suite against the local Worker, start `npm run preview`, then run:

```bash
BASE_URL=http://localhost:8787 node tests/e2e/<suite>.test.mjs
```

Suites that wait for `networkidle0` can time out on this port. The local preview serves HTTP/1.1 and can stall on prefetches that a navigation aborts, until Chrome hits its limit of six connections per host. The same Worker behind a local HTTP/2 proxy did not stall in 60 navigations, so this comes from local serving. Run those suites through an HTTP/2 proxy, or against a deployed preview URL.

## Environment variables and secrets

The application reads no environment variables and needs no secrets. `src/app`, `src/components`, `src/data` and `src/lib` contain no `process.env` use. The public URL is set in `src/data/site.ts`.

Only the Wrangler CLI needs credentials, and only outside an interactive `wrangler login`:

| Name | Used for | Where it goes |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Non-interactive upload or deploy. Needs the Workers Scripts: Edit permission. | CI secret store. Never commit it. |
| `CLOUDFLARE_ACCOUNT_ID` | Selects the account when the token can reach more than one. | CI variable. |

Local Worker-only values go in `.dev.vars`, which is ignored by git. CVNest does not need that file today.

## Cloudflare account setup

1. Create or choose a Cloudflare account. The Free plan's 3 MiB compressed Worker limit fits the current build, which is about 2.0 MiB.
2. Run `npx wrangler login` once on the deploying machine.
3. Add `getcvnest.com` to the account as a zone, then attach it to the `cvnest` Worker as a custom domain. `workers.dev` and preview URLs are not the production address.
4. Decide how `www` should behave and add a redirect if it is used. `src/data/site.ts`, the canonical links and the sitemap all use `https://getcvnest.com`.

## Rollback

Every deploy creates a Worker version. Run `npx wrangler deployments list`, then `npx wrangler rollback <version-id>`.

## Keeping it working

- Keep pages static. A page that starts revalidating needs a writable cache such as R2, because the static assets cache is read-only.
- Do not add `export const runtime = "edge"`, or a Node middleware or `proxy` file. OpenNext does not support either yet.
- Check the Worker size after adding server-side dependencies: `npx opennextjs-cloudflare build`, then `npx wrangler deploy --dry-run`. The size limit counts the gzip figure.
- `@opennextjs/cloudflare` and `wrangler` are pinned to exact versions. Upgrade them together, and rerun the browser suites against `npm run preview` afterwards.
