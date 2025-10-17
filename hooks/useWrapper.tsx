import { useState } from "react"
import { useAccount, useChainId } from "wagmi"
import { ethers } from "ethers"
import { useWeb3Provider } from "./useWeb3Provider"
import { getErrorMessage } from "@/utils/string"
import { Feedback } from "@/types/feedback"
import { wrapperAbi } from "@/constant/helios-contracts"
import { CHAIN_CONFIG, isWrappableChain } from "@/config/chain-config"
import { useQuery } from "@tanstack/react-query"
import { secondsToMilliseconds } from "@/utils/number"

export const useWrapper = (options?: { enableNativeBalance?: boolean; enableWrappedBalance?: boolean }) => {
  const { address } = useAccount()
  const chainId = useChainId()
  const web3Provider = useWeb3Provider()
  const [feedback, setFeedback] = useState<Feedback>({
    status: "primary",
    message: ""
  })
  const chainConfig = CHAIN_CONFIG[chainId]
  const WRAPPER_CONTRACT_ADDRESS = chainConfig?.wrapperContract
  const decimals = chainConfig?.decimals || 18
  const isWrappable = isWrappableChain(chainId)
  
  const { enableNativeBalance = true, enableWrappedBalance = true } = options || {}

  const { data: balance = "0" } = useQuery({
    queryKey: ["nativeBalance", address, chainId],
    queryFn: async () => {
      if (!web3Provider || !address) return "0"
      const balance = await web3Provider.eth.getBalance(address)
      return ethers.formatUnits(balance, decimals)
    },
    enabled: enableNativeBalance && !!web3Provider && !!address && !!chainId,
    refetchInterval: secondsToMilliseconds(60)
  })

  const { data: wrappedBalance = "0" } = useQuery({
    queryKey: ["wrappedBalance", address, chainId, WRAPPER_CONTRACT_ADDRESS],
    queryFn: async () => {
      if (!web3Provider || !address || !WRAPPER_CONTRACT_ADDRESS) return "0"
      const contract = new web3Provider.eth.Contract(
        wrapperAbi,
        WRAPPER_CONTRACT_ADDRESS
      )
      const balance = await contract.methods.balanceOf(address).call() as string
      return ethers.formatUnits(balance, decimals)
    },
    enabled: enableWrappedBalance && !!web3Provider && !!address && !!chainId && !!WRAPPER_CONTRACT_ADDRESS,
    refetchInterval: secondsToMilliseconds(60)
  })

  const resetFeedback = () => {
    setFeedback({ status: "primary", message: "" })
  }

  const wrap = async (amount: string) => {
    if (!web3Provider) throw new Error("No wallet connected")
    try {
      const wrapAmount = ethers.parseUnits(amount, decimals)

      setFeedback({ status: "primary", message: "Wrap in progress..." })
      const contract = new web3Provider.eth.Contract(
        wrapperAbi,
        WRAPPER_CONTRACT_ADDRESS
      )

      await contract.methods.deposit().call({
        from: address,
        value: wrapAmount.toString(),
        gas: "1500000"
      })

      const tx = await contract.methods.deposit().send({
        from: address,
        value: wrapAmount.toString(),
        gas: "1500000"
      })

      setFeedback({
        status: "primary",
        message: `Transaction sent, waiting for confirmation...`
      })

      const receipt = await web3Provider.eth.getTransactionReceipt(
        tx.transactionHash
      )

      setFeedback({
        status: "success",
        message: (
          <>
            Successfully wrapped{" "}
            <b>
              {amount} {chainConfig?.wrappedToken}
            </b>{" "}
            !<br />
            Wrapped token address: <code>{WRAPPER_CONTRACT_ADDRESS}</code>
          </>
        )
      })

      return receipt
    } catch (error: any) {
      setFeedback({
        status: "danger",
        message: getErrorMessage(error) || "Error during wrap"
      })
      throw error
    }
  }

  const unwrap = async (amount: string) => {
    if (!web3Provider) throw new Error("No wallet connected")
    try {
      const unwrapAmount = ethers.parseUnits(amount, decimals)

      setFeedback({ status: "primary", message: "Unwrap in progress..." })
      const contract = new web3Provider.eth.Contract(
        wrapperAbi,
        WRAPPER_CONTRACT_ADDRESS
      )

      await contract.methods.withdraw(unwrapAmount).call({
        from: address,
        gas: "1500000"
      })

      const tx = await contract.methods.withdraw(unwrapAmount).send({
        from: address,
        gas: "1500000"
      })

      setFeedback({
        status: "primary",
        message: `Transaction sent, waiting for confirmation...`
      })

      const receipt = await web3Provider.eth.getTransactionReceipt(
        tx.transactionHash
      )

      setFeedback({
        status: "success",
        message: (
          <>
            Successfully unwrapped{" "}
            <b>
              {amount} {chainConfig?.token}
            </b>{" "}
            !<br />
            Transaction hash: <code>{tx.transactionHash}</code>
          </>
        )
      })

      return receipt
    } catch (error: any) {
      setFeedback({
        status: "danger",
        message: getErrorMessage(error) || "Error during unwrap"
      })
      throw error
    }
  }

  return {
    isWrappable,
    wrap,
    unwrap,
    feedback,
    resetFeedback,
    balance,
    wrappedBalance
  }
}
