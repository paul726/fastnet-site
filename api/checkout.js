// GET /api/checkout (aliased as /buy)
// Creates a Stripe Checkout Session for the one-time FastNet Mac license and
// redirects the browser to Stripe's hosted payment page. On success Stripe
// redirects to /api/license, which mints the signed license key.
//
// Env: STRIPE_SECRET_KEY (sk_test_… / sk_live_…)
const Stripe = require('stripe');

const SITE = 'https://fastnet-site.vercel.app';

module.exports = async (req, res) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 2900, // $29.00
          product_data: {
            name: 'FastNet — Mac License',
            description: 'One-time, lifetime license for the FastNet Mac app.',
          },
        },
      }],
      // Stripe Checkout collects the buyer's email; it lands in
      // session.customer_details.email, which the license is bound to.
      success_url: `${SITE}/api/license?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/proxydeck`,
    });
    res.writeHead(303, { Location: session.url });
    res.end();
  } catch (e) {
    res.status(500).send('Checkout error: ' + e.message);
  }
};
