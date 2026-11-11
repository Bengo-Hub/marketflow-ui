# Embeddable Chat Widget

Single-file vanilla JS widget that injects a shadow-DOM chat panel into any host page.

## Plain HTML

```html
<script
  src="https://marketflow.codevertexafrica.com/widget/chat.js"
  data-tenant="YOUR_TENANT_SLUG_OR_UUID"
  data-api-url="https://marketflowai.codevertexafrica.com"
  data-primary-color="#9100B0"
  data-logo-url="https://example.com/logo.png"
  async></script>
```

## React and Next.js

The widget reads its options from its own `<script>` tag, so it is loaded as a script tag, not imported as a module. In Next.js:

```tsx
import Script from "next/script";

export function ChatWidget() {
  return (
    <Script
      src="https://marketflow.codevertexafrica.com/widget/chat.js"
      strategy="lazyOnload"
      data-tenant="YOUR_TENANT_SLUG_OR_UUID"
      data-api-url="https://marketflowai.codevertexafrica.com"
      data-primary-color="#9100B0"
    />
  );
}
```

In a plain React app, the same tag goes in `index.html`, or a component adds it once:

```tsx
useEffect(() => {
  const s = document.createElement("script");
  s.src = "https://marketflow.codevertexafrica.com/widget/chat.js";
  s.async = true;
  s.dataset.tenant = "YOUR_TENANT_SLUG_OR_UUID";
  s.dataset.apiUrl = "https://marketflowai.codevertexafrica.com";
  document.body.appendChild(s);
  return () => s.remove();
}, []);
```

## Options

| Attribute | Meaning |
|---|---|
| `data-tenant` | The business slug or UUID (required). |
| `data-api-url` | The assistant API. |
| `data-widget-title` | The assistant's name in the header (default Vera). |
| `data-subtitle` | The line under the name, usually the business name. |
| `data-primary-color`, `data-accent-color` | Header and button colours. |
| `data-logo-url` | The business logo in the button and header. Only an `https://` link is used; a logo that fails to load falls back to the first letter of the name. |
| `data-whatsapp`, `data-phone`, `data-email`, `data-call-url` | Contact buttons in the header. |
| `data-theme` | `light`, `dark` or `auto`. |
| `data-autoopen` | `true` opens the panel on load. |

The widget:
- Renders a floating button in the bottom-right corner and opens a 360×520 panel on click.
- Sends messages to `POST {api-url}/api/v1/public/chat` with the `X-Tenant-ID` header.
- Keeps a `session_id` across turns.
- Uses Shadow DOM, so host-page CSS cannot leak into the widget.

## Cache

Served by the dashboard's static handler; ingress should set `Cache-Control: public, max-age=3600` on `/widget/*`.
