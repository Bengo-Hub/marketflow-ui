import { CalendarDays, Globe, KanbanSquare, MessagesSquare, Repeat, UsersRound, Store, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { signUpUrl } from "@/lib/urls";
import { BrandMark } from "./brand-mark";

const CAPABILITIES = [
  {
    icon: Globe,
    title: "Collect leads wherever people find you",
    body: "Your own public page and landing pages, Facebook and TikTok lead forms, and short links that count every click. Each enquiry lands in one list with where it came from.",
    span: "lg:col-span-7",
  },
  {
    icon: MessagesSquare,
    title: "A chat assistant that knows your business",
    body: "It answers from the knowledge base you write, on your website and your public page, and points people to your WhatsApp or a booked call when they want to talk to you.",
    span: "lg:col-span-5",
  },
  {
    icon: Repeat,
    title: "Follow-ups that go out on time",
    body: "Sequences send email, SMS and WhatsApp messages on the days you choose, and each sequence shows how many were opened, clicked and replied to.",
    span: "lg:col-span-4",
  },
  {
    icon: CalendarDays,
    title: "Bookings without the back and forth",
    body: "Visitors pick a free slot from your Google Calendar on your public page or in chat.",
    span: "lg:col-span-4",
  },
  {
    icon: KanbanSquare,
    title: "A pipeline you can keep up to date",
    body: "Deals by stage, tasks with due dates, and every call, message and note on one timeline.",
    span: "lg:col-span-4",
  },
  {
    icon: UsersRound,
    title: "A marketing team on call",
    body: "Ask for a campaign plan, ad copy or a weekly brief. You see the cost before anything runs, and every draft waits for your approval.",
    span: "lg:col-span-12",
  },
];

export function Capabilities() {
  return (
    <section id="what-it-does" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        From the first question to the paid invoice
      </h2>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Six jobs that usually live in six different apps, or in a notebook.
      </p>
      <div className="mt-10 grid gap-4 lg:grid-cols-12">
        {CAPABILITIES.map(({ icon: Icon, title, body, span }) => (
          <article key={title} className={cn("glass rounded-[1.5rem] p-6", span)}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Set up your page",
    body: "Add your logo, what you sell, your WhatsApp number and your calendar. MarketFlow gives you a public page at your own link.",
  },
  {
    title: "Share it and run your ads",
    body: "Put the link in your bio, your status and your ads, or connect your Facebook and TikTok lead forms.",
  },
  {
    title: "Work your leads in one list",
    body: "The assistant answers first, follow-ups go out on schedule, and you step in to close.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-border/60 bg-background/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Up and running in an afternoon</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary font-display font-semibold text-primary">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Audiences() {
  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:px-6 md:grid-cols-2 lg:py-24">
      <article className="glass rounded-[1.5rem] p-7">
        <Store className="h-6 w-6 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">For shops, salons, clinics and service businesses</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          List your products and services on your page, take bookings, and keep every customer&apos;s history in
          one place. It works with Codevertex PowerSuite, so customers you serve at the till show up here too.
        </p>
      </article>
      <article className="glass rounded-[1.5rem] p-7">
        <Leaf className="h-6 w-6 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">For Forever Business Owners</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Add your distributor ID and your page lists featured Forever products that open your own Forever shop.
          Opportunity wording follows Forever&apos;s income disclosure rules, and prospects can book a call with you directly.
        </p>
      </article>
    </section>
  );
}

const CONNECTS = ["Facebook and Instagram", "TikTok", "Google Calendar", "WhatsApp", "Email", "SMS", "Codevertex PowerSuite"];

export function Connects() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
      <h2 className="font-display text-2xl font-semibold tracking-tight">Works with what you already use</h2>
      <ul className="mt-6 flex flex-wrap gap-2.5">
        {CONNECTS.map((c) => (
          <li key={c} className="glass rounded-full px-4 py-2 text-sm font-medium text-foreground">
            {c}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Closing() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="rounded-[1.75rem] bg-primary px-6 py-12 text-primary-foreground sm:px-12">
        <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Your next customer may already be asking
        </h2>
        <p className="mt-3 max-w-xl text-lg text-primary-foreground/85">Set up your page today and see the first leads arrive in your list.</p>
        <a
          href={signUpUrl()}
          className="mt-8 inline-flex min-h-12 items-center rounded-2xl bg-white px-6 text-base font-semibold text-primary transition-colors hover:bg-white/90"
        >
          Create your workspace
        </a>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 pb-safe">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-6 w-6" />
          <span className="font-medium text-foreground">MarketFlow</span>
          <span>by</span>
          <a href="https://codevertexafrica.com" className="font-medium text-foreground hover:text-primary">Codevertex Africa</a>
        </div>
        <p>&copy; {new Date().getFullYear()} Codevertex Africa Ltd.</p>
      </div>
    </footer>
  );
}
