// src/dashboard/DashboardHeader.tsx
import React, { useState } from 'react'
import type { DashboardTab, UserFamilySummary } from './types'

interface DashboardHeaderProps {
  familyName: string
  families: UserFamilySummary[]
  currentFamilyId: string
  onSelectFamily: (familyId: string) => void

  activeTab: DashboardTab
  onChangeTab: (tab: DashboardTab) => void

  initials: string
  profileImageUrl: string | null
  onLogout: () => void
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  familyName,
  families,
  currentFamilyId,
  onSelectFamily,
  activeTab,
  onChangeTab,
  initials,
  profileImageUrl,
  onLogout,
}) => {
  const [familyMenuOpen, setFamilyMenuOpen] = useState(false)

  const navButtonStyle: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 14,
  }

  const navButtonActiveStyle: React.CSSProperties = {
    ...navButtonStyle,
    borderBottom: '2px solid #007bff',
    fontWeight: 600,
  }

  const currentFamily =
    families.find((f) => f.id === currentFamilyId) ?? null

  const familyLabel = currentFamily?.name ?? familyName

  const handleSelectFamily = (id: string) => {
    setFamilyMenuOpen(false)
    if (id !== currentFamilyId) {
      onSelectFamily(id)
    }
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: '1px solid #333',
        flexShrink: 0,
        width: '100%',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>Home Scheduler</div>

        {/* Family dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setFamilyMenuOpen((open) => !open)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #333',
              backgroundColor: '#181818',
              color: '#e5e7eb',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            <span>Family: {familyLabel}</span>
            <span style={{ fontSize: 10 }}>
              {familyMenuOpen ? '▲' : '▼'}
            </span>
          </button>

          {familyMenuOpen && families.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                minWidth: 220,
                borderRadius: 8,
                border: '1px solid #333',
                backgroundColor: '#111',
                boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
                padding: 8,
              }}
            >
              {families.map((fam) => (
                <button
                  key={fam.id}
                  type="button"
                  onClick={() => handleSelectFamily(fam.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor:
                      fam.id === currentFamilyId ? '#1f2937' : 'transparent',
                    color:
                      fam.id === currentFamilyId ? '#ffffff' : '#e5e7eb',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  <span>
                    {fam.name}
                    {fam.is_default && (
                      <span style={{ color: '#60a5fa', marginLeft: 4 }}>
                        · default
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#9ca3af',
                      textTransform: 'capitalize',
                    }}
                  >
                    {fam.role === 'owner' ? 'Admin' : fam.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => onChangeTab('family')}
          style={activeTab === 'family' ? navButtonActiveStyle : navButtonStyle}
        >
          Family
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('displays')}
          style={
            activeTab === 'displays' ? navButtonActiveStyle : navButtonStyle
          }
        >
          Displays
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('lists')}
          style={activeTab === 'lists' ? navButtonActiveStyle : navButtonStyle}
        >
          Lists
        </button>

        {/* Profile button with avatar */}
        <button
          type="button"
          onClick={() => onChangeTab('profile')}
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
            cursor: 'pointer',
            padding: 0,
            overflow: 'hidden',
          }}
          title="View profile"
        >
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt="Profile"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {initials || '?'}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onLogout}
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
  )
}
