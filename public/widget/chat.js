/*!
 * Vera — Codevertex AI embeddable widget v3.1
 *
 * Usage:
 *   <script src="https://marketflow.codevertexitsolutions.com/widget/chat.js"
 *           data-tenant="my-tenant"
 *           data-mode="platform|tenant"
 *           data-api-url="https://marketflowai.codevertexitsolutions.com"
 *           data-whatsapp="254712345678"
 *           data-phone="+254712345678"
 *           data-call-url=""
 *           data-primary-color="#EC4899"
 *           data-accent-color="#7C3AED"
 *           data-widget-title="Vera"
 *           async></script>
 *
 * Modes:
 *   platform  — Codevertex-wide AI; answers about all services + Digitika courses
 *   tenant    — Tenant-specific AI; uses tenant KB + optional product catalog
 */
(function () {
  'use strict';
  if (window.__veraLoaded) return;
  window.__veraLoaded = true;

  var script = document.currentScript;
  var tenantSlug    = (script && script.dataset.tenant)        || 'codevertex';
  var apiURL        = (script && script.dataset.apiUrl)        || 'https://marketflowai.codevertexitsolutions.com';
  var mode          = (script && script.dataset.mode)          || 'tenant';
  var businessType  = (script && script.dataset.businessType)  || '';  // "flp" | "generic" | "" (auto-detect)
  var primaryColor  = (script && script.dataset.primaryColor)  || '#EC4899';
  var accentColor   = (script && script.dataset.accentColor)   || '#7C3AED';
  var widgetTitle   = (script && script.dataset.widgetTitle)   || 'Vera';
  var waNumber      = (script && script.dataset.whatsapp)      || '';  // e.g. "254712345678"
  var phoneNumber   = (script && script.dataset.phone)         || '';  // e.g. "+254712345678"
  var callUrl       = (script && script.dataset.callUrl)       || '';  // custom Calendly / booking URL
  var emailAddress  = (script && script.dataset.email)         || '';  // fallback contact email
  var subtitle      = (script && script.dataset.subtitle)      || '';  // header subtitle override
  var themeMode     = (script && script.dataset.theme)         || 'auto'; // "auto" | "light" | "dark"
  var autoOpen      = script && script.dataset.autoopen === 'true';
  // Authenticated user context — passed from SSO dashboard (VeraWidget.tsx)
  // or any host page that has the user's identity. Empty on public pages.
  var authUserID    = (script && script.dataset.userId)        || '';
  var authUserEmail = (script && script.dataset.userEmail)     || '';
  var authUserName  = (script && script.dataset.userName)      || '';
  var authUserRole  = (script && script.dataset.userRole)      || '';
  // OTP endpoints — provided by the SSO dashboard for email verification
  // before a helpdesk ticket is submitted.
  var otpSendEndpoint   = (script && script.dataset.otpSendEndpoint)   || '';
  var otpVerifyEndpoint = (script && script.dataset.otpVerifyEndpoint) || '';
  // Derive the base URL for OTP calls (same origin as the host page when
  // running inside the dashboard; falls back to empty for public pages).
  var otpBaseURL = otpSendEndpoint
    ? (otpSendEndpoint.startsWith('http') ? '' : window.location.origin)
    : '';

  var waHref   = waNumber    ? 'https://wa.me/' + waNumber  : '';
  var callHref = callUrl    || (phoneNumber ? 'tel:' + phoneNumber : '');
  var emailHref = emailAddress ? 'mailto:' + emailAddress : '';

  // Dynamic subtitle — explicit override > niche default
  var subtitleText = subtitle || (
    businessType === 'flp'        ? 'Forever Living &middot; Online' :
    businessType === 'codevertex' ? 'Codevertex AI &middot; Online'  :
                                    'AI Assistant &middot; Online'
  );

  // Session history
  var SESSION_KEY   = 'vera_session_' + tenantSlug;
  var HISTORY_KEY   = 'vera_history_' + tenantSlug;
  var sessionID     = null;
  var chatHistory   = []; // [{q, a}] last 5 pairs, persisted in sessionStorage
  try { sessionID = sessionStorage.getItem(SESSION_KEY); } catch { }
  try {
    var _h = sessionStorage.getItem(HISTORY_KEY);
    if (_h) chatHistory = JSON.parse(_h);
  } catch { }

  function saveHistory() {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(chatHistory.slice(-5))); } catch { }
  }

  // ── Host + Shadow DOM ────────────────────────────────────────────
  var host = document.createElement('div');
  host.id = 'vera-root';
  host.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;font-family:inherit';
  document.body.appendChild(host);
  var shadow = host.attachShadow({ mode: 'open' });

  // ── CSS ──────────────────────────────────────────────────────────
  var css = '\
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\
:host{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}\
\
.fab{\
  width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;\
  background:linear-gradient(135deg,' + primaryColor + ',' + accentColor + ');\
  box-shadow:0 4px 20px rgba(0,0,0,.28);\
  display:flex;align-items:center;justify-content:center;\
  transition:transform .2s,box-shadow .2s;position:relative\
}\
.fab:hover{transform:scale(1.06);box-shadow:0 6px 24px rgba(0,0,0,.35)}\
.fab:active{transform:scale(.97)}\
.fab .avatar{\
  width:36px;height:36px;border-radius:50%;\
  background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.5);\
  display:flex;align-items:center;justify-content:center;\
  font-weight:700;font-size:16px;color:#fff;letter-spacing:-.5px\
}\
.fab .close-icon{font-size:18px;color:#fff;line-height:1}\
.fab .pulse{\
  position:absolute;top:2px;right:2px;width:12px;height:12px;\
  border-radius:50%;background:#22c55e;border:2px solid #fff\
}\
.fab .pulse::after{\
  content:"";position:absolute;inset:-3px;border-radius:50%;\
  border:2px solid #22c55e;animation:pulse-ring 2s ease-out infinite\
}\
@keyframes pulse-ring{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(1.8)}}\
\
.greeting{\
  position:absolute;bottom:68px;right:0;\
  background:#fff;border-radius:14px;padding:12px 16px;\
  box-shadow:0 6px 24px rgba(0,0,0,.15);\
  font-size:13px;color:#374151;max-width:240px;\
  animation:slideUp .3s ease-out;cursor:pointer;\
  border:1px solid #f3f4f6\
}\
.greeting::after{\
  content:"";position:absolute;bottom:-6px;right:22px;\
  width:12px;height:12px;background:#fff;transform:rotate(45deg);\
  border-right:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6\
}\
\
.panel{\
  position:absolute;bottom:70px;right:0;width:380px;\
  background:#fff;border-radius:20px;\
  box-shadow:0 16px 48px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.08);\
  display:none;flex-direction:column;overflow:hidden;\
  max-height:600px;border:1px solid rgba(0,0,0,.06)\
}\
.panel.open{display:flex;animation:slideUp .25s ease-out}\
@media(max-width:480px){\
  .panel{position:fixed;inset:0;bottom:0;left:0;right:0;top:0;width:100%;max-height:100%;border-radius:0;z-index:2147483646}\
  .fab{bottom:16px;right:16px}\
}\
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}\
\
.hdr{\
  background:linear-gradient(135deg,' + primaryColor + ',' + accentColor + ');\
  color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0\
}\
.hdr-avatar{\
  width:38px;height:38px;border-radius:50%;\
  background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.5);\
  display:flex;align-items:center;justify-content:center;\
  font-weight:800;font-size:16px;flex-shrink:0\
}\
.hdr-info{flex:1;min-width:0}\
.hdr-name{font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px}\
.hdr-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;flex-shrink:0}\
.hdr-sub{font-size:11px;opacity:.85;margin-top:1px}\
.hdr-actions{display:flex;gap:5px;align-items:center}\
.hdr-btn{\
  background:rgba(255,255,255,.15);border:none;border-radius:50%;\
  width:30px;height:30px;cursor:pointer;color:#fff;font-size:15px;\
  display:flex;align-items:center;justify-content:center;flex-shrink:0;\
  transition:background .15s;text-decoration:none\
}\
.hdr-btn:hover{background:rgba(255,255,255,.28)}\
\
.body{flex:1;overflow-y:auto;padding:12px 14px;background:#f8fafc;scroll-behavior:smooth}\
.body::-webkit-scrollbar{width:4px}\
.body::-webkit-scrollbar-track{background:transparent}\
.body::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}\
\
.welcome{text-align:center;padding:18px 10px 8px;color:#6b7280}\
.welcome-icon{\
  width:52px;height:52px;border-radius:50%;margin:0 auto 10px;\
  background:linear-gradient(135deg,' + primaryColor + '22,' + accentColor + '22);\
  display:flex;align-items:center;justify-content:center;\
  font-weight:800;font-size:22px;color:' + primaryColor + '\
}\
.welcome-title{font-size:15px;font-weight:700;color:#111827;margin-bottom:4px}\
.welcome-sub{font-size:13px;color:#9ca3af;margin-bottom:14px;line-height:1.5}\
.faqs{display:flex;flex-wrap:wrap;gap:5px;justify-content:center}\
.faq{\
  font-size:12px;padding:5px 11px;border-radius:20px;\
  border:1px solid #e5e7eb;background:#fff;color:#374151;\
  cursor:pointer;transition:all .15s;white-space:nowrap\
}\
.faq:hover{border-color:' + primaryColor + ';color:' + primaryColor + ';background:' + primaryColor + '0d}\
\
.msg{\
  max-width:84%;margin-bottom:8px;padding:9px 13px;\
  border-radius:16px;line-height:1.55;font-size:13px;word-break:break-word\
}\
.msg a{color:' + accentColor + ';text-decoration:underline}\
.msg strong,.msg b{font-weight:600}\
.msg em,.msg i{font-style:italic}\
.msg ul,.msg ol{padding-left:16px;margin:4px 0}\
.msg li{margin-bottom:2px}\
.msg code{background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:11px;font-family:monospace}\
.user{\
  background:linear-gradient(135deg,' + primaryColor + ',' + accentColor + ');\
  color:#fff;margin-left:auto;border-bottom-right-radius:4px\
}\
.user a{color:#fff}\
.bot{\
  background:#fff;color:#111827;\
  border:1px solid #e5e7eb;border-bottom-left-radius:4px;\
  box-shadow:0 1px 3px rgba(0,0,0,.05)\
}\
\
.typing{\
  background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:4px;\
  padding:10px 14px;display:inline-flex;align-items:center;gap:6px;\
  max-width:130px;border-radius:16px;margin-bottom:8px;\
  box-shadow:0 1px 3px rgba(0,0,0,.05)\
}\
.typing-text{font-size:12px;color:#9ca3af}\
.dots{display:flex;gap:3px}\
.dots span{\
  width:6px;height:6px;border-radius:50%;\
  background:' + primaryColor + ';opacity:.6;\
  animation:bounce .8s infinite ease-in-out\
}\
.dots span:nth-child(2){animation-delay:.15s}\
.dots span:nth-child(3){animation-delay:.3s}\
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}\
\
.chips{display:flex;flex-wrap:wrap;gap:5px;margin:2px 0 8px}\
.chip{\
  font-size:12px;padding:5px 11px;border-radius:16px;\
  border:1px solid ' + primaryColor + '55;background:' + primaryColor + '0a;\
  color:' + primaryColor + ';text-decoration:none;cursor:pointer;\
  transition:all .15s;display:inline-flex;align-items:center;gap:4px\
}\
.chip:hover{background:' + primaryColor + ';color:#fff}\
\
.card{\
  display:flex;gap:10px;padding:10px;\
  border:1px solid #e5e7eb;border-radius:12px;\
  background:#fff;margin-bottom:6px;max-width:88%;\
  box-shadow:0 1px 4px rgba(0,0,0,.05)\
}\
.card img{width:52px;height:52px;border-radius:8px;object-fit:cover;flex-shrink:0}\
.card .cb{flex:1;min-width:0}\
.card .ct{font-weight:600;font-size:12px;color:#111827}\
.card .cm{font-size:11px;color:#6b7280;margin:2px 0 6px}\
.card .cc-link{\
  display:inline-block;\
  background:linear-gradient(135deg,' + primaryColor + ',' + accentColor + ');\
  color:#fff;font-size:11px;padding:4px 10px;border-radius:12px;text-decoration:none\
}\
\
.vera-form{\
  background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;\
  padding:14px;margin-bottom:8px;max-width:94%\
}\
.vera-form .vf-title{font-weight:700;font-size:13px;color:#111827;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}\
.vera-form .vf-close{background:none;border:none;cursor:pointer;color:#9ca3af;font-size:16px;line-height:1}\
.vera-form input,.vera-form textarea,.vera-form select{\
  width:100%;border:1px solid #e5e7eb;border-radius:8px;\
  padding:8px 10px;font-size:12px;outline:none;\
  font-family:inherit;transition:border .15s;margin-bottom:6px;\
  background:#fff;color:#111827\
}\
.vera-form textarea{resize:none}\
.vera-form input:focus,.vera-form textarea:focus,.vera-form select:focus{border-color:' + primaryColor + '}\
.vera-form .vf-row{display:flex;gap:6px}\
.vera-form .vf-row input{flex:1}\
.vera-form .vf-submit{\
  background:linear-gradient(135deg,' + primaryColor + ',' + accentColor + ');\
  color:#fff;border:none;border-radius:20px;\
  padding:9px 18px;font-size:12px;font-weight:700;\
  cursor:pointer;width:100%;transition:opacity .15s\
}\
.vera-form .vf-submit:hover{opacity:.9}\
.vera-form .vf-submit:disabled{opacity:.4;cursor:not-allowed}\
\
.inp{\
  display:flex;padding:10px 12px;border-top:1px solid #f1f5f9;\
  background:#fff;gap:8px;align-items:center;flex-shrink:0\
}\
.inp input{\
  flex:1;border:1.5px solid #e5e7eb;border-radius:22px;\
  padding:9px 16px;font-size:13px;outline:none;transition:border .15s;\
  font-family:inherit;background:#f8fafc;color:#111827\
}\
.inp input:focus{border-color:' + primaryColor + ';background:#fff}\
.inp input::placeholder{color:#9ca3af}\
.inp button{\
  background:linear-gradient(135deg,' + primaryColor + ',' + accentColor + ');\
  color:#fff;border:none;border-radius:50%;\
  width:36px;height:36px;cursor:pointer;\
  display:flex;align-items:center;justify-content:center;\
  flex-shrink:0;transition:opacity .15s,transform .1s\
}\
.inp button:hover{opacity:.9}\
.inp button:active{transform:scale(.95)}\
.inp button:disabled{opacity:.35;cursor:not-allowed}\
.send-icon{width:15px;height:15px;fill:#fff}\
\
.powered{text-align:center;padding:5px;font-size:10px;color:#cbd5e1;background:#fff;border-top:1px solid #f1f5f9}\
.powered a{color:#94a3b8;text-decoration:none}\
.powered a:hover{color:' + primaryColor + '}\
\
:host(.dark) .panel{background:#1e2535;border-color:rgba(255,255,255,.06)}\
:host(.dark) .body{background:#131c2e}\
:host(.dark) .bot{background:#2a3448;color:#f1f5f9;border-color:#374357}\
:host(.dark) .typing{background:#2a3448;border-color:#374357}\
:host(.dark) .typing-text{color:#94a3b8}\
:host(.dark) .greeting{background:#1e2535;color:#e2e8f0;border-color:#374357}\
:host(.dark) .greeting::after{background:#1e2535;border-color:#374357}\
:host(.dark) .inp{background:#1e2535;border-top-color:#374357}\
:host(.dark) .inp input{background:#131c2e;color:#f1f5f9;border-color:#374357}\
:host(.dark) .inp input::placeholder{color:#64748b}\
:host(.dark) .powered{background:#1e2535;border-top-color:#374357;color:#475569}\
:host(.dark) .powered a{color:#64748b}\
:host(.dark) .welcome{color:#94a3b8}\
:host(.dark) .welcome-title{color:#f1f5f9}\
:host(.dark) .welcome-sub{color:#64748b}\
:host(.dark) .welcome-icon{background:' + primaryColor + '22}\
:host(.dark) .faq{background:#2a3448;color:#cbd5e1;border-color:#374357}\
:host(.dark) .faq:hover{background:' + primaryColor + '1a}\
:host(.dark) .vera-form{background:#2a3448;border-color:#374357}\
:host(.dark) .vera-form input,:host(.dark) .vera-form textarea,:host(.dark) .vera-form select{background:#131c2e;color:#f1f5f9;border-color:#374357}\
:host(.dark) .vera-form .vf-title{color:#f1f5f9}\
:host(.dark) .card{background:#2a3448;border-color:#374357}\
:host(.dark) .card .ct{color:#f1f5f9}\
:host(.dark) .card .cm{color:#94a3b8}\
:host(.dark) .body::-webkit-scrollbar-thumb{background:#374357}\
';

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  shadow.appendChild(styleEl);

  // ── Dark / light mode ────────────────────────────────────────────
  function isDarkHost() {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    // auto: check host page class first, then system preference
    var htmlEl = document.documentElement;
    if (htmlEl.classList.contains('dark') || htmlEl.getAttribute('data-theme') === 'dark') return true;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applyTheme() {
    if (isDarkHost()) { host.classList.add('dark'); }
    else              { host.classList.remove('dark'); }
  }
  applyTheme();

  // React to host-page theme class changes (Tailwind dark mode toggle, etc.)
  if (window.MutationObserver) {
    new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  }
  // React to OS-level dark mode changes
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) { mq.addEventListener('change', applyTheme); }
    else if (mq.addListener)  { mq.addListener(applyTheme); } // Safari <14 fallback
  }

  // ── FAB ─────────────────────────────────────────────────────────
  var fab = document.createElement('button');
  fab.className = 'fab';
  fab.setAttribute('aria-label', 'Chat with Vera');
  fab.innerHTML = '<div class="avatar">V</div><div class="pulse"></div>';
  shadow.appendChild(fab);

  // ── Greeting bubble ──────────────────────────────────────────────
  var greeting = document.createElement('div');
  greeting.className = 'greeting';
  greeting.style.display = 'none';
  greeting.textContent = mode === 'platform'
    ? 'Hi! I\'m Vera, Codevertex AI. How can I help?'
    : 'Hi! I\'m Vera. Ask me anything!';
  shadow.appendChild(greeting);

  var greetingTimer = setTimeout(function () {
    if (!panelOpen) {
      if (autoOpen) { openPanel(); }
      else {
        greeting.style.display = 'block';
        setTimeout(function () { greeting.style.display = 'none'; }, 8000);
      }
    }
  }, 2500);

  // ── FAQ chips ────────────────────────────────────────────────────
  var platformFaqs = ['What is MarketFlow?', 'Tell me about Digitika courses', 'How does ordering work?', 'Get support'];
  var tenantFaqs   = ['What products do you offer?', 'How does the business work?', 'How can I join?', 'Book a call'];
  var faqList = mode === 'platform' ? platformFaqs : tenantFaqs;

  var faqHTML = faqList.map(function (q) {
    return '<button class="faq" data-q="' + escAttr(q) + '">' + escHTML(q) + '</button>';
  }).join('');

  // Header action buttons: WhatsApp → email fallback → call → close
  var hdrActions = '';
  if (waHref) {
    hdrActions += '<a class="hdr-btn" href="' + escAttr(waHref) + '" target="_blank" rel="noreferrer" title="WhatsApp us">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>' +
      '</a>';
  } else if (emailHref) {
    // Email fallback when no WhatsApp (e.g. FLP pages with dummy phone)
    hdrActions += '<a class="hdr-btn" href="' + escAttr(emailHref) + '" title="Email us">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 4 10 9 10-9"/></svg>' +
      '</a>';
  }
  if (callHref) {
    hdrActions += '<a class="hdr-btn" href="' + escAttr(callHref) + '" ' + (callUrl ? 'target="_blank" rel="noreferrer"' : '') + ' title="Call us">&#x260E;</a>';
  }
  hdrActions += '<button class="hdr-btn" id="vera-close" aria-label="Close">&#x2715;</button>';

  // ── Panel ────────────────────────────────────────────────────────
  var panel = document.createElement('div');
  panel.className = 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', widgetTitle + ' AI chat');

  panel.innerHTML = [
    '<div class="hdr">',
    '  <div class="hdr-avatar">V</div>',
    '  <div class="hdr-info">',
    '    <div class="hdr-name"><span class="hdr-dot"></span>' + escHTML(widgetTitle) + '</div>',
    '    <div class="hdr-sub">' + subtitleText + '</div>',
    '  </div>',
    '  <div class="hdr-actions">' + hdrActions + '</div>',
    '</div>',
    '<div class="body" id="vera-body">',
    '  <div class="welcome" id="vera-welcome">',
    '    <div class="welcome-icon">V</div>',
    '    <div class="welcome-title">Hello! I\'m Vera</div>',
    '    <div class="welcome-sub">Your Codevertex AI assistant.<br>Ask me anything.</div>',
    '    <div class="faqs" id="vera-faqs">' + faqHTML + '</div>',
    '  </div>',
    '</div>',
    '<form class="inp" id="vera-form">',
    '  <input id="vera-input" placeholder="Ask Vera anything…" autocomplete="off" aria-label="Message" />',
    '  <button type="submit" aria-label="Send">',
    '    <svg class="send-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>',
    '  </button>',
    '</form>',
    '<div class="powered">Powered by <a href="https://codevertexitsolutions.com" target="_blank" rel="noreferrer">Codevertex</a></div>',
  ].join('');
  shadow.appendChild(panel);

  var panelOpen = false;

  var historyRestored = false;
  function restoreHistory() {
    if (historyRestored || chatHistory.length === 0) return;
    historyRestored = true;
    removeWelcome();
    chatHistory.forEach(function (pair) {
      appendMsg('user', escHTML(pair.q));
      appendMsg('bot', md(pair.a));
    });
  }

  function openPanel() {
    panelOpen = true;
    panel.classList.add('open');
    restoreHistory();
    fab.innerHTML = '<div class="close-icon">&#x2715;</div>';
    var inp = shadow.getElementById('vera-input');
    if (inp) inp.focus();
  }
  function closePanel() {
    panelOpen = false;
    panel.classList.remove('open');
    fab.innerHTML = '<div class="avatar">V</div><div class="pulse"></div>';
  }

  fab.addEventListener('click', function () {
    greeting.style.display = 'none';
    clearTimeout(greetingTimer);
    if (panelOpen) { closePanel(); } else { openPanel(); }
  });
  greeting.addEventListener('click', function () {
    greeting.style.display = 'none';
    openPanel();
  });
  shadow.getElementById('vera-close').addEventListener('click', function () { closePanel(); });

  // FAQ chip clicks
  shadow.getElementById('vera-faqs').addEventListener('click', function (e) {
    var btn = e.target.closest('.faq');
    if (btn) sendMessage(btn.dataset.q);
  });

  var body    = shadow.getElementById('vera-body');
  var form    = shadow.getElementById('vera-form');
  var input   = shadow.getElementById('vera-input');
  var sending = false;

  function scrollBottom() { body.scrollTop = body.scrollHeight; }

  function removeWelcome() {
    var w = body.querySelector('#vera-welcome');
    if (w) w.remove();
  }

  function appendMsg(role, html) {
    removeWelcome();
    var d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    d.innerHTML = html;
    body.appendChild(d);
    scrollBottom();
    return d;
  }

  function showTyping(label) {
    var d = document.createElement('div');
    d.className = 'typing';
    d.innerHTML = '<span class="typing-text">' + (label || 'Thinking') + '</span><div class="dots"><span></span><span></span><span></span></div>';
    body.appendChild(d);
    scrollBottom();
    return d;
  }

  // ── Dynamic in-chat form builder ─────────────────────────────────
  function buildForm(config, onSuccess) {
    var wrap = document.createElement('div');
    wrap.className = 'vera-form';

    var titleBar = document.createElement('div');
    titleBar.className = 'vf-title';
    titleBar.innerHTML = escHTML(config.title) + '<button class="vf-close" aria-label="Close">&#x2715;</button>';
    titleBar.querySelector('.vf-close').addEventListener('click', function () {
      wrap.remove();
      appendMsg('bot', md("No problem! Is there anything else I can help with?"));
    });
    wrap.appendChild(titleBar);

    var fields = {};
    config.fields.forEach(function (f) {
      var el;
      if (f.type === 'select') {
        el = document.createElement('select');
        var defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = f.placeholder || f.label + '…';
        el.appendChild(defaultOpt);
        (f.options || []).forEach(function (opt) {
          var o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          el.appendChild(o);
        });
      } else if (f.type === 'textarea') {
        el = document.createElement('textarea');
        el.placeholder = f.placeholder || f.label;
        el.rows = 3;
      } else {
        el = document.createElement('input');
        el.type = f.type || 'text';
        el.placeholder = f.placeholder || f.label + (f.required ? ' *' : '');
      }
      el.id = 'vf-' + f.name;
      // Pre-fill with default value when provided (e.g. authenticated user data)
      if (f.defaultValue) {
        el.value = f.defaultValue;
        // Lock pre-filled auth fields to prevent accidental override
        if (f.name === 'email' && authUserEmail) {
          el.readOnly = true;
          el.style.opacity = '0.7';
          el.title = 'Verified email from your account';
        }
      }
      wrap.appendChild(el);
      fields[f.name] = el;
    });

    var submitBtn = document.createElement('button');
    submitBtn.className = 'vf-submit';
    submitBtn.textContent = config.submitLabel || 'Submit →';
    submitBtn.addEventListener('click', function () {
      var data = {};
      var missing = [];
      config.fields.forEach(function (f) {
        var val = (fields[f.name].value || '').trim();
        if (f.required && !val) { missing.push(f.label); }
        data[f.name] = val;
      });
      if (missing.length) {
        appendMsg('bot', md('Please fill in: **' + missing.join(', ') + '**'));
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
      onSuccess(data, wrap);
    });
    wrap.appendChild(submitBtn);

    body.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  // ── OTP email verification ───────────────────────────────────────
  // Shows an inline OTP entry form. Calls otpSendEndpoint to dispatch the
  // code, then otpVerifyEndpoint to confirm. Invokes onSuccess() when verified.
  function showOTPVerification(email, name, onSuccess) {
    var wrap = document.createElement('div');
    wrap.className = 'vera-form';

    var sent = false;
    var sending = false;

    var titleEl = document.createElement('div');
    titleEl.className = 'vf-title';
    titleEl.innerHTML = '🔐 Verify your email<button class="vf-close" aria-label="Close">&#x2715;</button>';
    titleEl.querySelector('.vf-close').addEventListener('click', function () {
      wrap.remove();
      appendMsg('bot', md('Verification cancelled. Let me know if you\'d like to try again.'));
    });
    wrap.appendChild(titleEl);

    var infoEl = document.createElement('p');
    infoEl.style.cssText = 'font-size:12px;color:#6b7280;margin-bottom:8px;line-height:1.5';
    infoEl.textContent = 'We\'ll send a one-time code to ' + email + ' to verify your email before creating the ticket.';
    wrap.appendChild(infoEl);

    var otpInput = document.createElement('input');
    otpInput.type = 'text';
    otpInput.placeholder = 'Enter 6-digit code';
    otpInput.maxLength = 6;
    otpInput.style.letterSpacing = '4px';
    otpInput.style.textAlign = 'center';
    otpInput.style.fontSize = '20px';
    otpInput.style.display = 'none';
    wrap.appendChild(otpInput);

    var errorEl = document.createElement('p');
    errorEl.style.cssText = 'font-size:11px;color:#ef4444;margin-bottom:4px;display:none';
    wrap.appendChild(errorEl);

    var sendBtn = document.createElement('button');
    sendBtn.className = 'vf-submit';
    sendBtn.textContent = 'Send verification code →';
    wrap.appendChild(sendBtn);

    body.appendChild(wrap);
    scrollBottom();

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }

    sendBtn.addEventListener('click', function () {
      if (sending) return;

      if (!sent) {
        // Send OTP
        sending = true;
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending…';

        var sendURL = otpBaseURL + otpSendEndpoint;
        fetch(sendURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: email }),
        }).then(function (r) {
          if (!r.ok) throw new Error('send failed');
          sent = true;
          sending = false;
          otpInput.style.display = 'block';
          otpInput.focus();
          sendBtn.textContent = 'Verify code →';
          sendBtn.disabled = false;
          infoEl.textContent = 'Code sent to ' + email + '. It expires in 5 minutes.';
        }).catch(function () {
          sending = false;
          sendBtn.disabled = false;
          sendBtn.textContent = 'Retry sending code';
          showError('Failed to send code. Please try again.');
        });
        return;
      }

      // Verify OTP
      var code = otpInput.value.trim();
      if (code.length < 4) {
        showError('Please enter the full verification code.');
        return;
      }
      sending = true;
      sendBtn.disabled = true;
      sendBtn.textContent = 'Verifying…';
      errorEl.style.display = 'none';

      var verifyURL = otpBaseURL + otpVerifyEndpoint;
      fetch(verifyURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email, otp: code }),
      }).then(function (r) {
        if (!r.ok) throw new Error('invalid');
        wrap.remove();
        onSuccess();
      }).catch(function () {
        sending = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Verify code →';
        showError('Invalid or expired code. Please try again.');
      });
    });

    // Allow pressing Enter in the OTP field to submit
    otpInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); sendBtn.click(); }
    });
  }

  // ── Intent → form mapping ────────────────────────────────────────
  function maybeShowForm(text, meta) {
    var t = text.toLowerCase();
    var intent = (meta && meta.intent) || '';
    if (shadow.querySelector('.vera-form')) return; // only one form at a time

    // Support / escalate — all niches
    if (intent === 'escalate' || intent === 'support_request' ||
        t.includes('ticket') || t.includes('report') || t.includes('not working')) {
      var ticketFields = [
        { name: 'name',  type: 'text',     label: 'Your name',          required: true,
          defaultValue: authUserName || '' },
        { name: 'email', type: 'email',    label: 'Email',               required: true,
          defaultValue: authUserEmail || '' },
        { name: 'issue', type: 'textarea', label: 'Describe your issue', required: true },
        { name: 'priority', type: 'select', label: 'Priority', options: ['Low', 'Medium', 'High — urgent'] },
      ];
      buildForm({
        title: '🎫 Create Support Ticket',
        submitLabel: 'Submit Ticket →',
        fields: ticketFields,
      }, function (data, wrap) {
        var doSubmit = function (verifiedEmail) {
          wrap.remove();
          // Route platform tickets to codevertex tenant; tenant tickets stay on tenant slug
          var ticketTenant = (mode === 'platform') ? 'codevertex' : tenantSlug;
          fetch(apiURL + '/api/v1/public/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': ticketTenant },
            body: JSON.stringify({
              name: data.name,
              email: verifiedEmail || data.email,
              description: data.issue,
              priority: (data.priority || 'medium').toLowerCase().replace(' — urgent', '').trim(),
              session_id: sessionID,
              source: mode === 'platform' ? 'vera_platform' : 'vera_widget',
              requester_user_id: authUserID || undefined,
            }),
          }).then(function (r) { return r.json(); }).then(function (d) {
            appendMsg('bot', md('Ticket **#' + (d.ticket_number || d.ticket_ref || d.id || 'REF-???') + '** created. Our team will respond to **' + (verifiedEmail || data.email) + '** within 2–4 hours.'));
            if (waHref) renderActionChips([{ label: '💬 WhatsApp for urgent help', href: waHref }]);
          }).catch(function () {
            appendMsg('bot', md('Ticket submitted! We\'ll respond to **' + (verifiedEmail || data.email) + '** within 4 hours.'));
          });
        };

        // If OTP endpoints are configured AND the user is not already authenticated
        // via the SSO dashboard (authUserEmail present = already verified), require
        // email verification before submitting the ticket.
        var emailToVerify = data.email;
        var alreadyVerified = authUserEmail && authUserEmail.toLowerCase() === emailToVerify.toLowerCase();
        if (otpSendEndpoint && !alreadyVerified) {
          wrap.remove();
          showOTPVerification(emailToVerify, data.name, function () { doSubmit(emailToVerify); });
        } else {
          doSubmit(emailToVerify);
        }
      });
      return;
    }

    // FLP: Join the Business / recruitment
    if (businessType === 'flp' && (intent === 'recruitment' || intent === 'business_opp' ||
        t.includes('join') || t.includes('fbo') || t.includes('sign up') || t.includes('start a business') ||
        t.includes('become') || t.includes('business opportunity') || t.includes('earn'))) {
      buildForm({
        title: '🤝 Join the Business',
        submitLabel: 'Send Interest →',
        fields: [
          { name: 'name',  type: 'text',  label: 'Full name',        required: true },
          { name: 'email', type: 'email', label: 'Email',             required: true },
          { name: 'phone', type: 'text',  label: 'Phone / WhatsApp',  required: true },
          { name: 'country', type: 'text', label: 'Country', placeholder: 'e.g. Kenya' },
          { name: 'goal', type: 'select', label: 'Main goal', options: ['Extra income', 'Full-time business', 'Personal use & discounts', 'Just exploring'] },
        ],
      }, function (data, wrap) {
        wrap.remove();
        fetch(apiURL + '/api/v1/public/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantSlug },
          body: JSON.stringify({ ...data, source: 'vera_widget_flp', session_id: sessionID }),
        }).catch(function () {});
        appendMsg('bot', md('Interest received! 🎉 Your FBO will reach out to **' + data.phone + '** to walk you through getting started.\n\nYou can also connect directly:'));
        var chips = [];
        if (waHref) chips.push({ label: '💬 WhatsApp your FBO', href: waHref });
        renderActionChips(chips);
      });
      return;
    }

    // Codevertex: course enrollment
    if ((businessType === 'codevertex' || businessType === '') &&
        (intent === 'course_inquiry' || t.includes('enroll') || t.includes('register') || t.includes('apply for') || t.includes('sign up for'))) {
      buildForm({
        title: '🎓 Course Enrollment',
        submitLabel: 'Submit Enrollment →',
        fields: [
          { name: 'name',  type: 'text',  label: 'Full name',        required: true },
          { name: 'email', type: 'email', label: 'Email',             required: true },
          { name: 'phone', type: 'text',  label: 'Phone / WhatsApp',  required: true },
          { name: 'experience', type: 'select', label: 'Experience level', options: ['Complete Beginner', 'Some Basics', 'Intermediate', 'Advanced'] },
          { name: 'howHeard', type: 'select', label: 'How did you hear about us?', options: ['Social Media', 'WhatsApp', 'Referral', 'Google Search', 'Other'] },
        ],
      }, function (data, wrap) {
        wrap.remove();
        fetch(apiURL + '/api/v1/public/enrollments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantSlug },
          body: JSON.stringify({ ...data, session_id: sessionID }),
        }).catch(function () {});
        appendMsg('bot', md('Enrollment received! 🎉 Our team will contact **' + data.email + '** within a few hours with payment and cohort details.'));
        var chips = [{ label: '🎓 View all courses', href: 'https://codevertexitsolutions.com/digitika' }];
        if (waHref) chips.push({ label: '💬 WhatsApp us', href: waHref });
        renderActionChips(chips);
      });
      return;
    }

    // Book a call / meeting — all niches (with niche-appropriate topics)
    if (t.includes('book') || t.includes('call') || t.includes('schedule') || t.includes('demo') || t.includes('meeting')) {
      var topicOptions = businessType === 'flp'
        ? ['Product info session', 'Business opportunity intro', 'Getting started as an FBO', 'General questions']
        : businessType === 'codevertex'
        ? ['Software Development', 'AI / Analytics', 'Digitika Training', 'Platform Demo', 'General Inquiry']
        : ['Product / service demo', 'Business consultation', 'Partnership enquiry', 'General Inquiry'];

      buildForm({
        title: '📅 Book a Call',
        submitLabel: 'Book Call →',
        fields: [
          { name: 'name',  type: 'text',  label: 'Full name',               required: true },
          { name: 'email', type: 'email', label: 'Email',                    required: true },
          { name: 'phone', type: 'text',  label: 'Phone / WhatsApp',         required: true },
          { name: 'time',  type: 'text',  label: 'Preferred date & time', placeholder: 'e.g. Tuesday 2pm EAT' },
          { name: 'topic', type: 'select', label: 'Topic', options: topicOptions },
        ],
      }, function (data, wrap) {
        wrap.remove();
        fetch(apiURL + '/api/v1/public/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantSlug },
          body: JSON.stringify({ ...data, source: 'vera_widget_booking', session_id: sessionID }),
        }).catch(function () {});
        appendMsg('bot', md('Call request saved! We\'ll reach out to **' + data.email + '** within 2 hours to confirm.\n\nNeed to talk now?'));
        var chips = [];
        if (waHref) chips.push({ label: '💬 WhatsApp now', href: waHref });
        if (callHref) chips.push({ label: '📞 Call now', href: callHref });
        renderActionChips(chips);
      });
      return;
    }

    // Generic contact / message — all niches
    if (t.includes('contact') || t.includes('message') || t.includes('email') || t.includes('reach') || t.includes('talk')) {
      buildForm({
        title: '✉️ Send a Message',
        submitLabel: 'Send Message →',
        fields: [
          { name: 'name',    type: 'text',     label: 'Your name',    required: true },
          { name: 'email',   type: 'email',    label: 'Email',         required: true },
          { name: 'message', type: 'textarea', label: 'Your message',  required: true },
        ],
      }, function (data, wrap) {
        wrap.remove();
        fetch(apiURL + '/api/v1/public/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantSlug },
          body: JSON.stringify({ ...data, source: 'vera_widget_contact', session_id: sessionID }),
        }).catch(function () {});
        appendMsg('bot', md('Message received! We\'ll respond to **' + data.email + '** within 24 hours.'));
        if (waHref) renderActionChips([{ label: '💬 WhatsApp for a faster reply', href: waHref }]);
      });
    }
  }

  // ── Markdown renderer ────────────────────────────────────────────
  function md(text) {
    if (!text) return '';
    var urls = [];
    var safe = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_, label, url) {
      var i = urls.length;
      urls.push({ label: label, url: url });
      return '\x00LINK' + i + '\x00';
    }).replace(/(https?:\/\/[^\s<>)\]"]+)/g, function (url) {
      var clean = url.replace(/[.,;:!?)]+$/, '');
      var i = urls.length;
      urls.push({ label: null, url: clean });
      return '\x00BARE' + i + '\x00' + url.slice(clean.length);
    });

    safe = escHTML(safe)
      .replace(/^### (.+)$/gm, '<strong>$1</strong>')
      .replace(/^## (.+)$/gm, '<strong>$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');

    var linkStyle = 'color:' + accentColor + ';text-decoration:underline;word-break:break-all';
    safe = safe
      .replace(/\x00LINK(\d+)\x00/g, function (_, i) {
        var u = urls[+i];
        return '<a href="' + escAttr(u.url) + '" target="_blank" rel="noreferrer" style="' + linkStyle + '">' + escHTML(u.label) + '</a>';
      })
      .replace(/\x00BARE(\d+)\x00/g, function (_, i) {
        var u = urls[+i];
        var label = u.url.length > 46 ? u.url.replace(/^https?:\/\//, '').slice(0, 36) + '…' : u.url;
        return '<a href="' + escAttr(u.url) + '" target="_blank" rel="noreferrer" style="' + linkStyle + '">' + escHTML(label) + '</a>';
      });

    return safe;
  }

  // ── Action chips ─────────────────────────────────────────────────
  function renderActionChips(chips) {
    if (!chips || !chips.length) return;
    var row = document.createElement('div');
    row.className = 'chips';
    chips.forEach(function (c) {
      if (c.onclick) {
        var btn = document.createElement('button');
        btn.className = 'chip';
        btn.textContent = c.label;
        btn.addEventListener('click', c.onclick);
        row.appendChild(btn);
      } else {
        var a = document.createElement('a');
        a.className = 'chip';
        a.href = c.href;
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.textContent = c.label;
        row.appendChild(a);
      }
    });
    body.appendChild(row);
    scrollBottom();
  }

  // Smart chips from API response
  function extractChips(text, meta) {
    var chips = [];
    var intent = (meta && meta.intent) || '';
    var urlRe = /https?:\/\/[^\s"')>]+/g;
    var match;
    while ((match = urlRe.exec(text)) !== null) {
      var u = match[0].replace(/[.,;:!?)]+$/, '');
      if (/wa\.me/.test(u))                              chips.push({ label: '💬 WhatsApp', href: u });
      else if (/cal(endar)?\.|calendly/.test(u))         chips.push({ label: '📅 Book a call', href: u });
      else if (/digitika|codevertex.*course/i.test(u))   chips.push({ label: '🎓 View courses', href: u });
      else if (/books\.codevertex|\/pay/.test(u))        chips.push({ label: '💳 Pay now', href: u });
    }
    if (intent === 'course_inquiry') {
      chips.push({ label: '🎓 Browse courses', href: 'https://codevertexitsolutions.com/digitika' });
    }
    if (intent === 'service_inquiry') {
      chips.push({ label: '🚀 Request demo', href: 'https://codevertexitsolutions.com/contact' });
    }
    // Tenant-configured shortcuts
    if (waHref && !chips.some(function (c) { return c.href === waHref; })) {
      if (intent === 'escalate' || intent === 'support_request') {
        chips.push({ label: '💬 WhatsApp for urgent help', href: waHref });
      }
    }
    var seen = {};
    return chips.filter(function (c) {
      var k = c.href || c.label;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  // ── Response renderer ────────────────────────────────────────────
  function renderAnswer(text, meta) {
    appendMsg('bot', md(text));

    if (meta && Array.isArray(meta.courses)) {
      meta.courses.slice(0, 2).forEach(function (c) {
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML =
          '<div class="cb"><div class="ct">' + escHTML(c.name || c.title) + '</div>' +
          '<div class="cm">' + escHTML(c.duration || '') + (c.mode ? ' &middot; ' + escHTML(c.mode) : '') + '</div>' +
          (c.price ? '<div class="cm" style="font-weight:700;color:' + primaryColor + '">KSh ' + escHTML(String(c.price)) + '</div>' : '') +
          '<a class="cc-link" href="' + escAttr(c.enroll_url || 'https://codevertexitsolutions.com/digitika') + '" target="_blank" rel="noreferrer">View course &rarr;</a>' +
          '</div>';
        body.appendChild(card);
      });
    }

    if (meta && Array.isArray(meta.products)) {
      meta.products.slice(0, 3).forEach(function (p) {
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML =
          (p.image_url ? '<img src="' + escAttr(p.image_url) + '" alt="" loading="lazy" />' : '') +
          '<div class="cb"><div class="ct">' + escHTML(p.name || p.product_code || 'Product') + '</div>' +
          '<div class="cm">' + (p.price ? escHTML(p.price) + ' &middot; ' : '') + (p.cc_value ? 'CC ' + escHTML(String(p.cc_value)) : '') + '</div>' +
          (p.buy_url ? '<a class="cc-link" target="_blank" rel="noreferrer" href="' + escAttr(p.buy_url) + '">View &rarr;</a>' : '') +
          '</div>';
        body.appendChild(card);
      });
    }

    // Show form if intent warrants it (only if no form visible already)
    if (!shadow.querySelector('.vera-form')) {
      maybeShowForm(text, meta);
    } else {
      renderActionChips(extractChips(text, meta));
    }

    scrollBottom();
  }

  // ── Escape helpers ────────────────────────────────────────────────
  function escHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(s) { return escHTML(s); }

  // ── Send message (SSE streaming) ─────────────────────────────────
  async function sendMessage(q) {
    q = (q || '').trim();
    if (!q || sending) return;
    sending = true;
    var sendBtn = form.querySelector('button[type="submit"]');
    if (sendBtn) sendBtn.disabled = true;
    input.value = '';

    appendMsg('user', escHTML(q));
    var typingEl = showTyping('Vera is thinking');

    try {
      var res = await fetch(apiURL + '/api/v1/public/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantSlug,
          'X-Widget-Mode': mode,
        },
        body: JSON.stringify({
          question: q,
          session_id: sessionID,
          stream: true,
          business_type: businessType,
        }),
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      var contentType = res.headers.get('Content-Type') || '';
      var isSSE = contentType.indexOf('text/event-stream') !== -1;

      if (!isSSE || !res.body) {
        // Fallback: non-streaming JSON response
        if (typingEl.parentNode) body.removeChild(typingEl);
        var data = await res.json();
        if (data.session_id) {
          sessionID = data.session_id;
          try { sessionStorage.setItem(SESSION_KEY, sessionID); } catch { }
        }
        var answer = (data.result && data.result.response) || data.response || '';
        var meta   = (data.result && data.result.meta) || data.meta || null;
        if (answer) {
          renderAnswer(answer, meta);
          chatHistory.push({ q: q, a: answer });
          saveHistory();
        } else {
          appendMsg('bot', md("I didn't get a response. Please try again."));
        }
        return;
      }

      // SSE: stream tokens into a live bubble
      if (typingEl.parentNode) body.removeChild(typingEl);

      var botBubble = document.createElement('div');
      botBubble.className = 'msg bot';
      body.appendChild(botBubble);
      scrollBottom();

      var accumulated = '';
      var finalMeta   = null;
      var reader      = res.body.getReader();
      var decoder     = new TextDecoder();
      var buffer      = '';

      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });

        // Parse SSE lines from buffer
        var lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line.startsWith('data:')) continue;
          var raw = line.slice(5).trim();
          if (raw === '[DONE]') { reader.cancel(); break; }
          try {
            var evt = JSON.parse(raw);
            if (evt.type === 'meta') {
              finalMeta = evt.data;
              if (evt.data && evt.data.session_id) {
                sessionID = evt.data.session_id;
                try { sessionStorage.setItem(SESSION_KEY, sessionID); } catch { }
              }
            } else if (evt.type === 'delta' && evt.content) {
              accumulated += evt.content;
              botBubble.innerHTML = md(accumulated);
              scrollBottom();
            } else if (evt.session_id) {
              sessionID = evt.session_id;
              try { sessionStorage.setItem(SESSION_KEY, sessionID); } catch { }
            }
          } catch { /* non-JSON line — ignore */ }
        }
      }

      // Finalize bubble with full rendered markdown
      if (accumulated) {
        botBubble.innerHTML = md(accumulated);
        chatHistory.push({ q: q, a: accumulated });
        saveHistory();
        // Render meta cards + action chips after streaming completes
        if (finalMeta) {
          if (Array.isArray(finalMeta.courses)) {
            finalMeta.courses.slice(0, 2).forEach(function (c) {
              var card = document.createElement('div');
              card.className = 'card';
              card.innerHTML =
                '<div class="cb"><div class="ct">' + escHTML(c.name || c.title) + '</div>' +
                '<div class="cm">' + escHTML(c.duration || '') + (c.mode ? ' &middot; ' + escHTML(c.mode) : '') + '</div>' +
                (c.price ? '<div class="cm" style="font-weight:700;color:' + primaryColor + '">KSh ' + escHTML(String(c.price)) + '</div>' : '') +
                '<a class="cc-link" href="' + escAttr(c.enroll_url || 'https://codevertexitsolutions.com/digitika') + '" target="_blank" rel="noreferrer">View course &rarr;</a>' +
                '</div>';
              body.appendChild(card);
            });
          }
          if (Array.isArray(finalMeta.products)) {
            finalMeta.products.slice(0, 3).forEach(function (p) {
              var card = document.createElement('div');
              card.className = 'card';
              card.innerHTML =
                (p.image_url ? '<img src="' + escAttr(p.image_url) + '" alt="" loading="lazy" />' : '') +
                '<div class="cb"><div class="ct">' + escHTML(p.name || p.product_code || 'Product') + '</div>' +
                '<div class="cm">' + (p.price ? escHTML(p.price) + ' &middot; ' : '') + (p.cc_value ? 'CC ' + escHTML(String(p.cc_value)) : '') + '</div>' +
                (p.buy_url ? '<a class="cc-link" target="_blank" rel="noreferrer" href="' + escAttr(p.buy_url) + '">View &rarr;</a>' : '') +
                '</div>';
              body.appendChild(card);
            });
          }
          if (!shadow.querySelector('.vera-form')) {
            maybeShowForm(accumulated, finalMeta);
          } else {
            renderActionChips(extractChips(accumulated, finalMeta));
          }
        }
      } else {
        botBubble.innerHTML = md("I didn't get a response. Please try again.");
      }
      scrollBottom();

    } catch (err) {
      if (typingEl.parentNode) body.removeChild(typingEl);
      var fallbackChips = [];
      if (waHref) fallbackChips.push({ label: '💬 WhatsApp us', href: waHref });
      if (callHref) fallbackChips.push({ label: '📞 Call us', href: callHref });
      appendMsg('bot', md('Sorry, something went wrong. Please try again.'));
      renderActionChips(fallbackChips);
      console.error('[vera-widget]', err);
    } finally {
      sending = false;
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    sendMessage(input.value);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panelOpen) closePanel();
  });
})();
