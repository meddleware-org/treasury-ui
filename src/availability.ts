// What a person is told when the treasury cannot be shown. Nothing here names a build variable, a service or a missing setting: a person can
// do nothing about those, so they read what they can do (wait, or use another network). The technical cause goes to the console
// (`plainFailure` logs it) for the developer.
//
// Which networks to suggest comes from the deployment records (access-gate-client's `ACCESS_GATE_DEPLOYMENTS`), never from prose: a network
// with a recorded `access_gate` deployment is one the treasury can be read on, and a network without one is not offered.
import { isEventHistoryPruned } from '@meddleware/access-gate-client'
import { ACCESS_GATE_DEPLOYMENTS } from '@meddleware/access-gate-client/deployments'
import { errorMessage } from '@meddleware/web-utils'

/** No `access_gate` deployment is recorded for the network. Not a fault: the treasury is simply not offered there. */
export class NotDeployedError extends Error {
  // The network the error is about, so the words can name it.
  readonly network: string
  // Build the error for `network`.
  constructor(network: string) {
    // The message is for the developer; a person reads `notAvailableOn`.
    super(`no access_gate deployment recorded for ${network}`)
    // A stable name, so the error is recognised even across module copies.
    this.name = 'NotDeployedError'
    this.network = network
  }
}

/** The networks that have a recorded `access_gate` deployment, other than `net`. */
export function otherDeployedNetworks(net: string): string[] {
  // Every recorded network except the one asked about.
  return Object.keys(ACCESS_GATE_DEPLOYMENTS).filter((n) => n !== net)
}

/** True when a deployment is recorded for the network. */
export function isDeployed(net: string): boolean {
  // `hasOwn` (not `in`) so a prototype key such as `constructor` is never taken for a network.
  return Object.hasOwn(ACCESS_GATE_DEPLOYMENTS, net)
}

/** "The treasury is not available on mainnet. Switch to testnet." (the networks offered come from the records). */
export function notAvailableOn(net: string): string {
  // The networks to suggest instead; none are suggested when there is no other.
  const others = otherDeployedNetworks(net)
  return `The treasury is not available on ${net}.${others.length ? ` Switch to ${others.join(' or ')}.` : ''}`
}

/** The network has a deployment but the chain cannot be read right now (the cause is in the console). */
export const UNREADABLE = 'The treasury cannot be read right now. Try again later.'

/** The event history comes from the node alone, which keeps only recent events. */
export const HISTORY_LIMITED = 'The event index is not available right now, so only recent events are listed. Try again later.'

/** The network no longer keeps events this old and the event index could not supply them: older activity cannot be listed now. */
export const HISTORY_PRUNED = 'Older activity cannot be shown right now. Try again later.'

// The causes already logged, so a refresh that fails the same way is quiet.
const reported = new Set<string>()

/** Log a cause for the developer once per distinct cause (a refresh that fails the same way does not repeat itself). */
export function logCause(what: string, cause: string, level: 'error' | 'warn' = 'error'): void {
  // One line per distinct cause, prefixed with the app so it can be told apart in a shared console.
  const line = `treasury-ui: ${what} (${cause})`
  // Already logged: say nothing more.
  if (reported.has(line)) return
  // Remember it.
  reported.add(line)
  // Write for the developer, at the severity the caller chose.
  console[level](line)
}

/**
 * The words a person reads for a failed read of `what` ("the platform settings"): the not-offered-here message where no deployment is
 * recorded, otherwise the plain "cannot be read right now" with the technical cause written to the console.
 */
export function plainFailure(what: string, e: unknown): string {
  // Not a fault: the treasury is simply not offered on that network.
  if (e instanceof NotDeployedError) return notAvailableOn(e.network)
  // A public node that has pruned the history asked for is a known condition with its own plain words; the node's answer (the cause) is logged once.
  // The node has pruned the history asked for: a known condition with its own plain words.
  if (isEventHistoryPruned(e)) {
    // The node's answer is the cause; log it once as a warning.
    logCause(`reading ${what} failed: the node has pruned the history`, errorMessage((e as { cause?: unknown }).cause ?? e), 'warn')
    // Tell the person in plain words.
    return HISTORY_PRUNED
  }
  // Any other failure: the technical cause goes to the console only.
  logCause(`reading ${what} failed`, errorMessage(e))
  // The person reads the plain words and is told to try again.
  return UNREADABLE
}

/** The distinct messages among several (a page that reads three things shows "cannot be read right now" once, not three times). */
export function distinct(...messages: (string | null)[]): string[] {
  // A set keeps the first of each message; the filter drops the empty ones.
  return [...new Set(messages.filter((m): m is string => !!m))]
}
