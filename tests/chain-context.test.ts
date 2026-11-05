import { describe, expect, it, vi } from 'vitest'
import { shared } from '../src/composables/chainContext.js'

// `shared` is one load for every component that needs it. A network switch resets it and loads again; the load for the NEW network must be a
// new run, not the one that was already in flight for the old network (whose result the view has discarded).
const deferred = () => {
  let resolve!: (ok: boolean) => void
  const promise = new Promise<boolean>((r) => (resolve = r))
  return { promise, resolve }
}

describe('shared', () => {
  it('runs once for callers that arrive while a load is in flight, and not again once it succeeded', async () => {
    const run = vi.fn(async () => true)
    const s = shared(run, () => {})
    await Promise.all([s.load(), s.load()])
    await s.load()
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('does not remember a failure as done', async () => {
    const run = vi.fn(async () => false)
    const s = shared(run, () => {})
    await s.load()
    await s.load()
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('starts a new run for the new network when the network changed while a load was in flight', async () => {
    const first = deferred()
    const second = deferred()
    const run = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const clear = vi.fn()
    const s = shared(run, clear)
    const old = s.load() // the old network's load, in flight
    s.reset() // the network changed
    const fresh = s.load(true) // the new network's load
    expect(run).toHaveBeenCalledTimes(2)
    first.resolve(true) // the old answer arrives: it must not count as the new network's
    await old
    second.resolve(true)
    await fresh
    await s.load() // done for the new network: no third run
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('a late answer from the old network does not mark the new network done', async () => {
    const first = deferred()
    const second = deferred()
    const run = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValue(true)
    const s = shared(run, () => {})
    void s.load()
    s.reset()
    const fresh = s.load(true)
    first.resolve(true)
    await Promise.resolve()
    second.resolve(false) // the new network's load fails
    await fresh
    await s.load() // not done: it must try again
    expect(run).toHaveBeenCalledTimes(3)
  })
})
