// web-dashboard/src/AcceptInvitePage.tsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

type PreviewResponse = {
  familyName?: string
  inviterName?: string
  message?: string
}

function AcceptInvitePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')

  const [familyName, setFamilyName] = useState<string | null>(null)
  const [inviterName, setInviterName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setError('Missing invite token')
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.functions.invoke<PreviewResponse>('accept-family-invite', {
          body: { token, mode: 'preview' },
        })

        if (error) {
          console.error('accept-family-invite preview error:', error)
          setError(error.message ?? 'Failed to preview invite.')
        } else if (!data) {
          setError('No data returned from invite preview.')
        } else {
          setFamilyName(data.familyName ?? 'Unknown family')
          setInviterName(data.inviterName ?? 'Someone')
        }
      } catch (err) {
        console.error('Network error calling accept-family-invite (preview):', err)
        setError('Failed to send a request to the Edge Function.')
      } finally {
        setLoading(false)
      }
    }

    void loadInvite()
  }, [token])

  const handleAccept = async () => {
    if (!token) {
      setError('Missing invite token')
      return
    }

    try {
      const { data, error } = await supabase.functions.invoke('accept-family-invite', {
        body: { token, mode: 'accept' },
      })

      if (error) {
        console.error('accept-family-invite accept error:', error, 'data:', data)
        setError(error.message ?? 'Failed to accept invite.')
      } else {
        // On success, go to dashboard
        navigate('/')
      }
    } catch (err) {
      console.error('Network error calling accept-family-invite (accept):', err)
      setError('Failed to send a request to the Edge Function.')
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading invite…</div>
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Join Family</h1>
        <p style={{ color: 'red', marginTop: 12 }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Join Family</h1>
      <p>
        <strong>{inviterName}</strong> has invited you to join the family:
      </p>
      <h2 style={{ marginTop: 8 }}>{familyName}</h2>

      <button
        onClick={handleAccept}
        style={{
          padding: '8px 16px',
          marginTop: 16,
          borderRadius: 4,
          border: '1px solid #3b82f6',
          backgroundColor: '#2563eb',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Accept Invitation
      </button>

      <p style={{ marginTop: 12, fontSize: 14, color: '#bbb' }}>
        If you don&apos;t want to join this family, simply close this page.
      </p>
    </div>
  )
}

export { AcceptInvitePage }
