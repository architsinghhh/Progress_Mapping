import { useEffect, useMemo, useState } from 'react'
import {
  Download,
  ExternalLink,
  FileText,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/shared/lib/utils'

type PlanDoc = {
  id: string
  title: string
  subtitle: string
  src: string
}

const GREENFIELD_PLANS: PlanDoc[] = [
  {
    id: 'master',
    title: 'Master site layout',
    subtitle: 'Township plot / zoning layout',
    src: '/media/plans/greenfield-master-layout.pdf',
  },
  {
    id: 'infra',
    title: 'Infrastructure layout',
    subtitle: 'Roads · utilities · grading',
    src: '/media/plans/greenfield-infra-layout.pdf',
  },
]

const DEMO_PLANS: PlanDoc[] = [
  {
    id: 'master',
    title: 'Master site layout',
    subtitle: 'Demo layout package',
    src: '/media/plans/demo-site-layout.pdf',
  },
]

/** Site Preparation — embedded PDF viewer for layout plans. */
export function SiteLayoutPdfPanel() {
  const project = useAppStore((s) => s.project)
  const plans = useMemo(
    () => (project?.hasSiteCapture ? GREENFIELD_PLANS : DEMO_PLANS),
    [project?.hasSiteCapture],
  )
  const [activeId, setActiveId] = useState(plans[0]?.id ?? 'master')
  const [expanded, setExpanded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [available, setAvailable] = useState<boolean | null>(null)

  const active = plans.find((p) => p.id === activeId) ?? plans[0]

  useEffect(() => {
    if (!active) {
      setAvailable(false)
      return
    }
    let cancelled = false
    setAvailable(null)
    void (async () => {
      try {
        // Must read bytes — Vite SPA fallback returns 200 HTML for missing files.
        const res = await fetch(active.src, {
          method: 'GET',
          headers: { Range: 'bytes=0-7' },
          cache: 'no-store',
        })
        if (cancelled) return
        if (!(res.ok || res.status === 206)) {
          setAvailable(false)
          return
        }
        const type = (res.headers.get('content-type') ?? '').toLowerCase()
        if (type.includes('text/html') || type.includes('application/json')) {
          setAvailable(false)
          return
        }
        const buf = new Uint8Array(await res.arrayBuffer())
        const magic = String.fromCharCode(...buf.slice(0, 4))
        setAvailable(magic === '%PDF' || type.includes('application/pdf'))
      } catch {
        if (!cancelled) setAvailable(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [active, reloadKey])

  return (
    <Panel
      title="Site layout plans"
      accent="indigo"
      action={
        <span className="text-[10px] font-semibold text-slate-500">
          PDF viewer · public/media/plans
        </span>
      }
      className="h-full"
      bodyClassName="flex flex-col gap-3 p-3"
    >
      <div className="pdf-viewer__toolbar">
        <div className="pdf-viewer__tabs" role="tablist" aria-label="Layout documents">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === active?.id}
              className={cn('pdf-viewer__tab', p.id === active?.id && 'is-active')}
              onClick={() => setActiveId(p.id)}
            >
              <FileText className="size-3.5 shrink-0" />
              <span className="min-w-0 text-left">
                <span className="block truncate font-semibold">{p.title}</span>
                <span className="block truncate text-[10px] font-medium opacity-70">
                  {p.subtitle}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="pdf-viewer__actions">
          <button
            type="button"
            className="pdf-viewer__icon-btn"
            title="Reload"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <RefreshCw className="size-3.5" />
          </button>
          <button
            type="button"
            className="pdf-viewer__icon-btn"
            title={expanded ? 'Compact height' : 'Expand viewer'}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
          {active && available ? (
            <>
              <a
                className="pdf-viewer__icon-btn"
                href={active.src}
                target="_blank"
                rel="noreferrer"
                title="Open in new tab"
              >
                <ExternalLink className="size-3.5" />
              </a>
              <a className="pdf-viewer__icon-btn" href={active.src} download title="Download PDF">
                <Download className="size-3.5" />
              </a>
            </>
          ) : null}
        </div>
      </div>

      <div className={cn('pdf-viewer__frame', expanded && 'is-expanded')}>
        {available === null ? (
          <div className="pdf-viewer__loading">Checking layout PDF…</div>
        ) : null}

        {available && active ? (
          <iframe
            key={`${active.id}-${reloadKey}`}
            title={active.title}
            src={`${active.src}?v=${reloadKey}#toolbar=1&navpanes=0&view=FitH`}
            className="pdf-viewer__embed"
          />
        ) : null}

        {available === false ? (
          <div className="pdf-viewer__empty">
            <FileText className="size-8 text-slate-400" />
            <h4>Add a site layout PDF</h4>
            <p>
              Place your plan file at{' '}
              <code>public/media/plans/{active?.src.replace('/media/plans/', '')}</code> then hit
              reload. The viewer opens it here with zoom, scroll, open, and download.
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}
