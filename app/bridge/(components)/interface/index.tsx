"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { Modal } from "@/components/modal"
import { formatNumber } from "@/lib/utils/number"
import clsx from "clsx"
import Image from "next/image"
import { ChangeEvent, useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import s from "./interface.module.scss"
import { useBridge } from "@/hooks/useBridge"
import { HyperionChain } from "@/types/hyperion"
import { getLogoByHash, getChainIcon } from "@/utils/url"
import { useAccount, useChainId, useSwitchChain } from "wagmi"
// import { TokenDenom } from "@/types/denom"
import { useTokenInfo } from "@/hooks/useTokenInfo"
import { HELIOS_NETWORK_ID } from "@/config/app"
import { useQuery } from "@tanstack/react-query"
import { toHex } from "viem"
import { getTokensByChainIdAndPageAndSize } from "@/helpers/rpc-calls"
import { useTokenRegistry } from "@/hooks/useTokenRegistry"
import { Message } from "@/components/message"
import { useChains } from "@/hooks/useChains"
import { ModalWrapper } from "../wrapper/modal"
import { useWrapper } from "@/hooks/useWrapper"
import { getChainConfig } from "@/config/chain-config"
import { getErrorMessage } from "@/utils/string"
import { useWhitelistedAssets } from "@/hooks/useWhitelistedAssets"
import { TokenSearchModal } from "./token-search-modal"

type BridgeForm = {
  asset: string | null
  from: HyperionChain | null
  to: HyperionChain | null
  amount: string
  address: string
  inProgress: boolean
}

export const Interface = () => {
  const chainId = useChainId()
  const { chains, heliosChainIndex } = useChains()
  const { assets, isLoading: whitelistedAssetsLoading } = useWhitelistedAssets()
  const {
    sendToChain,
    sendToHelios,
    feedback: bridgeFeedback
  } = useBridge()
  const { switchChain } = useSwitchChain()
  const { address } = useAccount()
  const [openChain, setOpenChain] = useState(false)
  const [chainType, setChainType] = useState<"from" | "to">("from")
  const [openWrapModal, setOpenWrapModal] = useState(false)
  const [openUnwrapModal, setOpenUnwrapModal] = useState(false)
  const [openTokenSearch, setOpenTokenSearch] = useState(false)
  
  const { isWrappable } = useWrapper({
    enableNativeBalance: openWrapModal,
    enableWrappedBalance: openUnwrapModal
  })
  const [form, setForm] = useState<BridgeForm>({
    asset: null,
    from: null,
    to: null,
    amount: "0",
    address: address || "",
    inProgress: false
  })
  const [failedChainIcons, setFailedChainIcons] = useState<Set<string>>(new Set())
  const tokenInfo = useTokenInfo(form.asset)
  const { getTokenByAddress } = useTokenRegistry()
  const chainConfig = chainId ? getChainConfig(chainId) : undefined

  const qTokensByChain = useQuery({
    queryKey: ["tokensByChain", form.to?.chainId],
    queryFn: () =>
      getTokensByChainIdAndPageAndSize(form.to!.chainId, toHex(1), toHex(5)),
    enabled: !!form.to,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  })

  const qEnrichedTokensByChain = useQuery({
    queryKey: [
      "enrichedTokensByChain",
      qTokensByChain.data,
      form.from?.chainId
    ],
    queryFn: async () => {
      // Limit to first 3 tokens to reduce load
      const tokensToEnrich = qTokensByChain.data!.slice(0, 3)
      const results = await Promise.all(
        tokensToEnrich.map((token) =>
          getTokenByAddress(token.metadata.contract_address, form.from!.chainId)
        )
      )

      return results.filter((v) => v !== null)
    },
    enabled: !!form.from && !!qTokensByChain.data?.length,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  })

  const tokensByChain = qEnrichedTokensByChain.data || []
  // const estimatedFees = (parseFloat(form.amount) / 100).toString()
  const estimatedFees = "0.5"
  const isDeposit = heliosChainIndex
    ? form.to?.chainId === chains[heliosChainIndex].chainId
    : false

  const displayedChains =
    chainType === "to"
      ? chains.filter((chain) => chain.chainId !== form.from?.chainId)
      : chains

  // Function to check if a token is whitelisted
  const isTokenWhitelisted = useCallback((tokenAddress: string): boolean => {
    // Don't show stars while loading whitelisted assets
    if (whitelistedAssetsLoading) return false
    
    const isWhitelisted = assets.some((asset) => 
      asset.contractAddress.toLowerCase() === tokenAddress.toLowerCase()
    )
    
    return isWhitelisted
  }, [whitelistedAssetsLoading, assets])

  // Function to get origin chain icon URL
  const getOriginChainIconUrl = useCallback((originBlockchain: string) => {
    const chainId = parseInt(originBlockchain)
    return getChainIcon(chainId)
  }, [])

  // Function to get origin chain name
  const getOriginChainName = useCallback((originBlockchain: string) => {
    const chainId = parseInt(originBlockchain)
    const chainConfig = getChainConfig(chainId)
    return chainConfig?.name || `Chain ${chainId}`
  }, [])



  // Function to handle chain icon load error
  const handleChainIconError = useCallback((originBlockchain: string) => {
    setFailedChainIcons(prev => new Set(prev).add(originBlockchain))
  }, [])

  const lightResetForm = useCallback(() => {
    setForm((prevForm) => ({
      ...prevForm,
      asset: null,
      amount: "0"
    }))
  }, [])

  const handleOpenChain = (type: "from" | "to") => {
    setChainType(type)
    setOpenChain(true)
  }

  const handleChangeChain = (
    chain: HyperionChain,
    forceChainType?: "from" | "to"
  ) => {
    if (
      (chainType === "from" || forceChainType === "from") &&
      chain.chainId !== form.from?.chainId
    ) {
      switchChain({ chainId: chain.chainId })
      setOpenChain(false)

      return
    }

    setForm({
      ...form,
      to: chain,
      amount: "0",
      asset: null
    })
    setOpenChain(false)
  }

  const handleSwap = () => {
    if (form.to) {
      handleChangeChain(form.to, "from")
    }
  }

  const handleFocusInput = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.querySelector("input")?.focus()
    }
  }

  const handleMaxAmount = () => {
    setForm({
      ...form,
      amount: tokenInfo.data?.readableBalance.toString() || "0"
    })
  }

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(form.address)
    toast.success("Address copied to clipboard")
  }

  const handleTokenSearchChange = (e: { target: { value: string } }) => {
    const value = e.target.value
    setForm({ ...form, asset: value, amount: "0" })
  }



  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const normalizedValue = inputValue.replace(",", ".")

    if (!/^[0-9.,]*$/.test(normalizedValue)) return

    if (normalizedValue === "0." || normalizedValue === "0,") {
      setForm({ ...form, amount: "0." })
      return
    }

    const cleaned = normalizedValue.replace(/^0+(?=\d)/, "")

    setForm({ ...form, amount: cleaned === "" ? "0" : cleaned })
  }

  const handleSubmit = async () => {
    if (!form.from || !form.to || !form.asset) {
      toast.error("Missing chain or token information.")
      return
    }

    if (!tokenInfo.data) {
      toast.error("Token not found or not loaded.")
      return
    }

    if (parseFloat(form.amount) <= 0) {
      toast.error("Amount must be greater than zero.")
      return
    }

    if (!form.address || !/^0x[a-fA-F0-9]{40}$/.test(form.address)) {
      toast.error("Invalid recipient address.")
      return
    }

    setForm({ ...form, inProgress: true })

    const toastId = toast.loading("Sending cross-chain transaction...")
    try {
      const decimals = tokenInfo.data.decimals

      if (form.to.chainId === HELIOS_NETWORK_ID) {
        await sendToHelios(
          form.from.chainId,
          form.address,
          form.asset,
          form.amount,
          estimatedFees,
          decimals
        )
      } else {
        await sendToChain(
          form.to.chainId,
          form.address,
          form.asset,
          form.amount,
          estimatedFees,
          decimals
        )
      }

      toast.success("Bridge transaction sent successfully!", {
        id: toastId
      })

      lightResetForm()
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to send bridge transaction.", {
        id: toastId
      })
    }
    setForm({ ...form, inProgress: false })
  }

  useEffect(() => {
    if (chains.length < 2) return
    lightResetForm()

    const currentChainIndex = chains.findIndex(
      (chain) => chain.chainId === chainId
    )
    const heliosIndex = heliosChainIndex ?? 0

    const from = chains[currentChainIndex]
    let to = chains[heliosIndex]

    if (heliosIndex === currentChainIndex) {
      to = chains.find((_, i) => i !== currentChainIndex) || chains[0]
    }

    setForm((prevForm) => ({
      ...prevForm,
      from,
      to
    }))
  }, [chains, heliosChainIndex, chainId, lightResetForm])

  const amountNb = parseFloat(form.amount)
  const heliosInOrOut =
    form.from?.chainId === HELIOS_NETWORK_ID ||
    form.to?.chainId === HELIOS_NETWORK_ID
  const chainIsPaused = form.to?.paused || false
  const isDisabled =
    form.inProgress ||
    !tokenInfo.data ||
    amountNb === 0 ||
    (tokenInfo.data && amountNb > tokenInfo.data.readableBalance) ||
    !form.address ||
    form.from?.chainId === form.to?.chainId ||
    !heliosInOrOut ||
    chainIsPaused

  return (
    <>
      <Card className={s.interface}>
        <Heading
          icon="hugeicons:exchange-02"
          title="Cross-Chain Bridge"
          description="Exchange your assets between chains."
        />
        <div className={s.content}>
          <div className={s.form}>
            {/* <div
              className={clsx(s.input, s.inputToken)}
              onClick={() => setOpenToken(true)}
            >
              <div className={s.symbol}>
                {form.asset && form.asset.metadata.logo !== "" && (
                  <Image
                    src={getLogoByHash(form.asset.metadata.logo)}
                    alt=""
                    width={28}
                    height={28}
                  />
                )}
              </div>
              <p className={s.value}>{form.asset?.metadata.name}</p>
              <label htmlFor="amount" className={s.label}>
                Choose the cross-chain bridge asset
              </label>
              <Icon icon="hugeicons:arrow-right-01" className={s.arrow} />
            </div> */}
            <div className={clsx(s.input, s.inputToken)}>
              <input
                id="token"
                className={s.value}
                type="text"
                value={form.asset || ""}
                placeholder="Enter the token address"
                onChange={handleTokenSearchChange}
              />
              {tokenInfo.data && (
                <div className={s.inputTokenFound}>
                  <Icon icon="hugeicons:checkmark-circle-02" />
                  {tokenInfo.data.symbol} ({tokenInfo.data.name})
                </div>
              )}

              {tokenInfo.isNotFound && (
                <div className={s.inputTokenNotFound}>
                  <Icon icon="hugeicons:help-circle" />
                  Token not found
                </div>
              )}
              <label htmlFor="token" className={s.label}>
                Token address
              </label>
            </div>
            {isWrappable && chainConfig && (
              <div className={s.wrap}>
                <div className={s.wrapLabel}>
                  Want to use your native {chainConfig.token} token ?
                </div>
                <div className={s.wrapAction}>
                  {chainConfig.wrapperContract && (
                    <Button
                      variant="secondary"
                      size="xsmall"
                      onClick={() =>
                        handleTokenSearchChange({
                          target: {
                            value: chainConfig.wrapperContract!
                          }
                        })
                      }
                    >
                      Use {chainConfig.wrappedToken}
                    </Button>
                  )}

                  <Button
                    variant="success"
                    size="xsmall"
                    onClick={() => setOpenWrapModal(true)}
                  >
                    Wrap
                  </Button>
                  <Button
                    variant="warning"
                    size="xsmall"
                    onClick={() => setOpenUnwrapModal(true)}
                  >
                    Unwrap
                  </Button>
                </div>
              </div>
            )}
            {tokensByChain.length > 0 && (
              <div className={s.bestTokens}>
                <div className={s.bestTokensLabel}>Available tokens :</div>
                <div className={s.bestTokensList}>
                  <Button
                      variant="secondary"
                      size="xsmall"
                      onClick={() => setOpenTokenSearch(true)}
                      className={s.searchButton}
                    >
                      <Icon icon="hugeicons:search-02" />
                    </Button>
                  {tokensByChain.slice(0, 3).map((token) => (
                    <Button
                      iconLeft={
                        token.display.logo === ""
                          ? token.display.symbolIcon
                          : undefined
                      }
                      key={token.functionnal.address}
                      variant="secondary"
                      size="xsmall"
                      onClick={() =>
                        handleTokenSearchChange({
                          target: {
                            value: token.functionnal.address
                          }
                        })
                      }
                    >
                      <div className={s.tokenContainer}>
                        {token.display.logo !== "" && (
                          <div className={s.tokenIconWrapper}>
                            <Image
                              src={token.display.logo}
                              alt=""
                              width={16}
                              height={16}
                            />
                            {!failedChainIcons.has(token.originBlockchain) && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getOriginChainIconUrl(token.originBlockchain)}
                                alt=""
                                width={12}
                                height={12}
                                className={s.originChainIcon}
                                onError={() => handleChainIconError(token.originBlockchain)}
                              />
                            )}
                          </div>
                        )}
                        {token.display.logo === "" && (
                          <div className={s.tokenIconWrapper}>
                            <Icon 
                              icon={token.display.symbolIcon} 
                              className={s.tokenIcon}
                            />
                            {!failedChainIcons.has(token.originBlockchain) && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getOriginChainIconUrl(token.originBlockchain)}
                                alt=""
                                width={12}
                                height={12}
                                className={s.originChainIcon}
                                onError={() => handleChainIconError(token.originBlockchain)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                      {token.display.symbol.toUpperCase()} - {getOriginChainName(token.originBlockchain)}
                      {isTokenWhitelisted(token.functionnal.address) && (
                        <span className={s.whitelistedIcon}>⭐</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {form.from && form.to && (
              <div className={s.swap}>
                <div
                  className={clsx(s.swapInput, s.from)}
                  onClick={() => handleOpenChain("from")}
                >
                  <label htmlFor="from" className={s.swapLabel}>
                    From
                  </label>
                  <div className={s.symbol}>
                    {form.from.logo !== "" && (
                      <Image
                        src={getLogoByHash(form.from.logo)}
                        alt=""
                        width={28}
                        height={28}
                      />
                    )}
                  </div>
                  <input
                    className={s.swapValue}
                    value={form.from.name}
                    readOnly
                  />
                  <Icon
                    icon="hugeicons:arrow-down-01"
                    className={s.swapArrow}
                  />
                </div>
                <button onClick={handleSwap} className={s.swapButton}>
                  <Icon icon="hugeicons:arrow-right-02" />
                </button>
                <div
                  className={clsx(s.swapInput, s.to)}
                  onClick={() => handleOpenChain("to")}
                >
                  <label htmlFor="to" className={s.swapLabel}>
                    To
                  </label>
                  <div className={s.symbol}>
                    {form.to.logo !== "" && (
                      <Image
                        src={getLogoByHash(form.to.logo)}
                        alt=""
                        width={28}
                        height={28}
                      />
                    )}
                  </div>
                  <input
                    className={s.swapValue}
                    value={form.to.name}
                    readOnly
                  />
                  <Icon
                    icon="hugeicons:arrow-down-01"
                    className={s.swapArrow}
                  />
                </div>
              </div>
            )}

            {!heliosInOrOut && (
              <Message title="Bridge warning" variant={"warning"}>
                Helios Network needs to be selected as a bridge chain.
                Cross-chain bridge is not yet available.
              </Message>
            )}
            {chainIsPaused && (
              <Message title="Chain paused" variant={"warning"}>
                The destination chain is currently paused. Please try again
                later.
              </Message>
            )}
            <div
              className={clsx(s.input, s.inputAmount)}
              onClick={handleFocusInput}
            >
              <input
                id="amount"
                className={s.value}
                type="text"
                value={form.amount}
                onChange={handleAmountChange}
              />
              <label htmlFor="amount" className={s.label}>
                Amount
                {tokenInfo.data && (
                  <small>
                    Balance: {formatNumber(tokenInfo.data?.readableBalance, 6)}{" "}
                    {tokenInfo.data.symbol}
                  </small>
                )}
              </label>
              <Button
                variant="secondary"
                className={s.max}
                size="xsmall"
                onClick={handleMaxAmount}
              >
                Max
              </Button>
            </div>
            <div
              className={clsx(s.input, s.inputAddress)}
              onClick={handleFocusInput}
            >
              <input
                id="address"
                className={s.value}
                type="text"
                placeholder="Enter your address"
                value={form.address}
                onChange={(e) => {
                  const value = e.target.value
                  setForm({ ...form, address: value })
                }}
              />
              <label htmlFor="address" className={s.label}>
                Deposit Address
              </label>
              <Button
                variant="secondary"
                className={s.btn}
                size="xsmall"
                icon="hugeicons:copy-01"
                onClick={handleCopyAddress}
              />
            </div>
          </div>
          <div className={s.recap}>
            <div className={s.recapItem}>
              <span>Estimated Fees:</span>
              <strong>
                {isDeposit ? (
                  "No Fees"
                ) : (
                  <>
                    {/* <small>~1% =</small> */}
                    {/* {estimatedFees} {tokenInfo.data?.symbol} */}
                    {estimatedFees} HLS
                  </>
                )}
              </strong>
            </div>
            <div className={s.recapItem}>
              <span>You will receive:</span>
              <strong>
                {form.amount} {tokenInfo.data?.symbol}
              </strong>
            </div>
          </div>
          {bridgeFeedback && bridgeFeedback.message !== "" && (
            <Message title="Bridge feedback" variant={bridgeFeedback.status}>
              {bridgeFeedback.message}
            </Message>
          )}
          <Button
            disabled={isDisabled}
            className={s.deposit}
            icon={isDeposit ? "hugeicons:download-03" : "hugeicons:upload-03"}
            size="large"
            onClick={handleSubmit}
          >
            {isDeposit ? "Deposit now" : "Withdraw now"}
          </Button>
        </div>
      </Card>
      {/* <Modal
        title="Select a Token"
        onClose={() => setOpenToken(false)}
        open={openToken}
        className={s.modal}
        responsiveBottom
      >
        <ul className={s.list}>
          {tokens.map((token) => (
            <li key={token.metadata.base}>
              <Button
                variant="secondary"
                iconRight="hugeicons:arrow-right-01"
                border
                onClick={() => handleChangeToken(token)}
                hovering={token.metadata.symbol === form.asset?.metadata.symbol}
                className={clsx(s.button)}
              >
                <div className={s.symbol}>
                  {token.metadata.logo !== "" && (
                    <Image
                      src={getLogoByHash(token.metadata.logo)}
                      alt=""
                      width={28}
                      height={28}
                    />
                  )}
                </div>
                <span>{token.metadata.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      </Modal> */}
      <Modal
        title="Select a Chain"
        onClose={() => setOpenChain(false)}
        open={openChain}
        className={s.modal}
        responsiveBottom
      >
        <ul className={s.list}>
          {displayedChains.map((chain) => {
            return (
              <li key={chain.chainId}>
                <Button
                  variant="secondary"
                  iconRight="hugeicons:arrow-right-01"
                  border
                  onClick={() => handleChangeChain(chain)}
                  hovering={chain.chainId === form[chainType]?.chainId}
                  className={s.button}
                >
                  <div className={s.symbol}>
                    {chain.logo !== "" && (
                      <Image
                        src={getLogoByHash(chain.logo)}
                        alt=""
                        width={28}
                        height={28}
                      />
                    )}
                  </div>
                  <span>{chain.name}</span>
                </Button>
              </li>
            )
          })}
        </ul>
      </Modal>
      <ModalWrapper
        title="Wrap Token"
        type="wrap"
        open={openWrapModal}
        setOpen={setOpenWrapModal}
        setTokenChange={handleTokenSearchChange}
      />
      <ModalWrapper
        title="Unwrap Token"
        type="unwrap"
        open={openUnwrapModal}
        setOpen={setOpenUnwrapModal}
        setTokenChange={handleTokenSearchChange}
      />
      <TokenSearchModal
        open={openTokenSearch}
        onClose={() => setOpenTokenSearch(false)}
        tokens={tokensByChain}
        onTokenSelect={(tokenAddress) => {
          handleTokenSearchChange({
            target: {
              value: tokenAddress
            }
          })
        }}
      />
    </>
  )
}
