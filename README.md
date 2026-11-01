# CVNest

CVNest is a free, browser-based resume builder. Choose a template, enter your information and see a live preview as you edit. Resume creation currently works without an account.

## Features

- **110+ free resume templates** across ten categories: Simple, Modern, Creative, Photo, Compact, First Job, Executive, Technical, Academic and Business. The library contains 120 templates.
- **Template gallery** with category filters, search and a full-size preview page for each template.
- **Resume editor** (`/editor`) with live preview, zoom, US Letter or A4 pages, and Overview, Content and Customize tabs.
- **Editable sections:** personal details, summary, experience, education, projects, skills, certifications, languages, awards, volunteering and custom sections. Sections and entries can be reordered, renamed and hidden.
- **Multiple resumes:** create, rename, duplicate and delete resumes.
- **Optional profile photo**, resized in the browser.
- **Local browser storage:** resume data is saved in `localStorage` and photos in IndexedDB. The current implementation does not upload resume content to a CVNest backend. Browser extensions, browser synchronization and other device software are outside the application's control.
- **Cross-tab synchronization:** changes are shared across open tabs. When multiple tabs edit simultaneously, the last save wins.
- **Data migration:** supports migration from the earlier storage format while preserving the original data as a backup.
- **PDF export:** supports Letter and A4 page sizes using the browser's print engine. Selectable text and page layout are covered by automated PDF tests. The user selects "Save as PDF" in the print dialog.

### Account and download flow

The current implementation is browser-only and does not include authentication or cloud storage.

The planned launch flow allows users to create and edit resumes without an account but requires signup or login when they choose to download a PDF. Guest resume data and photos must be migrated safely to the user's account before local data can be removed.

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
- Security headers and technical hardening.
- Accurate legal, privacy and contact pages.
- Final brand and domain confirmation.
- Authentication and secure cloud storage for the planned download flow.
- Production deployment and final launch verification.

## Known limitations

- **PDF download:** uses the browser's print dialog. Users must select "Save as PDF"; there is no one-click file download.
- **Firefox PDF rendering:** uses a separate export path in `usePdfExport` because Firefox handles variable fonts, CSS grids and page breaks differently. This path uses static font files from `public/fonts/print`, floats for page columns and a repeating page spacer.
- **Safari:** physical-device PDF export has not yet been verified. Do not assume Safari compatibility until it has been tested.
- **Simultaneous editing:** when two tabs edit the same resume at the same time, the last save wins.
- **Authentication and cloud storage:** not yet implemented. Resume data is currently stored locally in the browser.
- **Legal pages:** Privacy and Terms content still needs to be completed and reviewed. The Contact page also needs appropriate contact information.
- **Brand assets:** favicon and Open Graph image still need to be completed.
- **Production readiness:** security headers, domain configuration and other launch requirements remain under review.

See `docs/audit-final.md` for the detailed pre-launch audit and remaining work.
