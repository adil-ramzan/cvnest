# CVNest: Phase 1 completion report (public content corrections)

**Dates:** 2026-11-04 to 2026-11-05
**Scope:** apply the approved public-content replacements P-1 to P-12 from `docs/phase-0-product-decisions.md` section 9, without changing functionality, visual design, URLs or configuration.
**Primary references:** `docs/phase-0-product-decisions.md`, `docs/comprehensive-product-audit.md`, `docs/legal/*.md`.

Nothing was committed, pushed, deployed or published. No Cloudflare setting, domain, environment variable, dependency or configuration file was changed.

---

## 1. Summary

| Outcome | Items |
|---|---|
| **Completed** | P-1, P-4, P-5, P-6, P-7, P-9; P-11 and P-12 verified (no change needed) |
| **Completed as drafts** (live content still needs owner information and legal review) | P-2, P-3 |
| **Withdrawn by owner decision** | P-8 |
| **Deferred** (blocked by an external dependency) | P-10 |

All public statements that the audit marked inaccurate (HI-05) are corrected in code. The live Privacy, Terms and Contact pages now carry draft content that is clearly labelled as not legally reviewed, with visible `[OWNER]` and `[LEGAL]` placeholders.

---

## 2. P-1 to P-12: item status

| # | Item | Status | What was done | File |
|---|---|---|---|---|
| P-1 | False Terms statement ("…published before the resume editor launches") | **Completed** | Removed. The page now shows the Terms draft from `docs/legal/terms-of-service-draft.md`, opening with: "This is a draft of our terms of service. It describes how CVNest works today, but it hasn't been legally reviewed or approved yet. Items in square brackets are still to be confirmed." | `src/app/(site)/terms/page.tsx` |
| P-2 | Privacy Policy | **Completed as draft** | Holding text ("Our full privacy policy will be published before launch") replaced by the Privacy draft, with the same style of draft notice. Placeholders kept. | `src/app/(site)/privacy/page.tsx` |
| P-3 | Contact page | **Completed as draft** | Holding text replaced by the Contact draft. Email shown as `[OWNER: contact email address]`. No form and no backend endpoint. | `src/app/(site)/contact/page.tsx` |
| P-4 | "not sent to our servers or to any third party" | **Completed** | Now: "{site name} doesn't send them anywhere, and there is no account or cloud sync. Browser extensions and browser sync are outside our control." | `src/components/editor/PrivacyNote.tsx` |
| P-5 | Advice to download a PDF as your copy | **Completed** | Now: "Download a backup from time to time. It's the only file you can restore into the editor." | `src/components/editor/PrivacyNote.tsx` |
| P-6 | "restore it in any browser" | **Completed** | Now "…restore it in another browser." | `src/data/copy.ts` |
| P-7 | "Try Chrome, Edge, Firefox or Safari." | **Completed** | Now "Try Chrome, Edge or Firefox on a computer." This is the only change in the file. | `src/components/editor/usePdfExport.tsx:127` |
| P-8 | Restore the FAQ browser and ATS disclosures | **Withdrawn by owner decision** | Both entries were added during Phase 1, then removed completely at the owner's request (section 4). Net change: none. | `src/data/copy.ts` |
| P-9 | `site.ts` "Placeholder brand name" comment | **Completed** (comment only) | Now "Product name. Final (Phase 0)." | `src/data/site.ts:1` |
| P-10 | `NEXT_PUBLIC_SITE_URL` → `https://getcvnest.com` | **Deferred** | Not changed. Phase 1 forbids URL changes, and the domain isn't purchased or attached. Canonical, Open Graph and sitemap URLs are unchanged. | `package.json` (unchanged) |
| P-11 | `/sign-in` wording | **Verified; no change** | "You will not need one to create and download your resume" matches the Phase 0 policy. | — |
| P-12 | "No account required" claims (`/free`, home FAQ, hero, footer, `freeFeatures`) | **Verified; no change** | All consistent with the policy. | — |

### Related change outside the P-list

- `src/data/copy.ts`, header comment only: the `ACCOUNTS` marker explanation now says to *review* these strings when optional accounts are added, instead of saying they "must change". This reflects Phase 0 (downloads stay account-free). No user-visible text changed.

### Deliberate departure from the drafts

The legal drafts begin with "available at [OWNER: final URL, intended `https://getcvnest.com`]". This wasn't put on the live pages: showing a domain that isn't yet owned could send visitors to a site the owner doesn't control. Every other draft placeholder is kept.

---

## 3. Files modified in Phase 1

Application source (content and comments only):

| File | Change |
|---|---|
| `src/app/(site)/privacy/page.tsx` | Draft Privacy Policy content (P-2) |
| `src/app/(site)/terms/page.tsx` | Draft Terms content; false sentence removed (P-1) |
| `src/app/(site)/contact/page.tsx` | Draft Contact content (P-3) |
| `src/components/editor/PrivacyNote.tsx` | P-4, P-5; imports `site` to use the product name |
| `src/components/editor/usePdfExport.tsx` | P-7 (one string) |
| `src/data/copy.ts` | P-6; header comment; FAQ entries added and then removed (net: no FAQ change) |
| `src/data/site.ts` | P-9 (comment) |

Documentation:

| File | Change |
|---|---|
| `docs/comprehensive-product-audit.md` | "Phase 1 status update" section; status notes on CR-02 and HI-05; P-8 withdrawal recorded |
| `docs/phase-0-product-decisions.md` | Phase 1 update note in section 9; P-8 marked withdrawn; owner item O-17 closed |
| `docs/phase-1-completion-report.md` | This report |

Not changed (verified with `git diff HEAD`): `src/lib/` (storage, migrations, backup, photo store), `src/data/templates.ts`, `src/data/resume.ts`, `src/components/resume/` (template rendering, pagination), `tests/`, `public/`, `package.json`, `package-lock.json`, `next.config.ts`, `wrangler.jsonc`.

---

## 4. Homepage FAQ: removal of the two entries

| Check | Result |
|---|---|
| "Which browser should I use?" removed from the data source (`src/data/copy.ts`) | **Yes**: question and answer deleted |
| "Will my resume work with applicant tracking systems?" removed from the data source | **Yes**: question and answer deleted |
| Other definitions in `src/` or `tests/` | None found |
| FAQ structured data (`FAQPage` / JSON-LD) | None exists on the site; the built homepage has 0 `application/ld+json` blocks |
| Either question or answer in built `index.html` | **0 occurrences** of each question and of each answer's opening text |
| Either question or answer in the homepage data payload (`index.rsc`) | **0 occurrences** |
| Remaining FAQ entries rendered | **7 of 7** present: "Is the resume builder free?", "Can I download my resume as PDF?", "Can I change templates?", "Do I need an account?", "Where is my resume stored?", "What happens if I clear my browser data?", "Can I keep more than one resume?" |

**FAQ behavior:** the FAQ isn't empty. Removing the two entries returned it to the same 7 entries it had before Phase 1, with unchanged layout and styling. No empty-state handling was needed or added.

---

## 5. Verification results

All results are from the final build, made after the FAQ removal, unless noted. Environment: Linux, Node.js v22.22.1, Google Chrome, Firefox with `geckodriver`, Poppler.

### 5.1 Project checks

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | **Pass** (exit 0) |
| ESLint | `npm run lint` | **Pass**: 0 errors, 3 warnings (the existing `no-img-element` warnings in `PhotoField.tsx`, `ProfileCard.tsx`, `DesignTemplate.tsx`) |
| Unit tests | `npm run test:unit` | **Pass**: 220 tests, 26 suites, 0 failed, 0 skipped |
| Production build | `npm run build` | **Pass**: 138 static pages generated |

### 5.2 Browser suites (`npm run test:e2e`, full run)

**Result: 24 of 25 suites passed. 447 checks passed, 1 failed, 0 skipped.** Runner exit code 1.

| Suite | Time | Result |
|---|---|---|
| `a11y` | 37 s | Pass |
| `bullets` | 135 s | Pass |
| `count` | 12 s | Pass |
| `customize` | 16 s | Pass |
| `data-model` | 40 s | Pass |
| `editor` | 16 s | Pass |
| `entries` | 28 s | Pass |
| `error-boundaries` | 8 s | Pass |
| `fields` | 67 s | Pass: every template checked at both page sizes with both resumes (480) |
| `guard` | 24 s | Pass |
| `keyboard` | 20 s | Pass |
| `layout` | 51 s | Pass |
| `links` | 7 s | Pass |
| `open-section` | 16 s | Pass |
| `pagination` | 413 s | Pass: preview page count matched the PDF in 225 of 225 cases (0 differ); Firefox has no pagination problems on any layout |
| `pdf-edges` | 199 s | Pass |
| `pdf-firefox-blank` | 22 s | Pass |
| `pdf-firefox` | 748 s | Pass: 480 PDFs; non-final pages at least 59% full |
| `pdf` | 189 s | Pass: 480 PDFs; non-final pages at least 82% full |
| `safety` | 38 s | **Fail: 1 check**, "Warning clears when the other tab closes". The other 28 checks passed. |
| `sample` | 18 s | Pass |
| `template-picker` | 7 s | Pass |
| `templates` | 21 s | Pass |
| `zoom-firefox` | 11 s | Pass |
| `zoom` | 27 s | Pass |

### 5.3 The `safety` failure

- **Rerun:** `npm run test:e2e -- safety`, 5 times in a row, on the same build. **All 5 passed, 29 of 29 checks each**, including the check that failed.
- **Relation to Phase 1:** none found. The check concerns the two-tab warning (`src/components/editor/useOtherTabs.ts`). That file and `tests/e2e/safety.test.mjs` are unchanged since the last commit, and Phase 1 changed only text.
- **Likely cause (inference, not proven):** after closing the second tab, the test waits a fixed 1.5 s (`sleep(1500)`). The warning clears either when the closing tab sends a "leave" message on `pagehide`, or after a 10 s staleness timeout (`GONE_AFTER_MS`). If `pagehide` is late under the load of a full run, 1.5 s isn't enough. This matches audit finding ME-11 (fixed sleeps are timing-sensitive). The check also passed in the full audit run on 2026-11-04.
- **Status:** recorded as an intermittent test failure. Not fixed, because fixing it would change test code, which is outside Phase 1 scope.

### 5.4 An earlier, interrupted run

A full run on the build *before* the FAQ removal reached 8 suites (`a11y` to `error-boundaries`), all passing, and was then stopped on purpose so the FAQ removal could be rebuilt. Its typecheck, lint, unit and build steps also passed. The final run in 5.2 supersedes it.

### 5.5 Content checks on the built site

| Check | Result |
|---|---|
| "before the resume editor launches" on `/terms` | Absent |
| "before launch" on `/terms`, `/privacy`, `/contact` | Absent |
| Draft notice on `/privacy` and `/terms`; "still being set up" notice on `/contact` | Present |
| `[OWNER]` and `[LEGAL]` placeholders on `/privacy`, `/terms`, `/contact` | Present (section 6) |
| One H1 on each legal page | Yes |
| New PDF error message ("Try Chrome, Edge or Firefox on a computer.") in the client bundle | Present |
| "or Safari" in any client script | Absent |
| "restore it in another browser" on the homepage | Present |
| Repository sweep of `src/` for account, download, premium, watermark, storage, ATS, Safari and "before launch" claims | No statement contradicts `docs/phase-0-product-decisions.md` |
| Canonical, Open Graph and sitemap URLs | Unchanged (no URL or environment change made) |
| 120 templates | `src/data/templates.ts` unchanged; `count` suite passed; `pdf` and `pdf-firefox` exported all 120 templates |
| Storage keys and migrations | `src/lib/` unchanged; `data-model` and `safety` storage checks passed |

---

## 6. Remaining legal placeholders (visible on live pages)

These are intentional and must be filled by the owner, or by a lawyer, before the pages are final.

| Page | Visible placeholders |
|---|---|
| `/privacy` (14) | Date of approval; legal name of operator; postal address (×2); email address (×3); hosting provider description and naming [LEGAL]; request logs, retention and provider role [OWNER/LEGAL]; browser-storage notice or consent [LEGAL]; legal basis [LEGAL]; jurisdiction-specific rights and authority [LEGAL]; minimum age [OWNER/LEGAL]; international transfers [LEGAL] |
| `/terms` (11) | Date of approval; legal name; templates-remain-free commitment [OWNER]; licence scope [LEGAL]; free-features commitment [OWNER/LEGAL]; warranty disclaimer [LEGAL]; limitation of liability [LEGAL]; governing law [OWNER/LEGAL]; dispute venue and consumer carve-outs [LEGAL]; email address; postal address |
| `/contact` (3) | Contact email; privacy contact; operator legal name and postal address |

---

## 7. Remaining owner actions

From `docs/phase-0-product-decisions.md` section 8 (O-17 is closed by P-1):

| # | Needed |
|---|---|
| O-1 | Confirm `getcvnest.com` is registered or obtainable |
| O-2 | Trademark or name check for "CVNest" |
| O-3 to O-7 | Operator legal name, contact email, postal address (if required), governing law, business registration (if required) |
| O-8, O-9 | Minimum user age; target markets |
| O-10 | Legal review: who and when |
| O-11, O-12 | Contact method (email recommended); optional response-time statement |
| O-13 | `www` or bare domain as canonical |
| O-14 | Analytics stance |
| O-15, O-16 | Accounts provider and region; whether cloud backup and sync are free or paid (when accounts are scheduled) |

Plus: attach the domain in Cloudflare and then apply P-10, which is owner-initiated and outside Phase 1.

---

## 8. Audit findings after Phase 1

### Completed

| ID | Basis |
|---|---|
| HI-05 (public claims inaccurate) | Every row corrected in code (P-1, P-4 to P-7) or verified (P-11). Verified in the built output (5.5). |
| CR-01 (download policy) | Resolved in Phase 0 (policy and docs). Phase 1 confirmed that public copy matches (P-11, P-12). |

### Partially completed

| ID | Done | Still open |
|---|---|---|
| CR-02 (legal and contact) | False statement removed; drafts live with visible draft notices | Owner information (O-3 to O-11); legal review; replacing placeholders |
| CR-03 (domain) | P-9 done | P-10 deferred; domain registration and attachment (O-1, O-13); trademark check (O-2) |
| HI-02 (Safari and mobile PDF) | PDF error message no longer suggests Safari (P-7) | FAQ disclosure withdrawn by the owner; device verification not done |

### Unresolved: no change in Phase 1

| ID | Note |
|---|---|
| HI-03 (ATS) | FAQ ATS disclosure withdrawn by the owner. The site makes no ATS claim, and the draft Terms disclaim any applicant-tracking-system guarantee. Verification harness, `templateStructure` label fix and `ats` tag rename are all outstanding. |
| HI-01, HI-04, HI-06 | Not in Phase 1 scope |
| ME-01 to ME-15 | Not in Phase 1 scope. ME-11 is reinforced by the intermittent `safety` failure (5.3). |
| LO-01 to LO-18, IM and MO items | Not in Phase 1 scope |

From the `docs/audit-final.md` mapping (audit section 8), these items are resolved in code by Phase 1:
- `PrivacyNote` recommended a PDF instead of a backup.
- "Not sent to any third party".
- "Restore it in any browser".
- "Try … Safari".
- The false Terms sentence.
- The privacy line about extensions and sync.

The removed-FAQ-disclosure items stay as mapped (owner decision). All other mapped items are unchanged.

### Unresolved content contradictions

None found in `src/`. One documented difference remains: `README.md` "Known limitations" still discloses that Safari and ATS compatibility are unverified, while the homepage FAQ no longer does. That's internal documentation, not public site content, and it's consistent with the owner's FAQ decision.

---

## 9. Confirmation: templates and guest functionality

- **All 120 templates are unchanged.** `src/data/templates.ts` and `src/components/resume/` have no changes. The `count` suite passed, and both PDF suites exported every template.
- **Guest functionality is unchanged:**
  - Resume creation, editing, autosave, backup and restore, and PDF export involve no code changes.
  - The only edits in editor files are the `PrivacyNote` text and one error-message string.
  - `src/lib/` (storage keys, migrations, photo store) is unchanged.
- **Downloads remain free, unlimited and account-free, with no watermark.** No download, account or watermark code was touched.
