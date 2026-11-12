# CVNest: Phase 3 completion report (deployment reliability and data durability)

**Date:** 2026-11-05
**Branch:** `phase-3-deployment-data-safety`, from `origin/main` at `8141108`
**Scope:** deployment pipeline audit, a test-before-deploy strategy, release verification, deployment documentation, a browser-storage durability audit, the ME-02 investigation and plan, and the ME-16 investigation.
**Not done, by instruction:** no deploy, no merge, no push to `main`, no Cloudflare or GitHub settings changes, no ME-02 implementation, no ME-16 change, no dependency changes, and no storage key, backup format or migration changes.

---

## 1. Initial repository and branch state

| Item | State |
|---|---|
| Local `main` | `2532d99`, 2 commits behind `origin/main` (not updated; not needed) |
| `origin/main` after `git fetch` | `8141108` "Merge pull request #3 from adil-ramzan/phase-2-security-hardening". Contains `8141108` (it is the tip). Author and committer Adil Ramzan. |
| Uncommitted change | `src/components/layout/SiteHeader.tsx`, one line: the header loses `bg-canvas/90 … backdrop-blur-sm` and becomes `bg-canvas`. **Left exactly as it was** in the main working tree: not staged, stashed, committed or copied into the Phase 3 branch. |
| Branches | local `main`, `phase-2-security-clean`, `phase-2-security-hardening`, `redesign-ui`, `staging`; remote `main`, `phase-2-security-hardening`, `checkpoint/phase-0-1`. All kept. |
| Worktrees | Three from an earlier session under `/tmp/…/b0608065…/` (kept). |
| Phase 3 worktree | `git worktree add -b phase-3-deployment-data-safety … origin/main`. The upstream that `git worktree add` set (`origin/main`) was **removed straight away**, so a bare `git push` could never target `main`. The worktree was later moved from `/tmp` (a 7.5 GB tmpfs, 80% full, where the build hit "Disk quota exceeded") to `/home/adil-malik/cvnest-phase3-worktree`. This was done by removing and re-adding the worktree before any commit, so nothing was lost. |

---

## 2. Deployment pipeline findings

All facts below come from GitHub check runs, check suites and rulesets (via `gh api`), read-only HTTP requests to the Workers, and the pinned Wrangler 4.156.0 source. The Cloudflare dashboard was not read.

### 2.1 What is deployed

| Worker | Finding |
|---|---|
| `cvnest` (https://cvnest.emadilramzan.workers.dev) | Serves `8141108` (Workers Builds version `32b32495-79df-4d63-b92b-0d6bf11be3c3`). It is a **preview build**: canonical, Open Graph and sitemap URLs use `https://cvnest-preview.emadilramzan.workers.dev`; robots meta and `X-Robots-Tag` are `noindex, nofollow`. All Phase 2 security headers are present. `scripts/check-deployment.mjs` result: 49 of 49 checks pass with `--canonical https://cvnest-preview.emadilramzan.workers.dev`. With its own URL expected, 41 of 49 pass; the 8 failures are canonical and sitemap origins only. |
| `cvnest-preview` | Older, pre-Phase-2 build: missing COOP and `base-uri`/`frame-src`/`worker-src 'none'`, and `/editor` sends `X-Powered-By: Next.js` (44 of 49). |
| `cvnest-production` | HTTP 404: no production Worker. |

### 2.2 How Workers Builds behaves

| Finding | Evidence |
|---|---|
| The repository is connected to **`cvnest`**. | Check runs "Workers Builds: cvnest" from the `cloudflare-workers-and-pages` app, linking to `workers/services/view/cvnest`. |
| Every `main` push deploys `cvnest`; every non-`main` build fails. | `main`: `1d21795`, `a02080a`, `6acc6df`, `8141108` succeeded (from check-suite `head_branch`). Non-`main`: `01d51fd` (`checkpoint/phase-0-1`) and `2532d99` and `5ab72c1` (`phase-2-security-hardening`) failed. So "Builds for non-production branches" is on. |
| **No test gate.** | `8141108`: Workers Builds deployed at 09:50:22 UTC, and the CI "Browser suites (Chrome)" job finished at 09:58:05 UTC. Deploy and tests run in parallel. |
| The Wrangler config name doesn't pick the Worker in Workers Builds. | Wrangler 4.156.0 (`mergeSharedConfigArgs`) replaces the config name with `WRANGLER_CI_OVERRIDE_NAME` and **only warns**. Reproduced locally: `WRANGLER_CI_OVERRIDE_NAME=cvnest npx wrangler versions upload --dry-run` prints "Failed to match Worker name … Overriding using the CI provided Worker name" and carries on. This is how a `cvnest-preview` build is served by `cvnest`. |
| A `cvnest-preview` connection existed on 2026-11-01. | "Workers Builds: cvnest-preview" failed on `41e4e0e` and `1d21795`; none since. |
| `main` is not protected against unverified code. | Ruleset "Protect main" (26590341, active): only `non_fast_forward` and `deletion`. No classic branch protection (API returns "Branch not protected"). No GitHub environments or deployments. |

### 2.3 Why non-`main` builds fail

**Not determined.** GitHub carries no error text (the check output has only the build link), and the build logs are in the dashboard. One cause was ruled out. After `npm run build:preview`, `wrangler versions upload --dry-run` (Cloudflare's default non-production deploy command) packages the same Worker as `wrangler deploy --dry-run`: 8,514.69 KiB, 2,065.75 KiB gzip, `ASSETS` only. Wrangler only delegates `deploy` (not `versions upload`) to OpenNext, but the upload still packages correctly. The failure is in a dashboard-configured step or in the real upload. **Owner action:** open one failed build, for example https://dash.cloudflare.com/655e5c57005f03a74a90612f4c34ef66/workers/services/view/cvnest/production/builds/1909c9d2-c288-4543-9a80-9cdfbd7d4f41, and read the log.

---

## 3. Cloudflare integration limitations

- Workers Builds cannot be made to wait for GitHub Actions from the repository. It starts on push. A GitHub Actions workflow does **not** gate it.
- The dashboard settings (build command, deploy command, non-production deploy command, variables, token, production branch) could not be read and are not stated as facts anywhere.
- Rolling back `cvnest` from the CLI needs `--name cvnest`, because `wrangler.jsonc` has no environment for it. That command was not run.

### 3.1 Recommended gate (not applied: each needs an owner settings change)

1. **GitHub ruleset on `main`:** require a pull request, and require the status checks `Typecheck, lint, unit tests, build` and `Browser suites (Chrome)`; optionally require branches to be up to date. This gates everything that can reach `main`, so also what Workers Builds deploys. No second pipeline.
2. **Workers Builds build command** (dashboard): `npm run typecheck && npm run test:unit && npm run build:preview`. This gates the deploy itself, including on a direct push.
3. Not recommended now: deploying from GitHub Actions. It needs a Cloudflare API token secret, and the Workers Builds connection would have to be removed first, or both would deploy.

Also needed from the owner: decide whether `cvnest` or `cvnest-preview` is the long-term preview Worker and align `wrangler.jsonc` with it, and turn off or fix non-production branch builds.

---

## 4. Changes implemented

### 4.1 Deployment reliability

| Change | Detail |
|---|---|
| `scripts/check-deployment.mjs` (new) | Read-only post-deploy checks (GET only, no credentials): HTTP 200 on 9 pages plus `robots.txt` and `sitemap.xml`, a real 404, and every CSP directive. Exact values for `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP and HSTS, and no `X-Powered-By`. Also `noindex` in the header and meta tag, the canonical and sitemap origin, and immutable caching on a static script. Exits 1 on any failure. |
| `docs/deploy-cloudflare.md` | Rewritten "Current state", "Environments", "Workers Builds" (verified and unverified facts kept apart), and new "Gating deploys on tests", "Release checklist" and "Owner decisions" sections. "Production releases" and "Rollback" corrected. Removed: "only `cvnest-preview` is connected", "no `cvnest` Worker exists, and none should", "a wrong `--env` fails the build" and the unverified settings table. The guide never claimed that `cvnest-production` exists; it now states it doesn't. |
| `.github/workflows/ci.yml` | `durability` added to the browser-suite list (still verification only; no credentials). |

### 4.2 Data durability (DD-01)

**Defect:** when part of the saved data can't be read, `loadResumes` copies the raw text to `folio.resumes.v2.unreadable-backup`, but it ignored a failed copy. A failure is most likely exactly when storage is nearly full. The editor then said "A copy of the original data was kept" and the next autosave overwrote the only copy of the unreadable part. If the whole value was unreadable, the editor created a blank resume and saved it straight away, so everything was overwritten.

**Fix:**

- `src/lib/resume-storage.ts`: the copy's result is now kept. When it fails, `LoadResult` carries `unreadableNotCopied: true`. The field is absent otherwise, so ordinary results are unchanged. The in-place upgrade path is unchanged apart from a comment, because its own `backup-v{n}` copy protects the text there.
- `src/components/editor/useResumeStore.ts`: on that flag, saving pauses (new save status `held`), and the "recovered" notice that claims a copy was kept is not shown. A new `resumeSaving()` ends the pause and saves at once.
- `src/components/editor/ResumeEditor.tsx`: a warning notice, "Some saved data couldn't be read", with **Download a copy**. The button downloads the stored text exactly (`readRawResumes`), then resumes saving. If that read returns nothing, saving stays paused. The leave guard treats `held` as unsaved.
- `src/components/editor/EditorTopBar.tsx`, `src/lib/unsaved.ts`: the `held` indicator ("Not saving") and type.

No storage key, value format, backup format or migration step changed. Data in any state that loaded before still loads the same way. The only difference is that in the one failing case, the app no longer writes over data it couldn't copy.

### 4.3 Tests added

| File | Tests |
|---|---|
| `tests/unit/storage.test.ts` | 5: the flag when the copy fails (partial and whole-value), no flag when the copy works or nothing is unreadable, ordinary result shape unchanged, upgrade path unchanged. **Run against the original `resume-storage.ts`, the two detection tests fail** (16 pass, 2 fail), so they catch the defect. |
| `tests/unit/schema.test.ts` | 3 ME-16 characterization tests (section 7) |
| `tests/e2e/durability.test.mjs` (new suite, 21 checks) | 9 checks for the held state (notice, no false claim, indicator, nothing written while held, download equals stored text exactly, saving resumes, the held edit saved, notice cleared); 3 checks that the copy-kept path is unchanged; 8 ME-02 checks (section 6); no page errors. 3 of 3 consecutive runs passed. |

---

## 5. Browser storage and data-durability findings

| # | Area | Finding | Risk | Status |
|---|---|---|---|---|
| DD-01 | Unreadable data | See 4.2. | Silent loss when storage is nearly full | **Fixed** |
| DD-02 | Storage completely full | `getStorage()` writes a probe key. If even that fails, `loadResumes` returns `available: false` and no resumes. The editor shows a blank resume and "Storage unavailable". Nothing is written, so saved resumes are not lost, but they are hidden until space is freed. | Inaccessible data and an alarming message | Open. Proposed fix: if the probe fails but `getItem` works, load read-only with the existing download options. Needs approval (it changes load behavior). |
| DD-03 | Repeated incidents | One `unreadable-backup` slot; a second incident overwrites the first copy. | Rare loss of unreadable text | Open. Needs a new key, so approval. |
| DD-04 | Future in-place upgrades | If a `backup-v{n}` key already exists with different text, the upgrade writes without a fresh backup, and items the upgrade can't read are dropped. Not reachable for normal data today (schema 2 is current; v1 data uses the legacy key). | Low | Open; documented. Changing it is a migration change. |
| HI-01 | Eviction | Unchanged: no `navigator.storage.persist()`. Chrome and Safari decide silently; Firefox shows a permission prompt, which makes it a UX decision. The backup reminder can still be dismissed for good (IM-02). | High (the most likely real loss) | Open, owner decision |
| ME-01 | Destructive actions | Unchanged: "Replace all my resumes" and resume delete have no undo, and repeated merges duplicate. | Medium | Open |
| DD-05 | Multiple tabs | Last write wins. A `storage` event replaces the state and cancels a pending autosave in the receiving tab, so an edit made in the 400 ms before another tab's write is dropped. The "open in another tab" warning exists. | Low | Open; documented |
| DD-06 | Photos | Orphaned photos (from an interrupted restore or a Replace) are removed only after 24 hours, on a later load. Deleting a resume deletes its photo immediately (ME-01). | Low | Unchanged, by design |
| — | Autosave | Debounced at 400 ms, flushed on leave and unmount. A failed save sets "Not saved" with a backup download. The flush on page hide can't report a failure (the page is going away). | — | Sound |
| — | Corrupted data | Never throws. Readable resumes are kept and the original text is copied (Phase 2 tests). DD-01 closes the case where the copy fails. | — | Sound after DD-01 |

---

## 6. ME-02: investigation and proposed migration strategy

### 6.1 Current behavior (measured, Chrome)

`durability` builds a real backup in the browser: 10 distinct JPEG photos near the 1,500,000-character inline limit (13.6M characters in total) and 10 × 400,000 characters of text. The file is 17.6M characters, under the 25 MB file limit. The suite restores it with Replace and records every write to `folio.resumes.v2`:

```
writes: 17,604,919 chars, 10 inline photos, QuotaExceededError @1771ms
        4,005,881 chars, 0 inline photos, ok @2273ms
states: Saving… @1538ms → Not saved @1795ms → Saving… @1812ms → Saved locally @2297ms
```

(These are from run 1; runs 2 and 3 were the same to within about 70 ms.)

- The first save after a restore always fails: the photos are still inline when autosave runs. "Not saved" shows for about 15 ms.
- The photo-moving effect then saves each photo to IndexedDB and strips it from state. The next save succeeds, and everything is durable: 10 resumes, full text, 10 photos in IndexedDB, everything survives a reload, the photo displays at 1000 × 1000, and a new backup holds all 10 photos byte for byte.

**Untested, and where the risk is:**

- Firefox and Safari: different localStorage limits.
- IndexedDB unavailable or full: photos then stay inline, every save keeps failing, and "Not saved" persists. With Replace, the stored data is still the old set, so nothing already saved is lost, but the restore isn't saved.
- Text alone over the localStorage limit: the same persistent "Not saved".
- The tab closing during the brief failed state.

### 6.2 Proposed change (for approval; not implemented)

Make a restore **atomic: it is either saved in full, or nothing changes.**

1. On **Restore** in the dialog, before touching state: for each restored resume with `inlineData`, `savePhoto(photo.id, dataUrlToBlob(inlineData))`, then strip `inlineData`. If IndexedDB fails for a photo, keep it inline (today's fallback).
2. Build the resulting list (merge: current plus restored; replace: restored only), and write it with the existing `saveResumes` **before** calling `setResumes`.
3. If the write fails: don't change state. Show "There isn't enough browser storage to restore this backup. Nothing was changed." Delete only the photo records that this attempt created and that weren't there before. Today's data, in both merge and replace, stays as it is.
4. If it succeeds: `setResumes(next)` with `skipNextSave`, so autosave doesn't write it twice.
5. Optional, separate approval (ME-01): before a Replace, keep the current resumes in a new `folio.resumes.pre-restore` key. This is a **new storage key**.

**Migration steps:** none. The backup format stays the same (photos inline as data URLs). The stored format is the same as it already is after the photo move: photos referenced by `id` in IndexedDB. No schema version change and no migration step.

**Compatibility:** all existing backup files restore the same way. Stored data written by the new code is identical in shape to today's, so older app versions read it.

**Photo ids:** kept, as today. The photo field gives every upload a new `createId()`, so a reused id in a backup means the same original photo, and `put` overwrites it with the same bytes. To be fully safe against hand-edited files, the plan can compare bytes and give a new id on a mismatch.

**Interrupted restore** (tab closed mid-way): photos may be in IndexedDB with no reference. They're removed by the existing 24-hour cleanup, and stored resumes are untouched.

**Rollback:** code-only. Reverting the commit restores today's behavior, and no data needs converting back.

**Data-loss risks of the change itself:**

- (a) A bug in step 3's cleanup could delete a photo that another resume uses. Mitigation: only delete ids that didn't exist before the attempt, and test it.
- (b) Writing photos before state means a large restore takes a moment longer. Mitigation: show progress, and block the dialog from closing.
- (c) Atomicity changes what a person sees when storage is too small: an error instead of a restored-but-unsaved tab. This is safer, but different.

**Tests required:**

- The current `durability` ME-02 checks, updated so that no failed write is expected.
- A restore that can't fit: nothing changes, with both merge and replace.
- IndexedDB unavailable.
- A photo-id collision.
- The tab closing mid-restore: no orphan is referenced and old data is intact.
- Firefox runs of the same.

---

## 7. ME-16: compatibility findings

| Question | Finding |
|---|---|
| What happens | A number (or any non-string) in a text field loads as empty text (`str`), or as missing (`optStr`), and is dropped from bullet and string lists (`strList`). Schema v1 data has the same behavior (`text`, `strings` in `src/lib/migrations.ts`). |
| Why | Deliberate defensive validation of untrusted input: "Malformed values are coerced to safe defaults rather than thrown" (`resume-schema.ts`). The coercion treats anything that isn't a string the same way, so numbers fall in with objects and booleans. |
| Which data and formats | Storage (`folio.resumes.v2`, legacy `folio.resumes`) and backup files, in schema v1 and v2. **Only data the editor didn't write:** every editor input produces strings, and backups are `JSON.stringify` of that state. Affected: hand-edited backups, and files made by other tools. |
| Can changing it affect existing resumes | Not resumes the app wrote, since they contain no numbers. For stored data already loaded and re-saved, the number is already gone, and a change can't bring it back. A backup file that still holds numbers would restore them as text after a change. That's an addition, never a loss. |
| Recommendation | Convert finite numbers to their decimal text (`String(n)`) in `str`, `optStr`, `strList` and v1 `text`/`strings`. Keep `NaN`, `Infinity`, booleans, objects and arrays dropped as today. No schema version change is needed: this is input sanitization, not a model change. |
| Tests required | Replace the 3 characterization tests (`tests/unit/schema.test.ts`, "ME-16") with expected-conversion tests. Add a round trip through `readBackup` and `parseResumes`. Check that `title: 42` on a section gives "42", not the default title, or decide to keep titles strict. Re-run `malformed-data` (its `junk` cases include `0`, `-1` and `NaN`) and the editor-limit tests, since a number converted to text can exceed a limit. |

---

## 8. Tests executed and exact results

All runs are on the final code of this branch, built with `npm run build` (Chrome, plus Firefox where noted), on the owner's Linux machine.

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | Pass, no errors |
| Lint | `npm run lint` | 0 errors, 3 warnings (the same 3 `no-img-element` warnings as the baseline) |
| Unit tests | `npm run test:unit` | **244 of 244 pass**. The baseline `8141108` had 236; there are 8 new tests. |
| Production build | `npm run build` | Pass. `/editor` is dynamic as before (ME-08). |
| OpenNext build and dry run | `npm run build:preview`, then `npx wrangler deploy --dry-run --env preview` and `npx wrangler versions upload --dry-run` | Pass. 8,514.69 KiB, 2,065.75 KiB gzip; nothing uploaded. |
| 19 standard browser suites, **baseline** (`8141108`, before any change) | `npm run test:e2e -- a11y count customize data-model editor entries error-boundaries fields guard keyboard layout links open-section safety sample security template-picker templates zoom.test` | All 19 passed |
| 19 standard suites plus the new `durability`, **final code** | The same list plus `durability` | **All 20 passed. 434 PASS lines, 0 FAIL.** |
| `durability` repeat runs | `npm run test:e2e -- durability` × 3 (before the last button guard) and × 1 in the final run | 21 of 21, 4 of 4 times |
| PDF, pagination and Firefox suites, final code | `npm run test:e2e -- pdf pagination bullets zoom-firefox` | **All 7 passed** (`bullets`, `pagination`, `pdf-edges`, `pdf-firefox-blank`, `pdf-firefox`, `pdf`, `zoom-firefox`). 54 PASS lines, 0 FAIL. |
| New tests against the old code | `storage.test.ts` with the original `resume-storage.ts` | 16 pass, **2 fail** (the detection tests), as intended. The fix was then restored. |
| Post-deploy HTTP checks (read-only) | `node scripts/check-deployment.mjs …` | `cvnest`: 49 of 49 with `--canonical` set to the preview URL; 41 of 49 against its own URL (canonical and sitemap only). `cvnest-preview`: 44 of 49 (old build). |

ME-02 observation from the final run: `17,606,735 chars, 10 inline photos, QuotaExceededError` then `4,005,881 chars, 0 inline photos, ok` 487 ms later. The save states went `Saving… → Not saved → Saving… → Saved locally`.

No assertion was weakened. Three test-construction mistakes in the new `durability` suite were fixed during development:

- An object fixture that the sanitizer legitimately repairs into a resume.
- A template without a photo slot.
- A download hook that also captured photo blobs.

Existing resume compatibility is shown by:

- The unchanged migration, storage, malformed-data and schema tests (all pass).
- The `safety` and `data-model` suites.
- The "copy kept" checks, which show the existing recovery path behaves as before.

---

## 9. Existing functionality preserved

- Templates: no change to `src/data/templates.ts`, `src/components/resume/`, pagination or PDF code (`git diff --stat` in section 11). All 120 templates, designs and layouts are as before; the `templates` suite and the unit template count pass.
- Free creation, editing and PDF download with no account and no watermark: unchanged (no change to the PDF export or guest flow).
- Storage keys, value formats, backup format and migrations: unchanged. The only storage-code change is that `loadResumes` now reports a failed unreadable-data copy instead of ignoring it.
- Photo handling: unchanged. The `safety` photo checks and the `durability` ME-02 checks pass.
- Typography and styling options: unchanged (`customize` suite).
- Domain and canonical configuration (`package.json` build scripts, `wrangler.jsonc`, `src/data/site.ts`): unchanged. `getcvnest.com` is still described as intended and unconfirmed.
- Legal draft notices and the `[OWNER]`/`[LEGAL]` placeholders: untouched.
- The `SiteHeader.tsx` change in the main working tree: untouched.

---

## 10. Outstanding risks and owner decisions

1. **Gate deploys on tests:** apply ruleset option 1 and build-command option 2 (section 3.1), or decide otherwise. Until then, any push to `main` deploys even when CI fails.
2. **Read a failed non-`main` build log**, then turn off non-production branch builds or fix them. Pushing this branch will trigger another such Workers Build. Based on 3 of 3 previous non-`main` builds, it is expected to fail, and it can't change what `cvnest` serves.
3. **Choose the preview Worker** (`cvnest` or `cvnest-preview`) and align `wrangler.jsonc`, and the canonical URL, with it.
4. **ME-02:** approve or amend the atomic-restore plan (section 6.2), and separately the `pre-restore` key.
5. **ME-16:** approve or decline numeric-to-text conversion (section 7).
6. **HI-01:** decide on `navigator.storage.persist()` (Firefox prompt) and a recurring backup reminder.
7. **DD-02:** approve the read-only fallback when storage is completely full. **DD-03:** approve a second unreadable-copy key.
8. Production Worker and domain: still undecided. Nothing was created.

---

## 11. Files changed

| File | Change |
|---|---|
| `src/lib/resume-storage.ts` | DD-01: report a failed unreadable-data copy (`unreadableNotCopied`) |
| `src/components/editor/useResumeStore.ts` | `held` save status; `resumeSaving()`; no false "copy kept" notice |
| `src/components/editor/ResumeEditor.tsx` | "Some saved data couldn't be read" notice with Download a copy; the leave guard counts `held` |
| `src/components/editor/EditorTopBar.tsx` | `held` indicator text |
| `src/lib/unsaved.ts` | `held` in the save-state type |
| `tests/unit/storage.test.ts` | 5 DD-01 tests |
| `tests/unit/schema.test.ts` | 3 ME-16 characterization tests |
| `tests/e2e/durability.test.mjs` | New suite (21 checks): DD-01 and ME-02 characterization |
| `scripts/check-deployment.mjs` | New read-only post-deploy HTTP checks |
| `.github/workflows/ci.yml` | `durability` added to the browser job |
| `docs/deploy-cloudflare.md` | Corrected and extended with verified facts |
| `docs/comprehensive-product-audit.md` | Phase 3 status section |
| `docs/phase-3-completion-report.md` | This report |

Verified unchanged with `git diff --stat` against `8141108`:

- `src/data/` (templates, site URL)
- `src/components/resume/`
- `src/lib/migrations.ts`, `backup.ts`, `photo-store.ts`, `resume-schema.ts`
- `package.json`, `package-lock.json`
- `wrangler.jsonc`, `next.config.ts`

---

## 12. Git commit hashes

- Base: `8141108` (`origin/main`).
- Phase 3: a single commit on `phase-3-deployment-data-safety`, directly on top of `8141108`, authored and committed by Adil Ramzan <emadilramzan@gmail.com> with no co-author lines. A commit can't record its own hash, so read it with `git log -1 origin/phase-3-deployment-data-safety`; the final handover message also states it.
- Not created: any PR, merge, tag, or push to `main`.
