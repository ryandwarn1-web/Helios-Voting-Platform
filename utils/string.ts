import { formatDistanceToNow } from "date-fns"

export const getErrorMessage = (error: any) => {
  if (error && error.data && error.data.message) {
    let errorMessage = error.data.message
    errorMessage = errorMessage.replace(
      "rpc error: code = Internal desc = ",
      ""
    )

    // Truncate long error messages
    if (errorMessage.length > 80) {
      errorMessage = errorMessage.substring(0, 77) + "..."
    }

    errorMessage = errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
    if (!errorMessage.endsWith(".")) {
      errorMessage += "."
    }

    return errorMessage
  }

  if (error.message) {
    let errorMessage = error.message

    // Handle common error messages
    if (errorMessage.includes("User denied")) {
      return "User denied transaction signature."
    }

    if (errorMessage.includes("reverted")) {
      return "Transaction reverted. Please try again."
    }

    if (errorMessage.includes("insufficient funds")) {
      return "Insufficient funds for transaction."
    }

    // Truncate long error messages
    if (errorMessage.length > 80) {
      errorMessage = errorMessage.substring(0, 77) + "..."
    }

    return errorMessage
  }

  return "Transaction failed. Please try again."
}

export const formatHash = (
  hash: string,
  length: number = 6,
  suffixLength: number = 4
) => {
  return `${hash?.slice(0, length)}...${hash?.slice(-suffixLength)}`
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return formatDistanceToNow(date, { addSuffix: true })
}
