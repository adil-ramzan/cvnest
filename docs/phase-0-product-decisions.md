# CVNest: Phase 0 product decisions

**Status:** approved product policy, recorded 2026-11-04.
**Supersedes:** any earlier statement in this repository that conflicts with it. That includes the "account required at download" flow previously described in `README.md` and assumed in `docs/comprehensive-product-audit.md` (CR-01).
**Audit reference:** `docs/comprehensive-product-audit.md` (primary), `docs/audit-final.md` (historical).

This phase is documentation only. No application code, configuration, dependency, deployment or Cloudflare setting was changed. Where a decision requires a code change, it is listed under [Pending implementation](#9-pending-implementation-not-done-in-phase-0) for a later phase.

---

## 1. Official product decisions

| Topic | Decision |
|---|---|
| Product name | **CVNest** (final; no longer a placeholder) |
| Intended permanent domain | **`getcvnest.com`** (intended; not yet purchased or configured; see section 5) |
| Positioning | **Free ATS-friendly resume builder** (see the claim rule in section 1.1) |
| Resume creation, editing, autosave | Free, no account required |
| All 120 existing templates | Free, permanently |
| PDF downloads | Free, unlimited, **no account required** |
| Watermarks | None, ever, on any free output |
| Existing guest resumes | Users keep access to them. No change may remove or lock guest data. |
| Accounts | Optional. Never required to create, edit, preview, save locally, back up locally, or download a PDF. |
| PDF generation | Stays in the browser (print-based export). No server-side PDF generation. |

### 1.1 Rule for the "ATS-friendly" positioning

"ATS-friendly" is the intended positioning, but the audit found it **not yet verified** (HI-03). Until the ATS verification in HI-03 is complete:

- Don't state or imply that CVNest resumes, or any specific template, are guaranteed to pass applicant tracking systems.
- Accurate, verified wording may be used: "clean, text-based layouts", "selectable text in your PDF", "standard section headings".
- Once verified, "ATS-friendly" may be applied to the verified set of templates only, with honest guidance that two-column, sidebar and photo layouts may parse less reliably.

---

## 2. Free features versus optional account benefits

| Capability | Free guest (no account) | With an optional account (future) |
|---|---|---|
| Create, edit and preview resumes | Yes | Yes |
| All 120 existing templates | Yes | Yes |
| Style controls (color, font, text size), Letter and A4 | Yes | Yes |
| Browser autosave | Yes | Yes |
| Multiple resumes, duplicate, rename, delete | Yes | Yes |
| Download PDF, unlimited, no watermark | **Yes** | Yes |
| Download and restore a backup file | Yes | Yes |
| Cloud backup of resumes and photos | No | Planned |
| Cross-device synchronization | No | Planned |
| Cloud recovery after browser data is cleared | No | Planned |
| Future premium services (section 3) | No | Possible, paid, opt-in |

Accounts add durability and convenience. They never take away anything a guest can do today.

---

## 3. Monetization policy

1. The free product in section 2 stays free. No existing free capability will become paid.
2. **All 120 existing templates stay free.** They will never be locked, moved behind a paywall or made premium.
3. Paid templates, if introduced, will be **newly created** templates added on top of the free 120, and clearly marked as premium.
4. Other possible premium services are additive only: for example cover letters, DOCX export or advanced tools. The audit lists candidates in section 7.3. None is approved for build yet.
5. No paywall, sign-in wall or timed prompt may interrupt editing, previewing or downloading.
6. Before any paid offering launches, public statements that are true today must be reviewed. `/free` says "no subscription, no paid plan". The commitment "all 120 templates free" should be kept, and the wording changed only for the parts a paid offering would make untrue.
7. Not in scope now: authentication, subscriptions, payment processing, cloud storage and premium features.

---

## 4. Download policy

| Rule | Detail |
|---|---|
| Account | Never required to download a PDF |
| Limits | None on the number of downloads |
| Watermark | None |
| Gate | No download gate, sign-in wall or "sign up to download" prompt |
| Generation | Browser-based, through the print dialog ("Save as PDF"). No server-side PDF rendering, and no server-side rendering introduced to enforce accounts. |
| Account prompts | At most an optional, dismissible mention of account benefits (cloud backup and sync) **after** a successful download. Never before or instead of it. This matches `docs/accounts-plan.md` §7. |
| Privacy | Resume content isn't sent to a server to produce a PDF. The existing `pdf` test already checks that no resume content appears in network requests. |

---

## 5. Brand and domain decision

- **Name:** CVNest.
- **Intended permanent domain:** `getcvnest.com`.
- **Current state (unchanged in Phase 0):** the site runs at `https://cvnest-preview.emadilramzan.workers.dev` and `https://cvnest-production.emadilramzan.workers.dev`. Both are built with indexing off (`NEXT_PUBLIC_INDEXABLE=false`). The domain hasn't been purchased or attached. No Cloudflare setting, environment value or build script was changed.
- **Owner to confirm:** that `getcvnest.com` is registered to, or can be acquired by, the owner, and that a trademark check of "CVNest" has been done (section 8).

### 5.1 What the domain controls

When the domain is attached, these all derive from `NEXT_PUBLIC_SITE_URL` (set in the `build:production` script) and must point to `https://getcvnest.com`:

| Item | Source |
|---|---|
| Canonical URLs | `metadataBase` in `src/app/layout.tsx`, from `site.url` |
| Open Graph and Twitter URLs and images | Same |
| `sitemap.xml` URLs | `src/app/sitemap.ts` |
| `robots.txt` sitemap line (when indexable) | `src/app/robots.ts` |
| HSTS header | `next.config.ts` (added automatically for `https://` URLs) |
| Future auth callback URLs, cookies and email sender domain | Not built yet; see `docs/accounts-plan.md` |

Decide whether `www.getcvnest.com` redirects to the bare domain or the reverse, before launch.

### 5.2 Launch order

1. Owner registers or confirms `getcvnest.com` and adds it to Cloudflare. This is the owner's action, not part of Phase 0.
2. Attach it to `cvnest-production` as a custom domain (`docs/deploy-cloudflare.md`, "Moving to a custom domain").
3. Change `NEXT_PUBLIC_SITE_URL` in `build:production` to `https://getcvnest.com`, rebuild and deploy.
4. Only then set `NEXT_PUBLIC_INDEXABLE=true`, after the legal pages are final (section 7).
5. Don't promote the `workers.dev` URLs publicly at any point.

---

## 6. Browser storage implications

Guest resumes live in the visitor's browser: `localStorage` keys under `folio.*` and the IndexedDB database `folio`. Browsers isolate this storage **per origin** (scheme + host + port). Therefore:

- `https://getcvnest.com`, `https://www.getcvnest.com` and `https://cvnest-production.emadilramzan.workers.dev` are three **separate** storage areas. A resume saved on one is invisible on the others.
- **Changing the domain after users have saved resumes does not move their data.** An HTTP redirect sends the visitor to the new origin, where their storage is empty. Their resumes remain on the old origin, reachable only by visiting the old URL directly, and only while that URL still serves the app.
- Switching between `www` and the bare domain after launch has the same effect.
- The only migration path for guests is manual: download a backup on the old origin, then restore it on the new one. Users must be told before any move, and the old origin must keep working long enough for them to do it.
- Future accounts (cloud sync) would reduce this risk for signed-in users only.

**Consequences for the plan:**
- Use `getcvnest.com` (one chosen host, `www` or bare) as the only public address from the first day of public traffic.
- Treat any later domain or host change as a data-migration event that needs its own plan.
- The `folio.*` storage key names stay unchanged (decided in the earlier audit). Renaming them would need a migration and gives users nothing.

---

## 7. Legal-page requirements

Draft content is prepared in `docs/legal/`:

| File | Purpose | Status |
|---|---|---|
| `docs/legal/privacy-policy-draft.md` | Privacy Policy describing current behavior (guest, browser-only) | **Draft. Not legally reviewed or approved.** Needs owner information. |
| `docs/legal/terms-of-service-draft.md` | Terms of Service | **Draft. Not legally reviewed or approved.** Needs owner information. |
| `docs/legal/contact-page-draft.md` | Contact page content | **Draft.** Needs a contact address. |

Requirements before these drafts can be published:

1. Owner supplies the information listed in section 8.
2. A qualified lawyer reviews and approves the Privacy Policy and Terms for the owner's jurisdiction and target markets.
3. The texts are rewritten when accounts, cloud storage, analytics or payments are introduced. The drafts describe the product **as it is today**.
4. The live pages are replaced in a later implementation phase. They are application source (`src/app/(site)/privacy|terms|contact/page.tsx`) and weren't changed in Phase 0.
5. The live `/terms` page currently says "Our full terms of service will be published before the resume editor launches." That's false because the editor is live. The replacement text is in section 9 and must be applied in the first implementation phase.

No compliance claim (for example GDPR, CCPA or accessibility law) may be made on the site until the reviewed policy supports it.

---

## 8. Decisions and information awaiting the owner

| # | Needed | Why | Blocks |
|---|---|---|---|
| O-1 | Confirmation that `getcvnest.com` is registered to, or can be acquired by, the owner | Intended domain; nothing configured yet | CR-03 completion, launch |
| O-2 | Trademark or name-conflict check for "CVNest" | Avoid a forced rename after launch | Launch |
| O-3 | Legal name of the operator or data controller (individual or company) | Privacy Policy and Terms must name who is responsible | CR-02 |
| O-4 | Contact email address for privacy and support (for example on the domain) | Privacy Policy, Terms and Contact page | CR-02 |
| O-5 | Postal address, if required in the owner's jurisdiction or target markets | Some laws require a postal address for the controller or provider | CR-02 |
| O-6 | Country and governing law; place for disputes | Terms of Service | CR-02 |
| O-7 | Business registration or tax ID, if one exists and must be shown | Some jurisdictions require an imprint | CR-02 |
| O-8 | Minimum user age | Terms and Privacy Policy | CR-02 |
| O-9 | Target markets (for example EU or UK, US, others) | Determines which privacy laws the lawyer reviews against | CR-02 |
| O-10 | Name of the lawyer or service doing the legal review, and the date approved | Distinguishes draft from approved text | CR-02 |
| O-11 | Contact method: email only, or a contact form (a form would need a server endpoint and its own privacy disclosure) | Contact page | CR-02 |
| O-12 | Support response expectation, if any is to be stated | Contact page | Optional |
| O-13 | `www` vs bare domain as the canonical host | Origin is fixed after launch (section 6) | CR-03 |
| O-14 | Analytics stance (none, or cookieless first-party counts) | Privacy Policy wording; audit MO-04 | Later |
| O-15 | Accounts provider, region and data retention (when accounts are scheduled) | Privacy Policy update; `docs/accounts-plan.md` decisions 1, 3–6, 8 | Accounts phase |
| O-16 | Whether basic cloud backup and sync are free with an account, or a paid service | Policy allows either; affects copy and the monetization plan | Accounts phase |
| O-17 | ~~Interim wording for `/terms` until the reviewed Terms are ready (P-1)~~ | **Closed in Phase 1:** the draft Terms are published with a visible draft notice, and the false sentence is gone | — |

---

## 9. Pending implementation (not done in Phase 0)

Phase 0 forbids application-code changes. These source edits are needed to make the live site match this policy and the audit. They are scheduled for Phase 1 unless noted. The suggested text is ready to apply.

> **Phase 1 update (2026-11-04):** P-1 to P-7 and P-9 are implemented, and P-11 and P-12 were verified as needing no change. P-8 was implemented and then **withdrawn at the owner's request**: the two FAQ entries ("Which browser should I use?" and "Will my resume work with applicant tracking systems?") are not on the site. P-10 is deferred until the domain is attached. Details, including the exact wording used, are in `docs/phase-1-completion-report.md`. P-1 was implemented by publishing the Terms draft (with its `[OWNER]` and `[LEGAL]` placeholders and a visible "draft, not legally reviewed" notice) rather than a separate interim sentence, so owner item O-17 is no longer needed. Legal review and owner information (section 8) are still outstanding.

| # | File | Current text | Change | Audit ID |
|---|---|---|---|---|
| P-1 | `src/app/(site)/terms/page.tsx` | "Our full terms of service will be published before the resume editor launches." | Replace with the reviewed Terms. Until then, use an interim intro such as: "These terms are being finalized. CVNest is currently provided free of charge and as is." (wording to be confirmed by the owner) | CR-02, HI-05 |
| P-2 | `src/app/(site)/privacy/page.tsx` | Holding text ("will be published before launch") | Replace with the reviewed Privacy Policy (`docs/legal/privacy-policy-draft.md` after review) | CR-02 |
| P-3 | `src/app/(site)/contact/page.tsx` | "A contact address will be published here before launch." | Replace with `docs/legal/contact-page-draft.md` once O-4 is known | CR-02 |
| P-4 | `src/components/editor/PrivacyNote.tsx` | "They are not sent to our servers or to any third party" | "CVNest doesn't send them anywhere. Browser extensions and browser sync are outside our control." | HI-05 |
| P-5 | `src/components/editor/PrivacyNote.tsx` | "Download a PDF of your resume from time to time so you always have your own copy." | "Download a backup from time to time. It's the only file you can restore into the editor." | HI-05 |
| P-6 | `src/data/copy.ts` (features) | "…restore it in any browser." | "…restore it in another browser." | HI-05 |
| P-7 | `src/components/editor/usePdfExport.tsx:127` | "Try Chrome, Edge, Firefox or Safari." | "Try Chrome, Edge or Firefox on a computer." (until Safari is verified, HI-02) | HI-05, HI-02 |
| P-8 | `src/data/copy.ts` (FAQ) | Browser-support and ATS answers were removed in `52d0d39` | ~~Restore accurate disclosures (audit HI-02, HI-03)~~ **Withdrawn by owner decision (2026-11-04):** these two FAQ entries are not to appear on the homepage | HI-02, HI-03 |
| P-9 | `src/data/site.ts:1` | Comment "Placeholder brand name" | "Product name. Final (Phase 0)." Comment only; no behavior change | CR-03 |
| P-10 | `package.json` `build:production` | `NEXT_PUBLIC_SITE_URL=https://cvnest-production.emadilramzan.workers.dev` | `https://getcvnest.com`, **only** once the domain is attached (section 5.2) | CR-03 |
| P-11 | `src/app/(site)/sign-in/page.tsx` | "Accounts are planned for a future update. You will not need one to create and download your resume." | **Already consistent** with this policy; keep. Revisit when accounts ship, to describe optional cloud backup and sync. | CR-01 |
| P-12 | `/free`, home FAQ, hero, footer, `site.ts` `freeFeatures` | "No account required", "no sign-up, login or email needed", "Do I need an account? No." | **Already consistent**; keep. The `// ACCOUNTS` markers in `copy.ts` now mean "revisit when optional accounts are added", not "will become false". | CR-01 |

### Claims reviewed and found consistent with this policy (no change needed)

| Claim | Where |
|---|---|
| Free; all templates free; none locked or premium | `src/data/site.ts`, `/free`, home copy |
| No watermark | `src/data/site.ts`, home copy, template pages |
| No account needed to create and download | `/free`, home FAQ and hero, `/sign-in`, `/about`, footer |
| Resume stored in this browser, not uploaded | home copy, `/free`, `/privacy`, editor |
| "We can't promise" style ATS wording | None on the site today. No ATS claim is made; the positioning rule in section 1.1 applies before any is added. |
| PDF compatibility | No public claim beyond the error message in P-7 |
