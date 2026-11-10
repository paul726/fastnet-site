// Attribution: remembers where a visitor came from (UTM tags, a Google Ads
// click, or the referring site) and passes it to Stripe as
// client_reference_id on every Buy link, so each sale shows its source.
(function () {
  var params = new URLSearchParams(location.search);
  var incoming = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term']
    .map(function (k) { return params.get(k); })
    .filter(Boolean)
    .join('_');
  if (!incoming && (params.get('gclid') || params.get('gbraid') || params.get('wbraid'))) {
    incoming = 'google_ads';
  }
  if (!incoming && document.referrer) {
    try {
      var host = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (host && host !== location.hostname) incoming = 'ref_' + host;
    } catch (e) {}
  }
  // Stripe accepts letters, digits, dashes and underscores, up to 200 chars.
  incoming = incoming.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 200);

  var ref = incoming;
  try {
    if (incoming) localStorage.setItem('fn_ref', incoming);
    else ref = localStorage.getItem('fn_ref') || '';
  } catch (e) {}
  window.fnRef = ref;

  if (!ref) return;
  var links = document.querySelectorAll('a[href]');
  for (var i = 0; i < links.length; i++) {
    var a = links[i];
    if (a.origin === location.origin && a.pathname === '/buy') {
      a.href = '/buy?client_reference_id=' + encodeURIComponent(ref);
    }
  }
})();
