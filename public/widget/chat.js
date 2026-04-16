/*!
 * MarketFlow embeddable chat widget
 *
 * Usage:
 *   <script src="https://marketflow.codevertexitsolutions.com/widget/chat.js"
 *           data-tenant="{tenant-slug}"
 *           data-api-url="https://marketflowai.codevertexitsolutions.com"
 *           async></script>
 *
 * Renders inside a Shadow DOM root so host-page CSS can't leak in.
 * Streams responses via fetch + ReadableStream SSE.
 */
(function () {
  'use strict';
  if (window.__mfWidgetLoaded) return;
  window.__mfWidgetLoaded = true;

  var script = document.currentScript;
  var tenantID = script && script.dataset.tenant;
  var apiURL = (script && script.dataset.apiUrl) || 'https://marketflowai.codevertexitsolutions.com';
  if (!tenantID) {
    console.warn('[marketflow-widget] data-tenant is required');
    return;
  }

  var host = document.createElement('div');
  host.id = 'mf-chat-root';
  host.style.position = 'fixed';
  host.style.bottom = '20px';
  host.style.right = '20px';
  host.style.zIndex = '2147483647';
  document.body.appendChild(host);
  var shadow = host.attachShadow({ mode: 'open' });

  var STYLE = [
    ':host,*{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,sans-serif}',
    '.btn{width:56px;height:56px;border-radius:50%;background:#16a34a;color:#fff;border:none;cursor:pointer;',
    'box-shadow:0 4px 12px rgba(0,0,0,.2);font-size:24px;display:flex;align-items:center;justify-content:center}',
    '.panel{position:absolute;bottom:72px;right:0;width:360px;height:520px;background:#fff;border-radius:12px;',
    'box-shadow:0 10px 30px rgba(0,0,0,.2);display:none;flex-direction:column;overflow:hidden}',
    '.panel.open{display:flex}',
    '.hdr{background:#16a34a;color:#fff;padding:12px 16px;font-weight:600}',
    '.body{flex:1;overflow-y:auto;padding:12px;background:#f9fafb}',
    '.msg{max-width:80%;margin-bottom:8px;padding:8px 12px;border-radius:12px;line-height:1.4;font-size:14px}',
    '.user{background:#16a34a;color:#fff;margin-left:auto;border-bottom-right-radius:2px}',
    '.bot{background:#fff;color:#111827;border:1px solid #e5e7eb;border-bottom-left-radius:2px}',
    '.typing{font-style:italic;color:#6b7280}',
    '.inp{display:flex;padding:8px;border-top:1px solid #e5e7eb;background:#fff;gap:8px}',
    '.inp input{flex:1;border:1px solid #e5e7eb;border-radius:20px;padding:8px 12px;font-size:14px;outline:none}',
    '.inp button{background:#16a34a;color:#fff;border:none;border-radius:20px;padding:8px 16px;cursor:pointer}',
    '.card{display:flex;gap:10px;padding:10px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;margin-bottom:8px;max-width:92%}',
    '.card img{width:64px;height:64px;border-radius:8px;object-fit:cover;flex-shrink:0}',
    '.card .c-body{flex:1;min-width:0}',
    '.card .c-title{font-weight:600;font-size:13px;color:#111827;margin-bottom:2px}',
    '.card .c-meta{font-size:11px;color:#6b7280;margin-bottom:6px}',
    '.card .c-cta{display:inline-block;background:#16a34a;color:#fff;font-size:12px;padding:4px 10px;border-radius:14px;text-decoration:none}',
    '.actions{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}',
    '.action{font-size:12px;padding:4px 10px;border-radius:14px;border:1px solid #16a34a;background:#fff;color:#16a34a;text-decoration:none;cursor:pointer}'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = STYLE;
  shadow.appendChild(style);

  var btn = document.createElement('button');
  btn.className = 'btn';
  btn.setAttribute('aria-label', 'Open chat');
  btn.textContent = '\uD83D\uDCAC';
  shadow.appendChild(btn);

  var panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = [
    '<div class="hdr">Chat with us</div>',
    '<div class="body" id="mf-body"></div>',
    '<form class="inp" id="mf-form"><input id="mf-input" placeholder="Ask anything..." autocomplete="off" /><button type="submit">Send</button></form>'
  ].join('');
  shadow.appendChild(panel);

  btn.addEventListener('click', function () { panel.classList.toggle('open'); });

  var body = shadow.getElementById('mf-body');
  var form = shadow.getElementById('mf-form');
  var input = shadow.getElementById('mf-input');
  var sessionID = null;

  function append(role, text) {
    var d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    d.textContent = text;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }

  // renderRichAnswer looks for assistant-emitted structured blocks (markdown
  // links + shop.foreverliving.com / wa.me / join.foreverliving.com URLs) and
  // upgrades them to product cards / action chips so the chat feels like a
  // storefront instead of a plain text transcript.
  function renderRichAnswer(text, meta) {
    var container = document.createElement('div');
    container.className = 'msg bot';
    container.textContent = text;
    body.appendChild(container);

    // Product cards — agent tool results include a `products` array when
    // get_product was invoked. See marketflow-ai/internal/agent/tools/get_product.go.
    if (meta && Array.isArray(meta.products)) {
      meta.products.forEach(function (p) {
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML =
          (p.image_url ? '<img src="' + escapeAttr(p.image_url) + '" alt="" />' : '') +
          '<div class="c-body">' +
          '<div class="c-title">' + escapeHTML(p.name || p.product_code || 'Product') + '</div>' +
          '<div class="c-meta">' +
            (p.price ? escapeHTML(p.price) + ' · ' : '') +
            (p.cc_value ? 'CC ' + escapeHTML(String(p.cc_value)) + ' · ' : '') +
            (p.product_code ? '#' + escapeHTML(p.product_code) : '') +
          '</div>' +
          (p.buy_url ? '<a class="c-cta" target="_blank" rel="noreferrer" href="' + escapeAttr(p.buy_url) + '">Buy now</a>' : '') +
          '</div>';
        body.appendChild(card);
      });
    }

    // Action chips — detect wa.me / cal.com / join FLP links in the answer
    // and surface them as buttons at the end of the bubble.
    var urlMatches = (text || '').match(/https?:\/\/[^\s)]+/g) || [];
    var chips = [];
    urlMatches.forEach(function (u) {
      if (/wa\.me/.test(u) && !chips.find(function(c){return c.type==='whatsapp';})) {
        chips.push({ type: 'whatsapp', label: 'WhatsApp', href: u });
      } else if (/cal(endar)?\./.test(u) && !chips.find(function(c){return c.type==='book';})) {
        chips.push({ type: 'book', label: 'Schedule call', href: u });
      } else if (/join\.foreverliving\.com/.test(u) && !chips.find(function(c){return c.type==='join';})) {
        chips.push({ type: 'join', label: 'Join my team', href: u });
      }
    });
    if (chips.length > 0) {
      var row = document.createElement('div');
      row.className = 'actions';
      chips.forEach(function (c) {
        var a = document.createElement('a');
        a.className = 'action';
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.href = c.href;
        a.textContent = c.label;
        row.appendChild(a);
      });
      body.appendChild(row);
    }

    body.scrollTop = body.scrollHeight;
    return container;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function escapeAttr(s) { return escapeHTML(s); }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    input.value = '';
    append('user', q);
    var typing = append('bot', '...');
    typing.classList.add('typing');

    try {
      var res = await fetch(apiURL + '/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantID },
        body: JSON.stringify({ question: q, session_id: sessionID, stream: false })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      if (data.session_id) sessionID = data.session_id;
      var answer = (data.result && data.result.response) || data.response || '';
      // Pull any structured meta the agent loop left on the response envelope
      // (products array, trace, etc.). Falls back to plain text on older APIs.
      var meta = (data.result && data.result.meta) || data.meta || null;
      // Replace the "..." placeholder with the rich rendering.
      body.removeChild(typing);
      renderRichAnswer(answer, meta);
    } catch (err) {
      typing.classList.remove('typing');
      typing.textContent = 'Sorry — something went wrong. Please try again.';
      console.error('[marketflow-widget]', err);
    }
  });
})();
