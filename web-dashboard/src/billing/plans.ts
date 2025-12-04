// web-dashboard/src/billing/plans.ts

// All possible tiers stored in families.plan_tier
export type PlanTier = 'free' | 'basic' | 'plus' | 'pro' | 'ginger_magic'

type PlanMeta = {
  label: string
  description: string
  monthlyPrice: number | null
  yearlyPrice: number | null
}

// Metadata for each tier (used in UI only)
export const PLAN_METADATA: Record<PlanTier, PlanMeta> = {
  free: {
    label: 'Free',
    description: 'One calendar, one display, core features to get started.',
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  basic: {
    label: 'Basic',
    description: 'Up to 3 calendars, 3 displays, and 5 members.',
    monthlyPrice: 4.99,
    yearlyPrice: 49, // small discount vs monthly
  },
  plus: {
    label: 'Plus',
    description: 'Most popular – unlimited members, unlimited calendars, up to 6 displays.',
    monthlyPrice: 8.99,
    yearlyPrice: 89,
  },
  pro: {
    label: 'Pro',
    description: 'Power users – unlimited displays, multi-home support, advanced features.',
    monthlyPrice: 14.99,
    yearlyPrice: 149,
  },
  ginger_magic: {
    label: 'Ginger Magic',
    description: 'Internal / tester plan – unlimited everything, no billing.',
    monthlyPrice: null,
    yearlyPrice: null,
  },
}

// Stripe price IDs – used for typing on the frontend, and actual billing in the Edge Function
export const STRIPE_PRICES = {
  BASIC_MONTHLY:  'price_1Sadh52MNqyvzIlWfKp8B3Pd',
  BASIC_YEARLY:   'price_1Sadh52MNqyvzIlWNKra25CH',
  PLUS_MONTHLY:   'price_1Sadhz2MNqyvzIlWjPxMevAk',
  PLUS_YEARLY:    'price_1Sadhi2MNqyvzIlWjpDJuAr7',
  PRO_MONTHLY:    'price_1SadjP2MNqyvzIlWGebEbCsW',
  PRO_YEARLY:     'price_1SadjP2MNqyvzIlWKBYEKLsZ',
} as const
