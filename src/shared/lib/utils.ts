import { clsx, type ClassValue } from 'clsx'
import type { ScheduleStatus } from '@/entities/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * App-wide schedule colors (do not invent local alternatives):
 * Behind / delay → red
 * On time (in progress) → blue
 * Ahead of schedule → green
 * Completed → slate (done, not an in-progress state)
 * Not started → muted slate
 */
export const SCHEDULE_COLORS: Record<ScheduleStatus, string> = {
  behind: '#dc2626',
  on_track: '#2563eb',
  ahead: '#16a34a',
  completed: '#475569',
  not_started: '#94a3b8',
}

export function statusLabel(status: ScheduleStatus): string {
  switch (status) {
    case 'behind':
      return 'Behind Schedule'
    case 'on_track':
      return 'On Schedule'
    case 'ahead':
      return 'Ahead of Schedule'
    case 'completed':
      return 'Completed'
    case 'not_started':
      return 'Not Started'
  }
}

export function statusColor(status: ScheduleStatus): string {
  return SCHEDULE_COLORS[status]
}

export function statusTone(status: ScheduleStatus): string {
  switch (status) {
    case 'behind':
      return 'text-red-700 bg-red-500/10 border-red-500/30'
    case 'on_track':
      return 'text-blue-700 bg-blue-500/10 border-blue-500/30'
    case 'ahead':
      return 'text-green-800 bg-green-500/10 border-green-500/30'
    case 'completed':
      return 'text-slate-700 bg-slate-500/10 border-slate-500/30'
    case 'not_started':
      return 'text-slate-500 bg-slate-100 border-slate-300'
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Compact mission date for timelines — e.g. 08/23 */
export function formatMonthYear(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${mm}/${yy}`
}
