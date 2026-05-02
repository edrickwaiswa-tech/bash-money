export function formatTransactionType(type: string): string {
  const map: Record<string, string> = {
    SAVINGS_DEPOSIT: "Savings Deposit",
    LOAN_REPAYMENT: "Loan Repayment",
    LOAN_DISBURSEMENT: "Loan Disbursement",
    WITHDRAWAL: "Withdrawal",
  };
  return map[type] ?? type;
}
