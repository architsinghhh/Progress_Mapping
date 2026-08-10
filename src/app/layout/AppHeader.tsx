import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, FileText, LayoutGrid } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { formatDate, formatMonthYear, cn } from '@/shared/lib/utils'
import { AjnhawkLogo } from '@/shared/ui/AjnhawkLogo'
import { StatusBadge } from '@/shared/ui/StatusBadge'

export function AppHeader() {
  const navigate = useNavigate()
  const project = useAppStore((s) => s.project)
  const projects = useAppStore((s) => s.projects)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const setSummaryOpen = useAppStore((s) => s.setSummaryOpen)
  const exitToPortfolio = useAppStore((s) => s.exitToPortfolio)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const mission = missions[activeMissionIndex]
  const otherProjects = useMemo(
    () => projects.filter((p) => p.id !== project?.id),
    [projects, project?.id],
  )

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
    <header className="topbar relative z-20">
      <div className="topbar-brand">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
        >
          <AjnhawkLogo
            size="md"
            title="All project sites"
            onClick={() => {
              exitToPortfolio()
              navigate('/')
            }}
          />
        </motion.div>
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
                <span className="text-slate-400">{project ? typeHint(project.type) : ''}</span>
              </h1>
              <ChevronDown className={cn('size-4 text-slate-400 transition', menuOpen && 'rotate-180')} />
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
                        <span className="block truncate font-semibold text-slate-800">{p.name}</span>
                        <span className="block truncate text-[10px] text-slate-400">{p.location}</span>
                      </span>
                      <StatusBadge status={p.scheduleStatus} remark={p.remark} />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {project && (
            <p className="topbar-sub">
              {project.location} · {project.totalAreaAcres} acres · Target {formatDate(project.targetDate)}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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

        {mission && (
          <div className="mission-chip hidden sm:inline-flex">
            <span className="mission-chip__pulse" />
            {mission.label} · {formatMonthYear(mission.date)}
          </div>
        )}
      </div>
    </header>
  )
}

function typeHint(t: string) {
  if (t === 'township') return '· Township'
  if (t === 'mall') return '· Mall'
  if (t === 'society') return '· Society'
  return ''
}
