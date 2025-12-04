import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0?target=deno'

// CORS headers so the browser can call this from your Vite app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const APP_BASE_URL = Deno.env.get('APP_BASE_URL')
// Note: these are your custom names to avoid SUPABASE_ reserved prefix
const SUPABASE_URL = Deno.env.get('SB_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SB_ANON_KEY')

if (!STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY')
if (!APP_BASE_URL) throw new Error('Missing APP_BASE_URL')
if (!SUPABASE_URL) throw new Error('Missing SB_URL')
if (!SUPABASE_ANON_KEY) throw new Error('Missing SB_ANON_KEY')

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

const STRIPE_PRICES = {
  BASIC_MONTHLY:  'price_1Sadh52MNqyvzIlWfKp8B3Pd',
  BASIC_YEARLY:   'price_1Sadh52MNqyvzIlWNKra25CH',
  PLUS_MONTHLY:   'price_1Sadhz2MNqyvzIlWjPxMevAk',
  PLUS_YEARLY:    'price_1Sadhi2MNqyvzIlWjpDJuAr7',
  PRO_MONTHLY:    'price_1SadjP2MNqyvzIlWGebEbCsW',
  PRO_YEARLY:     'price_1SadjP2MNqyvzIlWKBYEKLsZ',
} as const

type PriceKey = keyof typeof STRIPE_PRICES

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing Authorization header', {
        status: 401,
        headers: corsHeaders,
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      console.error('getUser error', userError)
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders,
      })
    }
    const user = userData.user

    const body = await req.json().catch(() => null) as {
      familyId?: string
      priceKey?: PriceKey
    } | null

    if (!body?.familyId || !body?.priceKey) {
      return new Response('Missing familyId or priceKey', {
        status: 400,
        headers: corsHeaders,
      })
    }

    const { familyId, priceKey } = body

    if (!(priceKey in STRIPE_PRICES)) {
      return new Response('Invalid priceKey', {
        status: 400,
        headers: corsHeaders,
      })
    }

    // 1) Look up profile for this user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error('profile error', profileError)
      return new Response('Profile not found', {
        status: 400,
        headers: corsHeaders,
      })
    }

    // 2) Confirm user is OWNER of this family
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('role')
      .eq('family_id', familyId)
      .eq('profile_id', profile.id)
      .maybeSingle()

    if (membershipError) {
      console.error('membership error', membershipError)
      return new Response('Could not verify family membership', {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (!membership || membership.role !== 'owner') {
      return new Response('Only the family admin can change billing.', {
        status: 403,
        headers: corsHeaders,
      })
    }

    // 3) Load family row
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single()

    if (familyError || !family) {
      console.error('family error', familyError)
      return new Response('Family not found', {
        status: 404,
        headers: corsHeaders,
      })
    }

    // 4) Get or create Stripe customer
    let stripeCustomerId: string | null = family.stripe_customer_id ?? family.billing_customer_id ?? null

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          family_id: familyId,
        },
      })

      stripeCustomerId = customer.id

      // Update family with customer id
      const { error: updateErr } = await supabase
        .from('families')
        .update({
          stripe_customer_id: customer.id,
          billing_customer_id: customer.id,
        })
        .eq('id', familyId)

      if (updateErr) {
        console.error('Failed to update family with stripe_customer_id', updateErr)
      }
    }

    const priceId = STRIPE_PRICES[priceKey]

    // 5) Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId ?? undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_BASE_URL}?billing=success`,
      cancel_url: `${APP_BASE_URL}?billing=cancel`,
      metadata: {
        family_id: familyId,
        price_key: priceKey,
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (err) {
    console.error('Unexpected error in create-checkout-session', err)
    return new Response('Internal Server Error', {
      status: 500,
      headers: corsHeaders,
    })
  }
})
