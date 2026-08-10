import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, MapPin, Building2, CalendarDays, Layers } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { AjnhawkLogo } from '@/shared/ui/AjnhawkLogo'
import { AppBrandFooter } from '@/shared/ui/AppBrandFooter'
import { formatDate, cn, statusLabel, statusColor } from '@/shared/lib/utils'
import type { Project, ScheduleStatus } from '@/entities/types'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { ScheduleLegend } from '@/shared/ui/ScheduleLegend'

function typeLabel(t: Project['type']) {
  const map: Record<Project['type'], string> = {
    township: 'Township',
    mall: 'Mall',
    plaza: 'Plaza',
    theme_park: 'Theme park',
    society: 'Society',
  }
  return map[t]
}

function ProjectCard({
  project,
  index,
  onOpen,
}: {
  project: Project
  index: number
  onOpen: () => void
}) {
  const accent = statusColor(project.scheduleStatus)

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 + index * 0.07 }}
      onClick={onOpen}
      className={cn('project-card', `project-card--status-${project.scheduleStatus}`)}
      style={
        {
          ['--project-status' as string]: accent,
          borderColor: `${accent}48`,
          background: `linear-gradient(160deg, #ffffff 35%, ${accent}18 100%)`,
        } as CSSProperties
      }
    >
      <div
        className="project-card__glow"
        aria-hidden
        style={{ background: accent, opacity: 0.35 }}
      />
      <div className="project-card__top">
        <span className="project-card__type">{typeLabel(project.type)}</span>
        <StatusBadge status={project.scheduleStatus} remark={project.remark} />
      </div>

      <h2 className="project-card__title">{project.name}</h2>
      <p className="project-card__headline">{project.headline}</p>

      <div className="project-card__meta">
        <span>
          <MapPin className="size-3.5" />
          {project.location}
        </span>
        <span>
          <Layers className="size-3.5" />
          {project.zoneCount} zones
        </span>
        <span>
          <CalendarDays className="size-3.5" />
          Survey {formatDate(project.lastSurveyDate)}
        </span>
      </div>

      <div className="project-card__progress">
        <div className="project-card__progress-row">
          <span>Overall progress</span>
          <strong style={{ color: accent }}>{project.overallProgress}%</strong>
        </div>
        <div className="project-card__bar">
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: `${project.overallProgress}%` }}
            transition={{ duration: 0.8, delay: 0.2 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: accent }}
          />
        </div>
        <div className="project-card__progress-row project-card__progress-row--muted">
          <span style={{ color: accent, fontWeight: 700 }}>{statusLabel(project.scheduleStatus)}</span>
          <span>{project.totalAreaAcres} acres</span>
        </div>
      </div>

      <div className="project-card__cta">
        Open workspace
        <ArrowUpRight className="size-4" />
      </div>
    </motion.button>
  )
}

export function ProjectPortfolioPage() {
  const navigate = useNavigate()
  const builder = useAppStore((s) => s.builder)
  const projects = useAppStore((s) => s.projects)
  const portfolioReady = useAppStore((s) => s.portfolioReady)
  const loading = useAppStore((s) => s.loading)
  const loadPortfolio = useAppStore((s) => s.loadPortfolio)
  const [filter, setFilter] = useState<'all' | ScheduleStatus>('all')

  useEffect(() => {
    void loadPortfolio()
  }, [loadPortfolio])

  const filtered = useMemo(() => {
    if (filter === 'all') return projects
    return projects.filter((p) => p.scheduleStatus === filter)
  }, [projects, filter])

  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.overallProgress, 0) / projects.length)
    : 0

  return (
    <div className="app-bg min-h-screen">
      <div className="app-bg__grid" aria-hidden />
      <div className="app-bg__orb app-bg__orb--a" aria-hidden />
      <div className="app-bg__orb app-bg__orb--b" aria-hidden />

      <div className="app-content relative z-[1] flex min-h-screen flex-col">
        <header className="portfolio-hero">
          <div className="portfolio-hero__brand">
            <AjnhawkLogo size="lg" />
            <div>
              <p className="badge">Progress Intelligence</p>
              <h1 className="portfolio-hero__title">
                {builder?.name ?? 'Your builder'}
              </h1>
              <p className="portfolio-hero__sub">
                Choose a project site to open its progress workspace — surveys, zones, and 3D stay
                scoped to that site only.
              </p>
            </div>
          </div>

          <div className="portfolio-hero__stats">
            <div className="portfolio-stat">
              <Building2 className="size-4 opacity-70" />
              <div>
                <strong>{projects.length}</strong>
                <span>Active sites</span>
              </div>
            </div>
            <div className="portfolio-stat">
              <div>
                <strong>{avgProgress}%</strong>
                <span>Avg progress</span>
              </div>
            </div>
            <div className="portfolio-stat">
              <div>
                <strong>{builder?.region ?? '—'}</strong>
                <span>Region</span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-slate-800">Project sites</h2>
              <ScheduleLegend />
            </div>
            <div className="chip-row">
              {(
                [
                  ['all', 'All'],
                  ['on_track', 'On Schedule'],
                  ['behind', 'Behind Schedule'],
                  ['completed', 'Completed'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={cn('layer-chip', filter === id && 'is-active')}
                  style={
                    id !== 'all' && filter === id
                      ? {
                          borderColor: statusColor(id as ScheduleStatus),
                          color: statusColor(id as ScheduleStatus),
                          background: `${statusColor(id as ScheduleStatus)}14`,
                        }
                      : undefined
                  }
                >
                  {id !== 'all' ? (
                    <span
                      className="mr-1.5 inline-block size-1.5 rounded-full"
                      style={{ background: statusColor(id as ScheduleStatus) }}
                    />
                  ) : null}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!portfolioReady || loading ? (
            <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">
              Loading portfolio…
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="project-grid">
                {filtered.map((p, i) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    index={i}
                    onOpen={() => void navigate(`/projects/${p.id}`)}
                  />
                ))}
              </div>
              {filtered.length === 0 && (
                <p className="py-16 text-center text-sm text-slate-500">No sites match this filter.</p>
              )}
            </AnimatePresence>
          )}
        </main>

        <AppBrandFooter compact />
      </div>
    </div>
  )
}
