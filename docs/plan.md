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
| Sprint 21 | `[orgSlug]/team`: roster cards, the "Ask your Marketing Manager" console with the "We understood this as..." preview, the clarifying question, step progress, proposals with Approve and Discard, and a quick-start template gallery; `settings/marketing-context` (guided interview and editor); fix `settings/agents` (send `system_prompt`, add `allowed_tools`, `trigger_config`, `max_iterations`); daily brief toggle; sidebar entry "Marketing team"; platform providers catalog entries `ai_routing/policy`, `decide/typesafe`, `decide/openrouter`, `adintel/serpapi` |
| Sprint 15 additions | Creative Plan quote screen before generation (two cheaper options, no-render option); copy shortlist picker; poster tier in the studio |
| Sprint 22 | Inbox page for comments and DMs by intent; auto-reply settings |
| Sprint 23 | Lead timeline with the automated WhatsApp conversation, booking and hand-off; hand-off threshold and quiet hours |
| Sprint 24 | Research page: competitor list, long-running winners with tags, quota left this month |
