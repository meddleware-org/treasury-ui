// F11: --warning is the bright yellow fill (2.0:1 on the light canvas), so it must never be a text colour;
// text uses --warning-text. The check reads every stylesheet and component, because the shared qt.css is
// exported with TreasuryView and a host would inherit a bad rule. It also checks that every custom
// property the app reads is one design-tokens defines (or the file defines itself): an undefined name
// falls through to a literal fallback that ignores the theme and season.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const tokenCss = readFileSync(require.resolve('@meddleware/design-tokens/tokens.css'), 'utf8')
const seasonCss = readFileSync(require.resolve('@meddleware/design-tokens/seasons.css'), 'utf8')
const declared = (css: string) => new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]!))
const defined = declared(tokenCss + seasonCss)

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sourceFiles(join(dir, e.name))
      : /\.(vue|css)$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  )
}

const files = sourceFiles(join(import.meta.dirname, '..', 'src'))

describe('design tokens in the app styles', () => {
  it('finds the components and stylesheets', () => {
    expect(files.length).toBeGreaterThan(0)
    expect(files.some((f) => f.endsWith('qt.css'))).toBe(true)
  })

  it.each(files)('%s never uses --warning as a text colour (use --warning-text)', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/(^|[^-])color:\s*var\(--warning\)/m)
  })

  it.each(files)('%s reads only properties design-tokens defines (or defines itself)', (file) => {
    const css = readFileSync(file, 'utf8')
    const own = declared(css)
    const used = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]!)
    expect(used.filter((name) => !defined.has(name) && !own.has(name))).toEqual([])
  })
})
