# Embeddable Chat Widget

Single-file vanilla JS widget that injects a shadow-DOM chat panel into any host page.

## Usage

```html
<script
  src="https://marketflow.codevertexafrica.com/widget/chat.js"
  data-tenant="YOUR_TENANT_SLUG_OR_UUID"
  data-api-url="https://marketflowai.codevertexafrica.com"
  async></script>
```

The widget:
- Renders a floating 💬 button in the bottom-right corner.
- Opens a 360×520 panel on click.
- Sends user messages to `POST {api-url}/api/v1/chat` with `X-Tenant-ID` header.
- Maintains a `session_id` across turns (returned by the API).
- Uses Shadow DOM so host-page CSS cannot leak into the widget.

## Cache

Served by the dashboard's static handler; ingress should set `Cache-Control: public, max-age=3600` on `/widget/*`.
