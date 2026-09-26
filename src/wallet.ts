// Thin treasury-ui shim over the shared @meddleware/wallet-adapter singleton.
// Wallet is used for signing only (future signing). All chain reads are done
// via a bare SuiClient so no wallet connection is required to view treasury/proposals/history.
import {
  useWallet as useWalletBase,
  getSuiClient as getSuiClientBase,
  useNetwork,
} from '@meddleware/wallet-adapter'

const { network, rpcUrl } = useNetwork()

export function getSuiClient() {
  return getSuiClientBase(network.value, rpcUrl.value)
}

export function useWallet() {
  const base = useWalletBase({ requiredFeatures: ['sui:signPersonalMessage'] })
  return {
    account: base.account,
    connecting: base.connecting,
    connect: base.connect,
    disconnect: base.disconnect,
    getSuiClient,
  }
}
