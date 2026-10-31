# CVNest final audit

Date: 2026-10-31. Audited: the working tree as it stands, using the production build made at 14:20 that day.

**Verdict: not ready for public launch.** The product core is solid, and all 480 PDF exports passed in Chrome, Edge and Firefox. It is blocked by missing security headers, holding-page legal and contact content, an undecided brand and domain, no hosting, no real-device testing, and no off-machine backup of the source.

Labels: **V** = VERIFIED (ran it or read the code that proves it). **S** = SUSPECTED (inferred; the note says what would confirm it).

Scope notes:

- No git commands were run, nothing was installed, and nothing was deployed. Git state is not part of this audit.
- The working tree contains unfinished, uncommitted Step 1 edits from before this audit (listed in 3.1). They were left as they are, unfixed and unreverted.
- The request for section 8 was cut off at "the 120-template test". For each item, risk was treated as "what could break, including privacy claims and the 120-template test".

## 1. Project inventory

| Area | What exists (V) |
|---|---|
| Stack | Next.js 16.4.3, React 19.3.1, Tailwind 4, TypeScript 5.9. Runtime dependencies: `next`, `react`, `react-dom`, `lucide-react`. No backend or database. |
| Size | About 15,600 lines in `src` and `tests`. Largest: `src/data/templates.ts` (2,794), `src/components/resume/engine/DesignTemplate.tsx` (962), `src/data/samples.ts` (598), `src/components/editor/ResumeEditor.tsx` (591+). |
| Routes | `/`, `/templates`, `/templates/[slug]` (120), `/free`, `/about`, `/contact`, `/privacy`, `/terms`, `/sign-in`, `/editor`, `robots.txt`, `sitemap.xml`, `opengraph-image`, `twitter-image`, `not-found`, two `error.tsx`, `global-error.tsx` |
| Components | `editor` 17 + `editor/content` 6, `home` 11, `layout` 4, `resume` 7 + `resume/engine` 2, `templates` 8, `ui` 6 |
| Data | `copy.ts` (home wording, `ACCOUNTS` markers), `site.ts` (`SITE_NAME`, `site.url`), `template-count.ts`, `templates.ts`, `template-tags.ts`, `samples.ts`, `resume.ts` |
| Template engine | Declarative `TemplateDesign` rendered by `DesignTemplate.tsx`. 117 engine templates plus 3 hand-written (Professional, Modern, Minimal). Layouts: 57 single, 24 columns, 23 sidebar, 8 labels, 5 timeline. Photo: 93 none, 14 optional, 13 always. |
| Storage | `resume-storage.ts`, `resume-schema.ts`, `migrations.ts`, `photo-store.ts`. localStorage keys under `folio.*`, IndexedDB database `folio`. Schema version 2 with migration from v1, an upgrade backup and an unreadable-data backup. |
| Backup and restore | `backup.ts`: JSON with embedded photos, 25 MB limit, merge or replace, same validation as stored data, newer-version refusal |
| Unsaved guard | `unsaved.ts`, `useUnsavedGuard.ts`, `LeaveGuardDialog.tsx`. A resume counts as at risk if it changed since the last backup or PDF export. |
| PDF export | `usePdfExport.tsx`, `printFonts.ts`, print CSS in `globals.css`. Uses the browser print window. Firefox has a separate path with static fonts. |
| Unit tests | 7 files, 73 tests |
| Browser tests | 17 suites (15 in Chromium, 2 Firefox: `pdf-firefox`, `zoom-firefox`) |
| Scripts | `dev`, `build`, `start`, `typecheck`, `test:unit`, `test:e2e`, `verify`, `lint` |
| Docs | `docs/accounts-plan.md`, this file. `README.md`, `LICENSES.md`. |
| Fonts | 11 families, all OFL 1.1. 61 static `.woff` in `public/fonts/print/` plus `src/assets/PlusJakartaSans-Bold.woff`. License text present for every family. Variable fonts come through `next/font` at build time and are self-hosted. |

Unused or duplicated (V unless noted):

- `featuredTemplateSlugs` in `src/data/templates.ts` is exported and used nowhere. Dead.
- 23 other exports are used only in their own file (for example `BACKUP_KIND`, `pdfFileName`, the section types in `resume.ts`). The `export` keyword is unnecessary, but this is harmless.
- No unimported component, lib or data files. No unused top-level CSS classes by name search.
- Duplication: the 3 hand-written templates repeat what the engine does, and need special cases (`GeckoPages` hard-codes Modern's sidebar).
- `tsconfig.tsbuildinfo` and `.e2e-output` are local generated files, already ignored.
- `.next` is 910 MB locally because of accumulated output. Not a defect.

## 2. Requirements checklist

| Item | Status | Evidence |
|---|---|---|
| Landing page redesign | Done (V) | `src/components/home/*`; crawl clean |
| Template gallery, categories, search | Done (V) | `templates.test.mjs` |
| Preview modal | Done (V) | `PreviewModal.tsx`, `templates.test.mjs` |
| Editor section cards and entry rows | Done (V) | `ContentTab.tsx`, `EntryList.tsx` |
| Hide/show entries | Done (V) | Checks in preview, print copy and reload (`entries.test.mjs`, code path unchanged by Step 1) |
| Custom sections | Done (V) | `data-model.test.mjs` |
| Multiple resumes | Done (V) | `data-model.test.mjs` |
| Backup and restore | Done (V) | `safety.test.mjs`, including identical photo bytes |
| Undo | Partly (V) | Deletions only, 10-second toast. No general undo. |
| Limits | Done (V) | `resume-limits.ts`, `safety.test.mjs` |
| Two-tab warning | Done (V) | `safety.test.mjs` |
| Unsaved-changes guard | Done (V) | `guard.test.mjs` |
| Links in PDF | Done (V) | `pdf.test.mjs` checks link targets |
| Sample data | Done (V) | Load sample worked in the crawl |
| Scrollbar styling | Done (V) | `.editor-scroll` in `globals.css` |
| Single-page scroll, sticky preview | Done (V) | `zoom.test.mjs`, `zoom-firefox.test.mjs` |
| Accessibility fixes (Phase 2) | Done in tests (V); not checked with a real screen reader | `keyboard.test.mjs` |
| 120 templates, "110+" wording | Done (V) | 120 unique slugs; floor test added |
| One-place copy file | **Partly** (V) | Home only. `/privacy`, `/terms`, `/contact`, `/about`, `/free`, `PrivacyNote.tsx` and template pages keep their own wording. |
| Favicon, social image | Done (V) | `src/app/icon.svg`, `opengraph-image.tsx`, `twitter-image.tsx` |
| Hidden Sign In link | Done (V) | No sign-in link in `layout` or `site.ts`; `/sign-in` is noindex |
| Lint warning fix (Step 1) | **Partly** (V) | The fourth warning (`UndoToast.tsx`) is fixed, but my new code added a different one (`resume-storage.ts:276`) |
| Template count floor test | Done (V) | Fails at 109, passes at 120 |
| `LICENSES.md` full list | Done, needs your check (V) | Items to verify are listed in that file |
| Restore last open section | **Done in code, test fix outstanding** (V) | Own optional key `folio.open-sections`; its test passes, but it broke an assumption in `entries.test.mjs` |
| Security headers | **Not done** (V) | `next.config.ts` is empty. Only `X-Powered-By` is served. |
| "Good to know" editor note | **Not done** (V) | Only the home FAQ uses that title |
| Privacy wording (one line) | **Not done** (V) | Not on `/privacy` |
| Site basics | **Partly** (V) | 404, error pages, robots and canonicals exist. No `lastModified`, no structured data, 404 has the home title, `SITE_URL` is not a separate constant. |
| Legal drafts | **Not done** (V) | Only holding pages exist |
| Deployment plan | **Not done** (V) | No `docs/deploy-plan.md` |
| CI | Changed (V) | Cancelled by your latest rules |
| Batch 3 | Changed | Replaced by Phase 2 |

## 3. Quality audit

| Area | Rating |
|---|---|
| Correctness | Good, one test to update |
| Data safety | Good |
| PDF output | Good on tested browsers |
| Preview vs PDF | Needs work (label only) |
| Accessibility | Needs work |
| Responsive | Good |
| Performance | Good, fair on mobile LCP |
| SEO and sharing | Needs work |
| Security | Needs work (headers); code handling is good |
| Privacy and claims | Mostly good, a few fixes |
| Copy and brand | Needs work |
| Code quality | Good |
| Template catalog | Good, some thin spots |

### 3.1 Correctness: Good

- V: On all 12 routes checked, there were no JavaScript errors, no console warnings and no failed requests, apart from the intended 404 status on the not-found page.
- V: Editor states (Overview, Customize, Content, section open, mobile) also logged nothing.
- V: **Current test failure.** `entries.test.mjs` fails in Chrome and Edge. Cause: its `openExperience` helper toggles the section, assuming it starts closed, but Step 1 now restores it after reload, so the helper closes it. A scratch copy that only opens when closed passed all 33 checks. It is a test assumption, not an app bug. It needs a one-line test change and my approval to make it.
- V: Other unfinished Step 1 item: unused variable `_previous` at `src/lib/resume-storage.ts:276`.
- S: `folio.open-sections` keeps an entry after a resume is deleted. It holds only ids, and a test shows stale ids are ignored. Low impact.

### 3.2 Data safety: Good

V by test (`safety.test.mjs`, `tests/unit/storage.test.ts`, `migrations.test.ts`, `schema.test.ts`):

- Autosave has a 400 ms delay.
- Reload keeps content.
- A failed save shows a banner with Download backup, and that backup includes the unsaved change.
- Oversized content survives a save and reload, with a warning.
- Backup round trip includes identical photo bytes.
- Invalid and newer-version files are refused and change nothing.
- Hidden entries stay out of the preview and print copy.

Gaps:

- S: Very large restores into localStorage were not stress-tested. A backup can be up to 25 MB, while browsers commonly allow about 5 MB of localStorage. Confirm with a large backup test.
- V: Restore "replace" has no undo.
- V: Repeated restore "merge" creates duplicates.
- S: Safari's storage eviction was not tested and can remove data without warning.

### 3.3 PDF output: Good on tested browsers

- V: 480 PDFs each in Chrome, Edge and Firefox: 120 templates across four datasets (long Letter and A4, fixture Letter, empty A4). All passed page size, text, bounds, blank-page and image checks.
- V: Minimum fill on non-final pages: Chrome 82%, Firefox 55%.
- V: All 480 Chrome PDFs are tagged, and links are checked.
- V: `obsidian` and `plainview` run to 5 pages on the long resume, with only 12–14% of the last page used. `almanac` is similar at 4 pages (18%).
- V: `telegraph` is the densest at 2 pages.
- V: Lowest fill on the short fixture: `quarto`, `summit`, `pocket`, `fiscal`, `balance`, `duet`, `gridline`, `brief` (25–30% of one page). This is natural for short content, but those designs look emptiest.
- V: Reading order in `-layout` text output: `kinetic` puts dates or labels and content in separate columns. Two-column parsing is a real ATS risk.
- V (limit): only 2 of 120 templates' PDFs (`kinetic`, `classic`) were read as text by hand in this audit. All are machine-checked, none visually reviewed here.

### 3.4 Preview vs PDF: Needs work

- V: For the long resume, the "about N pages" label matched the Chrome PDF in 81 of 120 templates and was off by one in 39, never more. The wording "about" is honest, but 33% off by one is high.
- S: Firefox page counts differ more because of its 12 mm margins.

### 3.5 Accessibility: Needs work

| Check | Result |
|---|---|
| Keyboard flow | V: add, edit, reorder, hide, delete, undo and Escape pass |
| Focus | V: tests cover Save, Cancel, delete and Undo |
| Lighthouse accessibility | V: 96 on home, 100 on the others tested |
| axe | V: no violations on `/templates`, `/free`, `/about`, `/contact`, `/privacy`, `/terms`, `/sign-in`, `/templates/professional` |
| axe on `/` | V: 15 contrast nodes, inside the miniature sample resumes (#8a8a8a on white, 3.45:1) |
| axe on `/templates/kinetic` | V: 7 contrast nodes, orange accent #ea580c on white, 3.55:1, inside the resume design |
| axe on `/editor` | V: `label-content-name-mismatch` (1), `page-has-heading-one` on mobile, `region` (hidden backup file input, bottom bar) |
| Headings | V: raw HTML has 26 `<h1>` on `/`, 4 on `/templates`, 2 on detail pages, because sample resumes render as real pages. On the editor, the only H1 is the resume's name, and it disappears on mobile when the preview is hidden. |
| Touch targets | V: editor controls at least 40px at 390 wide, except the 28px logo link. Footer links are 21px tall. |
| Reduced motion | V: `zoom.test.mjs` |
| Zoom and reflow | V: simulated 200% and 400%, form visible height 450px and 225px |
| Announcements | V: text reaches live regions in tests. Not heard in a screen reader. |

Measured site contrast from `globals.css` tokens (V by calculation):

| Pair | Ratio | AA normal text |
|---|---|---|
| Ink #14213d on surface #ffffff | 15.97:1 | Pass |
| Ink on canvas #eeece9 | 13.55:1 | Pass |
| Muted #5b6472 on surface | 5.98:1 | Pass |
| Muted on canvas | 5.07:1 | Pass |
| Placeholder #6b7280 on panel #f5f3f0 | 4.37:1 | **Slightly below 4.5:1** |
| Accent #0f766e on surface | 5.47:1 | Pass |

Automation cannot prove: how a screen reader sounds, whether the order makes sense, whether wording is clear, drag use with assistive tech, voice control, or real zoom.

### 3.6 Responsive: Good

V: no horizontal overflow on all 12 routes at 320, 360, 390, 768, 1024, 1440, 2560 and 844×390 landscape. Editor forms were tested at 200%, 400% and landscape.

Not tested: real phones.

### 3.7 Performance: Good, fair mobile LCP

Lighthouse, local production server (V):

| Page | Mobile perf | Desktop perf | Mobile LCP | Mobile TBT | CLS | Mobile weight |
|---|---|---|---|---|---|---|
| `/` | 93 | 100 | 3.1 s | 120 ms | 0 | 377 KB |
| `/templates` | 91 | 100 | 3.4 s | 80 ms | 0 | 401 KB |
| `/templates/professional` | 97 | 100 | 2.6 s | 50 ms | 0 | 352 KB |
| `/editor` | 90 | 100 | 3.4 s | 160 ms | 0 | 398 KB |
| `/privacy` | 97 | 100 | 2.6 s | 50 ms | 0 | 328 KB |

- V: JavaScript transferred uncompressed: 487 KB per site page, 731 KB on the editor.
- V: Fonts per page: 3 on most pages, 4 on gallery and Kinetic, 7 on home.
- V: Home HTML is 588 KB raw and 57 KB gzipped. `/templates` is 271 KB raw and 32 KB gzipped.
- V: Gallery renders 63 articles in server HTML, with the rest lazy, so 120 templates stay affordable.
- S: Real low-end phones will be slower than the simulated mobile numbers. Real hosting and CDN numbers are unknown.

### 3.8 SEO and sharing: Needs work

- V: Every indexable page has a title, description and canonical.
- V: `robots.txt` blocks `/editor` and `/sign-in`. Both are also `noindex`.
- V: Lighthouse SEO is 100 on indexable pages. Editor's 63 is expected from `noindex`.
- V: Sitemap has 127 URLs and 0 `lastmod`.
- V: No structured data anywhere.
- V: Multiple H1s, as in 3.5.
- V: The 404 uses the home title and description.
- V: `og:url` is missing on `/contact`, `/privacy`, `/terms`.
- V: `/privacy` and `/terms` descriptions are thin.
- V: The base URL `https://getcvnest.com` is a placeholder, so every canonical and sitemap URL is currently unconfirmed.
- S: 120 template pages share structure and a short description. Thin-content risk is moderate. Unique `bestFor` text helps. Search data after launch would confirm.
- S: `noindex` plus `Disallow` means crawlers cannot see the `noindex` tag. Harmless unless pages are linked externally.

### 3.9 Security: Needs work

| Check | Result |
|---|---|
| Security headers | V: none served. No CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` or frame protection. `X-Powered-By: Next.js` is exposed. |
| XSS | V: script, image and SVG payloads in resume fields rendered as text. 0 dialogs, 0 injected elements. |
| Link schemes | V: `javascript:` values produced no links. `tests/unit/links.test.ts` covers obfuscated forms. |
| Photos | V: JPEG, PNG, WebP only, 15 MB input limit, resized to 400px. Backup photos have a size limit and pattern check. |
| External requests | V: 0 on all routes |
| Cookies | V: 0 |
| `npm audit` production | V: 0 vulnerabilities |
| `npm audit` all | V: 25 (16 moderate, 9 high), all reached through dev tools such as `eslint` and `puppeteer-core`, none shipped to visitors |
| Secrets scan | V: no secrets or `.env` files in the working tree. Only the words in docs and tests. |
| Browser data | V: resume data is plain, unencrypted, and disclosed in the app |

### 3.10 Privacy and claims

| Claim | Where | Status | Evidence or corrected wording |
|---|---|---|---|
| Free, no hidden fees | `copy.ts`, `/free` | TRUE today | V: no payment code. Wording "no paid plan" is present tense, keep it so. |
| No account | Many | TRUE | V: no auth code |
| No watermark | Many | TRUE | V: nothing added in print path |
| 110+ templates | Many | TRUE | V: 120, test-protected |
| Stored in your browser, not on our servers | Many | TRUE | V: no resume data in requests in tests; 0 external requests |
| Never uploaded | `/free` | TRUE for our code | V for the app. Add the extensions and sync line. |
| Not sent to any third party | `PrivacyNote.tsx` | PARTLY TRUE | Our app sends nothing, but the user's extensions or sync can. Use: "We don't send it anywhere. Your own browser extensions or sync settings are outside our control." |
| Restore it in any browser | `copy.ts` | PARTLY TRUE | V in Chromium code path; S for Safari. Use: "and restore it in another browser." |
| Selectable text, standard headings | `copy.ts` | TRUE | V: text extraction and tagged PDFs in Chrome and Edge. "Standard headings" means ordinary words; custom titles are the user's. |
| Clean, text-based layouts | `copy.ts` | TRUE | V |
| Layout kept in PDF | FAQ | TRUE on tested browsers | V, Firefox differs slightly and the FAQ says so |
| Tested in Chrome, Edge, Firefox; not Safari or phones | FAQ | TRUE | V: desktop automated browsers on Linux only |
| ATS answer ("can't promise") | FAQ | TRUE | Honest as written |
| `ats` search tag on 14 templates | `templates.ts` | UNVERIFIED | V: internal search tag implies suitability, untested with real parsers. Rename to `simple layout` or similar. |
| "Try Chrome, Edge, Firefox or Safari" | `usePdfExport.tsx` | UNVERIFIED | Implies Safari works. Use: "Try Chrome, Edge or Firefox on a computer." |
| Accounts planned | `/sign-in` | UNVERIFIED promise | You have not decided. Use: "There are no accounts. You don't need one." |
| Full terms before the editor launches | `/terms` | **FALSE once live** | The editor already exists. Replace at launch. |
| Autosave | Many | TRUE | V, in this browser |
| "Photo kept private" | `copy.ts` | TRUE for our code | V |
| Speed claims | None found | n/a | V |

### 3.11 Copy and brand: Needs work

Placeholders (V):

- `CVNest` in `src/data/site.ts` flows everywhere. It also appears hard-coded in `README.md` and in `docs/accounts-plan.md`.
- `getcvnest.com` is in `src/data/site.ts:6` and `README.md:5`.
- Contact address is missing on `/contact`.
- `/privacy` and `/terms` are holding pages.
- Internal `folio` key names remain. They are invisible to users, and changing them would need a migration, so leave them.

Wording (V):

- Straight apostrophes in `/free` ("What's free") but curly in `copy.ts`.
- Em dashes in template link labels such as "Minimal — Typography focused".
- Title styles differ: "What's Free" vs "What's free".
- `PrivacyNote.tsx` recommends a PDF for safety rather than a backup, though only a backup can be restored.

Browser-only wording that changes with accounts: every `ACCOUNTS` string in `copy.ts`, plus `site.ts` (`siteDescription`, `freeFeatures`), `/about`, `/free`, `/privacy`, `/sign-in`, `PrivacyNote.tsx`, `src/app/editor/page.tsx` metadata, `README.md`. The non-`copy.ts` ones are not marked.

### 3.12 Code quality: Good

- V: Exact lint output: 0 errors, 4 warnings: 3 `<img>` warnings (`PhotoField.tsx:103`, `ProfileCard.tsx:39`, `DesignTemplate.tsx:570`) and `'_previous' is assigned a value but never used` (`resume-storage.ts:276`).
- V: TypeScript passes.
- V: No skipped or `.only` tests.
- V: Unit tests 73/73.
- V: Chrome and Edge: all suites pass except `entries`.
- Firefox: `pdf-firefox` and `zoom-firefox` pass (V).
- V: Test weaknesses: fixed `sleep` calls are timing-sensitive, the keyboard flow runs only in Chromium, and Firefox runs only two suites.
- V: `ResumeEditor.tsx` is large at about 600 lines, and is worth splitting after launch, not before.
- V: Outdated with major versions behind: `eslint` 10, `typescript` 7, `puppeteer-core` 25, `@types/node` 26. `lucide-react` has a minor update. No urgent upgrade.
- V: `README.md` calls `getcvnest.com` the production domain, which is unconfirmed. S: the rest looks accurate, from reading its first 60 lines only.
- V: No `engines` or `.nvmrc`. README says Node 20.9+.
- V: `LICENSES.md` is complete for fonts, with items to verify.

### 3.13 Template catalog: Good, thin spots

V: no two templates have identical structure. The closest structural pairs (lower = closer, 0 to 1 scale):

| Pair | Distance | Recommendation |
|---|---|---|
| `frame` ~ `scholar` | 0.17 | Restyle one |
| `tessera` ~ `springboard` | 0.27 | Keep, review visually |
| `classic` ~ `scholar` | 0.31 | Keep |
| `fathom` ~ `sunroom` | 0.32 | Keep, review visually |
| `classic` ~ `fellowship` | 0.33 | Keep |
| `coral` ~ `launch` | 0.33 | Keep, review visually |

- V: Same fonts and accent: `clarity`, `slate`, `portrait` and `vertex`, `studio`, `prism`. Different structure, so keep.
- V: Long-content weak spots: `obsidian`, `plainview`, `almanac`. Keep, and optionally tighten after launch.
- V: Short-content empty look: the eight listed in 3.3. Keep, because this depends on content.
- The templates freeze stays. Any restyle is post-launch and needs your approval.
- S: The distance measure reads design settings, not pixels. A side-by-side visual review would confirm.

## 4. Launch readiness

**(a) Code work:** finish Step 1, add security headers, fix H1s, placeholder contrast, editor label mismatch and footer tap height, add "Good to know", privacy line, 404 title, `lastModified`, structured data, separate `SITE_URL`, claim fixes in 3.10.

**(b) Content and wording:** real privacy page, terms, contact and about text, consistent punctuation, recommend backup in `PrivacyNote.tsx`.

**(c) Legal and business:** final brand, domain, trademark check, controller name, contact address, governing country, lawyer review, font and template rights.

**(d) Hosting and operations:** choose host, deploy method without git, HTTPS, HSTS, domain, source backup, rollback copy, uptime check that sends no user data, way to receive problem reports.

**(e) Your device testing:** Safari on Mac, iPhone, Android, VoiceOver, NVDA, real print dialogs in each browser (especially Firefox), real ATS parsers, low-end phone.

Could not verify:

- Safari, phones, real screen readers: not available here.
- Real print dialog clicks: tests call the print engine, not a human dialog.
- Real ATS parsers: none available.
- Hosted performance and headers: not deployed.
- Font download origin: not recorded.

## 5. Risk register

| Risk | Severity | Likelihood | What could go wrong | How to reduce | Owner |
|---|---|---|---|---|---|
| No source backup | **High** | Medium | Disk failure loses everything. The remote is gone, and the backup bundle was deleted. | Copy the project folder, including `.git`, to an external drive or other private storage today | You |
| Users lose resumes | High | Medium | Cleared data, Safari eviction, new device | Backup reminders exist; add clearer note and restore guidance | Both |
| PDF fails on phones | High | Medium | Print flow on iOS or Android is untested | Test on real devices, and disclose until then | You, then me |
| Wrong claims | High | Low–Medium | Claims about Safari, third parties or ATS | Fix wording in 3.10 | Me |
| Legal exposure | High | Medium | Launching with no policy, controller or contact | Drafts, then lawyer | Both |
| Missing security headers | Medium | High until fixed | Framing or weaker defence | Step 2 | Me |
| Placeholder brand | Medium | High | Rebrand after indexing loses links and trust | Decide before launch | You |
| Accessibility gaps | Medium | Medium | Screen-reader problems unseen by automation | Real testing | You, then me |
| Font licensing detail | Medium | Low | Reserved names or provenance questions | Verify `LICENSES.md` items, lawyer | You |
| Template maintenance | Medium | Medium | Every engine change must pass 120 templates in 3 browsers, about 20 minutes | Keep freeze; keep tests | Both |
| Domain availability | Medium | Unknown | `getcvnest.com` may be unavailable to you | Check ownership | You |

## 6. Completion plan

| Phase | Goal and tasks | Files | Tests | Depends on | Effort | Done when | Blocks launch |
|---|---|---|---|---|---|---|---|
| 0 Safety (you) | Copy project off this machine | None | None | None | S, under 1 hour | Copy opens elsewhere | Yes |
| 1 Finish Step 1 | Fix warning and test | `resume-storage.ts`, `entries.test.mjs` | Full run | Your approval | S, 0.5 day | All suites pass | Yes |
| 2 Security | Headers and verification | `next.config.ts` | New header test, full PDF run | Phase 1 | M, 1 day | Real responses match; no CSP violations in Chrome and Edge | Yes |
| 3 Wording and claims | Good to know, privacy line, 3.10 fixes, punctuation | `copy.ts`, `PrivacyNote.tsx`, `usePdfExport.tsx`, pages | Copy checks | Phase 1 | S, 1 day | No FALSE or UNVERIFIED claim left | Yes |
| 4 Site and accessibility basics | H1s, contrast, labels, 404 title, `lastModified`, structured data, `SITE_URL` | `site.ts`, `sitemap.ts`, templates' heading tag, `globals.css` | H1 count, sitemap, JSON-LD tests, template regression | Phase 1 | M, 2 days | axe clean outside resume designs | Yes |
| 5 Drafts | Legal drafts and deploy plan | `docs/` | None | Brand helps | M, 1.5 days | Drafts ready for lawyer | Yes |
| 6 Real-world fixes | Fix what you find on devices | Unknown | Per bug | Your testing | L, 2–5 days | No high issue open | Yes |
| 7 Launch | Final placeholders, deploy, checks | `site.ts`, live pages | Smoke test on host | Brand, domain, legal | S, 1 day | Pre-launch list ticked | Is launch |

Code total: 7 phases after Phase 0, about 8.5–11.5 working days.

Running alongside, your tasks: brand and domain (Phase 3–7), lawyer (after Phase 5), hosting account (before Phase 7), device tests (after Phase 4).

Postpone: accounts, monetization, new templates, cover letters, keyword checker, import. Each adds testing or legal work without being needed to launch safely.

Freeze until launch: template designs, template count, storage format, PDF pipeline (except proven bugs), dependencies except security fixes.

### Definition of complete

- [ ] Project backed up off this machine
- [ ] All suites pass, 0 lint errors
- [ ] Security headers verified on the real host
- [ ] No claim marked FALSE or UNVERIFIED
- [ ] Brand, domain and contact are final
- [ ] Privacy Policy and Terms reviewed by a lawyer and live
- [ ] Safari, iPhone, Android tested
- [ ] VoiceOver and NVDA tested
- [ ] Real print dialogs tested
- [ ] Rollback tested once

## 7. Limitations of the project

### 7.1 Limitations that can hurt users or break a promise

| Area | Description | Label | Affects | Impact | Decision | Fix, effort |
|---|---|---|---|---|---|---|
| Storage | Browser-only, no sync; clearing data deletes resumes | V | All | High | Disclose | Editor note, S |
| Storage | Private windows lose data when closed | S (standard browser behaviour; not tested) | Private users | High | Disclose | Editor note, S |
| Storage | Safari may evict storage | S (test on Safari) | Apple users | High | Disclose, test | Note, S |
| Storage | Backup depends on the user's habit | V | All | Medium | Accepted, reminder exists | Stronger reminder, S |
| Storage | Large restore may exceed localStorage | S (large-file test) | Heavy users | Medium | Fix or test before launch | Test and message, S |
| Restore | Replace has no undo; merge can duplicate | V | Restore users | Medium | Disclose in dialog | Confirm wording, S |
| PDF | Depends on print window; user can choose wrong destination, or remove nothing | V (design) | All | Medium | Disclose | Good to know, S |
| PDF | Browser margins and headers settings can alter output | S (real dialogs) | All | Medium | Disclose | Guidance, S |
| PDF | Phones untested | V (untested) | Phone users | High | Test before launch | Your tests, M |
| PDF | Firefox differs slightly; thin strips on coloured sidebars | V (FAQ says so) | Firefox users | Low | Already disclosed | None |
| PDF | Page breaks can leave small last pages | V | Long resumes | Low | Accepted | Later |
| PDF | Two-column reading order may confuse parsers | V (layout text), S (real parser effect) | Applicants | Medium | Disclosed in FAQ | Filter by layout, M |
| Preview | Page label off by one in 33% of long cases | V | All | Low | Accepted with "about" | Improve estimate, M |
| Accessibility | Screen readers untested | V (untested) | Blind users | High | Test before launch | Your tests |
| Accessibility | Drag is pointer-based; keyboard alternative exists. Touch set up (`touch-none`) but untested. | V code, S device | Phone users | Medium | Test | S |
| Accessibility | 26 H1s on home | V | Screen-reader users | Medium | Fix | S–M |
| Security | Browser data is not encrypted | V | Shared computers | Medium | Already disclosed | None |
| Privacy | Extensions and sync can read data | S (general browser behaviour) | All | Medium | Disclose | Step 3 line, S |
| Claims | Items in 3.10 | V | All | Medium | Fix | S |
| Operations | No error reporting, so we won't know about failures | V | All | Medium | Accept, with contact channel | Contact, S |
| Business | No legal pages or contact | V | All | High | Fix | Phase 5 and lawyer |

### 7.2 Missing features

| Area | Description | Label | Affects | Impact | Decision | Fix, effort |
|---|---|---|---|---|---|---|
| Sync | No accounts or sync | V | Multi-device users | Medium | Accepted | Later, L |
| Editor | Undo covers only deletions | V | All | Medium | Accepted | Later, M |
| Editor | No rich text | V | Some | Low | Accepted | Later, M |
| Customize | No colours, fonts or spacing; design stores only template and page size | V | Design-minded users | Medium | Accepted | Accent choice later, M |
| Import | No PDF, DOCX or LinkedIn import | V | Switchers | Medium | Postponed | L |
| Export | No DOCX or TXT | V | Applicants asked for Word | Medium | Postponed | L |
| Cover letters | None | V | Applicants | Medium | Postponed | M |
| Language | English interface, no RTL | V | Non-English users | Medium | Disclose in FAQ | L |
| Spell check | Left to browser, no control | V | All | Low | Accepted | None |
| Validation | Date and field checks are light | S (review forms) | All | Low | Accepted | M |
| Photos | JPEG, PNG, WebP only; HEIC refused | V | iPhone users | Medium | Test on iPhone | S–M |
| Performance | Not tested on low-end phones | V (untested) | Budget phones | Medium | Test | Your tests |
| Operations | No analytics, by design | V | Us | Low | Accepted | None |
| Templates | Most differences are layout and style, and 93 have no photo | V | All | Low | Accepted | Gallery filters already help |
| Devices | Tested only on desktop Linux Chrome, Edge and Firefox | V | All | High | Test | Your tests |
| Hosting | No host or cost known | V | Launch | High | Decide | Deploy plan |

### Things users should be told

| Message | Place |
|---|---|
| "Your resume stays in this browser. Download a backup so you can get it back." | Editor note |
| "Private windows forget your work when closed. Use a normal window." | Editor note, FAQ |
| "Download PDF opens your browser's print window. Choose Save as PDF." | Editor note |
| "Chrome and Edge match the preview most closely." | Editor note, FAQ |
| "We haven't tested Safari or phones yet." | FAQ, until tested |
| "Browser sync, extensions, or saving a PDF to cloud storage are outside our control." | Privacy page |
| "Restoring with Replace removes the resumes currently here." | Restore dialog |
| "Two-column layouts can read out of order in some hiring software. A single-column template is the safer choice." | Template page, FAQ |
| "The site is in English and doesn't support right-to-left text yet." | FAQ |

## 8. Things to add or improve

Effort: S under 1 day, M 1–3 days, L more.

### Fix before launch

| Item | Why it matters | Effort | Risk | Depends on |
|---|---|---|---|---|
| Finish Step 1 | Tests must pass | S | Low | Approval |
| Security headers | Basic protection | M | CSP can break fonts, images or inline Next scripts, so re-run all suites | Phase 1 |
| One H1 per page | Screen readers, SEO | M | Heading tag change could shift 120 templates; style must stay identical and needs regression | Phase 1 |
| Claim corrections | Trust | S | Low | None |
| Good to know, privacy line | Prevents data-loss surprises | S | Low | None |
| Placeholder contrast, label mismatch | Accessibility | S | Palette frozen; only a small token change | None |
| Editor H1 on mobile | Page has no H1 when the preview is hidden | S | Low | None |
| `lastModified`, structured data, 404 title | SEO | S | Claim accuracy in structured data | None |
| Large restore handling | Data safety | S | Low | None |
| Legal and contact | Required | M | Needs your facts | You |

### Quick wins

| Item | Why it matters | Effort | Risk | Depends on |
|---|---|---|---|---|
| Rename `ats` tag | Avoids an implied claim | S | Search results change | None |
| Use backup in privacy note | Only backups restore | S | Low | None |
| Footer link height | Easier tapping | S | Low | None |
| Consistent punctuation | Polish | S | Low | None |
| Remove `featuredTemplateSlugs` | Less dead code | S | Low | None |
| HEIC message | iPhone photos are common | S | Low | Device test |
| Remove `X-Powered-By` | Minor hardening | S | Low | Headers |

### Strengthen what makes this product different

None of these needs a server or changes the privacy promise, unless noted.

| Item | Why it matters | Effort | Risk | Depends on |
|---|---|---|---|---|
| Local keyword checker | Tailoring without uploading | M | Must stay in the browser; avoid implying ATS scoring | After launch |
| Cover letter builder | Same data, same templates | L | New print path, more tests | After launch |
| Accent choices that pass contrast | Personal touch | M | 120-template test matrix grows | Engine change |
| One-page density option | Common need | L | Page-fit bugs across 120 templates | After launch |
| Template filters by layout, photo, length | Faster choice, some data exists | S–M | Low | None |
| Better empty states and onboarding | Fewer drop-offs | S | Low | None |
| Keyboard shortcuts | Faster editing | S | Conflicts with browser keys | None |
| Editor dark mode, paper stays white | Comfort | M | Contrast re-check | Palette |
| JSON export polish | Trust and portability | S | Low | None |
| Print and PDF guide | Fewer support issues | S | Must match real tests | Your tests |
| Offline mode | Works without connection | M | **Service worker adds caching risk.** No privacy change. | Hosting |
| Tailoring helper | Per-job versions from duplicates | M | Low | None |

### Later, after launch

| Item | Privacy | Legal | Cost | Testing | Decide first |
|---|---|---|---|---|---|
| Accounts and sync | **Changes the promise**: data on a server | Full data duties | Ongoing database and email | Large | Why, and for whom |
| Monetization | Possibly payment data | Tax, refunds, terms | Fees | Medium | Model; "free" wording |
| Share links | **Needs a server**, public data | Takedown and abuse | Storage | Medium | Expiry, consent |
| AI features | **Sends text to a provider** unless local | Processor terms | Per use | Quality review | Provider, disclosure |
| Import parsers | Local is possible | Low | Low | Many file types | Local only? |
| DOCX export | None if local | Low | Low | Word checks per template | Which templates |
| More templates | None | Font and design rights | Time | +3-browser runs | Whether users need them |

### Do not do

| Item | Why not | Effort avoided | Risk avoided |
|---|---|---|---|
| More templates before launch | 120 is more than enough, and each adds test load | M+ | Regression |
| Analytics or third-party scripts | Breaks the current privacy position | S | Claim and CSP damage |
| ATS score or guarantee | Cannot be proven | M | False claim |
| Renaming `folio` keys | No user value; migration risk | S | Data loss |
| Dependency major upgrades now | No shipped vulnerability | M | Regressions |
| Splitting `ResumeEditor.tsx` before launch | Safe later | M | Regressions |
