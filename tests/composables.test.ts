import { describe, it, expect, vi, beforeEach } from 'vitest'

// Read-only composables: mock the wallet client + build-time config so we exercise the merge/filter
// logic without a chain. onMounted does not fire outside a component, so we call `reload()` directly.
const { listEvents, getObject, listOwnedObjects } = vi.hoisted(() => ({
  listEvents: vi.fn(),
  getObject: vi.fn(),
  listOwnedObjects: vi.fn(),
}))
vi.mock('../src/wallet.js', () => ({ getSuiClient: () => ({ listEvents, getObject, listOwnedObjects }) }))
vi.mock('../src/config.js', () => ({ PACKAGE_ID: '0xpkg', CONFIG_ID: '0xcfg' }))

import { useTreasuryActivity } from '../src/composables/useTreasuryActivity.js'
import { useGates } from '../src/composables/useGates.js'

beforeEach(() => {
  listEvents.mockReset()
  getObject.mockReset()
  listOwnedObjects.mockReset()
})

describe('useTreasuryActivity — partial-failure merge', () => {
  it('degrades to the successful event type when one query rejects (pruned), error stays null', async () => {
    listEvents
      .mockRejectedValueOnce(new Error('event type pruned')) // AccessMinted query fails
      .mockResolvedValueOnce({
        events: [
          {
            eventType: '0xpkg::access_gate::AccessConsumedEvent',
            transactionDigest: 'd1',
            checkpoint: '5',
            json: { sender: '0xa' },
          },
        ],
      })
    const { events, error, reload } = useTreasuryActivity()
    await reload()
    expect(error.value).toBeNull()
    expect(events.value).toHaveLength(1)
    expect(events.value[0].type).toBe('AccessConsumed')
  })
})

describe('useGates — null-filter / missing-treasury', () => {
  it('returns no gates when the PlatformConfig has no treasury', async () => {
    getObject.mockResolvedValueOnce({ object: { json: {} } })
    const { gates, reload } = useGates()
    await reload()
    expect(gates.value).toEqual([])
  })

  it('filters out undefined gate ids and gates whose fetch throws', async () => {
    getObject
      .mockResolvedValueOnce({ object: { json: { treasury: '0xtreas' } } }) // config lookup
      .mockRejectedValueOnce(new Error('gate fetch failed')) // 0xbad → filtered
      .mockResolvedValueOnce({
        object: { json: { nft_name: 'Good', price_mist: '100', paused: false, frozen: false } },
      }) // 0xgood → kept
    listOwnedObjects.mockResolvedValueOnce({
      objects: [
        { json: { gate_id: 'undefined' } }, // filtered without a fetch
        { json: { gate_id: '0xbad' } },
        { json: { gate_id: '0xgood' } },
      ],
    })
    const { gates, reload } = useGates()
    await reload()
    expect(gates.value).toHaveLength(1)
    expect(gates.value[0].name).toBe('Good')
    expect(gates.value[0].id).toBe('0xgood')
  })
})
