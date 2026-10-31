# CVNest

CVNest is a free, browser-based resume builder. You pick a template, fill in your details and see a live preview as you type. There are no accounts, and resume data never leaves the browser.

Production domain: https://getcvnest.com

## Features

- **120 free resume templates** in ten categories: Simple, Modern, Creative, Photo, Compact, First Job, Executive, Technical, Academic and Business.
- **Template gallery** with category filters, search and a full-size preview page for each template.
- **Resume editor** (`/editor`) with a live preview, zoom, US Letter or A4 pages, and Overview, Content and Customize tabs.
- **Editable sections:** personal details, summary, experience, education, projects, skills, certifications, languages, awards, volunteering and custom sections. Sections and entries can be reordered, renamed and hidden.
- **Multiple resumes** you can create, rename, duplicate and delete.
- **Optional profile photo**, resized in the browser.
- **Private by design.** Resumes autosave to `localStorage` and photos to IndexedDB. Nothing is uploaded and no account is needed. Edits sync across open tabs.
- **Safe data migration** from the earlier storage format, with the original data kept as a backup.
- **PDF export** for every template on Letter or A4 pages. It uses the browser's own print engine ("Save as PDF"), so the PDF has selectable text, embedded fonts and correct page breaks, and it is created on your device.

## Changes to original templates

Most of the 65 templates that predate the 120-template library are unchanged, but these were changed on purpose:

| Templates | Change | Why |
|---|---|---|
| Ambassador, Boardroom, Classic, Coral, Keystone, Mosaic | Name letter-spacing reduced | Wide tracking split names in PDF text extraction |
| Sterling | Sidebar widened from 32% to 35% | Long emails broke across lines |
| Campus | Restyled with a banner, bands and a footer grid | It shared Horizon's structure |
| Parallax, Monolith, Cameo, Telegraph, Capstone | Markup only: a class on the footer grid, no visual change | Firefox page breaks |

Compared by rendered HTML and pixels against a baseline of the 65. Professional shifted slightly when links were added; that was fixed afterwards.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) and React 19
- TypeScript 5.9
- Tailwind CSS v4
- lucide-react icons
- Google Fonts through `next/font`

There is no backend, database or authentication.

## Getting started

You need Node.js 20.9 or later.

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # TypeScript check without emitting files
npm run verify     # typecheck + unit tests + production build
```

## Testing

- **Unit tests** (`npm run test:unit`): schema validation, migrations, storage, the render model and the template registry. They use Node's built-in test runner and the project's own TypeScript compiler, with no extra dependencies.
- **Browser tests** (`npm run build && npm run test:e2e`): `tests/e2e/run.mjs` starts the production build on a free port and runs every `*.test.mjs` suite against it in Chrome via `puppeteer-core`. The suites cover the editor, migration and recovery, all 120 templates, layout at phone to desktop widths, error screens, and PDF export.
  - Run some suites only: `npm run test:e2e -- layout pdf`.
  - Chrome is found automatically. Set `CHROME_PATH` to override.
  - The PDF suites also need poppler-utils (`pdfinfo`, `pdftotext`, `pdfimages`, `pdffonts`) and skip themselves without them.
  - `pdf-firefox.test.mjs` exports every template in real Firefox and needs `firefox` and `geckodriver`. To run the Chrome PDF suite in Edge, set `CHROME_PATH` to the Edge binary.
  - Screenshots and PDFs from the last run go to `.e2e-output/`.

## Project structure

```
src/
  app/                 Routes: (site) pages, /editor, sitemap, robots
  components/
    editor/            Resume editor UI and state (useResumeStore)
    resume/            Resume rendering: hand-written templates and the design engine
    home/, layout/, templates/, ui/   Public pages and shared UI
  data/                Resume data model, template registry, sample resumes, site config
  lib/                 Storage, schema validation, migrations, photo storage
tests/
  unit/                Unit tests (node:test)
  e2e/                 Browser suites, fixtures and runner
```

### Browser storage keys

The keys keep their original `folio.*` prefix so existing saved resumes keep working.

| Key | Contents |
| --- | --- |
| `folio.resumes.v2` | Current resumes (schema v2) |
| `folio.resumes` | Pre-migration v1 data, kept unchanged as a backup |
| `folio.editor-settings` | Active resume and zoom |
| `folio.migrations` | Log of completed migrations |
| IndexedDB `folio` / `photos` | Profile photo images |

When the resume shape changes, add a step to `src/lib/migrations.ts` and bump `RESUME_SCHEMA_VERSION`.

## Development status

| Phase | Status |
| --- | --- |
| 1. Homepage and template gallery | Complete |
| 2. Browser-only resume editor | Complete |
| Template library (120 templates) | Complete |
| 3. Unified data model and safe migration | Complete |
| Free messaging, SEO and CVNest rebrand | Complete |
| UI/UX, typography and editor redesign | Complete; font, color and spacing controls deferred |
| Browser-based PDF export | Complete |
| 5. Stabilisation: tests, mobile gallery fix, error screens | Complete |

### Known limitations

- PDF export goes through the browser's print dialog, where you choose "Save as PDF"; there's no one-click file download. Firefox gets its own export path in `usePdfExport` (static font files from `public/fonts/print`, floats for page columns and a repeating page spacer), because its PDF output loses text set in variable fonts and it doesn't break CSS grids or repeat padding across pages. Safari hasn't been tested on a real device. From reading the code, it doesn't support `box-decoration-break: clone` without a prefix, so it should fall back to page margins, which would leave thin white bands across sidebar backgrounds.
- The Contact page has no contact address, and the Privacy and Terms pages are short placeholders.
- There is no favicon or Open Graph image.
- When two tabs edit at the same time, the last save wins.
