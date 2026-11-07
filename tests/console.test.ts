// The console as a person reads it: a network with no recorded deployment is explained instead of shown as empty tabs; the Overview and the
// Activity tab spell out "checkpoint" and say plainly what could not be read. The composables are replaced by plain state.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const state = vi.hoisted(() => ({ net: null as unknown as { value: string } }))
vi.mock('../src/config.js', async () => {
  const { ref: vueRef } = await import('vue')
  state.net = vueRef('testnet')
  return { network: state.net, explorerNetwork: { value: 'testnet' }, INDEXER_URL: '' }
})

const feed = {
  events: ref([
    { type: 'AccessMinted', txDigest: 'tx1', checkpoint: '90000', address: '0xa' },
    { type: 'AccessConsumed', txDigest: 'tx2', checkpoint: null, address: '0xb' },
  ]),
  loading: ref(false),
  error: ref<string | null>(null),
  notice: ref<string | null>(null),
  lastRefresh: ref<Date | null>(null),
  indexedFromCheckpoint: ref<string | null>(null),
  reload: vi.fn(),
}
const settings = { config: ref({ treasury: '0x7e', commissionBps: 20 }), loading: ref(false), error: ref<string | null>(null), commissionPct: ref('0.20%') }
const gates = { gates: ref([]), loading: ref(false), error: ref<string | null>(null) }
const treasury = { balance: ref<bigint | null>(5n), loading: ref(false), error: ref<string | null>(null) }
vi.mock('../src/composables/useTreasuryActivity.js', () => ({ useTreasuryActivity: () => feed }))
vi.mock('../src/composables/usePlatformConfig.js', () => ({ usePlatformConfig: () => settings }))
vi.mock('../src/composables/useGates.js', () => ({ useGates: () => gates }))
vi.mock('../src/composables/useTreasury.js', () => ({ useTreasury: () => treasury }))
vi.mock('../src/composables/useEpoch.js', () => ({ useEpoch: () => ({ epoch: ref(742) }) }))

import TreasuryView from '../src/TreasuryView.vue'
import OverviewTab from '../src/tabs/OverviewTab.vue'
import ActivityTab from '../src/tabs/ActivityTab.vue'
import AccountsTab from '../src/tabs/AccountsTab.vue'

beforeEach(() => {
  state.net.value = 'testnet'
  feed.error.value = feed.notice.value = feed.indexedFromCheckpoint.value = null
  settings.error.value = gates.error.value = treasury.error.value = null
})

describe('TreasuryView', () => {
  it('shows the tabs on a network with a recorded deployment', () => {
    const w = mount(TreasuryView)
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(['Overview', 'Accounts', 'Activity'])
  })

  it('explains, with the network to switch to, where no deployment is recorded (and shows no tabs)', () => {
    state.net.value = 'mainnet'
    const w = mount(TreasuryView)
    expect(w.text()).toContain('The treasury is not available on mainnet. Switch to testnet.')
    expect(w.find('[role="tab"]').exists()).toBe(false)
  })
})

describe('Overview', () => {
  it('spells out "checkpoint" and uses plain labels', () => {
    const text = mount(OverviewTab).text()
    expect(text).toContain('checkpoint 90000')
    expect(text).toContain('checkpoint unknown')
    expect(text).not.toMatch(/ckpt/i)
    expect(text).toContain('Passes sold')
    expect(text).toContain('Passes used')
  })

  it('says once, in words, that something could not be read', () => {
    const message = 'The treasury cannot be read right now. Try again later.'
    settings.error.value = feed.error.value = message
    const w = mount(OverviewTab)
    expect(w.findAll('[role="alert"]').map((a) => a.text())).toEqual([message])
  })

  it('says when the event list is not the full history', () => {
    feed.notice.value = 'The event index is not available right now, so only recent events are listed. Try again later.'
    expect(mount(OverviewTab).find('[role="status"]').text()).toContain('only recent events are listed')
  })
})

describe('Activity', () => {
  it('names the column and explains what a checkpoint is', () => {
    feed.indexedFromCheckpoint.value = '88000'
    const w = mount(ActivityTab)
    const heads = w.findAll('th[scope="col"]').map((th) => th.text())
    expect(heads.some((h) => h.startsWith('Checkpoint'))).toBe(true)
    expect(heads.some((h) => h.startsWith('Block'))).toBe(false)
    expect(w.text()).toContain('Events are listed from checkpoint 88000 onward.')
    expect(w.text()).toContain('A checkpoint is a finalised batch of Sui transactions')
  })

  it('shows the plain error and the history note', () => {
    feed.error.value = 'The treasury cannot be read right now. Try again later.'
    feed.notice.value = 'The event index is not available right now, so only recent events are listed. Try again later.'
    const w = mount(ActivityTab)
    expect(w.find('[role="alert"]').text()).toBe(feed.error.value)
    expect(w.find('[role="status"]').text()).toContain('only recent events')
  })
})

describe('Accounts', () => {
  it('shows the commission as a percentage only', () => {
    const text = mount(AccountsTab).text()
    expect(text).toContain('0.20%')
    expect(text).not.toMatch(/bps/i)
  })

  it('says when the revenue sources cannot be read instead of an empty list', () => {
    gates.error.value = 'The treasury cannot be read right now. Try again later.'
    const w = mount(AccountsTab)
    expect(w.text()).toContain('The treasury cannot be read right now.')
    expect(w.text()).not.toContain('No gates found.')
  })
})
