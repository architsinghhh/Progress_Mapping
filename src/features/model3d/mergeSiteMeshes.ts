import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

function attrSignature(geo: THREE.BufferGeometry): string {
  const keys = Object.keys(geo.attributes).sort()
  const parts = keys.map((k) => {
    const a = geo.getAttribute(k)
    return `${k}:${a.itemSize}:${a.normalized ? 1 : 0}`
  })
  return `${parts.join('|')}|idx=${geo.index ? 1 : 0}`
}

/** Normalize so mergeGeometries can combine CAD pieces that share a material. */
function prepareGeo(source: THREE.BufferGeometry, world: THREE.Matrix4): THREE.BufferGeometry {
  const g = source.clone()
  g.applyMatrix4(world)
  if (!g.getAttribute('normal')) g.computeVertexNormals()
  // Drop exotic attrs that block merges across exporter variants
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv' && name !== 'uv2' && name !== 'color') {
      g.deleteAttribute(name)
    }
  }
  g.morphAttributes = {}
  return g
}

function mergeChunked(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null
  if (geos.length === 1) return geos[0]

  const CHUNK = 200
  let level = geos
  while (level.length > 1) {
    const next: THREE.BufferGeometry[] = []
    for (let i = 0; i < level.length; i += CHUNK) {
      const slice = level.slice(i, i + CHUNK)
      if (slice.length === 1) {
        next.push(slice[0])
        continue
      }
      const merged = mergeGeometries(slice, false)
      if (merged) {
        for (const g of slice) {
          if (g !== merged) g.dispose()
        }
        next.push(merged)
      } else {
        // Attribute mismatch inside chunk — keep separate
        next.push(...slice)
      }
    }
    if (next.length >= level.length) {
      // No consolidation progress — stop
      break
    }
    level = next
  }

  if (level.length === 1) return level[0]

  // Final attempt across remaining
  const last = mergeGeometries(level, false)
  if (last) {
    for (const g of level) {
      if (g !== last) g.dispose()
    }
    return last
  }
  return null
}

/**
 * Collapse thousands of static CAD meshes into one mesh per material.
 * Stage 6: ~18k primitives → ~230 draw calls (same materials).
 */
export function mergeMeshesByMaterial(root: THREE.Object3D): THREE.Group {
  root.updateMatrixWorld(true)

  type Bucket = {
    material: THREE.Material
    bySig: Map<string, THREE.BufferGeometry[]>
  }
  const buckets = new Map<string, Bucket>()
  const leftovers: THREE.Mesh[] = []

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    if (mats.length !== 1 || !mats[0]) {
      leftovers.push(mesh)
      return
    }

    const mat = mats[0]
    const prepared = prepareGeo(mesh.geometry, mesh.matrixWorld)
    const sig = attrSignature(prepared)
    let bucket = buckets.get(mat.uuid)
    if (!bucket) {
      bucket = { material: mat, bySig: new Map() }
      buckets.set(mat.uuid, bucket)
    }
    const list = bucket.bySig.get(sig) ?? []
    list.push(prepared)
    bucket.bySig.set(sig, list)
  })

  const out = new THREE.Group()
  out.name = 'merged-site'

  for (const bucket of buckets.values()) {
    for (const geos of bucket.bySig.values()) {
      const merged = mergeChunked(geos)
      if (merged) {
        const m = new THREE.Mesh(merged, bucket.material)
        m.frustumCulled = true
        m.castShadow = false
        m.receiveShadow = false
        m.matrixAutoUpdate = false
        m.updateMatrix()
        out.add(m)
      } else {
        for (const g of geos) {
          const m = new THREE.Mesh(g, bucket.material)
          m.frustumCulled = true
          m.castShadow = false
          m.receiveShadow = false
          out.add(m)
        }
      }
    }
  }

  // Rare multi-material leftovers — keep as world-baked singles
  for (const mesh of leftovers) {
    const g = prepareGeo(mesh.geometry, mesh.matrixWorld)
    const mat = mesh.material
    const m = new THREE.Mesh(g, mat)
    m.frustumCulled = true
    out.add(m)
  }

  return out
}

export function countMeshes(root: THREE.Object3D): number {
  let n = 0
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) n += 1
  })
  return n
}
