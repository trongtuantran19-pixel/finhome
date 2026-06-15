import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Wallet, TrendingDown, TrendingUp, ArrowUpRight, ArrowDownRight, AlertCircle, ChevronRight, CalendarDays, ChevronDown, Check, X } from "lucide-react";
import { cn } from "./ui/utils";
import { finhomeStorageKeys, readStoredJson, readStoredNumber } from "../finhomeStorage";
import {
  assetAllocation as defaultAssetAllocation,
  businessSpaces,
  creditCards,
  formatMoney,
  formatVnd,
  interestSavings,
  investmentCash,
  investmentHoldings,
  loans,
  metrics as defaultMetrics,
  personalAccounts,
  personalTransactions,
  ruleCards,
  savingGoals,
  unallocatedSavings,
  type BusinessSpace,
  type CashflowTransaction,
  type CreditCardDebt,
  type InterestSaving,
  type InvestmentHolding,
  type Loan,
  type PersonalAccount,
  type SavingGoal,
} from "../finhomeData";



const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as any },
});

function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return toISODate(new Date());
}

function formatDisplayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function OverviewDateSheet({ value, rangeStart, rangeEnd, onChange, onClose }: { value: string; rangeStart?: string; rangeEnd?: string; onChange: (value: string) => void; onClose: () => void }) {
  const selected = parseISODate(value || todayISO());
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [draft, setDraft] = useState(value || todayISO());
  const currentToday = todayISO();
  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const cells = [...Array.from({ length: leadingBlanks }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  const moveMonth = (step: number) => {
    const next = new Date(viewYear, viewMonth + step, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const pickToday = () => {
    const today = parseISODate(currentToday);
    setDraft(currentToday);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  return <motion.div className="fixed inset-0 z-[130] flex items-end bg-black/35 backdrop-blur-[1px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div drag="y" dragConstraints={{ top: 0, bottom: 0 }} onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }} onClick={(event) => event.stopPropagation()} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 260, damping: 28 }} className="w-full rounded-t-[24px] bg-white px-5 pb-5 pt-3 shadow-[0_-18px_60px_rgba(0,0,0,0.18)] sm:mx-auto sm:max-w-[460px]">
      <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-black/15" />
      <h3 className="mb-4 text-center text-lg font-semibold text-[#111111]">Chọn ngày giao dịch</h3>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => moveMonth(-1)} className="flex size-10 items-center justify-center rounded-full bg-[#F7F7F7] text-2xl text-[#111111]">‹</button>
        <p className="text-sm font-semibold text-[#111111]">Tháng {viewMonth + 1}, {viewYear}</p>
        <button type="button" onClick={() => moveMonth(1)} className="flex size-10 items-center justify-center rounded-full bg-[#F7F7F7] text-2xl text-[#111111]">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-[#666666]">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day} className="py-1.5">{day}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1.5">
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} className="aspect-square" />;
          const iso = toISODate(new Date(viewYear, viewMonth, day));
          const selectedDay = draft === iso;
          const isToday = currentToday === iso;
          return <button key={iso} type="button" onClick={() => setDraft(iso)} className={cn("flex aspect-square items-center justify-center rounded-full text-sm font-semibold transition-all", selectedDay ? "bg-[#B22222] text-white shadow-[0_8px_18px_rgba(178,34,34,0.22)]" : isToday ? "bg-[#F8EAEA] text-[#B22222]" : "text-[#111111] hover:bg-[#FAFAFA]")}>{day}</button>;
        })}
      </div>
      <button type="button" onClick={pickToday} className="mx-auto mt-4 flex w-fit items-center justify-center gap-2 rounded-full bg-[#F8EAEA] px-6 py-2.5 text-sm font-semibold text-[#B22222]"><CalendarDays className="size-4" />Hôm nay</button>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-black/[0.06] pt-4">
        <button type="button" onClick={onClose} className="rounded-2xl bg-[#F7F7F7] py-3.5 text-sm font-semibold text-[#111111]">Hủy</button>
        <button type="button" onClick={() => { onChange(draft); onClose(); }} className="rounded-2xl bg-[#B22222] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(178,34,34,0.25)]">Xác nhận</button>
      </div>
    </motion.div>
  </motion.div>;
}

function OverviewDateField({ value, rangeStart, rangeEnd, onChange }: { value: string; rangeStart?: string; rangeEnd?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="mt-1 flex w-full items-center justify-between gap-3 rounded-xl border border-black/[0.12] bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <span>{value === todayISO() ? "Hôm nay" : formatDisplayDate(value)}</span>
      <CalendarDays className="size-4 text-[#B22222]" />
    </button>
    <AnimatePresence>{open && <OverviewDateSheet value={value} rangeStart={rangeStart} rangeEnd={rangeEnd} onChange={onChange} onClose={() => setOpen(false)} />}</AnimatePresence>
  </>;
}

type PeriodValue = "week" | "month" | "year" | "custom";

const periodOptions: { value: PeriodValue; label: string }[] = [
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chỉnh" },
];

function TimeFilter({ value, onChange }: { value: PeriodValue; onChange: (value: PeriodValue) => void }) {
  const [open, setOpen] = useState(false);
  const selected = periodOptions.find((option) => option.value === value) ?? periodOptions[1];

  function select(next: PeriodValue) {
    onChange(next);
    setOpen(false);
  }

  return <div className="relative">
    <button
      type="button"
      onClick={() => setOpen((current) => !current)}
      className={cn(
        "flex h-11 items-center gap-3 rounded-full border border-[#E5E5E5] bg-white px-[18px] text-sm font-semibold text-[#111111] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition",
        open && "border-[#B22222] shadow-[0_0_0_4px_rgba(178,34,34,0.08)]"
      )}
      aria-haspopup="listbox"
      aria-expanded={open}
    >
      <span>{selected.label}</span>
      <ChevronDown className={cn("size-4 text-[#666666] transition-transform", open && "rotate-180 text-[#B22222]")} />
    </button>
    <AnimatePresence>
      {open && <>
        <motion.div className="fixed inset-0 z-[80] bg-transparent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
        <motion.div
          role="listbox"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className="absolute right-0 top-[calc(100%+8px)] z-[90] w-48 overflow-hidden rounded-2xl border border-[#EFEFEF] bg-white p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
        >
          {periodOptions.map((option) => {
            const active = option.value === value;
            return <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => select(option.value)}
              className={cn(
                "flex h-12 w-full items-center justify-between rounded-xl px-4 text-left text-sm font-semibold transition-colors",
                active ? "bg-[#FDECEC] text-[#B22222]" : "text-[#111111] hover:bg-[#F7F7F7]"
              )}
            >
              <span>{option.label}</span>
              {active && <Check className="size-4" />}
            </button>;
          })}
        </motion.div>
      </>}
    </AnimatePresence>
  </div>;
}

function DateRangeModal({ from, to, onApply, onClose }: { from: string; to: string; onApply: (from: string, to: string) => void; onClose: () => void }) {
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  return <motion.div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 backdrop-blur-[1px] md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div
      onClick={(event) => event.stopPropagation()}
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="w-full rounded-t-[24px] bg-white p-5 shadow-[0_-18px_60px_rgba(0,0,0,0.18)] md:max-w-[480px] md:rounded-[24px]"
    >
      <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-black/15 md:hidden" />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Tùy chỉnh</p>
          <h3 className="mt-1 text-lg font-semibold text-[#111111]">Chọn khoảng thời gian</h3>
        </div>
        <button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-full bg-[#F7F7F7] text-[#737373]"><X className="size-4" /></button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">
          Từ ngày
          <OverviewDateField value={draftFrom} rangeStart={draftFrom} rangeEnd={draftTo} onChange={setDraftFrom} />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">
          Đến ngày
          <OverviewDateField value={draftTo} rangeStart={draftFrom} rangeEnd={draftTo} onChange={setDraftTo} />
        </label>
      </div>
      <p className="mt-4 rounded-2xl bg-[#F8F5F0] px-4 py-3 text-xs text-[#666666]">Đang chọn: {formatDisplayDate(draftFrom)} → {formatDisplayDate(draftTo)}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={onClose} className="h-12 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111111]">Hủy</button>
        <button type="button" onClick={() => onApply(draftFrom, draftTo)} className="h-12 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(178,34,34,0.25)]">Áp dụng</button>
      </div>
    </motion.div>
  </motion.div>;
}

type OverviewMetrics = typeof defaultMetrics;

type OverviewModel = {
  metrics: OverviewMetrics;
  assetAllocation: typeof defaultAssetAllocation;
  allTransactions: CashflowTransaction[];
};

function sumValues(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getInvestmentSnapshot() {
  const cash = readStoredNumber(finhomeStorageKeys.investmentCash, investmentCash);
  const holdings = readStoredJson<InvestmentHolding[]>(finhomeStorageKeys.investmentHoldings, investmentHoldings);
  const activeHoldings = holdings.filter((holding) => holding.status === "holding" && holding.quantity > 0);
  const investedCapital = sumValues(activeHoldings.map((holding) => holding.remainingCapital));
  const realizedPL = sumValues(holdings.map((holding) => holding.realizedPL));

  return {
    cash,
    holdings,
    activeHoldings,
    investedCapital,
    realizedPL,
    total: cash + investedCapital,
  };
}

function isActiveStatus(status: string) {
  return !["hidden", "closed", "settled", "cancelled"].includes(status);
}

function isValidTx(tx: CashflowTransaction) {
  return tx.status !== "cancelled";
}

function countsAsReportExpense(tx: CashflowTransaction) {
  return Boolean(tx.countsAsExpense) && !["credit_card_payment", "loan_principal"].includes(tx.kind);
}

function countsAsReportIncome(tx: CashflowTransaction) {
  return Boolean(tx.countsAsIncome) && tx.kind !== "loan_disbursement";
}

function getOverviewModel(): OverviewModel {
  const accounts = readStoredJson<PersonalAccount[]>(finhomeStorageKeys.personalAccounts, personalAccounts);
  const extraTransactions = readStoredJson<CashflowTransaction[]>(finhomeStorageKeys.personalTransactions, []);
  const cancelledIds = new Set(readStoredJson<string[]>(finhomeStorageKeys.personalCancelledTransactions, []));
  const businesses = readStoredJson<BusinessSpace[]>(finhomeStorageKeys.businessSpaces, businessSpaces);
  const cards = readStoredJson<CreditCardDebt[]>(finhomeStorageKeys.personalCards, creditCards);
  const loanItems = readStoredJson<Loan[]>(finhomeStorageKeys.loans, loans);
  const goals = readStoredJson<SavingGoal[]>(finhomeStorageKeys.savingsGoals, savingGoals);
  const interestItems = readStoredJson<InterestSaving[]>(finhomeStorageKeys.savingsInterest, interestSavings);
  const investmentSnapshot = getInvestmentSnapshot();

  const baseTransactions = personalTransactions.map((tx) => cancelledIds.has(tx.id) ? { ...tx, status: "cancelled" as const } : tx);
  const businessTransactions = businesses.flatMap((business) => business.transactions ?? []);
  const allTransactions = [...extraTransactions, ...baseTransactions, ...businessTransactions]
    .filter(isValidTx)
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeAccounts = accounts.filter((account) => isActiveStatus(account.status));
  const activeBusinesses = businesses.filter((business) => isActiveStatus(business.status));
  const activeCards = cards.filter((card) => isActiveStatus(card.status));
  const activeLoans = loanItems.filter((loan) => !["settled", "closed"].includes(loan.status));
  const activeGoals = goals.filter((goal) => !["hidden", "closed"].includes(goal.status));
  const activeInterest = interestItems.filter((saving) => isActiveStatus(saving.status));
  const activeInvestments = investmentSnapshot.activeHoldings;

  const personalBalance = sumValues(activeAccounts.map((account) => account.balance));
  const personalIncome = sumValues(allTransactions.filter(countsAsReportIncome).map((tx) => tx.amount));
  const personalExpenses = sumValues(allTransactions.filter(countsAsReportExpense).map((tx) => tx.amount));
  const financialCosts = sumValues(allTransactions.filter((tx) => tx.kind === "loan_interest").map((tx) => tx.amount));
  const businessCash = sumValues(activeBusinesses.map((business) => business.cash));
  const businessReceivable = sumValues(activeBusinesses.map((business) => business.receivable));
  const businessPayable = sumValues(activeBusinesses.map((business) => business.payable));
  const businessCapital = sumValues(activeBusinesses.map((business) => business.capital));
  const businessRetainedProfit = sumValues(activeBusinesses.map((business) => business.retainedProfit));
  const businessWithdrawnToPersonal = sumValues(activeBusinesses.map((business) => business.withdrawnToPersonal));
  const businessValue = businessCash + businessReceivable - businessPayable;
  const businessRevenue = sumValues(activeBusinesses.map((business) => business.revenue));
  const businessExpenses = sumValues(activeBusinesses.map((business) => business.expenses));
  const investedCapital = investmentSnapshot.investedCapital;
  const realizedPL = investmentSnapshot.realizedPL;
  const investmentTotal = investmentSnapshot.total;
  const savingsTargetTotal = sumValues(activeGoals.map((goal) => goal.current));
  const interestSavingsPrincipal = sumValues(activeInterest.map((saving) => saving.principal));
  const interestSavingsExpectedInterest = sumValues(activeInterest.map((saving) => saving.expectedInterest));
  const savingsTotal = savingsTargetTotal + interestSavingsPrincipal + unallocatedSavings;
  const loanDebt = sumValues(activeLoans.map((loan) => loan.outstanding));
  const creditCardDebt = sumValues(activeCards.map((card) => card.used));
  const totalAssets = personalBalance + businessValue + investmentTotal + savingsTotal;
  const totalDebt = loanDebt + creditCardDebt;
  const netWorth = totalAssets - totalDebt;

  const metrics: OverviewMetrics = {
    ...defaultMetrics,
    personalBalance,
    personalIncome,
    personalExpenses,
    financialCosts,
    activeAccountCount: activeAccounts.length,
    businessCash,
    businessReceivable,
    businessPayable,
    businessCapital,
    businessRetainedProfit,
    businessWithdrawnToPersonal,
    businessValue,
    businessRevenue,
    businessExpenses,
    businessProfit: businessRevenue - businessExpenses,
    investmentCash: investmentSnapshot.cash,
    investedCapital,
    activeHoldingCount: activeInvestments.length,
    realizedPL,
    investmentFinancialIncome: Math.max(0, realizedPL),
    investmentTotal,
    savingsTotal,
    savingsTargetTotal,
    interestSavingsPrincipal,
    interestSavingsExpectedInterest,
    savingsActiveGoals: activeGoals.filter((goal) => goal.status === "active").length,
    savingsCompletedGoals: activeGoals.filter((goal) => goal.status === "completed").length,
    unallocatedSavings,
    loanDebt,
    creditCardDebt,
    totalAssets,
    totalDebt,
    netWorth,
    monthlyCashflow: personalIncome - personalExpenses,
  };

  return {
    metrics,
    assetAllocation: [
      { name: "Cá nhân", value: personalBalance, color: "#111111" },
      { name: "Kinh doanh", value: businessValue, color: "#B22222" },
      { name: "Đầu tư", value: investmentTotal, color: "#7C2D12" },
      { name: "Tiết kiệm", value: savingsTotal, color: "#166534" },
    ],
    allTransactions,
  };
}

function getPeriodRange(period: PeriodValue, customFrom: string, customTo: string) {
  const today = parseISODate(todayISO());
  let from: Date;
  let to: Date;

  if (period === "week") {
    const dayIndex = (today.getDay() + 6) % 7;
    from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayIndex);
    to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - dayIndex));
  } else if (period === "year") {
    from = new Date(today.getFullYear(), 0, 1);
    to = new Date(today.getFullYear(), 11, 31);
  } else if (period === "custom") {
    from = parseISODate(customFrom);
    to = parseISODate(customTo);
    if (from > to) [from, to] = [to, from];
  } else {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
    to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }

  return { from: toISODate(from), to: toISODate(to) };
}

function filterTransactionsByRange(transactions: CashflowTransaction[], from: string, to: string) {
  return transactions.filter((tx) => tx.date >= from && tx.date <= to);
}

function buildCashFlowData(transactions: CashflowTransaction[], from: string, to: string) {
  const fromDate = parseISODate(from);
  const toDate = parseISODate(to);
  const days = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1);
  const byKey = new Map<string, { day: string; income: number; expenses: number }>();
  const useMonthlyBuckets = days > 62;

  transactions.forEach((tx) => {
    const date = parseISODate(tx.date);
    const key = useMonthlyBuckets ? `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}` : tx.date;
    const label = useMonthlyBuckets ? `T${date.getMonth() + 1}` : tx.date.slice(8, 10);
    const item = byKey.get(key) ?? { day: label, income: 0, expenses: 0 };
    if (countsAsReportIncome(tx)) item.income += tx.amount / 1_000_000;
    if (countsAsReportExpense(tx)) item.expenses += tx.amount / 1_000_000;
    byKey.set(key, item);
  });

  return [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
}

function transactionTone(tx: CashflowTransaction) {
  if (countsAsReportIncome(tx)) return "income";
  if (countsAsReportExpense(tx)) return "expense";
  return "neutral";
}

function TransactionRow({ tx }: { tx: CashflowTransaction }) {
  const tone = transactionTone(tx);
  return <div className="flex items-center gap-3.5 px-6 py-3.5 hover:bg-[#FAFAFA] border-b border-black/[0.04] last:border-0">
    <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", tone === "income" ? "bg-[#DCFCE7]" : tone === "expense" ? "bg-[#FEF2F2]" : "bg-[#F5F5F5]")}>{tone === "income" ? <ArrowUpRight className="size-4 text-[#166534]" /> : tone === "expense" ? <ArrowDownRight className="size-4 text-[#B22222]" /> : <Wallet className="size-4 text-[#666666]" />}</div>
    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-[#111111] truncate">{tx.name}</p><p className="text-xs text-[#A3A3A3] mt-0.5">{tx.space} · {tx.source} · {tx.note}</p></div>
    <div className="text-right"><p className={cn("text-sm font-semibold tabular-nums", tone === "income" ? "text-[#166534]" : tone === "expense" ? "text-[#B22222]" : "text-[#111111]")}>{tone === "income" ? "+" : tone === "expense" ? "-" : ""}{formatMoney(tx.amount)}</p><p className="text-[10px] text-[#C4C4C4]">{tx.date}</p></div>
  </div>;
}

function AllTransactionsModal({ transactions, initialFrom, initialTo, onClose }: { transactions: CashflowTransaction[]; initialFrom: string; initialTo: string; onClose: () => void }) {
  const monthStart = toISODate(new Date(parseISODate(todayISO()).getFullYear(), parseISODate(todayISO()).getMonth(), 1));
  const today = todayISO();
  const [from, setFrom] = useState(initialFrom || monthStart);
  const [to, setTo] = useState(initialTo || today);

  const filtered = useMemo(() => {
    const range = from <= to ? { from, to } : { from: to, to: from };
    return filterTransactionsByRange(transactions, range.from, range.to);
  }, [transactions, from, to]);
  const rangeLabel = `${formatDisplayDate(from <= to ? from : to)} → ${formatDisplayDate(from <= to ? to : from)}`;

  function changeFrom(next: string) {
    if (next > to) {
      setFrom(to);
      setTo(next);
      return;
    }
    setFrom(next);
  }

  function changeTo(next: string) {
    if (next < from) {
      setTo(from);
      setFrom(next);
      return;
    }
    setTo(next);
  }

  function resetRange() {
    setFrom(monthStart);
    setTo(today);
  }

  return <motion.div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 backdrop-blur-[1px] md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div onClick={(event) => event.stopPropagation()} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }} className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-18px_60px_rgba(0,0,0,0.18)] md:max-w-[900px] md:rounded-[24px]">
      <div className="shrink-0 border-b border-black/[0.06] bg-white px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Lịch sử</p>
            <h3 className="mt-1 text-lg font-semibold text-[#111111]">Tất cả giao dịch</h3>
            <p className="mt-1 text-xs text-[#666666]">{rangeLabel} · {filtered.length} giao dịch</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="w-full text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] sm:w-[160px]">
              Từ ngày
              <OverviewDateField value={from} rangeStart={from} rangeEnd={to} onChange={changeFrom} />
            </label>
            <label className="w-full text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] sm:w-[160px]">
              Đến ngày
              <OverviewDateField value={to} rangeStart={from} rangeEnd={to} onChange={changeTo} />
            </label>
            <button type="button" onClick={resetRange} className="h-10 rounded-2xl border border-black/[0.08] bg-white px-4 text-xs font-semibold text-[#B22222] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">Đặt lại</button>
            <button type="button" onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F7F7F7] text-[#737373]"><X className="size-4" /></button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-4">
        {filtered.length ? filtered.map((tx) => <TransactionRow key={`${tx.id}-${tx.date}`} tx={tx} />) : <p className="px-6 py-8 text-center text-sm text-[#A3A3A3]">Không có giao dịch trong khoảng này.</p>}
      </div>
    </motion.div>
  </motion.div>;
}
function KPICard({ title, value, sub, tone = "dark", delay = 0 }: { title: string; value: string; sub: string; tone?: "dark" | "red" | "green" | "white"; delay?: number }) {
  const isDark = tone === "dark";
  const color = tone === "red" ? "text-[#B22222]" : tone === "green" ? "text-[#166534]" : isDark ? "text-white" : "text-[#111111]";
  return (
    <motion.div {...fadeUp(delay)} className={cn(
      "rounded-2xl p-5 min-h-[150px] border shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col justify-between",
      isDark ? "bg-[#111111] border-[#111111]" : "bg-white border-black/[0.07]"
    )}>
      <p className={cn("text-xs font-medium", isDark ? "text-white/60" : "text-[#666666]")}>{title}</p>
      <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", color)}>{value}</p>
      <p className={cn("text-sm leading-snug", isDark ? "text-white/55" : "text-[#666666]")}>{sub}</p>
    </motion.div>
  );
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0C0C0C] rounded-xl px-3 py-2.5 shadow-xl border border-white/[0.06]">
      <p className="text-white/50 text-[10px] mb-1.5">Ngày {label}</p>
      {payload.map((p: any) => <p key={p.dataKey} className="text-xs font-semibold" style={{ color: p.stroke }}>{p.name}: {p.value} triệu</p>)}
    </div>
  );
}

export function OverviewPage({ dataVersion = 0 }: { dataVersion?: number }) {
  const [period, setPeriod] = useState<PeriodValue>("month");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("2026-06-01");
  const [customTo, setCustomTo] = useState(todayISO());
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const overview = useMemo(() => getOverviewModel(), [dataVersion]);
  const periodRange = useMemo(() => getPeriodRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const filteredTransactions = useMemo(() => filterTransactionsByRange(overview.allTransactions, periodRange.from, periodRange.to), [overview.allTransactions, periodRange.from, periodRange.to]);
  const periodIncome = sumValues(filteredTransactions.filter(countsAsReportIncome).map((tx) => tx.amount));
  const periodExpenses = sumValues(filteredTransactions.filter(countsAsReportExpense).map((tx) => tx.amount));
  const periodCashflow = periodIncome - periodExpenses;
  const cashFlowData = useMemo(() => buildCashFlowData(filteredTransactions, periodRange.from, periodRange.to), [filteredTransactions, periodRange.from, periodRange.to]);
  const visibleTransactions = filteredTransactions.slice(0, 10);
  const rangeLabel = `${formatDisplayDate(periodRange.from)} → ${formatDisplayDate(periodRange.to)}`;
  const totalAlloc = overview.assetAllocation.reduce((s, a) => s + a.value, 0);
  const alerts = [
    periodCashflow < 0 ? "Dòng tiền trong khoảng đang âm." : "Dòng tiền trong khoảng đang dương.",
    "Vay kinh doanh sắp đến hạn ngày 08/06/2026.",
    "Giao dịch đã hủy được giữ lịch sử nhưng không tính vào báo cáo.",
    "Chuyển tiền nội bộ đang được loại khỏi thu nhập/chi tiêu.",
  ];

  return (
    <div className="min-h-full bg-[#F9F9F9]">
      <div className="px-6 lg:px-8 py-8 max-w-[1440px] mx-auto space-y-7">
        <motion.div {...fadeUp(0)}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium text-[#A3A3A3] uppercase tracking-[0.1em] mb-1">Chủ Nhật, 07/06/2026</p>
              <h1 className="text-[2rem] font-semibold text-[#111111] tracking-tight leading-none">Tổng quan</h1>
            </div>
            <div className="flex gap-2">
              <TimeFilter value={period} onChange={(next) => {
                setPeriod(next);
                if (next === "custom") setRangeOpen(true);
              }} />
            </div>
          </div>
          {period === "custom" && <p className="mt-3 text-xs font-medium text-[#666666]">Đang xem: {formatDisplayDate(customFrom)} → {formatDisplayDate(customTo)}</p>}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard title="Tổng tài sản" value={formatMoney(overview.metrics.totalAssets)} sub="Cá nhân + kinh doanh + đầu tư + tiết kiệm" tone="dark" delay={0.05} />
          <KPICard title="Tổng nợ" value={formatMoney(overview.metrics.totalDebt)} sub="Dư nợ vay + dư nợ thẻ tín dụng" tone="red" delay={0.1} />
          <KPICard title="Tài sản ròng" value={formatMoney(overview.metrics.netWorth)} sub="Tổng tài sản trừ tổng nợ" tone="green" delay={0.15} />
          <KPICard title="Dòng tiền" value={formatMoney(periodCashflow)} sub="Thu nhập thực tế trừ chi tiêu thực tế trong khoảng đang xem" tone={periodCashflow >= 0 ? "green" : "red"} delay={0.2} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <motion.div {...fadeUp(0.1)} className="xl:col-span-2 bg-white rounded-2xl border border-black/[0.07] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-start justify-between mb-6">
              <div><p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-[0.1em] mb-1">Thu chi trong khoảng</p><p className="text-lg font-semibold text-[#111111]">Dòng tiền theo thời gian</p></div>
              <div className="flex gap-4"><span className="text-xs text-[#166534] font-semibold">Thu {formatVnd(periodIncome)}</span><span className="text-xs text-[#B22222] font-semibold">Chi {formatVnd(periodExpenses)}</span></div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cashFlowData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="income" name="Thu nhập" stroke="#166534" fill="#DCFCE7" fillOpacity={0.35} strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="expenses" name="Chi tiêu" stroke="#B22222" fill="#FEE2E2" fillOpacity={0.4} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div {...fadeUp(0.15)} className="bg-white rounded-2xl border border-black/[0.07] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6">
            <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-[0.1em] mb-1">Phân bổ tài sản</p>
            <p className="text-lg font-semibold text-[#111111] tracking-tight mb-5">Tiền đang nằm ở đâu</p>
            <div className="relative mx-auto mb-5 h-[210px] max-w-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview.assetAllocation}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={2.5}
                    stroke="#FFFFFF"
                    strokeWidth={4}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {overview.assetAllocation.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">Tổng tài sản</span>
                <span className="mt-1 text-xl font-semibold text-[#111111] tabular-nums">{formatVnd(overview.metrics.totalAssets)}</span>
              </div>
            </div>
            <div className="space-y-3 mt-4">
              {overview.assetAllocation.map((item) => {
                const pct = totalAlloc ? Math.round(item.value / totalAlloc * 100) : 0;
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-[#111111]">{item.name}</span>
                      <span className="text-[#666666]">{pct}% · {formatVnd(item.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#F1EFEA]">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <motion.div {...fadeUp(0.2)} className="xl:col-span-2 bg-white rounded-2xl border border-black/[0.07] shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.05]"><div><p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-[0.1em]">Lịch sử</p><p className="text-base font-semibold text-[#111111]">Giao dịch gần đây</p></div><button type="button" onClick={() => setShowAllTransactions(true)} className="flex items-center gap-1 text-[#B22222] text-xs font-semibold">Xem tất cả <ChevronRight className="size-3.5" /></button></div>
            <div>{visibleTransactions.length ? visibleTransactions.map((tx) => <TransactionRow key={`${tx.id}-${tx.date}`} tx={tx} />) : <p className="px-6 py-8 text-center text-sm text-[#A3A3A3]">Không có giao dịch trong khoảng này.</p>}</div>
          </motion.div>

          <div className="space-y-5">
            <motion.div {...fadeUp(0.25)} className="bg-white rounded-2xl border border-black/[0.07] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-5"><div className="flex items-center gap-2 mb-4"><AlertCircle className="size-4 text-[#B22222]" /><p className="text-base font-semibold text-[#111111]">Khoản cần chú ý</p></div><div className="space-y-3">{alerts.map((a) => <p key={a} className="rounded-xl bg-[#F9F6F1] px-3 py-2 text-xs text-[#666666]">{a}</p>)}</div></motion.div>
            <motion.div {...fadeUp(0.3)} className="bg-white rounded-2xl border border-black/[0.07] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-5"><p className="text-base font-semibold text-[#111111] mb-3">Quy tắc đang áp dụng</p><div className="space-y-2">{ruleCards.map((r) => <p key={r} className="text-xs leading-relaxed text-[#666666]">• {r}</p>)}</div></motion.div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showAllTransactions && <AllTransactionsModal transactions={overview.allTransactions} initialFrom={periodRange.from} initialTo={periodRange.to} onClose={() => setShowAllTransactions(false)} />}
        {rangeOpen && (
          <DateRangeModal
            from={customFrom}
            to={customTo}
            onClose={() => setRangeOpen(false)}
            onApply={(from, to) => {
              setCustomFrom(from);
              setCustomTo(to);
              setPeriod("custom");
              setRangeOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}















