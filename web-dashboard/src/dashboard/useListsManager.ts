// src/dashboard/useListsManager.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  RecurrenceType,
  TodoItemRow,
  TodoListRow,
} from './types'

interface UseListsManagerParams {
  familyId: string | null
  profileId: string | null
  isFamilyOwner: boolean
}

export function useListsManager({
  familyId,
  profileId,
  isFamilyOwner,
}: UseListsManagerParams) {
  // Lists / items state
  const [todoLists, setTodoLists] = useState<TodoListRow[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [listItems, setListItems] = useState<TodoItemRow[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)

  // New list form
  const [newListName, setNewListName] = useState('')
  const [newListType, setNewListType] = useState<'todo' | 'shopping'>('todo')
  const [newListBusy, setNewListBusy] = useState(false)

  // New item form
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemNotes, setNewItemNotes] = useState('')
  const [newItemDueDate, setNewItemDueDate] = useState('') // yyyy-mm-dd
  const [newItemRecurrence, setNewItemRecurrence] =
    useState<RecurrenceType>('once')
  const [newItemIntervalDays, setNewItemIntervalDays] = useState<number>(7)
  const [newItemAssignee, setNewItemAssignee] =
    useState<'all' | string>('all')
  const [newItemBusy, setNewItemBusy] = useState(false)
  const [newItemError, setNewItemError] = useState<string | null>(null)

  const loadItemsForList = async (listId: string) => {
    try {
      setListsLoading(true)
      setListsError(null)

      const { data, error } = await supabase
        .from('todo_items')
        .select('*')
        .eq('list_id', listId)
        .order('is_done', { ascending: true })
        .order('due_at', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error

      const items = (data ?? []) as TodoItemRow[]
      setListItems(items)
    } catch (err: unknown) {
      console.error('Load items error', err)
      let message = 'Could not load items for this list.'
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
      ) {
        message = (err as { message: string }).message
      }
      setListsError(message)
    } finally {
      setListsLoading(false)
    }
  }

  // Initial load / reload when family changes
  useEffect(() => {
    const loadInitialLists = async () => {
      if (!familyId) return

      try {
        setListsLoading(true)
        setListsError(null)

        const { data: listsRaw, error: listsErr } = await supabase
          .from('todo_lists')
          .select('*')
          .eq('family_id', familyId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })

        if (listsErr) throw listsErr

        let lists = (listsRaw ?? []) as TodoListRow[]

        if (lists.length === 0) {
          // Create a default "Family Tasks" list
          const { data: defaultListRaw, error: defaultListErr } =
            await supabase
              .from('todo_lists')
              .insert({
                family_id: familyId,
                name: 'Family Tasks',
                type: 'todo',
                sort_order: 0,
              })
              .select('*')
              .single()

          if (defaultListErr) throw defaultListErr
          lists = [defaultListRaw as TodoListRow]
        }

        setTodoLists(lists)
        const firstListId = lists[0]?.id ?? null
        setActiveListId(firstListId)

        if (firstListId) {
          await loadItemsForList(firstListId)
        } else {
          setListItems([])
        }
      } catch (err: unknown) {
        console.error('Initial lists load error', err)
        let message = 'Could not load lists for this family.'
        if (
          err &&
          typeof err === 'object' &&
          'message' in err &&
          typeof (err as { message: unknown }).message === 'string'
        ) {
          message = (err as { message: string }).message
        }
        setListsError(message)
      } finally {
        setListsLoading(false)
      }
    }

    void loadInitialLists()
  }, [familyId])

  const computeNextDueDate = (item: TodoItemRow): string | null => {
    const base = item.due_at ? new Date(item.due_at) : new Date()
    if (Number.isNaN(base.getTime())) return null

    const recurrence = item.recurrence ?? 'once'

    if (recurrence === 'once') return null

    if (recurrence === 'daily') {
      base.setDate(base.getDate() + 1)
    } else if (recurrence === 'weekly') {
      base.setDate(base.getDate() + 7)
    } else if (recurrence === 'every_n_days') {
      const n = item.recurrence_interval_days ?? 1
      base.setDate(base.getDate() + n)
    }

    return base.toISOString()
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyId || !newListName.trim()) return
    setNewListBusy(true)

    try {
      const { data, error } = await supabase
        .from('todo_lists')
        .insert({
          family_id: familyId,
          name: newListName.trim(),
          type: newListType,
          sort_order: todoLists.length,
        })
        .select('*')
        .single()

      if (error) throw error

      const created = data as TodoListRow
      const updated = [...todoLists, created].sort((a, b) => {
        const ao = a.sort_order ?? 0
        const bo = b.sort_order ?? 0
        return ao - bo
      })

      setTodoLists(updated)
      setNewListName('')
      setNewListType('todo')
      setActiveListId(created.id)
      await loadItemsForList(created.id)
    } catch (err: unknown) {
      console.error('Create list error', err)
    } finally {
      setNewListBusy(false)
    }
  }

  const handleSelectList = async (listId: string) => {
    setActiveListId(listId)
    await loadItemsForList(listId)
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeListId || !profileId) return
    if (!newItemTitle.trim()) {
      setNewItemError('Please enter a title.')
      return
    }
    setNewItemBusy(true)
    setNewItemError(null)

    try {
      let dueAt: string | null = null
      if (newItemDueDate) {
        const d = new Date(newItemDueDate)
        if (!Number.isNaN(d.getTime())) {
          dueAt = d.toISOString()
        }
      }

      const { data, error } = await supabase
        .from('todo_items')
        .insert({
          list_id: activeListId,
          title: newItemTitle.trim(),
          notes: newItemNotes.trim() || null,
          is_done: false,
          due_at: dueAt,
          assigned_to_profile_id:
            newItemAssignee === 'all' ? null : newItemAssignee,
          created_by: profileId,
          recurrence: newItemRecurrence,
          recurrence_interval_days:
            newItemRecurrence === 'every_n_days'
              ? newItemIntervalDays
              : null,
        })
        .select('*')
        .single()

      if (error) throw error

      const created = data as TodoItemRow
      setListItems((prev) => [...prev, created])
      setNewItemTitle('')
      setNewItemNotes('')
      setNewItemDueDate('')
      setNewItemRecurrence('once')
      setNewItemIntervalDays(7)
      setNewItemAssignee('all')
    } catch (err: unknown) {
      console.error('Add item error', err)
      let message = 'Could not add item.'
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
      ) {
        message = (err as { message: string }).message
      }
      setNewItemError(message)
    } finally {
      setNewItemBusy(false)
    }
  }

  const handleToggleItemComplete = async (item: TodoItemRow) => {
    if (!activeListId) return
    if (item.is_done) return

    try {
      const nowIso = new Date().toISOString()

      const { error: updateErr } = await supabase
        .from('todo_items')
        .update({
          is_done: true,
          completed_at: nowIso,
        })
        .eq('id', item.id)

      if (updateErr) throw updateErr

      const nextDue = computeNextDueDate(item)

      if (nextDue) {
        const { error: insertErr } = await supabase
          .from('todo_items')
          .insert({
            list_id: item.list_id,
            title: item.title,
            notes: item.notes,
            is_done: false,
            due_at: nextDue,
            assigned_to_profile_id: item.assigned_to_profile_id,
            created_by: item.created_by,
            recurrence: item.recurrence,
            recurrence_interval_days: item.recurrence_interval_days,
          })

        if (insertErr) throw insertErr
      }

      await loadItemsForList(activeListId)
    } catch (err: unknown) {
      console.error('Toggle complete error', err)
    }
  }

  const handleDeleteList = async (listId: string) => {
    if (!isFamilyOwner) return
    if (!window.confirm('Delete this list and all its items?')) return

    try {
      const { error } = await supabase
        .from('todo_lists')
        .delete()
        .eq('id', listId)

      if (error) throw error

      const remaining = todoLists.filter((l) => l.id !== listId)
      setTodoLists(remaining)

      if (activeListId === listId) {
        const next = remaining[0]?.id ?? null
        setActiveListId(next)
        if (next) {
          await loadItemsForList(next)
        } else {
          setListItems([])
        }
      }
    } catch (err: unknown) {
      console.error('Delete list error', err)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!isFamilyOwner) return
    if (!activeListId) return
    if (!window.confirm('Delete this item?')) return

    try {
      const { error } = await supabase
        .from('todo_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setListItems((prev) => prev.filter((i) => i.id !== itemId))
    } catch (err: unknown) {
      console.error('Delete item error', err)
    }
  }

  return {
    todoLists,
    activeListId,
    listItems,
    listsLoading,
    listsError,

    newListName,
    newListType,
    newListBusy,
    newItemTitle,
    newItemNotes,
    newItemDueDate,
    newItemRecurrence,
    newItemIntervalDays,
    newItemAssignee,
    newItemBusy,
    newItemError,

    setNewListName,
    setNewListType,
    setNewItemTitle,
    setNewItemNotes,
    setNewItemDueDate,
    setNewItemRecurrence,
    setNewItemIntervalDays,
    setNewItemAssignee,

    handleCreateList,
    handleSelectList,
    handleAddItem,
    handleToggleItemComplete,
    handleDeleteList,
    handleDeleteItem,
  }
}
