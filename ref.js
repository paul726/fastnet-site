// Attribution: remembers where a visitor came from (a partner link, UTM tags,
// a Google Ads click, or the referring site) and passes it to Stripe as
// client_reference_id on every Buy link, so each sale shows its source.
(function () {
  var params = new URLSearchParams(location.search);

  // Partner links look like /?via=CODE. The partner keeps the credit for 30
  // days even if the visitor comes back later from a search or another site.
  var via = (params.get('via') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  var partner = via;
  try {
    if (via) localStorage.setItem('fn_aff', JSON.stringify({ c: via, t: Date.now() }));
    var saved = JSON.parse(localStorage.getItem('fn_aff') || 'null');
    partner = saved && saved.c && Date.now() - saved.t < 30 * 864e5 ? saved.c : '';
  } catch (e) {}

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

  // Visitors who arrive with no tags and no referrer (typed URL, email link,
  // messaging apps) used to leave client_reference_id empty, so their sales
  // showed no source at all. They are now "direct", and every source carries
  // the first page the visitor landed on, e.g. "linkedin__home", "direct__windows".
  var source = incoming;
  try {
    if (incoming) localStorage.setItem('fn_ref', incoming);
    else source = localStorage.getItem('fn_ref') || '';
  } catch (e) {}
  if (!source) source = 'direct';

  var landing = '';
  try {
    landing = localStorage.getItem('fn_land') || '';
    if (!landing) {
      landing = location.pathname === '/' ? 'home'
        : location.pathname.replace(/^\//, '').replace(/\/$/, '').replace(/\.html$/, '')
            .replace(/^blog\//, 'blog-').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'home';
      localStorage.setItem('fn_land', landing);
    }
  } catch (e) {}

  var ref = source + (landing ? '__' + landing : '');
  if (partner) ref = 'aff_' + partner;
  ref = ref.slice(0, 200);
  window.fnSource = source;
  window.fnRef = ref;

  var links = document.querySelectorAll('a[href]');
  for (var i = 0; i < links.length; i++) {
    var a = links[i];
    if (a.origin === location.origin && a.pathname === '/buy') {
      a.href = '/buy?client_reference_id=' + encodeURIComponent(ref);
    }
  }
})();
