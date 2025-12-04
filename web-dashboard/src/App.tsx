// web-dashboard/src/App.tsx
import { useEffect, useState, type CSSProperties } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import './dashboard.css'
import { PLAN_METADATA, STRIPE_PRICES, type PlanTier } from './billing/plans'

type ProfileRow = {
  id: string
  user_id: string
  full_name: string | null
  created_at: string
}

type FamilyRow = {
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

type Family = {
  id: string
  name: string
  plan_tier: PlanTier
  billing_status: string | null
  current_period_end: string | null
}

type FamilyMemberRow = {
  id: string
  family_id: string
  profile_id: string
  role: string
  is_default: boolean
  invited_by: string | null
  created_at: string
}

type CalendarRow = {
  id: string
  family_id: string
  name: string
  color: string | null
  is_primary: boolean
  timezone: string | null
  created_at: string
}

type DashboardTab = 'family' | 'displays' | 'lists' | 'profile'

// Paid plans we expose in UI
type PaidPlanTier = 'basic' | 'plus' | 'pro'

// Stripe price keys from STRIPE_PRICES mapping
type PriceKey = keyof typeof STRIPE_PRICES

type BillingInterval = 'monthly' | 'yearly'

type FamilyMemberDisplay = {
  id: string
  profile_id: string
  full_name: string | null
  role: string
  is_default: boolean
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>
  }

  if (!session) {
    return <AuthPage />
  }

  return <Dashboard session={session} />
}

function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
    } catch (err: unknown) {
      let message = 'Something went wrong'
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
      ) {
        message = (err as { message: string }).message
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
      <h1 style={{ marginBottom: 16 }}>Home Scheduler</h1>
      <p style={{ marginBottom: 16 }}>
        {mode === 'login' ? 'Log in to manage your family calendar.' : 'Create an account to get started.'}
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Email</label>
          <input
            type="email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Password</label>
          <input
            type="password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, marginBottom: 8 }}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        style={{ marginTop: 8, width: '100%', padding: 8 }}
      >
        {mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Log in'}
      </button>
    </div>
  )
}

function Dashboard({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true)
  const [family, setFamily] = useState<Family | null>(null)
  const [calendars, setCalendars] = useState<CalendarRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<DashboardTab>('family')
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileEmail] = useState<string | null>(session.user.email ?? null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [isFamilyOwner, setIsFamilyOwner] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberDisplay[]>([])

  // Plan modal state
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanTier>('plus')
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  // Map from (plan, interval) -> Stripe price key
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

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true)
        setError(null)

        const user = session.user

        // 1) Ensure profile exists
        const { data: existingProfileRaw, error: profileSelectError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (profileSelectError) throw profileSelectError

        const existingProfile = existingProfileRaw as ProfileRow | null

        let localProfileId: string
        if (!existingProfile) {
          const { data: newProfileRaw, error: insertErr } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              full_name: user.email ?? null,
            })
            .select('*')
            .single()
          if (insertErr) throw insertErr
          const newProfile = newProfileRaw as ProfileRow
          localProfileId = newProfile.id
          setProfileName(newProfile.full_name)
        } else {
          localProfileId = existingProfile.id
          setProfileName(existingProfile.full_name)
        }

        setProfileId(localProfileId)

        // 2) Find family memberships for this profile
        const { data: membershipsRaw, error: memberErr } = await supabase
          .from('family_members')
          .select('*')
          .eq('profile_id', localProfileId)

        if (memberErr) throw memberErr

        const memberships = (membershipsRaw ?? []) as FamilyMemberRow[]

        let activeFamilyRow: FamilyRow
        let isOwner = false

        if (memberships.length === 0) {
          // Create default family + membership
          const { data: newFamilyRaw, error: famErr } = await supabase
            .from('families')
            .insert({ name: 'My Family', plan_tier: 'free', created_by: user.id })
            .select('*')
            .single()
          if (famErr) throw famErr

          const newFamily = newFamilyRaw as FamilyRow

          const { error: fmErr } = await supabase.from('family_members').insert({
            family_id: newFamily.id,
            profile_id: localProfileId,
            role: 'owner',
            is_default: true,
          })
          if (fmErr) throw fmErr

          activeFamilyRow = newFamily
          isOwner = true
        } else {
          const defaultMembership = memberships.find((m) => m.is_default) ?? memberships[0]
          isOwner = defaultMembership.role === 'owner'

          const { data: famRaw, error: famSelErr } = await supabase
            .from('families')
            .select('*')
            .eq('id', defaultMembership.family_id)
            .single()

          if (famSelErr) throw famSelErr

          activeFamilyRow = famRaw as FamilyRow
        }

        const activeFamily: Family = {
          id: activeFamilyRow.id,
          name: activeFamilyRow.name,
          plan_tier: (activeFamilyRow.plan_tier as PlanTier) ?? 'free',
          billing_status: activeFamilyRow.billing_status ?? null,
          current_period_end: (activeFamilyRow.current_period_end as string | null) ?? null,
        }

        setFamily(activeFamily)
        setIsFamilyOwner(isOwner)

        // 3) Ensure at least one calendar for this family
        const { data: existingCalendarsRaw, error: calErr } = await supabase
          .from('calendars')
          .select('*')
          .eq('family_id', activeFamily.id)
          .order('created_at', { ascending: true })

        if (calErr) throw calErr

        let finalCalendars = (existingCalendarsRaw ?? []) as CalendarRow[]

        if (!existingCalendarsRaw || existingCalendarsRaw.length === 0) {
          const { data: newCalendarRaw, error: newCalErr } = await supabase
            .from('calendars')
            .insert({
              family_id: activeFamily.id,
              name: 'Home Calendar',
              color: '#007bff',
              is_primary: true,
            })
            .select('*')
            .single()

          if (newCalErr) throw newCalErr
          const newCalendar = newCalendarRaw as CalendarRow
          finalCalendars = [newCalendar]
        }

        setCalendars(finalCalendars)

        // 4) Load family members (then fetch profile names separately)
        const { data: membersRaw, error: membersErr } = await supabase
          .from('family_members')
          .select('*')
          .eq('family_id', activeFamily.id)

        if (membersErr) throw membersErr

        const members = (membersRaw ?? []) as FamilyMemberRow[]

        // Collect unique profile IDs
        const profileIds = Array.from(new Set(members.map((m) => m.profile_id)))

        const profilesById = new Map<string, ProfileRow>()

        if (profileIds.length > 0) {
          const { data: profilesRaw, error: profilesErr } = await supabase
            .from('profiles')
            .select('*')
            .in('id', profileIds)

          if (profilesErr) throw profilesErr

          ;(profilesRaw ?? []).forEach((p: any) => {
            profilesById.set(p.id as string, {
              id: p.id as string,
              user_id: p.user_id as string,
              full_name: (p.full_name as string | null) ?? null,
              created_at: p.created_at as string,
            })
          })
        }

        const membersDisplay: FamilyMemberDisplay[] = members.map((m) => {
          const prof = profilesById.get(m.profile_id)
          return {
            id: m.id,
            profile_id: m.profile_id,
            full_name: prof?.full_name ?? null,
            role: m.role,
            is_default: m.is_default,
          }
        })

        setFamilyMembers(membersDisplay)

      } catch (err: unknown) {
        console.error('Bootstrap error:', err)
        let message = 'Something went wrong while loading your family calendar.'
        if (
          err &&
          typeof err === 'object' &&
          'message' in err &&
          typeof (err as { message: unknown }).message === 'string'
        ) {
          message = (err as { message: string }).message
        }
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void bootstrap()
  }, [session])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const displayName = profileName || profileEmail || 'User'
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)

  const navButtonStyle: CSSProperties = {
    border: 'none',
    background: 'transparent',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 14,
  }

  const navButtonActiveStyle: CSSProperties = {
    ...navButtonStyle,
    borderBottom: '2px solid #007bff',
    fontWeight: 600,
  }

  const formatNextBilling = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

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

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!family) return
    setBillingBusy(true)
    setBillingError(null)

    try {
      const priceKey = PRICE_KEY_BY_PLAN[selectedPlan][billingInterval]

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          familyId: family.id,
          priceKey,
        },
      })

      if (error) {
        console.error('create-checkout-session error', error)
        setBillingError(error.message ?? 'Failed to start checkout.')
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

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!family || !inviteEmail) return
    setInviteBusy(true)
    setInviteError(null)
    setInviteLink(null)

    try {
      const { data, error } = await supabase
        .from('family_invites')
        .insert({
          family_id: family.id,
          email: inviteEmail,
          role: 'member',
          created_by_profile_id: profileId,
        })
        .select('token')
        .single()

      if (error) throw error

      const token = (data as { token: string }).token
      const origin = window.location.origin
      const url = `${origin}/?invite=${encodeURIComponent(token)}`
      setInviteLink(url)
    } catch (err: unknown) {
      console.error('Invite error', err)
      let message = 'Could not generate invite link.'
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
      ) {
        message = (err as { message: string }).message
      }
      setInviteError(message)
    } finally {
      setInviteBusy(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading your family…</div>
  }

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <p style={{ color: 'red', marginBottom: 16 }}>{error}</p>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
          Check the browser console for more details (we log the full error there).
        </p>
        <button onClick={handleLogout}>Log out</button>
      </div>
    )
  }

  if (!family) {
    return (
      <div style={{ padding: 24 }}>
        <p>Something went wrong: no family found.</p>
        <button onClick={handleLogout}>Log out</button>
      </div>
    )
  }

  const currentPlanMeta = PLAN_METADATA[family.plan_tier]

  const renderFamilyTab = () => {
    return (
      <>
        {/* Family admin */}
        <section style={{ marginBottom: 32 }}>
          <h2>Family admin</h2>
          <p style={{ color: '#bbb' }}>
            {isFamilyOwner
              ? 'You are the admin for this family.'
              : 'You are a member of this family. Only the admin can change billing and memberships.'}
          </p>
        </section>

        {/* Family Plan */}
        <section style={{ marginBottom: 32 }}>
          <h2>Family plan</h2>

          <div
            style={{
              border: '1px solid #333',
              borderRadius: 8,
              padding: 16,
              maxWidth: 480,
              backgroundColor: '#181818',
            }}
          >
            <p style={{ marginBottom: 8 }}>
              <strong>Current plan:</strong> {currentPlanMeta.label}
            </p>
            <p style={{ marginBottom: 8, color: '#bbb' }}>{currentPlanMeta.description}</p>

            <p style={{ marginBottom: 8 }}>
              <strong>Billing status:</strong>{' '}
              {family.plan_tier === 'ginger_magic'
                ? 'Internal (no billing)'
                : family.billing_status ?? '—'}
            </p>

            {family.plan_tier !== 'free' && family.plan_tier !== 'ginger_magic' && (
              <p style={{ marginBottom: 8 }}>
                <strong>Next billing date:</strong>{' '}
                {formatNextBilling(family.current_period_end)}
              </p>
            )}

            {isFamilyOwner ? (
              <>
                <p style={{ marginTop: 12, marginBottom: 12, fontSize: 14, color: '#aaa' }}>
                  You can upgrade or downgrade your plan at any time. Changes are handled securely
                  by Stripe.
                </p>
                <button
                  type="button"
                  onClick={handleOpenPlanModal}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 4,
                    border: '1px solid #3b82f6',
                    backgroundColor: '#1d4ed8',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Change plan
                </button>
              </>
            ) : (
              <p style={{ marginTop: 12, fontSize: 14, color: '#aaa' }}>
                To make changes to this plan, please contact your family admin.
              </p>
            )}
          </div>
        </section>

        {/* Family Members */}
        <section style={{ marginBottom: 32 }}>
          <h2>Family members</h2>

          <ul style={{ marginBottom: 16 }}>
            {familyMembers.map((m) => {
              const name = m.full_name || '(Unnamed member)'
              const isYou = profileId === m.profile_id
              const roleLabel =
                m.role === 'owner'
                  ? 'Admin'
                  : m.role.charAt(0).toUpperCase() + m.role.slice(1)

              return (
                <li key={m.id} style={{ marginBottom: 4 }}>
                  <strong>{name}</strong>
                  {isYou && ' (You)'}
                  {' — '}
                  <span style={{ color: '#bbb' }}>{roleLabel}</span>
                  {m.is_default && <span style={{ color: '#60a5fa' }}> · default</span>}
                </li>
              )
            })}
            {familyMembers.length === 0 && (
              <li style={{ color: '#bbb' }}>No members yet.</li>
            )}
          </ul>

          {isFamilyOwner && (
            <div
              style={{
                border: '1px solid #333',
                borderRadius: 8,
                padding: 16,
                maxWidth: 480,
                backgroundColor: '#181818',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>Add member</h3>
              <p style={{ marginTop: 0, marginBottom: 12, fontSize: 14, color: '#bbb' }}>
                Enter an email to generate an invite link you can paste into a text or email.
              </p>

              <form onSubmit={handleGenerateInvite}>
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="family@example.com"
                    style={{
                      width: '100%',
                      padding: 8,
                      borderRadius: 4,
                      border: '1px solid #444',
                      backgroundColor: '#111',
                      color: '#fff',
                    }}
                  />
                </div>

                {inviteError && (
                  <div style={{ color: '#f87171', marginBottom: 8, fontSize: 14 }}>
                    {inviteError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={inviteBusy}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: '1px solid #3b82f6',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    cursor: inviteBusy ? 'default' : 'pointer',
                    fontSize: 14,
                  }}
                >
                  {inviteBusy ? 'Generating…' : 'Generate invite link'}
                </button>
              </form>

              {inviteLink && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ marginBottom: 4, fontSize: 14, color: '#bbb' }}>
                    Share this link with your family member:
                  </p>
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    onFocus={(e) => e.target.select()}
                    style={{
                      width: '100%',
                      padding: 8,
                      borderRadius: 4,
                      border: '1px solid #444',
                      backgroundColor: '#111',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {/* Calendars section */}
        <section style={{ marginBottom: 24 }}>
          <h2>Calendars</h2>
          <p style={{ color: '#bbb' }}>
            All Calenders shared by your family members will be displayed here.
          </p>

          <ul>
            {calendars.map((cal) => (
              <li key={cal.id} style={{ marginBottom: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: cal.color ?? '#888',
                    marginRight: 8,
                  }}
                />
                {cal.name} {cal.is_primary && <strong>(Primary)</strong>}
              </li>
            ))}
          </ul>
        </section>
      </>
    )
  }

  const renderDisplaysTab = () => (
    <section>
      <h2>Displays</h2>
      <p style={{ color: '#bbb', marginBottom: 12 }}>
        This is where you&apos;ll configure wall / Raspberry Pi displays for your home.
      </p>
      <ul>
        <li>Kitchen display, hallway display, bedroom display, etc.</li>
        <li>Choose which calendars, lists, and photos appear on each display.</li>
        <li>Configure themes (dark mode, font sizes, rotations).</li>
      </ul>
    </section>
  )

  const renderListsTab = () => (
    <section>
      <h2>Lists</h2>
      <p style={{ color: '#bbb', marginBottom: 12 }}>
        This is where you&apos;ll design shared todo and shopping lists for your family.
      </p>
      <ul>
        <li>Create lists like &quot;Groceries&quot;, &quot;Chores&quot;, &quot;Projects&quot;.</li>
        <li>Assign items to family members and attach due dates.</li>
        <li>Control which lists appear on each display and in the mobile app.</li>
      </ul>
    </section>
  )

  const renderProfileTab = () => (
    <section>
      <h2>Profile</h2>
      <p style={{ color: '#bbb' }}>Manage your account details here.</p>
      <div style={{ marginTop: 12 }}>
        <p>
          <strong>Name:</strong> {profileName ?? '(not set)'}
        </p>
        <p>
          <strong>Email:</strong> {profileEmail ?? '(unknown)'}
        </p>
      </div>
    </section>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'family':
        return renderFamilyTab()
      case 'displays':
        return renderDisplaysTab()
      case 'lists':
        return renderListsTab()
      case 'profile':
        return renderProfileTab()
      default:
        return null
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        backgroundColor: '#121212',
        color: '#fff',
      }}
    >
      {/* Top nav */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: '1px solid #333',
          flexShrink: 0,
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 20 }}>Home Scheduler</div>
          <div style={{ fontSize: 14, color: '#bbb' }}>Family: {family.name}</div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('family')}
            style={activeTab === 'family' ? navButtonActiveStyle : navButtonStyle}
          >
            Family
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('displays')}
            style={activeTab === 'displays' ? navButtonActiveStyle : navButtonStyle}
          >
            Displays
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lists')}
            style={activeTab === 'lists' ? navButtonActiveStyle : navButtonStyle}
          >
            Lists
          </button>

          {/* Profile button */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              marginLeft: 16,
              borderRadius: '50%',
              width: 36,
              height: 36,
              border: '1px solid #444',
              backgroundColor: activeTab === 'profile' ? '#1f2937' : '#242424',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="View profile"
          >
            {initials || '?'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              marginLeft: 8,
              padding: '6px 12px',
              fontSize: 13,
              border: '1px solid #444',
              borderRadius: 4,
              backgroundColor: '#1a1a1a',
              cursor: 'pointer',
            }}
          >
            Log out
          </button>
        </nav>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 48px',
          width: '100%',
        }}
      >
        {renderContent()}
      </main>

      {/* Plan change modal */}
      {showPlanModal && (
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
          onClick={() => !billingBusy && setShowPlanModal(false)}
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

            <form onSubmit={handlePlanSubmit}>
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
                        onChange={() => setSelectedPlan(planKey)}
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
                    onChange={() => setBillingInterval('monthly')}
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
                    onChange={() => setBillingInterval('yearly')}
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
                  onClick={() => !billingBusy && setShowPlanModal(false)}
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
      )}
    </div>
  )
}

export default App
