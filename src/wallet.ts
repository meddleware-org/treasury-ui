// treasury-ui's wallet: the shared @meddleware/wallet-adapter singleton, bound to the selected network. Reads need no wallet connection.
import { createToolWallet } from '@meddleware/wallet-adapter'

export const { useWallet, getSuiClient } = createToolWallet({ requiredFeatures: ['sui:signPersonalMessage'] })
