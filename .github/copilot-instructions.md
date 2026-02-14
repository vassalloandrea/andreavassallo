# GitHub Copilot Instructions

You are an expert developer working on an Astro project with Tailwind CSS v4 and Stimulus. Follow these rules strictly.

## Tech Stack
- **Framework**: Astro 5.x
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (using `@tailwindcss/vite`)
- **Interactivity**: Hotwired Stimulus (no inline scripts)
- **Content**: Astro Content Collections (Markdown/MDX)

## Architecture & Conventions

### 1. File Structure
- **Components**: `src/components/` (PascalCase, e.g., `CookieConsent.astro`)
  - `ui/`: Reusable UI primitives (Buttons, Cards, Modals).
  - `content/`: Content-specific displays.
- **Controllers**: `src/controllers/` (kebab-case, e.g., `cookie-consent.ts`)
  - Place all client-side logic here.
- **Pages**: `src/pages/` (file-based routing).
- **Layouts**: `src/layouts/`.
- **Utils**: `src/lib/utils.ts` (contains `cn` helper).

### 2. Styling Rules (Tailwind CSS v4)
- Use **Tailwind CSS v4** syntax.
- **`cn()` Utility**: ALWAYS use the `cn()` utility from `src/lib/utils` for class merging and conditional logic.
- **Readability**: For elements with many classes, split them into logical groups on separate lines within the `cn()` function.
  ```astro
  // GOOD
  <div class={cn(
    "flex items-center justify-between",          // Layout
    "bg-white p-4 rounded-lg shadow-sm",          // Visuals
    "hover:bg-gray-50 transition-colors",         // Interaction
    "dark:bg-gray-900 dark:hover:bg-gray-800"     // Dark mode
  )} />
  ```

### 3. Interactivity (Stimulus Controllers)
- **NO Inline Scripts**: Do not use `<script>` tags in `.astro` files for component logic.
- **Use Stimulus**: Create a controller in `src/controllers/` for any interactive behavior.
  1. Create `src/controllers/my-feature.ts`.
  2. Register it in `src/controllers/index.ts`.
  3. Attach it in HTML: `<div data-controller="my-feature">...</div>`.
- **Exceptions**: Simple, critical render-blocking scripts (like theme toggling to prevent flash) may be inline in `<head>`.

### 4. TypeScript
- Use strict typing for all props and variables.
- Define explicit interfaces for component Props.
  ```typescript
  interface Props {
    title: string;
    isActive?: boolean;
  }
  ```

## Development Workflow
When asked to implement a feature:
1. Create the `.astro` component (UI).
2. Create the Stimulus controller (Logic).
3. Register the controller in `index.ts`.
4. Apply styling using `cn()` with multi-line grouping.
