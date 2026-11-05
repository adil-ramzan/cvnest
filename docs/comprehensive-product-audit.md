# CVNest: comprehensive product audit

**Date:** 2026-11-04
**Commit audited:** `6acc6df` on `main` (working tree clean, identical to `origin/main`)
**Scope:** audit, testing and reporting only. No application code, configuration, dependency, Cloudflare setting or Git history was changed. The only file created in the repository is this report.

---

## How to read this report

### Evidence labels

Every finding says how it was established:

| Label | Meaning |
|---|---|
| **[T]** | Automated test from the project's own suites, run during this audit. Results in section 9. |
| **[P]** | Ad-hoc automated probe written for this audit and run against a local production build (`next start`). Scripts lived in a temporary scratchpad outside the repository and are not part of the project. Results in section 9.3. |
| **[C]** | Manual code inspection. File and line references are given. |
| **[D]** | Statement in the project's own documentation. |
| **[A]** | Reported by `docs/audit-final.md` (2026-10-31) and not re-measured here. |

Nothing labelled [C], [D] or [A] was executed. Where a finding is an inference, it says so and names what would confirm it.

### Severity scale

| Severity | Meaning |
|---|---|
| **Critical** | Blocks public launch, or would cause irreversible user harm (data loss, broken legal position, broken core promise) if launched as is. |
| **High** | Core journey, data safety or a public claim is materially at risk. Fix before launch. |
| **Medium** | Noticeable quality, trust, SEO, performance or maintainability problem. Fix before or shortly after launch. |
| **Low** | Polish, housekeeping, or minor risk. |
| **Improvement** | Not a defect. An opportunity that fits the product direction. |

### Implementation phases used throughout

| Phase | Name | Purpose |
|---|---|---|
| **P0** | Decisions | Product, brand, domain and legal decisions that code depends on. No code. |
| **P1** | Foundations and truthfulness | Fix inaccurate claims, data-durability gaps and technical SEO basics in the current guest product. |
| **P2** | Editor UX and accessibility | Editor layout, typography and interaction consistency, plus accessibility fixes. |
| **P3** | Optional accounts (cloud backup and sync) | Optional accounts per `docs/accounts-plan.md`, with safe guest-to-account migration. **Not a launch prerequisite.** Downloads never require an account (Phase 0). |
| **P4** | Verification and launch | Real-device, Safari, screen-reader and ATS-parser verification; final legal pages; production domain; launch checks. |
| **P5** | Post-launch growth | SEO content, gallery filters, performance improvements, feature additions. |
| **P6** | Monetization groundwork | Entitlements, payments and premium additions, without changing the free experience. |

---

## Phase 0 status update (2026-11-04)

Phase 0 recorded the approved product policy in `docs/phase-0-product-decisions.md` and aligned the documentation with it. **No application code changed.** The original findings below are kept for traceability. Where Phase 0 changed their meaning, the finding carries a status block.

**Key policy change:** the "account required at download" flow assumed in the brief for this audit is **withdrawn**. PDF downloads are free, unlimited and never require an account. Accounts are optional and provide cloud backup, sync and recovery.

### Status categories

| Status | Meaning |
|---|---|
| **Product decision resolved** | The owner has made the decision; no further choice is needed |
| **Documentation aligned** | Repository documentation no longer contradicts the decision |
| **Implementation pending** | Code or configuration still has to change; listed in `docs/phase-0-product-decisions.md` section 9 |
| **Owner information required** | Facts only the owner can supply; listed in `docs/phase-0-product-decisions.md` section 8 |
| **External verification required** | Needs a lawyer, a registrar or Cloudflare action, or a real-device check |

A finding is **resolved** only when every applicable category is complete.

### Critical findings

| ID | Product decision | Documentation | Implementation | Owner information | External verification | Overall |
|---|---|---|---|---|---|---|
| CR-01 Download policy | **Resolved**: no account, no gate, browser PDF | **Aligned**: `README.md`, `docs/accounts-plan.md`, `docs/deploy-cloudflare.md`, this report, `docs/phase-0-product-decisions.md` | **None needed for the policy.** Public copy already promises account-free downloads and stays as is. Optional accounts are future work, not a launch requirement. | None | None for the policy. Optional accounts later need a proxy or route-handler check on OpenNext (`docs/accounts-plan.md` decision 2). | **Resolved** (policy and docs). Optional accounts remain unscheduled future work. |
| CR-02 Legal and contact | **Partly**: the need is decided; the content depends on owner facts | **Drafts prepared** in `docs/legal/` (marked DRAFT, not reviewed) | **Pending**: the live `/privacy`, `/terms` and `/contact` pages are unchanged; the false `/terms` sentence is still live (P-1 to P-3) | **Required**: O-3 to O-11 | **Required**: legal review | **Open** |
| CR-03 Domain | **Resolved**: CVNest at `getcvnest.com` | **Aligned**: README, deploy guide, accounts plan, decisions doc, including the storage-origin consequences | **Pending**: domain not attached; `NEXT_PUBLIC_SITE_URL` still the workers.dev URL (P-10); `site.ts` comment (P-9) | **Required**: O-1 (registration), O-2 (trademark), O-13 (`www` vs bare) | **Required**: domain purchase and Cloudflare setup by the owner | **Open** (decision made, not executed) |

### Effect on other findings

| ID | Change |
|---|---|
| HI-05 | The `/sign-in` row no longer conflicts; its text matches the policy. The other rows stand; replacement text is in `docs/phase-0-product-decisions.md` section 9 (P-1 to P-7). Implementation pending. |
| HI-03 | Positioning "Free ATS-friendly resume builder" is approved as a goal. The claim rule in `docs/phase-0-product-decisions.md` section 1.1 applies until verification. The finding is unchanged. |
| ME-12 | The `// ACCOUNTS` markers now mean "revisit when optional accounts are added", not "will become false". Centralizing copy is still recommended. |
| ME-15 | README drift partly fixed: the stale "favicon and Open Graph image still need to be completed" line and the download-gate description are removed. The deploy guide now notes the `/editor` exception. |
| LO-18 | `/sign-in` text is consistent with the policy; replace it only when optional accounts ship. |
| Section 7.3 (monetization) | Updated: no download gate; conversion points are optional account benefits and future additive premium features. |
| P3 phase | Renamed "Optional accounts (cloud backup and sync)". Not a launch prerequisite. |

The 51 outstanding items mapped from `docs/audit-final.md` in section 8 are unchanged by Phase 0. None was resolved by documentation alone, because each needs code, content on the live site, or external verification. Of the 2 regressions, the removed FAQ disclosures remain. The `/sign-in` item no longer counts as a regression, because its text matches the approved policy.

---

## Phase 1 status update (2026-11-04): public content corrections

Phase 1 applied the approved content replacements P-1 to P-12 from `docs/phase-0-product-decisions.md` section 9. Only public wording, the three legal pages and two code comments changed. No editor behavior, storage, migration, PDF, pagination, template, configuration or URL changed. Full details and test results are in `docs/phase-1-completion-report.md`.

| Item | Status | Where |
|---|---|---|
| P-1 False `/terms` sentence | **Done**: replaced by the draft Terms (visible draft notice, placeholders kept) | `src/app/(site)/terms/page.tsx` |
| P-2 Privacy Policy | **Done (draft)**: draft content published with a visible draft notice | `src/app/(site)/privacy/page.tsx` |
| P-3 Contact | **Done (draft)**: email placeholder, no form | `src/app/(site)/contact/page.tsx` |
| P-4 "not sent… to any third party" | **Done** | `src/components/editor/PrivacyNote.tsx` |
| P-5 PDF-as-copy advice | **Done**: now recommends a backup | `src/components/editor/PrivacyNote.tsx` |
| P-6 "restore it in any browser" | **Done**: "another browser" | `src/data/copy.ts` |
| P-7 Safari in the PDF error | **Done** | `src/components/editor/usePdfExport.tsx` |
| P-8 FAQ browser and ATS disclosures | **Withdrawn by owner decision (2026-11-04).** The two entries were briefly restored, then removed at the owner's request. The home FAQ is back to its 7 original entries. | `src/data/copy.ts` |
| P-9 `site.ts` placeholder comment | **Done** (comment only) | `src/data/site.ts` |
| P-10 `NEXT_PUBLIC_SITE_URL` | **Deferred**: blocked until `getcvnest.com` is attached (Phase 1 forbids URL changes) | `package.json` (unchanged) |
| P-11 `/sign-in` | **Verified; no change needed** | — |
| P-12 "no account" claims | **Verified; no change needed** | — |

Finding status after Phase 1:

| ID | Status |
|---|---|
| CR-02 | **Open.** The false statement is removed, and the live pages carry draft content clearly labelled as not legally reviewed. Still required: owner information (O-3 to O-11), legal review, then replacing the placeholders. |
| CR-03 | **Open (decision made).** P-9 done; P-10 deferred; domain registration and attachment pending. |
| HI-02 | **Partly addressed:** the PDF error message no longer suggests Safari (P-7). The FAQ browser disclosure was withdrawn by the owner, so the site doesn't state browser or phone support either way. README "Known limitations" still discloses it. Device verification is still required. |
| HI-03 | **Open:** the FAQ ATS disclosure was withdrawn by the owner. The site makes no ATS claim, and the Terms (draft) disclaim any guarantee of acceptance by applicant tracking systems. The verification harness, the `templateStructure` label fix and the `ats` tag rename are still outstanding. |
| HI-05 | **Done** for every row in the table. The `/sign-in` row needed no change after Phase 0. |
| ME-11 | **Phase 2: the flaky check is fixed; see the Phase 2 status update.** Original Phase 1 note: In the final Phase 1 browser run (24 of 25 suites passed), `safety` failed one check, "Warning clears when the other tab closes". It then passed 5 of 5 isolated reruns on the same build. The check uses a fixed 1.5 s sleep; see `docs/phase-1-completion-report.md` section 5.3. |
| Section 8 mapping | Rows "`PrivacyNote` recommends a PDF", "Not sent to any third party", "Restore it in any browser", "Try … Safari", "Terms … FALSE" and the privacy line about extensions and sync are now **resolved in code**. The FAQ-disclosure items remain as mapped: the owner chose not to restore them. All other mapped items are unchanged. |

---

## Phase 2 status update (2026-11-05): security and technical hardening

Details and exact results are in `docs/phase-2-completion-report.md`. No template, PDF, pagination, storage-key or migration code changed. All 480 Chrome and 480 Firefox PDFs are identical to the pre-Phase-2 baseline in page count, fonts, text and word positions (maximum shift 0.000 pt).

| ID | Status after Phase 2 | Evidence |
|---|---|---|
| ME-09 item 3 (`X-Powered-By`) | **Resolved**: `poweredByHeader: false` | `security` suite; local Worker (`npm run preview`) responses |
| ME-09 CSP | **Improved**: `base-uri`, `frame-src` and `worker-src` set to `'none'`; `Cross-Origin-Opener-Policy: same-origin` added. `'unsafe-inline'` kept (prerendered pages, no nonce). | `security` suite: 0 CSP violations across pages, gallery, editor, photo upload, restyling and PDF export; all 26 suites pass |
| ME-09 item 1 (nonce-based CSP) | **Deferred**: needs on-demand rendering; only relevant once authenticated routes exist | — |
| ME-09 item 2 (`npm audit` advisories via `@opennextjs/cloudflare`) | **Open (deferred)**: fixing needs a dependency change outside Phase 2 scope | — |
| ME-09 item 4 (HSTS `includeSubDomains`) | **Open**: waits for the domain (CR-03) | — |
| ME-11 (test process) | **Partly resolved**: test-only GitHub Actions CI added (`.github/workflows/ci.yml`); the flaky `safety` checks fixed by root cause. Still open: Workers Builds deploys preview without running tests (a Cloudflare setting, not changed); no WebKit run; the CI workflow hasn't yet run on GitHub. | 10 sequential and 6 concurrent `safety` runs passed; stress runs of 8 other suites passed |
| ME-02 (large restore and inline photos) | **Open**: not implemented, by instruction (needs separate approval) | — |
| New: unreadable restore file | **Resolved**: a file that can't be read now shows the existing error dialog instead of failing silently | `security` suite |
| New ME-16: numbers in text fields are discarded | **Open (owner decision)**: `sanitizeResume` turns a non-string value in a text field (for example `2021` or a phone number written as a number in a hand-edited backup) into empty text, and drops non-string bullets. This is deliberate and test-protected (`tests/unit/schema.test.ts`), so it wasn't changed in Phase 2. Converting finite numbers to text would avoid the loss; it needs approval because it changes data handling. | `src/lib/resume-schema.ts` (`str`, `optStr`, `strList`) |

Input validation was reviewed and found sound: colors, fonts, text size, page size, template ids, photos and links are all validated, oversized text is kept, and nothing throws on malformed data. Phase 2 added tests to prove it (16 unit tests and 11 browser checks); there were no other code changes.

---

## 1. Executive summary

CVNest's guest product is technically strong. The data model separates content from presentation. Storage has versioned migrations with backups. Every template exports to PDF in automated Chrome and Firefox runs, and the code makes no third-party requests. The automated suites are unusually thorough for a project of this size, and the run in this audit passed (section 9).

It is **not ready for public launch**. The blockers are not code quality. They are three unresolved product-level issues:

1. *(Resolved by policy in Phase 0: downloads never require an account; see the status update above.)* **The agreed launch flow does not exist yet, and the project contradicts it.** Users are meant to create resumes as guests and sign in at download. There is no authentication, backend or API in the codebase. The accounts plan says never to block a guest feature. Public copy in at least six places promises that no account is needed to download. The deployment guide forbids the proxy file the accounts plan depends on. (CR-01)
2. **Legal and contact pages are placeholders.** The Terms page states that full terms will be published "before the resume editor launches", but the editor is already live. (CR-02)
3. **The production domain is undecided.** Guest resumes are bound to the exact origin, so launching on one URL and moving later would strand every guest's saved work. (CR-03)

Behind those, the most important problems are:

- Browser-only storage is exposed to eviction, and the app does not ask for persistent storage (HI-01).
- PDF export on Safari, iOS and Android is still unverified, and the FAQ disclosure about this was removed (HI-02).
- The "ATS-friendly" positioning is not verified. The ATS caveat was removed from the FAQ, and 13 templates are labelled "Single column" although their layout splits text into columns (HI-03).
- The editor feels small and cluttered because of an inverted type hierarchy, a narrow form column and stacked banners (HI-04).
- Several public claims are inaccurate today (HI-05).
- The new text-size and font controls are not covered by any per-template PDF test (HI-06).

Every open item from `docs/audit-final.md` is mapped in section 8. Thirteen groups of items are now resolved, including security headers, the source backup, one H1 per page, page-count accuracy and style customization. Of the 69 remaining items, 51 are still outstanding and 2 have regressed, because two FAQ disclosures were removed and `/sign-in` contradicted the then-agreed flow. After Phase 0, `/sign-in` matches the policy, so only the FAQ regression remains. The other 16 are resolved in part or under conditions, accepted by design, or not re-measured.

---

## 2. Project understanding

### 2.1 Architecture as built [C]

| Area | What exists |
|---|---|
| Stack | Next.js 16.4.3 (App Router, Turbopack), React 19.3.1, TypeScript 5.9, Tailwind CSS 4, `lucide-react`. Deployed to Cloudflare Workers through `@opennextjs/cloudflare` 1.20.15. |
| Runtime model | Every public page is prerendered. `/editor` is server-rendered on demand (`ƒ` in the build output) because it reads `searchParams`. There are no API routes, no middleware or proxy, no database and no authentication. |
| Routes | `/`, `/templates`, `/templates/[slug]` (120), `/free`, `/about`, `/contact`, `/privacy`, `/terms`, `/sign-in` (noindex placeholder), `/editor` (noindex), `robots.txt`, `sitemap.xml`, `opengraph-image`, `twitter-image`, icons, `not-found`, `error.tsx` ×2, `global-error.tsx` |
| Data model | `src/data/resume.ts`, schema v2. `Resume = { profile, sections[], design }`. `design` holds `templateId`, `pageSize` and the optional `accentColor`, `fontFamily` and `fontScale`. Content and presentation are separate. |
| Storage | `localStorage` under `folio.*` keys (`src/lib/resume-storage.ts`). Photos live in IndexedDB database `folio`, store `photos` (`src/lib/photo-store.ts`). Migration from v1 keeps the original key untouched as a backup (`src/lib/migrations.ts`). Unreadable data is copied to `folio.resumes.v2.unreadable-backup`. |
| Backup | `src/lib/backup.ts`: JSON file with photos embedded, 25 MB limit, validated with the same schema as stored data, merge or replace on restore. |
| Templates | 120 templates in `src/data/templates.ts`: 117 declarative designs rendered by `src/components/resume/engine/DesignTemplate.tsx`, plus 3 hand-written (Professional, Modern, Minimal). |
| PDF | `src/components/editor/usePdfExport.tsx` renders a print-only copy and calls `window.print()`. Firefox gets a separate path with static fonts from `public/fonts/print/` (72 files, 5.1 MB). The user chooses "Save as PDF" in the print dialog. |
| Pagination | `src/components/resume/paginate.ts` and `src/components/editor/usePagination.ts` lay out preview pages, so the page count and page gaps match the PDF. |
| Customization | `src/components/editor/StyleControls.tsx`: 9 preset colors plus a custom color, 6 fonts, text size Small (90%), Medium (100%), Large (110%), with ±5% steps from 80% to 120%. |
| Security headers | `next.config.ts`: CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS on HTTPS URLs, and `X-Robots-Tag` while the site isn't indexable. |
| Environments | `cvnest-preview` and `cvnest-production` Workers on `*.workers.dev`. Both are built with `NEXT_PUBLIC_INDEXABLE=false` (`package.json`, `docs/deploy-cloudflare.md`). |
| Tests | 12 unit test files (220 tests), 25 browser suites run by `tests/e2e/run.mjs`, plus 4 manual scripts (`pagination-matrix.mjs`, `pagination-max.mjs`, `typing-latency.mjs`, `long-resume.mjs`) that the runner does not include. |

### 2.2 Template catalogue [P]

Counts come from the compiled registry:

| Measure | Count |
|---|---|
| Templates (unique slugs) | 120 |
| Engine layouts | single 57, columns 24, sidebar 23, labels 8, timeline 5, hand-written 3 |
| Structure label shown to users (`src/data/template-tags.ts`) | "Single column" 72, "Sidebar" 24, "Two column" 24 |
| Photo | none 93, optional 14, always 13 |
| Single-column (as labelled) with no photo | 63 |
| Templates tagged `ats` | 14, all single-column with no photo |
| Categories | creative 19, modern 16, simple 14, photo 13, compact 12, graduate 12, executive 10, technical 9, business 8, academic 7 |

### 2.3 Product requirements checked against the code

| Requirement | Status | Evidence |
|---|---|---|
| Free ATS-friendly builder | Free: yes [C]. ATS-friendly: **not verified**, and not stated anywhere on the site [C] | HI-03 |
| Preserve all 120 templates | Yes. 120 unique slugs; the `count` suite enforces the 110+ floor [T] | section 9 |
| No watermark | Yes. Nothing is added in the print path [C: `usePdfExport.tsx`] | |
| Create without an account | Yes [C] | |
| Account required at download | **Withdrawn in Phase 0.** Downloads never require an account, and current behavior and copy already match. | CR-01 |
| Content separate from presentation | Yes. `design` is separate from `profile` and `sections`, and switching templates never touches content [C][T: `customize`, `data-model`] | |
| Browser storage and migration preserved | Yes. Migrations are tested [T: unit `migrations`, `storage`; e2e `data-model`, `safety`] | |
| No functionality removed | Nothing removed. Two FAQ disclosures were removed in `52d0d39` | HI-02, HI-03 |

---

## 3. Findings: Critical

### CR-01: The agreed account-required-at-download flow is not implemented, and project documents and public copy contradict it

> **Phase 0 status: resolved (product decision and documentation).** The owner withdrew the download gate. Policy: PDF downloads are free, unlimited and never require an account; there is no gate; PDFs stay browser-generated (`docs/phase-0-product-decisions.md` sections 1 and 4). The contradiction is resolved in favor of the existing public copy and `docs/accounts-plan.md` §7, both of which already said no account is needed. `README.md`, the only document describing a gate, was corrected. Recommended solution steps 1, 2, 4 and 6 below are **superseded**. Step 3 (auth on OpenNext without a proxy) and step 5 (guest-to-account migration) still apply to **optional** accounts, which are future work and not a launch blocker. The original text is kept below for traceability.

- **Category:** Product / Accounts / Architecture
- **Description:** The agreed flow is guest creation with an account required at download. There is no authentication, user store, API route or session handling in the codebase. Worse, the project's own artifacts point the other way:
  - The accounts design (`docs/accounts-plan.md` §7, line 426) says: "Never show a sign-in wall, a timed popup, or a block on any guest feature." It plans only "at most one quiet note" after a first PDF.
  - Public copy promises the opposite of a download gate: `/sign-in` ("You will not need one to create and download your resume"), `/free` ("No account required… no sign-up, login or email needed"), the home FAQ ("Do I need an account? No."), the hero reassurance, the footer, and `/privacy` ("there are no accounts").
  - `docs/deploy-cloudflare.md` says not to add "a Node middleware or `proxy` file. OpenNext does not support either yet". Phase 1 of the accounts plan is built on `proxy.ts`.
  - PDF export is entirely client-side (`window.print()` on a print-only DOM copy). Any gate placed in front of it can only be enforced in the browser.
- **Evidence:** [C] no `src/app/api`, no `proxy.ts` or `middleware.ts`, no auth dependency in `package.json`. [D] `README.md` ("The planned launch flow… requires signup or login when they choose to download a PDF"), `docs/accounts-plan.md:266` (proxy needed for token refresh), `:424` and `:426` (no sign-in wall), `:494` (Phase 1 uses `proxy.ts`), `docs/deploy-cloudflare.md:178` (no middleware or proxy). [C] `src/app/(site)/sign-in/page.tsx`, `src/data/site.ts` (`freeFeatures`), `src/data/copy.ts` (every `// ACCOUNTS` string), `src/app/(site)/privacy/page.tsx`.
- **User impact:** If the gate ships without rewriting the copy, every "no account" promise becomes false at the moment a user tries to download. That is the moment of highest frustration, and it reads as bait-and-switch. If the gate isn't built, the agreed launch flow can't happen. If the gate is built only in the browser, determined users can bypass it. That is acceptable only if it's a conscious decision.
- **Severity:** Critical
- **Recommended solution:**
  1. **P0:** Record one decision that supersedes the conflicting statements. It should cover what is gated (PDF download only, recommended), what stays guest-accessible (editing, preview, autosave, backup and restore, template switching), and whether the gate is a soft, client-enforced gate. Recommended: soft gate, because server-side PDF rendering adds cost and sends resume content to a server, which breaks the current privacy position.
  2. Update `docs/accounts-plan.md` §7 and §8 to describe the gate. Keep its other principles: nothing local is deleted automatically, sync is a background copy, and guests make zero account requests until they choose to sign in.
  3. **Architecture spike before P3:** confirm how auth runs on OpenNext for Cloudflare without a proxy file, for example cookie sessions checked in route handlers only (`/api/*`, `/auth/*`). Re-check OpenNext's current proxy support. Update `docs/deploy-cloudflare.md` either way.
  4. Gate UX: clicking Download opens a sign-in or sign-up dialog in place. After authentication, the user returns to the same resume, unchanged, and the PDF flow continues automatically. Never lose the guest resume across the OAuth or magic-link round trip. The magic link may open in another tab or browser, so plan for that.
  5. Guest-to-account migration of resumes **and IndexedDB photos**, as designed in `accounts-plan.md` §3. Local data is never deleted automatically. The shared-browser case, where a different account signs in, is covered.
  6. Rewrite every `// ACCOUNTS` string and the unmarked ones listed in HI-05 **in the same release** as the gate.
- **Dependencies:** CR-02 (privacy policy must cover account data before any sign-up), CR-03 (auth cookies and OAuth redirect URIs are bound to the domain), brand decision (auth emails and the OAuth consent screen show the name).
- **Suggested phase:** P0 (decision and doc reconciliation), then P3 (build).

### CR-02: Privacy Policy, Terms of Service and Contact are placeholders, and one of them states something false

> **Phase 0 status: open.** Drafts are prepared in `docs/legal/` (Privacy Policy, Terms of Service, Contact), clearly marked DRAFT and not legally reviewed. They describe today's guest-only behavior and contain no invented owner facts; owner information is marked `[OWNER]`. Still required: owner information O-3 to O-11; legal review; replacing the live pages (P-1 to P-3). The false `/terms` sentence ("before the resume editor launches") was still live after Phase 0, because that phase didn't allow source changes. **Phase 1:** removed. `/privacy`, `/terms` and `/contact` now show the drafts with a visible "draft, not legally reviewed" notice and visible `[OWNER]` and `[LEGAL]` placeholders. The finding stays open until owner information and legal review are complete.

- **Category:** Legal / Trust
- **Description:** `/privacy` is a two-paragraph holding page. `/terms` says "Our full terms of service will be published before the resume editor launches", but the editor is already public on the preview and production Workers. `/contact` says "A contact address will be published here before launch." No data controller, governing law, contact channel, retention or rights information exists. Accounts (CR-01) will process email addresses and resume content on a server, which requires a real privacy policy, a lawful basis, deletion and export rights, and a processor list.
- **Evidence:** [C] `src/app/(site)/privacy/page.tsx`, `src/app/(site)/terms/page.tsx`, `src/app/(site)/contact/page.tsx`. [D] `docs/accounts-plan.md` §6 lists what the policy must cover.
- **User impact:** Users can't find out who is responsible for their data, how to get support, or what terms apply. Launching without them creates legal exposure, and some app stores, OAuth providers and payment providers require a privacy policy URL.
- **Severity:** Critical
- **Recommended solution:** Draft the Privacy Policy, Terms and Contact from the checklist in `accounts-plan.md` §6, covering both the guest-only and the account states. Name the controller, contact address and governing country. Get a lawyer's review. Publish before the accounts release and before indexing is enabled. Until then, fix the false sentence on `/terms` (HI-05).
- **Dependencies:** Brand and legal entity (P0). The accounts provider and region (CR-01) determine the processor list.
- **Suggested phase:** P0 (facts), P4 (final, reviewed text). The `/terms` sentence fix is P1.

### CR-03: The production domain is undecided, and guest data is bound to the origin

> **Phase 0 status: decision resolved; execution open.** The brand is **CVNest** and the intended permanent domain is **`getcvnest.com`**, recorded in `docs/phase-0-product-decisions.md` section 5, `README.md`, `docs/deploy-cloudflare.md` and `docs/accounts-plan.md`. The storage-origin consequences of any later domain or `www` change are documented (decisions doc section 6; deploy guide). Still required: owner confirmation of registration (O-1), trademark check (O-2), `www` vs bare (O-13); attaching the domain in Cloudflare (owner); updating `NEXT_PUBLIC_SITE_URL` (P-10) and the `site.ts` comment (P-9). Nothing was purchased, configured or deployed.

- **Category:** Operations / Data safety / SEO
- **Description:** Both environments run on `*.workers.dev` with `NEXT_PUBLIC_INDEXABLE=false`. `src/data/site.ts` still marks the brand as a placeholder. `localStorage` and IndexedDB are per origin, so if the product launches on one URL and later moves, every guest's resumes and photos stay behind on the old origin. `docs/deploy-cloudflare.md` acknowledges this ("Saved resumes belong to the exact URL, so a redirect would strand them"). Canonicals, sitemap, OAuth redirect URIs, auth cookies and email sender domains also depend on the final domain.
- **Evidence:** [C] `package.json` `build:production` (`NEXT_PUBLIC_SITE_URL=https://cvnest-production.emadilramzan.workers.dev`), `src/data/site.ts:1` ("Placeholder brand name"). [D] `docs/deploy-cloudflare.md` "Moving to a custom domain" step 4.
- **User impact:** Users who start a resume before a domain move lose access to it unless they made a backup. Indexed URLs would have to be redirected, losing ranking signals.
- **Severity:** Critical (irreversible for users once traffic exists)
- **Recommended solution:** Decide on the brand and register the production domain before any public traffic. Attach it to `cvnest-production`, set `NEXT_PUBLIC_SITE_URL`, decide on `www` handling, and only then set `NEXT_PUBLIC_INDEXABLE=true`. Don't promote the `workers.dev` URL. If any users already rely on it, show a one-time banner there asking them to download a backup and restore it on the new domain.
- **Dependencies:** Brand decision, trademark check.
- **Suggested phase:** P0 (decision), P4 (cutover).

---

## 4. Findings: High

### HI-01: Browser-only storage can be evicted, and the app doesn't request persistent storage

- **Category:** Data safety
- **Description:** All guest data lives in `localStorage` and IndexedDB. Safari caps script-writable storage for sites the user hasn't interacted with for seven days. Chromium browsers can evict "best-effort" storage under disk pressure. The app never calls `navigator.storage.persist()`, so storage stays best-effort everywhere. The only protection is the user's habit of downloading backups. The backup reminder can be dismissed permanently after one click and never returns, even after months of further edits.
- **Evidence:** [C] no use of `navigator.storage` in `src/` (search). [P] `navigator.storage.persisted()` returned `false` after editing. [C] `src/components/editor/ResumeEditor.tsx`: the reminder hides once `reminderDismissed` or `lastBackupAt` is set. `src/lib/resume-storage.ts` (`BackupState`). [C] `PrivacyDetails` tells users that "Some browsers may also clear storage for sites you have not visited in a while". The risk is disclosed but not mitigated. [A] Safari eviction was not tested.
- **User impact:** A user who builds a resume in Safari and returns two weeks later can find it gone, without warning. This is the most likely cause of real user data loss in the product.
- **Severity:** High
- **Recommended solution:** (1) Call `navigator.storage.persist()` after the first meaningful edit. Chrome and Edge grant or deny silently; Firefox shows a prompt, so trigger it from a user gesture with explanatory text. (2) Make backup recency visible at all times, for example "Last backup: 12 days ago" beside the save indicator. Re-show the reminder after significant changes since the last backup, not just once ever. (3) Detect Safari and show a specific note about seven-day storage clearing. (4) Position account sync (CR-01) as the durable option for people who want it. (5) Add a manual test: Safari, seven days, no visit.
- **Dependencies:** None for steps 1–3. Step 4 depends on CR-01.
- **Suggested phase:** P1

### HI-02: PDF export on Safari, iOS and Android is unverified, and the disclosure was removed

- **Category:** PDF / Cross-browser / Claims
- **Description:** PDF export depends on each browser's print dialog. It's automated and verified only on desktop Chrome and Firefox under Linux; Edge isn't installed on this machine, so the Edge results in the previous audit could not be repeated. There are no WebKit, iOS or Android runs. The FAQ entry that disclosed this ("We haven't tested Safari or phones yet") and the Firefox sidebar-strip caveat were removed in commit `52d0d39`. The export error message still suggests Safari as a working alternative.
- **Evidence:** [C] `git show 52d0d39 -- src/data/copy.ts` (removed "Which browser should I use?"). [C] `src/components/editor/usePdfExport.tsx:127` ("Try Chrome, Edge, Firefox or Safari."). [D] `README.md` "Known limitations" (Safari not verified). [T] `pdf`, `pdf-firefox`, `pdf-edges`, `pdf-firefox-blank` suites (section 9).
- **User impact:** Phone users are a large share of job seekers. If the iOS print flow produces a broken PDF, or if users don't realize they must choose "Save to Files" or "Save as PDF", the core deliverable fails. Today nothing warns them.
- **Severity:** High
- **Recommended solution:** (1) **P1:** restore a short, accurate browser-support note in the FAQ and in the PDF-preparing toast, and remove "or Safari" from the error message until it's verified. (2) **P4:** manual device matrix covering Safari macOS (latest two versions), iPhone Safari, iPad, Android Chrome, Samsung Internet and Edge Windows. Check page size, margins, colors, selectable text, links, photo, multi-page breaks, and the Small and Large text sizes. (3) Add per-platform "How to save your PDF" guidance, for example iOS: Share → Print → Save to Files. (4) Consider an optional Playwright WebKit smoke run of preview rendering. It can't print, but it would catch layout and script failures.
- **Dependencies:** Device access (owner).
- **Suggested phase:** P1 (disclosure), P4 (verification)

### HI-03: The "ATS-friendly" positioning is unverified, the ATS caveat was removed, and structure labels mislead

- **Category:** Product claims / Templates / UX
- **Description:** The brief describes CVNest as an ATS-friendly builder, but:
  - No template has been tested with a real applicant-tracking parser [A]. Reading-order problems were observed in `-layout` text extraction for `kinetic` [A].
  - The FAQ answer "Will my resume work with applicant tracking systems? We can't promise that yet… a single-column template is the safest choice" was removed in `52d0d39`.
  - `templateStructure()` labels every layout that isn't `sidebar` or `columns` as "Single column". That includes the 8 `labels` and 5 `timeline` templates, which place dates or labels in a separate visual column [C: `src/data/template-tags.ts`]. Users choosing "Single column" for safety may get one of these.
  - 48 templates are sidebar or two-column [P]. The gallery has no way to filter for the safest set (single column, no photo, standard headings).
  - An internal `ats` search tag on 14 templates implies verified suitability [C: `src/data/templates.ts`].
  - The public site never uses the words "ATS" or "applicant tracking" [C], so the positioning isn't captured for search either (ME-10).
- **Evidence:** as listed above.
- **User impact:** Users pick visually attractive two-column, sidebar or photo templates that may parse poorly in hiring systems, and nothing tells them. Any future "ATS-friendly" marketing claim would be unsupported.
- **Severity:** High
- **Recommended solution:** (1) **P1:** restore an honest ATS FAQ answer. Show a neutral note on two-column, sidebar and photo templates on the template page and in the editor; `ORDER_NOTE` already exists for section order. Rename the `ats` tag, for example to `simple-layout`. (2) **P4:** build an ATS verification harness: export all 120 templates and extract text with `pdftotext` (raw and layout), plus at least two free or open-source resume parsers. Score field extraction (name, email, phone, job titles, dates, section headings) and reading order. Publish an "ATS-safe" set only from those results. (3) Correct `templateStructure()` so `labels` and `timeline` aren't called "Single column", or add a fourth label. (4) **P5:** add a "Simple layout (best for ATS)" filter and badge in the gallery and Customize tab (IM-01). Use "ATS-friendly" in marketing only for the verified set.
- **Dependencies:** None for (1) and (3). (2) needs parser tooling. (4) depends on (2).
- **Suggested phase:** P1, P4, P5

### HI-04: The editor feels small, cluttered and inconsistent: inverted type hierarchy, narrow form, stacked banners

- **Category:** UI/UX / Editor
- **Description:** The editor's specific problems:
  1. **Inverted type hierarchy.** Field labels are 14px (`labelClass`: `text-[0.875rem]`), but helper hints are 15px (`hintClass`: `text-sm`, which this theme defines as 0.9375rem), and inputs are 15px on desktop. The text that matters most is smaller than the text that matters least. [C: `src/components/ui/styles.ts`]
  2. **Off-scale sizes.** The design scale is 13/15/16/18/20px (`globals.css` `@theme`), yet editor components use an arbitrary `text-[0.875rem]` (14px) 26 times, `text-[0.8125rem]` twice, and `text-[0.9375rem]` once. Tabs, the save status, zoom, the page count and the restore dialog all sit at 14px. [C: search of `src/components/editor`]
  3. **Narrow form column.** On desktop the form is `lg:w-[40%] lg:max-w-[560px] lg:min-w-[420px]`. At 1440px wide it's 560px including card padding, so two-column field grids (start and end date, company and location) get cramped. [C: `ResumeEditor.tsx`] [P] see 9.3 for the measured width.
  4. **Banner stacking.** Up to seven notices can stack above the form: recovered data, storage unavailable, other tab open, save error, newer version, over limits, backup reminder. Two more ("few lines", "many pages") can sit above the preview. Each is a full-width card with its own buttons. [C: `ResumeEditor.tsx`, `PreviewPanel.tsx`]
  5. **Card-in-card nesting.** The top bar is a rounded card on a canvas. Overview and Customize content sits in another rounded card (`rounded-[22px]`). Content sections are cards with inner entry rows and inner forms. The resulting three levels of borders and rounding read as busy, which is the "dashboard panel" look the brief asks to avoid. [C]
  6. **Ambiguous entry-form actions.** Edits save as you type. "Save" only closes the form, "Cancel" reverts, and Escape closes *keeping* the edits. Escape conventionally means cancel. "Save" implies nothing was saved yet. [C: `src/components/editor/content/EntryList.tsx:27-28, 208`]
  7. **Customize tab order.** Page size, a basic setting, sits below the template grid. With the "All" category selected, that's below 120 thumbnails. [C: `CustomizeTab.tsx`] [P] measured offset in 9.3.
  8. **Template choice in two places.** Preview-toolbar dropdown and Customize grid, with different presentations. [C]
  9. **Phone truncation.** At 390px the resume name shows as "Untit…", the profile name as "Daniel …" (crowded by the Sample tag and Edit button), and the save status becomes an unlabelled icon. [P]
  10. **Small preview text.** At "Fit" on a 1440px screen the preview is scaled to 83%, so resume body text renders at about 7–8px. The narrow form doesn't free space for a larger preview either. [P]
- **Evidence:** as listed. [P] measured: form column 551px at 1440px wide; 13 visible form elements at 14px; Customize "Page settings" 13,093px down the page with "All" selected (section 9.3).
- **User impact:** Harder scanning, more eye strain, uncertainty about whether work is saved, and visual noise, in the screen where users spend most of their time.
- **Severity:** High
- **Recommended solution:** (P2, no animations, no glass effects, no new card layers)
  - Editor type scale: labels 15px medium `ink-soft`, inputs 16px everywhere, hints 14px `muted` (smaller than labels), section titles 18px bold, entry titles 16px. Remove arbitrary `text-[…]` sizes in favour of tokens.
  - Widen the form: about 44–48% of the width with `max-w` around 680px, or a split that scales with the viewport. Single-column fields below about 520px of form width.
  - Replace stacked notices with **one status region**. It shows the single highest-priority issue, with "n more" expanding the rest. Non-urgent items (backup reminder) move into the save-status area.
  - Flatten nesting: one surface level for the form column. Sections become separated groups with a divider and heading, not cards inside cards.
  - Entry forms: rename "Save" to "Done". Make Escape behave like Done, which it already does, and say so, or make it behave like Cancel. Pick one and document it. Keep Cancel as the explicit revert.
  - Customize: put Page size first, then Style, then Template. Template defaults to the current category, not "All".
  - Move warning and danger hex colors (`#b42318`, `#fffaeb`, `#93370d`, `#fedf89`, `#b54708`) into theme tokens.
- **Dependencies:** Regression run of `editor`, `entries`, `keyboard`, `a11y`, `zoom`, `layout` suites. No template or PDF changes.
- **Suggested phase:** P2

### HI-05: Public claims are inaccurate today

> **Phase 1 status: resolved in code.** Every row below was corrected (P-1, P-4 to P-7) or verified (`/sign-in`, P-11). See `docs/phase-1-completion-report.md`.

- **Category:** Claims / Copy / Trust
- **Description:** Independent of CR-01, these statements are inaccurate or unverified now:

| Text | Location | Problem | Suggested wording |
|---|---|---|---|
| "Our full terms of service will be published before the resume editor launches." | `src/app/(site)/terms/page.tsx` | False: the editor is live | "Our full terms of service are being prepared. Until then, CVNest is provided as is, free of charge." (lawyer to confirm) |
| "They are not sent to our servers or to any third party" | `src/components/editor/PrivacyNote.tsx` | Partly true: the app sends nothing, but extensions and browser sync can | "We don't send it anywhere. Browser extensions and browser sync are outside our control." |
| "Download a PDF of your resume from time to time so you always have your own copy." | `PrivacyNote.tsx` | A PDF can't be restored into the editor; only a backup can | "Download a backup from time to time. It's the only file you can restore here." |
| "Download a file with all your resumes, and restore it in any browser." | `src/data/copy.ts` (features) | Unverified for Safari | "…and restore it in another browser." |
| "Try Chrome, Edge, Firefox or Safari." | `usePdfExport.tsx:127` | Safari unverified | "Try Chrome, Edge or Firefox on a computer." |
| "You will not need one to create and download your resume." | `src/app/(site)/sign-in/page.tsx` | ~~Contradicts the agreed download gate~~ **Consistent with the Phase 0 policy** | Keep; revisit when optional accounts ship |
| "Every template in the gallery is free to use. None are locked or premium." | `src/data/site.ts` | True today. It constrains future monetization (section 7) | Keep for the 120 existing templates |

- **Evidence:** [C] files listed.
- **User impact:** Trust, and in the case of the PDF-versus-backup advice, potential data loss.
- **Severity:** High
- **Recommended solution:** Apply the wording above. Keep the copy in `src/data/copy.ts`, finishing the "one place for copy" work started in the previous audit, so the CR-01 rewrite touches one file.
- **Dependencies:** None. The `/sign-in` text depends on CR-01.
- **Suggested phase:** P1

### HI-06: Text size, font and color customization are not covered by per-template PDF tests

- **Category:** PDF / Testing
- **Description:** Commit `6942ef3` added per-resume color, six fonts and text size from 80% to 120%. Commit `6acc6df` then changed typography across all templates. The 480-PDF suites (`pdf`, `pdf-firefox`), `pagination`, `pdf-edges` and `bullets` never set `fontScale`, `fontFamily` or `accentColor`. Only `customize.test.mjs` checks that one template's print copy carries the 110% scale, a font and a color. Large text in narrow sidebars, long names in banner headers, and Small text in dense templates are therefore untested in PDF output.
- **Evidence:** [C] searching `pdf.test.mjs`, `pdf-firefox.test.mjs`, `pagination-lib.mjs`, `pdf-edges.test.mjs` and `bullets.test.mjs` for `fontScale|accentColor|fontFamily` finds nothing. [T] `customize` suite. [P] an overflow probe at 80% and 120% across all 120 templates found **no** text overflow in the editor preview (9.3), which lowers the likelihood of defects. Page breaks, Firefox's separate print path and the PDF itself at these sizes remain unverified.
- **User impact:** A user who picks Large or a different font may get clipped or overlapping text, or bad page breaks, in the exported PDF, with no automated signal.
- **Severity:** High
- **Recommended solution:** Extend the pagination or PDF matrix with three extra datasets per template: Small with the long resume, Large with the long resume, and Large with a long name and contact details. Run them in Chrome and Firefox. Include at least one sidebar, banner and labels template per font. Add an assertion that no text box overflows its column at 120%.
- **Dependencies:** None. Adds about 30–40 minutes of test time; run it nightly or before releases.
- **Suggested phase:** P1 (tests), P2 (fixes for anything found)

---

## 5. Findings: Medium

### ME-01: Destructive storage actions without undo: delete resume, restore "Replace", repeated merge

- **Category:** Data safety / UX
- **Description:** Deleting a resume is permanent; the dialog says so. Its photo is deleted from IndexedDB at the same moment (`releasePhoto`). Restore with "Replace all my resumes" removes every current resume with no undo. Restoring the same backup twice with "Add" creates duplicates, because IDs are renewed. Entry deletions, by contrast, have a 10-second undo.
- **Evidence:** [C] `useResumeStore.ts` (`deleteResume`, `restoreResumes`), `ResumeEditor.tsx` (delete and restore dialogs). [A] previous audit 3.2.
- **User impact:** One mis-click can permanently lose a resume or a whole set.
- **Severity:** Medium
- **Recommended solution:** Reuse the existing `UndoToast` for resume delete: keep the resume and photo in memory and delete the photo only when the toast expires. Before "Replace", automatically download, or keep in a `folio.resumes.pre-restore` key, a backup of the current resumes. Detect a resume already present (same name, content and `createdAt`) on merge and offer to skip it.
- **Dependencies:** None
- **Suggested phase:** P1

### ME-02: Very large restores and inline photos may exceed the localStorage quota (untested)

- **Category:** Data safety
- **Description:** Backups may be up to 25 MB (`MAX_BACKUP_BYTES`), and photos arrive inline as data URLs. `restoreResumes` puts them into state and autosave writes them to `localStorage` (typically about 5 MB per origin) before the effect that moves inline photos to IndexedDB strips them. A large restore can therefore fail its first save. The save-error banner and "Download backup" would then appear. This is likely recoverable, but untested.
- **Evidence:** [C] `src/lib/backup.ts`, `useResumeStore.ts` (autosave and inline-photo effects). [T] `safety` simulates a quota error but not a large restore. [A] 3.2.
- **User impact:** Confusing "not saved" state immediately after a restore. Possible loss if the tab is closed.
- **Severity:** Medium
- **Recommended solution:** Move inline photos into IndexedDB **before** the restored resumes enter state. Add a test that restores a backup with 10 photos and about 4 MB of text.
- **Dependencies:** None
- **Suggested phase:** P1

### ME-03: Pressing Ctrl+P or using the browser's Print menu produces a blank page

- **Category:** PDF / UX
- **Description:** `@media print` hides every body child except `.print-root`, which exists only while an export job is running. A user who prints the editor directly gets an empty page.
- **Evidence:** [C] `src/app/globals.css:654` (`body > :not(.print-root) { display: none !important; }`). [P] text visible under print media emulation on `/editor` without an export job (9.3).
- **User impact:** Users who try the familiar shortcut get a blank PDF and may conclude the product is broken.
- **Severity:** Medium
- **Recommended solution:** Intercept `beforeprint` when no job is active and start the normal export: render the print copy synchronously, or show "Use Download PDF". Alternatively keep a print-only copy of the active resume permanently mounted. It already exists as a pattern in `usePdfExport`.
- **Dependencies:** Must not break the existing export path. Re-run the PDF suites.
- **Suggested phase:** P1

### ME-04: Form validation is minimal: email, URL, phone and dates are free text

- **Category:** Editor / Data quality
- **Description:** Email uses `type="email"` and phone uses `type="tel"`, but no validation feedback is shown. LinkedIn, GitHub and website fields accept anything; `safeHref` silently drops invalid links from the PDF. Dates are free text with placeholders in mixed formats ("Mar 2021", "2022", "2022 – Present"). Nothing detects an end date before a start date, or inconsistent date formats within a resume.
- **Evidence:** [C] `src/components/editor/content/ContentTab.tsx` lines 245–441, `src/lib/links.ts`.
- **User impact:** Typos in contact details, the most damaging resume error, go unnoticed. A link that silently isn't clickable in the PDF is confusing. Inconsistent date formats look careless to recruiters.
- **Severity:** Medium
- **Recommended solution:** Gentle, non-blocking inline hints on blur: "This doesn't look like an email address", "This link won't be clickable in your PDF". Optionally use a month and year picker with a "Present" checkbox, stored as text for schema compatibility, plus a consistency hint when formats differ. Never block typing; keep the data model unchanged.
- **Dependencies:** None
- **Suggested phase:** P2

### ME-05: Accessibility: automated results, contrast inside templates, and unverified assistive technology

- **Category:** Accessibility
- **Description:** The project's `a11y` and `keyboard` suites pass [T]. An independent axe-core scan [P] found 0 violations on 10 public routes and on the editor at desktop and phone width. The only violation was on `/`: `color-contrast`, 2 nodes, `#6b7378` at `text-2xs` inside a sample resume. That's down from 15 nodes in the previous audit; Kinetic now passes. Not re-checked: the Customize thumbnails (12 nodes previously) [A]; carousel dots at 24px [A]. New: the preview toolbar buttons are 36px (`h-9`), below the editor's own 40px rule [C: `PreviewPanel.tsx` `toolbarButton`]. Screen readers (VoiceOver, NVDA, TalkBack), voice control and real 200–400% zoom remain untested [A].
- **Evidence:** as stated.
- **User impact:** Low-vision and screen-reader users may hit barriers that automation can't detect. Accessibility law (for example the European Accessibility Act) increasingly applies to consumer web services.
- **Severity:** Medium
- **Recommended solution:** Fix the probe-reported violations. Raise the preview toolbar to 40px. Fix contrast in the resume designs flagged by axe, which needs template-freeze approval; the brief allows design changes only where needed. Run a 1-day manual pass with VoiceOver (macOS and iOS) and NVDA covering the editor's add, edit, reorder, hide, delete, undo, download and restore journeys.
- **Dependencies:** Template changes require PDF regression on all 120.
- **Suggested phase:** P2 (fixes), P4 (assistive-technology verification)

### ME-06: Technical SEO gaps

- **Category:** SEO (technical)
- **Description:**
  1. The 404 page has the home page's title and description ("Free Online Resume Builder | CVNest") [C: `src/app/not-found.tsx` has no metadata] [P].
  2. No structured data anywhere: no `Organization`, `WebSite`, `SoftwareApplication`/`WebApplication`, `BreadcrumbList` or `FAQPage` [C][P].
  3. The sitemap has no `lastmod` [C: `src/app/sitemap.ts`] [P].
  4. `/contact`, `/privacy` and `/terms` set no `openGraph`, so they have no `og:url` and inherit the generic title [C].
  5. Meta descriptions for `/privacy` ("Privacy Policy for CVNest."), `/terms` and `/contact` are thin [C].
  6. At launch (indexable), `robots.txt` will both `Disallow` `/editor` and `/sign-in` and mark them `noindex`. Crawlers can't see the `noindex` on a disallowed URL, so externally linked editor URLs can still be indexed as URL-only results [C: `src/app/robots.ts`].
  7. `/templates?category=…` links (from every template page) canonicalize to `/templates`. Category intent ("photo resume templates", "academic CV templates") has no indexable landing page (see ME-10).
  8. The footer copyright year is computed at build time, so it freezes until the next deploy [C: `SiteFooter.tsx`].
- **Evidence:** as listed.
- **User impact:** Lower click-through and weaker rich results; an untidy 404 in search results.
- **Severity:** Medium
- **Recommended solution:** Add `metadata` to `not-found.tsx`. Add a JSON-LD component with `WebSite`, `Organization` and `WebApplication` (`offers.price: 0`) on home, `BreadcrumbList` on template pages, and `FAQPage` only if the FAQ stays visible. Add `lastModified` from build time or the template's last change. Add `openGraph` to the remaining pages, and real descriptions once legal text exists. At launch, drop the `Disallow` for `/editor` and rely on `noindex`, or keep it and accept URL-only results.
- **Dependencies:** CR-03 (canonical domain) before indexing.
- **Suggested phase:** P1 (items 1–5, 8), P4 (item 6 at launch), P5 (item 7)

### ME-07: Thin and duplicated template-page content, and no content targeting search intent

- **Category:** SEO (content)
- **Description:** The 120 template pages are the largest indexable surface. Each has a unique description of 63–118 characters (median 98) and a "Best for" line of 31–65 characters (median 49) [P]. Every other element is shared: the layout and the sample resume, since many templates reuse the same sample persona. That's thin, near-duplicate content at scale. There are no category landing pages, no guides (how to write a resume, resume formats, ATS explained), no job-specific examples, and the H1 on the home page ("Your story, clearly told") doesn't contain the primary keyword. The product's core differentiators (free, no watermark, private, ATS-friendly) aren't expressed as search-intent pages.
- **Evidence:** [P] description and `bestFor` lengths from `src/data/templates.ts`. [C] `src/app/(site)/templates/[slug]/page.tsx`, `src/components/home/Hero.tsx`.
- **User impact:** Weak organic acquisition. Google may index only some template pages, or rank none.
- **Severity:** Medium
- **Recommended solution:** (P5) Per template, add about 150–300 words of genuinely unique guidance: when to use it, layout and ATS notes from HI-03, page-length behavior, photo guidance, and the font pairing. Add 10 category landing pages (`/templates/category/photo` or similar) with their own copy. Add a small set of evergreen guides: ATS-friendly resume, resume vs CV, resume format by country (including A4 vs Letter), and how to save a resume as PDF on iPhone. Consider job-title example pages only if each can carry unique content. Keep the H1 human, but include "free resume builder" in it or directly under it.
- **Dependencies:** HI-03 (ATS facts) before ATS content.
- **Suggested phase:** P5

### ME-08: Performance: unused font preloads, framework JavaScript on static pages, heavy DOM in the gallery and Customize tab

- **Category:** Performance
- **Description:**
  1. Every page preloads three fonts: Plus Jakarta Sans (26 KB), Inter (47 KB) and Source Serif 4 (49 KB). Inter and Source Serif are used only inside resume previews, so pages like `/privacy`, `/terms`, `/contact` and `/about` download about 96 KB of fonts they never use [P: preload links in built HTML, file sizes].
  2. Static text pages ship about 139 KB gzipped of modern JavaScript (React, Next runtime, `SiteHeader` as a client component), plus a 110 KB legacy polyfill loaded only by `nomodule` browsers. The editor ships about 219 KB gzipped, including a 34 KB gzipped template-registry chunk [P].
  3. The template gallery renders a live React resume for every thumbnail as it scrolls into view and never unmounts them. The Customize tab with "All" selected renders 120 live thumbnails of the user's own resume; `content-visibility: auto` helps paint, but not DOM size or memory [C]. Measured DOM and heap in 9.3 [P].
  4. The home page HTML is 578 KB raw and 55 KB gzipped, because sample resumes are server-rendered into the carousel [P].
  5. `/editor` is dynamically server-rendered on every request, only to output a loading state, because it reads `searchParams` server-side. That means one Worker invocation per editor visit, and no CDN HTML cache [P: build output `ƒ /editor`]. It also contradicts `docs/deploy-cloudflare.md` ("Every page is prerendered").
  6. The previous audit measured mobile LCP at 2.6–3.4 s in simulated Lighthouse [A]. Lighthouse isn't installed and wasn't run here.
- **User impact:** Slower first visits on mobile, wasted data on metered connections, and possible jank or memory pressure on low-end phones in the gallery and Customize tab.
- **Severity:** Medium
- **Recommended solution:** Set `preload: false` on Inter and Source Serif in `src/app/layout.tsx`; preload them only where a resume is above the fold, if at all. Make `/editor` static by reading `?template=` on the client, where `useResumeStore` already strips it, and remove the `await searchParams`. Virtualize or unmount off-screen thumbnails in the gallery and Customize, or render thumbnails as cached static images at build time for the gallery, where the content is sample data. Consider making `SiteHeader` a server component with a small client island for the mobile menu. Re-run Lighthouse on the production host.
- **Dependencies:** Re-run the `templates`, `zoom`, `layout` and `template-picker` suites.
- **Suggested phase:** P5. The `/editor` static change can be P1, since it also reduces Worker usage (ME-11).

### ME-09: Security hardening: CSP allows inline scripts; production dependency tree has known vulnerabilities

- **Category:** Security
- **Description:**
  1. CSP is in place, but `script-src 'self' 'unsafe-inline'` means the CSP gives no protection against injected inline scripts. That's acceptable today: React escapes all user text, no `dangerouslySetInnerHTML` exists, and the previous audit's XSS payloads rendered as text [C][A]. It becomes more important once authenticated sessions exist (CR-01).
  2. `npm audit --omit=dev` reports **5 vulnerabilities (4 high, 1 moderate)**: `glob` (command injection in its CLI), `minimatch` (ReDoS), `@node-minify/core`, `@opennextjs/aws` and `@opennextjs/cloudflare`. They arrive through `@opennextjs/cloudflare`, which is listed in `dependencies` [P]. They're build-time tools: the vulnerable CLI and pattern-matching code isn't part of the Worker request path, so real risk to visitors is low. They will still appear in any supply-chain scan. The full tree has 29 (16 moderate, 13 high), mostly dev tooling (`puppeteer-core`, `eslint`, `wrangler`) [P].
  3. `X-Powered-By: Next.js` is still sent on HTML responses [P]; `poweredByHeader: false` isn't set in `next.config.ts` [C].
  4. HSTS lacks `includeSubDomains` and `preload`; this is to be decided with the domain [D].
- **User impact:** Low today. Higher once accounts exist.
- **Severity:** Medium
- **Recommended solution:** Set `poweredByHeader: false`. Track the OpenNext upstream fix and upgrade `@opennextjs/cloudflare` and `wrangler` together, as the deploy doc requires. Consider moving `@opennextjs/cloudflare` to `devDependencies` if the build allows it. Before accounts launch, evaluate nonce-based CSP for authenticated routes only, rendered on demand, while public pages stay static. Add `includeSubDomains` once the domain is final.
- **Dependencies:** CR-03 (HSTS), CR-01 (CSP for authenticated routes).
- **Suggested phase:** P1 (header, dependency tracking), P3 (CSP for auth routes)

### ME-10: Operations: no error reporting, monitoring or feedback channel; Workers Free request cap

- **Category:** Operations
- **Description:** Errors are logged only to the user's console (`src/app/editor/error.tsx`). There's no uptime check, no privacy-preserving error reporting and no in-product way to report a problem; Contact is a placeholder. The Workers Free plan allows 100,000 requests per day shared across both Workers [D]. Every HTML page view, including each `/editor` render (ME-08), is a Worker request.
- **Evidence:** [C][D] as listed.
- **User impact:** Failures in the field, such as a Safari PDF bug or a quota error, go unseen. A traffic spike could exhaust the daily request allowance and take the site down until the next UTC day.
- **Severity:** Medium
- **Recommended solution:** Add a contact or report channel (email address or simple form). Set up an external uptime check on the production URL that sends no user data. Either budget for Workers Paid before a public launch push, or confirm the expected traffic is well below the cap. If error reporting is wanted, use a first-party endpoint that receives only the error message and stack, never resume content. Disclose it in the privacy policy.
- **Dependencies:** CR-02 (policy disclosure).
- **Suggested phase:** P4

### ME-11: Test-process gaps

- **Category:** Testing / Process
- **Description:** No CI runs the tests. Workers Builds deploys preview on every push to `main` without running `verify` or any browser suite [D]. Edge isn't installed on the audit machine, so the Edge results in the previous audit couldn't be repeated. Firefox runs only `pdf-firefox`, `pdf-firefox-blank`, `zoom-firefox` and the Firefox parts of `bullets` and `pagination`. The keyboard flow is Chromium-only. `pagination-matrix.mjs`, `pagination-max.mjs` and `typing-latency.mjs` aren't in the runner. Several suites use fixed `sleep` delays, which are timing-sensitive [A]. There's no WebKit run.
- **Evidence:** [C] `tests/e2e/run.mjs` (runs `*.test.mjs` only), `tests/e2e/helpers.mjs` (`sleep`). [D] `docs/deploy-cloudflare.md` (Workers Builds settings).
- **User impact:** Indirect. Regressions can reach the preview URL, and later production, unnoticed.
- **Severity:** Medium
- **Recommended solution:** Make the preview build command run `npm run verify` before `build:preview`, or add a GitHub Actions workflow with typecheck, lint, unit, build, and a fast browser subset (`a11y`, `editor`, `entries`, `safety`, `data-model`, `count`, `layout`). Run the PDF matrix nightly or before each production release. Add a WebKit preview-render smoke suite. Replace fixed sleeps with condition waits over time.
- **Dependencies:** None
- **Suggested phase:** P1 (CI gate), P5 (test hardening)

### ME-12: The "one place for copy" work is incomplete, so the accounts rewrite is error-prone

- **Category:** Maintainability / Copy
- **Description:** Home copy lives in `src/data/copy.ts` with `// ACCOUNTS` markers. Account- and storage-dependent wording also lives, unmarked, in `src/data/site.ts` (`siteDescription`, `freeFeatures`), `/about`, `/free`, `/privacy`, `/sign-in`, `PrivacyNote.tsx`, `EditorTopBar.tsx` (`STORAGE_NOTE`), `PhotoField.tsx` ("stays in this browser"), the `src/app/editor/page.tsx` metadata and `README.md`.
- **Evidence:** [C][A] previous audit 3.11.
- **User impact:** Indirect. Missed strings will contradict the new account flow (CR-01).
- **Severity:** Medium
- **Recommended solution:** Before P3, move every storage- or account-dependent string into `copy.ts` with the marker, and add a unit test that fails if "no account" or "never uploaded" phrases appear outside `copy.ts`.
- **Dependencies:** None
- **Suggested phase:** P1

### ME-13: Two-column, sidebar, labels and timeline layouts can scramble reading order in extracted text

- **Category:** PDF / ATS
- **Description:** Text extraction of `kinetic` (timeline) placed dates and labels and content in separate runs [A]. Sidebar and column layouts render side content before or after the main column depending on DOM order, and Firefox uses `asideFirst` [C: `usePdfExport.tsx`]. `ORDER_NOTE` warns only about section order, not parsing.
- **Evidence:** [A] previous audit 3.3. [C].
- **User impact:** Parsed applications may misplace dates, titles or contact details.
- **Severity:** Medium (part of HI-03, kept separate because it may need engine changes)
- **Recommended solution:** Covered by the HI-03 harness. Where results are poor, consider DOM order (main content first, visually repositioned with CSS grid areas) for templates whose sidebar holds only skills and languages. This needs a template-freeze exception and full regression.
- **Dependencies:** HI-03 harness.
- **Suggested phase:** P4–P5

### ME-14: The editor fails silently on browsers older than the supported baseline

- **Category:** Compatibility
- **Description:** `LinkText.tsx` uses a regular-expression lookbehind (`(?<=…)`), which Safari supports from 16.4. In an older engine the regex literal is a syntax error that stops the whole editor chunk from parsing, and the user sees "Loading your resumes…" indefinitely. Next.js 16's default target is also Safari 16.4+, so this matches the framework baseline. The issue is the silent failure, not the choice of baseline.
- **Evidence:** [P] lookbehind found in the editor chunk (`.next/static/chunks/1bsu5pn4oi94g.js`), referenced only by the editor manifest. [C] `src/components/resume/LinkText.tsx:9`.
- **User impact:** Users on iOS 16.3 or earlier get a permanently loading editor with no explanation.
- **Severity:** Medium (small audience, total failure)
- **Recommended solution:** Add a timeout fallback to the loading state ("This is taking longer than expected. Your browser may be out of date."). Optionally rewrite the regex without lookbehind. State the supported browsers in the FAQ.
- **Dependencies:** None
- **Suggested phase:** P1

### ME-15: Documentation drift

- **Category:** Documentation
- **Description:** `docs/deploy-cloudflare.md` says every page is prerendered; `/editor` isn't (ME-08). `README.md` "Known limitations" says the favicon and Open Graph image "still need to be completed"; both exist (`src/app/icon.svg`, `apple-icon.png`, `opengraph-image.tsx`). `README.md` and `docs/accounts-plan.md` describe the download flow inconsistently (CR-01). `docs/audit-final.md` is partially superseded by this report.
- **Evidence:** [C][D]
- **User impact:** Indirect. Future work starts from wrong assumptions.
- **Severity:** Medium
- **Recommended solution:** Update both docs when the related fixes land. Add a note at the top of `audit-final.md` pointing to this report.
- **Dependencies:** CR-01, ME-08
- **Suggested phase:** P1

---

## 6. Findings: Low

| ID | Category | Description | Evidence | User impact | Recommended solution | Dependencies | Phase |
|---|---|---|---|---|---|---|---|
| LO-01 | UX / Customize | The text-size presets are labelled Small / **Medium** / Large. The product brief calls the middle option "Default", and 100% is the template's own sizing. | [C] `StyleControls.tsx` `sizes` | Minor label ambiguity | Rename "Medium" to "Default" (no data change) | None | P2 |
| LO-02 | UX / Copy | Inconsistent punctuation and casing: footer "What’s Free" (curly, title case) vs page title "What's free" (straight, sentence case); em dashes in related-template links ("Kinetic — Timeline"). | [C] `site.ts`, `free/page.tsx`, `templates/[slug]/page.tsx` | Polish | Pick one style in `copy.ts` | None | P1 |
| LO-03 | Data | `folio.open-sections` keeps entries for deleted resumes. They hold only IDs and are ignored. | [A] 3.1 | None visible | Prune on delete | None | P5 |
| LO-04 | Code | `featuredTemplateSlugs` is exported and unused. | [C] `templates.ts:2794` | None | Remove | None | P5 |
| LO-05 | Code | 23 exports are used only in their own file. | [A] | None | Optional tidy-up | None | P5 |
| LO-06 | Code | `ResumeEditor.tsx` is 666 lines; the 3 hand-written templates duplicate engine behavior and need special cases (Modern's sidebar in `PrintLayers`). | [C] | None direct | Split after launch; consider porting the hand-written templates to the engine, with pixel-diff regression | Template freeze | P5 |
| LO-07 | Code | Three accepted `<img>` lint warnings (blob URLs; `next/image` isn't suitable). | [T] lint | None | Add an inline eslint-disable with the reason | None | P5 |
| LO-08 | Tooling | No `engines` field or `.nvmrc`; README says Node 20.9+. Audit ran on Node 22.22.1. | [C] | Contributor confusion | Add `engines` and `.nvmrc` | None | P1 |
| LO-09 | Tooling | Major versions behind: `eslint`, `typescript`, `puppeteer-core`, `@types/node`. | [A] | None now | Upgrade after launch, one at a time | None | P5 |
| LO-10 | Repository | GitHub default branch is `redesign-ui`, while all development and deploys use `main`. Local-only `staging` branch exists. An empty, ignored `fields-problems.txt` is in the root. | [C] `git remote show`, `git branch -a` | Contributor confusion; PRs target the wrong branch | Set the default branch to `main` (owner action in GitHub) | None | P1 |
| LO-11 | PDF | An unbroken string with no separators (for example a 60-character token) still breaks mid-word. | [A] 9.5 | Rare cosmetic | Accept, or add `overflow-wrap: anywhere` as a last resort | Template regression | P5 |
| LO-12 | PDF | Sparse last pages on long resumes in `obsidian`, `plainview` and `almanac`; eight templates look emptiest with short content. Not re-measured since the typography change. | [A] 3.3 | Cosmetic | The existing "few lines" hint covers this; optionally tighten later | Template freeze | P5 |
| LO-13 | Templates | The closest structural pair, `frame` and `scholar` (distance 0.17), could be restyled to stand apart. | [A] 3.13 | Gallery variety | Visual review; restyle needs approval | Template freeze | P5 |
| LO-14 | Accessibility | Carousel dots are 24px. Links inside sentences are exempt by WCAG but still small on touch. | [A] 9.5 | Minor | Enlarge the dot hit area to 40px | None | P2 |
| LO-15 | UX | The Firefox custom template dropdown and the native picker's open state on touch devices weren't verified. | [A] 9.5 | Unknown | Include in the P4 device pass | Devices | P4 |
| LO-16 | Data / UX | Cross-tab editing is last-write-wins. A warning is shown when the same resume is open in two tabs. | [C] `useOtherTabs.ts`, `useResumeStore.ts` | Possible overwrite | Accepted; keep the warning | None | — |
| LO-17 | Legal | `LICENSES.md` lists items for the owner to verify (font provenance, reserved font names). | [A] | Legal hygiene | Owner verification; lawyer if unsure | None | P4 |
| LO-18 | UX | The `/sign-in` route is public but unlinked. Its message will be wrong once CR-01 ships. | [C] | Confusion if found | Replace with the real sign-in in P3 | CR-01 | P3 |

---

## 7. Improvement opportunities

### 7.1 Product and UX

| ID | Opportunity | Why it fits | Effort | Dependencies | Phase |
|---|---|---|---|---|---|
| IM-01 | Gallery and Customize filters: layout (single, two-column, sidebar), photo (yes or no), length (one page, dense), plus an "ATS-safe" badge | The data already exists (`templateStructure`, `photo`). Directly serves the ATS positioning. | S–M | HI-03 harness for the badge | P5 |
| IM-02 | Persistent "Last backup" indicator, a "Backup now" shortcut, and a gentle re-reminder after N edits | Strongest guest data-loss mitigation | S | HI-01 | P1 |
| IM-03 | Local import from PDF or DOCX, parsed in the browser | Switching users have existing resumes; keeps the privacy position | L | None | P5 |
| IM-04 | Cover letter builder sharing profile, fonts and colors | Common need; the same print pipeline | L | PDF regression | P5 |
| IM-05 | Local keyword checker (paste a job description, highlight missing keywords) | High value, no upload. Must not be presented as an "ATS score". | M | None | P5 |
| IM-06 | Plain-text and DOCX export | Some employers require Word; plain text is the ultimate ATS fallback | M–L | None | P5 (could be premium; see section 7.3) |
| IM-07 | "Fit to one page" helper (suggest a text size or spacing) | Frequent need; text-size controls already exist | M | HI-06 tests | P5 |
| IM-08 | Installable web app (PWA) with offline editing | Offline use. Home-screen web apps on iOS aren't subject to Safari's 7-day storage cap. | M | Service-worker caching risk | P5 |
| IM-09 | General undo and redo for content edits | Only deletions are undoable today | M | None | P5 |
| IM-10 | Interface language and right-to-left support | Global audience; A4 users | L | None | Later |
| IM-11 | Per-platform "How to save your PDF" help | Reduces support load and failed exports | S | HI-02 device results | P4 |
| IM-12 | Load timeout and unsupported-browser message in the editor | Avoids silent failure | S | ME-14 | P1 |

### 7.2 SEO content opportunities

These are separate from the technical problems in ME-06:

| ID | Opportunity | Search intent served |
|---|---|---|
| IM-13 | Category landing pages (10) with unique copy | "photo resume template", "academic CV template", "executive resume template" |
| IM-14 | Unique 150–300-word guidance per template page | Long-tail template queries; reduces thin-content risk |
| IM-15 | Guides: ATS-friendly resume, resume vs CV, A4 vs Letter, saving a resume as PDF on iPhone and Android | Informational queries that lead into the product |
| IM-16 | "Free resume builder, no watermark, no sign-up to start" positioning page; under the Phase 0 policy it can truthfully say "free PDF downloads, no account needed" | High-intent commercial queries; must stay truthful |
| IM-17 | Job-title example resumes, only where each page has unique content | Large long-tail volume; risky if thin |

### 7.3 Monetization readiness (freemium)

**Current readiness: not ready. The prerequisites are missing, but the product is well structured for a respectful freemium model.**

| Area | Assessment |
|---|---|
| Free resume creation | Fully in place and must stay free (requirement). |
| Free ATS-friendly templates | All 120 are free, and public copy says "None are locked or premium" (`src/data/site.ts`). Requirement: all 120 stay free. **Premium templates can only be new templates**, added on top of the free 120. "ATS-friendly" must first be verified (HI-03), and the verified set must stay free. |
| Premium template possibilities | Technically easy: add a `tier` field to new templates. Enforcement is weak: template designs ship in the client bundle (34 KB registry chunk) and rendering and PDF are client-side, so a determined user can use any template locally. Options: (a) accept soft gating, which is honest and cheap; (b) load premium designs only after an entitlement check, which is still extractable once loaded; (c) server-side PDF for premium, which costs money and sends content to a server, breaking the privacy promise. **Recommendation: (a) or (b).** |
| Premium feature candidates (no harm to the free journey) | Cover letters (IM-04), DOCX export (IM-06), local keyword checker (IM-05), extra resume versions per account beyond a generous free limit, priority support. *(Phase 0: accounts are optional and never required to download. Whether basic cloud backup and sync are free or paid is still undecided; owner decision.)* |
| Account and subscription flow | Doesn't exist. Depends on CR-01. The accounts plan (Supabase recommended) covers auth, database and storage, but not entitlements. |
| Payment integration readiness | Not ready. Needs: a server endpoint for webhooks (Workers route handler); an entitlements table; a merchant-of-record or payment provider decision (sales tax and VAT handling); refund and cancellation terms; CSP updates (`connect-src`, `frame-src`, `form-action`) for checkout; privacy policy updates; and a decision on how "free" wording changes ("no paid plan" on `/free` becomes false the day a paid plan exists). |
| Conversion points | *(Phase 0: there is no download gate.)* (1) Optional account for cloud backup and sync, offered beside the backup reminder and once after a successful PDF, dismissible. (2) After a first successful PDF: offer premium features, once, dismissible. (3) Inside Customize, on premium-only new templates, clearly marked. (4) Cover letter or DOCX entry points. Never interrupt editing or block the free PDF. |
| Friction in the free journey | *(Phase 0: the download gate is withdrawn, which removes the largest friction point. The free journey has no required sign-in.)* Original note: the account-at-download gate is the largest friction point in the whole product. Measure it, which needs privacy-respecting first-party analytics (decision needed; the product currently has none, by design). Minimize it: magic link plus one social provider, return to the same resume, and auto-continue the PDF. |
| Measurement | No analytics exist (a deliberate privacy choice). To evaluate conversion, decide on cookieless, first-party counts (for example a Workers endpoint counting events with no identifiers) and disclose them. Third-party analytics would break the current CSP and privacy position. |

| ID | Monetization finding | Severity | Phase |
|---|---|---|---|
| MO-01 | Public "free" claims (`/free`: "no subscription, no paid plan"; `site.ts`: "None are locked or premium") must be rewritten carefully before any paid offering. Keep "all 120 templates free forever" as a commitment. | Improvement (becomes High when a paid plan is planned) | P6 |
| MO-02 | Entitlements model and server endpoints don't exist | Improvement | P6 (after P3) |
| MO-03 | Client-side rendering means premium gating is soft. Decide explicitly. *(Phase 0: no server-side PDF generation; any future premium gating applies only to new paid templates and features, never to downloads or the 120 existing templates. Soft vs hard enforcement for premium features is still undecided.)* | Improvement | P6 |
| MO-04 | No conversion measurement | Improvement | P6 |

---

## 8. Reconciliation with `docs/audit-final.md`

Every item from the previous audit's sections 1–9 that was open or partial is listed, with its status as of this audit. "Resolved" means verified in code or by a test in this run. Items marked resolved in that audit's own Phase 1 (section 9.1) are included for completeness.

### 8.1 Resolved since the previous audit

| Previous item | Evidence of resolution |
|---|---|
| No source backup off the machine (risk register, Phase 0) | [C] `origin` is `github.com/adil-ramzan/cvnest`; local `main` equals `origin/main` (0 ahead, 0 behind) |
| Security headers missing (2, 3.9, Phase 2) | [C] `next.config.ts` sets CSP, XCTO, XFO, Referrer-Policy, Permissions-Policy and HSTS (on HTTPS). [P] present on responses (9.3). **Still to verify on the real host.** |
| `SITE_URL` not a separate constant; placeholder base URL | [C] `NEXT_PUBLIC_SITE_URL` per environment (`site.ts`, `package.json`) |
| No hosting or deploy plan (4d, 7.2) | [D] `docs/deploy-cloudflare.md`; preview and production Workers |
| `entries` test failure, `_previous` lint warning (3.1, Phase 1) | [T] `entries` passes; [T] lint shows only the 3 `<img>` warnings |
| Multiple H1s (3.5, 3.8) | [T] `a11y`: "Every page has exactly one h1". [P] built HTML has one `<h1>` on home, gallery, template page and 404. |
| Editor axe findings, placeholder contrast, touch targets (3.5) | [T] `a11y`; [C] `--color-placeholder: #676e7a` |
| Page-count label off by one in 33% of long cases (3.4) | [C] real pagination (`paginate.ts`); [T] `pagination`: "Preview page count matches the PDF in at least 97% of cases" (9.2) |
| No colors, fonts or spacing customization (7.2) | [C] `StyleControls.tsx`; [T] `customize` |
| Firefox blank page and page-edge issues | [T] `pdf-firefox-blank`, `pdf-edges` |
| README naming an unconfirmed domain | [C] Resolved differently: Phase 0 decided `getcvnest.com` as the intended domain, and the README now names it as intended and not yet configured |
| Restore last open section | [T] `open-section` |
| Chrome `pdf`, `safety`, `template-picker`, `templates`, `zoom` and Firefox `zoom-firefox` not finished on the final build (9.3) | [T] all run in this audit (9.2) |

### 8.2 Still outstanding, mapped to this report

| Previous item (section) | Status | New ID |
|---|---|---|
| Legal drafts, contact address, holding pages (2, 3.11, 4b–c, 5, 7.1) | Outstanding | CR-02 |
| Final brand, domain, trademark (3.11, 4c, 5) | Outstanding | CR-03 |
| Accounts and sync (7.2, 8 "later") | Outstanding, now a launch requirement | CR-01 |
| Safari storage eviction (3.2, 7.1) | Outstanding | HI-01 |
| Backup depends on habit; stronger reminder (5, 7.1) | Outstanding | HI-01, IM-02 |
| PDF on phones and Safari untested (4e, 5, 7.1, 7.2, 9.5) | Outstanding; the FAQ disclosure was removed | HI-02 |
| Real print dialogs untested; browser margins and headers settings can alter output (4, 7.1) | Outstanding | HI-02 |
| Firefox thin strips on colored sidebars (7.1) | Disclosure removed with the FAQ entry | HI-02 |
| Two-column reading order; "single-column is safer" disclosure (3.3, 7.1, "things users should be told") | Outstanding; disclosure removed | HI-03, ME-13 |
| `ats` search tag implies a claim (3.10, 8 quick wins) | Outstanding | HI-03 |
| Real ATS parsers untested (4) | Outstanding | HI-03 |
| Only 2 of 120 PDFs read by hand (3.3) | Outstanding | HI-03 (harness) |
| "Not sent to any third party" (3.10) | Outstanding | HI-05 |
| "Restore it in any browser" (3.10) | Outstanding | HI-05 |
| "Try Chrome, Edge, Firefox or Safari" (3.10) | Outstanding | HI-05 |
| `/sign-in` "accounts planned" promise (3.10) | Changed: counted as contradicting the gate in the original audit. **Phase 0: consistent with the approved policy** (optional accounts, no account needed to download); revisit when accounts ship | CR-01, LO-18 |
| Terms "before the editor launches" FALSE (3.10) | Outstanding | CR-02, HI-05 |
| `PrivacyNote` recommends a PDF, not a backup (3.11, 8) | Outstanding | HI-05 |
| "Good to know" editor note (2, 4a, 8) | Outstanding; only the home FAQ uses the title | HI-01, HI-02 (content of the note) |
| Privacy wording line about extensions and sync (2, 3.10, 7.1) | Outstanding | HI-05 |
| "Private windows forget your work" message (7.1, things to tell users) | Partly: `PrivacyDetails` mentions private windows; not in an editor note or FAQ | HI-01 |
| "Restoring with Replace removes the resumes currently here" (things to tell users) | Resolved in the dialog ("Removes the N in this browser") | — |
| Restore Replace has no undo; merge duplicates (3.2, 7.1) | Outstanding | ME-01 |
| Large restore exceeding localStorage (3.2, 7.1, 8) | Outstanding | ME-02 |
| 404 uses the home title (2, 3.8) | Outstanding | ME-06 |
| No `lastModified` (2, 3.8) | Outstanding | ME-06 |
| No structured data (2, 3.8) | Outstanding | ME-06 |
| `og:url` missing on contact, privacy, terms (3.8) | Outstanding | ME-06 |
| Thin privacy and terms descriptions (3.8) | Outstanding | ME-06 |
| `noindex` plus `Disallow` (3.8) | Resolved while non-indexable; returns at launch | ME-06 |
| Template pages thin-content risk (3.8) | Outstanding | ME-07 |
| Resume-template contrast (3.5, 9.5) | Outstanding | ME-05 |
| Screen readers untested; drag on touch untested (3.5, 7.1) | Outstanding | ME-05 |
| Mobile LCP fair (3.7); low-end phones untested (7.2) | Not re-measured | ME-08 |
| `X-Powered-By` exposed (3.9, 8) | Outstanding (still sent, 9.3) | ME-09 |
| No error reporting (7.1) | Outstanding | ME-10 |
| CI cancelled (2) | Outstanding; Workers Builds deploys without tests | ME-11 |
| Fixed sleeps; keyboard flow Chromium-only; Firefox only two suites (3.12) | Partly: more Firefox coverage (`pdf-firefox-blank`, Firefox parts of `bullets` and `pagination`) | ME-11 |
| All Edge suites not run on the final build (9.3) | Not runnable here (Edge not installed) | ME-11 |
| One-place copy file partial (2, 3.11) | Outstanding | ME-12 |
| Copy that changes with accounts, unmarked (3.11) | Outstanding | ME-12 |
| Straight vs curly apostrophes; "What's Free" vs "What's free"; em dashes (3.11) | Outstanding | LO-02 |
| `folio.open-sections` stale entries (3.1) | Outstanding | LO-03 |
| `featuredTemplateSlugs` dead (1, 8) | Outstanding | LO-04 |
| 23 single-file exports (1) | Outstanding | LO-05 |
| Hand-written templates duplicate the engine; Modern special case (1) | Outstanding | LO-06 |
| `ResumeEditor.tsx` size (3.12) | Outstanding (now 666 lines) | LO-06 |
| `<img>` warnings (3.12) | Accepted | LO-07 |
| No `engines` or `.nvmrc` (3.12) | Outstanding | LO-08 |
| Outdated major versions (3.12) | Outstanding | LO-09 |
| Long unbroken URL breaks mid-word (9.5) | Outstanding | LO-11 |
| Sparse last pages; short-content empty look (3.3, 3.13) | Not re-measured | LO-12 |
| `frame` ~ `scholar` restyle (3.13) | Outstanding | LO-13 |
| Carousel dots 24px (9.5) | Outstanding | LO-14 |
| Firefox custom dropdown; native picker on touch (9.5) | Outstanding | LO-15 |
| Cross-tab last write wins (README) | Accepted | LO-16 |
| `LICENSES.md` items to verify; font rights (2, 5, 4c) | Outstanding | LO-17 |
| Undo covers only deletions (2, 7.2) | Outstanding | IM-09 |
| No rich text; no PDF, DOCX or LinkedIn import; no DOCX or TXT export; no cover letters (7.2) | Outstanding (features) | IM-03, IM-04, IM-06 |
| English only, no RTL (7.2) | Outstanding | IM-10 |
| Validation light (7.2) | Outstanding | ME-04 |
| HEIC photos refused (7.2, 8) | Outstanding: the message lists JPG, PNG and WebP but doesn't mention HEIC or how to convert | ME-04 (add a HEIC hint) |
| Spell check left to the browser (7.2) | Accepted | — |
| No analytics (7.2) | Accepted by design; relevant to MO-04 | MO-04 |
| Browser data not encrypted (3.9, 7.1) | Accepted and disclosed | — |
| Keyword checker, accent choices passing contrast, one-page density, layout filters, onboarding, shortcuts, dark mode, JSON export polish, print guide, offline mode, tailoring helper (8, "strengthen") | Accent choices done (`readableOn` keeps 4.5:1). Others are carried as improvements | IM-01, IM-05, IM-07, IM-08, IM-11 |
| "Do not do" list (8): no templates before launch, no third-party analytics, no ATS score, no `folio` key rename, no major upgrades, no editor split before launch | Still valid; adopted in section 11 | — |
| Real-device and assistive-technology checklist (6, definition of complete) | Outstanding | P4 |
| Template maintenance cost: 3 browsers × 120 templates (5) | Still true; grows with HI-06 | ME-11 |

---

## 9. Testing performed

### 9.1 Environment

- Linux, Node.js v22.22.1, Google Chrome (`/usr/bin/google-chrome`), Firefox with `geckodriver`, Poppler (`pdfinfo`, `pdftotext`, `pdffonts`, `pdfimages`).
- Not available: Microsoft Edge, Safari or WebKit, physical phones, screen readers, Lighthouse.
- Production build with `npm run build` (`NEXT_PUBLIC_SITE_URL` unset, so it's `http://localhost:3000`; `NEXT_PUBLIC_INDEXABLE` unset, so the site isn't indexable). Generated files written: `.next/`, `.test-build/`, `.e2e-output/`, all git-ignored.

### 9.2 Project checks (automated) [T]

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | **Pass** (0 errors) |
| ESLint | `npm run lint` | **Pass**: 0 errors, 3 warnings (`no-img-element` in `PhotoField.tsx:103`, `ProfileCard.tsx:40`, `DesignTemplate.tsx:571`) |
| Unit tests | `npm run test:unit` | **Pass**: 220 tests in 26 suites, 0 failed, 0 skipped |
| Production build | `npm run build` | **Pass**: 138 static pages generated; `/editor` dynamic |
| Browser suites | `npm run test:e2e` | **Pass**: all 25 suites; 448 PASS lines, 0 FAIL, 0 SKIP |

Browser suite detail (Chrome unless noted; Firefox via `geckodriver`):

| Suite | Time | Notable results |
|---|---|---|
| `a11y` | 46 s | One H1 per page, unique IDs, labelled previews, dialog focus, long email and URL wrapping, 40px touch targets on a phone, no page errors |
| `bullets` | 176 s | All 120 templates: pasted bullets keep their text, with no leftover markers, preview equal to PDF; Firefox spot check on 7 layouts |
| `count` | 12 s | Template count and the 110+ label |
| `customize` | 17 s | Color, font and text size apply live, persist across reload, reach the print copy (one template), reset |
| `data-model` | 45 s | Multiple resumes, custom sections, hide and show, migration |
| `editor` | 17 s | Core editor interactions |
| `entries` | 29 s | Add, edit, reorder, hide and delete entries, with undo |
| `error-boundaries` | 8 s | Site, editor and global error screens |
| `fields` | 71 s | Field behavior and limits |
| `guard` | 27 s | Unsaved-changes guard |
| `keyboard` | 21 s | Keyboard-only flows |
| `layout` | 64 s | No horizontal overflow at phone to desktop widths |
| `links` | 7 s | Link schemes and targets |
| `open-section` | 17 s | Restoring the last open section |
| `pagination` | 509 s | Preview page count matched the PDF in **225 of 225** compared cases (0 differ); margins and gaps consistent; Firefox has no pagination problems on any layout |
| `pdf-edges` | 230 s | Page-edge stripes and frames on every page; intended lengths |
| `pdf-firefox-blank` | 29 s | No blank trailing page in Firefox |
| `pdf-firefox` | 816 s | **480 PDFs** (120 templates × 4 datasets) pass size, text, font, bounds, spacing and image checks; non-final pages at least 59% full |
| `pdf` | 237 s | **480 PDFs** pass size, text, bounds, blank-page and image checks; non-final pages at least 82% full; no page errors; **no resume content in network requests** |
| `safety` | 40 s | Autosave, quota-error banner with backup, oversized content kept, backup round trip, invalid and newer files refused |
| `sample` | 20 s | Sample data load, tags, review and clear |
| `template-picker` | 8 s | Dropdown keyboard control |
| `templates` | 31 s | Gallery, categories, search, preview modal |
| `zoom-firefox` | 12 s | Zoom and sticky preview in Firefox |
| `zoom` | 28 s | Zoom, landscape, focus and sticky preview |

Not run: Edge, which isn't installed, and the manual scripts `pagination-matrix.mjs`, `pagination-max.mjs`, `typing-latency.mjs` and `long-resume.mjs`.

### 9.3 Audit probes [P]

Run against `next start` on the same build, in headless Chrome. axe-core is the copy already present in `node_modules` as a transitive dependency; nothing was installed.

| Probe | Result |
|---|---|
| Response headers on `/`, `/editor`, 404 | CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and `X-Robots-Tag: noindex, nofollow` present. **`X-Powered-By: Next.js` is still sent** on HTML responses (not on `sitemap.xml` or `robots.txt`). HSTS is absent locally because the URL is HTTP, as designed. |
| 404 page | Status 404, but `<title>` is "Free Online Resume Builder \| CVNest" (the home title) |
| Sitemap | 127 URLs, 0 `lastmod` |
| JSON-LD | None on any built page |
| axe-core, desktop 1440×900 | **0 violations** on `/templates`, `/templates/kinetic`, `/templates/professional`, `/free`, `/about`, `/privacy`, `/terms`, `/contact`, `/sign-in`, `/editor`. **`/`: 1 rule (`color-contrast`, serious, 2 nodes)**: `#6b7378` text at the `text-2xs` size inside a home-page sample resume. Down from 15 nodes in the previous audit. |
| axe-core, editor at 390×844 (phone) | 0 violations |
| DOM size | Home 2,906 elements. Gallery on load 1,348; **after scrolling the whole gallery 6,799** (thumbnails are never unmounted); JS heap 65 MB |
| Customize tab, "All" templates | **12,295 elements** on the page; the "Page settings" heading is **13,093 px** down the page |
| Editor form column at 1440 px | 551 px wide |
| Editor form font sizes (desktop, sample loaded, Content tab) | 16px: 44 elements, 18px: 8, **14px: 13**, 15px: 2, 13px: 2. Section titles and entry text are 16–18px; labels, tabs, status and secondary text are 14px. |
| Print without the Download flow | Under print media emulation, `/editor` shows **0 characters** of text (blank page) |
| `navigator.storage.persisted()` after editing | **false** |
| Storage keys after a session | `folio.editor-settings`, `folio.resumes.v2` (no cookies, no other keys) |
| Text-size overflow, all 120 templates × {80%, 120%}, long name, long job title and LinkedIn URL, 8 bullets | **0 templates** with text spilling out of its box or past the page edge in the **editor preview**. A sanity check confirmed the scale applies: body text 11.6px → 14.0px, and the Sterling resume grows from 1 to 2 pages. PDF output at these sizes was **not** checked (HI-06). |
| Screenshots (1440, 1280, 1024, 768, 390 widths) | Desktop: each content section is a separate rounded card with an icon tile, about 80px tall, so about five sections fit on screen; the backup reminder takes the top of the form. Preview fits at 83%, so resume body text renders at about 7–8px on screen. **Phone (390px):** the resume name truncates to "Untit…", the profile name truncates to "Daniel …" next to the Sample tag and Edit button, and the save status is reduced to an unlabelled icon. |

The probe's final typing-latency step failed because of a defect in the probe script (an element click), not the app. No latency figure is reported.

### 9.4 What automation did not cover

- Safari (macOS and iOS), Android browsers, Edge and Samsung Internet.
- Real print dialogs operated by a person. The suites call the print engine directly.
- Screen readers, voice control and switch access.
- Real ATS parsers.
- Lighthouse and Core Web Vitals on the real host.
- Seven-day storage eviction behaviour.
- PDF output at Small and Large text sizes, custom fonts and custom colors across all templates. The overflow probe checked the on-screen preview only (HI-06).

---

## 10. Overall readiness and roadmap

### 10.1 Product readiness assessment

| Area | Rating | Basis |
|---|---|---|
| Core guest product (edit, preview, autosave, templates) | **Strong** | All suites pass; careful data model and migrations |
| Data safety | **Good in-session, weak over time** | Excellent save, recovery and validation logic; long-term durability depends on eviction and user backups (HI-01) |
| PDF export | **Good on desktop Chrome and Firefox; unknown elsewhere** | 480-PDF suites pass; Safari and mobile unverified (HI-02); customization not matrix-tested (HI-06) |
| Download policy | **Resolved in Phase 0**: no account needed; current behavior already matches | CR-01 |
| Editor UX | **Functional, but dense and inconsistent** | HI-04 |
| Accessibility | **Good automated baseline, unverified with assistive technology** | ME-05 |
| SEO | **Technically sound basics, thin content** | ME-06, ME-07 |
| Performance | **Good** | Static pages; some unused weight (ME-08) |
| Security and privacy | **Good for a static app** | Headers in place; no third-party requests; build-time dependency advisories (ME-09) |
| Legal and trust | **Not ready** | CR-02, HI-05 |
| Operations | **Basic** | Rollback documented; no monitoring or tests in CI (ME-10, ME-11) |
| Monetization | **Not ready (by design)** | Section 7.3 |

**Verdict:** not ready for public launch. The engineering foundation is launch-quality for a guest-only product. Launch is blocked by legal pages, executing the domain decision and real-device verification, not by defects in the existing code.

### 10.2 Critical blockers before public launch

1. ~~**CR-01:** decide and document the download-gate design.~~ Resolved in Phase 0: no download gate. Optional accounts aren't a launch blocker.
2. **CR-02:** reviewed Privacy Policy, Terms and Contact, published before sign-up opens.
3. **CR-03:** final brand and production domain, live before any public traffic.
4. **HI-02:** PDF export verified on Safari, iPhone and Android (or clearly disclosed as unsupported).
5. **HI-05:** no false or unverified public claims.
6. **HI-01:** persistent-storage request and visible backup state, at minimum.

### 10.3 Prioritized implementation roadmap

| Priority | Item | Why first |
|---|---|---|
| 1 | P0 decisions: download policy (CR-01, **done**), brand and domain (CR-03, **decided**; registration pending), legal entity and contact (CR-02, **owner input pending**) | Everything else depends on them |
| 2 | HI-05 claim fixes; restore FAQ disclosures (HI-02, HI-03) | Cheap, and they remove false statements immediately |
| 3 | HI-01 persistent storage and backup visibility; ME-01 undo for delete and restore; ME-02 large restore | Prevents the most likely real data loss |
| 4 | ME-11 CI gate on preview builds | Protects everything that follows |
| 5 | HI-06 customization PDF tests, then fixes | Covers the newest, untested code path |
| 6 | ME-03 Ctrl+P; ME-14 load timeout; ME-08 static `/editor`; ME-09 `poweredByHeader`; ME-06 technical SEO; ME-12 copy centralization; ME-15 docs | Small fixes, low risk |
| 7 | HI-04 editor UX and typography; ME-04 validation hints; ME-05 accessibility fixes; LO-01, LO-14 | One coordinated editor pass |
| 8 | Optional accounts (cloud backup and sync, migration); ME-09 CSP for auth routes. *Phase 0: no download gate; can follow launch* | Durability for users who want it |
| 9 | CR-02 final legal text; HI-02 device matrix; HI-03 ATS harness; ME-05 assistive-technology pass; ME-10 monitoring and contact; CR-03 domain cutover | Verification and launch |
| 10 | ME-07 SEO content; IM-01 filters; ME-08 performance; improvements | Growth after launch |
| 11 | Section 7.3 monetization groundwork | Only after accounts are stable |

### 10.4 Recommended phase-by-phase implementation order

**P0: Decisions (owner, about 1 week elapsed, no code)**
- ~~Download-gate decision record~~ **Done (Phase 0):** `docs/phase-0-product-decisions.md`. No gate; nothing in the free journey requires an account.
- Brand, domain, trademark check; legal entity, contact address, governing law (CR-02, CR-03).
- Accounts provider confirmation and region (`accounts-plan.md` §2), including re-checking OpenNext proxy support.
- Analytics stance (MO-04; owner item O-14).

**P1: Foundations and truthfulness (about 4–6 days)**
- HI-05 wording; FAQ disclosures for browsers and ATS (HI-02, HI-03); LO-02 punctuation.
- HI-01 `navigator.storage.persist()`, backup-recency display, re-reminders, Safari note; IM-02.
- ME-01 undo for resume delete, pre-restore safety copy, duplicate detection; ME-02 large restore.
- ME-03 print interception; ME-14 load timeout; ME-08 static `/editor`.
- ME-06 items 1–5 and 8; ME-09 `poweredByHeader: false`.
- ME-12 copy centralization with a guard test; ME-15 doc updates; LO-08 `engines`; LO-10 default branch.
- ME-11 CI or `verify` gate on preview builds.
- HI-06 customization PDF datasets; HI-03 `templateStructure` label fix and `ats` tag rename.
- **Regression gate:** full `npm run test:e2e` in Chrome and Firefox; pixel comparison of all 120 templates at default settings must show 0 differences.

**P2: Editor UX and accessibility (about 4–6 days)**
- HI-04: type scale, wider form, single status region, flattened nesting, entry-form action semantics, Customize order, color tokens.
- ME-04 validation hints (plus a HEIC hint in `PhotoField`).
- ME-05 axe fixes, 40px toolbar, contrast decisions for flagged templates (with approval); LO-01, LO-14.
- Fixes found by the HI-06 tests.
- **Regression gate:** `editor`, `entries`, `keyboard`, `a11y`, `zoom`, `layout`, `guard`, `safety`, `customize` suites; PDF suites unchanged.

**P3: Optional accounts: cloud backup and sync (about 2–3 weeks; not a launch prerequisite after Phase 0)**
- Follow `accounts-plan.md` phases 1–4 (sign-in, push, pull, photos). There is **no download gate**: Download PDF never asks for sign-in.
- Guest-to-account migration of resumes and photos; shared-browser protection; nothing local deleted.
- Update the `// ACCOUNTS` strings to describe optional cloud backup and sync. Claims about account-free creation and downloads stay true. Replace `/sign-in` with the real sign-in.
- CSP for authenticated routes (ME-09).
- **Regression gate:** guest makes zero account requests until it chooses to sign in; all existing suites pass with no account environment variables; new auth and migration suites.

**P4: Verification and launch (about 1–2 weeks, partly owner)**
- CR-02 final legal pages (lawyer reviewed).
- HI-02 device matrix; IM-11 PDF help; LO-15.
- HI-03 ATS harness, then the "ATS-safe" set; ME-13 decisions.
- ME-05 screen-reader pass.
- ME-10 monitoring, contact channel, Workers plan decision.
- CR-03 domain cutover; ME-06 item 6; verify headers on the real host; `NEXT_PUBLIC_INDEXABLE=true`; submit the sitemap.
- Rollback rehearsal (`docs/deploy-cloudflare.md`).

**P5: Post-launch growth (ongoing)**
- ME-07 and IM-13 to IM-17 SEO content; IM-01 filters and ATS badge.
- ME-08 gallery and Customize thumbnail virtualization, font preloads, header as a server component; Lighthouse on the host.
- IM-03 to IM-09 features; LO-03 to LO-07, LO-09, LO-11 to LO-13 housekeeping.

**P6: Monetization groundwork (after P3 is stable)**
- MO-01 copy commitments ("all 120 templates free"); MO-02 entitlements and webhooks; payment provider; MO-04 measurement; premium *additions* only (new templates, cover letters, DOCX, keyword tools).

---

## 11. Existing features that must not be removed or broken

Every phase must preserve these. Each has automated coverage today unless marked (manual).

**Product promises**
1. All 120 templates, each free to use, with "110+" in public copy (`count` suite enforces the floor).
2. No watermark, logo or branding added to exported resumes.
3. Resume creation, editing, preview and autosave without an account.
4. Unlimited, free PDF downloads without an account (Phase 0 policy). No download gate, ever; accounts stay optional.
5. Content separate from presentation: switching templates, colors, fonts, text size or page size never changes resume content.

**Editor**

6. Live preview with page-aware pagination, page gaps, page labels and the "few lines" and "many pages" hints.
7. Overview, Content and Customize tabs, with keyboard tab navigation.
8. Personal details (name, title, email, phone, location, LinkedIn, GitHub, website) and an optional photo.
9. Sections: summary, experience, education, projects, skills, certifications, languages, awards, volunteering and custom sections. Sections can be added, renamed, reordered, hidden and removed. Entries can be added, edited, reordered (drag and keyboard), hidden and deleted with undo.
10. Bullet handling, including pasted bullets (`bullets` suite).
11. Sample data: load, "Sample" tags, review, clear with undo, and the pre-download sample warning.
12. Empty-resume warning before download.
13. Style controls: 9 preset colors, custom color with readability darkening, 6 fonts, text size (Small, Medium/Default, Large, 80–120% in 5% steps), reset to template style.
14. Letter and A4 page sizes, saved per resume.
15. Zoom (steps and Fit), sticky preview, mobile Edit/Preview switch.
16. Template picker dropdown (keyboard-operable) and the Customize template grid.
17. Restoring the last open section per resume.
18. Field limits with counters; over-limit content is never cut.

**Resumes and data**

19. Multiple resumes: create, rename, duplicate (sharing photos safely), delete, switch.
20. `localStorage` keys `folio.resumes.v2`, `folio.resumes` (v1 backup, never modified), `folio.resumes.backup-v{n}`, `folio.resumes.v2.unreadable-backup`, `folio.migrations`, `folio.editor-settings`, `folio.backup-state`, `folio.open-sections`. **Do not rename `folio.*` keys.**
21. IndexedDB `folio` / `photos`, cleanup of unused photos after 24 hours, and migration of inline v1 photos into IndexedDB.
22. Schema v2 with versioned migrations; the newer-version guard that refuses to overwrite data from a newer app version.
23. Unreadable-data recovery with the original kept.
24. Debounced autosave (400 ms), flush on page hide, save-status indicator, save-error banner with backup download.
25. Backup download with embedded photos; restore with preview, merge or replace, validation, and newer-version refusal.
26. Unsaved-changes guard on in-app links, Back, close and refresh.
27. Two-tab detection warning and cross-tab sync.
28. Photo resizing to 400 px JPEG in the browser; JPEG, PNG and WebP; 15 MB input limit.

**PDF**

29. Browser print-based export with selectable text, embedded fonts, working links and tagged output (Chrome).
30. The Firefox-specific path (static fonts, print frame, aside-first) and its blank-page and edge fixes.
31. File name from the person's name.
32. Page backgrounds, sidebars and edge decorations repeated on every page.

**Site, SEO and security**

33. Template gallery with categories, search, preview modal and lazy thumbnails; 120 template detail pages with "Use This Free Template".
34. Titles, descriptions, canonicals, Open Graph and Twitter images, sitemap, robots, and the `noindex` handling for non-production builds.
35. Security headers in `next.config.ts`; no third-party requests; no cookies for guests; no resume content in network requests (`pdf` suite check).
36. Error boundaries for the site, editor and global errors that never touch saved data.
37. Separate preview and production Workers; production deploys only manually.
38. Accessibility behavior: one H1 per page, focus return after dialogs and deletes, live-region announcements, 40 px touch targets in the editor, reduced-motion support.
