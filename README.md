# CVNest

CVNest is a free, browser-based resume builder. Choose a template, enter your information and see a live preview as you edit. Creating, editing and downloading resumes as PDFs is free and works without an account.

The intended permanent domain is `getcvnest.com`. It isn't configured yet; see [docs/phase-0-product-decisions.md](docs/phase-0-product-decisions.md).

## Features

- **110+ free resume templates** across ten categories: Simple, Modern, Creative, Photo, Compact, First Job, Executive, Technical, Academic and Business. The library contains 120 templates.
- **Template gallery** with category filters, search and a full-size preview page for each template.
- **Resume editor** (`/editor`) with live preview, zoom, US Letter or A4 pages, and Overview, Content and Customize tabs.
- **Resume styling:** preset or custom colors, six fonts and adjustable text size, saved per resume and carried through to the PDF.
- **Editable sections:** personal details, summary, experience, education, projects, skills, certifications, languages, awards, volunteering and custom sections. Sections and entries can be reordered, renamed and hidden.
- **Multiple resumes:** create, rename, duplicate and delete resumes.
- **Optional profile photo**, resized in the browser.
- **Local browser storage:** resume data is saved in `localStorage` and photos in IndexedDB. The current implementation does not upload resume content to a CVNest backend. Browser extensions, browser synchronization and other device software are outside the application's control.
- **Cross-tab synchronization:** changes are shared across open tabs. When multiple tabs edit simultaneously, the last save wins.
- **Data migration:** supports migration from the earlier storage format while preserving the original data as a backup.
- **PDF export:** supports Letter and A4 page sizes using the browser's print engine. Selectable text and page layout are covered by automated PDF tests. The user selects "Save as PDF" in the print dialog.

### Account and download policy

The current implementation is browser-only and does not include authentication or cloud storage.

Approved policy (see [docs/phase-0-product-decisions.md](docs/phase-0-product-decisions.md)):

- Creating, editing, autosaving and downloading PDFs are free, unlimited and never require an account. There is no download gate and no watermark.
- PDFs are generated in the browser. There is no server-side PDF generation.
- All 120 existing templates stay free. Any future paid templates would be new templates.
- Accounts, when added, are optional. They provide cloud backup, cross-device sync and recovery, and possibly future premium services. The design is in [docs/accounts-plan.md](docs/accounts-plan.md).
- If a guest later creates an account, their local resumes and photos must be copied safely to it, and local data is never deleted automatically.

## Changes to original templates

Most of the 65 templates that predate the 120-template library are unchanged. These templates received intentional modifications:

| Templates | Change | Reason |
|---|---|---|
| Ambassador, Boardroom, Classic, Coral, Keystone, Mosaic | Name letter-spacing reduced | Wide tracking caused names to split in PDF text extraction |
| Sterling | Sidebar widened from 32% to 35% | Long email addresses broke across lines |
| Campus | Restyled with a banner, bands and footer grid | It previously shared Horizon's structure |
| Parallax, Monolith, Cameo, Telegraph, Capstone | Markup-only change: added a footer-grid class | Firefox page-break handling; no intended visual change |

Template comparisons were performed using rendered HTML and pixel comparisons against a baseline of the original 65 templates. Professional also received a small alignment adjustment after links were added.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [React](https://react.dev) 19
- TypeScript 5.9
- Tailwind CSS v4
- lucide-react icons
- Google Fonts through `next/font`

The current implementation has no backend, database or authentication.

## Getting started

Requirements:

- Node.js 20.9 or later
- npm

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

### Available scripts

```bash
npm run dev        # Start the development server
npm run build      # Create a production build
npm run start      # Serve the production build
npm run typecheck  # TypeScript check without emitting files
npm run verify     # Typecheck, unit tests and production build
npm run test:unit  # Run unit tests
npm run test:e2e   # Run browser tests
npm run preview    # Build for Cloudflare and run the Worker locally
```

Preview and production deployment to Cloudflare Workers is covered in [docs/deploy-cloudflare.md](docs/deploy-cloudflare.md).

## Testing

### Unit tests

Run with:

```bash
npm run test:unit
```

Unit tests cover schema validation, migrations, storage, the render model and template registry. They use Node's built-in test runner and the project's TypeScript compiler.

### Browser tests

Run with:

```bash
npm run build
npm run test:e2e
```

The E2E runner (`tests/e2e/run.mjs`) starts the production build on an available port and runs the browser test suites in Chrome using `puppeteer-core`.

Coverage includes:

- Resume editor interactions.
- Data migration and recovery.
- All 120 templates.
- Layout at phone-to-desktop viewport widths.
- Error screens.
- PDF export.

Additional information:

- Run selected suites with `npm run test:e2e -- layout pdf`.
- Chrome is detected automatically. Set `CHROME_PATH` to override the browser executable.
- PDF tests require Poppler utilities: `pdfinfo`, `pdftotext`, `pdfimages` and `pdffonts`. They skip themselves when these tools are unavailable.
- `pdf-firefox.test.mjs` exports templates in Firefox and requires Firefox and `geckodriver`.
- To run the Chrome PDF suite in Edge, set `CHROME_PATH` to the Edge executable.
- Screenshots and PDFs from the last test run are saved in `.e2e-output/`.

Automated browser tests do not replace testing on physical mobile devices, Safari or real screen readers.

## Project structure

```text
src/
  app/                 Routes: (site) pages, /editor, sitemap, robots
  components/
    editor/            Resume editor UI and state (useResumeStore)
    resume/            Resume rendering: hand-written templates and design engine
    home/              Homepage components
    layout/            Shared layout components
    templates/         Template gallery components
    ui/                Shared UI components
  data/                Resume data model, template registry, sample resumes and site config
  lib/                 Storage, schema validation, migrations and photo storage

tests/
  unit/                Unit tests (node:test)
  e2e/                 Browser suites, fixtures and test runner
```

## Browser storage

The storage keys retain their original `folio.*` prefix so existing saved resumes continue to work.

| Key | Contents |
|---|---|
| `folio.resumes.v2` | Current resumes (schema v2) |
| `folio.resumes` | Pre-migration v1 data, retained as a backup |
| `folio.editor-settings` | Active resume and zoom settings |
| `folio.migrations` | Log of completed migrations |
| IndexedDB `folio` / `photos` | Profile photo images |

When the resume data structure changes, add a migration step to `src/lib/migrations.ts` and update `RESUME_SCHEMA_VERSION`.

## Development status

CVNest is under active development and is not yet ready for public launch.

Implemented areas include:

- Homepage and template gallery.
- Browser-based resume editor.
- 120-template library.
- Unified resume data model and migration.
- Local browser storage.
- Browser-based PDF export.
- Automated unit and browser testing.

Remaining pre-launch work includes:

- Accessibility and editor improvements.
- PDF testing on Safari and physical mobile devices.
- Technical hardening (security headers are in place; see the audit for the remaining items).
- Accurate legal, privacy and contact pages. Drafts are in [docs/legal/](docs/legal/) and await owner information and legal review.
- Attaching the intended domain `getcvnest.com` (brand and domain are decided; configuration is pending).
- Production deployment and final launch verification.

Optional accounts with cloud backup and sync are planned but are not required for launch.

## Known limitations

- **PDF download:** uses the browser's print dialog. Users must select "Save as PDF"; there is no one-click file download.
- **Firefox PDF rendering:** uses a separate export path in `usePdfExport` because Firefox handles variable fonts, CSS grids and page breaks differently. This path uses static font files from `public/fonts/print`, floats for page columns and a repeating page spacer.
- **Safari:** physical-device PDF export has not yet been verified. Do not assume Safari compatibility until it has been tested.
- **Simultaneous editing:** when two tabs edit the same resume at the same time, the last save wins.
- **Authentication and cloud storage:** not yet implemented. Resume data is stored locally in the browser. Optional accounts are planned for cloud backup and sync only.
- **Legal pages:** the live Privacy, Terms and Contact pages are still holding pages. Drafts are in `docs/legal/` and are not legally reviewed.
- **Domain and browser storage:** saved resumes belong to the exact web address. Moving to `getcvnest.com` after users have saved resumes on another address would leave those resumes behind. See section 6 of `docs/phase-0-product-decisions.md`.
- **ATS compatibility:** not yet verified with real applicant-tracking systems. Two-column, sidebar and photo layouts may parse less reliably.
- **Production readiness:** domain configuration and other launch requirements remain open.

See [docs/comprehensive-product-audit.md](docs/comprehensive-product-audit.md) for the current pre-launch audit and [docs/phase-0-product-decisions.md](docs/phase-0-product-decisions.md) for the approved product policy. `docs/audit-final.md` is the earlier audit, kept for history.
