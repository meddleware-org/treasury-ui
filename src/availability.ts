// What a person is told when the treasury cannot be shown. Nothing here names a build variable, a service or a missing setting: a person can
// do nothing about those, so they read what they can do (wait, or use another network). The technical cause goes to the console
// (`plainFailure` logs it) for the developer.
//
// Which networks to suggest comes from the deployment records (access-gate-client's `ACCESS_GATE_DEPLOYMENTS`), never from prose: a network
// with a recorded `access_gate` deployment is one the treasury can be read on, and a network without one is not offered.
import { ACCESS_GATE_DEPLOYMENTS } from '@meddleware/access-gate-client/deployments'
import { errorMessage } from '@meddleware/web-utils'

/** No `access_gate` deployment is recorded for the network. Not a fault: the treasury is simply not offered there. */
export class NotDeployedError extends Error {
  readonly network: string
  constructor(network: string) {
    super(`no access_gate deployment recorded for ${network}`)
    this.name = 'NotDeployedError'
    this.network = network
  }
}

/** The networks that have a recorded `access_gate` deployment, other than `net`. */
export function otherDeployedNetworks(net: string): string[] {
  return Object.keys(ACCESS_GATE_DEPLOYMENTS).filter((n) => n !== net)
}

/** True when a deployment is recorded for the network. */
export function isDeployed(net: string): boolean {
  return Object.hasOwn(ACCESS_GATE_DEPLOYMENTS, net)
}

/** "The treasury is not available on mainnet. Switch to testnet." (the networks offered come from the records). */
export function notAvailableOn(net: string): string {
  const others = otherDeployedNetworks(net)
  return `The treasury is not available on ${net}.${others.length ? ` Switch to ${others.join(' or ')}.` : ''}`
}

/** The network has a deployment but the chain cannot be read right now (the cause is in the console). */
export const UNREADABLE = 'The treasury cannot be read right now. Try again later.'

/** The event history comes from the node alone, which keeps only recent events. */
export const HISTORY_LIMITED = 'The event index is not available right now, so only recent events are listed. Try again later.'

const reported = new Set<string>()

/** Log a cause for the developer once per distinct cause (a refresh that fails the same way does not repeat itself). */
export function logCause(what: string, cause: string, level: 'error' | 'warn' = 'error'): void {
  const line = `treasury-ui: ${what} (${cause})`
  if (reported.has(line)) return
  reported.add(line)
  console[level](line)
}

/**
 * The words a person reads for a failed read of `what` ("the platform settings"): the not-offered-here message where no deployment is
 * recorded, otherwise the plain "cannot be read right now" with the technical cause written to the console.
 */
export function plainFailure(what: string, e: unknown): string {
  if (e instanceof NotDeployedError) return notAvailableOn(e.network)
  logCause(`reading ${what} failed`, errorMessage(e))
  return UNREADABLE
}

/** The distinct messages among several (a page that reads three things shows "cannot be read right now" once, not three times). */
export function distinct(...messages: (string | null)[]): string[] {
  return [...new Set(messages.filter((m): m is string => !!m))]
}
