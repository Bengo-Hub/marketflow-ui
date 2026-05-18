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
  src="https://marketflow.codevertexitsolutions.com/widget/chat.js"
  data-tenant="my-tenant"
  data-mode="platform"          <!-- platform | tenant -->
  data-api-url="https://marketflowai.codevertexitsolutions.com"
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

### v4 — PLANNED

| Feature | Priority | Notes |
|---------|----------|-------|
| SSE streaming support | HIGH | Faster perceived response |
| Course card component | MEDIUM | Rich display when KB returns course data |
| Service status chips | LOW | Quick links to live service dashboards |
| Conversation history (sessionStorage) | MEDIUM | Persist last 5 exchanges |
| Full-screen mobile takeover (<480px) | LOW | Better mobile UX |

---

## KB Seed Data (Canonical Location)

**All platform-wide KB seed data lives in:**
- JSON: `marketflow-ui/public/kb/platform-seed.json`
- Script: `marketflow-ui/scripts/seed-kb.ts`

**Running the seed:**
```bash
# Set env vars
export MARKETFLOW_API_URL=https://marketflowapi.codevertexitsolutions.com
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
  src="https://marketflow.codevertexitsolutions.com/widget/chat.js"
  data-tenant="codevertex"
  data-mode="platform"
  data-api-url="https://marketflowai.codevertexitsolutions.com"
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
MARKETFLOW_AI_URL=https://marketflowai.codevertexitsolutions.com
INTERNAL_SERVICE_KEY=<shared-key>
ANTHROPIC_API_KEY=<replace-me>  # fallback only
```

---

## Remaining Tasks

| Task | Priority | Sprint |
|------|----------|--------|
| Streaming support in widget (SSE) | MEDIUM | 4 |
| Course card rich component in widget | MEDIUM | 4 |
| CRM AI dashboard widgets | LOW | 6 |
| KB seeding to production | HIGH | Now |
| Ticketing AI triage endpoint (marketflow-ai) | HIGH | 5 |
