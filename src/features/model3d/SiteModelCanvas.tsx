import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { cn } from '@/shared/lib/utils'
import { getOrFetchModelBuffer } from '@/features/model3d/model3dRemoteCache'
import { countMeshes, mergeMeshesByMaterial } from '@/features/model3d/mergeSiteMeshes'

const HEAVY_BYTES = 45 * 1024 * 1024
/** Township CAD exports often explode into 10k+ meshes — merge past this. */
const MERGE_MESH_THRESHOLD = 1500

/** Keep merged/parsed roots across stage switches (don't re-merge 18k meshes). */
const preparedRootCache = new Map<string, THREE.Object3D>()

function prepareMaterials(renderer: THREE.WebGLRenderer, root: THREE.Object3D, heavy: boolean) {
  const aniso = heavy ? 2 : Math.min(4, renderer.capabilities.getMaxAnisotropy())
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    mesh.frustumCulled = true
    mesh.castShadow = false
    mesh.receiveShadow = false
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      if (!mat) continue
      mat.side = THREE.DoubleSide
      for (const key of Object.keys(mat) as (keyof THREE.Material)[]) {
        const v = mat[key]
        if (v instanceof THREE.Texture) {
          v.anisotropy = aniso
          v.needsUpdate = true
        }
      }
      mat.needsUpdate = true
    }
  })
}

/** Freeze world matrices after framing — static site, less per-frame work (ASI-friendly). */
function freezeStaticTransforms(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  root.traverse((obj) => {
    obj.matrixAutoUpdate = false
  })
}

function fitIsometric(camera: THREE.PerspectiveCamera, controls: OrbitControls, object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object)
  if (box.isEmpty()) return

  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)

  const fov = (camera.fov * Math.PI) / 180
  const dist = Math.max(2, (maxDim * 0.62) / Math.tan(fov / 2))

  const dir = new THREE.Vector3(0.75, 0.95, 0.75).normalize()
  camera.position.copy(center).addScaledVector(dir, dist)
  camera.near = Math.max(0.05, dist / 400)
  camera.far = Math.max(2000, dist * 25)
  camera.updateProjectionMatrix()

  controls.target.copy(center)
  controls.minDistance = dist * 0.2
  controls.maxDistance = dist * 3.5
  controls.update()
}

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
  })
}

type SiteModelCanvasProps = {
  modelUrl?: string | null
  blank?: boolean
  label?: string
  autoRotate?: boolean
  className?: string
  fitKey?: number
  /** Pause GPU work when hidden (ASI `active` pattern). */
  active?: boolean
  performance?: 'auto' | 'balanced' | 'quality'
  /**
   * When false (compare panes), never attach a shared scene root —
   * each canvas clones from the prepared template so two viewports can't steal meshes.
   */
  isolateScene?: boolean
}

/**
 * ASI-aligned viewer: keep WebGL context alive across stage swaps, session/disk byte cache,
 * parse shared ArrayBuffer (no copy), demand-render while idle.
 */
export function SiteModelCanvas({
  modelUrl,
  blank = false,
  label = 'model',
  autoRotate = false,
  className,
  fitKey = 0,
  active = true,
  performance = 'auto',
  isolateScene = false,
}: SiteModelCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [glReady, setGlReady] = useState(false)
  const [loading, setLoading] = useState(!blank)
  const [optimizing, setOptimizing] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const autoRotateRef = useRef(autoRotate)
  autoRotateRef.current = autoRotate
  const activeRef = useRef(active)
  activeRef.current = active
  const performanceRef = useRef(performance)
  performanceRef.current = performance
  const ownsGeometryRef = useRef(false)

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const invalidateRef = useRef<() => void>(() => {})
  const syncSizeRef = useRef<() => void>(() => {})
  const heavyRef = useRef(false)

  // Fit camera on demand
  useEffect(() => {
    if (fitKey > 0 && modelRef.current && cameraRef.current && controlsRef.current) {
      fitIsometric(cameraRef.current, controlsRef.current, modelRef.current)
      invalidateRef.current()
    }
  }, [fitKey])

  // Create WebGL context once (ASI: don't tear down on close / stage change)
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let disposed = false
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#f3f4f6')
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 8000)
    camera.position.set(40, 50, 40)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.toneMappingExposure = 1.35
    renderer.sortObjects = true
    Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' })
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const syncSize = () => {
      const w = Math.max(1, mount.clientWidth)
      const h = Math.max(1, mount.clientHeight)
      const mode = performanceRef.current
      const pr =
        mode === 'quality'
          ? Math.min(1.75, window.devicePixelRatio || 1)
          : heavyRef.current || mode === 'balanced'
            ? Math.min(1.25, window.devicePixelRatio || 1)
            : Math.min(1.75, window.devicePixelRatio || 1)
      renderer.setPixelRatio(pr)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      invalidate()
    }
    syncSizeRef.current = syncSize

    const pmrem = new THREE.PMREMGenerator(renderer)
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envRT.texture
    scene.environmentIntensity = 0.65

    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd4d4d8, 0.7))
    const key = new THREE.DirectionalLight(0xffffff, 0.85)
    key.position.set(40, 80, 30)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.35)
    fill.position.set(-30, 40, -20)
    scene.add(fill)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2.02
    controlsRef.current = controls

    let needsRender = true
    let interacting = false
    const invalidate = () => {
      needsRender = true
    }
    invalidateRef.current = invalidate

    controls.addEventListener('start', () => {
      interacting = true
      invalidate()
    })
    controls.addEventListener('end', () => {
      interacting = false
      invalidate()
    })
    controls.addEventListener('change', invalidate)

    let raf = 0
    const tick = () => {
      if (disposed) return
      // ASI: skip GPU work when viewer not active
      if (!activeRef.current) {
        raf = requestAnimationFrame(tick)
        return
      }
      controls.autoRotate = autoRotateRef.current
      controls.autoRotateSpeed = 1.2
      const moved = controls.update()
      if (needsRender || moved || interacting || autoRotateRef.current) {
        renderer.render(scene, camera)
        if (!autoRotateRef.current && !moved && !interacting) needsRender = false
      }
      raf = requestAnimationFrame(tick)
    }
    tick()

    const ro = new ResizeObserver(() => syncSize())
    ro.observe(mount)
    syncSize()
    setGlReady(true)

    return () => {
      disposed = true
      setGlReady(false)
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      if (modelRef.current) {
        scene.remove(modelRef.current)
        // Clones share template geometries — never dispose here
        modelRef.current = null
      }
      scene.environment = null
      envRT.dispose()
      pmrem.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement)
      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
      controlsRef.current = null
    }
    // performance only used for initial PR policy via heavyRef / balanced at load time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pause/resume when active flips
  useEffect(() => {
    if (active) invalidateRef.current()
  }, [active])

  // Swap model without destroying WebGL (ASI keep-mounted pattern)
  useEffect(() => {
    if (!glReady) return
    const scene = sceneRef.current
    const camera = cameraRef.current
    const renderer = rendererRef.current
    const controls = controlsRef.current
    if (!scene || !camera || !renderer || !controls) return

    let cancelled = false
    setError(null)
    setProgress(null)
    setOptimizing(false)

    const clearModel = () => {
      if (modelRef.current) {
        scene.remove(modelRef.current)
        if (ownsGeometryRef.current) disposeObject3D(modelRef.current)
        modelRef.current = null
        ownsGeometryRef.current = false
      }
    }

    const attachRoot = (root: THREE.Object3D, ownsGeometry: boolean) => {
      clearModel()
      ownsGeometryRef.current = ownsGeometry
      modelRef.current = root
      scene.add(root)
      syncSizeRef.current()
      root.traverse((o) => {
        o.matrixAutoUpdate = true
      })
      fitIsometric(camera, controls, root)
      freezeStaticTransforms(root)
      invalidateRef.current()
    }

    const buildBlank = () => {
      scene.background = new THREE.Color('#e8e0d0')
      const root = new THREE.Group()
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 90),
        new THREE.MeshStandardMaterial({ color: '#cbb896', roughness: 0.95, metalness: 0.02 }),
      )
      ground.rotation.x = -Math.PI / 2
      root.add(ground)
      const grid = new THREE.GridHelper(120, 24, 0x8a7a5c, 0xb5a682)
      grid.position.y = 0.02
      root.add(grid)
      attachRoot(root, true)
      setLoading(false)
    }

    void (async () => {
      try {
        if (blank || !modelUrl) {
          setLoading(true)
          buildBlank()
          return
        }

        setLoading(true)
        scene.background = new THREE.Color('#f3f4f6')

        const cacheKey = `${modelUrl}|p`

        // Shared template cache — always clone into this canvas (safe for dual compare panes)
        if (!isolateScene) {
          const template = preparedRootCache.get(cacheKey)
          if (template) {
            attachRoot(template.clone(true), false)
            heavyRef.current = template.userData.heavy === true
            syncSizeRef.current()
            setLoading(false)
            return
          }
        }

        const buf = await getOrFetchModelBuffer(modelUrl, (pct) => {
          if (!cancelled) setProgress(pct)
        })
        if (cancelled) return

        // quality = sharp DPR for compare; auto still drops DPR slightly on huge files
        heavyRef.current =
          performance === 'balanced' ||
          (performance === 'auto' && buf.byteLength >= HEAVY_BYTES)
        scene.environmentIntensity = heavyRef.current ? 0.5 : 0.65
        renderer.toneMappingExposure = heavyRef.current ? 1.25 : 1.35
        renderer.sortObjects = !heavyRef.current
        syncSizeRef.current()

        await new Promise<void>((resolve, reject) => {
          new GLTFLoader().parse(
            buf,
            '',
            (gltf) => {
              void (async () => {
                try {
                  if (cancelled) {
                    resolve()
                    return
                  }

                  let root: THREE.Object3D = gltf.scene
                  prepareMaterials(renderer, root, heavyRef.current)

                  const meshes = countMeshes(root)
                  if (meshes >= MERGE_MESH_THRESHOLD) {
                    setOptimizing(true)
                    setProgress(null)
                    await new Promise<void>((r) => setTimeout(r, 40))
                    if (cancelled) {
                      resolve()
                      return
                    }
                    const merged = mergeMeshesByMaterial(root)
                    disposeObject3D(root)
                    root = merged
                    prepareMaterials(renderer, root, heavyRef.current)
                    setOptimizing(false)
                  }

                  if (cancelled) {
                    resolve()
                    return
                  }

                  root.userData.heavy = heavyRef.current

                  if (!isolateScene) {
                    if (!preparedRootCache.has(cacheKey)) {
                      preparedRootCache.set(cacheKey, root)
                    }
                    attachRoot(root.clone(true), false)
                  } else {
                    attachRoot(root, true)
                  }

                  requestAnimationFrame(() => {
                    if (cancelled || !modelRef.current) return
                    syncSizeRef.current()
                    modelRef.current.traverse((o) => {
                      o.matrixAutoUpdate = true
                    })
                    fitIsometric(camera, controls, modelRef.current)
                    freezeStaticTransforms(modelRef.current)
                    invalidateRef.current()
                  })
                  setLoading(false)
                  resolve()
                } catch (err) {
                  setOptimizing(false)
                  reject(err instanceof Error ? err : new Error(String(err)))
                }
              })()
            },
            (err) => reject(err instanceof Error ? err : new Error(String(err))),
          )
        })
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load model')
          setLoading(false)
          setOptimizing(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [glReady, modelUrl, blank, performance, isolateScene])

  return (
    <div className={cn('absolute inset-0 h-full w-full min-h-[280px]', className)}>
      <div ref={mountRef} className="absolute inset-0" />
      {(loading || optimizing) && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#f3f4f6]/70">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow">
            {optimizing ? `Optimizing ${label}…` : `Loading ${label}…`}
            <div className="mt-1 text-[10px] font-medium text-slate-400">
              {optimizing
                ? 'Merging meshes for smooth orbit'
                : progress != null
                  ? `${progress}%`
                  : 'Preparing view…'}
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f3f4f6] p-4">
          <div className="max-w-md rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs text-rose-700 shadow">
            <div className="font-semibold">Could not load 3D model</div>
            <div className="mt-1 text-[11px] text-rose-600/90">Please try again in a moment.</div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute right-2 bottom-2 z-10 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
        {blank ? 'Blank site · drag to orbit' : 'Drag to orbit · scroll zoom'}
      </div>
    </div>
  )
}
