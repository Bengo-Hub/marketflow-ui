import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://marketflowapi.codevertexitsolutions.com";

async function getProfile(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/profile/${slug}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function FBOProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getProfile(slug);

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-b from-amber-400/20 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="h-20 w-20 rounded-full bg-amber-400 flex items-center justify-center text-black text-2xl font-bold mx-auto mb-4">
            {(profile.name || slug).charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold mb-2">{profile.name || slug}</h1>
          <p className="text-muted-foreground">Forever Business Owner</p>
          {profile.whatsapp_number && (
            <a
              href={`https://wa.me/${profile.whatsapp_number}?text=Hi%20I%27m%20interested%20in%20your%20products`}
              className="inline-flex items-center gap-2 mt-4 px-6 py-2 bg-green-500 text-white rounded-full hover:bg-green-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat on WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
        <h2 className="text-2xl font-bold mb-6">Forever Living Products</h2>
        <p className="text-muted-foreground mb-8">
          Discover the power of pure aloe vera. Over 46 years of health and wellness,
          operating in 160+ countries worldwide.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {profile.fbo_distrib_id && (
            <a
              href={`https://shop.foreverliving.com/retail/entry/Shop.do?store=${profile.flp_store_code || "KEN"}&language=${profile.flp_language || "en"}&distribID=${profile.fbo_distrib_id}`}
              className="block p-6 border rounded-lg hover:border-amber-400 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <h3 className="font-semibold mb-1">Shop Products</h3>
              <p className="text-sm text-muted-foreground">Browse the full product catalog</p>
            </a>
          )}
          <a
            href={`https://join.foreverliving.com/marketing/joinnow/applicationForm.do?action=display&store=${profile.flp_store_code || "KEN"}&distribID=${profile.fbo_distrib_id || ""}&menuoff=n&langID=${profile.flp_language || "en"}`}
            className="block p-6 border rounded-lg hover:border-amber-400 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <h3 className="font-semibold mb-1">Join My Team</h3>
            <p className="text-sm text-muted-foreground">Start your own FBO business</p>
          </a>
        </div>
      </div>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Powered by Codevertex Africa Ltd</p>
      </footer>
    </div>
  );
}
