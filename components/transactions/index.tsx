import { TransactionLight } from "@/types/transaction"
import { Table } from "../table"
import { TransactionsLine } from "./line"
import { Message } from "../message"

type TransactionsProps = {
  transactions: TransactionLight[]
}

export const Transactions = ({ transactions }: TransactionsProps) => {
  if (transactions.length === 0) {
    return (
      <Message title="Transactions informations" variant="primary">
        No recent transactions.
      </Message>
    )
  }

  return (
    <Table>
      <tbody>
        {transactions.map((transaction) => (
          <TransactionsLine
            key={"transactions-" + Math.random().toString(36).substring(2, 15)}
            {...transaction}
          />
        ))}
      </tbody>
    </Table>
  )
}
