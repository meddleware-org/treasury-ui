import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { bcs } from '@mysten/sui/bcs'
import { normalizeSuiAddress } from '@mysten/sui/utils'

// The composables are thin wrappers over @meddleware/access-gate-client. Only the wallet's client
// (the core API) and the deployment are mocked; the real client parses objects and decodes events.
// onMounted does not fire outside a component, so each test calls `reload()` directly.
const { listEvents, getObject, listOwnedObjects, getBalance, deployment, indexer } = vi.hoisted(() => ({
  indexer: { url: '' },
  listEvents: vi.fn(),
  getBalance: vi.fn(),
  getObject: vi.fn(),
  listOwnedObjects: vi.fn(),
  deployment: { current: null as null | { originalId: string; publishedAt: string; platformConfigId: string } },
}))
vi.mock('../src/wallet.js', () => ({ getSuiClient: () => ({ core: { listEvents, getObject, listOwnedObjects, getBalance } }) }))
vi.mock('../src/config.js', async () => {
  const { NotDeployedError } = await import('../src/availability.js')
  return {
    network: ref('testnet'),
    get INDEXER_URL() {
      return indexer.url
    },
    requireDeployment: () => {
      if (!deployment.current) throw new NotDeployedError('mainnet')
      return deployment.current
    },
  }
})

import { useTreasuryActivity } from '../src/composables/useTreasuryActivity.js'
import { useGates } from '../src/composables/useGates.js'
import { usePlatformConfig } from '../src/composables/usePlatformConfig.js'
import { useTreasury } from '../src/composables/useTreasury.js'

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

const configObject = { object: { objectId: CFG, type: `${PKG}::access_gate::PlatformConfig`, json: { version: '1', treasury: TREASURY, commission_bps: '20', min_commission_mist: '1000000', free_gate_fee_mist: '100000000' } } }

beforeEach(() => {
  listEvents.mockReset()
  getObject.mockReset()
  listOwnedObjects.mockReset()
  getBalance.mockReset()
  indexer.url = ''
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

  it('says in plain words that the treasury is not offered where no deployment is recorded, and reads nothing', async () => {
    deployment.current = null
    const { error, reload } = useTreasuryActivity()
    await reload()
    expect(error.value).toMatch(/^The treasury is not available on mainnet\./)
    expect(error.value).not.toMatch(/deployment|access_gate/)
    expect(listEvents).not.toHaveBeenCalled()
  })

  it('lists from the node and says the history is limited when the configured indexer cannot be used, logging the cause', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    indexer.url = 'https://indexer.invalid'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('indexer connection refused')))
    listEvents.mockResolvedValueOnce({ events: [minted('7')], hasNextPage: false, endCursor: null })
    const { events, error, notice, reload } = useTreasuryActivity()
    await reload()
    vi.unstubAllGlobals()
    expect(error.value).toBeNull()
    expect(events.value.map((e) => e.checkpoint)).toEqual(['7'])
    expect(notice.value).toBe('The event index is not available right now, so only recent events are listed. Try again later.')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('indexer connection refused'))
    warn.mockRestore()
  })

  it('has no note when no indexer is configured (the node is then the only source, by design)', async () => {
    listEvents.mockResolvedValueOnce({ events: [minted('7')], hasNextPage: false, endCursor: null })
    const { notice, reload } = useTreasuryActivity()
    await reload()
    expect(notice.value).toBeNull()
  })

  it('tells a person the treasury cannot be read right now and logs the cause for the developer', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    listEvents.mockRejectedValueOnce(new Error('503 upstream connect error'))
    const { error, reload } = useTreasuryActivity()
    await reload()
    expect(error.value).toBe('The treasury cannot be read right now. Try again later.')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('503 upstream connect error'))
    log.mockRestore()
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
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    getObject.mockResolvedValueOnce({ object: { ...configObject.object, type: `${normalizeSuiAddress('0xa1a1')}::access_gate::PlatformConfig` } })
    const { config, error, reload } = usePlatformConfig()
    await reload()
    expect(config.value).toBeNull()
    expect(error.value).toBe('The treasury cannot be read right now. Try again later.')
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/not an access_gate PlatformConfig/))
    log.mockRestore()
  })
})

/** A complete Gate `json` (access-gate-client's parser rejects one with a missing field). */
const gateJson = (over: Record<string, unknown>) => ({
  price_mist: '0',
  payment_recipient: TREASURY,
  default_uses: '0',
  soulbound: false,
  auto_burn_at_zero: false,
  paused: false,
  frozen: false,
  nft_name: '',
  nft_image_url: '',
  nft_description: '',
  policy: { freeze_requires_unpaused: false, lock_commission_on_freeze: false, pause_blocks_decryption: false, pause_blocks_access: false },
  locked_commission: null,
  free_fee_paid: false,
  ...over,
})

describe('useGates', () => {
  it('lists the treasury\'s gates across pages and leaves out one that cannot be read', async () => {
    const cap = (id: string, gate: string) => ({ objectId: id, type: `${PKG}::access_gate::AdminCap`, json: { gate_id: gate } })
    listOwnedObjects
      .mockResolvedValueOnce({ objects: [cap('0x1', '0xbad')], hasNextPage: true, cursor: 'p2' })
      .mockResolvedValueOnce({ objects: [cap('0x2', GATE)], hasNextPage: false, cursor: null })
    getObject.mockImplementation(async ({ objectId }: { objectId: string }) => {
      if (objectId === CFG) return configObject
      // access-gate-client hands back normalised ids.
      if (objectId === normalizeSuiAddress('0xbad')) throw new Error('gate fetch failed')
      return { object: { objectId, type: `${PKG}::access_gate::Gate`, json: gateJson({ nft_name: 'Good', price_mist: '100', paused: false, frozen: true }) } }
    })
    const { gates, error, reload } = useGates()
    await reload()
    expect(error.value).toBeNull()
    expect(gates.value).toEqual([{ id: GATE, name: 'Good', price: 100n, paused: false, frozen: true }])
    expect(listOwnedObjects).toHaveBeenCalledWith(expect.objectContaining({ owner: TREASURY, type: `${PKG}::access_gate::AdminCap` }))
  })
})

describe('useTreasury', () => {
  const flush = () => new Promise((r) => setTimeout(r, 0))
  const bal = (total: string, coins: string) => ({ balance: { coinType: '0x2::sui::SUI', balance: total, coinBalance: coins, addressBalance: String(BigInt(total) - BigInt(coins)) } })

  it('counts coin objects and the address balance', async () => {
    getBalance.mockResolvedValue(bal('15', '10'))
    const { balance, error } = useTreasury(() => TREASURY)
    await flush()
    expect(getBalance).toHaveBeenCalledWith({ owner: TREASURY, coinType: '0x2::sui::SUI' })
    expect(balance.value).toBe(15n)
    expect(error.value).toBeNull()
  })

  it('keeps the newest address when an older read resolves last', async () => {
    let resolveOld: (v: unknown) => void = () => {}
    getBalance.mockImplementationOnce(() => new Promise((r) => (resolveOld = r))).mockResolvedValueOnce(bal('2', '2'))
    const addr = ref<string | null>(BUYER)
    const { balance, loading } = useTreasury(() => addr.value)
    addr.value = TREASURY
    await nextTick()
    await flush()
    resolveOld(bal('1', '1'))
    await flush()
    expect(balance.value).toBe(2n)
    expect(loading.value).toBe(false)
  })

  it('clears while the address is unknown, and on a failed read', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    getBalance.mockResolvedValueOnce(bal('5', '5')).mockRejectedValueOnce(new Error('unavailable'))
    const addr = ref<string | null>(TREASURY)
    const { balance, error } = useTreasury(() => addr.value)
    await flush()
    expect(balance.value).toBe(5n)
    addr.value = null
    await nextTick()
    expect(balance.value).toBeNull()
    addr.value = BUYER
    await nextTick()
    await flush()
    expect(balance.value).toBeNull()
    expect(error.value).toBe('The treasury cannot be read right now. Try again later.')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('unavailable'))
    log.mockRestore()
  })
})
