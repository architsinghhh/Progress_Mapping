import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, X } from 'lucide-react'
import { Panel } from '@/shared/ui/Panel'
import { DxfCanvasViewer, DxfReloadButton } from '@/features/site-plan/dxf/DxfCanvasViewer'
import { cn } from '@/shared/lib/utils'

/** Expected path for the Sage master plan drawing. */
export const SAGE_MASTER_DXF_URL = '/Sage/Master%20plan_Villa%20Plotting.dxf'

type SiteLayoutDxfPanelProps = {
  title?: string
  src?: string
  className?: string
}

/** Site Preparation — master plan drawing viewer (pan / zoom / fullscreen). */
export function SiteLayoutDxfPanel({
  title = 'Master plan',
  src = SAGE_MASTER_DXF_URL,
  className,
}: SiteLayoutDxfPanelProps) {
  const [reloadKey, setReloadKey] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [fullscreen])

  return (
    <>
      <Panel
        title={title}
        accent="indigo"
        action={
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
              Drawing
            </span>
            <DxfReloadButton onClick={() => setReloadKey((k) => k + 1)} />
            <button
              type="button"
              className="pdf-viewer__icon-btn inline-flex items-center gap-1 text-[10px] font-semibold"
              title="Fullscreen"
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 className="size-3.5" />
              Fullscreen
            </button>
          </div>
        }
        className={cn('h-full', className)}
        bodyClassName="flex flex-col gap-2 p-3"
      >
        <p className="text-[11px] leading-relaxed text-slate-500">
          Drag to pan, scroll to zoom, Fit to frame · Fullscreen for a larger view.
        </p>
        <div className="min-h-[min(72vh,780px)] flex-1">
          <DxfCanvasViewer
            src={src}
            reloadKey={reloadKey}
            className="h-full min-h-[min(72vh,780px)]"
          />
        </div>
      </Panel>

      {typeof document !== 'undefined' &&
        fullscreen &&
        createPortal(
          <div
            role="dialog"
            aria-modal
            aria-label={`${title} fullscreen`}
            className="fixed inset-0 z-[200] flex flex-col bg-slate-950"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
              <div>
                <p className="font-display text-sm font-bold">{title}</p>
                <p className="text-[10px] text-white/60">
                  Drag to pan · scroll to zoom · Escape to exit
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
                title="Exit fullscreen"
                onClick={() => setFullscreen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="relative min-h-0 flex-1 bg-white p-3 sm:p-4">
              <DxfCanvasViewer
                src={src}
                reloadKey={reloadKey}
                className="h-full min-h-0"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
