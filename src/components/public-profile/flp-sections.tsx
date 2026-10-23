import { Handshake } from "lucide-react";

/**
 * Forever Living opportunity section, shown only for business_type "flp". Wording follows
 * marketflow/docs/compliance-rules.md: no income figures or guarantees, lifestyle framing, and the
 * income disclosure link is always shown.
 */
const BENEFITS = [
  { img: "/images/public-profile/argi-plus.jpg", title: "Margin on your own sales", body: "Buy at the business owner price and sell at the suggested retail price." },
  { img: "/images/public-profile/build-a-team.jpg", title: "Build a team", body: "Support the people you introduce. Bonuses follow Forever's Marketing Plan." },
  { img: "/images/public-profile/forever2drive-image.png", title: "Forever2Drive", body: "A car incentive for business owners who qualify." },
  { img: "/images/public-profile/global-travel.jpg", title: "Incentive travel", body: "Trips and events for business owners who qualify." },
  { img: "/images/public-profile/inheritable-business.jpg", title: "A business you can pass on", body: "Forever's rules let a qualifying business be passed to family." },
];

export function FlpOpportunity({ text, joinUrl }: { text?: string; joinUrl: string | null }) {
  return (
    <section aria-labelledby="opportunity" className="space-y-6">
      <div className="max-w-2xl">
        <h2 id="opportunity" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">The business opportunity</h2>
        {text && (
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
            {text.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((b) => (
          <article key={b.title} className="glass overflow-hidden rounded-[1.25rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.img} alt="" loading="lazy" className="h-36 w-full object-cover" />
            <div className="p-4">
              <h3 className="font-display text-base font-semibold">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
            </div>
          </article>
        ))}
      </div>
      {joinUrl && (
        <a
          href={joinUrl}
          target="_blank"
          rel="noreferrer"
          data-track="cta_click"
          data-track-meta='{"cta":"join"}'
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/70 px-5 text-sm font-semibold hover:border-primary/50"
        >
          <Handshake className="h-4 w-4 text-primary" />
          Join my team
        </a>
      )}
      <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
        Profits and bonuses described here are illustrations and do not reflect typical earnings. Results vary with
        effort, skill and time. Forever makes no guarantee of income. See Forever&apos;s Income Disclosure Statement at{" "}
        <a href="https://foreverliving.com/income" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
          foreverliving.com/income
        </a>
        .
      </p>
    </section>
  );
}
