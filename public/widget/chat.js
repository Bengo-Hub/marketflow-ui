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
    '.inp button{background:#16a34a;color:#fff;border:none;border-radius:20px;padding:8px 16px;cursor:pointer}'
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
      typing.classList.remove('typing');
      typing.textContent = answer;
    } catch (err) {
      typing.classList.remove('typing');
      typing.textContent = 'Sorry — something went wrong. Please try again.';
      console.error('[marketflow-widget]', err);
    }
  });
})();
