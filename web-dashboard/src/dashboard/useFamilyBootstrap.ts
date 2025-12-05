// src/dashboard/useFamilyBootstrap.ts
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type {
  CalendarRow,
  Family,
  FamilyInviteDisplay,
  FamilyInviteRow,
  FamilyMemberDisplay,
  FamilyMemberRow,
  FamilyRow,
  ProfileRow,
  UserFamilySummary,
} from './types'
import type { PlanTier } from '../billing/plans'

interface UseFamilyBootstrapResult {
  loading: boolean
  error: string | null
  family: Family | null
  calendars: CalendarRow[]
  profileName: string | null
  profileId: string | null
  profileAvatarUrl: string | null
  isFamilyOwner: boolean
  familyMembers: FamilyMemberDisplay[]
  familyInvites: FamilyInviteDisplay[]
  userFamilies: UserFamilySummary[]
  setFamilyInvites: React.Dispatch<React.SetStateAction<FamilyInviteDisplay[]>>
  setProfileAvatarUrl: React.Dispatch<React.SetStateAction<string | null>>
  setUserFamilies: React.Dispatch<React.SetStateAction<UserFamilySummary[]>>
}

export function useFamilyBootstrap(
  session: Session,
  activeFamilyId: string | null
): UseFamilyBootstrapResult {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [family, setFamily] = useState<Family | null>(null)
  const [calendars, setCalendars] = useState<CalendarRow[]>([])
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null)
  const [isFamilyOwner, setIsFamilyOwner] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberDisplay[]>([])
  const [familyInvites, setFamilyInvites] = useState<FamilyInviteDisplay[]>([])
  const [userFamilies, setUserFamilies] = useState<UserFamilySummary[]>([])

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true)
        setError(null)

        const user = session.user

        // 1) Ensure profile exists
        const { data: existingProfileRaw, error: profileSelectError } =
          await supabase
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
          setProfileAvatarUrl(newProfile.avatar_url ?? null)
        } else {
          localProfileId = existingProfile.id
          setProfileName(existingProfile.full_name)
          setProfileAvatarUrl(existingProfile.avatar_url ?? null)
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
            .insert({
              name: 'My Family',
              plan_tier: 'free',
              created_by: user.id,
            })
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

          // userFamilies list (single family)
          setUserFamilies([
            {
              id: newFamily.id,
              name: newFamily.name,
              role: 'owner',
              is_default: true,
            },
          ])
        } else {
          // Load all families the user belongs to
          const familyIds = memberships.map((m) => m.family_id)
          const { data: famsRaw, error: famsErr } = await supabase
            .from('families')
            .select('*')
            .in('id', familyIds)

          if (famsErr) throw famsErr

          const fams = (famsRaw ?? []) as FamilyRow[]
          const famMap = new Map<string, FamilyRow>()
          fams.forEach((f) => famMap.set(f.id, f))

          // Select active membership:
          const selectedMembership =
            (activeFamilyId &&
              memberships.find((m) => m.family_id === activeFamilyId)) ||
            memberships.find((m) => m.is_default) ||
            memberships[0]

          activeFamilyRow = famMap.get(selectedMembership.family_id) as FamilyRow
          isOwner = selectedMembership.role === 'owner'

          // Build userFamilies summary
          const familiesSummary: UserFamilySummary[] = memberships
            .map((m) => {
              const fam = famMap.get(m.family_id)
              if (!fam) return null
              return {
                id: fam.id,
                name: fam.name,
                role: m.role,
                is_default: m.is_default,
              }
            })
            .filter((f): f is UserFamilySummary => f !== null)

          setUserFamilies(familiesSummary)
        }

        const activeFamily: Family = {
          id: activeFamilyRow.id,
          name: activeFamilyRow.name,
          plan_tier: (activeFamilyRow.plan_tier as PlanTier) ?? 'free',
          billing_status: activeFamilyRow.billing_status ?? null,
          current_period_end:
            (activeFamilyRow.current_period_end as string | null) ?? null,
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

        // 4) Load family members & invites for this active family
        const { data: membersRaw, error: membersErr } = await supabase
          .from('family_members')
          .select('*')
          .eq('family_id', activeFamily.id)

        if (membersErr) throw membersErr

        const members = (membersRaw ?? []) as FamilyMemberRow[]

        const { data: invitesRaw, error: invitesErr } = await supabase
          .from('family_invites')
          .select('*')
          .eq('family_id', activeFamily.id)

        if (invitesErr) throw invitesErr

        const inviteRows = (invitesRaw ?? []) as FamilyInviteRow[]

        // Collect unique profile IDs
        const profileIdSet = new Set<string>()
        members.forEach((m) => profileIdSet.add(m.profile_id))
        inviteRows.forEach((i) => {
          if (i.created_by_profile_id) profileIdSet.add(i.created_by_profile_id)
        })

        const profilesById = new Map<string, ProfileRow>()

        if (profileIdSet.size > 0) {
          const { data: profilesRaw, error: profilesErr } = await supabase
            .from('profiles')
            .select('*')
            .in('id', Array.from(profileIdSet))

          if (profilesErr) throw profilesErr

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(profilesRaw ?? []).forEach((p: any) => {
            profilesById.set(p.id as string, {
              id: p.id as string,
              user_id: p.user_id as string,
              full_name: (p.full_name as string | null) ?? null,
              avatar_url: (p.avatar_url as string | null) ?? null,
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
            avatar_url: prof?.avatar_url ?? null,
            role: m.role,
            is_default: m.is_default,
          }
        })

        setFamilyMembers(membersDisplay)

        const invitesDisplay: FamilyInviteDisplay[] = inviteRows.map((inv) => {
          const inviterProfile = inv.created_by_profile_id
            ? profilesById.get(inv.created_by_profile_id)
            : undefined
          let invitedBy = inviterProfile?.full_name ?? 'Unknown'
          if (inv.created_by_profile_id === localProfileId) {
            invitedBy = 'You'
          }

          return {
            id: inv.id,
            email: inv.email,
            invited_by: invitedBy,
            created_at: inv.created_at,
            token: inv.token,
          }
        })

        setFamilyInvites(invitesDisplay)
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
  }, [session, activeFamilyId])

  return {
    loading,
    error,
    family,
    calendars,
    profileName,
    profileId,
    profileAvatarUrl,
    isFamilyOwner,
    familyMembers,
    familyInvites,
    userFamilies,
    setFamilyInvites,
    setProfileAvatarUrl,
    setUserFamilies,
  }
}
