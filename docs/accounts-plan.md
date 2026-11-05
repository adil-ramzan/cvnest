# Accounts and cloud sync: design plan

**Status:** plan only, nothing built. Awaiting approval.
**Date:** 30 October 2026. **Branch reviewed:** `redesign-ui`.

> **Purpose, as of Phase 0 (2026-11-04):** this plan describes **optional** accounts for cloud backup, cross-device sync and recovery, and a foundation for possible future premium services. Under the approved policy in `docs/phase-0-product-decisions.md`, accounts are **never** required to create, edit, save locally or download a PDF. There is no download gate, and PDFs stay browser-generated. The guest principles below ("never show a sign-in wall… or a block on any guest feature") are confirmed as policy. Decisions resolved by Phase 0 are marked in section 9. Implementation is not scheduled.

**Evidence labels**
- **[V]** VERIFIED: read in this repo, or in the provider's own page fetched on the date above.
- **[S]** SUSPECTED: reasoned or remembered, not confirmed. Re-check before relying on it.

Prices quoted below were on the provider's pricing page on that date. Treat them as things to re-check, not as commitments.

---

## 1. Current state

### How data is stored today

| Piece | Today | Accounts impact |
|---|---|---|
| Resume store | `localStorage` key `folio.resumes.v2`: `{ schemaVersion, resumes }` **[V]** | Stays the working copy for everyone |
| Legacy data | `folio.resumes` (v1), read once and never changed **[V]** | None |
| Upgrade backups | `folio.resumes.backup-v{n}` **[V]** | None |
| Damaged data | `folio.resumes.v2.unreadable-backup` **[V]** | Never sync this |
| Settings | `folio.editor-settings`: active resume, zoom **[V]** | None |
| Backup reminder | `folio.backup-state` **[V]** | Hide the reminder for synced resumes |
| Photos | IndexedDB database `folio`, store `photos`, keyed by photo id; resized to 400px JPEG **[V]** | New: upload to cloud storage |
| Schema | Version 2, in `src/data/resume.ts` **[V]** | Unchanged; sync metadata lives outside it |
| Migrations | `src/lib/migrations.ts`, per-version steps **[V]** | Reused on read |
| Validation | `sanitizeResume` in `src/lib/resume-schema.ts`, which doesn't import the template registry **[V]** | Reused on the server |
| Editing limits | `src/lib/resume-limits.ts`. The loader no longer cuts content **[V]** | The server must enforce its own limits |
| Autosave | 400ms debounce in `useResumeStore`, writes the whole list **[V]** | A sync step runs after it |
| Backup and restore | `src/lib/backup.ts`, embeds photos, validates, previews, merges or replaces **[V]** | Kept for all users; also used for "download my data" |
| Unsaved guard | `useUnsavedGuard` and `src/lib/unsaved.ts` **[V]** | `isAtRisk` gains a "synced" copy |
| Two tabs | `useOtherTabs` (BroadcastChannel) plus the `storage` event; last write wins **[V]** | One tab must own syncing |
| Newer-version guard | Saving stops if stored data is newer **[V]** | The same rule applies to cloud data |

**Server today:** no `src/app/api`, no middleware or proxy file, no auth code **[V]**. `next.config.ts` is empty, so there's no CSP yet **[V]**. The CSP is Batch 5, not yet started.

### Code the feature must not disturb

Guest mode depends on `useResumeStore`, `resume-storage.ts` and `backup.ts`. The rule for this project is that a guest session must make **zero** requests to any account endpoint, and the existing suites must pass without any account environment variables set.

---

## 2. Provider recommendation

**Recommended: Supabase** (hosted Postgres, Auth and Storage), used through our own Next.js route handlers.

| | Supabase | Firebase | Better Auth + own Postgres | Clerk |
|---|---|---|---|---|
| Covers auth, database and files | Yes **[V]** | Yes **[V]** | Auth only; database and files are ours | Auth only |
| Google and magic link | Yes **[S]** on both, details to confirm | Email link documented **[V]**; Google **[S]** | Magic link plugin documented, social sign-on listed **[V]**; we supply the email sender **[V]** | Yes **[S]** |
| Fit with Next.js App Router | Cookie sessions through `@supabase/ssr`, documented **[V]** | Client-first; server sessions take more work **[S]** | Framework-agnostic TypeScript **[V]** | Purpose-built **[V]** |
| Data isolation | Postgres row-level security **[V]** | Security rules **[S]** | Our own queries; RLS only if we add it | N/A |
| JSON resume storage | `jsonb` | Document model, natural fit; 1MB document limit **[S]** | `jsonb` | N/A |
| EU region | Frankfurt, Ireland, Paris, Stockholm and more **[V]** | Available **[S]** | Depends on database host | Check their terms **[S]** |
| Extra browser domains | None if all calls go through our server | Likely more **[S]** | None | Several, including Cloudflare and `clerk-telemetry.com` by default **[V]** |
| Lock-in | Low to medium: standard Postgres; auth users are portable with effort **[S]** | High: proprietary data model and rules **[S]** | Lowest | High for auth only |
| Way out | `pg_dump`, then replace auth | Export and rewrite the data layer | Already ours | Export users, replace auth |

**Why Supabase for this app**
- One vendor covers the three things we need, so the solo-developer operating load stays low.
- `jsonb` plus `id`, `user_id` and `updated_at` suits our resume objects, and Postgres gives us compare-and-swap for conflict detection.
- RLS gives a database-level guarantee that holds even if our route code has a bug.
- It works with no provider scripts in the browser, which keeps the "no third-party scripts" rule.
- The exit path is standard Postgres.

**Why not the others**
- **Clerk:** good auth, but it still leaves us needing a database and storage, and its default CSP brings in third-party hosts **[V]**. That conflicts with our no-third-party direction.
- **Firebase:** workable, but with the most lock-in.
- **Better Auth + own Postgres:** the strongest option for ownership, and the fallback if Supabase is rejected. It means running more ourselves, including email delivery. Its licence isn't confirmed **[S]**.

### Costs to check yourself

| Provider | Check on the pricing page |
|---|---|
| Supabase | On 30 Oct 2026 the Free plan showed 50,000 monthly active users, 500MB database, 1GB file storage, 5GB egress, and **free projects pause after 1 week of inactivity** with a limit of 2 active projects **[V]**. Pro showed 100,000 MAU, 8GB disk, 100GB storage, daily backups kept 7 days **[V]**. Check the Pro base price, compute add-ons and email limits. |
| Firebase | Spark and Blaze limits for Auth, Firestore and Storage, and whether Blaze is needed for Storage |
| Clerk | User allowance on the free tier (the page title said up to 50K users **[V]**), and paid plan terms |
| Better Auth | Library cost, plus Postgres hosting, storage and an email service |

**The free plan isn't suitable for production:** a paused project would stop sync for every user. Plan on a paid project at launch.

**Email:** magic links need reliable delivery. Budget for a transactional email service; built-in senders are usually for testing only **[S]**.

---

## 3. Architecture

### Principles

1. The browser copy is what the user edits, for guests and account users alike.
2. The cloud is a background copy. Typing never waits on the network.
3. **Nothing local is deleted automatically.** Not on sign-in, sign-out, conflict or error.
4. If sync is unavailable, the editor behaves exactly like guest mode.

### Components

```
Editor ──> useResumeStore ──> localStorage / IndexedDB      (unchanged)
                 │
                 ▼ changed resume ids
           Sync engine (src/lib/sync/)                      (new, account users only)
                 │  one tab holds the sync lock
                 ▼
           /api/resumes, /api/photos  (Next route handlers)
                 │  session cookie, size limits, sanitizeResume
                 ▼
           Supabase Postgres + Storage, with RLS
```

Sync metadata lives in a **new** key, `folio.sync-state`, not in the resume, so the resume schema doesn't change:

```ts
{ userId: string, cursor: string, items: { [resumeId]: {
    baseRevision: number | null,  // server revision this copy came from
    syncedUpdatedAt: number,      // resume.updatedAt at last successful sync
    photoId?: string,
    state: "synced" | "pending" | "conflict" | "local-only"
} } }
```

### Sync algorithm

**Versioning.** The server holds an integer `revision` per resume, raised only by the server. Device clocks aren't trusted for conflicts. `updatedAt` is used only for display and for detecting local changes.

**Push.** A resume is dirty when `updatedAt !== syncedUpdatedAt`.
1. Debounce 3 seconds after the last autosave, and also flush on hide.
2. `PUT /api/resumes/:id` with `{ data, baseRevision }`.
3. The server runs an atomic compare-and-swap: `update ... where id = $1 and user_id = $2 and revision = $3`.
4. One row updated: save the new revision and mark it synced. No row: return `409` with the server copy, and go to conflict handling.

**Pull.** On load, on regaining focus, on reconnect, and every 5 minutes while visible: `GET /api/resumes?since=<cursor>`. Clean resumes update silently. Dirty ones go to conflict handling.

**Offline queue.** The queue is simply "whatever is dirty". There's no separate list to corrupt, and the latest state always wins locally.

**Retry.** Exponential backoff with jitter: 5s, 15s, 60s, 5m, capped at 15m. Stop on `401`, `403` or `413` and show the reason.

**One syncer.** Use the Web Locks API so only one tab syncs **[S]**, with a BroadcastChannel fallback. Other tabs pick up changes through the existing `storage` event.

**Newer schema.** If a pulled resume has a higher `schema_version`, don't overwrite it locally. Keep the local copy and show the "update this page" message, matching our newer-data guard.

### Conflicts

There is no silent last-write-wins, and no field-level merging for version one.

| Local | Server | Result |
|---|---|---|
| Clean | Changed | Take the server copy |
| Changed | Same | Push |
| Changed | Changed | **Keep both**: ask the user. If they don't answer, nothing is lost |
| Changed | Deleted | Edit wins: restore the resume, and tell the user |
| Clean | Deleted | Remove locally, with Undo |
| Deleted | Changed | Keep the server copy, and tell the user |

Default resolution is to keep both: the server version stays as is, and the local one is saved as a new resume named "… (this device)".

### First sign-in with resumes already in the browser

| Situation | Behaviour |
|---|---|
| Browser has resumes, account is empty | Dialog: "Add these N resumes to your account?" Choose which ones, or Not now |
| Both have resumes | List both. Choice: **Add to my account** (default) or **Use my account's resumes here** |
| Same `id` on both | Treat as a conflict, using the table above |
| Choose "use account" | Local resumes are kept and marked `local-only`, not deleted |
| Browser is empty | Download silently |
| Ineligible resume (over a limit) | Stays `local-only`, with a stated reason |

**Shared browsers.** `folio.resumes.v2` is one list per browser. `folio.sync-state.userId` records the owner. If a *different* account signs in, nothing syncs until that person chooses. Without this, one person's resumes could upload to another's account. This case needs a dedicated test.

### Multi-device

Devices converge through pull. If the same resume is edited on two devices while both are offline, the second to reconnect gets the conflict dialog.

### Sign-out

| Option | Effect |
|---|---|
| **Sign out** (default) | Ends the session. Local resumes stay, and the editor returns to guest behaviour. If any resumes are unsynced, warn first |
| **Sign out and clear this browser** | Also removes local resumes, photos and sync state. Requires confirmation; offered only after a final sync succeeds, with **Download backup** beside it if sync fails |

### Backup reminder and unsaved guard

- `isAtRisk` gains a third safe copy: `copiedAt = max(lastBackupAt, lastExportAt, cloudSyncedAt)`. A synced resume isn't at risk, so the guard stays quiet.
- A `pending` or `conflict` resume stays at risk.
- The dialog text changes for account users: "Your latest changes haven't reached your account yet."
- The backup reminder is hidden for synced resumes. Download and Restore stay available to everyone.
- Stamping `lastBackupAt` or `lastExportAt` must not mark a resume dirty, because those stamps don't change `updatedAt` **[V]**.

---

## 4. Data model

```sql
create table public.resumes (
  user_id        uuid not null references auth.users(id) on delete cascade,
  id             text not null,          -- existing client id
  title          text not null,
  data           jsonb not null,
  schema_version integer not null,
  revision       bigint not null default 1,
  byte_size      integer not null,
  client_updated_at timestamptz,          -- display only
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  primary key (user_id, id)
);

create index resumes_user_changes on public.resumes (user_id, updated_at);

create table public.photos (
  user_id    uuid not null references auth.users(id) on delete cascade,
  id         text not null,
  path       text not null,
  byte_size  integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
```

**Why the key is `(user_id, id)`:** resume ids are not always UUIDs. `createId` has a non-UUID fallback, and v1 data may carry older ids **[V]**. A composite key also means two accounts importing the same resume can't collide.

**Backward compatibility:** the resume JSON is stored as is. No new resume fields are required.

### Proposed limits (your decision)

| Limit | Proposal | Reasoning |
|---|---|---|
| Resumes per account | 50 | Generous for individuals |
| Size per resume, excluding photo | 256KB | Our long test resume is about 8KB **[V]**; `LIMITS` allow far more, but this covers real use **[S]** |
| Photo size | 1MB | Photos are resized to 400px JPEG before storing **[V]** |
| Requests | See section 5 | |

A resume over the limit stays `local-only` with a clear message. It's never cut.

### Photos: use file storage, not inline

- Inline photos bloat every sync and would use up database size quickly.
- Use a private bucket at `photos/{user_id}/{photo_id}.jpg`, with RLS on the path.
- Serve through our own `/api/photos/:id`, so the browser needs no provider domain.
- Reference by the existing `photo.id`. Upload the photo first, then the resume.
- Keep the IndexedDB copy as the local source.

### Reusing validation and migrations

- On write, a route handler runs `migrateResume` then `sanitizeResume`, and stores the sanitised result.
- `resume-schema.ts` has no registry dependency **[V]**. `migrations.ts` imports only `@/data/resume` and the schema **[V]**.
- `parseResumes` in `resume-storage.ts` pulls in `resumes.ts`, which imports the template registry **[V]**, so the server should call the two functions directly.
- `sanitizeResume` no longer applies limits **[V]**, so size checks must happen first, on raw bytes.
- On read, the client validates again and treats the response as untrusted.

---

## 5. Security plan

**Row-level security**
```sql
alter table public.resumes enable row level security;
create policy "own rows" on public.resumes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```
The same applies to `photos` and to the storage bucket by path. Supabase's `service_role` bypasses RLS and must stay server-side **[V]**. Its docs also note that adding policies doesn't remove table privileges **[V]**, so review grants too.

**Sessions and cookies.** Use `@supabase/ssr` cookie sessions **[V]**. A `proxy.ts` is needed to refresh tokens, because Server Components can't write cookies **[V]**. Next 16 renamed the middleware file to `proxy` **[V]**. Cookies should be `Secure`, `SameSite=Lax`, and `HttpOnly` if the chosen setup allows it **[S]**. On the server, protect data with `getClaims()`, not `getSession()`, which the Supabase guide warns against in server code **[V]**.

**The proxy must not run on guest routes.** Scope it to `/api/*` and `/auth/*`, so guests never trigger auth code.

**CSRF.** `SameSite=Lax`, plus an `Origin` check on every write route. All writes use JSON with a custom header.

**Rate limiting**

| Target | Proposal |
|---|---|
| Magic link requests | 5 per email and 10 per IP, per hour |
| Sync writes | 120 per user, per hour |
| Photo uploads | 20 per user, per hour |

Needs a shared store if hosting is serverless, because in-memory counters don't work across instances **[S]**. A small Postgres table is the simplest option.

**Input limits.** Check `Content-Length` and actual bytes before parsing. Check resume count in the same transaction as insert. Photos: JPEG, PNG or WebP only, checked by magic bytes, and never SVG.

**Secrets**

| Value | Exposure |
|---|---|
| Supabase URL | May be public, but unnecessary if the browser never calls it |
| Publishable/anon key | Designed to be public, protected by RLS **[S]**; keep server-only here anyway |
| `service_role` / secret key | Server only. Used only for account deletion. Never `NEXT_PUBLIC_` |
| Google OAuth secret | In the provider dashboard only |
| Email service key | Provider dashboard or server only |

A lint or test check should fail the build if a secret name appears with `NEXT_PUBLIC_`.

**Content security policy.** Batch 5 adds the CSP. With everything routed through our server:
```
default-src 'self';
connect-src 'self';
img-src 'self' data: blob:;
script-src 'self' (plus nonce or hashes if Next needs them);
style-src 'self' 'unsafe-inline' (to be confirmed);
frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com;
```
Sign-in redirects to Google and the provider, so those aren't browser-side connections. If direct browser calls are ever needed, add only `https://<project>.supabase.co` to `connect-src`.

**Logging.** Log route, status, duration, user id hash and byte size. Never log request bodies, resume JSON, names, emails or file names. Add a test that fails if a marker string from a resume appears in log output.

**Testing cross-user access** (phase 2, automated)
- User A can't read, list, update or delete user B's resume by id, through the API or directly with A's token.
- A can't read B's photo path.
- `with check` blocks writing a row with B's `user_id`.
- Unauthenticated requests get `401`.
- A row with `user_id` in the body from a client is ignored.
- A test that runs with RLS removed must fail, to prove the tests detect it.

---

## 6. Privacy and legal checklist

**Not legal advice.** All wording below is a draft that needs review by a lawyer.

### Where the site makes the claims today [V]

**Must change once accounts exist**

| File | Current wording |
|---|---|
| `src/app/(site)/privacy/page.tsx:19-24` | "stored locally in your browser… not uploaded to our servers or shared with third parties, and there are no accounts" |
| `src/components/editor/PrivacyNote.tsx:1` | "Your resume data is stored locally in this browser. It is not uploaded to our servers." |
| `src/components/editor/PrivacyNote.tsx:10-14` | "not sent to our servers or to any third party, and there is no account or cloud sync"; "only exist in this browser on this device" |
| `src/components/editor/EditorTopBar.tsx:21` | "Stored in this browser only. Never uploaded." |
| `src/app/(site)/free/page.tsx:38-39` | "stored in your browser and is never uploaded to our servers" |
| `src/components/home/ValueProps.tsx:7` | "Your resume is saved in your browser, not on our servers." |
| `src/components/editor/content/PhotoField.tsx:133` | "Optional, stays in this browser" |
| `src/components/editor/LeaveGuardDialog.tsx:54-55` | "Your resume is stored only in this browser…" |
| `src/components/editor/ResumeEditor.tsx:255` | "It only lives in this browser, so keep a copy somewhere safe." |
| `src/app/(site)/sign-in/page.tsx:7,15,16` | "Accounts are not available yet" and "Sign in is not available yet" |

**True for guests, but need review**

| File | Current wording |
|---|---|
| `src/components/home/Hero.tsx:27` | "No account, no watermark, and your resume stays in your browser." |
| `src/components/home/Faq.tsx:21` | "…without signing up, and your resume stays in your browser." |
| `src/components/home/Features.tsx:12` | "Autosave keeps your work in this browser." |
| `src/app/(site)/about/page.tsx:26` | "Your resume stays in your browser, and you don't need an account." |
| `src/data/site.ts:20-21` | "Autosave in your browser"; "There is no sign-up, login or email needed." |
| `src/app/editor/page.tsx:7` | "Your resume data is stored locally in your browser." |
| `src/app/(site)/error.tsx:22`, `src/app/editor/error.tsx:25`, `src/app/global-error.tsx:24` | Reassurance that resumes are saved in this browser |
| `src/components/layout/SiteFooter.tsx:17`, `src/app/(site)/templates/page.tsx:74`, `src/app/(site)/templates/[slug]/page.tsx:26,88` | "no account" statements (still true) |
| `src/components/editor/usePdfExport.tsx:17`, `PhotoField.tsx:16`, `src/lib/resume-storage.ts:2`, `src/lib/photo-store.ts:3` | Code comments; update for accuracy |

The home-page copy move, requested separately, will gather many of these into one file and mark them.

### Draft replacement wording

| Where | Guest | Signed in |
|---|---|---|
| Storage tooltip | "Stored in this browser only. Never uploaded." | "Saved in this browser and synced to your account." |
| Privacy note | "Without an account, your resume stays in this browser and isn't sent to us." | "With an account, your resumes and photos are stored on our servers so you can open them anywhere." |
| Home value prop | "Use it without an account and your resume stays in your browser. Sign in only if you want it on other devices." | Same |

The accurate promise changes from "never uploaded" to "**never uploaded unless you sign in and choose to sync**". Signing in must not start an upload by itself.

### Privacy Policy must cover

- Who the controller is and how to make contact. **The Contact page has no address yet [V], and that blocks launch.**
- What's collected for account users: email, Google profile data, resumes, photos, IP addresses and logs.
- Why, and the legal basis. Resumes contain sensitive personal details, and photos may reveal more.
- Processors: Supabase, the email service, the host.
- Region and international transfers.
- Retention, deletion, and user rights.
- Children's use, since students are a target audience; set a minimum age.

### Terms must cover

Acceptable use, account termination, availability without guarantees, the user owning their content, and the need to keep their own copies.

### Rights

| Requirement | Plan |
|---|---|
| Download my data | Reuse `createBackup` |
| Delete my account | Self-service, with confirmation. Removes rows, photos and the auth user, then signs out. Local copies stay unless the user clears them |
| Backups | State how long deleted data stays in provider backups (Pro showed 7 days **[V]**) |

### Cookies and consent

An auth session cookie is usually treated as strictly necessary, so a consent banner may not be needed if there's no analytics **[S]**. Confirm with a lawyer. Disclose it in the policy. Guests get no cookies at all, and an existing test already checks that cookies hold no resume data **[V]**.

### Region

Recommend an EU region such as Frankfurt if your users are mainly in Europe. Supabase notes that a region choice is a location control, not proof of compliance **[V]**. The region can't easily be changed later **[S]**, so decide first.

### Retention

- Deleted resumes: tombstone for 30 days, then purge.
- Inactive accounts: decide. Suggest a warning email after 24 months.
- Logs: 30 days.

### Breach response

1. Contain: rotate keys, revoke sessions.
2. Assess scope, using logs that hold no content.
3. Record what happened.
4. Notify the regulator and users within legal deadlines. Under GDPR, the regulator deadline is generally 72 hours **[S]**.
5. Review and fix.

Name an owner and keep a contact list before launch.

---

## 7. UX plan

### Sign-in prompts, without nagging

| Moment | Prompt |
|---|---|
| Header | "Sign In" link, already present **[V]** |
| Backup reminder | Secondary line: "Or sign in to reach it on other devices" |
| ⋯ menu | "Sign in to sync" |
| Leave dialog | No sign-in prompt; it stays focused on protecting work |
| After a first PDF | At most one quiet note, once ever, dismissible |

Never show a sign-in wall, a timed popup, or a block on any guest feature.

### Sign-in and sign-up

One screen at `/sign-in`, since magic link makes the two the same flow.

- Heading: "Sign in or create an account"
- "Continue with Google"
- Email field with "Email me a link"
- Reassurance: "You don't need an account to build a resume." with a link to the editor
- Sent state: "Check your email. We sent a link to name@example.com." with Resend (with countdown) and Change email
- Link errors: "This link has expired or was already used. Ask for a new one."

A single-column card, max 420px, with 16px inputs at 390px. Same layout at 1440px, centred.

### Account menu

Avatar with initials in the top bar: email, "Manage account", "Download my data", "Sign out", "Sign out and clear this browser". Guests see the existing ⋯ menu unchanged.

### Sync status in the top bar

| State | Text | Icon | Detail |
|---|---|---|---|
| Guest | "Saved locally" | Drive | Unchanged |
| Synced | "Saved to your account" | Cloud-check | With tooltip for the last sync time |
| Syncing | "Syncing…" | Spinner | Only after 1 second, to avoid flicker |
| Offline | "Offline, will sync" | Cloud-off | Local saving continues |
| Failed | "Sync failed" | Warning | Opens details with Retry and Download backup |
| Conflict | "Needs your choice" | Warning | Opens the dialog |
| Local-only | "On this device only" | Drive | Reason in the tooltip |

Below 1280px the text collapses to an icon, as it does now **[V]**, with the state in `aria-label`, and changes announced politely.

### Conflict dialog (draft wording)

> **This resume changed on another device**
> "Marketing CV" was edited somewhere else while this device also had changes. Nothing has been lost.
> *This device: today, 14:02. Your account: today, 13:47.*
>
> **Keep both** (default) · Use this device's version · Use the account version

Choosing either "use" option needs a second confirmation, and the replaced version stays available for 30 days.

### Empty and error states

| State | Message |
|---|---|
| Account has no resumes | "No resumes in your account yet. Create one, or add the ones in this browser." |
| Session expired | "You've been signed out. Your work is safe here. Sign in again to sync." |
| Limit reached | "This resume is too large to sync. It's still saved on this device." |
| Service down | No popup; status shows "Offline, will sync" |
| Deleted elsewhere | "This resume was deleted on another device." with Keep a copy |

### Screen notes

- **390px:** dialogs full-width with 16px margins, stacked buttons, 44px targets. Account menu as a bottom sheet.
- **1440px:** dialogs max 480px, resume lists in a scrolling panel.
- All dialogs use the existing `Dialog` component, and reduced motion is respected.

---

## 8. Phased implementation plan

Every phase sits behind `NEXT_PUBLIC_ACCOUNTS_ENABLED`, off by default. Turning it off returns the app to guest-only. Local data is never affected by a rollback.

| Phase | Scope | Likely files | Tests | Effort |
|---|---|---|---|---|
| **0. Prerequisites** | Finish Batches 2-5 or at least the CSP and final guard run; choose provider, region, hosting; publish a contact address | `next.config.ts`, contact page | Existing suites | M |
| **1. Sign-in only** | Supabase project, `@supabase/ssr`, `proxy.ts`, `/sign-in`, `/auth/callback`, account menu, sign-out. No sync | `src/lib/auth/*`, `proxy.ts`, `sign-in/page.tsx`, `EditorTopBar`, `SiteHeader` | Auth flows with test accounts; guest makes zero `/api` calls; suites pass with no env vars | M |
| **2. Cloud storage API** | Tables, RLS, route handlers, validation, limits, rate limits, logging rules | `supabase/migrations/*`, `src/app/api/resumes/*`, `src/lib/server/*` | **Cross-user access suite**, sizes, rate limits, log-content test, migration of v1 payloads | L |
| **3. Manual sync** | Sync engine, "Sync now", first sign-in import, shared-browser protection | `src/lib/sync/*`, `useResumeStore`, new dialogs | Import merge and replace; no local deletion; different account on one browser | L |
| **4. Automatic sync** | Background sync, offline queue, retry, sync lock, status states, conflict dialog | `src/lib/sync/*`, `useUnsavedGuard`, `src/lib/unsaved.ts`, `EditorTopBar` | **Conflict matrix**, offline and reconnect, two tabs one syncer, retry | L |
| **5. Photos** | Bucket, upload, proxy, sync ordering, deletion | `src/app/api/photos/*`, `photo-store.ts` | Cross-user photo access, type checks, orphan clean-up | M |
| **6. Privacy and account controls** | New wording, Privacy and Terms, Download my data, Delete account, Sign out and clear | Files in section 6, new `account` page | Deletion removes everything; export round trip | M |
| **7. Launch** | Beta with a few users, monitoring, backups test, breach plan | Docs | Restore drill from a provider backup | M |

**Rollback**
- **App:** turn the flag off. Everyone continues locally.
- **Database:** forward-only migrations, with a tested `pg_dump` before each.
- **Sync bug:** a server-side switch makes the sync API return `503`; clients stop and show "Offline, will sync".
- **Bad deploy:** because the browser copy is primary, reverting the deploy doesn't lose work.

**Test environment:** run Supabase locally for CI if possible **[S]**, so tests never touch real user data.

---

## 9. Risks and open questions

### Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Cross-user data exposure** | Severe | RLS plus route checks, automated tests, review of every policy |
| **Sync loses or overwrites work** | Severe | Server revisions, keep-both default, no automatic local deletion, 30-day recovery |
| **Privacy promise becomes false** | High | Update every listed string in the same release; upload only by explicit choice |
| **Guest mode regresses** | High | Flag off by default, guest zero-request test, existing suites unchanged |
| **Shared browser mixes accounts** | High | `userId` ownership in sync state |
| **Becoming responsible for personal data** | High | Legal review before launch; a contact address; a breach plan |
| Service outage | Medium | Local-first keeps editing working |
| Email deliverability | Medium | Dedicated email service; Google as the alternative |
| Cost growth from photos | Low to medium | 400px photos, per-account limits |
| Free tier pausing | Medium | Paid project in production **[V]** |

### Decisions needed from you

1. **Provider:** Supabase, or Better Auth with own Postgres?
2. **Hosting:** where does this deploy? Route handlers need a server runtime, and I found no deployment configuration **[V]**. *Update (Phase 0): the site now runs on Cloudflare Workers through OpenNext (`docs/deploy-cloudflare.md`). That guide says not to add a `proxy` or middleware file, because OpenNext doesn't support it yet, while phase 1 below assumes `proxy.ts` for session refresh. Before accounts are built, confirm OpenNext's current proxy support or design session refresh in route handlers only. Still open.*
3. **Sign-in methods:** Google plus email magic link, as you assumed?
4. **Region:** EU, or nearer your main users?
5. **Limits:** 50 resumes, 256KB each, 1MB photos?
6. **Photo sync:** always, or opt-in per account?
7. **Free accounts:** free forever, or a paid tier later? *Resolved (Phase 0): accounts are optional. Everything a guest can do stays free, including unlimited PDF downloads and all 120 existing templates. Paid services may be added later, but only as new, additive features or newly created templates. Whether cloud backup and sync themselves are free is not yet decided.*
8. **Retention:** 30-day tombstones, and what to do with inactive accounts?
9. **Public share links later:** if yes, plan ownership and privacy now.
10. **Company and contact details:** who is the legal controller, and which address? *Still open: owner items O-3 to O-7 in `docs/phase-0-product-decisions.md`.*
11. **Timing:** do Batches 2-5 finish first? I recommend yes.
12. **Brand:** "CVNest" is a placeholder. Auth emails and Google's consent screen show the name, so rename **before** phase 1. *Resolved (Phase 0): the name is CVNest, and the intended domain is `getcvnest.com`. Auth callback URLs, cookies and the email sender domain should use that domain.*

### Not verified

- Current Google and magic link setup steps on each provider.
- Supabase email limits, and whether its publishable key can stay server-only in every flow.
- Firebase and Clerk data regions; Firebase server-session effort and document limits.
- Better Auth's licence and its production maturity.
- Web Locks behaviour in Safari; all behaviour on real phones.
- Actual storage cost per user: the sizes above come from test fixtures, not real resumes or photos.
- Whether strict CSP works with Next 16 without inline allowances.
- All legal points. Nothing here is legal advice.
