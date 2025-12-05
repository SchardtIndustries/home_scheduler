// supabase/functions/accept-family-invite/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SB_URL = Deno.env.get('SB_URL')
const SB_ANON_KEY = Deno.env.get('SB_ANON_KEY')
const SB_SERVICE_ROLE_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY')

if (!SB_URL) throw new Error('Missing SB_URL')
if (!SB_ANON_KEY) throw new Error('Missing SB_ANON_KEY')
if (!SB_SERVICE_ROLE_KEY) throw new Error('Missing SB_SERVICE_ROLE_KEY')

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing Authorization header', {
        status: 401,
        headers: corsHeaders,
      })
    }

    const body = (await req.json().catch(() => null)) as { token?: string } | null
    if (!body?.token) {
      return new Response('Missing invite token', {
        status: 400,
        headers: corsHeaders,
      })
    }
    const token = body.token

    // Client-scoped Supabase (uses anon key + user's JWT)
    const supabaseUser = createClient(SB_URL, SB_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Admin Supabase (bypasses RLS, used for invite + membership changes)
    const supabaseAdmin = createClient(SB_URL, SB_SERVICE_ROLE_KEY)

    // 1) Get current user
    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !userData?.user) {
      console.error('getUser error', userError)
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders,
      })
    }
    const user = userData.user

    // 2) Ensure profile exists for this user
    const { data: existingProfile, error: profileErr } = await supabaseUser
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    let profileId: string
    if (profileErr) {
      console.error('profile select error', profileErr)
      return new Response('Could not load profile', {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (!existingProfile) {
      const { data: newProfile, error: insertProfileErr } = await supabaseUser
        .from('profiles')
        .insert({
          user_id: user.id,
          full_name: user.email ?? null,
        })
        .select('*')
        .single()

      if (insertProfileErr || !newProfile) {
        console.error('profile insert error', insertProfileErr)
        return new Response('Could not create profile', {
          status: 400,
          headers: corsHeaders,
        })
      }
      profileId = newProfile.id as string
    } else {
      profileId = existingProfile.id as string
    }

    // 3) Look up invite by token (admin client bypasses RLS)
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from('family_invites')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (inviteErr) {
      console.error('invite select error', inviteErr)
      return new Response('Could not load invite', {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (!invite) {
      return new Response('Invite not found', {
        status: 404,
        headers: corsHeaders,
      })
    }

    if (invite.accepted_at) {
      return new Response(
        JSON.stringify({
          status: 'already_used',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const familyId: string = invite.family_id

    // 4) Check if this profile is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('family_members')
      .select('id')
      .eq('family_id', familyId)
      .eq('profile_id', profileId)
      .maybeSingle()

    // If not a member yet, add them
    if (!existingMember) {
      // Determine if this should be their default family (first family)
      const { data: allMemberships, error: membershipsErr } = await supabaseAdmin
        .from('family_members')
        .select('id')
        .eq('profile_id', profileId)

      if (membershipsErr) {
        console.error('membershipsErr', membershipsErr)
      }

      const isFirstFamily = !membershipsErr && (allMemberships ?? []).length === 0

      const { error: addMemberErr } = await supabaseAdmin.from('family_members').insert({
        family_id: familyId,
        profile_id: profileId,
        role: invite.role ?? 'member',
        is_default: isFirstFamily,
      })

      if (addMemberErr) {
        console.error('addMemberErr', addMemberErr)
        return new Response('Could not add you to the family', {
          status: 400,
          headers: corsHeaders,
        })
      }
    }

    // 5) Mark invite as accepted
    const { error: updateInviteErr } = await supabaseAdmin
      .from('family_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    if (updateInviteErr) {
      console.error('updateInviteErr', updateInviteErr)
    }

    // 6) Load family and inviter for nice UI
    const { data: family, error: familyErr } = await supabaseAdmin
      .from('families')
      .select('id, name')
      .eq('id', familyId)
      .single()

    if (familyErr) {
      console.error('familyErr', familyErr)
    }

    let inviterName: string | null = null
    if (invite.created_by_profile_id) {
      const { data: inviterProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', invite.created_by_profile_id)
        .maybeSingle()

      inviterName = inviterProfile?.full_name ?? null
    }

    return new Response(
      JSON.stringify({
        status: existingMember ? 'already_member' : 'accepted',
        family_id: family?.id ?? familyId,
        family_name: family?.name ?? null,
        inviter_name: inviterName,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    console.error('Unexpected error in accept-family-invite', err)
    return new Response('Internal Server Error', {
      status: 500,
      headers: corsHeaders,
    })
  }
})
