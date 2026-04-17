"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Bot,
  Megaphone,
  Users,
  TrendingUp,
  CalendarClock,
  BarChart3,
  Globe,
  Zap,
  Shield,
  Sparkles,
  MessageSquare,
  Target,
  Mail,
  Smartphone,
  Check,
} from "lucide-react";

export default function LandingPage() {
  const { status, user, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (status === "idle") initialize();
  }, [status, initialize]);

  useEffect(() => {
    if (status === "authenticated" && user?.tenantSlug) {
      router.push(`/${user.tenantSlug}/dashboard`);
    }
  }, [status, user, router]);

  const handleLogin = () => {
    useAuthStore.getState().redirectToSSO(window.location.href);
  };

  const handleSignup = () => {
    const authURL = process.env.NEXT_PUBLIC_AUTH_API_URL || "https://sso.codevertexitsolutions.com";
    window.location.href = `${authURL.replace("sso.", "accounts.")}/register`;
  };

  if (status === "loading" || status === "syncing") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-amber-50/30 dark:to-amber-950/10">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-black font-bold text-sm bg-gradient-to-br from-amber-400 to-amber-500">
              M
            </div>
            <span className="text-xl font-bold tracking-tight">MarketFlow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition">Features</a>
            <a href="#integrations" className="text-muted-foreground hover:text-foreground transition">Integrations</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleLogin}>Sign In</Button>
            <Button onClick={handleSignup} className="bg-amber-400 hover:bg-amber-500 text-black font-medium">
              Get Started Free
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3 text-amber-500" /> AI-powered marketing on autopilot
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Grow your business with<br />
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
              AI-powered marketing
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Capture leads, run ad campaigns, build landing funnels, and nurture prospects — all
            orchestrated by AI. Whether you sell products, services, or run a network
            marketing business, MarketFlow automates your entire pipeline.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={handleSignup} className="gap-2 bg-amber-400 hover:bg-amber-500 text-black font-medium px-8">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleLogin}>
              Sign In
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card required · 5 free AI chats/month</p>
        </section>

        {/* ── Features ────────────────────────────────────────────────── */}
        <section id="features" className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to grow</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              One platform for AI chatbots, ad campaigns, landing pages, nurture sequences,
              scheduling, and analytics.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-2xl border bg-card p-6 transition hover:shadow-md hover:border-amber-200">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Integrations ────────────────────────────────────────────── */}
        <section id="integrations" className="border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight">Connects with your stack</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                MarketFlow integrates with the platforms you already use — ad networks, calendars,
                messaging channels, payment gateways, and AI models.
              </p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 max-w-3xl mx-auto">
              {INTEGRATIONS.map((int_) => (
                <div key={int_.name} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition hover:shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://cdn.simpleicons.org/${int_.icon}/${int_.color}`}
                    alt={int_.name}
                    className="h-7 w-7"
                    loading="lazy"
                  />
                  <span className="text-[11px] text-muted-foreground leading-tight">{int_.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Connect", desc: "Link your ad accounts, calendar, and payment wallet. MarketFlow handles the rest." },
              { step: "2", title: "Tell the AI what you need", desc: "\"Set up a Meta lead ads campaign for C9\" — the AI checks your integrations, builds the funnel, and calculates costs." },
              { step: "3", title: "Watch it run", desc: "Leads come in, nurture sequences fire, meetings get booked, and your dashboard shows real-time ROI." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-lg font-bold">
                  {s.step}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────────── */}
        <section id="pricing" className="border-t bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
              <p className="mt-3 text-muted-foreground">Start free. Upgrade when you&apos;re ready.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl border p-6 ${plan.featured ? "border-amber-400 shadow-lg ring-1 ring-amber-200" : "bg-card"}`}
                >
                  {plan.featured && (
                    <span className="mb-3 inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`mt-6 w-full ${plan.featured ? "bg-amber-400 hover:bg-amber-500 text-black" : ""}`}
                    variant={plan.featured ? "default" : "outline"}
                    onClick={handleSignup}
                  >
                    {plan.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Ready to automate your marketing?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Join businesses using MarketFlow to capture leads, run campaigns, and close
            deals — all powered by AI.
          </p>
          <Button size="lg" onClick={handleSignup} className="gap-2 bg-amber-400 hover:bg-amber-500 text-black font-medium px-8">
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Button>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded flex items-center justify-center text-black font-bold text-[10px] bg-amber-400">M</div>
            <span className="text-sm font-semibold">MarketFlow</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Codevertex Africa Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Bot, title: "AI Chatbot", desc: "Answer product questions, handle objections, and qualify leads 24/7 with RAG-powered AI that knows your entire catalog." },
  { icon: Megaphone, title: "Ad Campaign Automation", desc: "Launch Meta, Google, TikTok, and LinkedIn ad campaigns from a single prompt. The AI builds your funnel, sets targeting, and goes live." },
  { icon: Users, title: "Lead Capture & CRM", desc: "Every interaction — ad click, chat message, form submit — becomes a lead. Filter, segment, and export with one click." },
  { icon: Mail, title: "Nurture Sequences", desc: "Automated multi-channel follow-ups: email, SMS, WhatsApp. Templates with dynamic variables personalised per lead." },
  { icon: CalendarClock, title: "Meeting Scheduling", desc: "Cal.com + Google Calendar integration. The AI books meetings directly from chat and syncs to your calendar." },
  { icon: BarChart3, title: "Campaign Analytics", desc: "Per-campaign impressions, clicks, CTR, CPL. Per-sequence open/click rates. Profile visitor tracking." },
  { icon: Globe, title: "Public Profile & Funnels", desc: "Shareable /p/{slug} profile pages and /f/{slug} landing funnels with product links, WhatsApp, and Cal.com booking." },
  { icon: Target, title: "Conversion Tracking", desc: "Meta CAPI + Google Ads offline conversions uploaded automatically. Attribute every sale back to the campaign that drove it." },
  { icon: Shield, title: "Compliance Built-in", desc: "FDA disclaimer injection, approved language substitution, and income-claim guardrails — every AI response is filtered before delivery." },
  { icon: Smartphone, title: "Embeddable Widget", desc: "Drop a single <script> tag on any website. The chat widget runs in Shadow DOM — no style conflicts, works everywhere." },
  { icon: Zap, title: "Multi-Provider AI", desc: "Groq, OpenAI, Anthropic, Ollama. Google Custom Search + Tavily for live web data. Switch models from the admin panel." },
  { icon: MessageSquare, title: "WhatsApp Deep Links", desc: "Every profile, funnel, and chat response includes wa.me links with pre-filled messages so leads can reach you instantly." },
];

const INTEGRATIONS = [
  { name: "Meta", icon: "meta", color: "0866FF" },
  { name: "Google Ads", icon: "googleads", color: "4285F4" },
  { name: "TikTok", icon: "tiktok", color: "000000" },
  { name: "LinkedIn", icon: "linkedin", color: "0A66C2" },
  { name: "WhatsApp", icon: "whatsapp", color: "25D366" },
  { name: "Google Calendar", icon: "googlecalendar", color: "4285F4" },
  { name: "Cal.com", icon: "caldotcom", color: "111827" },
  { name: "Groq", icon: "groq", color: "F55036" },
  { name: "OpenAI", icon: "openai", color: "412991" },
  { name: "Anthropic", icon: "anthropic", color: "191919" },
  { name: "Ollama", icon: "ollama", color: "000000" },
  { name: "Paystack", icon: "paystack", color: "00C3F7" },
];

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "For individuals exploring AI marketing.",
    featured: false,
    cta: "Start Free",
    features: [
      "1 active campaign",
      "100 leads/month",
      "5 AI chats/month",
      "Public profile page",
      "Embeddable chat widget",
      "Email nurture sequences",
    ],
  },
  {
    name: "Growth",
    price: "KES 3,500",
    period: "/month",
    desc: "For active marketers scaling their pipeline.",
    featured: true,
    cta: "Start Growth Trial",
    features: [
      "5 active campaigns",
      "1,000 leads/month",
      "100 AI chats/month",
      "Ad campaign automation",
      "Google Ads + Meta CAPI",
      "WhatsApp + SMS nurture",
      "Campaign analytics",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    price: "KES 8,500",
    period: "/month",
    desc: "For teams and agencies managing multiple brands.",
    featured: false,
    cta: "Start Pro Trial",
    features: [
      "Unlimited campaigns",
      "Unlimited leads",
      "500 AI chats/month",
      "All Growth features",
      "Multi-brand management",
      "Custom AI training",
      "Dedicated account manager",
      "API access",
    ],
  },
];
