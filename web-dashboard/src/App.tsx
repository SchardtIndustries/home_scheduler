// src/App.tsx
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AcceptInvitePage } from './AcceptInvitePage'
import { AuthPage } from './AuthPage'
import { Dashboard } from './Dashboard'

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

  return (
    <Routes>
      {/* Invite acceptance route – works even if not logged in */}
      <Route path="/invite" element={<AcceptInvitePage />} />

      {/* Everything else – auth gate: dashboard if logged in, or auth page */}
      <Route
        path="/*"
        element={session ? <Dashboard session={session} /> : <AuthPage />}
      />
    </Routes>
  )
}

export default App
