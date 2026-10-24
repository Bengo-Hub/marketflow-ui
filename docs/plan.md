# MarketFlow UI — Implementation Plan

**Last updated:** 2026-05-12

## Overview

MarketFlow UI is the React/Next.js frontend for the MarketFlow CRM platform. It serves:
- **Tenant dashboard**: lead management, campaign creation, AI chat, analytics
- **Widget distribution**: serves `chat.js` (Vera widget) and associated assets
- **Platform admin**: super-admin views for managing tenants, KB, usage

---

## Vera Widget (chat.js) Status

### v3.1 — CURRENT (Codevertex AI / Vera)

**Branding:**
- Primary colour from `data-primary-color` attribute (default: CSS --primary)
- Widget name: "Vera" with sub-header "● Online · Codevertex AI"
- Avatar: animated "V" monogram

**Tenant-configurable attributes:**
```html
<script
  src="https://marketflow.codevertexafrica.com/widget/chat.js"
  data-tenant="my-tenant"
  data-mode="platform"          <!-- platform | tenant -->
  data-api-url="https://marketflowai.codevertexafrica.com"
  data-whatsapp="254712345678"  <!-- wa.me number (no +) -->
  data-phone="+254712345678"    <!-- tel: link -->
  async>
</script>
```

**Dynamic in-chat forms (v3.1):**
- `buildForm(config, onSuccess)` factory — creates any form from field config
- `maybeShowForm(text, meta)` — detects intent from AI response and shows form
- Forms: support ticket, enrollment, book-a-call, contact
- Fallback chips shown on API error

**WhatsApp format:** Always `https://wa.me/{number}` — never WhatsApp Business API.

**File:** `public/widget/chat.js`

### v4 — COMPLETE (2026-05-22)

| Feature | Priority | Status |
|---------|----------|--------|
| SSE streaming support | HIGH | ✅ Done — ReadableStream token-by-token rendering |
| Conversation history (sessionStorage) | MEDIUM | ✅ Done — last 5 Q&A pairs restored on widget open |
| Course card component | MEDIUM | ✅ Done — rendered after stream completes from meta.courses |
| Full-screen mobile takeover (<480px) | LOW | ✅ Done — `position:fixed;inset:0` at <480px |

---

## KB Seed Data (Canonical Location)

**All platform-wide KB seed data lives in:**
- JSON: `marketflow-ui/public/kb/platform-seed.json`
- Script: `marketflow-ui/scripts/seed-kb.ts`

**Running the seed:**
```bash
# Set env vars
export MARKETFLOW_API_URL=https://marketflowapi.codevertexafrica.com
export MARKETFLOW_API_KEY=<INTERNAL_SERVICE_KEY>

# Preview (dry run)
pnpm tsx scripts/seed-kb.ts --dry-run

# Seed production
pnpm tsx scripts/seed-kb.ts
```

**Categories seeded (32 entries):**
platform_overview, marketflow_crm, auth_sso, ordering_pos, finance_treasury, logistics_tracking, isp_billing, subscriptions, notifications, erp, ticketing, digitika_courses, digitika_bootcamp, pricing_plans, onboarding_howto

**Adding new entries:**
1. Add entries to `platform-seed.json` with `"scope": "platform"` and the appropriate category
2. Run the seed script — it handles duplicates (409) gracefully

---

## Widget Deployment

**Embedding on codevertex-website:**
```html
<!-- public/widget-init.js or directly in layout -->
<script
  src="https://marketflow.codevertexafrica.com/widget/chat.js"
  data-tenant="codevertex"
  data-mode="platform"
  data-api-url="https://marketflowai.codevertexafrica.com"
  data-whatsapp="254743793901"
  data-phone="+254743793901"
  async>
</script>
```

> Note: The codevertex-website also has a native React `ChatBot.tsx` component that calls
> `/api/chat` → proxied to marketflow-ai. This is the primary integration.
> The embedded `chat.js` widget is for external/non-React sites.

---

## Codevertex Website Integration (Complete)

The codevertex-website (`src/app/api/chat/route.ts`) now:
1. Tries `POST {MARKETFLOW_AI_URL}/api/v1/chat` with `X-API-Key: INTERNAL_SERVICE_KEY`
2. Falls back to direct Anthropic Messages API if marketflow-ai is unavailable
3. Returns `{ text, source }` to `ChatBot.tsx`

Required env vars:
```env
MARKETFLOW_AI_URL=https://marketflowai.codevertexafrica.com
INTERNAL_SERVICE_KEY=<shared-key>
ANTHROPIC_API_KEY=<replace-me>  # fallback only
```

---

## Completed in Sprint 13 (2026-05-22)

| Task | Status |
|------|--------|
| CRM pages: Deals, Accounts, Activities, Tasks, Segments | ✅ Done |
| Lead detail page + activity timeline | ✅ Done |
| Contact detail page + 360° view tab | ✅ Done |
| Settings: Custom Fields page | ✅ Done |
| Settings: Custom Agents page | ✅ Done |
| Sidebar: collapsible groups with tenant branding (pos-ui pattern) | ✅ Done |
| API layer: deals, pipelines, accounts, activities, tasks, custom-fields, custom-agents, suggestions, segments | ✅ Done |
| chat.js v4: SSE streaming, conversation history, full-screen mobile | ✅ Done |
| Streaming support in widget (SSE) | ✅ Done |
| Ticketing AI triage endpoint (marketflow-ai) | ✅ Done (see marketflow-ai docs) |

## Completed in Sprint 13b — Vera AI Security Hardening (2026-05-22)

| Task | Status |
|------|--------|
| chat.js: data-api-url validated against allowed host list | ✅ Done |
| chat.js: data-mode/data-tenant enum + slug validation | ✅ Done |
| chat.js: OTP endpoints cross-origin rejection | ✅ Done |
| chat.js: client-side rate limiting (10 msg/60s + 2s cooldown) | ✅ Done |
| chat.js: message length cap (800 chars) | ✅ Done |
| chat.js: safeUrl() blocks javascript:/data: in card links | ✅ Done |
| chat.js: form submission limit (max 3/session) | ✅ Done |

## Remaining Tasks

| Task | Priority | Sprint |
|------|----------|--------|
| CRM AI dashboard widgets (pipeline health card, lead score card) | LOW | Backlog (sprint 14 is now Ads Autopilot foundations) |
| KB seeding to production | HIGH | Now |

## Ads Autopilot (planned 2026-10-22)

Design: `.claude/plans/marketflow-ads-autopilot-2026-10-22.md`. Sprint files: `docs/sprint-plans/sprint-14` to `sprint-20` in the marketflow docs folder.

| Phase | marketflow-ui scope |
|---|---|
| 0 Foundations (Sprint 14) | Integrations page: fix the `google_ads` slug mapping (`settings/integrations/page.tsx` L47); OAuth callbacks land on the tenant slug route; connected accounts list from ConnectedAccount with reconnect prompts |
| 1 Creative studio (Sprint 15) | `[orgSlug]/studio`: brief wizard with offering picker, script editor with hooks and diff, storyboard grid, render progress, review player through `/r/{token}`, version history; quote dialogs (credits, KES, shortfall, cheapest bundle); brand kit and private-previews settings; platform model registry, cost and margin, eval pages |
| 2 Organic publishing (Sprint 16) | Publish dialog per platform, content calendar, job status with retry and cancel |
| 4 Meta paid ads (Sprint 18) | Boost wizard: ad account health, guided KES account creation, budget and period, quote, Add funds with M-Pesa step with live balance, launch; campaign page with review status, spend, leads, CPL, pause and resume; leads list with ad source |
| 5 TikTok and Google (Sprint 19) | TikTok and Google options in the boost wizard with per-platform funding steps |
| 6 Autopilot (Sprint 20) | Agent store with Hire and setup wizard; agent builder (definition, triggers, approval mode, envelope, dry run, forecast, versions); agent dashboard with pending approvals and veto countdown |

UI rules: shared-ui-lib components, no AI-look icons or gradients, plain specific icons, humanised copy. Media helpers need a client boundary in server components. Preview videos never go through image transformations.

## Marketing OS (Sprint 21, 2026-10-22)

Design: `.claude/plans/marketflow-marketing-os-2026-10-22.md`. Checklist: `marketflow/docs/sprint-plans/sprint-21-marketing-os-brain.md`.

| Scope | marketflow-ui work |
|---|---|
| Sprint 21 | `[orgSlug]/team`: roster cards, the "Ask your Marketing Manager" console with the "We understood this as..." preview, the clarifying question, step progress, proposals with Approve and Discard, and a quick-start template gallery; `settings/marketing-context` (guided interview and editor); fix `settings/agents` (send `system_prompt`, add `allowed_tools`, `trigger_config`, `max_iterations`); daily brief toggle; sidebar entry "Marketing team"; platform providers catalog entries `ai_routing/policy`, `decide/typesafe`, `ai_registry/outputs`, `adintel/serpapi` |
| Sprint 15 additions | Creative Plan quote screen before generation (two cheaper options, no-render option); copy shortlist picker; poster tier in the studio |
| Sprint 22 | Inbox page for comments and DMs by intent; auto-reply settings |
| Sprint 23 | Lead timeline with the automated WhatsApp conversation, booking and hand-off; hand-off threshold and quiet hours |
| Sprint 24 | Research page: competitor list, long-running winners with tags, quota left this month |

Status 2026-10-23, Sprint 21 UI shipped:

- `[orgSlug]/team` has three tabs. Ask: the console with "Check first (free)" for the TaskSpec preview, "Send to the team (1 credit)", the clarifying question (refunded server side), the Creative Plan quote with Approve and "Quote this instead" for other media tiers, drafts with the reviewer's shortlist and findings, and next actions (unavailable ones are disabled). Team: roster with on/off, rename, writing level and extra instructions. Templates: playbook starters and curated prompts. Components live in `src/components/marketing-os/`, the API in `src/lib/api/marketing-os.ts`.
- `settings/marketing-context`: brand context editor (one item per line, server limits enforced) and the morning brief switch (`/tenant/os-settings`).
- `settings/agents` now matches the API: list and runs read `{data: [...]}`, it sends `system_prompt`, `allowed_tools` (curated read and CRM tools, no spending tools) and `max_iterations` (1 to 20), and it shows run answers from `trace.answer`. Since 2026-10-23 an agent can also run when a new lead arrives, when a lead becomes qualified, or daily or weekly at a set time (marketflow-api `5f2b402`). The form says that automatic runs cost 1 AI credit each, at most 50 a day per agent, and each run shows what started it.
- Providers catalog: `decide/typesafe`, `ai_routing/policy` and `ai_registry/outputs` (JSON textareas), and the Anthropic default is `claude-haiku-5-5`. `adintel/serpapi` waits for Sprint 24 code.
- Since added: a live status line with elapsed time (`fe0bde0`), Discard on the console (`839d7f5`), agent triggers on new contacts and deal stage moves (`839d7f5`), and the guided brand interview on the brand context page (`5b677eb`: five questions, a strategist draft for 1 credit, reviewed in the editor before saving).
- Step-by-step progress: the console streams `/os/ask` (`stream: true`, marketflow-ai `8f27679`) and lists each stage as it happens (reading the request, who is taking it, planning, each specialist, the review). If the stream cannot start it falls back to the plain request, so progress never blocks an answer. `tenantHeaders()` in `src/lib/api/client.ts` gives fetch calls the same tenant headers as axios.

## UI revamp: glass theme, platform brand, full wiring (2026-10-23)

Plan: `.claude/plans/marketflow-ui-glass-revamp-2026-10-23.md`. Design rules: `docs/ux-ui.md`.

### Done

| Area | What changed | Commits |
|---|---|---|
| Theme | Codevertex purple HSL tokens with a dark set, soft glass utilities, a Card override, Outfit and DM Sans, the shared-ui-lib `@source` scan | `b7f7f84` |
| Branding | `TenantBrandingProvider` replaces the local BrandContext; `BrandTheme` writes light and dark tenant colours | `b7f7f84` |
| Shell | Floating glass sidebar with every settings page, glass header, `MobileBottomNav` below lg, shell-owned padding and width | `b7f7f84` |
| Header bell | Was a stub; now shows overdue tasks, meetings in the next 24 hours, and agent suggestions (with dismiss) | `b7f7f84` |
| PWA | Icon set added (it was never committed); tenant manifest defaults fixed | `b7f7f84` |
| Landing | Rebuilt as a server component. Pricing is read live from the subscriptions API, because MarketFlow comes with PowerSuite and ERP plans | `bc19f85` |
| `/p/{slug}` | Generic and data-driven; Forever sections only for `flp`. Products come from `metadata.offerings`. Compliant opportunity copy, escaped JSON-LD, click tracker | `bc19f85` |
| `/f/{slug}` | New public funnel contract, step blocks, step-view tracking | `bc19f85`, api `4429cfa` |
| Settings > Profile | Offerings editor, cover, socials, booking switch, validation | `bc19f85`, `c6d9f4a` |
| Settings > Activity log | New page (`/analytics/audit` had no UI) | `c6d9f4a`, api `1bd1f92` |
| Platform > Service config | New page (`/admin/service-config` had no UI) | `c6d9f4a` |

### Backend changes made for the revamp (marketflow-api)

- **`7d9f0fc`:**
  - Public profile metadata allow-list. Private keys such as the Marketing OS brand context are no longer public.
  - Reserved keys are skipped on profile PATCH. `offerings` and `business_type` are validated.
  - Funnel HTML is sanitised. The funnel brand colour must be a hex colour.
  - Syncer business type fix, metadata merge on slug rename, and FLP default products.
  - Dashboard: one-scan lead figures, a daily series, leads by source, a 60s cache, and errors returned as errors.
- **`9f391b5`:** `contact_email` added to the public allow-list.
- **`4429cfa`:** the `PublicFunnel` contract, and the `create_funnel` legacy fields folded into steps and metadata.
- **`1bd1f92`:** an index on `audit_logs (tenant_id, occurred_at)`.

**Production repairs (2026-10-23, user approved).** Each ran as one SQL transaction with a dry run, backups and asserted counts.

| Change | Rows | Backup table |
|---|---|---|
| Tenants set from `flp` to `generic` | 15 | `tenants_bk_business_type_20261023` |
| Distributors seeded with 7 products each | 5 | `tenants_bk_flp_offerings_20261023` |
| Forever copy removed from the `codevertex` tenant | 1 | same backup table as the first row |

### Phase 5 done (2026-10-24)

| Page | What changed | Commits |
|---|---|---|
| dashboard | 7/30/90 day switch, lead trend and leads-by-source charts (one validated chart hue). Visitor tiles read keys `/analytics/profile` never returned, so they always showed "--" | `2432335` |
| leads | Server search (`q`), real source filter, dates, status tabs, phone card list. Export streams `/leads/export`; the old one stopped at 100 rows and failed silently. The detail page has status tabs and answers. The Delete button is gone: DELETE only marks a lead lost | `2432335`, api `7322fb3` |
| contacts | CSV import (500-row chunks, per-row results), merge into a chosen record, 360 detail page (orders, payments, loyalty, deals, meetings, tasks), edit, delete with a warning | `2432335`, api `86f848f` |
| activities | Logging sent `type` and was always a 400. Now there is a shared `ActivityTimeline` and a tenant-wide feed | `2432335`, api `90d23ab` |
| custom fields | Values panel on lead and contact pages (the values endpoints had no UI) | `2432335` |
| campaigns | Send SMS was a 404 (missing tenant segment). The campaign header never loaded. Added pause, resume and start, End (DELETE completes), lead counts, `channel`, and the campaign's own currency | `1245bc3`, api `9c0b70e` |
| funnels | Block builder, publish, take offline, archive, copy link, results. Leads now carry `funnel_id`. Slugs are validated and one tenant owns each slug | `a45e5ef`, api `26d721b`, `5791ac2` |
| sequences | Cards with an on/off switch, editor with WhatsApp/SMS/email messages, waits and variables, results from both analytics endpoints | `26a770c` |
| meetings | Agenda grouped by day; held, no-show and cancel; booking dialog | `6012bf2` |
| short links | Tap counts, kinds, copy, create; targets must be web links | `3e7bbbc`, api `95e98da` |
| knowledge | Restyled with search; platform-shared entries are read-only for tenants | `67a092a`, api `e891225` |
| crm/tasks | Contract fixed (`due_at`, `normal`, `done`, `overdue=true`); record picker for the linked lead, contact or deal | `5d68d47` |
| crm/deals | Board by stage, deal sheet with timeline, won/lost with `reason`; pipelines can be set up | `53936a2` |
| crm/segments | Rule builder over contact fields (match all or any), recount, delete. Lead segments count every lead and say so | `6bc36c3` |
| crm/accounts | Rebuilt on the typed API: edit, delete (contacts and deals are unlinked, `ON DELETE SET NULL`), contacts sheet. The old name search box was dropped: the API has no name filter | `6bc36c3` |

**Production crash fixed (2026-10-24).** `/{org}/dashboard` threw "Cannot read properties of null (reading 'length')" for a tenant with no leads: Go sent `by_source: null`. The API now returns `[]` (api `d37a81b`) and the UI normalises null lists in the dashboard, contact 360 and sequence modules (`6bc36c3`).

**App icons (2026-10-24).** `public/logo-mark.svg` is the source for every icon: an MF monogram on the mail-ui style white card over the brand gradient tile, with the Codevertex vertex mark as a seal. `favicon.svg`, a 16/32/48 `favicon.ico` (the Next default had been shipping), the manifest PNGs, apple-touch and maskable icons are all rendered from it, and `BrandMark` shows it. The generator lives outside the repo; to redo it, render `logo-mark.svg` with sharp at each size in `public/manifest.json`, with maskable art scaled to 78% so it sits in the safe zone.

### Done (2026-10-24, second round)

| Area | What changed | Commits |
|---|---|---|
| chat (dashboard) | SSE moved to `lib/api/chat.ts`. Compliance `replace` events now replace the text (the unfiltered answer used to stay on screen). Stream errors and the 402 credits reply show a message with retry or a billing link. Session memory works from turn one (marketflow-ai `e4daad5`). Prompts follow the business type. Delete per answer and Clear chat, erasing stored history through marketflow-ai `84d29f9` | `917e503`, `e8daaa9` |
| chat widget (`public/widget/chat.js`) | Block markdown renderer: tables, numbered lists, headings, quotes, code and rules (tables showed as raw pipes). Delete under each answer and a Clear button in the header, both two-tap and both erasing server history. Header uses the tenant colour alone | `e8daaa9` |
| /p | A broken profile photo link falls back to the initial (it failed before hydration, so onError never fired) | `e8daaa9` |
| settings/testimonials | Typed module and hooks, reorder, show/hide switch, star picker | `a752ff3`, api `94a548f` |
| settings/team | Was always empty (read `data.data`, API sends `members`) and offered roles that don't exist. Now Admin, Member, Viewer; admin-only controls; one-time temporary password for brand-new accounts | `542f704`, api `d669328` |

**Security fixes in marketflow-api (2026-10-24).**
- `d669328` team members: any signed-in member, a viewer included, could invite, change roles (including their own to admin) or remove people. These now need `marketflow_admin` (or a platform owner or service key), and nobody can change or remove themselves. The caller came from a client `X-User-ID` header; it now comes from the token. Invites went to an auth-api path that doesn't exist; they now use `/api/v1/s2s/tenants/{id}/members` with a body built server-side, because that route acts with platform rights. Role changes and removals are audited.
- `94a548f` testimonials: PATCH reset `display_order` to 0 on every publish toggle; role and photo could never be cleared; raw database errors reached the client. Now partial updates, input checks and audit events.

### Done (2026-10-24, third round)

**Billing: AI credits only.** The owner confirmed that the 5% fee on ad budgets is legacy. The 2026-10-22 ads decision stands: ad money goes to the client's own ad account at cost, and MarketFlow charges only AI credits (monthly plan or prepaid bundles).

| Area | What changed | Commits |
|---|---|---|
| settings/billing | Plan, this period's usage, and AI credit, WhatsApp and SMS balances from subscriptions-api; bundles bought through the shared `TreasuryPaymentModal`. Hard-coded limits, the 5% fee card and the wallet top-up removed. Money already in a Treasury wallet shows read-only (the old page called a wallet path that never existed) | `12c7851` |
| platform/billing | AI credits per business (search, status filter, paging) and a grant dialog with a reason and an idempotency key. The service-charge editor and a plan override that called a route which doesn't exist are gone; plans link to the pricing console | `12c7851` |
| `lib/api/client.ts` | `subscriptionsClient`: same token and 401 refresh, tenant identity headers only | `12c7851` |
| `/api/subscription` | Forwards the caller's own token instead of the platform service key, so it can no longer read any tenant's plan by id | `12c7851` |
| subscriptions-api seed | `SC_MARKETFLOW_ADS` deactivated on the next seed run (kept for history, like `SC_MARKETFLOW_AI_CREDIT`) | subscriptions-api `591c72a` |
| marketflow-ai (session 80) | `calculate_ad_cost` is a no-fee breakdown (ad budget at cost on the client's own account plus the AI-credit cost); no wallet wording in tools or prompts | marketflow-ai `b875519` |

**Onboarding backend (marketflow-api `821d50f`).**
- `GET /tenant/onboarding`: checklist of profile, offerings, brand context, channels and lead capture (team optional), each one indexed existence check. `POST /tenant/onboarding/dismiss`.
- `GET /tenant/marketing-context/draft`: a suggested brand context, never saved by itself. Sources:
  - the profile and auth-api account details (website, contacts, use case, brand colour);
  - the top 20 sellers: POS revenue over 90 days matched to the inventory catalogue, or the catalogue when POS has no sales;
  - published testimonials as proof;
  - for the platform tenant, codevertex-website's products and courses.

  Fields the owner filled are kept. FLP tenants get the compliance rules as banned claims. Sources run in parallel inside a 4 s budget, and a failed one is skipped.
- Supporting changes in other services:
  - pos-api `dcd447a`: sales per SKU are now summed in SQL; before, every order was loaded into memory. The S2S route also takes `order` and `limit`.
  - inventory-api `c778868`: items can be listed with `?skus=`.
  - codevertex-website `9ae0989`: `GET /api/catalog`.
- `tenant.SetMetadataKeys` merges metadata keys in one UPDATE. The profile, brand context and settings writers still rewrite the whole map, so concurrent saves can drop each other's key; session 80 was told about the helper for `marketingos`.

### Open (Phase 5 and the owner's 2026-10-24 asks)

| Item | Still to do |
|---|---|
| Onboarding UI | `/{org}/onboarding` flow (profile with auth defaults, link top offerings, brand context review, channels, first lead capture), a dashboard prompt from the checklist, and the brand context page redesign: chip lists, "Fill from my business data", offerings picked from the draft. Session 80 agreed this session owns `settings/marketing-context` |
| Shared components | Most tables and pickers are hand-rolled: move them to shared-ui-lib's DataTable and SearchableCombobox, wire missing edit and delete actions, and merge duplicated components |
| Profile PATCH | Switch to `tenant.SetMetadataKeys` with only the changed keys |
| settings/integrations | Restyle and the Google business hours editor. Asked session fc first (Sprint 14 owner); no answer yet |
| settings/custom-fields, settings hub | Restyle on the ui-kit; the hub still describes the profile as "FBO profile" for every tenant |
| studio (Sprint 15) | `[orgSlug]/studio` after the pages above. API: briefs, versions (202 then poll), revise (free), extend, approve/discard (Approve only for `marketflow_admin` or `fbo_owner`, api `7e6c943`), review links, `/os/creative/quote`, `daily_render_limit`, `restricted_categories` notice, assets kind `image` only |

### Flagged, not yet fixed

- **Subscription proxy, fleet-wide.** Ten other UI repos have the same `/api/subscription` route that looks up any tenant with the platform service key and no caller check. pos-ui's `/api/subscription/overage` also accepts an unauthenticated POST that turns overage billing on or off for any tenant. Fixed only in marketflow-ui; the others need the same token-forwarding change, and the owner has to decide whether this session rolls it out.
- **auth-api public tenant lookup leaks metadata.** `GET /api/v1/tenants/by-slug/{slug}` needs no sign-in and returns the whole tenant `metadata`, including backup object keys and the list of services. It should allow-list fields as MarketFlow's public profile does.
- **Campaign payment.** MarketFlow never debited a wallet, and that flow is retired. Launching a paid ad (fund the client's own ad account, then launch) is Sprint 18 work.
- **Dependabot.** GitHub reports 17 alerts on inventory-api (11 high) and 1 on marketflow-api.

- **Team invites need a live check.** The s2s route and service key match what other services use, but no invite has been sent against production yet. A member's role inside MarketFlow comes from the JIT sync on first sign-in (auth `admin` maps to Admin, `member` to Member, anything else to Viewer); someone already synced keeps their MarketFlow role until an admin changes it here.
- **Tenant audit events.** Done in api `1630db5` for profile, funnels, campaigns and leads (plus lead export), and now team changes and testimonials. Still open:
  - Integrations belong to the Sprint 14 session.
  - Agent create and delete belong to the Sprint 15 session, which will use `audit.Tenant`.
- **Suggestion producer.** No producer writes `suggestion` activities, so the bell's suggestions list stays empty until an agent writes them.
- **Funnel status.** Done: drafts, including the assistant's, are published from the Funnels page.
- **Image upload.** There is no image upload endpoint; logo, cover and product images are links.
- **Contact delete.** It is a hard delete with no event, so POS and Books records lose their customer link. Merge is the safe path for duplicates. A `crm.contact.deleted` event, or a soft delete, needs a decision.
- **Soft-delete naming.** Several "delete" endpoints don't delete: leads are marked lost, campaigns completed, funnels archived and sequences turned off. The UI labels each one by what it does.
- **Visual check.** Signed-in pages are screenshotted with a mocked API (a fake local session in Playwright). A pass against real tenant data after deploy is still due.
