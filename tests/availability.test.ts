// What a person reads when the treasury cannot be shown: plain words, the networks to switch to taken from the deployment records.
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.doUnmock('@meddleware/access-gate-client/deployments')
  vi.resetModules()
})

/** The availability messages as they read when the records hold exactly these networks. */
async function withRecords(networks: string[]) {
  vi.resetModules()
  vi.doMock('@meddleware/access-gate-client/deployments', () => ({
    ACCESS_GATE_DEPLOYMENTS: Object.fromEntries(networks.map((n) => [n, { originalId: '0x1', publishedAt: '0x1', platformConfigId: '0x2' }])),
  }))
  return import('../src/availability.js')
}

describe('availability messages', () => {
  it('offer the other network that has a recorded deployment', async () => {
    const m = await withRecords(['testnet'])
    expect(m.notAvailableOn('mainnet')).toBe('The treasury is not available on mainnet. Switch to testnet.')
  })

  it('never offer the network the person is on, and drop the suggestion where there is no other', async () => {
    const m = await withRecords(['testnet'])
    expect(m.otherDeployedNetworks('testnet')).toEqual([])
    expect(m.notAvailableOn('testnet')).toBe('The treasury is not available on testnet.')
  })

  it('follow the records: once mainnet has a deployment it is offered from testnet and from a network without one', async () => {
    const m = await withRecords(['testnet', 'mainnet'])
    expect(m.notAvailableOn('localnet')).toBe('The treasury is not available on localnet. Switch to testnet or mainnet.')
    expect(m.isDeployed('mainnet')).toBe(true)
    expect(m.isDeployed('localnet')).toBe(false)
    expect(m.isDeployed('constructor')).toBe(false)
  })

  it('name no setting, script, file or service', async () => {
    const m = await withRecords(['testnet'])
    for (const text of [m.notAvailableOn('mainnet'), m.UNREADABLE, m.HISTORY_LIMITED]) expect(text).not.toMatch(/VITE_|operator|deployment|access_gate|indexer|configur|node\b/i)
  })

  it('turn a fault into the plain message and write the technical cause to the console once', async () => {
    const m = await withRecords(['testnet'])
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(m.plainFailure('the platform settings', new Error('gRPC 14 unavailable'))).toBe(m.UNREADABLE)
    m.plainFailure('the platform settings', new Error('gRPC 14 unavailable'))
    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith('treasury-ui: reading the platform settings failed (gRPC 14 unavailable)')
    log.mockRestore()
  })

  it('treat a missing deployment as "not offered here", not as a fault (nothing is logged)', async () => {
    const m = await withRecords(['testnet'])
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(m.plainFailure('the revenue events', new m.NotDeployedError('mainnet'))).toBe('The treasury is not available on mainnet. Switch to testnet.')
    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })

  it('show distinct messages once', async () => {
    const m = await withRecords(['testnet'])
    expect(m.distinct(m.UNREADABLE, null, m.UNREADABLE, 'x')).toEqual([m.UNREADABLE, 'x'])
  })
})
