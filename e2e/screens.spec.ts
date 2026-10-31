// Screenshots for LOOKING at the app (see @meddleware/frontend-config/shots). Run: npm run shots
import { defineShots } from '@meddleware/frontend-config/shots'
import { open } from './open.js'

defineShots({ overview: open('Overview'), accounts: open('Accounts'), activity: open('Activity') })
