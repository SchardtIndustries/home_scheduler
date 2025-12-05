// src/dashboard/useFamilyInvites.ts
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  FamilyInviteDisplay,
  FamilyInviteRow,
} from './types'

interface UseFamilyInvitesArgs {
  familyId: string | null
  profileId: string | null
  familyInvites: FamilyInviteDisplay[]
  setFamilyInvites: React.Dispatch<React.SetStateAction<FamilyInviteDisplay[]>>
}

export function useFamilyInvites({
  familyId,
  profileId,
  setFamilyInvites,
}: UseFamilyInvitesArgs) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteRevokeBusyId, setInviteRevokeBusyId] = useState<string | null>(null)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyId || !inviteEmail) return
    setInviteBusy(true)
    setInviteError(null)
    setInviteLink(null)

    try {
      const { data, error: insertError } = await supabase
        .from('family_invites')
        .insert({
          family_id: familyId,
          email: inviteEmail,
          role: 'member',
          created_by_profile_id: profileId,
        })
        .select('id,email,role,token,created_by_profile_id,created_at')
        .single()

      if (insertError) throw insertError

      const invite = data as FamilyInviteRow

      const origin = window.location.origin
      const url = `${origin}/invite?token=${encodeURIComponent(invite.token)}`
      setInviteLink(url)

      const invitedBy =
        profileId && invite.created_by_profile_id === profileId ? 'You' : 'Unknown'

      const displayInvite: FamilyInviteDisplay = {
        id: invite.id,
        email: invite.email,
        invited_by: invitedBy,
        created_at: invite.created_at,
        token: invite.token,
      }

      setFamilyInvites((prev) => [...prev, displayInvite])
      setInviteEmail('')
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

  const handleCopyInviteLink = async (invite: FamilyInviteDisplay) => {
    const origin = window.location.origin
    const url = `${origin}/invite?token=${encodeURIComponent(invite.token)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedInviteId(invite.id)
      window.setTimeout(() => {
        setCopiedInviteId((current) => (current === invite.id ? null : current))
      }, 2000)
    } catch (err) {
      console.error('Copy invite link error', err)
      setInviteError('Could not copy invite link to clipboard.')
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    setInviteRevokeBusyId(inviteId)
    setInviteError(null)
    try {
      const { error: deleteError } = await supabase
        .from('family_invites')
        .delete()
        .eq('id', inviteId)

      if (deleteError) throw deleteError
      setFamilyInvites((prev) => prev.filter((i) => i.id !== inviteId))
    } catch (err: unknown) {
      console.error('Revoke invite error', err)
      let message = 'Could not revoke invite.'
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
      setInviteRevokeBusyId(null)
    }
  }

  return {
    inviteEmail,
    setInviteEmail,
    inviteBusy,
    inviteError,
    inviteLink,
    inviteRevokeBusyId,
    copiedInviteId,
    handleGenerateInvite,
    handleCopyInviteLink,
    handleRevokeInvite,
  }
}
