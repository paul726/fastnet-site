// GET /api/license?session_id=cs_…
// Retrieves the Checkout Session, confirms it's paid, mints an Ed25519-signed
// license bound to the buyer's email, and returns an HTML page that shows the
// key to copy into the FastNet Mac app. Stateless + idempotent: re-fetching the
// same session yields the same license (iat = session.created).
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
a{color:var(--accent);text-decoration:none}
</style></head><body><div class="container">
<h1>✓ You're all set</h1>
<div class="sub">Thanks for buying FastNet${email ? ', ' + esc(email) : ''}.</div>

<div class="label">1 · Download the app</div>
<a class="dl" href="/download">⤓&nbsp; Download FastNet for Mac</a>

<div class="label" style="margin-top:32px">2 · Your license key</div>
<div class="key" id="key">${esc(license)}</div>
<button onclick="navigator.clipboard.writeText(document.getElementById('key').textContent).then(()=>{this.textContent='Copied ✓'})">Copy license key</button>

<div class="label" style="margin-top:32px">3 · Activate</div>
<ol>
  <li>Open the downloaded <strong>FastNet.pkg</strong> and follow the installer (one admin password).</li>
  <li>Launch <strong>FastNet</strong> (paper-plane icon in the menu bar), paste the key into <strong>“Paste your license key”</strong>, and click <strong>Activate</strong>.</li>
</ol>

<div class="tip">Keep this key — you can re-open this page anytime to copy it again. Questions? <a href="mailto:pjiang726@gmail.com">pjiang726@gmail.com</a></div>
</div></body></html>`;
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
    const email = (session.customer_details && session.customer_details.email) || '';
    const license = mintLicense(email, session.id, session.created);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(page(email, license));
  } catch (e) {
    res.status(500).send('License error: ' + e.message);
  }
};
