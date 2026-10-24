# MarketFlow UI rules

These rules apply to every screen in marketflow-ui. Read them before you add a page or a component. The rules started with the revamp of 23 October 2026; the plan is in `.claude/plans/marketflow-ui-glass-revamp-2026-10-23.md`.

## Brand and theme

- **Default brand colour.** The default is Codevertex purple `#9100B0`. The tenant's own SSO brand colour replaces it at runtime.
  - `src/components/brand/brand-theme.tsx` wraps shared-ui-lib `TenantBrandingProvider` with `applyCssVariables={false}`.
  - It writes a light and a dark variant through `brandCss()` in `src/lib/brand.ts`. The provider's own writer puts the light colour on `<html>`, which also wins in dark mode.
- **Tokens.** Colours are HSL triplets in `src/app/globals.css`, used as `hsl(var(--x))`.
  - Use the semantic classes: `bg-primary`, `text-muted-foreground`, `bg-success/10`, `text-warning`, `text-info`, `bg-tint`.
  - Never use raw palette classes (`amber-*`, `blue-*`) or hex colours in components. Third-party logos in `lib/providers/catalog.ts` are the only exception.
- **Fonts.** Outfit is the display font (`font-display`, used by h1 to h3) and DM Sans is the body font, the same pair as library-ui and maskani-ui.
- **Public pages** (`/p`, `/f`) scope the colour to their wrapper with `brandCss(color, ".pp-scope")`. The order is: the profile's page colour, then the SSO colour, then purple.

## Soft glass

- **Utilities.** `glass` is for cards, panels and tiles. `glass-strong` is for the header, overlays on photos and menus. `shadow-soft` and `shadow-lift` are for depth. All are defined in `globals.css` with the maskani-ui portal recipe.
- **Cards.** Inside `.app-surface`, which is the app shell and the public pages, every shadcn `Card` is glass already. Do not restyle cards page by page.
- **Background.** `AppCanvas` draws the soft colour wash behind the glass. Use it once per shell, never inside a page.
- **Radii.** Panels and tiles use `rounded-[1.25rem]`. Large sections and the sidebar use `rounded-[1.75rem]`. Controls use `rounded-xl`.

## Layout

- **The shell owns padding and width.** `[orgSlug]/layout.tsx` gives `<main>` the classes `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`.
  - Pages add no padding of their own.
  - Pages narrow themselves only when the content is narrow: `max-w-4xl` for settings forms, `max-w-5xl` for logs.
- **Breakpoints.** Below `lg` the sidebar is a sheet, and shared-ui-lib `MobileBottomNav` shows Home, Leads, Chat, Campaigns and More. `useIsMobile` breaks at 1024px for this reason.
- **Modal width follows the content.** Use `max-w-md` for a confirm, `max-w-lg` for a short form, and `max-w-2xl` or wider for multi-section forms. Re-check the width whenever a field is added.

## Components (`src/components/ui-kit`)

- **`PageHeader`**: icon chip, title, one-line description, actions. Every page starts with one.
- **`StatCard`**: one headline number with a label and an optional hint.
- **`GlassPanel`**: a titled section.
- **`CapsuleTabs`**: status filters and view switches. Use it instead of a `Select` for short fixed lists.
- **`StatusBadge` and `ToneBadge`**: one status vocabulary for every list. Add a status to the map in `status-badge.tsx`, not a colour to a page.
- **`EmptyState`, `ErrorState`, `Pager`, `Field`**: an empty list says what goes there and what to do next. A failed query shows an error with Try again.
- **`ListTable`**: every list of records. It wraps shared-ui-lib's `DataTable`: define columns once (`primary` for the phone card title, `mobileAction` for row buttons, `hideBelow` for wide columns) and pass `paging` from the API. Filters the API already applies stay server-side; don't hand-write `<table>` plus a phone `<ul>` plus a `Pager`.
- **`ListEditor`**: a short list of phrases (audience, offers, banned claims) as chips. Enter or a multi-line paste adds; click a chip to edit; limits come from the API. Don't use one-item-per-line textareas.
- **Grids with chips or long unbroken text** need `grid-cols-1` plus `min-w-0` on the items. An implicit grid column grows to the widest chip and pushes the page sideways on phones.

Use shadcn primitives from `src/components/ui`. Control defaults are 40px tall (`h-10`), and every button or link a finger can hit is at least 44px tall. For dropdowns over data, such as tenants, contacts or pipelines, use the shared-ui-lib `SearchableCombobox`.

## Data

- **API modules and hooks.** Every call goes through a module in `src/lib/api/<domain>.ts` and a TanStack hook in `src/hooks/`. Pages never call `fetch` or `apiClient` inline.
  - Public pages use `src/lib/api/public.ts`, which uses plain fetch so no signed-in token or tenant header leaves the browser.
  - Streams such as chat SSE use fetch inside their API module.
- **Response shapes.** Read the real handler before typing a response.
  - List endpoints that use the shared pagination return `{data, total, page, limit, has_more}`. `rows()` and `totalOf()` in `lib/api/types.ts` read them.
  - Some endpoints differ: `/admin/tenants` returns `{tenants}`.
- **Errors.** The text to show is `apiErrorMessage()` from `lib/api/errors.ts`. marketflow-api sends `{error: <message>, code}`.
- **Mutations** toast on success and on failure. Destructive actions go through a confirm dialog.

## Copy and look

- Write sentence case and plain verbs, and name things the way the user would.
- Don't use em-dash connectors or "§".
- Don't use "AI-powered", "on autopilot" or other copy that narrates itself.
- Don't use sparkle, wand or robot icons, colour gradients, glowing halos, or emoji in the UI.
- **App icon.** `public/logo-mark.svg` (MF monogram plus the Codevertex vertex mark, same tile as mail-ui) is the one source. Regenerate the favicon and PWA icons from it rather than drawing new ones; use `BrandMark` for the mark in the UI. A tenant without a logo shows its initials in the sidebar, never the MarketFlow mark.
- **Claims on public pages must be true of the product today.** The landing page was checked against the code on 2026-10-23.
- **Forever Living content** follows `marketflow/docs/compliance-rules.md`:
  - no income figures or guarantees
  - always the income disclosure link
  - no Forever logo without authorisation

## Accessibility checklist before shipping

- Contrast is 4.5:1 for body text. Focus rings are visible. Icon-only buttons have an `aria-label`.
- No horizontal scroll at 375px. Content clears the bottom nav (`pb-[calc(6rem+env(safe-area-inset-bottom))]`).
- Motion respects `prefers-reduced-motion`, and there is at most one orchestrated animation per page.
- Light and dark modes are checked separately.

## Known gaps

- The ui-ux-pro-max skill's search script does not run on this machine. Its `scripts` and `data` folders are unresolved git symlinks to a missing `src/`, so its rules were applied by hand.
- Logo, cover and product images are entered as links. MarketFlow has no image upload endpoint yet.
- The glass utilities live in this app. If a third app needs them, move them into shared-ui-lib as a CSS export.
