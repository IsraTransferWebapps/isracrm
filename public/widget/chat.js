(function () {
  'use strict';

  // Configuration from script tag data attributes
  var script = document.currentScript;
  var API_URL = (script && script.getAttribute('data-api-url')) || '';
  var ACCENT = (script && script.getAttribute('data-accent-color')) || '#01A0FF';
  var GREETING = (script && script.getAttribute('data-greeting')) || 'Hi! How can we help you today?';

  var SESSION_KEY = 'isratransfer_chat_session';
  var POLL_INTERVAL = 3000;

  // State
  var state = {
    open: false,
    sessionToken: null,
    conversationId: null,
    messages: [],
    visitorName: '',
    visitorEmail: '',
    hasProvidedInfo: false,
    pollTimer: null,
    lastMessageCount: 0,
  };

  // Restore session from localStorage
  try {
    var saved = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    if (saved.sessionToken) {
      state.sessionToken = saved.sessionToken;
      state.conversationId = saved.conversationId;
      state.visitorName = saved.visitorName || '';
      state.visitorEmail = saved.visitorEmail || '';
      state.hasProvidedInfo = saved.hasProvidedInfo || false;
    }
  } catch (e) { /* ignore */ }

  function saveSession() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        sessionToken: state.sessionToken,
        conversationId: state.conversationId,
        visitorName: state.visitorName,
        visitorEmail: state.visitorEmail,
        hasProvidedInfo: state.hasProvidedInfo,
      }));
    } catch (e) { /* ignore */ }
  }

  // API helpers
  function apiPost(path, body) {
    return fetch(API_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  function apiGet(path) {
    return fetch(API_URL + path).then(function (r) { return r.json(); });
  }

  async function ensureSession() {
    if (state.sessionToken && state.conversationId) return;
    var data = await apiPost('/api/chat/session', {
      session_token: state.sessionToken,
      visitor_name: state.visitorName || undefined,
      visitor_email: state.visitorEmail || undefined,
    });
    state.sessionToken = data.session_token;
    state.conversationId = data.conversation_id;
    saveSession();
  }

  async function sendMessage(text) {
    await ensureSession();
    await apiPost('/api/chat/messages', {
      conversation_id: state.conversationId,
      session_token: state.sessionToken,
      body: text,
    });
    state.messages.push({
      id: Date.now().toString(),
      body: text,
      sender_type: 'client',
      created_at: new Date().toISOString(),
    });
    render();
    fetchMessages();
  }

  async function fetchMessages() {
    if (!state.conversationId || !state.sessionToken) return;
    var data = await apiGet(
      '/api/chat/messages?conversation_id=' + state.conversationId +
      '&session_token=' + state.sessionToken
    );
    if (data.messages) {
      state.messages = data.messages;
      state.lastMessageCount = data.messages.length;
      render();
    }
  }

  async function submitVisitorInfo(name, email) {
    state.visitorName = name;
    state.visitorEmail = email;
    state.hasProvidedInfo = true;
    saveSession();
    // Update session with visitor info
    if (state.sessionToken) {
      await apiPost('/api/chat/session', {
        session_token: state.sessionToken,
        visitor_name: name || undefined,
        visitor_email: email || undefined,
      });
    }
    render();
  }

  function startPolling() {
    if (state.pollTimer) return;
    state.pollTimer = setInterval(function () {
      if (state.conversationId) fetchMessages();
    }, POLL_INTERVAL);
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '.itc-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.5;position:fixed;bottom:20px;right:20px;z-index:999999}',
    '.itc-bubble{width:56px;height:56px;border-radius:50%;background:' + ACCENT + ';color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:transform .2s}',
    '.itc-bubble:hover{transform:scale(1.05)}',
    '.itc-bubble svg{width:24px;height:24px}',
    '.itc-panel{display:none;width:360px;height:500px;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.12);flex-direction:column;overflow:hidden;position:absolute;bottom:70px;right:0}',
    '.itc-panel.open{display:flex}',
    '.itc-header{background:' + ACCENT + ';color:#fff;padding:16px;display:flex;align-items:center;justify-content:space-between}',
    '.itc-header-title{font-weight:600;font-size:15px}',
    '.itc-header-sub{font-size:11px;opacity:.8}',
    '.itc-close{background:none;border:none;color:#fff;cursor:pointer;font-size:20px;padding:4px;line-height:1}',
    '.itc-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px}',
    '.itc-msg{max-width:80%;padding:10px 14px;border-radius:12px;font-size:13px;word-wrap:break-word;white-space:pre-wrap}',
    '.itc-msg.client{align-self:flex-end;background:' + ACCENT + ';color:#fff;border-bottom-right-radius:4px}',
    '.itc-msg.staff{align-self:flex-start;background:#f4f5f7;color:#253859;border-bottom-left-radius:4px}',
    '.itc-msg.system{align-self:center;background:#f4f5f7;color:#94a3b8;font-size:12px;padding:6px 12px}',
    '.itc-msg-time{font-size:10px;opacity:.6;margin-top:4px}',
    '.itc-greeting{align-self:flex-start;background:#f4f5f7;color:#253859;border-radius:12px;border-bottom-left-radius:4px;padding:10px 14px;font-size:13px}',
    '.itc-compose{border-top:1px solid #e2e8f0;padding:12px;display:flex;gap:8px;align-items:flex-end}',
    '.itc-input{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;resize:none;outline:none;font-family:inherit;max-height:80px}',
    '.itc-input:focus{border-color:' + ACCENT + ';box-shadow:0 0 0 2px ' + ACCENT + '20}',
    '.itc-send{width:36px;height:36px;border-radius:8px;background:' + ACCENT + ';color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '.itc-send:disabled{opacity:.5;cursor:not-allowed}',
    '.itc-send svg{width:16px;height:16px}',
    '.itc-info-form{padding:16px;display:flex;flex-direction:column;gap:8px;border-top:1px solid #e2e8f0;background:#fafbfc}',
    '.itc-info-form label{font-size:11px;color:#717d93;font-weight:500}',
    '.itc-info-form input{border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;font-size:13px;outline:none;font-family:inherit}',
    '.itc-info-form input:focus{border-color:' + ACCENT + '}',
    '.itc-info-btn{background:' + ACCENT + ';color:#fff;border:none;border-radius:8px;padding:8px;font-size:13px;cursor:pointer;font-weight:500}',
    '.itc-info-skip{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:12px;padding:4px}',
    '@media(max-width:420px){.itc-panel{width:calc(100vw - 32px);height:calc(100vh - 100px);bottom:70px;right:-4px}}',
  ].join('\n');
  document.head.appendChild(style);

  // Create DOM
  var container = document.createElement('div');
  container.className = 'itc-widget';
  container.innerHTML = [
    '<div class="itc-panel" id="itc-panel">',
    '  <div class="itc-header">',
    '    <div><div class="itc-header-title">IsraTransfer</div><div class="itc-header-sub">We typically reply within minutes</div></div>',
    '    <button class="itc-close" id="itc-close">&times;</button>',
    '  </div>',
    '  <div class="itc-messages" id="itc-messages"></div>',
    '  <div id="itc-info-area"></div>',
    '  <div class="itc-compose">',
    '    <textarea class="itc-input" id="itc-input" rows="1" placeholder="Type a message..."></textarea>',
    '    <button class="itc-send" id="itc-send" disabled>',
    '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    '    </button>',
    '  </div>',
    '</div>',
    '<button class="itc-bubble" id="itc-bubble">',
    '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    '</button>',
  ].join('\n');
  document.body.appendChild(container);

  var panel = document.getElementById('itc-panel');
  var bubble = document.getElementById('itc-bubble');
  var closeBtn = document.getElementById('itc-close');
  var messagesEl = document.getElementById('itc-messages');
  var inputEl = document.getElementById('itc-input');
  var sendBtn = document.getElementById('itc-send');
  var infoArea = document.getElementById('itc-info-area');

  // Toggle
  bubble.addEventListener('click', function () {
    state.open = true;
    render();
    startPolling();
    if (state.conversationId) fetchMessages();
  });
  closeBtn.addEventListener('click', function () {
    state.open = false;
    render();
    stopPolling();
  });

  // Input
  inputEl.addEventListener('input', function () {
    sendBtn.disabled = !inputEl.value.trim();
  });
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputEl.value.trim()) handleSend();
    }
  });
  sendBtn.addEventListener('click', handleSend);

  function handleSend() {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    sendBtn.disabled = true;
    sendMessage(text);
  }

  function formatTime(iso) {
    try {
      var d = new Date(iso);
      var now = new Date();
      var diff = (now - d) / 1000;
      if (diff < 60) return 'Just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      return d.toLocaleDateString();
    } catch (e) { return ''; }
  }

  function render() {
    panel.classList.toggle('open', state.open);
    bubble.style.display = state.open ? 'none' : 'flex';

    // Messages
    var html = '<div class="itc-greeting">' + escapeHtml(GREETING) + '</div>';
    state.messages.forEach(function (msg) {
      var type = msg.sender_type === 'client' ? 'client' :
                 (msg.sender_type === 'system' || msg.sender_type === 'bot') ? 'system' : 'staff';
      html += '<div class="itc-msg ' + type + '">' +
        escapeHtml(msg.body) +
        '<div class="itc-msg-time">' + formatTime(msg.created_at) + '</div>' +
        '</div>';
    });
    messagesEl.innerHTML = html;
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Info form (show after first message if not provided)
    if (state.messages.length > 0 && !state.hasProvidedInfo) {
      infoArea.innerHTML = [
        '<div class="itc-info-form" id="itc-info-form">',
        '  <label>Your name (optional)</label>',
        '  <input type="text" id="itc-name" placeholder="Your name" value="' + escapeAttr(state.visitorName) + '">',
        '  <label>Email (optional)</label>',
        '  <input type="email" id="itc-email" placeholder="your@email.com" value="' + escapeAttr(state.visitorEmail) + '">',
        '  <button class="itc-info-btn" id="itc-info-submit">Save</button>',
        '  <button class="itc-info-skip" id="itc-info-skip">Skip</button>',
        '</div>',
      ].join('\n');

      document.getElementById('itc-info-submit').addEventListener('click', function () {
        var name = document.getElementById('itc-name').value.trim();
        var email = document.getElementById('itc-email').value.trim();
        submitVisitorInfo(name, email);
      });
      document.getElementById('itc-info-skip').addEventListener('click', function () {
        state.hasProvidedInfo = true;
        saveSession();
        render();
      });
    } else {
      infoArea.innerHTML = '';
    }
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return (s || '').replace(/"/g, '&quot;');
  }

  // Initial render
  render();
})();
