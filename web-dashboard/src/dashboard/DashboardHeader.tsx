// src/dashboard/DashboardHeader.tsx
import React, { type CSSProperties } from 'react'
import type { DashboardTab } from './types'

interface DashboardHeaderProps {
  familyName: string
  activeTab: DashboardTab
  onChangeTab: (tab: DashboardTab) => void
  initials: string
  onLogout: () => void
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  familyName,
  activeTab,
  onChangeTab,
  initials,
  onLogout,
}) => {
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>Home Scheduler</div>
        <div style={{ fontSize: 14, color: '#bbb' }}>Family: {familyName}</div>
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
          style={activeTab === 'displays' ? navButtonActiveStyle : navButtonStyle}
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

        {/* Profile button */}
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
