/**
 * Strip AutoCAD MTEXT / TEXT formatting codes to plain readable labels.
 * e.g. `\pxqc;{\fCentury Gothic|b1|i0|c0|p34;Kitchen 13'-0" x 10'-0"}` → `Kitchen 13'-0" x 10'-0"`
 */
export function stripMtextFormatting(input: string): string {
  if (!input) return ''
  let s = String(input)

  // Protect literal backslashes
  s = s.replace(/\\\\/g, '\u0000')

  // Unicode codepoints
  s = s.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, hex: string) => {
    const n = parseInt(hex, 16)
    return Number.isFinite(n) ? String.fromCharCode(n) : ''
  })

  // Non-breaking space
  s = s.replace(/\\~/g, ' ')

  // Stacked fractions \S1#2; or \S1^2;
  s = s.replace(/\\S([^;]*);/gi, (_, inner: string) =>
    String(inner).replace(/[\^#]/g, '/'),
  )

  // Semicolon-terminated codes FIRST (before \P): \pxqc; \fFont|…; \H1.5; \C1; …
  s = s.replace(/\\[A-Za-z][^\\;{\n]*;/g, '')

  // Paragraph break — only bare \P / \p, not \px…
  s = s.replace(/\\P(?![a-zA-Z])/gi, '\n')

  // Single-letter toggles (underline / overline / strike)
  s = s.replace(/\\[LlOoKk]/g, '')

  // Grouping braces
  s = s.replace(/[{}]/g, '')

  // AutoCAD special characters
  s = s.replace(/%%[dD]/g, '°')
  s = s.replace(/%%[cC]/g, '⌀')
  s = s.replace(/%%[pP]/g, '±')
  s = s.replace(/%%%/g, '%')

  // Any leftover control sequences
  s = s.replace(/\\[A-Za-z]/g, '')

  // Orphaned fragments if a backslash was missing in the file (e.g. "xqc;")
  s = s.replace(/\bpx?[qclrji]\w*;/gi, '')
  s = s.replace(/\bf[^;]{0,80};/gi, '')

  s = s.replace(/\u0000/g, '\\')
  s = s.replace(/\n+/g, ' ').replace(/[ \t]+/g, ' ').trim()
  return s
}
