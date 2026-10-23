"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { signUpUrl } from "@/lib/urls";
import { SignInButton } from "./auth-actions";
import { BrandMark } from "./brand-mark";

const LINKS = [
  { href: "#what-it-does", label: "What it does" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 pt-safe transition-colors",
        scrolled ? "border-b border-border/70 bg-background/85 backdrop-blur-md" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="MarketFlow home">
          <BrandMark />
          <span className="font-display text-lg font-semibold tracking-tight">MarketFlow</span>
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <SignInButton />
          <a
            href={signUpUrl()}
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-dark"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Create your workspace</span>
          </a>
        </div>
      </div>
    </header>
  );
}
