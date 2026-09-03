import { motion } from 'framer-motion'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { missionFactor } from '@/shared/lib/missionScale'
import { cn } from '@/shared/lib/utils'

export function VolumePanel() {
  const volumes = useAppStore((s) => s.volumes)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const selectZone = useAppStore((s) => s.selectZone)

  const factor = missionFactor(activeMissionIndex, missions.length)

  const plannedCut = volumes.reduce((s, v) => s + v.cutM3, 0)
  const plannedFill = volumes.reduce((s, v) => s + v.fillM3, 0)
  const doneCut = volumes.reduce((s, v) => s + Math.round(v.cutM3 * factor), 0)
  const doneFill = volumes.reduce((s, v) => s + Math.round(v.fillM3 * factor), 0)
  const netDone = doneFill - doneCut
  const earthworkPct =
    plannedCut + plannedFill <= 0
      ? 0
      : Math.round(((doneCut + doneFill) / (plannedCut + plannedFill)) * 100)

  const cutShare =
    doneCut + doneFill <= 0 ? 50 : Math.round((doneCut / (doneCut + doneFill)) * 100)

  return (
    <Panel
      title="Cut–Fill volumes"
      accent="sky"
      action={
        <span className="text-[10px] font-semibold text-[#0369a1]">
          {earthworkPct}% earthwork complete
        </span>
      }
      className="h-full"
      bodyClassName="scrollbar-thin flex flex-col gap-4 overflow-auto p-3"
    >
      <div className="vol-hero">
        <div className="vol-hero__ring" style={{ ['--cut' as string]: `${cutShare}%` }}>
          <div className="vol-hero__ring-core">
            <strong>{earthworkPct}%</strong>
            <span>Done</span>
          </div>
        </div>

        <div className="vol-hero__stats">
          <div className="vol-metric vol-metric--cut">
            <span>Cut</span>
            <strong>{doneCut.toLocaleString()}</strong>
            <em>of {plannedCut.toLocaleString()} m³</em>
            <div className="vol-metric__bar">
              <motion.i
                initial={{ width: 0 }}
                animate={{
                  width: `${plannedCut ? Math.min(100, (doneCut / plannedCut) * 100) : 0}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          <div className="vol-metric vol-metric--fill">
            <span>Fill</span>
            <strong>{doneFill.toLocaleString()}</strong>
            <em>of {plannedFill.toLocaleString()} m³</em>
            <div className="vol-metric__bar">
              <motion.i
                initial={{ width: 0 }}
                animate={{
                  width: `${plannedFill ? Math.min(100, (doneFill / plannedFill) * 100) : 0}%`,
                }}
                transition={{ duration: 0.5, delay: 0.05 }}
              />
            </div>
          </div>
          <div className="vol-metric vol-metric--net">
            <span>Net balance</span>
            <strong>
              {netDone > 0 ? '+' : ''}
              {netDone.toLocaleString()}
            </strong>
            <em>m³ · fill − cut</em>
          </div>
        </div>
      </div>

      <div className="vol-split" aria-hidden>
        <span style={{ width: `${cutShare}%` }} className="vol-split__cut" />
        <span style={{ width: `${100 - cutShare}%` }} className="vol-split__fill" />
      </div>
      <div className="vol-split-legend">
        <span>Cut share {cutShare}%</span>
        <span>Fill share {100 - cutShare}%</span>
      </div>

      <div className="vol-zones-head">
        <h4>By zone</h4>
        <span>Tap a package to focus</span>
      </div>

      <div className="vol-zone-grid">
        {volumes.map((v, i) => {
          const cutDone = Math.round(v.cutM3 * factor)
          const fillDone = Math.round(v.fillM3 * factor)
          const zonePct =
            v.cutM3 + v.fillM3 <= 0
              ? 0
              : Math.round(((cutDone + fillDone) / (v.cutM3 + v.fillM3)) * 100)
          const rockLeft =
            v.rockRemainingM3 != null && v.rockRemainingM3 > 0
              ? Math.round(v.rockRemainingM3 * Math.max(0, 1 - factor))
              : 0
          const active = v.zoneId === selectedZoneId
          const maxVol = Math.max(...volumes.map((x) => Math.max(x.cutM3, x.fillM3)), 1)

          return (
            <motion.button
              key={v.zoneId}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => void selectZone(v.zoneId)}
              className={cn('vol-zone', active && 'is-active')}
            >
              <div className="vol-zone__top">
                <div>
                  <strong>
                    {v.zoneCode} · {v.zoneName}
                  </strong>
                  <em>{v.changeLabel}</em>
                </div>
                <span className="vol-zone__pct">{zonePct}%</span>
              </div>

              <div className="vol-zone__bars">
                <div className="vol-zone__row">
                  <span>Cut</span>
                  <div className="vol-zone__track">
                    <motion.i
                      className="is-cut"
                      initial={{ width: 0 }}
                      animate={{ width: `${(cutDone / maxVol) * 100}%` }}
                      transition={{ duration: 0.45 }}
                    />
                  </div>
                  <b>{cutDone.toLocaleString()}</b>
                </div>
                <div className="vol-zone__row">
                  <span>Fill</span>
                  <div className="vol-zone__track">
                    <motion.i
                      className="is-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${(fillDone / maxVol) * 100}%` }}
                      transition={{ duration: 0.45, delay: 0.04 }}
                    />
                  </div>
                  <b>{fillDone.toLocaleString()}</b>
                </div>
              </div>

              {rockLeft > 0 ? (
                <div className="vol-zone__rock">Rock left ~{rockLeft.toLocaleString()} m³</div>
              ) : null}
            </motion.button>
          )
        })}
      </div>
    </Panel>
  )
}
