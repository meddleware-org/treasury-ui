import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { bcs } from '@mysten/sui/bcs'
import { normalizeSuiAddress } from '@mysten/sui/utils'

// The composables are thin wrappers over @meddleware/access-gate-client. Only the wallet's client
// (the core API) and the deployment are mocked; the real client parses objects and decodes events.
// onMounted does not fire outside a component, so each test calls `reload()` directly.
const { listEvents, getObject, listOwnedObjects, deployment } = vi.hoisted(() => ({
  listEvents: vi.fn(),
  getObject: vi.fn(),
  listOwnedObjects: vi.fn(),
  deployment: { current: null as null | { originalId: string; publishedAt: string; platformConfigId: string } },
}))
vi.mock('../src/wallet.js', () => ({ getSuiClient: () => ({ core: { listEvents, getObject, listOwnedObjects } }) }))
vi.mock('../src/config.js', () => ({
  network: ref('testnet'),
  INDEXER_URL: '',
  requireDeployment: () => {
    if (!deployment.current) throw new Error('no access_gate deployment recorded for mainnet')
    return deployment.current
  },
}))

import { useTreasuryActivity } from '../src/composables/useTreasuryActivity.js'
import { useGates } from '../src/composables/useGates.js'
import { usePlatformConfig } from '../src/composables/usePlatformConfig.js'

const PKG = normalizeSuiAddress('0xa1')
const CFG = normalizeSuiAddress('0xcf')
const TREASURY = normalizeSuiAddress('0x7e')
const BUYER = normalizeSuiAddress('0xb0')
const HOLDER = normalizeSuiAddress('0xc0')
const GATE = normalizeSuiAddress('0x9a')

const Minted = bcs.struct('AccessMintedEvent', {
  nft_id: bcs.Address, gate_id: bcs.Address, soulbound: bcs.bool(), initial_uses: bcs.u64(),
  recipient: bcs.Address, commission_mist: bcs.u64(), timestamp_ms: bcs.u64(),
})
const Consumed = bcs.struct('AccessConsumedEvent', {
  nft_id: bcs.Address, gate_id: bcs.Address, nonce: bcs.vector(bcs.u8()), consumer: bcs.Address,
  uses_after: bcs.u64(), timestamp_ms: bcs.u64(),
})
const ev = (name: string, bytes: Uint8Array, checkpoint: string, pkg = PKG) => ({
  eventType: `${pkg}::access_gate::${name}`, sender: HOLDER, bcs: bytes, checkpoint, transactionDigest: `tx${checkpoint}`, eventIndex: 0,
})
const minted = (checkpoint: string, pkg = PKG) =>
  ev('AccessMintedEvent', Minted.serialize({ nft_id: GATE, gate_id: GATE, soulbound: false, initial_uses: 1, recipient: BUYER, commission_mist: 1, timestamp_ms: 1 }).toBytes(), checkpoint, pkg)
const consumed = (checkpoint: string) =>
  ev('AccessConsumedEvent', Consumed.serialize({ nft_id: GATE, gate_id: GATE, nonce: [...Buffer.from('nonce-123')], consumer: HOLDER, uses_after: 0, timestamp_ms: 2 }).toBytes(), checkpoint)

const configObject = { object: { objectId: CFG, type: `${PKG}::access_gate::PlatformConfig`, json: { treasury: TREASURY, commission_bps: '20', min_commission_mist: '1000000', free_gate_fee_mist: '100000000' } } }

beforeEach(() => {
  listEvents.mockReset()
  getObject.mockReset()
  listOwnedObjects.mockReset()
  deployment.current = { originalId: PKG, publishedAt: PKG, platformConfigId: CFG }
})

describe('useTreasuryActivity', () => {
  it('shows the consumer of a consume and the recipient of a mint, newest first', async () => {
    listEvents.mockResolvedValueOnce({ events: [consumed('9'), minted('8')], hasNextPage: false, endCursor: null })
    const { events, error, reload } = useTreasuryActivity()
    await reload()
    expect(error.value).toBeNull()
    expect(events.value).toEqual([
      { type: 'AccessConsumed', txDigest: 'tx9', checkpoint: '9', address: HOLDER },
      { type: 'AccessMinted', txDigest: 'tx8', checkpoint: '8', address: BUYER },
    ])
  })

  it('drops events of a look-alike package', async () => {
    listEvents.mockResolvedValueOnce({ events: [minted('5', normalizeSuiAddress('0xa1a1'))], hasNextPage: false, endCursor: null })
    const { events, reload } = useTreasuryActivity()
    await reload()
    expect(events.value).toEqual([])
  })

  it('pages until the limit is reached', async () => {
    listEvents
      .mockResolvedValueOnce({ events: [minted('3')], hasNextPage: true, endCursor: 'c1' })
      .mockResolvedValueOnce({ events: [minted('2'), minted('1')], hasNextPage: true, endCursor: 'c2' })
    const { events, reload } = useTreasuryActivity(2)
    await reload()
    expect(events.value.map((e) => e.checkpoint)).toEqual(['3', '2'])
  })

  it('surfaces a missing deployment as an error', async () => {
    deployment.current = null
    const { error, reload } = useTreasuryActivity()
    await reload()
    expect(error.value).toMatch(/no access_gate deployment/)
    expect(listEvents).not.toHaveBeenCalled()
  })
})

describe('usePlatformConfig', () => {
  it('reads treasury and commission from the recorded PlatformConfig', async () => {
    getObject.mockResolvedValueOnce(configObject)
    const { config, reload } = usePlatformConfig()
    await reload()
    expect(getObject).toHaveBeenCalledWith({ objectId: CFG, include: { json: true } })
    expect(config.value).toEqual({ treasury: TREASURY, commissionBps: 20 })
  })

  it('refuses an object that is not this package\'s PlatformConfig', async () => {
    getObject.mockResolvedValueOnce({ object: { ...configObject.object, type: `${normalizeSuiAddress('0xa1a1')}::access_gate::PlatformConfig` } })
    const { config, error, reload } = usePlatformConfig()
    await reload()
    expect(config.value).toBeNull()
    expect(error.value).toMatch(/not an access_gate PlatformConfig/)
  })
})

describe('useGates', () => {
  it('lists the treasury\'s gates across pages and leaves out one that cannot be read', async () => {
    const cap = (id: string, gate: string) => ({ objectId: id, type: `${PKG}::access_gate::AdminCap`, json: { gate_id: gate } })
    listOwnedObjects
      .mockResolvedValueOnce({ objects: [cap('0x1', '0xbad')], hasNextPage: true, cursor: 'p2' })
      .mockResolvedValueOnce({ objects: [cap('0x2', GATE)], hasNextPage: false, cursor: null })
    getObject.mockImplementation(async ({ objectId }: { objectId: string }) => {
      if (objectId === CFG) return configObject
      if (objectId === '0xbad') throw new Error('gate fetch failed')
      return { object: { objectId, type: `${PKG}::access_gate::Gate`, json: { nft_name: 'Good', price_mist: '100', paused: false, frozen: true } } }
    })
    const { gates, error, reload } = useGates()
    await reload()
    expect(error.value).toBeNull()
    expect(gates.value).toEqual([{ id: GATE, name: 'Good', price: 100n, paused: false, frozen: true }])
    expect(listOwnedObjects).toHaveBeenCalledWith(expect.objectContaining({ owner: TREASURY, type: `${PKG}::access_gate::AdminCap` }))
  })
})
