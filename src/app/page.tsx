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
  Facebook,
  Linkedin,
  Chrome,
  Music2,
  Wallet,
  Brain,
  Video,
  Calendar,
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

  const handleLogin = () => useAuthStore.getState().redirectToSSO(window.location.href);
  const handleSignup = () => {
    const authURL = process.env.NEXT_PUBLIC_AUTH_API_URL || "https://sso.codevertexafrica.com";
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
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-black font-bold text-xs bg-gradient-to-br from-amber-400 to-amber-500">M</div>
            <span className="text-lg font-bold tracking-tight">MarketFlow</span>
          </div>
          <nav className="hidden sm:flex items-center gap-5 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition">Features</a>
            <a href="#integrations" className="text-muted-foreground hover:text-foreground transition">Integrations</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleLogin}>Sign In</Button>
            <Button size="sm" onClick={handleSignup} className="bg-amber-400 hover:bg-amber-500 text-black font-medium">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — compact */}
        <section className="mx-auto max-w-6xl px-4 py-12 md:py-16 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] text-muted-foreground mb-4">
            <Sparkles className="h-3 w-3 text-amber-500" /> AI-powered marketing on autopilot
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15]">
            Grow your business with{" "}
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
              AI marketing
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Capture leads, run ad campaigns, build funnels, and nurture prospects — all
            orchestrated by AI. One platform for products, services, or network marketing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <Button onClick={handleSignup} className="gap-2 bg-amber-400 hover:bg-amber-500 text-black font-medium px-6">
              Start Free <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogin}>Sign In</Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">No credit card required</p>

          {/* Mini flow diagram */}
          <div className="mt-8 flex items-center justify-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground overflow-x-auto">
            {[
              { icon: Users, label: "Lead captured" },
              { icon: Bot, label: "AI qualifies" },
              { icon: Mail, label: "Nurture sent" },
              { icon: CalendarClock, label: "Meeting booked" },
              { icon: TrendingUp, label: "Deal closed" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-1 sm:gap-2">
                {i > 0 && <span className="text-amber-400">→</span>}
                <div className="flex items-center gap-1 rounded-full border px-2 py-1">
                  <step.icon className="h-3 w-3 text-amber-500" />
                  <span className="whitespace-nowrap">{step.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features — 2-col on mobile, 3-col on md, 4-col on lg */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Everything you need to grow</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              One platform for chatbots, campaigns, funnels, nurture, scheduling, and analytics.
            </p>
          </div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-xl border p-4 transition hover:shadow-sm hover:border-amber-200">
                <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition">
                  <f.icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold leading-tight">{f.title}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Integrations — Lucide icons, no external CDN */}
        <section id="integrations" className="border-y bg-muted/30 py-10">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Connects with your stack</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Ad networks, calendars, messaging, payments, and AI models — all in one place.
              </p>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-w-2xl mx-auto">
              {INTEGRATIONS.map((int_) => (
                <div key={int_.name} className="flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 text-center transition hover:shadow-sm">
                  <int_.icon className="h-5 w-5" style={{ color: int_.color }} />
                  <span className="text-[10px] text-muted-foreground leading-tight">{int_.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works — compact 3-step */}
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-8">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Connect", desc: "Link your ad accounts, calendar, and wallet. MarketFlow handles the rest." },
              { step: "2", title: "Tell the AI", desc: "\"Set up a Meta campaign for C9\" — AI checks integrations, calculates costs, builds everything." },
              { step: "3", title: "Watch it run", desc: "Leads flow in, nurture fires, meetings book, dashboard shows ROI in real-time." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold">
                  {s.step}
                </div>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing — compact */}
        <section id="pricing" className="border-t bg-muted/30 py-10">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Simple pricing</h2>
              <p className="mt-2 text-sm text-muted-foreground">Start free. Scale as you grow.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-xl border p-5 ${plan.featured ? "border-amber-400 shadow-md ring-1 ring-amber-100" : "bg-card"}`}
                >
                  {plan.featured && (
                    <span className="mb-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Popular
                    </span>
                  )}
                  <h3 className="font-bold">{plan.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-xs text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.desc}</p>
                  <ul className="mt-4 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs">
                        <Check className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`mt-4 w-full text-xs ${plan.featured ? "bg-amber-400 hover:bg-amber-500 text-black" : ""}`}
                    variant={plan.featured ? "default" : "outline"}
                    size="sm"
                    onClick={handleSignup}
                  >
                    {plan.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-3">Ready to automate your marketing?</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Join businesses using MarketFlow to capture leads, run campaigns, and close deals — powered by AI.
          </p>
          <Button onClick={handleSignup} className="gap-2 bg-amber-400 hover:bg-amber-500 text-black font-medium px-6">
            Get Started Free <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </section>
      </main>

      <footer className="border-t py-4">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded flex items-center justify-center text-black font-bold text-[8px] bg-amber-400">M</div>
            <span className="text-xs font-semibold">MarketFlow</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            &copy; {new Date().getFullYear()} Codevertex Africa Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Bot, title: "AI Chatbot", desc: "Answer product questions 24/7 with RAG-powered AI that knows your catalog." },
  { icon: Megaphone, title: "Ad Automation", desc: "Launch Meta, Google, TikTok campaigns from a single prompt." },
  { icon: Users, title: "Lead CRM", desc: "Every interaction becomes a lead. Filter, segment, export." },
  { icon: Mail, title: "Nurture Sequences", desc: "Multi-channel follow-ups: email, SMS, WhatsApp with dynamic variables." },
  { icon: CalendarClock, title: "Scheduling", desc: "Google Calendar booking widget. AI books meetings from chat." },
  { icon: BarChart3, title: "Analytics", desc: "Campaign CTR, CPL. Sequence open rates. Visitor tracking." },
  { icon: Globe, title: "Profiles & Funnels", desc: "Public /p/{slug} profiles and /f/{slug} landing pages." },
  { icon: Target, title: "Conversion Tracking", desc: "Meta CAPI + Google Ads offline conversions auto-uploaded." },
  { icon: Shield, title: "Compliance", desc: "FDA disclaimers, approved language, income guardrails built in." },
  { icon: Smartphone, title: "Chat Widget", desc: "Single <script> tag. Shadow DOM. Works on any site." },
  { icon: Zap, title: "Multi-Provider AI", desc: "Groq, OpenAI, Claude, Ollama. Switch from the admin panel." },
  { icon: MessageSquare, title: "WhatsApp Links", desc: "wa.me deep links in every profile, funnel, and chat response." },
];

const INTEGRATIONS = [
  { name: "Meta", icon: Facebook, color: "#0866FF" },
  { name: "Google Ads", icon: Chrome, color: "#4285F4" },
  { name: "TikTok", icon: Music2, color: "#000000" },
  { name: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  { name: "WhatsApp", icon: MessageSquare, color: "#25D366" },
  { name: "Calendar", icon: Calendar, color: "#4285F4" },
  { name: "Groq", icon: Zap, color: "#F55036" },
  { name: "OpenAI", icon: Brain, color: "#412991" },
  { name: "Claude", icon: Bot, color: "#D97706" },
  { name: "Paystack", icon: Wallet, color: "#00C3F7" },
  { name: "M-Pesa", icon: Smartphone, color: "#4CAF50" },
];

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "Explore AI marketing.",
    featured: false,
    cta: "Start Free",
    features: ["1 campaign", "100 leads/mo", "5 AI chats/mo", "Profile page", "Chat widget", "Email nurture"],
  },
  {
    name: "Growth",
    price: "KES 3,500",
    period: "/mo",
    desc: "Scale your pipeline.",
    featured: true,
    cta: "Start Growth",
    features: ["5 campaigns", "1,000 leads/mo", "100 AI chats/mo", "Ad automation", "Google Ads + Meta CAPI", "WhatsApp + SMS", "Analytics", "Priority support"],
  },
  {
    name: "Pro",
    price: "KES 8,500",
    period: "/mo",
    desc: "For teams & agencies.",
    featured: false,
    cta: "Start Pro",
    features: ["Unlimited campaigns", "Unlimited leads", "500 AI chats/mo", "All Growth features", "Multi-brand", "Custom AI training", "API access"],
  },
];
