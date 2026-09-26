# Security Policy

## Scope

This policy covers security issues in the `@meddleware/treasury-ui` application/library source (`src/**`)
— the read-only Treasury console, the `DaoView` library export, and the read composables
(`useTreasury`, `useGates`, `useDaoEvents`, `usePlatformConfig`, `useEpoch`, `useProposals`).

It does not cover:

- The `access_gate` on-chain package or `@mysten/sui` (see their own channels)
- `@meddleware/wallet-adapter` or the wallet extension

## Security model (invariants)

These invariants are load-bearing. A report demonstrating that any is violated is in scope and
treated as high severity:

1. **Read-only by default.** The default path signs and mutates nothing; chain reads are treated as
   display, never as authority.
2. **No dynamic HTML sinks.** Treasury/proposal/gate strings sourced from chain (which are
   attacker-influenceable) render as text; URLs are validated.
3. **No secret is a `VITE_*` value.** Network, RPC, and the access-gate package/config ids are all
   non-secret public config.
4. **Graceful degradation.** Event queries fail safe (a pruned/failing event type degrades rather
   than breaking the page); gate discovery via `AdminCap` ownership is pruning-resistant.

> When a future `vault_dao` proposals module adds wallet-signed DAO actions, this read-only model no
> longer applies and the app must be re-reviewed.

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
