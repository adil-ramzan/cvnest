# Third-party licenses

## Fonts

All 11 font families are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org). The app downloads nothing from font services in the visitor's browser; every font is served from this site.

| Family | Used for | Files in the repo (`public/fonts/print/` unless noted) | License text | Source |
|---|---|---|---|---|
| Plus Jakarta Sans | Website and editor interface; social sharing image | `src/assets/PlusJakartaSans-Bold.woff` | `src/assets/OFL-plus-jakarta-sans.txt` | Google Fonts |
| EB Garamond | Resume templates | `garamond-*.woff` (6) | `OFL-garamond.txt` | Google Fonts |
| IBM Plex Mono | Resume templates | `plex-mono-*.woff` (5) | `OFL-plex-mono.txt` | Google Fonts |
| IBM Plex Sans | Resume templates | `plex-sans-*.woff` (6) | `OFL-plex-sans.txt` | Google Fonts |
| Inter | Resume templates | `inter-*.woff` (7) | `OFL-inter.txt` | Google Fonts |
| Lora | Resume templates | `lora-*.woff` (5) | `OFL-lora.txt` | Google Fonts |
| Montserrat | Resume templates | `montserrat-*.woff` (7) | `OFL-montserrat.txt` | Google Fonts |
| Playfair Display | Resume templates | `playfair-*.woff` (6) | `OFL-playfair.txt` | Google Fonts |
| Source Serif 4 | Resume templates | `source-serif-*.woff` (7) | `OFL-source-serif.txt` | Google Fonts |
| Space Grotesk | Resume templates | `space-grotesk-*.woff` (5) | `OFL-space-grotesk.txt` | Google Fonts |
| Work Sans | Resume templates | `work-sans-*.woff` (7) | `OFL-work-sans.txt` | Google Fonts |

The files in `public/fonts/print/` are static copies used only for PDF export in Firefox. All other browsers use variable versions of the same families, which `next/font` fetches from Google Fonts at build time and serves from this site, so those files are not in the repo.

### To verify before launch

- **Download source of the static files.** The Source column is the family's public source. Which download each static `.woff` came from isn't recorded here.
- **Reserved Font Names.** Lora, Playfair Display, IBM Plex ("Plex") and Source Serif ("Source") declare Reserved Font Names, which limit how modified versions may be named. Confirm that serving these `.woff` files under their original names is allowed.
- **Copyright lines that differ between the font file and its license text:**
  - Inter: 2016 in the font, 2020 in `OFL-inter.txt`.
  - Montserrat: 2011 in the font, 2024 in `OFL-montserrat.txt`.
  - Source Serif 4: Adobe in the font, "The Source Serif 4 Project Authors" in `OFL-source-serif.txt`.
  - IBM Plex Mono and Sans: the Reserved Font Name appears in the license text but not in the font's copyright line, and the Plex Sans year differs (2019 in the font, 2017 in the license text).

## Software

| Package | License |
|---|---|
| lucide-react (icons) | ISC |
| Next.js, React, React DOM | MIT |
| Tailwind CSS | MIT |

## Other assets

Sample resumes, sample names and the illustrated avatars in `src/data/samples.ts` were created for this project. No third-party images are used.
