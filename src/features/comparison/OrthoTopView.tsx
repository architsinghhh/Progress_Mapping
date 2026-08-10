import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { cn } from '@/shared/lib/utils'
import { driveModelUrlForStage, fetchModelIndex } from '@/features/model3d/modelSource'

/** Shared GLB buffer cache (same pattern as SiteModelCanvas). */
const bufferCache = new Map<string, ArrayBuffer>()
/** Captured ortho JPEGs keyed by stage + yaw + zoom version */
const orthoImageCache = new Map<string, string>()
/** In-flight captures — Then/Now both mount at once; share one job per key */
const orthoInflight = new Map<string, Promise<string>>()
/** One WebGL capture at a time (browsers choke on parallel renderers) */
let captureGate: Promise<void> = Promise.resolve()
/** Bump whenever capture math changes so stale slanted frames are dropped */
const ORTHO_CACHE_VER = 'v8-cover-queue'

/** Optional per-stage yaw overrides (degrees, CW when viewed from above). */
const yawCache = new Map<string, number>()
let yawMapLoaded = false

async function loadYawMap(): Promise<Map<string, number>> {
  if (yawMapLoaded) return yawCache
  try {
    const index = await fetchModelIndex()
    yawCache.clear()
    for (const s of index.stages ?? []) {
      const yaw = (s as { orthoYawDeg?: number }).orthoYawDeg
      if (typeof yaw === 'number' && Number.isFinite(yaw)) yawCache.set(s.id, yaw)
    }
  } catch {
    /* ignore */
  }
  yawMapLoaded = true
  return yawCache
}

async function loadGlbBuffer(url: string): Promise<ArrayBuffer> {
  const hit = bufferCache.get(url)
  if (hit) return hit
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  const u8 = new Uint8Array(buf)
  if (u8.length < 4 || String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== 'glTF') {
    throw new Error('Not a GLB')
  }
  bufferCache.set(url, buf)
  return buf
}

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
  })
}

type Axis = 'x' | 'y' | 'z'

/** Thinnest AABB axis ≈ site up / gravity for a flat township model. */
function thinnestAxis(size: THREE.Vector3): Axis {
  if (size.y <= size.x && size.y <= size.z) return 'y'
  if (size.z <= size.x && size.z <= size.y) return 'z'
  return 'x'
}

/**
 * Reorient any export (Y-up / Z-up / X-up) so site up = +Y, centered at origin.
 * Then a camera looking down −Y is always a true nadir (map) view.
 */
function reorientSiteToYUp(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  let box = new THREE.Box3().setFromObject(root)
  let center = box.getCenter(new THREE.Vector3())
  let size = box.getSize(new THREE.Vector3())

  root.position.sub(center)
  root.updateMatrixWorld(true)

  // Up to 2 passes — after a bad first guess, re-measure and correct
  for (let i = 0; i < 2; i++) {
    box = new THREE.Box3().setFromObject(root)
    size = box.getSize(new THREE.Vector3())
    const up = thinnestAxis(size)
    if (up === 'y') break
    if (up === 'z') root.rotateX(-Math.PI / 2)
    else root.rotateZ(Math.PI / 2)
    root.updateMatrixWorld(true)
  }

  box = new THREE.Box3().setFromObject(root)
  center = box.getCenter(new THREE.Vector3())
  root.position.sub(center)
  root.updateMatrixWorld(true)

  // Longest ground extent → +X (roads more consistent across stages)
  box = new THREE.Box3().setFromObject(root)
  const size2 = box.getSize(new THREE.Vector3())
  if (size2.z > size2.x * 1.05) {
    root.rotateY(Math.PI / 2)
    root.updateMatrixWorld(true)
    box = new THREE.Box3().setFromObject(root)
    center = box.getCenter(new THREE.Vector3())
    root.position.sub(center)
    root.updateMatrixWorld(true)
  }
}

function applyYawAroundY(root: THREE.Object3D, yawDeg: number) {
  if (!yawDeg) return
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const c = box.getCenter(new THREE.Vector3())
  root.position.sub(c)
  root.rotateY(THREE.MathUtils.degToRad(yawDeg))
  root.updateMatrixWorld(true)
  const box2 = new THREE.Box3().setFromObject(root)
  const c2 = box2.getCenter(new THREE.Vector3())
  root.position.sub(c2)
  root.updateMatrixWorld(true)
}

/** Explicit nadir frame: +X right, −Z screen-up, look down −Y (no lookAt singularity). */
function setNadirCamera(cam: THREE.OrthographicCamera, center: THREE.Vector3, dist: number) {
  cam.position.set(center.x, center.y + dist, center.z)
  // Camera local: +X right, +Y up, −Z forward → world: +X, −Z, −Y
  const m = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 1, 0),
  )
  cam.quaternion.setFromRotationMatrix(m)
  cam.up.set(0, 0, -1)
  cam.updateMatrixWorld(true)
}

/**
 * True nadir orthographic capture of a stage GLB (map / bird’s-eye, not isometric).
 */
async function captureOrthoTopViewUnqueued(stageId: string, size: number): Promise<string> {
  const yaws = await loadYawMap()
  const yawDeg = yaws.get(stageId) ?? 0
  const cacheKey = `${ORTHO_CACHE_VER}:${stageId}:${yawDeg}`
  const cached = orthoImageCache.get(cacheKey)
  if (cached) return cached

  const url = driveModelUrlForStage(stageId)
  const buf = await loadGlbBuffer(url)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#d6d0c2')

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  })
  renderer.setSize(size, size)
  renderer.setPixelRatio(1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // Flat map look — avoid PBR env that reads as “3D slant”
  renderer.toneMapping = THREE.NoToneMapping

  scene.add(new THREE.AmbientLight(0xffffff, 1.35))
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc4b8a0, 0.4))
  const sun = new THREE.DirectionalLight(0xffffff, 0.2)
  sun.position.set(0, 100, 0)
  scene.add(sun)

  const root = await new Promise<THREE.Object3D>((resolve, reject) => {
    new GLTFLoader().parse(
      buf,
      '',
      (gltf) => resolve(gltf.scene),
      (err) => reject(err instanceof Error ? err : new Error(String(err))),
    )
  })
  scene.add(root)

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      if (mat) mat.side = THREE.DoubleSide
    }
  })

  reorientSiteToYUp(root)
  applyYawAroundY(root, yawDeg)

  const box = new THREE.Box3().setFromObject(root)
  const center = box.getCenter(new THREE.Vector3())
  const size3 = box.getSize(new THREE.Vector3())
  // Ground plane after reorient is XZ — full site in frame (zone UVs assume this)
  const half = Math.max(size3.x, size3.z, 1) * 0.5

  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 10000)
  const dist = Math.max(size3.y * 8, half * 4, 50)
  setNadirCamera(cam, center, dist)
  cam.updateProjectionMatrix()

  renderer.render(scene, cam)
  const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.92)
  orthoImageCache.set(cacheKey, dataUrl)

  scene.remove(root)
  disposeObject3D(root)
  renderer.dispose()
  // Brief yield so the GPU can reclaim the context before the next stage capture
  await new Promise((r) => setTimeout(r, 50))

  return dataUrl
}

/**
 * True nadir orthographic capture of a stage GLB (map / bird’s-eye, not isometric).
 * Dedupes + serializes so Then/Now slider can load two stages reliably.
 */
export async function captureOrthoTopView(stageId: string, size = 1280): Promise<string> {
  const yaws = await loadYawMap()
  const yawDeg = yaws.get(stageId) ?? 0
  const cacheKey = `${ORTHO_CACHE_VER}:${stageId}:${yawDeg}`
  const cached = orthoImageCache.get(cacheKey)
  if (cached) return cached

  const existing = orthoInflight.get(cacheKey)
  if (existing) return existing

  const job = new Promise<string>((resolve, reject) => {
    captureGate = captureGate
      .catch(() => {})
      .then(async () => {
        try {
          // Re-check cache after waiting in queue
          const hit = orthoImageCache.get(cacheKey)
          if (hit) {
            resolve(hit)
            return
          }
          try {
            resolve(await captureOrthoTopViewUnqueued(stageId, size))
          } catch {
            // One retry — first attempt sometimes fails after a prior renderer dispose
            await new Promise((r) => setTimeout(r, 120))
            resolve(await captureOrthoTopViewUnqueued(stageId, size))
          }
        } catch (e) {
          reject(e)
        }
      })
  }).finally(() => {
    orthoInflight.delete(cacheKey)
  })

  orthoInflight.set(cacheKey, job)
  return job
}

/** Drop in-memory ortho frames (e.g. after capture fix). */
export function clearOrthoImageCache() {
  orthoImageCache.clear()
}

type OrthoTopViewProps = {
  stageId: string
  label?: string
  className?: string
  /** How the captured ortho fills its box. Site-plan uses fill so overlays align. */
  fit?: 'contain' | 'cover' | 'fill'
  /** Hide the corner caption (cleaner map chrome). */
  hideCaption?: boolean
}

export function OrthoTopView({
  stageId,
  label,
  className,
  fit = 'contain',
  hideCaption = false,
}: OrthoTopViewProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const reqRef = useRef(0)

  useEffect(() => {
    const req = ++reqRef.current
    setLoading(true)
    setError(null)
    setSrc(null)
    void captureOrthoTopView(stageId)
      .then((url) => {
        if (req !== reqRef.current) return
        setSrc(url)
        setLoading(false)
      })
      .catch((e) => {
        if (req !== reqRef.current) return
        setError(e instanceof Error ? e.message : 'Capture failed')
        setLoading(false)
      })
  }, [stageId])

  return (
    <div className={cn('absolute inset-0 overflow-hidden bg-[#d6d0c2]', className)}>
      {src && (
        <img
          src={src}
          alt={label ?? `Top view ortho · ${stageId}`}
          className={cn(
            'h-full w-full',
            fit === 'contain' && 'object-contain',
            fit === 'cover' && 'object-cover',
            fit === 'fill' && 'object-fill',
          )}
          draggable={false}
        />
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#d6d0c2]/70">
          <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow">
            Capturing true top-down ortho…
          </div>
        </div>
      )}
      {error && !src && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-rose-700">
          Could not capture ortho from 3D model.
        </div>
      )}
      {!hideCaption && (
        <div className="pointer-events-none absolute right-2 bottom-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
          Top view (nadir) · {label ?? stageId}
        </div>
      )}
    </div>
  )
}
