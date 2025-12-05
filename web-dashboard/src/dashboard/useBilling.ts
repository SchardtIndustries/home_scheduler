// src/dashboard/useBilling.ts
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { STRIPE_PRICES } from '../billing/plans'
import type { Family, BillingInterval, PaidPlanTier } from './types'

type PriceKey = keyof typeof STRIPE_PRICES

const PRICE_KEY_BY_PLAN: Record<PaidPlanTier, Record<BillingInterval, PriceKey>> = {
  basic: {
    monthly: 'BASIC_MONTHLY',
    yearly: 'BASIC_YEARLY',
  },
  plus: {
    monthly: 'PLUS_MONTHLY',
    yearly: 'PLUS_YEARLY',
  },
  pro: {
    monthly: 'PRO_MONTHLY',
    yearly: 'PRO_YEARLY',
  },
}

export function useBilling(family: Family | null) {
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanTier>('plus')
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)

  const handleOpenPlanModal = () => {
    if (!family) return
    const current = family.plan_tier
    if (current === 'basic' || current === 'plus' || current === 'pro') {
      setSelectedPlan(current)
    } else {
      setSelectedPlan('plus')
    }
    setBillingInterval('monthly')
    setBillingError(null)
    setShowPlanModal(true)
  }

  const handleClosePlanModal = () => {
    if (billingBusy) return
    setShowPlanModal(false)
  }

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!family) return
    setBillingBusy(true)
    setBillingError(null)

    try {
      const priceKey = PRICE_KEY_BY_PLAN[selectedPlan][billingInterval]

      const { data, error: fnError } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: {
            familyId: family.id,
            priceKey,
          },
        }
      )

      if (fnError) {
        console.error('create-checkout-session error', fnError)
        setBillingError(fnError.message ?? 'Failed to start checkout.')
        setBillingBusy(false)
        return
      }

      const url = (data as { url?: string } | null)?.url
      if (!url) {
        setBillingError('No checkout URL returned from server.')
        setBillingBusy(false)
        return
      }

      window.location.href = url
    } catch (err: unknown) {
      console.error('Plan submit error', err)
      let message = 'Something went wrong starting checkout.'
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
      ) {
        message = (err as { message: string }).message
      }
      setBillingError(message)
      setBillingBusy(false)
    }
  }

  return {
    showPlanModal,
    selectedPlan,
    billingInterval,
    billingBusy,
    billingError,
    setSelectedPlan,
    setBillingInterval,
    handleOpenPlanModal,
    handleClosePlanModal,
    handlePlanSubmit,
  }
}
