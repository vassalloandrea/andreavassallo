# AGENTS.md

Guidance for AI agents working in this repo. Hard, enforced constraints only —
if you're looking for workflow (voice, PR process), that's in
[`CLAUDE.md`](CLAUDE.md).

## What this is

Andrea Vassallo's personal site and digital garden (Atlas): **Astro 5** with
`output: "server"` and the `@astrojs/node` adapter in standalone mode — this is
an SSR app, not a static build, whatever the README says. TypeScript
(`astro/tsconfigs/strictest`), **Tailwind CSS v4** via `@tailwindcss/vite`,
**Stimulus** for client-side interactivity, MDX + Astro Content Collections for
content.

```
src/
├── components/
│   ├── ui/        # Reusable UI primitives (Buttons, Cards, Modals…)
│   ├── content/   # Content-specific displays
│   └── shared/    # Cross-component client-side state/helpers (e.g. atlas-state.ts)
├── controllers/   # Stimulus controllers, one per file, registered in index.ts
├── layouts/
├── pages/         # File-based routing
├── lib/           # Utilities, helpers, the zendo content pipeline
├── content/       # Markdown/MDX collections (hikes, writings, waypoints, books, assets, topics)
├── content.config.ts  # Collection schemas (Astro 5 location, not content/config.ts)
└── data/          # Generated content index (index.json), built by zendo
```

## Hard rules

### Components

- PascalCase filenames (`CookieConsent.astro`).
- Put a component in `ui/` (generic, reusable), `content/` (renders a content
  collection entry), or `shared/` (plain TS, cross-component state/helpers, no
  markup) — pick the one that matches, don't invent a fourth.

### Styling (Tailwind v4)

- Always use `cn()` from `src/lib/utils.ts` for class merging and conditional
  classes.
- For elements with many classes, split them into logical groups on separate
  lines inside `cn()`, one trailing comment per group:

  ```astro
  <div class={cn(
    "flex items-center justify-between",     // Layout
    "bg-white p-4 rounded-lg shadow-sm",     // Visuals
    "hover:bg-gray-50 transition-colors",    // Interaction
    "dark:bg-gray-900 dark:hover:bg-gray-800" // Dark mode
  )} />
  ```

### Interactivity (Stimulus)

- No `<script>` blocks in `.astro` files for component logic. Any
  interactivity is a Stimulus controller.
- Workflow: add `src/controllers/my-feature.ts`, register it in
  `src/controllers/index.ts`, attach with `data-controller="my-feature"`.
  Controller filenames are kebab-case.
- Exception: a small, render-blocking script that has to run before paint
  (e.g. the theme toggle, to avoid a flash) may stay inline in `<head>`.

### TypeScript

- Strict typing is enforced by `astro/tsconfigs/strictest`, not just a
  preference. Explicit `Props` interfaces on every component.
- Path aliases, from `tsconfig.json`, are the only ones that exist —
  `@components/*`, `@layouts/*`, `@styles/*`. Everything else (`src/lib`,
  `src/controllers`, `src/data`, `src/content`) is imported by relative path;
  don't invent an alias that isn't declared there.

### Content pipeline

- Collections are defined in `src/content.config.ts`; entries live under
  `src/content/<collection>/`.
- Markdown/MDX gets reading time, `[[wiki-links]]`, and wiki-image embeds via
  remark plugins in `src/lib/zendo/plugins/`.
- `zendo` (`scripts/cli.ts`) is the CLI that fetches/builds the content index
  at `src/data/index.json` — `npm run zendo:fetch`, `zendo:reindex`,
  `zendo:build`, `zendo:globalStats`, or `npm run zendo -- <command>` directly.

### Formatting

Prettier's non-default choices, since they're easy to get wrong by assumption:
120-char print width, double quotes, trailing commas (es5), always-parens
arrows. `prettier-plugin-astro` handles `.astro` files.

## Commands

- `npm run dev` — dev server
- `npm run build` — `astro check && astro build`
- `npm run lint` — `prettier --check . && eslint . && astro check`; this is the
  gate to run green before opening a PR
- `npm run format` — `prettier --write . && eslint --fix .`
