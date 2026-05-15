/**
 * Calculates the current outstanding loan balance using a running-balance approach.
 *
 * Rules:
 * - LOAN_DISBURSEMENT adds to the outstanding balance.
 * - LOAN_REPAYMENT reduces the outstanding balance, but never below 0.
 *   This means an over-repayment only zeros the balance — it does NOT carry a
 *   negative "credit" that would cancel future disbursements.
 *
 * Transactions MUST be passed in chronological order (oldest first).
 */
export function calcOutstandingLoan(
  txs: { type: string; amount: string | number }[]
): number {
  let outstanding = 0;
  for (const tx of txs) {
    const amt = typeof tx.amount === "string" ? parseFloat(tx.amount) : tx.amount;
    if (tx.type === "LOAN_DISBURSEMENT") {
      outstanding += amt;
    } else if (tx.type === "LOAN_REPAYMENT") {
      outstanding = Math.max(0, outstanding - amt);
    }
  }
  return outstanding;
}
