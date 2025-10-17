import { CHAIN_COLORS } from "./constants"
import { heliosChain } from "./wagmi"
import { EXPLORER_URL, HELIOS_NETWORK_ID, RPC_URL_DEFAULT } from "./app"
import { getRpcUrl } from "./rpc"

export interface ChainConfig {
  id: string
  chainId: number
  name: string
  color: string
  iconName: string
  rpcUrl: string
  explorerUrl: string
  token?: string
  wrappedToken?: string
  wrapperContract?: string
  decimals?: number
}

export const CHAIN_CONFIG: Record<number, ChainConfig> = {
  [HELIOS_NETWORK_ID]: {
    id: "helios",
    chainId: heliosChain.id,
    name: "Helios",
    color: CHAIN_COLORS.helios,
    iconName: "helios",
    rpcUrl: typeof window !== "undefined" ? getRpcUrl() : RPC_URL_DEFAULT,
    explorerUrl: EXPLORER_URL
  },
  11155111: {
    id: "sepolia",
    chainId: 11155111,
    name: "Sepolia",
    color: CHAIN_COLORS.ethereum,
    iconName: "token:ethereum",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
    wrapperContract: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
    decimals: 18,
    token: "ETH",
    wrappedToken: "WETH"
  },
  80002: {
    id: "polygon-amoy",
    chainId: 80002,
    name: "Polygon Amoy",
    color: CHAIN_COLORS.polygon,
    iconName: "token:polygon",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    explorerUrl: "https://amoy.polygonscan.com",
    wrapperContract: "0xa5733b3a8e62a8faf43b0376d5faf46e89b3033e",
    decimals: 18,
    token: "POL",
    wrappedToken: "WPOL"
  },
  97: {
    id: "bsc-testnet",
    chainId: 97,
    name: "BSC Testnet",
    color: CHAIN_COLORS.bsc,
    iconName: "token:binance-smart-chain",
    rpcUrl: "https://bsc-testnet-rpc.publicnode.com",
    explorerUrl: "https://testnet.bscscan.com",
    wrapperContract: "0xc689bf5a007f44410676109f8aa8e3562da1c9ba",
    decimals: 18,
    token: "BNB",
    wrappedToken: "WBNB"
  },
  43113: {
    id: "avalanche-fuji",
    chainId: 43113,
    name: "Avalanche Fuji",
    color: CHAIN_COLORS.avalanche,
    iconName: "token:avax",
    rpcUrl: "https://avalanche-fuji-c-chain-rpc.publicnode.com",
    explorerUrl: "https://testnet.snowtrace.io",
    wrapperContract: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c",
    decimals: 18,
    token: "AVAX",
    wrappedToken: "WAVAX"
  }
}

export const getChainConfig = (chainId: number): ChainConfig | undefined => {
  return CHAIN_CONFIG[chainId]
}

export const isWrappableChain = (chainId: number): boolean => {
  return !!CHAIN_CONFIG[chainId]?.wrapperContract
}
