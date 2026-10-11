# Halde Architects — concept site

A portfolio mockup for a fictional architecture studio in Copenhagen.
The hero is a live **sun study**: a white Three.js maquette whose shadows follow
the sun's path over Copenhagen on 21 June as you scroll.

**Live:** https://aledev11.github.io/halde-architects/

**Stack:** Astro 7 · Three.js · anime.js v4 · Lenis · hand-written CSS

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # static output in dist/
```

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.
The site is served under `/halde-architects`, so internal links go through `url()` in `src/utils/url.ts`.

## Structure

- `src/scripts/sun-study.ts` — Three.js scene, sun path model and scroll-driven time of day
- `src/scripts/motion.ts` — smooth scroll, text/image reveals, counters, cursor
- `src/content/projects/` — case studies (Markdown + frontmatter)
- `src/pages/` — home, work index, project detail, studio, credits
- `src/data/credits.ts` — Unsplash photo credits

Press **G** on any page to reveal the 12-column grid.

All projects, people and quotes are invented. Photography from Unsplash (see `/credits`).
