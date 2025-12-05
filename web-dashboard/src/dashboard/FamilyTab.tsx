// src/dashboard/FamilyTab.tsx
import React from 'react'
import type {
  CalendarRow,
  FamilyInviteDisplay,
  FamilyMemberDisplay,
} from './types'

interface FamilyTabProps {
  isFamilyOwner: boolean
  planLabel: string
  planDescription: string
  billingStatusText: string
  showNextBilling: boolean
  nextBillingText: string
  onOpenPlanModal: () => void

  familyMembers: FamilyMemberDisplay[]
  profileId: string | null

  inviteEmail: string
  inviteBusy: boolean
  inviteError: string | null
  inviteLink: string | null
  onInviteEmailChange: (value: string) => void
  onGenerateInvite: (e: React.FormEvent) => void
  familyInvites: FamilyInviteDisplay[]
  onCopyInviteLink: (invite: FamilyInviteDisplay) => void
  onRevokeInvite: (id: string) => void
  copiedInviteId: string | null
  inviteRevokeBusyId: string | null

  calendars: CalendarRow[]
  formatShortDateTime: (iso: string) => string
}

export const FamilyTab: React.FC<FamilyTabProps> = ({
  isFamilyOwner,
  planLabel,
  planDescription,
  billingStatusText,
  showNextBilling,
  nextBillingText,
  onOpenPlanModal,
  familyMembers,
  profileId,
  inviteEmail,
  inviteBusy,
  inviteError,
  inviteLink,
  onInviteEmailChange,
  onGenerateInvite,
  familyInvites,
  onCopyInviteLink,
  onRevokeInvite,
  copiedInviteId,
  inviteRevokeBusyId,
  calendars,
  formatShortDateTime,
}) => {
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
            <strong>Current plan:</strong> {planLabel}
          </p>
          <p style={{ marginBottom: 8, color: '#bbb' }}>{planDescription}</p>

          <p style={{ marginBottom: 8 }}>
            <strong>Billing status:</strong> {billingStatusText}
          </p>

          {showNextBilling && (
            <p style={{ marginBottom: 8 }}>
              <strong>Next billing date:</strong> {nextBillingText}
            </p>
          )}

          {isFamilyOwner ? (
            <>
              <p
                style={{
                  marginTop: 12,
                  marginBottom: 12,
                  fontSize: 14,
                  color: '#aaa',
                }}
              >
                You can upgrade or downgrade your plan at any time. Changes are handled securely by
                Stripe.
              </p>
              <button
                type="button"
                onClick={onOpenPlanModal}
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

            <form onSubmit={onGenerateInvite}>
              <div style={{ marginBottom: 8 }}>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => onInviteEmailChange(e.target.value)}
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

            {/* Pending invites */}
            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>Pending invites</h4>
              {familyInvites.length === 0 ? (
                <p style={{ fontSize: 14, color: '#999' }}>
                  No pending invites. Generate an invite to add someone to your family.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                  {familyInvites.map((inv) => (
                    <li
                      key={inv.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid #222',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14 }}>
                          <strong>{inv.email}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: '#aaa' }}>
                          Invited by {inv.invited_by} · Sent{' '}
                          {formatShortDateTime(inv.created_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => onCopyInviteLink(inv)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid #444',
                            backgroundColor: '#1a1a1a',
                            color: '#fff',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {copiedInviteId === inv.id ? 'Copied!' : 'Copy link'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRevokeInvite(inv.id)}
                          disabled={inviteRevokeBusyId === inv.id}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid #b91c1c',
                            backgroundColor: '#7f1d1d',
                            color: '#fff',
                            fontSize: 12,
                            cursor:
                              inviteRevokeBusyId === inv.id ? 'default' : 'pointer',
                          }}
                        >
                          {inviteRevokeBusyId === inv.id ? 'Revoking…' : 'Revoke'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
