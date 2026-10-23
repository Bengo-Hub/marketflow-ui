import { Check, CalendarCheck, MessageCircle, UserPlus, BadgeCheck } from "lucide-react";
import { signUpUrl } from "@/lib/urls";
import { SignInButton } from "./auth-actions";

const FACTS = [
  "Facebook and TikTok lead forms",
  "Chat on your website and public page",
  "Email, SMS and WhatsApp follow-ups",
];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24">
      <div>
        <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-6xl">
          Answer every enquiry. Follow up every lead.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          MarketFlow keeps your public page, lead forms, chat, follow-ups and sales pipeline in one place, so the
          people who ask about what you sell hear back while they are still interested.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={signUpUrl()}
            className="inline-flex min-h-12 items-center rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-dark"
          >
            Create your workspace
          </a>
          <SignInButton className="min-h-12 rounded-2xl border border-border bg-background/60 px-6 text-base">
            Sign in
          </SignInButton>
        </div>
        <ul className="mt-8 space-y-2.5">
          {FACTS.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-[15px] text-foreground/85">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>
      <LeadJourney />
    </section>
  );
}

/**
 * One lead's path through MarketFlow, drawn with the app's own surfaces: the enquiry, the reply,
 * the booked call and the won deal. The only animated moment on the page (a single staggered rise
 * on load, skipped when reduced motion is on).
 */
function LeadJourney() {
  return (
    <figure aria-label="Example: a lead from a Facebook form becomes a won deal" className="relative">
      <div aria-hidden className="absolute bottom-8 left-[1.6rem] top-8 w-px bg-primary/20" />
      <ol className="relative space-y-4">
        <Step delay={0} icon={<UserPlus className="h-4 w-4" />} when="9:12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tint/15 font-display text-sm font-semibold text-foreground">AO</div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Achieng Otieno</p>
              <p className="text-sm text-muted-foreground">New lead from your Facebook form</p>
            </div>
          </div>
          <p className="mt-3 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Interested in: bridal package</p>
        </Step>

        <Step delay={120} icon={<MessageCircle className="h-4 w-4" />} when="9:13">
          <div className="space-y-2 text-[15px]">
            <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-foreground">Do you have Saturday slots in December?</p>
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground">
              Yes, 6 and 13 December are open. Shall I book a short call with Grace to confirm?
            </p>
          </div>
        </Step>

        <Step delay={240} icon={<CalendarCheck className="h-4 w-4" />} when="9:15">
          <p className="font-semibold text-foreground">Call booked for Thursday, 10:00</p>
          <p className="text-sm text-muted-foreground">Added to Grace&apos;s Google Calendar</p>
        </Step>

        <Step delay={360} icon={<BadgeCheck className="h-4 w-4" />} when="Thu" tone="success">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold text-foreground">Deal won</p>
            <p className="font-display text-xl font-semibold text-success tabular">KES 18,000</p>
          </div>
        </Step>
      </ol>
    </figure>
  );
}

function Step({
  children,
  icon,
  when,
  delay,
  tone = "primary",
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  when: string;
  delay: number;
  tone?: "primary" | "success";
}) {
  return (
    <li className="animate-rise relative flex gap-4" style={{ "--rise-delay": `${delay}ms` } as React.CSSProperties}>
      <span
        className={
          tone === "success"
            ? "relative z-10 mt-4 flex h-[3.2rem] w-[3.2rem] shrink-0 items-center justify-center rounded-2xl bg-success text-success-foreground shadow-soft"
            : "relative z-10 mt-4 flex h-[3.2rem] w-[3.2rem] shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft"
        }
      >
        {icon}
      </span>
      <div className="glass min-w-0 flex-1 rounded-[1.25rem] p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground tabular">{when}</p>
        {children}
      </div>
    </li>
  );
}
