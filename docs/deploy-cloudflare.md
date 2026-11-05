# Deploying CVNest to Cloudflare Workers

CVNest runs on Cloudflare Workers through [OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`). The app is still a normal Next.js app: `npm run dev` and `npm run build` are unchanged.

## Current state (verified 2026-11-05)

This section records what is actually deployed. It was checked with read-only HTTP requests and the GitHub API; the Cloudflare dashboard was not read. Where a setting can only be seen in the dashboard, it says so.

| Worker | URL | What it serves | How it got there |
| --- | --- | --- | --- |
| `cvnest` | https://cvnest.emadilramzan.workers.dev | The build of merge commit `8141108` (Workers Builds version `32b32495-79df-4d63-b92b-0d6bf11be3c3`). It is a **preview build**: its canonical links, Open Graph URLs and `sitemap.xml` use `https://cvnest-preview.emadilramzan.workers.dev`, and every page is `noindex, nofollow`. All Phase 2 security headers are present. | Workers Builds, on every push to `main` |
| `cvnest-preview` | https://cvnest-preview.emadilramzan.workers.dev | An older build from before Phase 2: no `Cross-Origin-Opener-Policy`, no `base-uri`/`frame-src`/`worker-src 'none'`, and `/editor` still sends `X-Powered-By`. | Not Workers Builds since 2026-11-01 (its two builds then both failed). Probably a terminal deploy; not verified. |
| `cvnest-production` | https://cvnest-production.emadilramzan.workers.dev | Nothing (HTTP 404). **No production Worker exists.** | — |

Consequences:

- The live, auto-deployed Worker is `cvnest`, not `cvnest-preview`. `wrangler.jsonc` does not mention `cvnest` at all.
- A terminal command such as `npm run deploy:preview` deploys to `cvnest-preview`, **not** to the Worker that Workers Builds updates. The two Workers have separate versions, rollback history and browser storage.
- The `cvnest` build's canonical URL points at a different Worker. This is harmless while indexing is off, but it must be fixed before `cvnest` (or any Worker) is treated as production: see [Owner decisions](#owner-decisions-before-the-next-release).
- Run `node scripts/check-deployment.mjs https://cvnest.emadilramzan.workers.dev --canonical https://cvnest-preview.emadilramzan.workers.dev` to recheck the table. Without `--canonical`, the script reports the canonical mismatch as failures, as it should.

## Environments as configured in the repository

| | Preview | Production |
| --- | --- | --- |
| Wrangler environment | `preview` | `production` |
| Worker name in `wrangler.jsonc` | `cvnest-preview` | `cvnest-production` (does not exist yet) |
| `NEXT_PUBLIC_SITE_URL` in the build script | https://cvnest-preview.emadilramzan.workers.dev | https://cvnest-production.emadilramzan.workers.dev |
| `NEXT_PUBLIC_INDEXABLE` | `false` | `false` |

Each Worker has its own versions, rollback history and browser origin, so resumes saved on one are not visible on the other.

From a terminal, a command without `--env` targets `cvnest-preview`, never production. In Workers Builds the name in `wrangler.jsonc` does **not** decide the target: see [Workers Builds](#workers-builds).

## How it is served

- Every page is prerendered by `next build`. Nothing revalidates and there are no API routes.
- `open-next.config.ts` uses the static assets cache, so prerendered pages, RSC payloads and the social images are read from Workers Static Assets.
- There is no R2 bucket, KV namespace, D1 database, Queue or Durable Object. The Worker only needs its `ASSETS` binding.
- Resume data stays in the visitor's browser (`localStorage` and IndexedDB). PDF export uses the browser's print window. Neither touches the Worker. By product policy, PDF generation stays in the browser and downloads never require an account (`docs/phase-0-product-decisions.md`), so no server-side PDF rendering is planned.
- Exception: `/editor` is rendered on demand (`ƒ` in the build output), not prerendered, because the page reads `searchParams` on the server. It outputs only a loading state. See audit finding ME-08.

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

### What is verified

From the "Workers Builds" check runs that Cloudflare posts on GitHub commits, and from the pinned Wrangler 4.156.0 source:

| Fact | Evidence |
| --- | --- |
| The repository is connected to the **`cvnest`** Worker. | Check runs are named `Workers Builds: cvnest` and link to `workers/services/view/cvnest`. |
| Every push to `main` builds and deploys `cvnest`. | 5 of 5 `main` builds checked (`1d21795` to `8141108`) succeeded; `8141108` reports a Version ID. |
| Builds also run for other branches, and every one has failed. | `checkpoint/phase-0-1` (`01d51fd`) and `phase-2-security-hardening` (`2532d99`, `5ab72c1`): 3 of 3 failed. So "Builds for non-production branches" is on. |
| Workers Builds does **not** wait for GitHub Actions. | For `8141108`, the `cvnest` build finished at 09:50:22 UTC; the CI browser job finished at 09:58:05 UTC. The build had deployed 8 minutes before the tests finished. |
| The name in `wrangler.jsonc` doesn't choose the Worker in Workers Builds. | Wrangler 4.156.0 reads `WRANGLER_CI_OVERRIDE_NAME` (set by Workers Builds to the connected Worker), replaces the config name and only **warns** ("Failed to match Worker name … Overriding using the CI provided Worker name"). This was reproduced locally with a dry run. That is how a `cvnest-preview` build landed on `cvnest`. |
| `cvnest-preview` had its own connection on 2026-11-01. | Two `Workers Builds: cvnest-preview` check runs on `main` (`41e4e0e`, `1d21795`), both failed. None since. |

The earlier statement in this guide ("a wrong `--env` fails the build, and it can't create a `cvnest` Worker") was wrong for this Wrangler version. Wrangler's `WRANGLER_CI_MATCH_TAG` check only confirms that the **overridden** name exists in the account.

### What is not verified (dashboard only)

These settings are visible only under Worker `cvnest` > Settings > Build. They have not been read, so they are not listed here as facts:

- The build command. The deployed pages carry the preview URL, which is consistent with `npm run build:preview`, but this is inferred.
- The deploy command, and the non-production branch deploy command. Cloudflare's default for the latter is `npx wrangler versions upload`.
- Build variables, the build token, the root directory and the production-branch setting.
- **Why non-`main` builds fail.** The logs are in the dashboard (each GitHub check links to its build), and GitHub has no error text. One cause has been ruled out locally: after `npm run build:preview`, `npx wrangler versions upload --dry-run` packages the same Worker as `wrangler deploy --dry-run` (8,514.69 KiB, 2,065.75 KiB gzip, `ASSETS` binding only), with or without `WRANGLER_CI_OVERRIDE_NAME=cvnest`. So the upload command can package an OpenNext build. The failure is either in a dashboard-configured step or in the real upload, which a dry run doesn't reach. Read one failed build log before changing anything.

### Rules that still hold

- The build command must be an OpenNext build. With `npm run build`, the deploy fails with `Could not find compiled Open Next config`, because `.open-next` is ignored by git and `next build` does not create it.
- `npx wrangler deploy` detects the OpenNext project and calls `opennextjs-cloudflare deploy`, passing `--env` along.
- The site URL and indexing flag are set inside the build scripts, so no build variables are needed. A dashboard value with the same name would be overridden.
- Every push to `main` deploys to `cvnest`, so `main` must stay safe to serve.
- Do not connect a production Worker to Workers Builds on `main` without a gate. Every push would then reach production without a release approval.

The build token is chosen on the same settings page. The default token Cloudflare generates is enough, because it includes Workers Scripts: Edit. A token that has been deleted or rolled fails the build until you select a new one.

## Gating deploys on tests

The GitHub Actions workflow (`.github/workflows/ci.yml`) only verifies. It never deploys, and nothing makes Workers Builds wait for it. Today, any push to `main` deploys whether or not CI passes. The `Protect main` ruleset only blocks force-pushes and deletion. It has no required status checks and no pull-request requirement, and `main` has no classic branch protection.

Options, from least to most change:

| Option | What it gates | What it needs | Notes |
| --- | --- | --- | --- |
| **1. Required status checks on `main`** (recommended first step) | Code reaching `main`, so also what Workers Builds deploys | GitHub ruleset change (owner): add "Require a pull request before merging" and "Require status checks to pass" with `Typecheck, lint, unit tests, build` and `Browser suites (Chrome)`; optionally "Require branches to be up to date". | No Cloudflare change and no second pipeline. Merging is blocked until CI passes on the PR. The merge commit itself still deploys before its own CI run finishes, but its content is what CI tested. |
| 2. Verify inside the Workers Builds build command | The deploy itself | Dashboard change (owner): build command `npm run typecheck && npm run test:unit && npm run build:preview`. | Stops a deploy when typecheck or unit tests fail, even on a direct push. Browser suites can't run there (no Chrome in the build image is assumed, and not verified). Adds about 1 minute per build. |
| 3. Deploy from GitHub Actions instead of Workers Builds | The deploy itself, after every suite | Disconnect Workers Builds, add a Cloudflare API token as a GitHub secret, add a `deploy` job that `needs` the test jobs. | Strongest gate, but a credential and a second pipeline. If the Workers Builds connection is not removed first, both deploy, which is the duplicate-pipeline risk to avoid. Not recommended until there is a production Worker. |

Options 1 and 2 together give a gate on both paths into `main` and on the build itself. None of these has been applied. Each needs a GitHub or Cloudflare settings change by the owner.

Separately, decide what to do about non-`main` builds. Either turn off "Builds for non-production branches" (nothing currently uses branch preview versions), or set its deploy command once the failure log has been read.

## Release checklist

Run this for every deploy, automated or manual. Steps 1–6 run locally or in CI and change nothing outside the machine.

1. **Clean source.** On the commit being released: `git status` is clean, and `git rev-parse HEAD` matches the GitHub commit.
2. **TypeScript:** `npm run typecheck`.
3. **Lint:** `npm run lint` (0 errors).
4. **Unit tests:** `npm run test:unit` (all pass).
5. **Production build:** `npm run build`.
6. **Browser suites:** the 20 standard suites, as CI runs them:

   ```bash
   npm run test:e2e -- a11y count customize data-model durability editor entries error-boundaries fields guard keyboard layout links open-section safety sample security template-picker templates zoom.test
   ```

   Also run `npm run test:e2e -- pdf pagination bullets zoom-firefox` (about 40 minutes; the CI `workflow_dispatch` "full" option) when templates, typography, pagination or PDF code changed. Firefox must be installed for the Firefox suites.
7. **CI is green** on GitHub for the same commit: both jobs passed, not just started.
8. **Deployment target.** Know which Worker the deploy will change before running it:
   - Workers Builds on `main` changes **`cvnest`**.
   - `npm run deploy:preview` changes **`cvnest-preview`**.
   - `npm run deploy:production` would create or change **`cvnest-production`**. Don't run it without explicit approval.
   - For a terminal deploy, also run `npx wrangler deploy --dry-run --env <env>` and check the canonical URL of the build (see [Verifying the target before a deploy](#verifying-the-target-before-a-deploy)).
9. **After the deploy: HTTP checks.** `node scripts/check-deployment.mjs <deployed URL> [--canonical <the build's site URL>]` must pass. It checks status codes for every page, `robots.txt`, `sitemap.xml` and a 404, and the security headers (CSP directives, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP, HSTS, no `X-Powered-By`). It also checks `noindex` in the header and meta tag, the canonical and sitemap origin, and static asset caching. It sends only GET requests.
10. **Smoke test in a browser** on the deployed URL: open the editor, edit a field, reload (the edit is kept), download a backup, and save a PDF.

## Owner decisions before the next release

- Which Worker is the long-term preview: `cvnest` (connected, current) or `cvnest-preview` (named in `wrangler.jsonc`, stale). Then either rename the config to match, or move the Workers Builds connection. Until then, the `cvnest` build's canonical points at `cvnest-preview`.
- Whether to apply gate options 1 and 2 above.
- What to do about non-`main` Workers Builds (turn off, or fix after reading a log).
- The production Worker and domain (`getcvnest.com` is intended but not confirmed as purchased; see below). Don't create `cvnest-production` or change URLs until this is decided.

## Production releases

**No production Worker exists yet.** The first `npm run deploy:production` would create `cvnest-production`. That is a release decision for the owner, not a routine step.

When production is approved, it never deploys on its own. A release needs explicit approval first, and is then run by hand from `main`:

```bash
npm run build:production
npx wrangler deploy --env production
```

1. Get explicit approval for the commit being released, after it has been checked on the preview URL.
2. Switch to `main` and confirm the working tree is clean and matches GitHub.
3. Work through the [Release checklist](#release-checklist), steps 1–8. A terminal deploy has no Workers Builds involvement, so the Worker name comes only from `--env`.
4. Run the two commands above. `npm run deploy:production` runs both.
5. Run step 9 against the production URL: `node scripts/check-deployment.mjs https://cvnest-production.emadilramzan.workers.dev`.

## Environment variables and secrets

The application needs no secrets. Two public, build-time variables configure it, and the `build:` scripts set them:

| Name | Used for | Without it |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical links, Open Graph URLs, the sitemap, `robots.txt` | `http://localhost:3000` |
| `NEXT_PUBLIC_INDEXABLE` | Allows search engines, only when exactly `true` | Indexing stays off |

They are compiled into the build, so changing one needs a new build. They are not Worker runtime variables.

Both environments stay non-indexable until the site is ready for public launch. Do not set `NEXT_PUBLIC_INDEXABLE=true` until the custom domain (intended: `getcvnest.com`) is configured and the legal pages are complete.

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

**Intended permanent domain: `getcvnest.com`** (decided in Phase 0, `docs/phase-0-product-decisions.md`). It hasn't been purchased, added as a zone or attached yet. Nothing in this guide or in `wrangler.jsonc` has been changed for it. The production build still uses the workers.dev URL until the steps below are done.

1. Add `getcvnest.com` to the account as a zone, then attach it to `cvnest-production` as a custom domain.
2. Change `NEXT_PUBLIC_SITE_URL` in the `build:production` script to `https://getcvnest.com` (or the `www` form, if that's chosen as canonical). Canonicals, Open Graph URLs, `sitemap.xml`, the `robots.txt` sitemap line and HSTS all follow from it.
3. Decide how `www` should behave **before** any public traffic, and add a redirect if it's used. Bare and `www` are different browser origins (see below).
4. Set `NEXT_PUBLIC_INDEXABLE=true` only after steps 1–3 and the legal pages are final.
5. Keep the workers.dev URL working for a while and ask any existing users to download a backup first. Saved resumes belong to the exact URL, so a redirect would strand them.

**Browser storage and domain changes.** Guest resumes are stored in `localStorage` and IndexedDB, which browsers keep separately per origin (scheme, host and port). `https://getcvnest.com`, `https://www.getcvnest.com` and `https://cvnest-production.emadilramzan.workers.dev` each have their own, separate storage. A redirect or domain change doesn't carry saved resumes across. Users see an empty editor on the new address, and their work stays on the old one. The only guest migration path is Download backup on the old address, then Restore from backup on the new one. Launch publicly on the final domain and host only, and treat any later change as a planned data-migration event.

## Rollback

Every deploy creates a Worker version. Run `npx wrangler deployments list --env production`, then `npx wrangler rollback <version-id> --env production`. Use `--env preview` for `cvnest-preview`.

The Worker that Workers Builds deploys, `cvnest`, has no environment in `wrangler.jsonc`, so `--env` can't reach it. Roll it back in the dashboard (Worker `cvnest` > Deployments), or with `npx wrangler deployments list --name cvnest` and `npx wrangler rollback <version-id> --name cvnest`. The `--name` form has not been run against this account; check the list output names `cvnest` before rolling back.

A rollback does not change Git, so revert the commit too. Otherwise the next push deploys the same code again.

## Keeping it working

- Keep pages static. A page that starts revalidating needs a writable cache such as R2, because the static assets cache is read-only.
- Do not add `export const runtime = "edge"`, or a Node middleware or `proxy` file. OpenNext does not support either yet.
- Check the Worker size after adding server-side dependencies: `npm run build:preview`, then `npx wrangler deploy --dry-run --env preview`. The size limit counts the gzip figure.
- `@opennextjs/cloudflare` and `wrangler` are pinned to exact versions. Upgrade them together, and rerun the browser suites against `npm run preview` afterwards.
