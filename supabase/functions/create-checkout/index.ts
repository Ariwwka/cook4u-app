import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the calling user from the JWT
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const body = await req.json()
    const { items, customer_id, delivery_address_text, delivery_address_id, notes } = body

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items in cart' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Get chef_id from the first item's menu
    const { data: menuItem } = await supabase
      .from('menu_items')
      .select('menu_id, menus(chef_id)')
      .eq('id', items[0].menuItemId)
      .single()

    const chefId = menuItem?.menus?.chef_id
    if (!chefId) {
      return new Response(JSON.stringify({ error: 'Could not determine chef' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Get chef's Stripe account
    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('stripe_account_id')
      .eq('id', chefId)
      .single()

    const subtotal = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0)
    const serviceFee = Math.round(subtotal * 0.1 * 100) / 100
    const total = subtotal + serviceFee

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id,
        chef_id: chefId,
        status: 'payment_pending',
        total,
        notes: notes ?? null,
        delivery_address_id: delivery_address_id ?? null,
        delivery_address_text: delivery_address_text ?? null,
      })
      .select()
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Could not create order' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    // Insert order items
    const orderItems = items.map((i: any) => ({
      order_id: order.id,
      menu_item_id: i.menuItemId,
      quantity: i.quantity,
      unit_price: i.price,
      customizations: [],
    }))
    await supabase.from('order_items').insert(orderItems)

    // Build Stripe line items
    const lineItems = [
      ...items.map((i: any) => ({
        price_data: {
          currency: 'gbp',
          product_data: { name: i.name },
          unit_amount: Math.round(i.price * 100),
        },
        quantity: i.quantity,
      })),
      {
        price_data: {
          currency: 'gbp',
          product_data: { name: 'Service fee' },
          unit_amount: Math.round(serviceFee * 100),
        },
        quantity: 1,
      },
    ]

    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `https://cook4u.london?payment=success&order=${order.id}`,
      cancel_url: `https://cook4u.london?payment=cancelled&order=${order.id}`,
      metadata: { order_id: order.id },
    }

    // Add transfer to chef only if they have a Stripe account connected
    if (chefProfile?.stripe_account_id) {
      const platformFee = Math.round(total * 0.2 * 100)
      sessionParams.payment_intent_data = {
        transfer_data: { destination: chefProfile.stripe_account_id },
        application_fee_amount: platformFee,
        metadata: { order_id: order.id },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // Store payment session id on order
    await supabase
      .from('orders')
      .update({ stripe_payment_id: session.payment_intent as string })
      .eq('id', order.id)

    return new Response(
      JSON.stringify({ checkoutUrl: session.url, orderId: order.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('create-checkout error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
