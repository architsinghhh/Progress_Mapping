/** ACI → hex (subset; matches ASI viewer defaults). */

const ACI: Record<number, string> = {
  1: '#dc2626',
  2: '#ca8a04',
  3: '#16a34a',
  4: '#0891b2',
  5: '#2563eb',
  6: '#c026d3',
  7: '#334155',
  8: '#64748b',
  9: '#94a3b8',
}

export function aciToHex(aci: number | undefined, fallback = '#475569'): string {
  if (aci == null) return fallback
  const n = Math.abs(Math.trunc(aci))
  if (!n || n === 256) return fallback
  return ACI[n] ?? fallback
}
