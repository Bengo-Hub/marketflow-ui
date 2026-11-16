"use client";

import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import { AI_API_URL, API_URL, APP_URL } from "@/lib/urls";

// Markdown written by the AI only loads images from our own hosts. An image from anywhere else
// would make the reader's browser call that host (a tracking pixel), so it shows its label instead.
const MEDIA_HOSTS = ["media.codevertexafrica.com"];

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function currentOrigin(): string {
  return typeof window === "undefined" ? APP_URL : window.location.origin;
}

export function allowedImageHosts(): string[] {
  return [...MEDIA_HOSTS, hostOf(API_URL), hostOf(AI_API_URL), hostOf(APP_URL), hostOf(currentOrigin())].filter(Boolean);
}

/** True when an image may load: https (or this site's own origin) on one of our hosts. data: never. */
export function isAllowedImage(src: string | undefined): boolean {
  if (!src) return false;
  let u: URL;
  try {
    u = new URL(src, currentOrigin());
  } catch {
    return false;
  }
  if (u.origin === currentOrigin() && (u.protocol === "https:" || u.protocol === "http:")) return true;
  return u.protocol === "https:" && allowedImageHosts().includes(u.host);
}

/** True for http(s) links that leave this site. */
export function isExternalLink(href: string | undefined): boolean {
  if (!href) return false;
  try {
    const u = new URL(href, currentOrigin());
    return (u.protocol === "https:" || u.protocol === "http:") && u.origin !== currentOrigin();
  } catch {
    return false;
  }
}

const components: Components = {
  img({ src, alt }) {
    const url = typeof src === "string" ? src : undefined;
    if (!isAllowedImage(url)) {
      return <span className="italic text-muted-foreground">{alt || "image"}</span>;
    }
    // eslint-disable-next-line @next/next/no-img-element -- markdown images have no known size
    return <img src={url} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" className="max-w-full rounded-lg" />;
  },
  a({ href, children }) {
    if (isExternalLink(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow">
          {children}
        </a>
      );
    }
    return <a href={href}>{children}</a>;
  },
};

type Props = Omit<Options, "components" | "remarkPlugins">;

/** ReactMarkdown with GFM and the image and link rules above. Use it for any AI written text. */
export function SafeMarkdown(props: Props) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} {...props} />;
}
