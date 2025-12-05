// src/dashboard/types.ts

import type { PlanTier } from '../billing/plans'

export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'every_n_days'

export type TodoListRow = {
  id: string
  family_id: string
  name: string
  type: string // 'todo' | 'shopping'
  sort_order: number | null
  created_at: string
}

export type TodoItemRow = {
  id: string
  list_id: string
  title: string
  notes: string | null
  is_done: boolean
  due_at: string | null
  assigned_to_profile_id: string | null
  created_by: string | null
  created_at: string
  completed_at: string | null
  recurrence: RecurrenceType | null
  recurrence_interval_days: number | null
}

export type ProfileRow = {
  id: string
  user_id: string
  full_name: string | null
  created_at: string
}

export type FamilyRow = {
  id: string
  name: string
  plan_tier: string
  billing_customer_id: string | null
  billing_status: string | null
  created_at: string
  created_by: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_price_id?: string | null
  current_period_end?: string | null
}

export type Family = {
  id: string
  name: string
  plan_tier: PlanTier
  billing_status: string | null
  current_period_end: string | null
}

export type FamilyMemberRow = {
  id: string
  family_id: string
  profile_id: string
  role: string
  is_default: boolean
  invited_by: string | null
  created_at: string
}

export type CalendarRow = {
  id: string
  family_id: string
  name: string
  color: string | null
  is_primary: boolean
  timezone: string | null
  created_at: string
}

export type FamilyInviteRow = {
  id: string
  family_id: string
  email: string
  role: string
  token: string
  created_by_profile_id: string | null
  created_at: string
}

export type DashboardTab = 'family' | 'displays' | 'lists' | 'profile'

// Paid plans we expose in UI
export type PaidPlanTier = 'basic' | 'plus' | 'pro'

// Stripe billing intervals
export type BillingInterval = 'monthly' | 'yearly'

export type FamilyMemberDisplay = {
  id: string
  profile_id: string
  full_name: string | null
  role: string
  is_default: boolean
}

export type FamilyInviteDisplay = {
  id: string
  email: string
  invited_by: string
  created_at: string
  token: string
}
