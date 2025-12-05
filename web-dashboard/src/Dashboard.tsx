// src/Dashboard.tsx
import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import './dashboard.css'
import { PLAN_METADATA } from './billing/plans'

import type { DashboardTab, Family } from './dashboard/types'
import { FamilyTab } from './dashboard/FamilyTab'
import { ListsTab } from './dashboard/ListsTab'
import { DisplaysTab } from './dashboard/DisplaysTab'
import { ProfileTab } from './dashboard/ProfileTab'
import { PlanModal } from './dashboard/PlanModal'
import { useListsManager } from './dashboard/useListsManager'
import { useFamilyBootstrap } from './dashboard/useFamilyBootstrap'
import { useBilling } from './dashboard/useBilling'
import { useFamilyInvites } from './dashboard/useFamilyInvites'
import {
  formatNextBilling,
  formatShortDateTime,
  formatShortDate,
} from './dashboard/dateUtils'
import { DashboardHeader } from './dashboard/DashboardHeader'

export function Dashboard({ session }: { session: Session }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('family')
  const [profileEmail] = useState<string | null>(session.user.email ?? null)

  // Which family is currently selected in the UI
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null)

  // Family bootstrap hook (profiles, family, calendars, members, invites, avatar, families list)
  const {
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
  } = useFamilyBootstrap(session, activeFamilyId)

  // Once we know the initial family, set activeFamilyId (first load only)
  useEffect(() => {
    if (family && !activeFamilyId) {
      setActiveFamilyId(family.id)
    }
  }, [family, activeFamilyId])

  // Billing hook
  const {
    showPlanModal,
    selectedPlan,
    billingInterval,
    billingBusy,
    billingError,
    setSelectedPlan,
    setBillingInterval,
    handleOpenPlanModal,
    handleClosePlanModal,
    handlePlanSubmit,
  } = useBilling(family as Family | null)

  // Invites hook
  const {
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
  } = useFamilyInvites({
    familyId: family?.id ?? null,
    profileId,
    familyInvites,
    setFamilyInvites,
  })

  // Lists hook
  const lists = useListsManager({
    familyId: family?.id ?? null,
    profileId,
    isFamilyOwner,
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const displayName = profileName || profileEmail || 'User'
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)

  // Upload avatar (cropped File) to Supabase storage and update profiles.avatar_url.
  const handleUploadAvatar = async (file: File) => {
    if (!profileId) return

    const AVATAR_BUCKET = 'avatars'

    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const filePath = `${profileId}/avatar.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, { upsert: true })

      if (uploadErr) throw uploadErr

      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)

      // Cache-buster so browser sees the new cropped image immediately
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profileId)

      if (updateErr) throw updateErr

      setProfileAvatarUrl(publicUrl)
    } catch (err) {
      console.error('Error uploading avatar', err)
      throw err
    }
  }

  // Clear avatar in DB and local state
  const handleClearAvatar = async () => {
    if (!profileId) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profileId)

      if (error) throw error
      setProfileAvatarUrl(null)
    } catch (err) {
      console.error('Error clearing avatar', err)
      throw err
    }
  }

  // Placeholder for creating a new family
  const handleCreateFamily = async () => {
    alert('Create new family flow not implemented yet.')
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading your family…</div>
  }

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <p style={{ color: 'red', marginBottom: 16 }}>{error}</p>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
          Check the browser console for more details (we log the full error there).
        </p>
        <button onClick={handleLogout}>Log out</button>
      </div>
    )
  }

  if (!family) {
    return (
      <div style={{ padding: 24 }}>
        <p>Something went wrong: no family found.</p>
        <button onClick={handleLogout}>Log out</button>
      </div>
    )
  }

  const currentPlanMeta = PLAN_METADATA[family.plan_tier as keyof typeof PLAN_METADATA]
  const planLabel = currentPlanMeta.label
  const planDescription = currentPlanMeta.description
  const billingStatusText =
    family.plan_tier === 'ginger_magic'
      ? 'Internal (no billing)'
      : family.billing_status ?? '—'
  const showNextBilling =
    family.plan_tier !== 'free' && family.plan_tier !== 'ginger_magic'
  const nextBillingText = formatNextBilling(family.current_period_end)

  const renderContent = () => {
    switch (activeTab) {
      case 'family':
        return (
          <FamilyTab
            isFamilyOwner={isFamilyOwner}
            planLabel={planLabel}
            planDescription={planDescription}
            billingStatusText={billingStatusText}
            showNextBilling={showNextBilling}
            nextBillingText={nextBillingText}
            onOpenPlanModal={handleOpenPlanModal}
            familyMembers={familyMembers}
            profileId={profileId}
            inviteEmail={inviteEmail}
            inviteBusy={inviteBusy}
            inviteError={inviteError}
            inviteLink={inviteLink}
            onInviteEmailChange={setInviteEmail}
            onGenerateInvite={handleGenerateInvite}
            familyInvites={familyInvites}
            onCopyInviteLink={handleCopyInviteLink}
            onRevokeInvite={handleRevokeInvite}
            copiedInviteId={copiedInviteId}
            inviteRevokeBusyId={inviteRevokeBusyId}
            calendars={calendars}
            formatShortDateTime={formatShortDateTime}
          />
        )
      case 'displays':
        return <DisplaysTab />
      case 'lists':
        return (
          <ListsTab
            isFamilyOwner={isFamilyOwner}
            todoLists={lists.todoLists}
            activeListId={lists.activeListId}
            onSelectList={lists.handleSelectList}
            onDeleteList={lists.handleDeleteList}
            newListName={lists.newListName}
            newListType={lists.newListType}
            newListBusy={lists.newListBusy}
            onChangeNewListName={lists.setNewListName}
            onChangeNewListType={lists.setNewListType}
            onCreateList={lists.handleCreateList}
            listItems={lists.listItems}
            listsLoading={lists.listsLoading}
            listsError={lists.listsError}
            newItemTitle={lists.newItemTitle}
            newItemNotes={lists.newItemNotes}
            newItemDueDate={lists.newItemDueDate}
            newItemRecurrence={lists.newItemRecurrence}
            newItemIntervalDays={lists.newItemIntervalDays}
            newItemAssignee={lists.newItemAssignee}
            newItemBusy={lists.newItemBusy}
            newItemError={lists.newItemError}
            onChangeNewItemTitle={lists.setNewItemTitle}
            onChangeNewItemNotes={lists.setNewItemNotes}
            onChangeNewItemDueDate={lists.setNewItemDueDate}
            onChangeNewItemRecurrence={lists.setNewItemRecurrence}
            onChangeNewItemIntervalDays={lists.setNewItemIntervalDays}
            onChangeNewItemAssignee={lists.setNewItemAssignee}
            onAddItem={lists.handleAddItem}
            onToggleItemComplete={lists.handleToggleItemComplete}
            onDeleteItem={lists.handleDeleteItem}
            familyMembers={familyMembers}
            formatShortDate={formatShortDate}
          />
        )
      case 'profile':
        return (
          <ProfileTab
            profileName={profileName}
            profileEmail={profileEmail}
            profileAvatarUrl={profileAvatarUrl}
            initials={initials}
            families={userFamilies}
            onUploadAvatar={handleUploadAvatar}
            onClearAvatar={handleClearAvatar}
            onCreateFamily={handleCreateFamily}
          />
        )
      default:
        return null
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        backgroundColor: '#121212',
        color: '#fff',
      }}
    >
      <DashboardHeader
        familyName={family.name}
        families={userFamilies}
        currentFamilyId={family.id}
        onSelectFamily={(id) => setActiveFamilyId(id)}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        initials={initials}
        profileImageUrl={profileAvatarUrl}
        onLogout={handleLogout}
      />

      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 48px',
          width: '100%',
        }}
      >
        {renderContent()}
      </main>

      <PlanModal
        isOpen={showPlanModal}
        selectedPlan={selectedPlan}
        billingInterval={billingInterval}
        billingBusy={billingBusy}
        billingError={billingError}
        onChangePlan={setSelectedPlan}
        onChangeInterval={setBillingInterval}
        onClose={handleClosePlanModal}
        onSubmit={handlePlanSubmit}
      />
    </div>
  )
}
