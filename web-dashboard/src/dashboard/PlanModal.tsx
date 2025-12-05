// src/dashboard/PlanModal.tsx
import React from 'react'
import { PLAN_METADATA } from '../billing/plans'
import type { PaidPlanTier, BillingInterval } from './types'

interface PlanModalProps {
  isOpen: boolean
  selectedPlan: PaidPlanTier
  billingInterval: BillingInterval
  billingBusy: boolean
  billingError: string | null
  onChangePlan: (plan: PaidPlanTier) => void
  onChangeInterval: (interval: BillingInterval) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}

export const PlanModal: React.FC<PlanModalProps> = ({
  isOpen,
  selectedPlan,
  billingInterval,
  billingBusy,
  billingError,
  onChangePlan,
  onChangeInterval,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={() => !billingBusy && onClose()}
    >
      <div
        style={{
          backgroundColor: '#181818',
          borderRadius: 8,
          padding: 24,
          minWidth: 360,
          border: '1px solid #333',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Change plan</h3>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#bbb', fontSize: 14 }}>
          Choose a plan and billing interval. You&apos;ll be redirected to a secure Stripe
          checkout page.
        </p>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ marginBottom: 8, fontWeight: 600 }}>Plan</p>
            {(['basic', 'plus', 'pro'] as PaidPlanTier[]).map((planKey) => {
              const meta = PLAN_METADATA[planKey]
              const price =
                billingInterval === 'monthly' ? meta.monthlyPrice : meta.yearlyPrice

              const priceText =
                price === null
                  ? 'Contact us'
                  : `$${price.toFixed(2)} / ${
                      billingInterval === 'monthly' ? 'month' : 'year'
                    }`

              return (
                <label
                  key={planKey}
                  style={{
                    display: 'block',
                    marginBottom: 6,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={planKey}
                    checked={selectedPlan === planKey}
                    onChange={() => onChangePlan(planKey)}
                    style={{ marginRight: 8 }}
                  />
                  <strong>{meta.label}</strong> – {priceText} — {meta.description}
                </label>
              )
            })}
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ marginBottom: 8, fontWeight: 600 }}>Billing</p>
            <label style={{ marginRight: 16, fontSize: 14 }}>
              <input
                type="radio"
                name="interval"
                value="monthly"
                checked={billingInterval === 'monthly'}
                onChange={() => onChangeInterval('monthly')}
                style={{ marginRight: 6 }}
              />
              Monthly
            </label>
            <label style={{ fontSize: 14 }}>
              <input
                type="radio"
                name="interval"
                value="yearly"
                checked={billingInterval === 'yearly'}
                onChange={() => onChangeInterval('yearly')}
                style={{ marginRight: 6 }}
              />
              Yearly
            </label>
          </div>

          {billingError && (
            <div style={{ color: '#f87171', marginBottom: 12, fontSize: 14 }}>
              {billingError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={() => !billingBusy && onClose()}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: '1px solid #444',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                cursor: billingBusy ? 'default' : 'pointer',
                fontSize: 14,
              }}
              disabled={billingBusy}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={billingBusy}
              style={{
                padding: '6px 14px',
                borderRadius: 4,
                border: '1px solid #3b82f6',
                backgroundColor: '#1d4ed8',
                color: '#fff',
                cursor: billingBusy ? 'default' : 'pointer',
                fontSize: 14,
              }}
            >
              {billingBusy ? 'Redirecting…' : 'Go to checkout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
