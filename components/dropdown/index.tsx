"use client"

import type { Positions } from "@/types/Positions"
import clsx from "clsx"
import { cloneElement, useRef, useState } from "react"
import { useEventListener, useOnClickOutside } from "usehooks-ts"
import s from "./dropdown.module.scss"

interface DropdownProps {
  opener: React.ReactElement
  children: React.ReactNode
  outside?: boolean
  position?: Positions
  className?: string
  classNameContent?: string
  classNameScroll?: string
  callbackOpen?: () => void
  callbackClose?: () => void
  isOpenControlled?: boolean
  ariaLabel?: string
}

export const Dropdown = ({
  opener,
  children,
  outside = true,
  position = "right-bottom",
  className,
  classNameContent,
  classNameScroll,
  callbackOpen,
  callbackClose,
  isOpenControlled,
  ariaLabel = "Dropdown"
}: DropdownProps) => {
  const [isOpenInternal, setIsOpenInternal] = useState(false)
  const isOpen =
    isOpenControlled !== undefined ? isOpenControlled : isOpenInternal
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleToggle = () => {
    if (isOpenControlled === undefined) {
      setIsOpenInternal(!isOpen)
    }

    if (isOpen) {
      callbackClose?.()
    } else {
      callbackOpen?.()
    }
  }

  const handleClose = () => {
    if (isOpenControlled === undefined) {
      setIsOpenInternal(false)
      callbackClose?.()
    }
  }

  useEventListener<"click", HTMLDivElement>(
    "click",
    (event) => {
      const target = event.target as HTMLElement
      const closeElement = target.closest("[data-dropdown-close]")

      if (dropdownRef.current?.contains(target) && closeElement) {
        requestAnimationFrame(() => {
          handleClose()
        })
      }
    },
    dropdownRef as React.RefObject<HTMLDivElement>
  )

  // @ts-expect-error - useOnClickOutside not updated ts
  useOnClickOutside(dropdownRef, () => {
    if (isOpen && outside && isOpenControlled === undefined) {
      setIsOpenInternal(false)
      callbackClose?.()
    }
  })

  return (
    <div
      ref={dropdownRef}
      className={clsx(s.dropdown, className)}
      role="menu"
      aria-label={ariaLabel}
    >
      {cloneElement(opener, {
        // @ts-expect-error - handle on clone not updated ts
        onClick: handleToggle,
        "data-open": isOpen,
        "aria-haspopup": true
      })}
      {isOpen && (
        <div className={clsx(s.content, s[position], classNameContent)}>
          <div className={clsx(s.scroll, classNameScroll)}>{children}</div>
        </div>
      )}
    </div>
  )
}
