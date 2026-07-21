'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter,
} from '@heroui/react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { notifyDataChanged } from '@/lib/dataSignal'
import type { EventTypeDoc, MemberRole } from '@/lib/types'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const ROLES: { key: 'singer' | 'soloist' | 'regent' | 'reader'; label: string }[] = [
  { key: 'singer',  label: 'Певчий'  },
  { key: 'soloist', label: 'Солист'  },
  { key: 'regent',  label: 'Регент'  },
  { key: 'reader',  label: 'Чтец'    },
]

function IconClipboardRemove() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.26279 3.25871C7.38317 2.12953 8.33887 1.25 9.5 1.25H14.5C15.6611 1.25 16.6168 2.12953 16.7372 3.25871C17.5004 3.27425 18.1602 3.31372 18.7236 3.41721C19.4816 3.55644 20.1267 3.82168 20.6517 4.34661C21.2536 4.94853 21.5125 5.7064 21.6335 6.60651C21.75 7.47348 21.75 8.5758 21.75 9.94339V16.0531C21.75 17.4207 21.75 18.523 21.6335 19.39C21.5125 20.2901 21.2536 21.048 20.6517 21.6499C20.0497 22.2518 19.2919 22.5107 18.3918 22.6317C17.5248 22.7483 16.4225 22.7483 15.0549 22.7483H8.94513C7.57754 22.7483 6.47522 22.7483 5.60825 22.6317C4.70814 22.5107 3.95027 22.2518 3.34835 21.6499C2.74643 21.048 2.48754 20.2901 2.36652 19.39C2.24996 18.523 2.24998 17.4207 2.25 16.0531V9.94339C2.24998 8.5758 2.24996 7.47348 2.36652 6.60651C2.48754 5.7064 2.74643 4.94853 3.34835 4.34661C3.87328 3.82168 4.51835 3.55644 5.27635 3.41721C5.83977 3.31372 6.49963 3.27425 7.26279 3.25871ZM7.26476 4.75913C6.54668 4.77447 5.99332 4.81061 5.54735 4.89253C4.98054 4.99664 4.65246 5.16382 4.40901 5.40727C4.13225 5.68403 3.9518 6.07261 3.85315 6.80638C3.75159 7.56173 3.75 8.56285 3.75 9.99826V15.9983C3.75 17.4337 3.75159 18.4348 3.85315 19.1901C3.9518 19.9239 4.13225 20.3125 4.40901 20.5893C4.68577 20.866 5.07435 21.0465 5.80812 21.1451C6.56347 21.2467 7.56458 21.2483 9 21.2483H15C16.4354 21.2483 17.4365 21.2467 18.1919 21.1451C18.9257 21.0465 19.3142 20.866 19.591 20.5893C19.8678 20.3125 20.0482 19.9239 20.1469 19.1901C20.2484 18.4348 20.25 17.4337 20.25 15.9983V9.99826C20.25 8.56285 20.2484 7.56173 20.1469 6.80638C20.0482 6.07261 19.8678 5.68403 19.591 5.40727C19.3475 5.16382 19.0195 4.99664 18.4527 4.89253C18.0067 4.81061 17.4533 4.77447 16.7352 4.75913C16.6067 5.87972 15.655 6.75 14.5 6.75H9.5C8.345 6.75 7.39326 5.87972 7.26476 4.75913ZM9.5 2.75C9.08579 2.75 8.75 3.08579 8.75 3.5V4.5C8.75 4.91421 9.08579 5.25 9.5 5.25H14.5C14.9142 5.25 15.25 4.91421 15.25 4.5V3.5C15.25 3.08579 14.9142 2.75 14.5 2.75H9.5ZM8.96967 11.5303C8.67678 11.2375 8.67678 10.7626 8.96967 10.4697C9.26256 10.1768 9.73744 10.1768 10.0303 10.4697L12 12.4394L13.9697 10.4697C14.2626 10.1768 14.7374 10.1768 15.0303 10.4697C15.3232 10.7626 15.3232 11.2375 15.0303 11.5304L13.0607 13.5L15.0303 15.4697C15.3232 15.7626 15.3232 16.2374 15.0303 16.5303C14.7374 16.8232 14.2625 16.8232 13.9697 16.5303L12 14.5607L10.0304 16.5303C9.73746 16.8232 9.26259 16.8232 8.96969 16.5304C8.6768 16.2375 8.6768 15.7626 8.96969 15.4697L10.9394 13.5L8.96967 11.5303Z" fill="currentColor"/>
    </svg>
  )
}

function IconPen() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M14.7566 2.62145C16.5852 0.792851 19.55 0.792851 21.3786 2.62145C23.2072 4.45005 23.2072 7.41479 21.3786 9.24339L11.8933 18.7287C11.3514 19.2706 11.0323 19.5897 10.6774 19.8665C10.2592 20.1927 9.80655 20.4725 9.32766 20.7007C8.92136 20.8943 8.49334 21.037 7.76623 21.2793L4.43511 22.3897L3.63303 22.6571C2.98247 22.8739 2.26522 22.7046 1.78032 22.2197C1.29542 21.7348 1.1261 21.0175 1.34296 20.367L2.72068 16.2338C2.96303 15.5067 3.10568 15.0787 3.29932 14.6724C3.52755 14.1935 3.80727 13.7409 4.13354 13.3226C4.41035 12.9677 4.72939 12.6487 5.27137 12.1067L14.7566 2.62145ZM15.1554 4.34404C15.1896 4.519 15.2474 4.75684 15.3438 5.03487C15.561 5.66083 15.9712 6.48288 16.7442 7.25585C17.5171 8.02881 18.3392 8.43903 18.9651 8.6562C19.2432 8.75266 19.481 8.81046 19.656 8.84466L20.3179 8.18272C21.5607 6.93991 21.5607 4.92492 20.3179 3.68211C19.0751 2.4393 17.0601 2.4393 15.8173 3.68211L15.1554 4.34404Z" fill="currentColor" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2.75C11.0215 2.75 10.1871 3.37503 9.87787 4.24993C9.73983 4.64047 9.31134 4.84517 8.9208 4.70713C8.53026 4.56909 8.32557 4.1406 8.46361 3.75007C8.97804 2.29459 10.3661 1.25 12 1.25C13.634 1.25 15.022 2.29459 15.5365 3.75007C15.6745 4.1406 15.4698 4.56909 15.0793 4.70713C14.6887 4.84517 14.2602 4.64047 14.1222 4.24993C13.813 3.37503 12.9785 2.75 12 2.75Z" fill="currentColor" />
      <path d="M2.75 6C2.75 5.58579 3.08579 5.25 3.5 5.25H20.5001C20.9143 5.25 21.2501 5.58579 21.2501 6C21.2501 6.41421 20.9143 6.75 20.5001 6.75H3.5C3.08579 6.75 2.75 6.41421 2.75 6Z" fill="currentColor" />
      <path d="M5.91508 8.45011C5.88753 8.03681 5.53015 7.72411 5.11686 7.75166C4.70356 7.77921 4.39085 8.13659 4.41841 8.54989L4.88186 15.5016C4.96735 16.7844 5.03641 17.8205 5.19838 18.6336C5.36678 19.4789 5.6532 20.185 6.2448 20.7384C6.83639 21.2919 7.55994 21.5307 8.41459 21.6425C9.23663 21.75 10.2751 21.75 11.5607 21.75H12.4395C13.7251 21.75 14.7635 21.75 15.5856 21.6425C16.4402 21.5307 17.1638 21.2919 17.7554 20.7384C18.347 20.185 18.6334 19.4789 18.8018 18.6336C18.9637 17.8205 19.0328 16.7844 19.1183 15.5016L19.5818 8.54989C19.6093 8.13659 19.2966 7.77921 18.8833 7.75166C18.47 7.72411 18.1126 8.03681 18.0851 8.45011L17.6251 15.3492C17.5353 16.6971 17.4712 17.6349 17.3307 18.3405C17.1943 19.025 17.004 19.3873 16.7306 19.6431C16.4572 19.8988 16.083 20.0647 15.391 20.1552C14.6776 20.2485 13.7376 20.25 12.3868 20.25H11.6134C10.2626 20.25 9.32255 20.2485 8.60915 20.1552C7.91715 20.0647 7.54299 19.8988 7.26957 19.6431C6.99616 19.3873 6.80583 19.025 6.66948 18.3405C6.52891 17.6349 6.46488 16.6971 6.37503 15.3492L5.91508 8.45011Z" fill="currentColor" />
    </svg>
  )
}

function IconGrip() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="7" r="1.5" fill="currentColor"/>
      <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="9" cy="17" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="17" r="1.5" fill="currentColor"/>
    </svg>
  )
}

interface FormState {
  name: string
  singer: string
  soloist: string
  regent: string
  reader: string
  disabledRoles: MemberRole[]
}

function emptyForm(): FormState {
  return { name: '', singer: '0', soloist: '0', regent: '0', reader: '0', disabledRoles: [] }
}

function typeToForm(t: EventTypeDoc): FormState {
  return {
    name: t.name,
    singer: String(t.prices.singer),
    soloist: String(t.prices.soloist),
    regent: String(t.prices.regent),
    reader: String(t.prices.reader ?? 0),
    disabledRoles: t.disabledRoles ?? [],
  }
}

function toggleRole(roles: MemberRole[], role: MemberRole): MemberRole[] {
  return roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role]
}

function SortableRow({
  t, isLast, onEdit, onDelete,
}: {
  t: EventTypeDoc
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t._id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
        position: 'relative',
      }}
      className={`flex items-center gap-2 px-3 py-3 bg-white ${!isLast ? 'border-b border-warm-100' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-warm-300 hover:text-warm-400 cursor-grab active:cursor-grabbing touch-none shrink-0"
        tabIndex={-1}
        aria-label="Перетащить"
      >
        <IconGrip />
      </button>
      <span className="flex-1 text-sm font-slab font-semibold text-warm-900">{t.name}</span>
      <span className="text-xs text-warm-400 tabular-nums mr-1">{t.prices.singer.toLocaleString('ru-RU')} ₽</span>
      <button onClick={onEdit} className="w-7 h-7 rounded-lg bg-warm-100 text-warm-600 flex items-center justify-center active:bg-warm-200 shrink-0"><IconPen /></button>
      <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center active:bg-red-100 shrink-0"><IconTrash /></button>
    </div>
  )
}

export function EventTypesDrawer({ isOpen, onClose }: Props) {
  const [types, setTypes] = useState<EventTypeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState<EventTypeDoc | null>(null)
  const [deleting, setDeleting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/event-types')
    if (res.ok) setTypes(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

  function openNew() { setEditingId(null); setForm(emptyForm()); setShowForm(true) }
  function openEdit(t: EventTypeDoc) { setEditingId(t._id); setForm(typeToForm(t)); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditingId(null) }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = types.findIndex((t) => t._id === active.id)
    const newIdx = types.findIndex((t) => t._id === over.id)
    const reordered = arrayMove(types, oldIdx, newIdx)
    setTypes(reordered)
    await fetch('/api/event-types/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered.map((t) => t._id) }),
    })
    notifyDataChanged()
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        prices: {
          singer:  parseInt(form.singer)  || 0,
          soloist: parseInt(form.soloist) || 0,
          regent:  parseInt(form.regent)  || 0,
          reader:  parseInt(form.reader)  || 0,
        },
        disabledRoles: form.disabledRoles,
      }
      const res = editingId
        ? await fetch(`/api/event-types/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/event-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) return
      closeForm()
      await load()
      notifyDataChanged()
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/event-types/${deleteTarget._id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      await load()
      notifyDataChanged()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onOpenChange={(open) => { if (!open) { closeForm(); onClose() } }}
        placement="bottom"
        classNames={{
          base: 'bg-white rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.15)]',
          header: 'bg-white border-b border-warm-200 px-4 pt-2 pb-3',
          body: 'px-0 py-0',
          footer: 'bg-white border-t border-warm-200 px-4 py-3',
          closeButton: 'hidden',
        }}
      >
        <DrawerContent>
          {() => (
            <>
              <DrawerHeader className="flex-col gap-0">
                <div className="flex justify-center pt-1 pb-2 w-full">
                  <div className="w-10 h-1 rounded-full bg-warm-300" />
                </div>
                {showForm ? (
                  <div className="flex items-center gap-2 w-full">
                    <button onClick={closeForm} className="w-8 h-8 rounded-xl bg-warm-100 text-warm-600 flex items-center justify-center shrink-0 active:bg-warm-200">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M15.5695 4.43057C15.8841 4.70014 15.9205 5.17361 15.6509 5.48811L10.0693 12L15.6509 18.5119C15.9205 18.8264 15.8841 19.2999 15.5695 19.5695C15.255 19.839 14.7816 19.8026 14.5120 19.4881L8.51192 12.4881C8.27128 12.2072 8.27128 11.7928 8.51192 11.5119L14.5120 4.51192C14.7816 4.19743 15.255 4.161 15.5695 4.43057Z" fill="currentColor" />
                      </svg>
                    </button>
                    <span className="text-base font-bold text-warm-900">{editingId ? 'Редактировать тип' : 'Новый тип выхода'}</span>
                  </div>
                ) : (
                  <span className="text-base font-bold text-warm-900">Типы выходов</span>
                )}
              </DrawerHeader>

              <DrawerBody>
                {showForm ? (
                  <div className="flex flex-col gap-4 px-4 py-4">
                    <div>
                      <label className="block text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-1.5">Название</label>
                      <input className="warm-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Например: Венчание" />
                    </div>
                    <div>
                      <label className="block text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-2">Цены по умолчанию, ₽</label>
                      <div className="warm-card overflow-hidden">
                        {ROLES.map((r, i) => {
                          const disabled = form.disabledRoles.includes(r.key as MemberRole)
                          return (
                            <div key={r.key} className={`flex items-center gap-3 px-3 py-2.5 ${i < ROLES.length - 1 ? 'border-b border-warm-100' : ''} ${disabled ? 'opacity-40' : ''}`}>
                              <button type="button" onClick={() => setForm((f) => ({ ...f, disabledRoles: toggleRole(f.disabledRoles, r.key as MemberRole) }))}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${disabled ? 'bg-red-100 text-red-500' : 'bg-warm-100 text-warm-400 active:bg-warm-200'}`}>
                                <IconClipboardRemove />
                              </button>
                              <span className={`flex-1 text-sm font-slab font-medium ${disabled ? 'text-warm-400 line-through' : 'text-warm-800'}`}>{r.label}</span>
                              <input type="number" value={form[r.key]} onChange={(e) => setForm((f) => ({ ...f, [r.key]: e.target.value }))} disabled={disabled}
                                className="w-24 text-right bg-warm-50 border border-warm-200 rounded-lg px-2 py-1 text-sm font-medium text-warm-900 disabled:cursor-not-allowed" />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex justify-center py-12"><LoadingSpinner size="lg" color="#9b7653" /></div>
                ) : (
                  <div style={{ overflowY: 'auto', maxHeight: 'calc(65dvh - 120px)', WebkitOverflowScrolling: 'touch' }} className="mx-3 mt-3 mb-4">
                    <div className="warm-card overflow-hidden">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext items={types.map((t) => t._id)} strategy={verticalListSortingStrategy}>
                          {types.map((t, i) => (
                            <SortableRow
                              key={t._id}
                              t={t}
                              isLast={i === types.length - 1}
                              onEdit={() => openEdit(t)}
                              onDelete={() => setDeleteTarget(t)}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                      {types.length === 0 && <p className="text-center text-warm-400 py-8 text-sm">Нет типов — добавьте первый</p>}
                    </div>
                  </div>
                )}
              </DrawerBody>

              <DrawerFooter style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
                {showForm ? (
                  <>
                    <button onClick={closeForm} className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-700 text-sm font-semibold active:bg-warm-50">Отмена</button>
                    <button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}>
                      {saving && <LoadingSpinner size="sm" color="white" />}Сохранить
                    </button>
                  </>
                ) : (
                  <button onClick={openNew} className="w-full py-3 rounded-xl text-white text-sm font-semibold" style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}>+ Добавить тип</button>
                )}
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {deleteTarget && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => { if (!deleting) setDeleteTarget(null) }} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
              <div className="px-5 pt-5 pb-4">
                <h2 className="text-base font-slab font-bold text-warm-900 mb-2">Удалить тип?</h2>
                <p className="text-sm text-warm-600 leading-relaxed">Удалить <span className="font-semibold text-warm-900">«{deleteTarget.name}»</span>? Существующие выходы не затронуты.</p>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold active:bg-warm-50">Отмена</button>
                <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-white text-sm font-slab font-semibold bg-red-500 active:bg-red-600 disabled:opacity-40 flex items-center justify-center gap-2">
                  {deleting && <LoadingSpinner size="sm" color="white" />}Удалить
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
