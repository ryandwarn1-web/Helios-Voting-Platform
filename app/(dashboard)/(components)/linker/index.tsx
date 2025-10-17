import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import s from "./linker.module.scss"

interface LinkerProps {
  icon: string
  href: string
  text: string
}

export const Linker = ({ href, text, icon }: LinkerProps) => {
  return (
    <Link href={href} className={s.linker}>
      <Heading icon={icon} title={text} />
      <Icon icon="hugeicons:arrow-right-02" className={s.icon} />
    </Link>
  )
}
