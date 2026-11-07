// The shared accessibility sweep (WCAG 2.2 AA and AAA in every colour mode × season, reflow, text size, forced colours, reduced motion,
// keyboard) over each tab, WITH DATA: the e2e build's stub chain answers (a long treasury address, three gates with a very long name,
// a large balance, twenty-six events over two pages), so the tables and cards are checked as a visitor sees them. The same tabs with the
// reads refused (`?chain=down`) cover the error and empty states a visitor meets when the node is unreachable.
import { defineA11ySuite } from '@meddleware/frontend-config/a11y'
import { open, secondPage } from './open.js'

defineA11ySuite(
  {
    overview: open('Overview'),
    accounts: open('Accounts'),
    activity: open('Activity'),
    'activity page 2': secondPage,
    'overview (node down)': open('Overview', { down: true }),
    'accounts (node down)': open('Accounts', { down: true }),
    'activity (node down)': open('Activity', { down: true }),
  },
  { aaa: 'gate' },
)
