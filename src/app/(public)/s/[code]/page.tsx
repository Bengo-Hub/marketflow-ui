import { redirect, notFound } from "next/navigation";
import { API_URL } from "@/lib/urls";

async function resolveShortLink(code: string): Promise<string | null> {
  try {
    // The API returns 302 redirect, but we call the resolve endpoint directly
    const res = await fetch(`${API_URL}/s/${code}`, {
      redirect: "manual", // Don't follow redirect, capture the Location header
    });
    if (res.status === 302 || res.status === 301) {
      return res.headers.get("Location");
    }
    return null;
  } catch {
    return null;
  }
}

export default async function ShortLinkRedirectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const targetUrl = await resolveShortLink(code);

  if (targetUrl) {
    redirect(targetUrl);
  }

  notFound();
}
