// Library entry point. Hosts (e.g. the dashboard) import TreasuryView to render the
// treasury console inline against a shared wallet. TreasuryView self-imports its
// scoped qt.css, so no consumer needs this package's global CSS.
export { default as TreasuryView } from './TreasuryView.vue'
