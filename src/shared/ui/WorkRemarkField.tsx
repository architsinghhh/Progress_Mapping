import { useEffect, useState } from 'react'
import { MessageSquarePlus, Pencil, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/shared/lib/utils'

type WorkRemarkFieldProps = {
  remarkKey: string
  /** System / derived note shown when no user remark is saved. */
  fallback?: string
  placeholder?: string
  className?: string
  /** Compact control for dense cards */
  compact?: boolean
  tone?: 'default' | 'behind' | 'ahead'
}

/** Add / edit a work remark for a zone, floor, or stage — persisted per project. */
export function WorkRemarkField({
  remarkKey,
  fallback,
  placeholder = 'Add a work remark…',
  className,
  compact = false,
  tone = 'default',
}: WorkRemarkFieldProps) {
  const saved = useAppStore((s) => s.workRemarks[remarkKey] ?? '')
  const setWorkRemark = useAppStore((s) => s.setWorkRemark)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(saved)

  useEffect(() => {
    if (!editing) setDraft(saved)
  }, [saved, editing])

  const display = saved.trim() || fallback?.trim() || ''
  const isUser = Boolean(saved.trim())

  const commit = () => {
    setWorkRemark(remarkKey, draft)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(saved)
    setEditing(false)
  }

  if (editing) {
    return (
      <div
        className={cn('work-remark work-remark--editing', className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          className="work-remark__input"
          autoFocus
        />
        <div className="work-remark__actions">
          <button type="button" className="work-remark__btn work-remark__btn--primary" onClick={commit}>
            Save
          </button>
          <button type="button" className="work-remark__btn" onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!display) {
    return (
      <button
        type="button"
        className={cn('work-remark work-remark--empty', compact && 'is-compact', className)}
        onClick={(e) => {
          e.stopPropagation()
          setEditing(true)
        }}
      >
        <MessageSquarePlus className="size-3.5 shrink-0 opacity-70" />
        <span>{placeholder}</span>
      </button>
    )
  }

  return (
    <div
      className={cn(
        'work-remark',
        `work-remark--${tone}`,
        isUser && 'is-user',
        compact && 'is-compact',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="work-remark__text">{display}</p>
      <div className="work-remark__tools">
        <button
          type="button"
          className="work-remark__icon-btn"
          title="Edit remark"
          aria-label="Edit remark"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3" />
        </button>
        {isUser ? (
          <button
            type="button"
            className="work-remark__icon-btn"
            title="Remove remark"
            aria-label="Remove remark"
            onClick={() => setWorkRemark(remarkKey, '')}
          >
            <Trash2 className="size-3" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
