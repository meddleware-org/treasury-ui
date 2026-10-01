import { getCurrentInstance, onMounted, watch } from 'vue'
import { network } from '../config.js'

/**
 * Load on mount and again whenever the network changes, clearing the previous network's data
 * first. Only inside a component (unit tests call `reload()` directly).
 */
export function onChainContext(load: () => Promise<void>, reset: () => void): void {
  if (!getCurrentInstance()) return
  onMounted(load)
  watch(network, () => {
    reset()
    void load()
  })
}

/** A guard against a slower, older load overwriting a newer one. */
export function latest(): () => () => boolean {
  let generation = 0
  return () => {
    const mine = ++generation
    return () => mine === generation
  }
}
