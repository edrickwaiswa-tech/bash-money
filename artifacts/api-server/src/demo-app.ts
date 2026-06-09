import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";

type TransactionType =
  | "SAVINGS_DEPOSIT"
  | "LOAN_REPAYMENT"
  | "LOAN_DISBURSEMENT"
  | "WITHDRAWAL";

type Member = {
  id: number;
  accountNumber: string;
  name: string;
  phone: string;
  idNumber: string;
  joinDate: string;
  profilePictureUrl: string | null;
  signatureUrl: string | null;
  createdAt: string;
  requiresPasswordReset?: boolean;
};

type Transaction = {
  id: number;
  transactionRef: string;
  memberId: number;
  type: TransactionType;
  amount: number;
  notes?: string;
  createdAt: string;
};

const CREDIT_TYPES = new Set<TransactionType>(["SAVINGS_DEPOSIT", "LOAN_REPAYMENT"]);

const demoAdmin = {
  id: 1,
  username: "kakembob1@gmail.com",
  role: "admin" as const,
  fullName: "BMMFS Demo Admin",
  employeeId: "BMM-DEMO",
  phone: "+256700000000",
  email: "kakembob1@gmail.com",
  profilePictureUrl: null,
};

let members: Member[] = [
  {
    id: 1,
    accountNumber: "BMMFS-2026-00001",
    name: "Amina Nansubuga",
    phone: "+256746724455",
    idNumber: "CM000001",
    joinDate: "2026-01-12",
    profilePictureUrl: null,
    signatureUrl: null,
    createdAt: "2026-01-12T08:15:00.000Z",
  },
  {
    id: 2,
    accountNumber: "BMMFS-2026-00002",
    name: "Daniel Kato",
    phone: "+256772111222",
    idNumber: "CM000002",
    joinDate: "2026-02-03",
    profilePictureUrl: null,
    signatureUrl: null,
    createdAt: "2026-02-03T09:30:00.000Z",
  },
  {
    id: 3,
    accountNumber: "BMMFS-2026-00003",
    name: "Sarah Namutebi",
    phone: "+256701333444",
    idNumber: "CM000003",
    joinDate: "2026-03-18",
    profilePictureUrl: null,
    signatureUrl: null,
    createdAt: "2026-03-18T11:45:00.000Z",
  },
];

let transactions: Transaction[] = [
  tx(1, 1, "SAVINGS_DEPOSIT", 850000, "Opening savings", "2026-05-28T08:00:00.000Z"),
  tx(2, 1, "LOAN_DISBURSEMENT", 300000, "Small business loan", "2026-05-29T10:15:00.000Z"),
  tx(3, 1, "LOAN_REPAYMENT", 75000, "Weekly repayment", "2026-06-01T09:00:00.000Z"),
  tx(4, 2, "SAVINGS_DEPOSIT", 420000, "Monthly savings", "2026-06-02T12:20:00.000Z"),
  tx(5, 3, "SAVINGS_DEPOSIT", 1250000, "Group deposit", "2026-06-03T14:10:00.000Z"),
  tx(6, 3, "WITHDRAWAL", 150000, "School fees", "2026-06-04T08:40:00.000Z"),
];

let notifications = [
  {
    id: 1,
    title: "Savings deposit received",
    message: "Your demo savings deposit of UGX 850,000 was posted.",
    isRead: false,
    createdAt: "2026-06-04T08:40:00.000Z",
  },
];

function tx(
  id: number,
  memberId: number,
  type: TransactionType,
  amount: number,
  notes: string,
  createdAt: string,
): Transaction {
  return {
    id,
    memberId,
    type,
    amount,
    notes,
    createdAt,
    transactionRef: `DEMO-${String(id).padStart(5, "0")}`,
  };
}

function nextMemberId() {
  return Math.max(0, ...members.map((m) => m.id)) + 1;
}

function nextTransactionId() {
  return Math.max(0, ...transactions.map((t) => t.id)) + 1;
}

function lastLoanDisbursementDate(memberTransactions: Transaction[]) {
  return (
    [...memberTransactions]
      .reverse()
      .find((transaction) => transaction.type === "LOAN_DISBURSEMENT")?.createdAt ?? null
  );
}

function memberTotals(memberId: number) {
  let savingsDeposits = 0;
  let savingsWithdrawals = 0;
  let loanDisbursements = 0;
  let loanRepayments = 0;

  for (const transaction of transactions.filter((t) => t.memberId === memberId)) {
    if (transaction.type === "SAVINGS_DEPOSIT") savingsDeposits += transaction.amount;
    if (transaction.type === "WITHDRAWAL") savingsWithdrawals += transaction.amount;
    if (transaction.type === "LOAN_DISBURSEMENT") loanDisbursements += transaction.amount;
    if (transaction.type === "LOAN_REPAYMENT") loanRepayments += transaction.amount;
  }

  const totalSavings = Math.max(0, savingsDeposits - savingsWithdrawals);
  const outstandingLoan = Math.max(0, loanDisbursements - loanRepayments);

  return {
    totalSavings,
    outstandingLoan,
    currentBalance: totalSavings - outstandingLoan,
  };
}

function memberProfile(member: Member) {
  return {
    ...member,
    ...memberTotals(member.id),
  };
}

function transactionWithMember(transaction: Transaction) {
  const member = members.find((m) => m.id === transaction.memberId);
  return {
    id: transaction.id,
    transactionRef: transaction.transactionRef,
    memberId: transaction.memberId,
    memberName: member?.name ?? "Unknown member",
    type: transaction.type,
    direction: CREDIT_TYPES.has(transaction.type) ? "credit" : "debit",
    amount: transaction.amount,
    notes: transaction.notes,
    createdAt: transaction.createdAt,
  };
}

function ledger(memberId: number) {
  let runningBalance = 0;
  let totalCredits = 0;
  let totalDebits = 0;

  const entries = transactions
    .filter((t) => t.memberId === memberId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((transaction) => {
      const isCredit = CREDIT_TYPES.has(transaction.type);
      if (isCredit) {
        runningBalance += transaction.amount;
        totalCredits += transaction.amount;
      } else {
        runningBalance -= transaction.amount;
        totalDebits += transaction.amount;
      }

      return {
        id: transaction.id,
        transactionRef: transaction.transactionRef,
        type: transaction.type,
        amount: transaction.amount,
        direction: isCredit ? "credit" : "debit",
        notes: transaction.notes,
        runningBalance,
        createdAt: transaction.createdAt,
      };
    });

  return {
    entries: entries.reverse(),
    currentBalance: runningBalance,
    totalCredits,
    totalDebits,
  };
}

const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.session.adminId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

const requireMember: RequestHandler = (req, res, next) => {
  if (!req.session.memberId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
};

const app: Express = express();

app.set("trust proxy", 1);
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "bmmfs-demo-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/login", (req, res) => {
  const identifier = String(req.body.email ?? req.body.username ?? "").toLowerCase();
  const password = String(req.body.password ?? req.body.pin ?? "");
  const allowed =
    (identifier === "kakembob1@gmail.com" && password === "admin@1") ||
    (identifier === "edrickwaiswa@gmail.com" && password === "admin@2");

  if (allowed) {
    req.session.adminId = demoAdmin.id;
    req.session.adminUsername = demoAdmin.username;
    res.json({ status: "approved" });
    return;
  }

  res.status(401).json({
    error: "Use kakembob1@gmail.com / admin@1 or edrickwaiswa@gmail.com / admin@2",
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.adminId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(demoAdmin);
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

app.patch("/api/auth/admin/profile", requireAdmin, (req, res) => {
  demoAdmin.fullName = req.body.fullName ?? demoAdmin.fullName;
  demoAdmin.phone = req.body.phone ?? demoAdmin.phone;
  demoAdmin.email = req.body.email ?? demoAdmin.email;
  res.json({ success: true });
});

app.post("/api/auth/admin/upload/profile-picture-data", requireAdmin, (_req, res) => {
  res.json({ url: null });
});

app.post("/api/auth/change-pin", requireAdmin, (_req, res) => {
  res.json({ success: true });
});

app.post("/api/auth/member/login-pin", (req, res) => {
  const identifier = String(req.body.identifier ?? "").trim();
  const pin = String(req.body.pin ?? "");
  const member = members.find((m) => m.accountNumber === identifier || m.phone === identifier);

  if (!member || pin !== "1234") {
    res.status(401).json({ error: "Demo member login: use BMMFS-2026-00001 / 1234" });
    return;
  }

  req.session.memberId = member.id;
  req.session.memberPhone = member.phone;
  res.json({ success: true, memberId: member.id, requiresPasswordReset: false });
});

app.get("/api/auth/member/me", requireMember, (req, res) => {
  const member = members.find((m) => m.id === req.session.memberId);
  res.json({
    memberId: req.session.memberId,
    phone: member?.phone,
    requiresPasswordReset: false,
  });
});

app.post("/api/auth/member/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

app.post("/api/auth/member/set-pin", requireMember, (_req, res) => {
  res.json({ success: true });
});

app.post("/api/auth/member/change-pin", requireMember, (_req, res) => {
  res.json({ success: true });
});

app.post("/api/auth/member/request-otp", (_req, res) => {
  res.json({ success: true, demoCode: "123456" });
});

app.post("/api/auth/member/verify-otp", (req, res) => {
  const member = members[0];
  req.session.memberId = member.id;
  req.session.memberPhone = member.phone;
  res.json({ success: true, memberId: member.id, requiresPasswordReset: false });
});

app.post("/api/auth/forgot-pin/request-code", (_req, res) => {
  res.json({ success: true, notificationCode: "123456" });
});

app.post("/api/auth/forgot-pin/verify-code", (_req, res) => {
  res.json({ resetToken: "demo-reset-token" });
});

app.post("/api/auth/forgot-pin/reset-pin", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/auth/admin/forgot-password", (_req, res) => {
  res.json({ success: true, devFallback: true, notificationCode: "123456" });
});

app.post("/api/auth/admin/verify-reset-code", (_req, res) => {
  res.json({ resetToken: "demo-admin-reset-token" });
});

app.post("/api/auth/admin/reset-password", (_req, res) => {
  res.json({ success: true });
});

app.get("/api/dashboard/summary", requireAdmin, (_req, res) => {
  const totalSavings = members.reduce((sum, member) => sum + memberTotals(member.id).totalSavings, 0);
  const totalLoansOutstanding = members.reduce(
    (sum, member) => sum + memberTotals(member.id).outstandingLoan,
    0,
  );

  res.json({
    totalMembers: members.length,
    totalSavings,
    totalLoansOutstanding,
    totalTransactions: transactions.length,
    totalDepositsToday: transactions
      .filter((t) => t.type === "SAVINGS_DEPOSIT")
      .reduce((sum, t) => sum + t.amount, 0),
    totalWithdrawalsToday: transactions
      .filter((t) => t.type === "WITHDRAWAL")
      .reduce((sum, t) => sum + t.amount, 0),
  });
});

app.get("/api/dashboard/recent-transactions", requireAdmin, (req, res) => {
  const limit = Number(req.query.limit ?? 20);
  res.json(
    [...transactions]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit)
      .map(transactionWithMember),
  );
});

app.get("/api/members", requireAdmin, (req, res) => {
  const search = String(req.query.search ?? "").toLowerCase();
  const rows = members
    .filter((m) => !search || m.name.toLowerCase().includes(search) || m.phone.includes(search))
    .map(memberProfile);
  res.json(rows);
});

app.post("/api/members", requireAdmin, (req, res) => {
  const id = nextMemberId();
  const year = new Date().getFullYear();
  const member: Member = {
    id,
    accountNumber: `BMMFS-${year}-${String(id).padStart(5, "0")}`,
    name: req.body.name,
    phone: req.body.phone,
    idNumber: req.body.idNumber,
    joinDate: req.body.joinDate ?? new Date().toISOString().slice(0, 10),
    profilePictureUrl: null,
    signatureUrl: null,
    createdAt: new Date().toISOString(),
  };
  members = [...members, member];
  res.status(201).json(member);
});

app.get("/api/members/:memberId", (req, res) => {
  const member = members.find((m) => m.id === Number(req.params.memberId));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(memberProfile(member));
});

app.put("/api/members/:memberId", requireAdmin, (req, res) => {
  const id = Number(req.params.memberId);
  const member = members.find((m) => m.id === id);
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  Object.assign(member, req.body);
  res.json(member);
});

app.delete("/api/members/:memberId", requireAdmin, (req, res) => {
  const id = Number(req.params.memberId);
  members = members.filter((m) => m.id !== id);
  transactions = transactions.filter((t) => t.memberId !== id);
  res.json({ success: true });
});

app.get("/api/members/:memberId/ledger", (req, res) => {
  const member = members.find((m) => m.id === Number(req.params.memberId));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json({ member, ...ledger(member.id) });
});

app.post("/api/auth/member/:memberId/reset-pin", requireAdmin, (_req, res) => {
  res.json({ success: true });
});

app.post("/api/auth/member/:memberId/set-temp-password", requireAdmin, (_req, res) => {
  res.json({ success: true });
});

app.post("/api/members/:memberId/upload/profile-picture-data", requireAdmin, (_req, res) => {
  res.json({ url: null });
});

app.post("/api/members/:memberId/upload/signature", requireAdmin, (_req, res) => {
  res.json({ url: null });
});

app.post("/api/members/:memberId/upload/signature-data", requireAdmin, (_req, res) => {
  res.json({ url: null });
});

app.get("/api/transactions", requireAdmin, (req, res) => {
  const memberId = req.query.memberId ? Number(req.query.memberId) : null;
  const limit = Number(req.query.limit ?? 100);
  res.json(
    [...transactions]
      .filter((t) => !memberId || t.memberId === memberId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit)
      .map(transactionWithMember),
  );
});

app.post("/api/transactions", requireAdmin, (req, res) => {
  const member = members.find((m) => m.id === Number(req.body.memberId));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const transaction: Transaction = {
    id: nextTransactionId(),
    transactionRef: `DEMO-${Date.now().toString(36).toUpperCase()}`,
    memberId: member.id,
    type: req.body.type,
    amount: Number(req.body.amount),
    notes: req.body.notes,
    createdAt: new Date().toISOString(),
  };
  transactions = [...transactions, transaction];

  res.status(201).json({
    ...transactionWithMember(transaction),
    runningBalance: ledger(member.id).currentBalance,
  });
});

app.post("/api/transactions/repay-from-savings", requireAdmin, (req, res) => {
  req.body.type = "LOAN_REPAYMENT";
  const member = members.find((m) => m.id === Number(req.body.memberId));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  const transaction: Transaction = {
    id: nextTransactionId(),
    transactionRef: `DEMO-${Date.now().toString(36).toUpperCase()}`,
    memberId: member.id,
    type: "LOAN_REPAYMENT",
    amount: Number(req.body.amount),
    notes: req.body.notes ?? "Deducted from savings",
    createdAt: new Date().toISOString(),
  };
  transactions = [...transactions, transaction];
  res.status(201).json({
    ...transactionWithMember(transaction),
    runningBalance: ledger(member.id).currentBalance,
    fromSavings: true,
    savingsDeducted: transaction.amount,
    newSavingsBalance: memberTotals(member.id).totalSavings,
    newLoanBalance: memberTotals(member.id).outstandingLoan,
  });
});

app.get("/api/transactions/:transactionId", (req, res) => {
  const transaction = transactions.find((t) => t.id === Number(req.params.transactionId));
  if (!transaction) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json({
    ...transactionWithMember(transaction),
    runningBalance: ledger(transaction.memberId).currentBalance,
  });
});

app.get("/api/loans/active", requireAdmin, (_req, res) => {
  res.json(
    members
      .map((member) => {
        const memberTransactions = transactions.filter((t) => t.memberId === member.id);
        const totalDisbursed = memberTransactions
          .filter((t) => t.type === "LOAN_DISBURSEMENT")
          .reduce((sum, t) => sum + t.amount, 0);
        const totalRepaid = memberTransactions
          .filter((t) => t.type === "LOAN_REPAYMENT")
          .reduce((sum, t) => sum + t.amount, 0);
        return {
          memberId: member.id,
          memberName: member.name,
          accountNumber: member.accountNumber,
          phone: member.phone,
          outstandingLoan: Math.max(0, totalDisbursed - totalRepaid),
          totalDisbursed,
          totalRepaid,
          lastDisbursementDate: lastLoanDisbursementDate(memberTransactions),
        };
      })
      .filter((loan) => loan.outstandingLoan > 0),
  );
});

app.get("/api/reports/transactions", requireAdmin, (_req, res) => {
  const rows = transactions.map(transactionWithMember);
  const totalCredits = rows
    .filter((r) => r.direction === "credit")
    .reduce((sum, r) => sum + r.amount, 0);
  const totalDebits = rows
    .filter((r) => r.direction === "debit")
    .reduce((sum, r) => sum + r.amount, 0);
  res.json({
    transactions: rows,
    totalCredits,
    totalDebits,
    netTotal: totalCredits - totalDebits,
    count: rows.length,
  });
});

app.get("/api/member/notifications", requireMember, (_req, res) => {
  res.json(notifications);
});

app.get("/api/member/notifications/unread-count", requireMember, (_req, res) => {
  res.json({ count: notifications.filter((n) => !n.isRead).length });
});

app.patch("/api/member/notifications/read-all", requireMember, (_req, res) => {
  notifications = notifications.map((notification) => ({ ...notification, isRead: true }));
  res.json({ success: true });
});

export default app;
