export function formatCurrency(amount: number): string {
  // Use "USh " explicitly instead of letting Intl decide format completely, 
  // ensuring the prefix is exactly what the user wants.
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  
  return `USh ${formatted}`;
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(dateString));
}

export function formatTransactionType(type: string): string {
  const map: Record<string, string> = {
    SAVINGS_DEPOSIT: "Savings Deposit",
    LOAN_REPAYMENT: "Loan Repayment",
    LOAN_DISBURSEMENT: "Loan Disbursement",
    WITHDRAWAL: "Withdrawal"
  };
  return map[type] || type;
}
