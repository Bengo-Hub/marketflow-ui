export default function PlatformOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform console</h1>
        <p className="text-sm text-muted-foreground">
          Manage shared infrastructure, tenant lifecycle, and security for every MarketFlow deployment.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card title="AI providers" href="/platform/providers" desc="Groq, Tavily, Ollama — shared across all tenants." />
        <Card title="Messaging providers" href="/platform/messaging" desc="Email, SMS, WhatsApp, Push credentials (managed by notifications-api)." />
        <Card title="Tenants" href="/platform/tenants" desc="Create, suspend, or override plan for any tenant." />
        <Card title="Usage" href="/platform/usage" desc="Per-tenant usage against plan limits." />
        <Card title="Security" href="/platform/security" desc="Encryption key rotation, audit log, recent admin actions." />
      </div>
    </div>
  );
}

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      className="block rounded-lg border bg-card p-4 transition hover:border-[var(--brand-primary)] hover:shadow-sm"
    >
      <div className="text-base font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </a>
  );
}
