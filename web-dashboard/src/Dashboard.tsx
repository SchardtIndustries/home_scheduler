// src/Dashboard.tsx
import { useState } from 'react'
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
  // Family bootstrap hook (profiles, family, calendars, members, invites)
  const {
    loading,
    error,
    family,
    calendars,
    profileName,
    profileId,
    isFamilyOwner,
    familyMembers,
    familyInvites,
    setFamilyInvites,
  } = useFamilyBootstrap(session)

  const [activeTab, setActiveTab] = useState<DashboardTab>('family')
  const [profileEmail] = useState<string | null>(session.user.email ?? null)

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
        return <ProfileTab profileName={profileName} profileEmail={profileEmail} />
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
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        initials={initials}
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
