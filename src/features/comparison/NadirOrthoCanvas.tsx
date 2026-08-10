import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { cn } from '@/shared/lib/utils'
import { driveModelUrlForStage, fetchModelIndex } from '@/features/model3d/modelSource'
import type { Point2 } from '@/features/site-plan/zoneFootprints'

const bufferCache = new Map<string, ArrayBuffer>()

async function loadGlbBuffer(url: string, onProgress?: (pct: number | null) => void): Promise<ArrayBuffer> {
  const hit = bufferCache.get(url)
  if (hit) {
    onProgress?.(100)
    return hit
  }
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const total = Number(res.headers.get('content-length') || 0)
  if (!res.body) {
    const buf = await res.arrayBuffer()
    bufferCache.set(url, buf)
    onProgress?.(100)
    return buf
  }
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.length
      if (total > 0) onProgress?.(Math.min(99, Math.round((received / total) * 100)))
      else onProgress?.(null)
    }
  }
  const out = new Uint8Array(received)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  bufferCache.set(url, out.buffer)
  onProgress?.(100)
  return out.buffer
}

async function yawForStage(stageId: string): Promise<number> {
  try {
    const index = await fetchModelIndex()
    const s = index.stages?.find((x) => x.id === stageId) as { orthoYawDeg?: number } | undefined
    return typeof s?.orthoYawDeg === 'number' ? s.orthoYawDeg : 0
  } catch {
    return 0
  }
}

type Axis = 'x' | 'y' | 'z'

function thinnestAxis(size: THREE.Vector3): Axis {
  if (size.y <= size.x && size.y <= size.z) return 'y'
  if (size.z <= size.x && size.z <= size.y) return 'z'
  return 'x'
}

function reorientSiteToYUp(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  let box = new THREE.Box3().setFromObject(root)
  let center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  root.position.sub(center)
  root.updateMatrixWorld(true)

  const up = thinnestAxis(size)
  if (up === 'z') root.rotateX(-Math.PI / 2)
  else if (up === 'x') root.rotateZ(Math.PI / 2)
  root.updateMatrixWorld(true)

  box = new THREE.Box3().setFromObject(root)
  center = box.getCenter(new THREE.Vector3())
  root.position.sub(center)
  root.updateMatrixWorld(true)
}

/** Map UV (0–1000, y down) ↔ world XZ after nadir fit. */
export type MapFrame = {
  cx: number
  cy: number
  cz: number
  half: number
  groundY: number
}

export function uvToWorld(u: number, v: number, frame: MapFrame): THREE.Vector3 {
  // Camera up = −Z, screen top = −Z → SVG y=0 is −Z
  const x = frame.cx + (u / 1000 - 0.5) * 2 * frame.half
  const z = frame.cz + (v / 1000 - 0.5) * 2 * frame.half
  return new THREE.Vector3(x, frame.groundY, z)
}

export function worldToUv(p: THREE.Vector3, frame: MapFrame): Point2 {
  const u = ((p.x - frame.cx) / (2 * frame.half) + 0.5) * 1000
  const v = ((p.z - frame.cz) / (2 * frame.half) + 0.5) * 1000
  return [u, v]
}

export type ZoneOverlaySpec = {
  id: string
  color: string
  chunks: Point2[][]
  /** Highlight stroke */
  active?: boolean
  label?: string
  labelAt?: Point2
  progress?: number
}

function disposeOverlayGroup(group: THREE.Group) {
  group.traverse((o) => {
    const m = o as THREE.Mesh | THREE.Line
    if ('geometry' in m && m.geometry) m.geometry.dispose()
    const mat = (m as THREE.Mesh).material
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat]
      mats.forEach((x) => x?.dispose?.())
    }
  })
}

function buildOverlayGroup(zones: ZoneOverlaySpec[], frame: MapFrame, draft?: Point2[]): THREE.Group {
  const g = new THREE.Group()
  g.name = 'zone-overlays'
  const y = frame.groundY

  for (const zone of zones) {
    for (const chunk of zone.chunks) {
      if (chunk.length < 2) continue
      const pts = chunk.map(([u, v]) => {
        const w = uvToWorld(u, v, frame)
        w.y = y
        return w
      })
      if (chunk.length >= 3) pts.push(pts[0].clone())
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color: zone.color,
          depthTest: false,
          transparent: true,
          opacity: zone.active ? 1 : 0.9,
          linewidth: 1,
        }),
      )
      line.renderOrder = 10
      g.add(line)
    }
  }

  if (draft && draft.length >= 1) {
    const pts = draft.map(([u, v]) => {
      const w = uvToWorld(u, v, frame)
      w.y = y
      return w
    })
    if (draft.length >= 2) {
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color: 0xf8fafc,
          depthTest: false,
          transparent: true,
          opacity: 0.95,
        }),
      )
      line.renderOrder = 11
      g.add(line)
    }
    for (const p of pts) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(frame.half * 0.006, 0.4), 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }),
      )
      dot.position.copy(p)
      dot.position.y += 0.2
      dot.renderOrder = 12
      g.add(dot)
    }
  }

  return g
}

/**
 * Live orthographic nadir map.
 * Zone footprints live in the same 3D space as the model (exact under zoom/pan).
 */
export function NadirOrthoCanvas({
  stageId,
  className,
  label,
  interactive = true,
  zones = [],
  draftPoints,
  onMapClick,
  pickMode = false,
}: {
  stageId: string
  className?: string
  label?: string
  /** Scroll zoom + drag pan (rotate locked). */
  interactive?: boolean
  zones?: ZoneOverlaySpec[]
  draftPoints?: Point2[]
  /** Map UV 0–1000 from ground-plane raycast */
  onMapClick?: (uv: Point2) => void
  pickMode?: boolean
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [progress, setProgress] = useState<number | null>(0)
  const [error, setError] = useState<string | null>(null)
  const [labels, setLabels] = useState<{ id: string; text: string; x: number; y: number; color: string }[]>(
    [],
  )

  const zonesRef = useRef(zones)
  zonesRef.current = zones
  const draftRef = useRef(draftPoints)
  draftRef.current = draftPoints
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const pickModeRef = useRef(pickMode)
  pickModeRef.current = pickMode

  const frameRef = useRef<MapFrame | null>(null)
  const overlayRef = useRef<THREE.Group | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const syncOverlayRef = useRef<() => void>(() => {})

  // Rebuild overlays when zone data changes (after map ready)
  useEffect(() => {
    syncOverlayRef.current()
  }, [zones, draftPoints, status])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !stageId) return

    let cancelled = false
    let raf = 0
    let renderer: THREE.WebGLRenderer | null = null
    let controls: OrbitControls | null = null
    let root: THREE.Object3D | null = null

    setStatus('loading')
    setError(null)
    setProgress(0)
    setLabels([])

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xdce6de)
    sceneRef.current = scene

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1e7)
    cameraRef.current = camera

    const w0 = Math.max(1, host.clientWidth)
    const h0 = Math.max(1, host.clientHeight)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(w0, h0, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NoToneMapping
    host.appendChild(renderer.domElement)
    Object.assign(renderer.domElement.style, {
      width: '100%',
      height: '100%',
      display: 'block',
      touchAction: 'none',
      cursor: pickMode ? 'crosshair' : 'grab',
    })

    scene.add(new THREE.AmbientLight(0xffffff, 1.2))
    const sun = new THREE.DirectionalLight(0xffffff, 0.25)
    sun.position.set(0, 1, 0)
    scene.add(sun)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableRotate = false
    controls.enablePan = interactive
    controls.enableZoom = interactive
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.screenSpacePanning = true
    controls.minZoom = 0.5
    controls.maxZoom = 20
    controls.zoomSpeed = 1.1

    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const hit = new THREE.Vector3()
    const groundPlane = new THREE.Plane()

    const rebuildOverlays = () => {
      const frame = frameRef.current
      if (!frame || cancelled) return
      if (overlayRef.current) {
        scene.remove(overlayRef.current)
        disposeOverlayGroup(overlayRef.current)
        overlayRef.current = null
      }
      const group = buildOverlayGroup(zonesRef.current, frame, draftRef.current)
      overlayRef.current = group
      scene.add(group)
    }
    syncOverlayRef.current = rebuildOverlays

    const updateLabels = () => {
      const frame = frameRef.current
      if (!frame || !renderer || cancelled) return
      const w = renderer.domElement.clientWidth
      const h = renderer.domElement.clientHeight
      const next: typeof labels = []
      for (const z of zonesRef.current) {
        if (!z.label || !z.labelAt) continue
        const p = uvToWorld(z.labelAt[0], z.labelAt[1], frame)
        p.y += 0.5
        p.project(camera)
        if (p.z > 1) continue
        next.push({
          id: z.id,
          text: z.label,
          color: z.color,
          x: (p.x * 0.5 + 0.5) * w,
          y: (-p.y * 0.5 + 0.5) * h,
        })
      }
      setLabels(next)
    }

    const fitNadir = (object: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(object)
      if (box.isEmpty()) return
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())

      const height = Math.max(size.y * 4, Math.max(size.x, size.z) * 1.5, 80)
      camera.up.set(0, 0, -1)
      camera.position.set(center.x, center.y + height, center.z)
      camera.lookAt(center.x, center.y, center.z)

      controls!.target.set(center.x, center.y, center.z)
      controls!.update()

      // Tight square map — 0–1000 UV maps exactly across this frustum
      const half = Math.max(size.x, size.z, 1) * 0.5
      camera.left = -half
      camera.right = half
      camera.top = half
      camera.bottom = -half
      camera.near = 0.1
      camera.far = height * 40
      camera.zoom = 1
      camera.updateProjectionMatrix()
      camera.updateMatrixWorld(true)

      frameRef.current = {
        cx: center.x,
        cy: center.y,
        cz: center.z,
        half,
        groundY: box.min.y + 0.15,
      }
      groundPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, frameRef.current.groundY, 0),
      )
      rebuildOverlays()
    }

    const onPointer = (e: PointerEvent) => {
      if (!pickModeRef.current || !onMapClickRef.current || !frameRef.current || !renderer) return
      const rect = renderer.domElement.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      if (!raycaster.ray.intersectPlane(groundPlane, hit)) return
      const uv = worldToUv(hit, frameRef.current)
      if (uv[0] < -50 || uv[0] > 1050 || uv[1] < -50 || uv[1] > 1050) return
      onMapClickRef.current([
        Math.min(1000, Math.max(0, uv[0])),
        Math.min(1000, Math.max(0, uv[1])),
      ])
    }

    const onResize = () => {
      if (!renderer || !root) return
      const w = Math.max(1, host.clientWidth)
      const h = Math.max(1, host.clientHeight)
      renderer.setSize(w, h, false)
      // Keep framing; only resize drawing buffer (don't reset zoom)
      camera.updateProjectionMatrix()
    }

    let moved = false
    const onPointerDown = () => {
      moved = false
    }
    const onPointerMoveCtrl = () => {
      moved = true
    }
    const onPointerUp = (e: PointerEvent) => {
      if (!moved) onPointer(e)
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMoveCtrl)
    renderer.domElement.addEventListener('pointerup', onPointerUp)

    const tick = () => {
      if (cancelled || !renderer) return
      controls?.update()
      updateLabels()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }

    ;(async () => {
      try {
        const yawDeg = await yawForStage(stageId)
        const url = driveModelUrlForStage(stageId)
        const buf = await loadGlbBuffer(url, (pct) => {
          if (!cancelled) setProgress(pct)
        })
        if (cancelled) return

        const gltf = await new GLTFLoader().parseAsync(buf, '')
        if (cancelled) {
          gltf.scene.traverse((o) => {
            const m = o as THREE.Mesh
            if (m.isMesh) {
              m.geometry?.dispose()
              const mats = Array.isArray(m.material) ? m.material : [m.material]
              mats.forEach((mat) => mat?.dispose())
            }
          })
          return
        }

        root = gltf.scene
        reorientSiteToYUp(root)
        if (yawDeg) {
          root.rotateY(THREE.MathUtils.degToRad(yawDeg))
          root.updateMatrixWorld(true)
          const box = new THREE.Box3().setFromObject(root)
          const c = box.getCenter(new THREE.Vector3())
          root.position.sub(c)
          root.updateMatrixWorld(true)
        }

        root.traverse((obj) => {
          const mesh = obj as THREE.Mesh
          if (!mesh.isMesh || !mesh.material) return
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const mat of mats) {
            if (mat) {
              mat.side = THREE.DoubleSide
              mat.needsUpdate = true
            }
          }
        })

        scene.add(root)
        fitNadir(root)
        window.addEventListener('resize', onResize)
        setStatus('ready')
        raf = requestAnimationFrame(tick)
      } catch (e) {
        if (!cancelled) {
          setStatus('error')
          setError(e instanceof Error ? e.message : 'Failed to load model')
        }
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer?.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer?.domElement.removeEventListener('pointermove', onPointerMoveCtrl)
      renderer?.domElement.removeEventListener('pointerup', onPointerUp)
      controls?.dispose()
      if (overlayRef.current) {
        scene.remove(overlayRef.current)
        disposeOverlayGroup(overlayRef.current)
        overlayRef.current = null
      }
      if (root) {
        scene.remove(root)
        root.traverse((o) => {
          const m = o as THREE.Mesh
          if (m.isMesh) {
            m.geometry?.dispose()
            const mats = Array.isArray(m.material) ? m.material : [m.material]
            mats.forEach((mat) => mat?.dispose())
          }
        })
      }
      renderer?.dispose()
      if (renderer?.domElement.parentElement === host) host.removeChild(renderer.domElement)
      sceneRef.current = null
      cameraRef.current = null
      frameRef.current = null
    }
  }, [stageId, interactive])

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-[#dce6de]', className)}>
      <div ref={hostRef} className="absolute inset-0" />
      {label ? (
        <div className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-ink/75 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          {label}
        </div>
      ) : null}
      {labels.map((l) => (
        <div
          key={l.id}
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded bg-slate-900/85 px-1.5 py-0.5 text-center text-[9px] font-bold text-white shadow"
          style={{ left: l.x, top: l.y, borderBottom: `2px solid ${l.color}` }}
        >
          {l.text}
        </div>
      ))}
      {status === 'loading' ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#dce6de]/90 px-4 text-center">
          <p className="text-[11px] font-semibold text-ink">Loading top-down view…</p>
          <p className="text-[10px] text-muted">
            {progress == null ? 'Downloading model…' : `${progress}%`}
          </p>
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-rose-50 px-4 text-center text-[11px] text-rose-800">
          {error ?? 'Could not load top view'}
        </div>
      ) : null}
      {status === 'ready' && interactive ? (
        <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-white/85 px-1.5 py-0.5 text-[9px] text-slate-500">
          Scroll zoom · drag pan
        </div>
      ) : null}
    </div>
  )
}
