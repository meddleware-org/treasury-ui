// The end-to-end build's stub chain (src/e2e.ts) is data in the client's wire shapes. If the client's parsers or event layouts change, the
// browser tests would show an empty page for the wrong reason; this keeps the stub honest by parsing every piece with the client's own parsers.
import { describe, expect, it } from 'vitest'
import { parseAccessGateEvent, parseAdminCap, parseGate, parsePlatformConfig } from '@meddleware/access-gate-client'
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'
import { E2E_GATES, E2E_LONG_NAME, E2E_PLATFORM, E2E_TREASURY, e2eEvents, e2eGates } from '../src/e2e.js'

const d = accessGateDeployment('testnet')
const object = (objectId: string, name: string, json: Record<string, unknown>) => ({ objectId, type: `${d.originalId}::access_gate::${name}`, json })

describe('the e2e stub chain parses with the client', () => {
  it('has a platform config the client accepts', () => {
    const c = parsePlatformConfig({ object: object(d.platformConfigId, 'PlatformConfig', E2E_PLATFORM) }, d.originalId)
    expect(c).toMatchObject({ treasury: E2E_TREASURY, commissionBps: 20n })
  })

  it('has three gates the client accepts, one with a very long name', () => {
    const parsed = Object.entries(e2eGates()).map(([id, json]) => parseGate({ object: object(id, 'Gate', json) }, d.originalId))
    expect(parsed.every((g) => g !== null)).toBe(true)
    expect(parsed.map((g) => g?.nftName)).toContain(E2E_LONG_NAME)
    expect(parsed.map((g) => g?.gateId)).toEqual(Object.values(E2E_GATES))
  })

  it('has admin caps the client accepts', () => {
    const cap = parseAdminCap({ object: object('0x' + 'c0'.repeat(32), 'AdminCap', { gate_id: E2E_GATES.studio }) }, d.originalId)
    expect(cap?.gateId).toBe(E2E_GATES.studio)
  })

  it('has events the client decodes strictly, alternating sales and uses, newest first, with unique digests', () => {
    const events = e2eEvents(d.originalId)
    const parsed = events.map((e) => parseAccessGateEvent(e, d.originalId))
    expect(parsed.every((e) => e !== null)).toBe(true)
    expect(parsed.slice(0, 4).map((e) => e?.kind)).toEqual(['AccessMinted', 'AccessConsumed', 'AccessMinted', 'AccessConsumed'])
    expect(new Set(events.map((e) => e.transactionDigest)).size).toBe(events.length)
    const checkpoints = events.map((e) => Number(e.checkpoint))
    expect(checkpoints).toEqual([...checkpoints].sort((a, b) => b - a))
    expect(events.length).toBeGreaterThan(20) // more than one page of the activity tab
  })
})
