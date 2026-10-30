# CVNest

CVNest is a free, browser-based resume builder. You pick a template, fill in your details and see a live preview as you type. There are no accounts, and resume data never leaves the browser.

Production domain: https://getcvnest.com

## Features

- **45 free resume templates** in seven categories: Simple, Modern, Creative, Photo, Compact, First Job and Executive.
- **Template gallery** with category filters, search and a full-size preview page for each template.
- **Resume editor** (`/editor`) with a live preview, zoom, US Letter or A4 pages, and Overview, Content and Customize tabs.
- **Editable sections:** personal details, summary, experience, education, projects, skills, certifications, languages, awards, volunteering and custom sections. Sections and entries can be reordered, renamed and hidden.
- **Multiple resumes** you can create, rename, duplicate and delete.
- **Optional profile photo**, resized in the browser.
- **Private by design.** Resumes autosave to `localStorage` and photos to IndexedDB. Nothing is uploaded and no account is needed. Edits sync across open tabs.
- **Safe data migration** from the earlier storage format, with the original data kept as a backup.

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
```

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
| Template library (45 templates) | Complete |
| 3. Unified data model and safe migration | Complete |
| Free messaging, SEO and CVNest rebrand | Complete |
| UI/UX, typography and editor redesign | Complete; font, color and spacing controls deferred |
| **Next:** PDF export | Not started |

### Known limitations

- PDF export is not available yet; the editor's Download button is marked "Soon".
- The Contact page has no contact address, and the Privacy and Terms pages are short placeholders.
- There is no favicon or Open Graph image.
- There are no automated tests in the repository yet.
- When two tabs edit at the same time, the last save wins.
