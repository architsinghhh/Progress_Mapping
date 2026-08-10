import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import fs from 'fs'

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read('public/models/final_model.glb')

let stripped = 0
for (const mat of doc.getRoot().listMaterials()) {
  for (const key of ['KHR_materials_ior', 'KHR_materials_specular']) {
    if (mat.getExtension(key)) {
      mat.setExtension(key, null)
      stripped++
    }
  }
  const name = (mat.getName() || '').toLowerCase()
  const isGlass = /glass|water|pool|translucent|transparent/.test(name)
  const a = mat.getBaseColorFactor()[3]
  if (!isGlass && a >= 0.999) mat.setAlphaMode('OPAQUE')
}

await io.write('public/models/final_model.glb', doc)

// Drop stale extension declarations so loaders treat this as plain metal/rough
const root = doc.getRoot()
// re-read via binary patch for extensionsUsed
const b = fs.readFileSync('public/models/final_model.glb')
const n = b.readUInt32LE(12)
const json = JSON.parse(b.slice(20, 20 + n).toString('utf8'))
delete json.extensionsUsed
delete json.extensionsRequired
const modes = {}
for (const m of json.materials || []) {
  const k = m.alphaMode || 'OPAQUE'
  modes[k] = (modes[k] || 0) + 1
}

// Rewrite GLB JSON chunk
const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8')
const jsonPad = (4 - (jsonBuf.length % 4)) % 4
const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)])
const binChunkLen = b.readUInt32LE(12 + 8 + n)
const binStart = 12 + 8 + n + 8
const binChunk = b.subarray(binStart, binStart + binChunkLen)
const outJsonHeader = Buffer.alloc(8)
outJsonHeader.writeUInt32LE(jsonChunk.length, 0)
outJsonHeader.writeUInt32LE(0x4e4f534a, 4) // JSON
const outBinHeader = Buffer.alloc(8)
outBinHeader.writeUInt32LE(binChunk.length, 0)
outBinHeader.writeUInt32LE(0x004e4942, 4) // BIN
const totalLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length
const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0) // glTF
header.writeUInt32LE(2, 4)
header.writeUInt32LE(totalLength, 8)
fs.writeFileSync(
  'public/models/final_model.glb',
  Buffer.concat([header, outJsonHeader, jsonChunk, outBinHeader, binChunk]),
)
console.log({ stripped, extensionsUsed: undefined, modes, withBaseTex: (json.materials || []).filter((m) => m.pbrMetallicRoughness?.baseColorTexture).length })
