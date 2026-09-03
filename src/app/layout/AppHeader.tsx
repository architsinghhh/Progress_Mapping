import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, FileText, LayoutGrid, Crosshair } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { formatDate, formatMonthYear, cn } from '@/shared/lib/utils'
import { AjnhawkLogo } from '@/shared/ui/AjnhawkLogo'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { WorkspaceNav } from '@/features/dashboard/WorkspaceNav'
import { TimelapseBar } from '@/features/timelapse/TimelapseBar'

export function AppHeader() {
  const navigate = useNavigate()
  const project = useAppStore((s) => s.project)
  const projects = useAppStore((s) => s.projects)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const setSummaryOpen = useAppStore((s) => s.setSummaryOpen)
  const exitToPortfolio = useAppStore((s) => s.exitToPortfolio)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const mission = missions[activeMissionIndex]
  const otherProjects = useMemo(
    () => projects.filter((p) => p.id !== project?.id),
    [projects, project?.id],
  )

  // When the full header scrolls out, pin a slim timeline bar (no height flicker).
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        // rootMargin bottom negative = wait until header fully leaves
        setPinned(!entry.isIntersecting)
      },
      { root: null, threshold: 0, rootMargin: '-8px 0px 0px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <>
      <header className="topbar-shell">
        <div className="topbar">
          <div className="topbar__main">
            <div className="topbar-brand">
              <WorkspaceNav />
              <AjnhawkLogo
                size="md"
                title="All project sites"
                onClick={() => {
                  exitToPortfolio()
                  navigate('/')
                }}
              />

              <div className="topbar-brand__copy">
                <p className="badge">Progress Intelligence</p>
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    className="topbar-project-switch"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-expanded={menuOpen}
                  >
                    <h1>
                      {project?.name ?? 'Project'}{' '}
                      <span className="text-slate-400">
                        {project ? typeHint(project.type) : ''}
                      </span>
                    </h1>
                    <ChevronDown
                      className={cn('size-4 text-slate-400 transition', menuOpen && 'rotate-180')}
                    />
                  </button>
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="project-switch-menu"
                      >
                        <button
                          type="button"
                          className="project-switch-menu__all"
                          onClick={() => {
                            setMenuOpen(false)
                            exitToPortfolio()
                            navigate('/')
                          }}
                        >
                          <LayoutGrid className="size-3.5" />
                          All project sites
                        </button>
                        {otherProjects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="project-switch-menu__item"
                            onClick={() => {
                              setMenuOpen(false)
                              void navigate(`/projects/${p.id}`)
                            }}
                          >
                            <span className="min-w-0 flex-1 text-left">
                              <span className="block truncate font-semibold text-slate-800">
                                {p.name}
                              </span>
                              <span className="block truncate text-[10px] text-slate-400">
                                {p.location}
                              </span>
                            </span>
                            <StatusBadge status={p.scheduleStatus} remark={p.remark} />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {project ? (
                  <p className="topbar-sub">
                    {project.location} · {project.totalAreaAcres} acres · Target{' '}
                    {formatDate(project.targetDate)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="topbar__actions">
              <button
                type="button"
                className="layer-chip inline-flex items-center gap-1.5"
                onClick={() => {
                  exitToPortfolio()
                  navigate('/')
                }}
              >
                <LayoutGrid className="size-3.5" />
                Sites
              </button>

              <button
                type="button"
                className="layer-chip inline-flex items-center gap-1.5"
                onClick={() => setSummaryOpen(true)}
              >
                <FileText className="size-3.5" />
                Exec summary
              </button>

              {mission ? (
                <div className="mission-chip hidden sm:inline-flex">
                  <Crosshair className="size-3.5 opacity-70" />
                  {mission.label} · {formatMonthYear(mission.date)}
                </div>
              ) : null}
            </div>
          </div>

          <div className="topbar__timeline">
            <TimelapseBar embedded />
          </div>
        </div>
        {/* Detect when full header has left the viewport */}
        <div ref={sentinelRef} className="topbar-sentinel" aria-hidden />
      </header>

      <AnimatePresence>
        {pinned ? (
          <motion.div
            key="pinned-timeline"
            className="topbar-pinned"
            initial={{ y: -28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.7 }}
          >
            <div className="topbar-pinned__inner">
              <WorkspaceNav />
              <div className="topbar-pinned__project">
                <span className="topbar-pinned__name">{project?.name ?? 'Project'}</span>
                {mission ? (
                  <span className="topbar-pinned__stage">{mission.label}</span>
                ) : null}
              </div>
              <div className="topbar-pinned__timeline">
                <TimelapseBar embedded compact />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

function typeHint(t: string) {
  if (t === 'township') return '· Township'
  if (t === 'mall') return '· Mall'
  if (t === 'society') return '· Society'
  return ''
}
