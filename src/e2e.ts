// End-to-end build only (`vite build --mode e2e`; main.ts loads this when MODE is `e2e` and VITE_E2E is `1`, both static, so every other
// build drops it). The chain client is a stub that holds a platform config, three gates the treasury administers, a balance, an epoch and a
// feed of access_gate events, so the console can be shown and checked WITH DATA (long addresses, a long gate name, a second page of
// events) without a network. `?chain=down` leaves the real client in place: with every outside request refused the reads fail, which is
// the page's error state. The data is built from the client's own wire shapes; tests/e2e-data.test.ts parses it with the client's parsers.
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'
import type { CoreEventEntry } from '@meddleware/access-gate-client'
import { createStubClient, installE2eWallet } from '@meddleware/wallet-adapter/testing'

const hex = (byte: string) => `0x${byte.repeat(32)}`

export const E2E_TREASURY = hex('7e')
/** The balance the stub reports for the treasury: MIST, and long enough to test the amount layout. */
export const E2E_BALANCE_MIST = '12345678901234'
export const E2E_EPOCH = '742'
export const E2E_GATES = { studio: hex('11'), open: hex('22'), annual: hex('33') } as const
export const E2E_LONG_NAME = 'Annual all-access pass for the partner programme (renewals, upgrades and the archive)'

/** A complete `Gate` object as the node's core API returns it (the client's parser rejects one with a missing field). */
function gate(over: Record<string, unknown>) {
  return {
    price_mist: '0',
    payment_recipient: E2E_TREASURY,
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
  }
}

/** The three gates, keyed by object id. */
export function e2eGates(): Record<string, Record<string, unknown>> {
  return {
    [E2E_GATES.studio]: gate({ price_mist: '50000000', default_uses: '10', nft_name: 'Studio pass', soulbound: true }),
    [E2E_GATES.open]: gate({ nft_name: 'Open pass', paused: true, free_fee_paid: true }),
    [E2E_GATES.annual]: gate({ price_mist: '2500000000000', default_uses: '365', nft_name: E2E_LONG_NAME, frozen: true }),
  }
}

export const E2E_PLATFORM = { version: '1', treasury: E2E_TREASURY, commission_bps: '20', min_commission_mist: '1000000', free_gate_fee_mist: '100000000' }

// --- BCS, by hand (the event layouts are small and fixed; @mysten/sui is kept out of src by the chain-access lint rule) ---
const address = (a: string) => Uint8Array.from(a.slice(2).match(/../g)!.map((b) => parseInt(b, 16)))
const u64 = (n: bigint) => {
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigUint64(0, n, true)
  return b
}
const bool = (v: boolean) => Uint8Array.of(v ? 1 : 0)
const bytes = (v: Uint8Array) => Uint8Array.of(...uleb(v.length), ...v) // vector<u8>
function uleb(n: number): number[] {
  const out: number[] = []
  do {
    out.push((n & 0x7f) | (n > 0x7f ? 0x80 : 0))
    n >>>= 7
  } while (n)
  return out
}
const cat = (...parts: Uint8Array[]) => Uint8Array.from(parts.flatMap((p) => [...p]))

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
/** A deterministic 44-character base58 string (a stand-in transaction digest), different for each `i`. */
function digest(i: number): string {
  let s = ''
  for (let k = 0; k < 44; k++) s += ALPHABET[(i * 7 + k * 13 + k * k) % ALPHABET.length]
  return s
}

/** `count` events, newest first, alternating sales and uses; checkpoints fall by 3 from 90000. */
export function e2eEvents(originalId: string, count = 26): CoreEventEntry[] {
  const out: CoreEventEntry[] = []
  for (let i = 0; i < count; i++) {
    const gateId = Object.values(E2E_GATES)[i % 3]!
    const person = hex((0x40 + (i % 24)).toString(16))
    const minted = i % 2 === 0
    const body = minted
      ? cat(address(hex('a0')), address(gateId), bool(false), u64(10n), address(person), u64(100000n), u64(1_762_000_000_000n - BigInt(i) * 60_000n))
      : cat(address(hex('a1')), address(gateId), bytes(Uint8Array.from({ length: 16 }, (_, k) => k + i)), address(person), u64(BigInt(9 - (i % 9))), u64(1_762_000_000_000n - BigInt(i) * 60_000n))
    out.push({
      eventType: `${originalId}::access_gate::${minted ? 'AccessMintedEvent' : 'AccessConsumedEvent'}`,
      sender: person,
      bcs: body,
      checkpoint: String(90000 - i * 3),
      transactionDigest: digest(i),
      eventIndex: 0,
    })
  }
  return out
}

export function installE2e(): void {
  // `?chain=down`: no stub, so the real client's reads are refused by the test (the error states).
  if (new URLSearchParams(location.search).get('chain') === 'down') {
    installE2eWallet({ client: null })
    return
  }
  const d = accessGateDeployment('testnet')
  const type = (name: string) => `${d.originalId}::access_gate::${name}`
  const object = (objectId: string, name: string, json: Record<string, unknown>) => ({ objectId, type: type(name), json })
  const gates = e2eGates()
  const objects: Record<string, unknown> = { [d.platformConfigId]: object(d.platformConfigId, 'PlatformConfig', E2E_PLATFORM) }
  for (const [id, json] of Object.entries(gates)) objects[id] = object(id, 'Gate', json)
  const owned = Object.keys(gates).map((id, i) => object(hex(`c${i}`), 'AdminCap', { gate_id: id }))
  const events = e2eEvents(d.originalId)
  const base = createStubClient({ owned, objects })
  // The reads this console makes beyond the shared stub's: the epoch, the balance and the event list (newest first, paged by `before`).
  const client = {
    ...base,
    getCurrentSystemState: async () => ({ systemState: { epoch: E2E_EPOCH } }),
    core: {
      ...base.core,
      getBalance: async () => ({ balance: { balance: E2E_BALANCE_MIST } }),
      listEvents: async ({ filter, limit = 50, before }: { filter?: { eventType: string }; limit?: number; before?: string | null }) => {
        const wanted = filter?.eventType.endsWith('Event') ? filter.eventType : null
        const all = events.filter((e) => !wanted || e.eventType === wanted)
        const start = before ? Number(before) : 0
        const page = all.slice(start, start + limit)
        const next = start + page.length
        return { events: page, hasNextPage: next < all.length, endCursor: next < all.length ? String(next) : null }
      },
    },
  }
  installE2eWallet({ client: client as unknown as ReturnType<typeof createStubClient> })
}
