import Stripe from 'stripe';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const sig = request.headers.get('stripe-signature');
    const bodyText = await request.text();

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
    
    // Verify the webhook came from Stripe
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        bodyText,
        sig,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle successful subscription checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Determine tier based on the Price ID or metadata passed from Stripe
      const priceId = session.line_items?.data?.[0]?.price?.id;
      
      // Example: Check which link was purchased or read metadata
      // Writers Tier = max 2 members, Editorial Tier = max 10+ members
      const isWritersTier = session.amount_total === 1499; // $14.99 in cents
      const maxMembers = isWritersTier ? 2 : 10;
      
      const clerkOrgId = session.metadata?.clerk_org_id;

      if (clerkOrgId) {
        // Call Clerk Backend API to update organization max memberships
        const clerkRes = await fetch(`https://api.clerk.com/v1/organizations/${clerkOrgId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            max_allowed_memberships: maxMembers,
            public_metadata: {
              tier: isWritersTier ? 'writers' : 'editorial'
            }
          }),
        });

        if (!clerkRes.ok) {
          console.error("Failed to update Clerk organization limits");
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}