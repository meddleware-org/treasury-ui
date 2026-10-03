# Security Policy

## Scope

This policy covers security issues in the `@meddleware/treasury-ui` application/library source (`src/**`)
— the read-only Treasury console, the `TreasuryView` library export, and the read composables
(`useTreasury`, `useGates`, `useTreasuryActivity`, `usePlatformConfig`, `useEpoch`).

It does not cover:

- The `access_gate` on-chain package or `@mysten/sui` (see their own channels)
- `@meddleware/wallet-adapter` or the wallet extension

## Security model (invariants)

These invariants are load-bearing. A report demonstrating that any is violated is in scope and
treated as high severity:

1. **Read-only by default.** The default path signs and mutates nothing; chain reads are treated as
   display, never as authority.
2. **No dynamic HTML sinks.** Treasury, gate and event strings sourced from chain (which are
   attacker-influenceable) render as text; URLs are validated.
3. **No secret is a `VITE_*` value.** The network and the optional indexer URL are public config;
   the access-gate ids come from the published `deployments`, not from the build.
4. **Graceful degradation.** Event history fails safe (an error is shown, the rest of the page
   renders; the optional indexer falls back to the full node); gate discovery via `AdminCap`
   ownership is pruning-resistant, and an unreadable gate is left out rather than failing the list.
5. **Exact types.** Objects and events are accepted only at the deployment's original id
   (`@meddleware/access-gate-client`), so a look-alike package cannot feed the console.

> If wallet-signed actions are ever added, this read-only model no longer applies and the app must
> be re-reviewed.

## Supported versions

Only the latest published version receives security fixes.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities. Report by emailing
**<security@meddleware.co.uk>** with a description, reproduction/PoC if available, and the version or
commit SHA tested. You will receive an acknowledgement within **3 business days** and a resolution
plan within **14 days** for confirmed issues; Critical issues (CVSS ≥ 9.0) are prioritised for
same-day acknowledgement.

## Disclosure

Once a fix is released, a security advisory will be published on the GitHub repository. Reporters may
be credited by name unless they prefer to remain anonymous.
