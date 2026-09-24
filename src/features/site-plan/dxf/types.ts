/** Shared DXF model — simplified from ASI `types/dxfModel.ts`. */

export interface DxfPoint {
  x: number
  y: number
}

export interface DxfEntity {
  type: string
  layer: string
  color?: number
  paperSpace?: number
  [key: string]: unknown
}

export interface ParsedDxf {
  entities: DxfEntity[]
  layers: Record<string, { name: string; color?: number }>
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}
