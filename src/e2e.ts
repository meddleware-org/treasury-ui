// End-to-end build only (`vite build --mode e2e`; main.ts loads this when MODE is `e2e` and VITE_E2E is `1`, both static, so every other
// build drops it). The chain client is a stub that holds a platform config, three gates the treasury administers, a balance, an epoch and a
// feed of access_gate events, so the console can be shown and checked WITH DATA (long addresses, a long gate name, a second page of
// events) without a network. `?chain=down` leaves the real client in place: with every outside request refused the reads fail, which is
// the page's error state. The data is built from the client's own wire shapes; tests/e2e-data.test.ts parses it with the client's parsers.

// The recorded testnet deployment: the stub answers for its real ids, so the app's own lookups find them.
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'
// The shape of one event as the node's core API returns it.
import type { CoreEventEntry } from '@meddleware/access-gate-client'
// The shared stub client and the mock wallet installer from wallet-adapter's testing entry.
import { createStubClient, installE2eWallet } from '@meddleware/wallet-adapter/testing'

/** One repeated byte as a 32-byte hex id (`0x7e7e…`), so ids are recognisable in a screenshot. */
const hex = (byte: string) => `0x${byte.repeat(32)}`

/** The treasury address the stub reports. */
export const E2E_TREASURY = hex('7e')
/** The balance the stub reports for the treasury: MIST, and long enough to test the amount layout. */
export const E2E_BALANCE_MIST = '12345678901234'
/** The epoch the status bar shows. */
export const E2E_EPOCH = '742'
/** The three gates the treasury administers: a studio pass, an open pass and an annual pass. */
export const E2E_GATES = { studio: hex('11'), open: hex('22'), annual: hex('33') } as const
/** A long gate name, to check the table wraps it. */
export const E2E_LONG_NAME = 'Annual all-access pass for the partner programme (renewals, upgrades and the archive)'

/** A complete `Gate` object as the node's core API returns it (the client's parser rejects one with a missing field). */
function gate(over: Record<string, unknown>) {
  return {
    // Free, unpaused and unfrozen by default; a gate overrides what it needs.
    price_mist: '0',
    // Sales go to the treasury.
    payment_recipient: E2E_TREASURY,
    default_uses: '0',
    soulbound: false,
    auto_burn_at_zero: false,
    paused: false,
    frozen: false,
    nft_name: '',
    nft_image_url: '',
    nft_description: '',
    // The four policy flags, all off.
    policy: { freeze_requires_unpaused: false, lock_commission_on_freeze: false, pause_blocks_decryption: false, pause_blocks_access: false },
    locked_commission: null,
    free_fee_paid: false,
    // The gate's own fields win.
    ...over,
  }
}

/** The three gates, keyed by object id. */
export function e2eGates(): Record<string, Record<string, unknown>> {
  return {
    // A paid, soulbound pass with ten uses.
    [E2E_GATES.studio]: gate({ price_mist: '50000000', default_uses: '10', nft_name: 'Studio pass', soulbound: true }),
    // A free pass that is paused (its fee already paid).
    [E2E_GATES.open]: gate({ nft_name: 'Open pass', paused: true, free_fee_paid: true }),
    // A long-named, frozen pass at a large price, to test the amount layout.
    [E2E_GATES.annual]: gate({ price_mist: '2500000000000', default_uses: '365', nft_name: E2E_LONG_NAME, frozen: true }),
  }
}

/** The PlatformConfig object: a 0.20 % commission (20 basis points) with the treasury address. */
export const E2E_PLATFORM = { version: '1', treasury: E2E_TREASURY, commission_bps: '20', min_commission_mist: '1000000', free_gate_fee_mist: '100000000' }

// --- BCS, by hand (the event layouts are small and fixed; @mysten/sui is kept out of src by the chain-access lint rule) ---
// An address as its 32 bytes.
const address = (a: string) => Uint8Array.from(a.slice(2).match(/../g)!.map((b) => parseInt(b, 16)))
// A u64 in little-endian, as BCS writes it.
const u64 = (n: bigint) => {
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigUint64(0, n, true)
  return b
}
// A bool as one byte.
const bool = (v: boolean) => Uint8Array.of(v ? 1 : 0)
// A `vector<u8>`: its length as ULEB128, then the bytes.
const bytes = (v: Uint8Array) => Uint8Array.of(...uleb(v.length), ...v) // vector<u8>
/** ULEB128, the variable-length integer BCS uses for a vector's length: seven bits per byte, high bit set while more follow. */
function uleb(n: number): number[] {
  const out: number[] = []
  do {
    out.push((n & 0x7f) | (n > 0x7f ? 0x80 : 0))
    n >>>= 7
  } while (n)
  return out
}
// Concatenate byte arrays.
const cat = (...parts: Uint8Array[]) => Uint8Array.from(parts.flatMap((p) => [...p]))

// The Base58 alphabet Sui digests use.
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
/** A deterministic 44-character base58 string (a stand-in transaction digest), different for each `i`. */
function digest(i: number): string {
  let s = ''
  // A deterministic mix of the index and position; not a real hash, only a plausible string.
  for (let k = 0; k < 44; k++) s += ALPHABET[(i * 7 + k * 13 + k * k) % ALPHABET.length]
  return s
}

/** `count` events, newest first, alternating sales and uses; checkpoints fall by 3 from 90000. */
export function e2eEvents(originalId: string, count = 26): CoreEventEntry[] {
  const out: CoreEventEntry[] = []
  // Alternate sales and uses, spread over the three gates and a set of 24 people.
  for (let i = 0; i < count; i++) {
    // The gate this event is about.
    const gateId = Object.values(E2E_GATES)[i % 3]!
    // The buyer or the holder who used a pass.
    const person = hex((0x40 + (i % 24)).toString(16))
    // Even indexes are sales, odd ones uses.
    const minted = i % 2 === 0
    const body = minted
      // A sale: the pass, the gate, a soulbound flag, the uses, the recipient, the price and the time (newest first).
      ? cat(address(hex('a0')), address(gateId), bool(false), u64(10n), address(person), u64(100000n), u64(1_762_000_000_000n - BigInt(i) * 60_000n))
      // A use: the pass, the gate, the pass's key id, the owner, the uses left and the time.
      : cat(address(hex('a1')), address(gateId), bytes(Uint8Array.from({ length: 16 }, (_, k) => k + i)), address(person), u64(BigInt(9 - (i % 9))), u64(1_762_000_000_000n - BigInt(i) * 60_000n))
    // The event as the node returns it, with the checkpoint falling by 3 each step.
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

/** Install the mock wallet and the stub chain on the page (called from main.ts in the end-to-end build only). */
export function installE2e(): void {
  // `?chain=down`: no stub, so the real client's reads are refused by the test (the error states).
  // `?chain=down` leaves the real client in place so the console's error state can be shown.
  if (new URLSearchParams(location.search).get('chain') === 'down') {
    // No stub client: the real reads are refused by the test.
    installE2eWallet({ client: null })
    return
  }
  // The ids the app will look up.
  const d = accessGateDeployment('testnet')
  // A full Move type name in the original package.
  const type = (name: string) => `${d.originalId}::access_gate::${name}`
  // An object as the stub client returns it: id, type and fields.
  const object = (objectId: string, name: string, json: Record<string, unknown>) => ({ objectId, type: type(name), json })
  // The three gates, keyed by their object ids.
  const gates = e2eGates()
  // Every object the stub can return: the PlatformConfig and the gates.
  const objects: Record<string, unknown> = { [d.platformConfigId]: object(d.platformConfigId, 'PlatformConfig', E2E_PLATFORM) }
  // Add each gate.
  for (const [id, json] of Object.entries(gates)) objects[id] = object(id, 'Gate', json)
  // The AdminCaps the treasury owns, one per gate; they are how the console finds its gates.
  const owned = Object.keys(gates).map((id, i) => object(hex(`c${i}`), 'AdminCap', { gate_id: id }))
  // The event feed.
  const events = e2eEvents(d.originalId)
  // The shared stub, which already answers objects and owned-object lookups.
  const base = createStubClient({ owned, objects })
  // The reads this console makes beyond the shared stub's: the epoch, the balance and the event list (newest first, paged by `before`).
  // Add what this console reads beyond that.
  const client = {
    ...base,
    // The epoch, for the status bar.
    getCurrentSystemState: async () => ({ systemState: { epoch: E2E_EPOCH } }),
    core: {
      ...base.core,
      // The treasury balance, long enough to test the amount layout.
      getBalance: async () => ({ balance: { balance: E2E_BALANCE_MIST } }),
      // The event list, newest first, filtered by event type and paged with a `before` cursor.
      listEvents: async ({ filter, limit = 50, before }: { filter?: { eventType: string }; limit?: number; before?: string | null }) => {
        // A type filter names one event; a broader one (a module filter) returns both kinds.
        const wanted = filter?.eventType.endsWith('Event') ? filter.eventType : null
        const all = events.filter((e) => !wanted || e.eventType === wanted)
        // The page starts where the previous one ended.
        const start = before ? Number(before) : 0
        const page = all.slice(start, start + limit)
        const next = start + page.length
        return { events: page, hasNextPage: next < all.length, endCursor: next < all.length ? String(next) : null }
      },
    },
  }
  // Install the mock wallet and the stub client (cast: the stub's type is narrower than the client the app expects).
  installE2eWallet({ client: client as unknown as ReturnType<typeof createStubClient> })
}
