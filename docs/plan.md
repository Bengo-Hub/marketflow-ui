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
| knowledge | API search (`q`) done; page still to restyle | api `e891225` |

### Open (Phase 5, remaining pages)

| Page | Still to do |
|---|---|
| knowledge | Restyle and add search. Platform-shared entries (`scope = platform`) are read-only for tenants |
| crm/deals | Deal drawer with timeline (`dealTimeline`) |
| crm/tasks | Contract fix: the page sends `due_date` and `priority: medium` and filters `completed`, but the API uses `due_at`, `normal` and `done` |
| settings/integrations | Google business hours editor (`PUT /integrations/google/business-hours`) |
| settings/billing | A separate client for subscriptions and treasury, so MarketFlow tenant headers stop going to other services |
| chat | Move SSE fetch to `lib/api/chat.ts`; drop the AI-look icons |
| platform/billing | Plans query filters `service=marketflow`, which matches no plan; per-tenant plan lookup; errors are swallowed |
| all others | Restyle on the ui-kit, move inline `apiClient` calls into modules and hooks |

### Flagged, not yet fixed

- **Tenant audit events.** Done in api `1630db5` for profile, funnels, campaigns and leads (plus lead export). Still open:
  - Team members live in auth-api; no audit there yet.
  - Integrations belong to the Sprint 14 session.
  - Agent create and delete belong to the Sprint 15 session, which will use `audit.Tenant`.
- **Suggestion producer.** No producer writes `suggestion` activities, so the bell's suggestions list stays empty until an agent writes them.
- **Funnel status.** Done: drafts, including the assistant's, are published from the Funnels page.
- **Image upload.** There is no image upload endpoint; logo, cover and product images are links.
- **Contact delete.** It is a hard delete with no event, so POS and Books records lose their customer link. Merge is the safe path for duplicates. A `crm.contact.deleted` event, or a soft delete, needs a decision.
- **Soft-delete naming.** Several "delete" endpoints don't delete: leads are marked lost, campaigns completed, funnels archived and sequences turned off. The UI labels each one by what it does.
- **Visual check.** Signed-in pages are screenshotted with a mocked API (a fake local session in Playwright). A pass against real tenant data after deploy is still due.
