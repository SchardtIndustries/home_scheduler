// src/dashboard/ProfileTab.tsx
import React from 'react'

interface ProfileTabProps {
  profileName: string | null
  profileEmail: string | null
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profileName,
  profileEmail,
}) => (
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
