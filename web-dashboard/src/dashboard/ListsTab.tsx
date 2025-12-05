// src/dashboard/ListsTab.tsx
import React from 'react'
import type {
  FamilyMemberDisplay,
  RecurrenceType,
  TodoItemRow,
  TodoListRow,
} from './types'

interface ListsTabProps {
  isFamilyOwner: boolean
  todoLists: TodoListRow[]
  activeListId: string | null
  onSelectList: (id: string) => void
  onDeleteList: (id: string) => void

  newListName: string
  newListType: 'todo' | 'shopping'
  newListBusy: boolean
  onChangeNewListName: (value: string) => void
  onChangeNewListType: (value: 'todo' | 'shopping') => void
  onCreateList: (e: React.FormEvent) => void

  listItems: TodoItemRow[]
  listsLoading: boolean
  listsError: string | null

  newItemTitle: string
  newItemNotes: string
  newItemDueDate: string
  newItemRecurrence: RecurrenceType
  newItemIntervalDays: number
  newItemAssignee: 'all' | string
  newItemBusy: boolean
  newItemError: string | null
  onChangeNewItemTitle: (value: string) => void
  onChangeNewItemNotes: (value: string) => void
  onChangeNewItemDueDate: (value: string) => void
  onChangeNewItemRecurrence: (value: RecurrenceType) => void
  onChangeNewItemIntervalDays: (value: number) => void
  onChangeNewItemAssignee: (value: 'all' | string) => void
  onAddItem: (e: React.FormEvent) => void

  onToggleItemComplete: (item: TodoItemRow) => void
  onDeleteItem: (id: string) => void

  familyMembers: FamilyMemberDisplay[]
  formatShortDate: (iso: string) => string
}

export const ListsTab: React.FC<ListsTabProps> = ({
  isFamilyOwner,
  todoLists,
  activeListId,
  onSelectList,
  onDeleteList,
  newListName,
  newListType,
  newListBusy,
  onChangeNewListName,
  onChangeNewListType,
  onCreateList,
  listItems,
  listsLoading,
  listsError,
  newItemTitle,
  newItemNotes,
  newItemDueDate,
  newItemRecurrence,
  newItemIntervalDays,
  newItemAssignee,
  newItemBusy,
  newItemError,
  onChangeNewItemTitle,
  onChangeNewItemNotes,
  onChangeNewItemDueDate,
  onChangeNewItemRecurrence,
  onChangeNewItemIntervalDays,
  onChangeNewItemAssignee,
  onAddItem,
  onToggleItemComplete,
  onDeleteItem,
  familyMembers,
  formatShortDate,
}) => {
  const activeList = todoLists.find((l) => l.id === activeListId) ?? null

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Left column: lists */}
      <aside
        style={{
          width: 260,
          borderRight: '1px solid #333',
          paddingRight: 16,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Lists</h2>
        <p style={{ color: '#bbb', fontSize: 14, marginBottom: 12 }}>
          Create shared todos and shopping lists for your family.
        </p>

        <div style={{ marginBottom: 16 }}>
          {todoLists.map((list) => {
            const isActive = list.id === activeListId
            return (
              <div
                key={list.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectList(list.id)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: isActive ? '1px solid #3b82f6' : '1px solid #333',
                    backgroundColor: isActive ? '#1f2937' : '#111',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  {list.name}{' '}
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>({list.type})</span>
                </button>

                {isFamilyOwner && (
                  <button
                    type="button"
                    onClick={() => onDeleteList(list.id)}
                    style={{
                      marginLeft: 6,
                      borderRadius: 4,
                      border: '1px solid #444',
                      backgroundColor: '#1a1a1a',
                      color: '#f87171',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      fontSize: 12,
                    }}
                    title="Delete list"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}

          {todoLists.length === 0 && (
            <p style={{ color: '#bbb', fontSize: 14 }}>No lists yet.</p>
          )}
        </div>

        {/* New list form */}
        <form onSubmit={onCreateList}>
          <h3 style={{ fontSize: 14, marginBottom: 6 }}>New list</h3>
          <div style={{ marginBottom: 6 }}>
            <input
              type="text"
              placeholder="List name"
              value={newListName}
              onChange={(e) => onChangeNewListName(e.target.value)}
              style={{
                width: '100%',
                padding: 6,
                borderRadius: 4,
                border: '1px solid #444',
                backgroundColor: '#111',
                color: '#fff',
                fontSize: 13,
              }}
            />
          </div>
          <div style={{ marginBottom: 6, fontSize: 13 }}>
            <label style={{ marginRight: 8 }}>
              <input
                type="radio"
                name="listType"
                value="todo"
                checked={newListType === 'todo'}
                onChange={() => onChangeNewListType('todo')}
                style={{ marginRight: 4 }}
              />
              Todo
            </label>
            <label>
              <input
                type="radio"
                name="listType"
                value="shopping"
                checked={newListType === 'shopping'}
                onChange={() => onChangeNewListType('shopping')}
                style={{ marginRight: 4 }}
              />
              Shopping
            </label>
          </div>
          <button
            type="submit"
            disabled={newListBusy || !newListName.trim()}
            style={{
              padding: '6px 10px',
              borderRadius: 4,
              border: '1px solid #3b82f6',
              backgroundColor: '#2563eb',
              color: '#fff',
              cursor: newListBusy ? 'default' : 'pointer',
              fontSize: 13,
            }}
          >
            {newListBusy ? 'Creating…' : 'Create list'}
          </button>
        </form>
      </aside>

      {/* Right column: items */}
      <section style={{ flex: 1 }}>
        {activeList ? (
          <>
            <h2 style={{ marginTop: 0 }}>{activeList.name}</h2>
            <p style={{ color: '#bbb', fontSize: 14, marginBottom: 12 }}>
              {activeList.type === 'shopping'
                ? 'One-time shopping items that disappear when completed.'
                : 'Tasks that can optionally repeat daily, weekly, or every N days.'}
            </p>

            {/* New item form */}
            <form
              onSubmit={onAddItem}
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                border: '1px solid #333',
                backgroundColor: '#181818',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>Add item</h3>

              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="What needs done?"
                  value={newItemTitle}
                  onChange={(e) => onChangeNewItemTitle(e.target.value)}
                  style={{
                    flex: 2,
                    padding: 6,
                    borderRadius: 4,
                    border: '1px solid #444',
                    backgroundColor: '#111',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
                <input
                  type="date"
                  value={newItemDueDate}
                  onChange={(e) => onChangeNewItemDueDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: 6,
                    borderRadius: 4,
                    border: '1px solid #444',
                    backgroundColor: '#111',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <textarea
                  placeholder="Notes (optional)"
                  value={newItemNotes}
                  onChange={(e) => onChangeNewItemNotes(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: 6,
                    borderRadius: 4,
                    border: '1px solid #444',
                    backgroundColor: '#111',
                    color: '#fff',
                    fontSize: 13,
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 8,
                  fontSize: 13,
                }}
              >
                {/* Recurrence */}
                <div>
                  <div style={{ marginBottom: 4, fontWeight: 600 }}>Recurrence</div>
                  <select
                    value={newItemRecurrence}
                    onChange={(e) =>
                      onChangeNewItemRecurrence(e.target.value as RecurrenceType)
                    }
                    style={{
                      padding: 6,
                      borderRadius: 4,
                      border: '1px solid #444',
                      backgroundColor: '#111',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  >
                    <option value="once">One time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="every_n_days">Every N days</option>
                  </select>
                  {newItemRecurrence === 'every_n_days' && (
                    <div style={{ marginTop: 4 }}>
                      <input
                        type="number"
                        min={1}
                        value={newItemIntervalDays}
                        onChange={(e) =>
                          onChangeNewItemIntervalDays(Number(e.target.value) || 1)
                        }
                        style={{
                          width: 70,
                          padding: 4,
                          borderRadius: 4,
                          border: '1px solid #444',
                          backgroundColor: '#111',
                          color: '#fff',
                          fontSize: 13,
                        }}
                      />{' '}
                      <span style={{ color: '#9ca3af' }}>days</span>
                    </div>
                  )}
                </div>

                {/* Assignee */}
                <div>
                  <div style={{ marginBottom: 4, fontWeight: 600 }}>Assign to</div>
                  <select
                    value={newItemAssignee}
                    onChange={(e) =>
                      onChangeNewItemAssignee(
                        e.target.value === 'all' ? 'all' : e.target.value,
                      )
                    }
                    style={{
                      padding: 6,
                      borderRadius: 4,
                      border: '1px solid #444',
                      backgroundColor: '#111',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  >
                    <option value="all">Everyone</option>
                    {familyMembers.map((m) => (
                      <option key={m.profile_id} value={m.profile_id}>
                        {m.full_name || '(Unnamed)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {newItemError && (
                <div style={{ color: '#f87171', fontSize: 13, marginBottom: 6 }}>
                  {newItemError}
                </div>
              )}

              <button
                type="submit"
                disabled={newItemBusy}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  border: '1px solid #3b82f6',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  cursor: newItemBusy ? 'default' : 'pointer',
                  fontSize: 13,
                }}
              >
                {newItemBusy ? 'Adding…' : 'Add item'}
              </button>
            </form>

            {/* Items list */}
            {listsLoading ? (
              <p>Loading items…</p>
            ) : listsError ? (
              <p style={{ color: '#f87171' }}>{listsError}</p>
            ) : (
              <>
                <h3 style={{ fontSize: 15, marginBottom: 8 }}>Items</h3>
                <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                  {listItems
                    .filter((i) => !i.is_done)
                    .map((item) => {
                      const assignee =
                        item.assigned_to_profile_id &&
                        familyMembers.find(
                          (m) => m.profile_id === item.assigned_to_profile_id,
                        )

                      const recurrenceLabel =
                        item.recurrence === 'daily'
                          ? 'Daily'
                          : item.recurrence === 'weekly'
                          ? 'Weekly'
                          : item.recurrence === 'every_n_days'
                          ? `Every ${item.recurrence_interval_days ?? 1} days`
                          : 'One time'

                      return (
                        <li
                          key={item.id}
                          style={{
                            marginBottom: 8,
                            padding: 8,
                            borderRadius: 6,
                            border: '1px solid #333',
                            backgroundColor: '#181818',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          <input
                            type="checkbox"
                            onChange={() => onToggleItemComplete(item)}
                            style={{ marginTop: 4 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{item.title}</div>
                            {item.notes && (
                              <div
                                style={{
                                  fontSize: 13,
                                  color: '#d1d5db',
                                  marginTop: 2,
                                }}
                              >
                                {item.notes}
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: 12,
                                color: '#9ca3af',
                                marginTop: 4,
                              }}
                            >
                              {item.due_at && (
                                <>
                                  <span>Due: {formatShortDate(item.due_at)}</span>
                                  {' · '}
                                </>
                              )}
                              <span>{recurrenceLabel}</span>
                              {assignee && (
                                <>
                                  {' · '}
                                  <span>
                                    Assigned to: {assignee.full_name || 'Member'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {isFamilyOwner && (
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              style={{
                                borderRadius: 4,
                                border: '1px solid #444',
                                backgroundColor: '#1a1a1a',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: '4px 6px',
                                fontSize: 12,
                                marginLeft: 4,
                              }}
                              title="Delete item"
                            >
                              ✕
                            </button>
                          )}
                        </li>
                      )
                    })}

                  {listItems.filter((i) => !i.is_done).length === 0 && (
                    <li style={{ color: '#9ca3af', fontSize: 14 }}>
                      No active items. 🎉
                    </li>
                  )}
                </ul>
              </>
            )}
          </>
        ) : (
          <p style={{ color: '#bbb' }}>Select or create a list on the left.</p>
        )}
      </section>
    </div>
  )
}
