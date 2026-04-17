/*!
 * MarketFlow embeddable chat widget v2
 *
 * Usage:
 *   <script src="https://marketflow.codevertexitsolutions.com/widget/chat.js"
 *           data-tenant="{tenant-slug}"
 *           data-api-url="https://marketflowai.codevertexitsolutions.com"
 *           async></script>
 *
 * Features:
 *   - Shadow DOM isolation (no CSS conflicts)
 *   - Auto-greeting with wave animation after 3s
 *   - Floating FAQ chips to jumpstart conversations
 *   - Rich answer rendering (bold, links, product cards, action chips)
 *   - Typing indicator with bouncing dots
 *   - Mobile responsive (full-screen on small viewports)
 */
(function () {
  'use strict';
  if (window.__mfWidgetLoaded) return;
  window.__mfWidgetLoaded = true;

  var script = document.currentScript;
  var tenantSlug = script && script.dataset.tenant;
  var apiURL = (script && script.dataset.apiUrl) || 'https://marketflowai.codevertexitsolutions.com';
  var brandColor = (script && script.dataset.color) || '#f59e0b';
  var autoOpen = script && script.dataset.autoopen === 'true';
  if (!tenantSlug) { console.warn('[mf-widget] data-tenant required'); return; }

  var host = document.createElement('div');
  host.id = 'mf-chat-root';
  host.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647';
  document.body.appendChild(host);
  var shadow = host.attachShadow({ mode: 'open' });

  // ── Styles ────────────────────────────────────────────────────────
  var css = `
:host,*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
.fab{width:56px;height:56px;border-radius:50%;background:${brandColor};color:#fff;border:none;cursor:pointer;
  box-shadow:0 4px 14px rgba(0,0,0,.25);font-size:22px;display:flex;align-items:center;justify-content:center;transition:transform .2s}
.fab:hover{transform:scale(1.08)}
.fab .wave{display:inline-block;animation:wave 1.5s ease-in-out 2}
@keyframes wave{0%,100%{transform:rotate(0)}20%{transform:rotate(14deg)}40%{transform:rotate(-8deg)}60%{transform:rotate(14deg)}80%{transform:rotate(-4deg)}}
.fab .close{font-size:18px}
.greeting{position:absolute;bottom:68px;right:0;background:#fff;border-radius:12px;padding:10px 14px;box-shadow:0 4px 16px rgba(0,0,0,.15);
  font-size:13px;color:#333;max-width:220px;animation:fadeIn .3s;cursor:pointer;border:1px solid #eee}
.greeting:after{content:'';position:absolute;bottom:-6px;right:20px;width:12px;height:12px;background:#fff;transform:rotate(45deg);border-right:1px solid #eee;border-bottom:1px solid #eee}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.panel{position:absolute;bottom:68px;right:0;width:370px;max-height:560px;background:#fff;border-radius:16px;
  box-shadow:0 10px 40px rgba(0,0,0,.2);display:none;flex-direction:column;overflow:hidden}
@media(max-width:420px){.panel{position:fixed;left:8px;right:8px;bottom:72px;top:auto;width:auto;max-height:60vh;border-radius:14px}}
.panel.open{display:flex}
.hdr{background:${brandColor};color:#fff;padding:14px 16px;font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px}
.hdr .dot{width:8px;height:8px;border-radius:50%;background:#4ade80;flex-shrink:0}
.hdr .sub{font-size:11px;font-weight:400;opacity:.85}
.body{flex:1;overflow-y:auto;padding:12px;background:#f9fafb;scroll-behavior:smooth}
.welcome{text-align:center;padding:16px 8px;color:#6b7280;font-size:13px}
.welcome .hi{font-size:28px;margin-bottom:4px}
.faqs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:10px}
.faq{font-size:11px;padding:5px 10px;border-radius:16px;border:1px solid #e5e7eb;background:#fff;color:#374151;cursor:pointer;transition:all .15s}
.faq:hover{border-color:${brandColor};color:${brandColor}}
.msg{max-width:82%;margin-bottom:6px;padding:8px 12px;border-radius:14px;line-height:1.5;font-size:13px;word-break:break-word}
.msg a{color:${brandColor};text-decoration:underline}
.msg strong,.msg b{font-weight:600}
.msg ul,.msg ol{padding-left:16px;margin:4px 0}
.msg li{margin-bottom:2px}
.msg code{background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:12px}
.user{background:${brandColor};color:#fff;margin-left:auto;border-bottom-right-radius:4px}
.bot{background:#fff;color:#111827;border:1px solid #e5e7eb;border-bottom-left-radius:4px}
.dots{display:flex;gap:3px;padding:8px 12px;max-width:60px}
.dots span{width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:bounce .6s infinite}
.dots span:nth-child(2){animation-delay:.15s}
.dots span:nth-child(3){animation-delay:.3s}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.card{display:flex;gap:8px;padding:8px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;margin-bottom:6px;max-width:88%}
.card img{width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0}
.card .cb{flex:1;min-width:0}
.card .ct{font-weight:600;font-size:12px;color:#111827}
.card .cm{font-size:10px;color:#6b7280;margin:2px 0 4px}
.card .cc{display:inline-block;background:${brandColor};color:#fff;font-size:11px;padding:3px 8px;border-radius:12px;text-decoration:none}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0 6px}
.chip{font-size:11px;padding:4px 10px;border-radius:12px;border:1px solid ${brandColor};background:#fff;color:${brandColor};text-decoration:none;cursor:pointer}
.chip:hover{background:${brandColor}11}
.inp{display:flex;padding:8px 10px;border-top:1px solid #e5e7eb;background:#fff;gap:6px;align-items:center}
.inp input{flex:1;border:1px solid #e5e7eb;border-radius:20px;padding:8px 14px;font-size:13px;outline:none;transition:border .15s}
.inp input:focus{border-color:${brandColor}}
.inp button{background:${brandColor};color:#fff;border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.inp button:disabled{opacity:.4;cursor:not-allowed}
.powered{text-align:center;padding:4px;font-size:9px;color:#9ca3af;background:#fff;border-top:1px solid #f3f4f6}
.powered a{color:#6b7280;text-decoration:none}
`;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  shadow.appendChild(styleEl);

  // ── FAB button ────────────────────────────────────────────────────
  var fab = document.createElement('button');
  fab.className = 'fab';
  fab.setAttribute('aria-label', 'Chat with us');
  fab.innerHTML = '<span class="wave">👋</span>';
  shadow.appendChild(fab);

  // ── Greeting bubble (auto-shows after 3s) ─────────────────────────
  var greeting = document.createElement('div');
  greeting.className = 'greeting';
  greeting.style.display = 'none';
  greeting.innerHTML = '👋 Hi there! How can I help you today?';
  shadow.appendChild(greeting);

  var greetingTimer = setTimeout(function () {
    if (!panelOpen) {
      if (autoOpen) {
        // Auto-expand the chat panel on profile pages
        panelOpen = true;
        panel.classList.add('open');
        fab.innerHTML = '<span class="close">✕</span>';
      } else {
        greeting.style.display = 'block';
        setTimeout(function () { greeting.style.display = 'none'; }, 8000);
      }
    }
  }, 2000);

  // ── Panel ─────────────────────────────────────────────────────────
  var panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = [
    '<div class="hdr"><span class="dot"></span><div><div>Chat with us</div><div class="sub">Typically replies instantly</div></div></div>',
    '<div class="body" id="mf-body">',
    '<div class="welcome"><div class="hi">👋</div>Hi there!<br>Ask me anything about our products or business.<div class="faqs" id="mf-faqs"></div></div>',
    '</div>',
    '<form class="inp" id="mf-form"><input id="mf-input" placeholder="Ask anything..." autocomplete="off" /><button type="submit" id="mf-send">▶</button></form>',
    '<div class="powered">Powered by <a href="https://marketflow.codevertexitsolutions.com" target="_blank">MarketFlow</a></div>',
  ].join('');
  shadow.appendChild(panel);

  var panelOpen = false;
  fab.addEventListener('click', function () {
    panelOpen = !panelOpen;
    panel.classList.toggle('open');
    greeting.style.display = 'none';
    clearTimeout(greetingTimer);
    fab.innerHTML = panelOpen ? '<span class="close">✕</span>' : '<span class="wave">💬</span>';
    if (panelOpen) shadow.getElementById('mf-input').focus();
  });
  greeting.addEventListener('click', function () {
    greeting.style.display = 'none';
    panelOpen = true;
    panel.classList.add('open');
    fab.innerHTML = '<span class="close">✕</span>';
    shadow.getElementById('mf-input').focus();
  });

  // ── FAQ chips ─────────────────────────────────────────────────────
  var faqs = shadow.getElementById('mf-faqs');
  var faqList = [
    'What products do you offer?',
    'How does the business work?',
    'Tell me about C9',
    'How can I join?',
  ];
  faqList.forEach(function (q) {
    var chip = document.createElement('button');
    chip.className = 'faq';
    chip.textContent = q;
    chip.addEventListener('click', function () { sendMessage(q); });
    faqs.appendChild(chip);
  });

  var body = shadow.getElementById('mf-body');
  var form = shadow.getElementById('mf-form');
  var input = shadow.getElementById('mf-input');
  var sendBtn = shadow.getElementById('mf-send');
  var sessionID = null;
  var sending = false;

  function scrollBottom() { body.scrollTop = body.scrollHeight; }

  function appendMsg(role, html) {
    var d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    d.innerHTML = html;
    body.appendChild(d);
    scrollBottom();
    return d;
  }

  function showDots() {
    var d = document.createElement('div');
    d.className = 'msg bot dots';
    d.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(d);
    scrollBottom();
    return d;
  }

  // Markdown: **bold**, *italic*, [link](url), bare URLs, `code`, ### headers, - lists
  function md(text) {
    if (!text) return '';
    // Step 1: Extract URLs BEFORE escaping (& in URLs would become &amp;)
    var urls = [];
    var safe = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function(_, label, url) {
      var i = urls.length;
      urls.push({ label: label, url: url });
      return '%%MDLINK' + i + '%%';
    });
    safe = safe.replace(/(https?:\/\/[^\s<>)\]]+)/g, function(url) {
      // Strip trailing punctuation that's not part of the URL
      var clean = url.replace(/[.,;:!?)]+$/, '');
      var i = urls.length;
      urls.push({ label: null, url: clean });
      return '%%BAREURL' + i + '%%' + url.slice(clean.length);
    });
    // Step 2: Escape HTML
    safe = escapeHTML(safe);
    // Step 3: Apply markdown formatting
    safe = safe
      .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:8px 0 4px">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size:15px;font-weight:700;margin:8px 0 4px">$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
    // Step 4: Restore URLs as clickable links
    var linkStyle = 'color:#2563eb;text-decoration:underline;word-break:break-all';
    safe = safe.replace(/%%MDLINK(\d+)%%/g, function(_, i) {
      var u = urls[parseInt(i)];
      return '<a href="' + u.url + '" target="_blank" rel="noreferrer" style="' + linkStyle + '">' + escapeHTML(u.label) + '</a>';
    });
    safe = safe.replace(/%%BAREURL(\d+)%%/g, function(_, i) {
      var u = urls[parseInt(i)];
      // Show a short label for long URLs
      var label = u.url.length > 50 ? u.url.replace(/^https?:\/\//, '').slice(0, 40) + '...' : u.url;
      return '<a href="' + u.url + '" target="_blank" rel="noreferrer" style="' + linkStyle + '">' + escapeHTML(label) + '</a>';
    });
    return safe;
  }

  function renderAnswer(text, meta) {
    // Clear welcome message on first answer
    var welcome = body.querySelector('.welcome');
    if (welcome) welcome.remove();

    appendMsg('bot', md(text));

    // Product cards
    if (meta && Array.isArray(meta.products)) {
      meta.products.forEach(function (p) {
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML =
          (p.image_url ? '<img src="' + escapeAttr(p.image_url) + '" alt="" />' : '') +
          '<div class="cb"><div class="ct">' + escapeHTML(p.name || p.product_code || 'Product') + '</div>' +
          '<div class="cm">' + (p.price ? escapeHTML(p.price) + ' · ' : '') + (p.cc_value ? 'CC ' + escapeHTML(String(p.cc_value)) : '') + '</div>' +
          (p.buy_url ? '<a class="cc" target="_blank" rel="noreferrer" href="' + escapeAttr(p.buy_url) + '">Buy now</a>' : '') +
          '</div>';
        body.appendChild(card);
      });
    }

    // Action chips from URLs in response
    var urls = (text || '').match(/https?:\/\/[^\s)]+/g) || [];
    var chips = [];
    urls.forEach(function (u) {
      if (/wa\.me/.test(u)) chips.push({ label: '💬 WhatsApp', href: u });
      else if (/cal(endar)?\./.test(u)) chips.push({ label: '📅 Book call', href: u });
      else if (/join\.foreverliving/.test(u)) chips.push({ label: '🤝 Join team', href: u });
      else if (/shop\.foreverliving/.test(u)) chips.push({ label: '🛒 Shop', href: u });
    });
    if (chips.length) {
      var row = document.createElement('div');
      row.className = 'chips';
      chips.forEach(function (c) {
        var a = document.createElement('a');
        a.className = 'chip'; a.target = '_blank'; a.rel = 'noreferrer';
        a.href = c.href; a.textContent = c.label;
        row.appendChild(a);
      });
      body.appendChild(row);
    }
    scrollBottom();
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeAttr(s) { return escapeHTML(s); }

  async function sendMessage(q) {
    if (sending || !q) return;
    sending = true;
    sendBtn.disabled = true;
    input.value = '';

    // Remove welcome
    var welcome = body.querySelector('.welcome');
    if (welcome) welcome.remove();

    appendMsg('user', escapeHTML(q));
    var dots = showDots();

    try {
      var res = await fetch(apiURL + '/api/v1/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantSlug },
        body: JSON.stringify({ question: q, session_id: sessionID, stream: false })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      if (data.session_id) sessionID = data.session_id;
      var answer = (data.result && data.result.response) || data.response || '';
      var meta = (data.result && data.result.meta) || data.meta || null;
      body.removeChild(dots);
      renderAnswer(answer, meta);
    } catch (err) {
      body.removeChild(dots);
      appendMsg('bot', '😔 Sorry, I couldn\'t process that. Please try again.');
      console.error('[mf-widget]', err);
    } finally {
      sending = false;
      sendBtn.disabled = false;
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    sendMessage(input.value.trim());
  });
})();
