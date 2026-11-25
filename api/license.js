// GET /api/license?session_id=cs_…
// Retrieves the Checkout Session, confirms it's paid, mints an Ed25519-signed
// license bound to the buyer's email, and returns an HTML page that shows the
// key to copy into the FastNet Connect app (Mac or Windows: one license covers
// both). Stateless + idempotent: re-fetching the same session yields the same
// license (iat = session.created). A fully refunded order gets no key.
//
// Env: STRIPE_SECRET_KEY, LICENSE_SIGNING_KEY (Ed25519 private key, PEM)
const Stripe = require('stripe');
const crypto = require('crypto');

const b64url = (buf) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function mintLicense(email, order, iat) {
  const payload = Buffer.from(JSON.stringify({ email, order, iat, product: 'fastnet-mac' }));
  const priv = crypto.createPrivateKey(process.env.LICENSE_SIGNING_KEY);
  const sig = crypto.sign(null, payload, priv); // Ed25519
  return b64url(payload) + '.' + b64url(sig);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function page(email, license) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your FastNet license</title>
<style>
:root{--bg:#0a0a0a;--surface:#141414;--border:#222;--text:#e8e8e8;--text2:#888;--accent:#3b82f6;--green:#22c55e}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
.container{max-width:640px;margin:0 auto;padding:64px 24px 96px}
h1{font-size:28px;font-weight:700;letter-spacing:-.02em;margin-bottom:6px}
.sub{color:var(--text2);margin-bottom:32px}
.label{color:var(--text2);font-size:13px;margin:24px 0 8px}
.key{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;word-break:break-all;color:var(--text)}
button{margin-top:14px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:11px 18px;font-size:15px;font-weight:600;cursor:pointer}
button:hover{border-color:#444}
a.dl{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;border-radius:10px;padding:13px 20px;font-size:16px;font-weight:700;margin-top:4px}
a.dl:hover{opacity:.92}
ol{color:#cfcfcf;margin:18px 0 0 20px}li{margin-bottom:8px}
.tip{color:var(--text2);font-size:13px;margin-top:28px}
.oneclick{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 20px}
.oneclick p{color:#cfcfcf;font-size:14px;margin:4px 0 14px}
a{color:var(--accent);text-decoration:none}
</style></head><body><div class="container">
<h1>✓ You're all set</h1>
<div class="sub">Thanks for buying FastNet${email ? ', ' + esc(email) : ''}.</div>

<div class="oneclick" id="oneclick" hidden>
<strong id="oneclick-title">FastNet Connect already on this Mac?</strong>
<p id="oneclick-how">Activate it from here. Your browser asks whether to open FastNet Connect: allow it.</p>
<a class="dl" href="fastnet://activate?key=${encodeURIComponent(license)}">Activate in FastNet Connect</a>
<p class="tip" id="oneclick-tip" style="margin-top:12px">Nothing happened? Install the latest version in step 1, then click the button again, or paste the key by hand (steps 2 and 3).</p>
</div>

<div class="label">1 · Download the app</div>
<p style="color:#cfcfcf;margin:0 0 12px">Open this page on the computer you want to connect. FastNet Connect installs on a Mac or a Windows PC, not on an iPhone, and this key works on both.</p>
<a class="dl" href="/download">⤓&nbsp; Download for Mac</a>
<a class="dl" href="/windows" style="margin-left:8px">⤓&nbsp; Download for Windows</a>
<p class="tip" style="margin-top:12px">Mac: Apple Silicon, macOS 13 or later. Windows: 10 or 11, and the Windows page shows each warning Windows displays for the installer. Bought from inside the app? It is already installed, so go straight to step 3.</p>

<div class="label" style="margin-top:32px">2 · Your license key</div>
<div class="key" id="key">${esc(license)}</div>
<button onclick="navigator.clipboard.writeText(document.getElementById('key').textContent).then(()=>{this.textContent='Copied ✓'})">Copy license key</button>

<div class="label" style="margin-top:32px">3 · Activate</div>
<ol>
  <li><strong>On a Mac:</strong> open the downloaded <strong>FastNet.pkg</strong> and follow the installer (one admin password), then launch <strong>FastNet Connect</strong> (paper-plane icon in the menu bar).</li>
  <li><strong>On a Windows PC:</strong> run the installer, then start <strong>FastNet Connect</strong> from the Start menu.</li>
  <li>With this page open on that computer, click <strong>Activate in FastNet Connect</strong> at the top. Or do it by hand: click <strong>Enter license key</strong> in the app and paste the key.</li>
</ol>

<div class="label" style="margin-top:32px">4 · Install the iPhone app</div>
<p style="color:#cfcfcf;margin:0 0 12px">Install <strong>ProxyDeck</strong> from the App Store on your iPhone, and keep it in the foreground while you are connected. <strong>Mac:</strong> open Mac Bridge, tap <strong>Start Mac Bridge</strong>, then connect from FastNet Connect over USB or nearby peer-to-peer Wi-Fi. <strong>Windows:</strong> join the iPhone's Wi-Fi network from the PC, click <strong>Connect</strong> in FastNet Connect, and scan the code it shows from ProxyDeck's Mac Bridge tab.</p>
<a class="dl" href="https://apps.apple.com/app/id6777330755">⤓&nbsp; Get ProxyDeck on the App Store</a>
<p class="tip" style="margin-top:10px">Tip: open this App Store link on your iPhone. Trouble? <a href="mailto:pjiang726@gmail.com">pjiang726@gmail.com</a></p>

<div class="tip">Keep this key — you can re-open this page anytime to copy it again. Questions? <a href="mailto:pjiang726@gmail.com">pjiang726@gmail.com</a></div>
</div>
<script>
// The activation link opens FastNet Connect on this computer, so offer it only
// where the app runs: a Mac (an iPad also reports itself as a Mac, but has a
// touch screen) or a Windows PC.
(function () {
  var onMac = /Mac/.test(navigator.platform) && !(navigator.maxTouchPoints > 1);
  var onWindows = /Win/.test(navigator.platform);
  if (!onMac && !onWindows) return;
  if (onWindows) {
    document.getElementById('oneclick-title').textContent = 'FastNet Connect already on this PC?';
    document.getElementById('oneclick-how').textContent = 'Activate it from here. Your browser asks whether to open FastNet Connect, then Windows asks whether to let it make changes: allow both.';
    document.getElementById('oneclick-tip').innerHTML = 'Nothing happened? Install the latest <a href="/windows">FastNet Connect for Windows</a>, then click the button again, or paste the key by hand: click <strong>Enter license key</strong> in the app.';
  }
  document.getElementById('oneclick').hidden = false;
})();
</script>
</body></html>`;
}

// A Checkout Session stays "paid" after a refund, so the refund has to be read
// from the charge. Only a full refund withdraws the key. If the lookup itself
// fails, the key is still shown: a Stripe hiccup must not lock out a buyer.
async function wasRefunded(stripe, session) {
  const intentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent && session.payment_intent.id;
  if (!intentId) return false;
  try {
    const charges = await stripe.charges.list({ payment_intent: intentId, limit: 10 });
    return charges.data.some((charge) => charge.refunded === true);
  } catch (e) {
    console.error('refund lookup failed:', e.message);
    return false;
  }
}

module.exports = async (req, res) => {
  const sessionId = req.query && req.query.session_id;
  if (!sessionId) { res.status(400).send('Missing session_id'); return; }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      res.status(402).send('Payment not completed for this session.');
      return;
    }
    if (await wasRefunded(stripe, session)) {
      res.status(410).send('This order was refunded, so its license key is no longer available.');
      return;
    }
    const email = (session.customer_details && session.customer_details.email) || '';
    const license = mintLicense(email, session.id, session.created);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(page(email, license));
  } catch (e) {
    res.status(500).send('License error: ' + e.message);
  }
};
