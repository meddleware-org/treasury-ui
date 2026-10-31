// The shared accessibility sweep (WCAG 2.2 AA and AAA in every colour mode × season, reflow, text size, forced colours, reduced motion,
// keyboard) over each tab. The chain reads are refused offline, so the tabs show their empty and error states: the states a visitor
// meets first, and the ones a loaded page must not regress.
import { defineA11ySuite } from '@meddleware/frontend-config/a11y'
import { open } from './open.js'

defineA11ySuite({ overview: open('Overview'), accounts: open('Accounts'), activity: open('Activity') }, { aaa: 'gate' })
