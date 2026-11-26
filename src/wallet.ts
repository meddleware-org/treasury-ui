// treasury-ui's wallet: the shared @meddleware/wallet-adapter singleton, bound to the selected network. Reads need no wallet connection.
import { createToolWallet } from '@meddleware/wallet-adapter'

// `useWallet` is the shared singleton; `getSuiClient` is the read client for the selected network (reads need no connected wallet).
export const { useWallet, getSuiClient } = createToolWallet({ requiredFeatures: ['sui:signPersonalMessage'] })
