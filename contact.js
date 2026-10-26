// Contact form, shared by every page. Messages go to the Motion Mornings inbox through FormSubmit
// (formsubmit.co), so nobody's email app opens. Any link with data-contact opens it.
(function () {
  var TO = 'hello@motionmornings.com';
  var ENDPOINT = 'https://formsubmit.co/ajax/' + TO;

  function send(o) {
    var body = {
      _subject: o.subject || 'Message from motionmornings.com',
      _template: 'table',
      _captcha: 'false',
      _replyto: o.email || '',
      email: o.email || '(no email given)',
      name: o.name || '',
      message: o.message || '',
      page: location.pathname
    };
    if (o.extra) for (var k in o.extra) body[k] = o.extra[k];
    return fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || String(j.success) === 'false') throw new Error(j.message || 'send failed'); return j; }); });
  }

  var css = '.mmc{position:fixed;inset:0;background:rgba(15,20,32,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:200}' +
    '.mmc[hidden]{display:none}' +
    '.mmc .mmcbox{background:#FFFDF8;color:#1F2E4D;border-radius:16px;padding:20px;max-width:440px;width:100%;max-height:92vh;overflow:auto;display:flex;flex-direction:column;gap:12px;font:16px/1.5 "Figtree",system-ui,sans-serif;box-shadow:0 24px 60px -20px rgba(0,0,0,.5)}' +
    '.mmc h3{margin:0;font:700 1.25rem "Poppins","Figtree",sans-serif}' +
    '.mmc p{margin:0;color:#5B6479;font-size:.95rem}' +
    '.mmc label{display:flex;flex-direction:column;gap:5px;font-weight:600;font-size:.95rem}' +
    '.mmc input,.mmc textarea{font:inherit;color:#1F2E4D;width:100%;box-sizing:border-box;border:1px solid #E6D8C2;background:#FBF3E6;border-radius:10px;padding:10px 12px}' +
    '.mmc textarea{min-height:120px;resize:vertical}' +
    '.mmc .mmcrow{display:flex;gap:10px;flex-wrap:wrap}' +
    '.mmc button{font:700 1rem "Figtree",system-ui,sans-serif;border:0;border-radius:999px;padding:11px 20px;cursor:pointer}' +
    '.mmc .go{background:#E07B66;color:#fff}.mmc .go:disabled{opacity:.6;cursor:wait}' +
    '.mmc .no{background:transparent;color:#1F2E4D;border:1px solid #E6D8C2}' +
    '.mmc .st{min-height:1.4em;font-size:.92rem;color:#5B6479}.mmc .st.err{color:#C9463A;font-weight:600}.mmc .st.ok{color:#3E9A6A;font-weight:600}' +
    '.mmc .hp{position:absolute;left:-9999px}';

  var box;
  function build() {
    if (box) return box;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    box = document.createElement('div'); box.className = 'mmc'; box.hidden = true;
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'mmcTitle');
    box.innerHTML = '<form class="mmcbox" novalidate>' +
      '<h3 id="mmcTitle">Contact us</h3>' +
      '<p>Questions, ideas or feedback. We read every message and reply by email.</p>' +
      '<label>Your email<input type="email" name="email" autocomplete="email" required placeholder="you@example.com"></label>' +
      '<label><span>Your name <span style="font-weight:400;color:#5B6479">(optional)</span></span><input type="text" name="name" autocomplete="name"></label>' +
      '<label>Message<textarea name="message" required maxlength="2000"></textarea></label>' +
      '<input class="hp" type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="mmcrow"><button class="go" type="submit">Send message</button><button class="no" type="button">Close</button></div>' +
      '<p class="st" role="status"></p></form>';
    document.body.appendChild(box);
    var f = box.querySelector('form'), status = box.querySelector('.st'), go = box.querySelector('.go');
    box.querySelector('.no').onclick = close;
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = f.email.value.trim(), msg = f.message.value.trim();
      if (f._honey.value) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.className = 'st err'; status.textContent = 'Add your email so we can reply.'; f.email.focus(); return; }
      if (msg.length < 5) { status.className = 'st err'; status.textContent = 'Write a short message first.'; f.message.focus(); return; }
      go.disabled = true; status.className = 'st'; status.textContent = 'Sending...';
      send({ email: email, name: f.name.value.trim(), message: msg }).then(function () {
        status.className = 'st ok'; status.textContent = 'Thanks, your message is on its way. We’ll reply by email.';
        f.message.value = ''; go.disabled = false;
      }).catch(function () {
        go.disabled = false; status.className = 'st err'; status.textContent = 'That didn’t send. Check your connection and try again, or email ' + TO + '.';
      });
    });
    return box;
  }
  function open() { build(); box.hidden = false; var st = box.querySelector('.st'); st.textContent = ''; st.className = 'st'; setTimeout(function () { box.querySelector('input[name=email]').focus(); }, 30); }
  function close() { if (box) box.hidden = true; }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-contact]');
    if (a) { e.preventDefault(); open(); }
  });
  if (location.hash === '#contact') document.addEventListener('DOMContentLoaded', open);
  window.MMContact = { open: open, send: send };
})();
