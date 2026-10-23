/** The public funnel (marketflow-api funnels.PublicFunnel) and its step blocks. */

export interface FunnelField {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

export type BlockType = "form" | "whatsapp" | "product" | "recruit" | "google_calendar" | "content";

export interface FunnelStep {
  id?: string;
  block_type?: BlockType;
  title?: string;
  description?: string;
  cta_text?: string;
  cta_url?: string;
  fields?: FunnelField[];
  product_code?: string;
  product_name?: string;
  product_image?: string;
  product_price?: string;
  product_cc?: string;
  whatsapp_message?: string;
}

export interface PublicFunnel {
  name: string;
  slug: string;
  funnel_type: string;
  tenant_slug: string;
  headline?: string;
  subheadline?: string;
  description?: string;
  brand_color?: string;
  hero_image_url?: string;
  steps: FunnelStep[];
  landing_page_html?: string;
}
