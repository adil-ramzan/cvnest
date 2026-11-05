# CVNest: Phase 2 completion report (security and technical hardening)

**Dates:** 2026-11-05
**Scope:** security headers and CSP, input validation and data safety, browser-test reliability, and test-only CI. This follows the plan approved after `docs/comprehensive-product-audit.md` and `docs/phase-1-completion-report.md`.
**Not in scope, by instruction:** ME-02 (moving photos into IndexedDB before a restore), dependency changes, Cloudflare and deployment configuration, domain, legal content and SEO.

---

## 1. Before starting

### 1.1 Backup prerequisite

The owner explicitly accepted proceeding without a separate backup and named the GitHub repository `adil-ramzan/cvnest` as the source of record.

### 1.2 Checkpoint of Phase 0 and Phase 1 work

- All uncommitted Phase 0 and Phase 1 work (11 modified files and 4 untracked items: 17 files in total) was committed as `01d51fd` ("Checkpoint: Phase 0 product decisions and Phase 1 content corrections"). Nothing was lost or overwritten; the working tree was clean afterwards.
- Author and committer: Adil Ramzan <emadilramzan@gmail.com>. No co-author lines.
- **Push target changed with the owner's approval.** `docs/deploy-cloudflare.md` states that `cvnest-preview` is connected to Cloudflare Workers Builds and that every push to `main` deploys to preview, which conflicts with "Do not deploy". The owner chose to push to a separate branch instead. The checkpoint went to `checkpoint/phase-0-1`, verified with `git ls-remote` at `01d51fd`. Remote `main` was left at `6acc6df`.

---

## 2. Files changed and why

| File | Purpose |
|---|---|
| `next.config.ts` | Security headers: `poweredByHeader: false`; CSP `base-uri 'none'` (was `'self'`), new `frame-src 'none'` and `worker-src 'none'`; new `Cross-Origin-Opener-Policy: same-origin` |
| `src/components/editor/ResumeEditor.tsx` | Restore: if the chosen backup file can't be read (`file.text()` rejects), show the existing "Couldn't restore this file" dialog instead of failing silently. No other change. |
| `tests/e2e/helpers.mjs` | New `waitFor()` helper: polls a condition up to a timeout and returns the result, which the caller still asserts on |
| `tests/e2e/safety.test.mjs` | Fixes two timing races (section 5); assertions unchanged |
| `tests/e2e/security.test.mjs` | **New suite** (19 checks): headers, CSP violations in real use, malformed and oversized data, unreadable and oversized backups |
| `tests/unit/malformed-data.test.ts` | **New** (16 tests): malformed, unexpected and oversized data through `parseResumes`, `sanitizeResume`, `readBackup` and `prepareResume` |
| `.github/workflows/ci.yml` | **New**: test-only GitHub Actions CI (section 6) |
| `docs/comprehensive-product-audit.md` | Phase 2 status section; ME-11 note updated |
| `docs/phase-2-completion-report.md` | This report |

Not changed (verified with `git diff`):
- `src/lib/` (storage, keys, migrations, schema, backup, photo store)
- `src/data/templates.ts` and `src/components/resume/` (templates, rendering, pagination)
- `usePdfExport.tsx`
- `package.json` and `package-lock.json`, so no dependency changes
- `wrangler.jsonc`, `open-next.config.ts`, `public/_headers`
- environment variables
- legal pages

### 2.1 A change made and then reverted

During inspection, `sanitizeResume` was found to turn a number in a text field (for example `2021`, or a phone number written as a number in a hand-edited backup) into empty text, and to drop non-string bullets. A change that converted numbers to text was drafted and then **reverted before any test run**. That behavior is deliberate and protected by an existing test (`tests/unit/schema.test.ts`: `highlights: ["a", 5, "b"]` becomes `["a", "b"]`), and changing it wasn't in the approved plan. It's recorded as new open finding **ME-16** for an owner decision. `src/lib/resume-schema.ts` is unchanged.

---

## 3. Security improvements

### 3.1 Headers

| Header | Before | After |
|---|---|---|
| `X-Powered-By` | `Next.js` on HTML responses | **Not sent** |
| CSP `base-uri` | `'self'` | **`'none'`**: the app uses no `<base>` element (checked in source and built HTML) |
| CSP `frame-src` | Inherited `'self'` from `default-src` | **`'none'`**: the app embeds no frames |
| CSP `worker-src` | Inherited from `script-src` | **`'none'`**: the app uses no web or service workers |
| `Cross-Origin-Opener-Policy` | Not sent | **`same-origin`**: no page opens or relies on another window; the print flow uses the same window |
| Other CSP directives, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS on HTTPS | Present | Unchanged |

### 3.2 Directives reviewed and deliberately kept

| Directive | Why it stays |
|---|---|
| `script-src 'unsafe-inline'` | Pages are prerendered, so there's no per-request nonce for Next's inline scripts. A nonce would mean rendering every page on request. That's an architectural change, deferred until authenticated routes exist (ME-09). No `unsafe-eval` in production (checked by the new suite). |
| `style-src 'unsafe-inline'` | Template designs, customization variables and the PDF page rules are inline styles |
| `img-src data: blob:` | Uploaded photos display from `blob:` URLs; v1-migrated and restored photos are `data:` URLs |
| `font-src 'self'`, `connect-src 'self'` | All fonts are self-hosted; the app makes only same-origin requests |
| `form-action 'self'` | The rename form never submits (handled in JavaScript); kept as a safe default |

### 3.3 Where headers were verified

| Served by | Result |
|---|---|
| `next start` (all browser suites run against it) | New `security` suite checks `/`, `/templates`, `/templates/kinetic`, `/editor`, `/privacy` and the 404 for every expected directive and header, and no `X-Powered-By` or `unsafe-eval`: **pass** |
| Local Cloudflare Worker (`npm run preview`, `workerd`, no login or upload) | `/`, `/editor`, `/templates/kinetic` and the 404: full CSP including `base-uri 'none'` and `frame-src 'none'`, `X-Frame-Options: DENY`, nosniff, `Cross-Origin-Opener-Policy: same-origin`, no `X-Powered-By`. A static script and `/fonts/print/inter-400.woff`: `nosniff` only (from `public/_headers`), as documented in `docs/deploy-cloudflare.md`. They aren't documents, so CSP and frame headers don't apply to them. |
| Deployed preview or production Workers | **Not verified.** Nothing was deployed. |

### 3.4 CSP in real use

The `security` suite records every `securitypolicyviolation` event and console CSP message. **0 violations** across:
- the home, gallery, template, free and legal pages, including scrolling the gallery so every lazy thumbnail renders;
- the editor with sample data;
- photo upload (displayed from `blob:`);
- a custom color and font;
- PDF export, including the photo embedded in the PDF;
- editor loading of malformed stored data, and its PDF export.

Firefox PDF export under the same headers is covered by `pdf-firefox` (480 PDFs pass). A blocked font would fail its font checks.

---

## 4. Input validation and data safety

**Finding:** validation was already sound, and nothing needed changing apart from the unreadable-file case.
- `sanitizeResume` never throws.
- Colors must be `#rrggbb`, fonts come from an allow-list, and text size must be within 80–120%.
- Unknown page sizes fall back to Letter, and unknown template ids to Professional.
- Photos must be small JPEG, PNG or WebP data URLs, and links pass through `safeHref`.
- Oversized text is kept in full.
- Newer-version data is never overwritten.

Phase 2 proves this with tests:

**Unit (`malformed-data.test.ts`, 16 tests):**
- Unparseable or wrongly shaped storage returns nothing and is flagged for backup.
- Readable resumes survive alongside junk items.
- Every wrong type in every top-level, profile and design field is handled, and the render model still works.
- Wrong types inside sections and entries keep the valid parts.
- Invalid colors (including `javascript:` and injection attempts), fonts (including `__proto__`) and text sizes (`NaN`, `Infinity`, out of range, strings) are rejected.
- Unknown and path-like template ids resolve to a real template.
- `__proto__` and `constructor` keys don't pollute objects.
- 250,000-character fields and 500 bullets are kept in full.
- Control characters, RTL marks, emoji and lone surrogates are kept.
- Newer-version data is refused.
- For backups: non-backups are rejected; empty backups are rejected; readable resumes are restored with skipped items counted; newer versions are refused; SVG, HTML, `javascript:`, malformed and oversized photo data is dropped while the resume is kept.

**Browser (`security` suite, 11 of its 19 checks):**
- Malformed stored data opens without a crash or page error.
- Unreadable items are reported, and the original is kept in `folio.resumes.v2.unreadable-backup`.
- Readable content is shown, including a long paragraph in full.
- No `javascript:` link is rendered, and a bare domain becomes `https://`.
- Invalid style values never reach the page.
- Malformed data still exports a PDF containing the readable content.
- A mixed backup reports "2 couldn't be read and will be skipped".
- A 26 MB file is refused before reading.
- An unreadable file shows an error.
- Refused and unreadable files add or replace nothing.
- No CSP violations occur with malformed data.

---

## 5. Test reliability

### 5.1 The Phase 1 failure: "Warning clears when the other tab closes"

- **Root cause:** the check closed the second tab with Puppeteer's default `page.close()`, which skips the page's unload sequence. Whether the tab's `pagehide` handler ran and its "gone" message was delivered before teardown was a race. The test then waited a fixed 1.5 s. Without the "gone" message, the app's fallback (a 10 s stale-tab timeout, checked every 4 s) can't clear the warning within 1.5 s.
- **Fix:** close the tab with `runBeforeUnload: true`, which is how a person's close behaves, then poll for the warning to clear with a 4 s limit. That limit is well under the 10 s fallback, so a pass still proves the "gone" message works; the assertion isn't weakened. The two preceding fixed waits ("Second tab warns", "First tab warns too") are now condition waits with the same assertions.

### 5.2 A second race found while stress-testing

Running three `safety` suites at once made "Unrelated JSON is rejected" fail once. The test's `restoreFile` helper waited for `dialog[open]`, which could match the *previous* error dialog while it was still closing, so the check read the old message. The fix: wait until no dialog is open before uploading the next file. Same assertions.

### 5.3 Evidence

| Run | Result |
|---|---|
| `safety` alone, 10 times in a row | 10 of 10 passed, 29 of 29 checks each |
| `safety`, 3 copies at once, two rounds (after both fixes) | 6 of 6 passed, 29 of 29 checks each |
| `entries`, `sample`, `data-model`, `keyboard`, `template-picker`, `guard`, `editor` and `open-section`, each as 3 copies at once | 24 of 24 passed, 0 failures |
| Full run (section 7) | `safety` passed |

The other 200+ fixed `sleep()` calls were **left as they are**. The stress runs showed no instability, and rewriting them without evidence would be speculative. `waitFor()` is available for future fixes. It's documented as not for "something does NOT happen" checks, which still need a fixed wait.

---

## 6. CI (`.github/workflows/ci.yml`)

| Job | Runs on | Steps |
|---|---|---|
| `checks` | Every push and pull request | `npm ci`, typecheck, lint, unit tests, production build |
| `browser` | After `checks` | Installs Poppler, builds, runs the 19 fast suites in Chrome (including `security` and `safety`); uploads `.e2e-output` on failure |
| `pdf` | Manual only (`workflow_dispatch` with "full") | The 7 long suites: `pdf`, `pdf-firefox`, `pdf-firefox-blank`, `pdf-edges`, `pagination`, `bullets`, `zoom-firefox` |

- Together the two browser jobs cover all 26 suites. The suite selection was checked locally against the runner's matching rules.
- **No deployment:** `permissions: contents: read`, no secrets, no `wrangler` or OpenNext commands, no Cloudflare credentials.
- **Not yet run on GitHub.** The YAML parses locally. The first real run will happen on the next push. Whether GitHub's Ubuntu image provides Firefox and `geckodriver` for the manual `pdf` job is unverified; those suites skip themselves if not.
- **Still open:** Workers Builds deploys preview on every push to `main` without running these checks. Changing that is a Cloudflare setting and wasn't touched. Options: make the Workers Builds build command run `npm run verify` first, or require the GitHub CI to pass before merging into `main`.

---

## 7. Verification results (final build, 2026-11-05)

| # | Check | Command or method | Result |
|---|---|---|---|
| 1 | TypeScript | `npm run typecheck` | **Pass** (exit 0) |
| 2 | Lint | `npm run lint` | **Pass**: 0 errors, 3 warnings (the existing `no-img-element` warnings in `PhotoField.tsx`, `ProfileCard.tsx`, `DesignTemplate.tsx`) |
| 3 | Unit tests | `npm run test:unit` | **Pass**: 236 tests (220 existing + 16 new) in 28 suites; 0 failed, 0 skipped |
| 4 | Browser suites | `npm run test:e2e` | **Pass**: all 26 suites (25 existing + `security`); **467 checks passed, 0 failed, 0 skipped** |
| 5 | Production build | `npm run build` | **Pass**: 138 static pages |
| 6 | Headers and CSP | `security` suite; local Worker | **Pass** (section 3.3); deployed Workers not verified |
| 7 | Malformed and oversized data | Unit and `security` suite | **Pass**: 16 unit tests, 11 browser checks |
| 8 | All 120 templates render | `count`, `templates`, `fields` (480 combinations), `bullets` (120), `pdf`, `pdf-firefox` | **Pass** |
| 9 | Guest creation, editing and autosave | `editor`, `entries`, `data-model`, `sample`, `guard`, `keyboard`, `safety` | **Pass** |
| 10 | Storage and migrations | Unit `storage`, `migrations`, `schema`; e2e `data-model`, `safety` | **Pass**; `src/lib/` unchanged |
| 11 | PDF export, Chrome and Firefox | `pdf` (480), `pdf-firefox` (480), `pdf-firefox-blank`, `pdf-edges` | **Pass**; Chrome non-final pages at least 82% full, Firefox at least 59% |
| 12 | Pagination and formatting comparison | `pagination`: preview page count matched the PDF in 225 of 225 cases. Plus a before/after comparison of every PDF against the pre-Phase-2 baseline (Nov 4, 19:17) | **Identical**: 480 of 480 Chrome and 480 of 480 Firefox PDFs with the same page counts, fonts and text; maximum word-position difference **0.000 pt** |

Browser suite times: `a11y` 43 s, `bullets` 179 s, `count` 13 s, `customize` 17 s, `data-model` 48 s, `editor` 18 s, `entries` 30 s, `error-boundaries` 9 s, `fields` 72 s, `guard` 30 s, `keyboard` 22 s, `layout` 66 s, `links` 7 s, `open-section` 17 s, `pagination` 439 s, `pdf-edges` 199 s, `pdf-firefox-blank` 22 s, `pdf-firefox` 748 s, `pdf` 190 s, `safety` 34 s, `sample` 18 s, `security` 22 s, `template-picker` 7 s, `templates` 20 s, `zoom-firefox` 10 s, `zoom` 31 s.

**Not run or not available:** Edge, Safari or WebKit, physical devices, the CI workflow on GitHub, the deployed Workers.

### 7.1 Regressions

None in the final run. Issues met during development, all resolved within scope:

| Issue | Cause | Resolution |
|---|---|---|
| New unit test failed on the `__proto__` case | The test's raw JSON item lacked `schemaVersion`, so it was migrated as v1 data (different field names). A test bug, not an app bug. | Added `schemaVersion` to the test item |
| New browser check "Refused and unreadable files change nothing" failed | It compared against raw stored data that the app hadn't rewritten yet. The app's normal save after the PDF export replaced it with the cleaned list (the original stays in `unreadable-backup`). A test-baseline bug, not data loss. | The check now asserts that the backup's resume never appears and the app's resume stays |
| My stress-test script didn't finish | Its `pgrep -f` pattern matched its own command line | Rewritten with `wait`; no effect on the project |

---

## 8. Confirmations

- **All 120 templates are intact:** `src/data/templates.ts` and `src/components/resume/` are unchanged, every template rendered and exported in Chrome and Firefox, and the PDFs are identical to the baseline.
- **Guest downloads are intact:** free, unlimited, no account, no watermark. `usePdfExport.tsx` is unchanged and PDF output is identical.
- **Browser data behavior is intact:**
  - Storage keys, IndexedDB, migrations, autosave, backup and restore are unchanged.
  - The only behavior change is the clearer error when a restore file can't be read.
  - Photos still upload, display and export.
- **No deployment occurred.** No `wrangler deploy`, `upload` or `opennextjs-cloudflare deploy` was run. `npm run preview` ran only the local `workerd` runtime. No Cloudflare, domain or environment setting was changed.
- **Git:** see section 10 for the final commit and push. History wasn't rewritten, nothing was force-pushed, and there are no co-authors.

---

## 9. Remaining risks and open findings

| ID | Status |
|---|---|
| ME-02 | Open: large restores with inline photos may exceed the `localStorage` quota on first save. Not implemented; needs separate approval. |
| ME-16 (new) | Open: numbers and other non-string values in text fields are discarded on load. Deliberate and test-protected; owner decision needed. |
| ME-09 | Partly resolved: `X-Powered-By` removed and CSP tightened. Still open: nonce CSP (deferred), `npm audit` advisories from `@opennextjs/cloudflare` (5 production: 4 high, 1 moderate, as of the audit; a dependency change is needed), HSTS `includeSubDomains` (waits for the domain). |
| ME-11 | Partly resolved: CI added and the flakes fixed. Still open: Workers Builds deploys preview without tests; no WebKit; CI not yet run on GitHub. |
| Headers on deployed Workers | Not verified (no deployment) |
| CR-02, CR-03 | Open: owner information, legal review and the domain (unchanged by Phase 2) |
| HI-01 to HI-04, HI-06 | Open: outside Phase 2 scope |
| ME-01, ME-03 to ME-08, ME-10, ME-12 to ME-15 | Open: outside Phase 2 scope |
| LO and IM items | Open: outside Phase 2 scope |

---

## 10. Commit and push

The Phase 2 work is committed on local `main` on top of the checkpoint, authored by Adil Ramzan with no co-authors. Following the push decision in section 1.2, it's pushed to a branch, not to `main`, so Workers Builds doesn't deploy it. The branch and commit are recorded in the final summary given with this report. Merging into `main` (which would deploy preview) is left to the owner.
