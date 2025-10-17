"use client"

import { Button } from "@/components/button"
import { Input } from "@/components/input/input"
import { Modal } from "@/components/modal"
import { Message } from "@/components/message"
import { ChangeEvent, useState } from "react"
import { toast } from "sonner"
import { useWrapper } from "@/hooks/useWrapper"
import { getChainConfig } from "@/config/chain-config"
import { useChainId } from "wagmi"
import s from "./modal.module.scss"
import { getErrorMessage } from '@/utils/string';

interface ModalWrapperProps {
  title: string
  type: "wrap" | "unwrap"
  open: boolean
  setOpen: (open: boolean) => void
  setTokenChange: (e: { target: { value: string } }) => void
}

export const ModalWrapper = ({
  title,
  type,
  open,
  setOpen,
  setTokenChange
}: ModalWrapperProps) => {
  const [amount, setAmount] = useState("0")
  const { wrap, unwrap, feedback, resetFeedback, balance, wrappedBalance } = useWrapper({
    enableNativeBalance: type === "wrap",
    enableWrappedBalance: type === "unwrap"
  })
  const chainId = useChainId()
  const chainConfig = chainId ? getChainConfig(chainId) : undefined

  const handleSubmit = async () => {
    const toastId = toast.loading(`Sending ${type} transaction...`)
    try {
      resetFeedback()

      if (type === "wrap") {
        await wrap(amount)
      } else {
        await unwrap(amount)
      }

      toast.success(`${type === "wrap" ? "Wrap" : "Unwrap"} successful!`, {
        id: toastId
      })
      setAmount("0")
      if (type === "wrap" && chainConfig && chainConfig.wrapperContract) {
        setTokenChange({ target: { value: chainConfig?.wrapperContract } })
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err) || `Error during ${type}`, {
        id: toastId
      })
    }
  }

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const normalizedValue = inputValue.replace(",", ".")

    if (!/^[0-9.,]*$/.test(normalizedValue)) return

    if (normalizedValue === "0." || normalizedValue === "0,") {
      setAmount("0.")
      return
    }

    const cleaned = normalizedValue.replace(/^0+(?=\d)/, "")

    setAmount(cleaned === "" ? "0" : cleaned)
  }

  const amountNb = parseFloat(amount)
  const currentBalance = type === "wrap" ? balance : wrappedBalance
  const isDisabled = amountNb <= 0 || amountNb > parseFloat(currentBalance || "0")

  return (
    <Modal
      title={title}
      onClose={() => setOpen(false)}
      open={open}
      responsiveBottom
    >
      <Input
        icon={chainConfig?.iconName}
        label="Amount"
        type="text"
        value={amount}
        onChange={handleAmountChange}
        balance={parseFloat(currentBalance || "0")}
        showMaxButton
        onMaxClick={() => setAmount(currentBalance || "0")}
      />

      <div className={s.actions}>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isDisabled}>
          {type === "wrap"
            ? `Wrap ${chainConfig?.token} to ${chainConfig?.wrappedToken}`
            : `Unwrap ${chainConfig?.wrappedToken} to ${chainConfig?.token}`}
        </Button>
      </div>

      {feedback && feedback.message !== "" && (
        <Message
          title={`${type === "wrap" ? "Wrap" : "Unwrap"} feedback`}
          variant={feedback.status}
        >
          {feedback.message}
        </Message>
      )}
    </Modal>
  )
}
