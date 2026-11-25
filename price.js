// The price goes from $29 to $39 at 00:00 Pacific time on 1 January 2027.
//
// Before that moment every page shows a banner with a countdown to it. From
// that moment on the banner is gone and every "$29" on the page reads "$39",
// so the site is never behind the checkout price. The page sources still say
// $29: once they have been updated to $39, this file and its script tags can
// be deleted.
//
// Loaded first thing inside <body>, so the banner is in place before the page
// paints and nothing jumps.
(function () {
  var CHANGE = Date.UTC(2027, 0, 1, 8, 0, 0);
  var SWAPS = [['$29', '$39'], ['$11.60', '$15.60']]; // the second is the partner share, 40%

  function showNewPrice() {
    var banner = document.getElementById('price-banner');
    if (banner) banner.remove();
    document.querySelectorAll('[data-until-price-change]').forEach(function (el) { el.remove(); });
    document.querySelectorAll('[data-price-amount]').forEach(function (el) { el.textContent = '39'; });
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var tag = node.parentNode && node.parentNode.nodeName;
        return tag === 'SCRIPT' || tag === 'STYLE' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      var text = node.nodeValue;
      if (text.indexOf('$') === -1) continue;
      SWAPS.forEach(function (pair) { text = text.split(pair[0]).join(pair[1]); });
      if (text !== node.nodeValue) node.nodeValue = text;
    }
  }

  function whenReady(run) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }

  if (Date.now() >= CHANGE) {
    whenReady(showNewPrice);
    return;
  }

  document.body.insertAdjacentHTML('afterbegin',
    '<a id="price-banner" href="/#pricing" style="display:block;padding:10px 16px;background:#172033;' +
    'border-bottom:1px solid #3b4d73;color:#ededed;font:500 14.5px/1.45 -apple-system,BlinkMacSystemFont,' +
    '\'Helvetica Neue\',sans-serif;text-align:center;text-decoration:none">' +
    '<strong style="font-weight:700">$29 until January 1.</strong> After that, FastNet is $39. ' +
    '<span id="price-countdown" style="color:#8ab4ff;font-weight:650;font-variant-numeric:tabular-nums;white-space:nowrap"></span>' +
    '</a>');

  var out = document.getElementById('price-countdown');
  function two(n) { return n < 10 ? '0' + n : String(n); }
  function tick() {
    var left = CHANGE - Date.now();
    if (left <= 0) {
      clearInterval(timer);
      whenReady(showNewPrice);
      return;
    }
    var s = Math.floor(left / 1000);
    var days = Math.floor(s / 86400);
    out.textContent = (days > 0 ? days + (days === 1 ? ' day ' : ' days ') : '') +
      two(Math.floor(s % 86400 / 3600)) + ':' + two(Math.floor(s % 3600 / 60)) + ':' + two(s % 60) + ' left';
  }
  var timer = setInterval(tick, 1000);
  tick();
})();
