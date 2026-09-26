import { describe, it, expect } from 'vitest'
import { suiExplorerUrl } from '@meddleware/ui'

// Chain-supplied strings (treasury, gate id, event addresses) are rendered as ExplorerLink hrefs
// built by suiExplorerUrl. This asserts a hostile value cannot become an executable href — it is
// confined to an https path segment. Cross-ref ui-audit.md F1 (the guarantee lives in @meddleware/ui).
describe('suiExplorerUrl scheme safety (no chain string into a raw href)', () => {
  for (const evil of ['javascript:alert(1)', 'data:text/html,<script>x</script>']) {
    it(`keeps ${evil.slice(0, 12)}… as an https URL, never that scheme`, () => {
      const url = suiExplorerUrl('account', evil, 'testnet')
      expect(url.startsWith('https://')).toBe(true)
      expect(url.startsWith('javascript:')).toBe(false)
      expect(url.startsWith('data:')).toBe(false)
    })
  }
})
