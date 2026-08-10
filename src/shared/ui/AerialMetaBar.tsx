import type { SurveyMission } from '@/entities/types'
import { formatMonthYear } from '@/shared/lib/utils'

/** Shared aerial metadata strip — mock fields until real processing reports are wired */
export function AerialMetaBar({
  mission,
  tone = 'dark',
}: {
  mission?: SurveyMission
  tone?: 'dark' | 'light'
}) {
  if (!mission) return null
  const dark = tone === 'dark'
  return (
    <div
      className={
        dark
          ? 'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-slate-900/70 px-2.5 py-1.5 text-[10px] font-semibold text-white/90 backdrop-blur'
          : 'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-200 bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600'
      }
    >
      <span>{formatMonthYear(mission.date)}</span>
      <span className={dark ? 'text-white/40' : 'text-slate-300'}>|</span>
      <span>GSD {mission.gsdCm ?? '—'} cm</span>
      <span className={dark ? 'text-white/40' : 'text-slate-300'}>|</span>
      <span>AGL {mission.altitudeM ?? '—'} m</span>
      <span className={dark ? 'text-white/40' : 'text-slate-300'}>|</span>
      <span>{mission.droneId ?? 'Drone —'}</span>
      <span className={dark ? 'text-white/40' : 'text-slate-300'}>|</span>
      <span>{mission.coverageHa ?? '—'} ha</span>
      <span className={dark ? 'text-amber-200/90' : 'text-amber-700'}>· mock metadata</span>
    </div>
  )
}
