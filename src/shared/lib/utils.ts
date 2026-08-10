import { clsx, type ClassValue } from 'clsx'
import type { ScheduleStatus } from '@/entities/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Site-wide schedule colors — Completed blue · On Schedule teal · Behind red */
export const SCHEDULE_COLORS: Record<ScheduleStatus, string> = {
  completed: '#2563eb',
  on_track: '#16a34a',
  behind: '#dc2626',
}

export function statusLabel(status: ScheduleStatus): string {
  switch (status) {
    case 'on_track':
      return 'On Schedule'
    case 'behind':
      return 'Behind Schedule'
    case 'completed':
      return 'Completed'
  }
}

export function statusColor(status: ScheduleStatus): string {
  return SCHEDULE_COLORS[status]
}

export function statusTone(status: ScheduleStatus): string {
  switch (status) {
    case 'on_track':
      return 'text-green-800 bg-green-500/10 border-green-500/30'
    case 'behind':
      return 'text-red-700 bg-red-500/10 border-red-500/30'
    case 'completed':
      return 'text-blue-700 bg-blue-500/10 border-blue-500/30'
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
