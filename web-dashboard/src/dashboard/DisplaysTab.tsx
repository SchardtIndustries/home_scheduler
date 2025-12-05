// src/dashboard/DisplaysTab.tsx
import React from 'react'

export const DisplaysTab: React.FC = () => (
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
