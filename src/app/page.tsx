"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Bot, Megaphone, Users, TrendingUp, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md flex items-center justify-center text-black font-bold text-sm bg-amber-400">
              M
            </div>
            <span className="text-xl font-bold">MarketFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleLogin}>Sign In</Button>
            <Button onClick={handleSignup} className="bg-amber-400 hover:bg-amber-500 text-black">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            AI-Powered Marketing<br />
            <span className="text-amber-400">Automation</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Automate your Forever Living Products business with AI chatbots, Meta ads,
            landing funnels, and nurture sequences — all running on autopilot.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={handleSignup} className="gap-2 bg-amber-400 hover:bg-amber-500 text-black">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleLogin}>Sign In</Button>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Bot, title: "AI Chatbot", desc: "Answer product questions and handle objections 24/7 with RAG-powered AI" },
              { icon: Megaphone, title: "Ad Automation", desc: "Create Meta ads, social posts, and email campaigns with one prompt" },
              { icon: Users, title: "Lead Management", desc: "Capture, qualify, and nurture leads automatically through funnels" },
              { icon: TrendingUp, title: "Grow Your Team", desc: "Recruit new FBOs with automated business opportunity funnels" },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6 text-left">
                <f.icon className="h-10 w-10 mb-4 text-amber-400" />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} MarketFlow by Codevertex. All rights reserved.</p>
      </footer>
    </div>
  );
}
