import { NadirOrthoCanvas, type ZoneOverlaySpec } from '@/features/comparison/NadirOrthoCanvas'
import { cn } from '@/shared/lib/utils'

/**
 * Shared square map stage for Overview + Trace.
 * Zones are drawn in 3D on the map (exact under zoom/pan).
 */
export function OrthoMapViewport({
  stageId,
  label,
  className,
  zones = [],
  draftPoints,
  onMapClick,
  pickMode = false,
  interactive = true,
}: {
  stageId: string
  label?: string
  className?: string
  zones?: ZoneOverlaySpec[]
  draftPoints?: import('@/features/site-plan/zoneFootprints').Point2[]
  onMapClick?: (uv: import('@/features/site-plan/zoneFootprints').Point2) => void
  pickMode?: boolean
  interactive?: boolean
}) {
  return (
    <div className={cn('relative flex h-full w-full items-center justify-center bg-[#dce6de]', className)}>
      <div className="relative aspect-square h-full max-h-full w-auto max-w-full min-h-0 min-w-0">
        <div className="absolute inset-0">
          <NadirOrthoCanvas
            stageId={stageId}
            label={label}
            interactive={interactive}
            zones={zones}
            draftPoints={draftPoints}
            onMapClick={onMapClick}
            pickMode={pickMode}
          />
        </div>
      </div>
    </div>
  )
}
