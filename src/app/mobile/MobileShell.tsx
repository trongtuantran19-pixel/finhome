import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRightLeft,
  ArrowDown,
  Banknote,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronRight,
  CreditCard,
  HandCoins,
  Home,
  Landmark,
  Menu,
  PiggyBank,
  Plus,
  Search,
  Settings,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  businessSpaces,
  creditCards,
  formatMoney,
  interestSavings,
  investmentCash,
  investmentHoldings,
  loans,
  personalAccounts,
  personalTransactions,
  savingGoals,
  type CashflowTransaction,
} from "../finhomeData";
import { finhomeStorageKeys } from "../finhomeStorage";
import { useFinHomeStore } from "../finhomeStore";

type MobileTab = "overview" | "personal" | "business" | "transfer" | "savings" | "investment" | "loans" | "settings";
type TransferEndpoint = {
  id: string;
  name: string;
  group: string;
  balance: number;
  helper: string;
  suggestedAmount?: number;
};
type MobileReadResult<T> = {
  value: T;
  error?: string;
};

const navItems: { id: MobileTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Tổng quan", icon: Home },
  { id: "personal", label: "Cá nhân", icon: UserRound },
  { id: "business", label: "Kinh doanh", icon: BriefcaseBusiness },
  { id: "transfer", label: "Chuyển", icon: ArrowRightLeft },
  { id: "savings", label: "Tiết kiệm", icon: PiggyBank },
  { id: "investment", label: "Đầu tư", icon: ChartNoAxesCombined },
  { id: "loans", label: "Khoản vay", icon: HandCoins },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

function money(value: number) {
  return formatMoney(Math.round(value));
}

function getLoanBalance(loan: { outstanding?: number; balance?: number }) {
  return loan.outstanding ?? loan.balance ?? 0;
}

function getCardBalance(card: { used?: number; balance?: number }) {
  return card.used ?? card.balance ?? 0;
}

function isValidTx(tx: CashflowTransaction) {
  return tx.status !== "cancelled";
}

function countsAsIncome(tx: CashflowTransaction) {
  return isValidTx(tx) && Boolean(tx.countsAsIncome) && tx.kind !== "loan_disbursement";
}

function countsAsExpense(tx: CashflowTransaction) {
  return isValidTx(tx) && Boolean(tx.countsAsExpense) && !["credit_card_payment", "loan_principal"].includes(tx.kind);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit" }).format(new Date(value));
}

function todayLabel() {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
}

function readMobileJson<T>(key: string, fallback: T, label: string): MobileReadResult<T> {
  if (typeof window === "undefined") return { value: fallback };
  try {
    const raw = window.localStorage.getItem(key);
    return { value: raw ? JSON.parse(raw) as T : fallback };
  } catch {
    return { value: fallback, error: `${label} đang lỗi định dạng, FinHome đang dùng dữ liệu mặc định.` };
  }
}

function readMobileNumber(key: string, fallback: number, label: string): MobileReadResult<number> {
  if (typeof window === "undefined") return { value: fallback };
  const raw = window.localStorage.getItem(key);
  if (raw === null) return { value: fallback };
  const value = Number(raw);
  return Number.isFinite(value) ? { value } : { value: fallback, error: `${label} đang lỗi định dạng, FinHome đang dùng dữ liệu mặc định.` };
}

function useMobileModel() {
  const { dataVersion } = useFinHomeStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    const frame = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [dataVersion]);

  return useMemo(() => {
    const accountResult = readMobileJson(finhomeStorageKeys.personalAccounts, personalAccounts, "Tài khoản cá nhân");
    const businessResult = readMobileJson(finhomeStorageKeys.businessSpaces, businessSpaces, "Không gian kinh doanh");
    const loanResult = readMobileJson(finhomeStorageKeys.loans, loans, "Khoản vay");
    const cardResult = readMobileJson(finhomeStorageKeys.personalCards, creditCards, "Thẻ tín dụng");
    const goalResult = readMobileJson(finhomeStorageKeys.savingsGoals, savingGoals, "Mục tiêu tiết kiệm");
    const interestResult = readMobileJson(finhomeStorageKeys.savingsInterest, interestSavings, "Sổ tiết kiệm");
    const cashResult = readMobileNumber(finhomeStorageKeys.investmentCash, investmentCash, "Tiền mặt đầu tư");
    const holdingResult = readMobileJson(finhomeStorageKeys.investmentHoldings, investmentHoldings, "Danh mục đầu tư");
    const extraTxResult = readMobileJson<CashflowTransaction[]>(finhomeStorageKeys.personalTransactions, [], "Giao dịch cá nhân");
    const cancelledTxResult = readMobileJson<string[]>(finhomeStorageKeys.personalCancelledTransactions, [], "Giao dịch đã hủy");

    const accounts = accountResult.value;
    const businesses = businessResult.value;
    const storedLoans = loanResult.value;
    const cards = cardResult.value;
    const goals = goalResult.value;
    const interest = interestResult.value;
    const cash = cashResult.value;
    const holdings = holdingResult.value;
    const cancelledTxIds = new Set(cancelledTxResult.value);
    const baseTransactions = personalTransactions.map((tx) => cancelledTxIds.has(tx.id) ? { ...tx, status: "cancelled" as const } : tx);
    const allTransactions = [...extraTxResult.value, ...baseTransactions, ...businesses.flatMap((item) => item.transactions)]
      .filter(isValidTx)
      .sort((a, b) => b.date.localeCompare(a.date));
    const errors = [
      accountResult.error,
      businessResult.error,
      loanResult.error,
      cardResult.error,
      goalResult.error,
      interestResult.error,
      cashResult.error,
      holdingResult.error,
      extraTxResult.error,
      cancelledTxResult.error,
    ].filter(Boolean) as string[];

    const activeAccounts = accounts.filter((item) => item.status !== "hidden" && item.status !== "closed");
    const activeBusinesses = businesses.filter((item) => item.status !== "hidden" && item.status !== "closed");
    const activeGoals = goals.filter((item) => item.status !== "hidden" && item.status !== "closed");
    const activeInterest = interest.filter((item) => item.status !== "hidden" && item.status !== "closed" && item.status !== "settled");
    const activeHoldings = holdings.filter((item) => item.status === "holding");
    const activeLoans = storedLoans.filter((item) => item.status !== "closed" && item.status !== "settled");
    const activeCards = cards.filter((item) => item.status !== "hidden" && item.status !== "closed");

    const personalTotal = activeAccounts.reduce((sum, item) => sum + item.balance, 0);
    const businessCash = activeBusinesses.reduce((sum, item) => sum + item.cash, 0);
    const savingsTotal = activeGoals.reduce((sum, item) => sum + item.current, 0) + activeInterest.reduce((sum, item) => sum + item.principal, 0);
    const investmentTotal = cash + activeHoldings.reduce((sum, item) => sum + item.remainingCapital, 0);
    const loanDebt = activeLoans.reduce((sum, item) => sum + getLoanBalance(item), 0);
    const cardDebt = activeCards.reduce((sum, item) => sum + getCardBalance(item), 0);
    const totalAssets = personalTotal + businessCash + savingsTotal + investmentTotal;
    const totalDebt = loanDebt + cardDebt;
    const cashIn = allTransactions.filter(countsAsIncome).reduce((sum, item) => sum + item.amount, 0);
    const cashOut = allTransactions.filter(countsAsExpense).reduce((sum, item) => sum + item.amount, 0);
    const cashFlow = cashIn - cashOut;
    const allocation = [
      { label: "Tiền mặt", value: personalTotal + businessCash, color: "#EF4444" },
      { label: "Đầu tư", value: investmentTotal, color: "#F97316" },
      { label: "Tiết kiệm", value: savingsTotal, color: "#22C55E" },
    ].filter((item) => item.value > 0);
    const transferSources: TransferEndpoint[] = [
      ...activeAccounts.map((item) => ({
        id: `account:${item.id}`,
        name: item.name,
        group: "Cá nhân",
        balance: item.balance,
        helper: `${item.type} · ${money(item.balance)}`,
      })),
      ...activeBusinesses.map((item) => ({
        id: `business:${item.id}`,
        name: item.name,
        group: "Kinh doanh",
        balance: item.cash,
        helper: `${item.type} · ${money(item.cash)}`,
      })),
      {
        id: "investment:cash",
        name: "Tiền mặt đầu tư",
        group: "Đầu tư",
        balance: cash,
        helper: money(cash),
      },
    ].filter((item) => item.balance > 0).sort((a, b) => b.balance - a.balance);
    const transferTargets: TransferEndpoint[] = [
      ...activeGoals.map((item) => ({
        id: `saving-goal:${item.id}`,
        name: item.name,
        group: "Tiết kiệm",
        balance: item.current,
        helper: `${money(Math.max(item.target - item.current, 0))} còn thiếu`,
        suggestedAmount: Math.max(item.target - item.current, 0),
      })),
      ...activeInterest.filter((item) => item.allowTopUp).map((item) => ({
        id: `interest:${item.id}`,
        name: item.name,
        group: "Tiết kiệm sinh lãi",
        balance: item.principal,
        helper: `${item.bank} · ${money(item.principal)}`,
      })),
      ...activeAccounts.map((item) => ({
        id: `account:${item.id}`,
        name: item.name,
        group: "Cá nhân",
        balance: item.balance,
        helper: `${item.type} · ${money(item.balance)}`,
      })),
      ...activeBusinesses.map((item) => ({
        id: `business:${item.id}`,
        name: item.name,
        group: "Kinh doanh",
        balance: item.cash,
        helper: `${item.type} · ${money(item.cash)}`,
      })),
    ];

    return {
      accounts: activeAccounts,
      businesses: activeBusinesses,
      loans: activeLoans,
      cards: activeCards,
      goals: activeGoals,
      interest: activeInterest,
      investmentCash: cash,
      holdings: activeHoldings,
      personalTotal,
      businessCash,
      savingsTotal,
      investmentTotal,
      totalAssets,
      totalDebt,
      netWorth: totalAssets - totalDebt,
      cashIn,
      cashOut,
      cashFlow,
      allocation,
      transactions: allTransactions.slice(0, 10),
      transferSources,
      transferTargets,
      errors,
      isLoading: !isReady,
    };
  }, [dataVersion, isReady]);
}

type MobileModel = ReturnType<typeof useMobileModel>;

function AppHeader({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/92 px-5 pb-4 pt-[max(18px,env(safe-area-inset-top))] backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A3A3A3]">{eyebrow}</p>
          <h1 className="mt-1 text-[30px] font-black leading-none tracking-[-0.02em] text-[#111111]">{title}</h1>
        </div>
        <div className="flex size-11 items-center justify-center rounded-full bg-[#B22222] text-base font-black text-white">F</div>
      </div>
    </header>
  );
}

function MetricCard({ label, value, dark = false, tone = "black" }: { label: string; value: string; dark?: boolean; tone?: "black" | "green" | "red" }) {
  const toneClass = tone === "green" ? "text-[#126C3E]" : tone === "red" ? "text-[#B22222]" : dark ? "text-white" : "text-[#111111]";
  return (
    <div className={dark ? "rounded-[24px] bg-[#111111] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.14)]" : "rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_14px_34px_rgba(0,0,0,0.06)]"}>
      <p className={dark ? "text-xs font-semibold text-white/55" : "text-xs font-semibold text-[#8C8C8C]"}>{label}</p>
      <p className={`mt-4 text-[28px] font-black leading-tight tracking-[-0.02em] ${toneClass}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="px-1 text-[15px] font-black text-[#111111]">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function ListItem({ icon: Icon, title, sub, right }: { icon: React.ComponentType<{ className?: string }>; title: string; sub: string; right?: string }) {
  return (
    <button type="button" className="flex w-full items-center gap-3 rounded-[20px] border border-black/[0.06] bg-white p-4 text-left shadow-[0_12px_28px_rgba(0,0,0,0.045)]">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6F6F6] text-[#B22222]">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-black text-[#111111]">{title}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[#9A9A9A]">{sub}</span>
      </span>
      {right && <span className="text-sm font-black text-[#111111]">{right}</span>}
      <ChevronRight className="size-4 text-[#C0C0C0]" />
    </button>
  );
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-black/[0.12] bg-white/70 p-4">
      <p className="text-[15px] font-black text-[#111111]">{title}</p>
      <p className="mt-1 text-xs font-semibold text-[#9A9A9A]">{sub}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="h-28 animate-pulse rounded-[24px] bg-white" />
      <div className="h-20 animate-pulse rounded-[20px] bg-white" />
      <div className="h-20 animate-pulse rounded-[20px] bg-white" />
    </div>
  );
}

function ErrorState({ errors }: { errors: string[] }) {
  return (
    <div className="rounded-[20px] border border-[#F1C9C9] bg-[#FFF7F7] p-4">
      <p className="text-[15px] font-black text-[#B22222]">Dữ liệu chưa sẵn sàng</p>
      <p className="mt-1 text-xs font-semibold text-[#8C5A5A]">{errors[0] ?? "FinHome chưa đọc được dữ liệu cho màn hình này."}</p>
    </div>
  );
}

function ScreenState({
  model,
  empty,
  children,
}: {
  model: MobileModel;
  empty?: { when: boolean; title: string; sub: string };
  children: React.ReactNode;
}) {
  if (model.isLoading) return <LoadingState />;
  if (model.errors.length > 0) return <ErrorState errors={model.errors} />;
  if (empty?.when) return <EmptyState title={empty.title} sub={empty.sub} />;
  return <>{children}</>;
}

function GlassPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-white/[0.10] bg-[#191922]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_22px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

function OverviewStatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "green" | "red";
}) {
  const toneClass = tone === "green" ? "text-[#89D867]" : tone === "red" ? "text-[#FF626A]" : "text-white";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative min-h-[132px] overflow-hidden rounded-[24px] border border-white/[0.12] bg-[#1C1C22]/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_44px_rgba(0,0,0,0.28)]"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#EF3340]/25 blur-2xl" />
      <div className="relative flex items-start justify-between gap-2">
        <p className="min-h-[34px] text-[13px] font-semibold leading-tight text-white/72">{label}</p>
        <Icon className="size-6 shrink-0 text-[#F4A5B1]" />
      </div>
      <p className={`relative mt-5 truncate text-[20px] font-light tracking-wide ${toneClass}`}>{value}</p>
      <p className="relative mt-3 truncate text-[11px] font-medium text-white/52">{sub}</p>
    </motion.div>
  );
}

function CashFlowLineChart({ transactions }: { transactions: CashflowTransaction[] }) {
  const days = Array.from(new Set(transactions.slice(0, 18).map((tx) => tx.date))).sort().slice(-7);
  const rows = days.map((date) => {
    const items = transactions.filter((tx) => tx.date === date);
    return {
      date,
      income: items.filter(countsAsIncome).reduce((sum, item) => sum + item.amount, 0),
      expense: items.filter(countsAsExpense).reduce((sum, item) => sum + item.amount, 0),
    };
  });
  const max = Math.max(...rows.flatMap((row) => [row.income, row.expense]), 1);
  const point = (value: number, index: number) => {
    const x = rows.length <= 1 ? 20 : 20 + (index * 300) / (rows.length - 1);
    const y = 120 - (value / max) * 92;
    return `${x},${y}`;
  };
  const incomePoints = rows.map((row, index) => point(row.income, index)).join(" ");
  const expensePoints = rows.map((row, index) => point(row.expense, index)).join(" ");

  if (rows.length === 0) {
    return <EmptyState title="Chưa có dòng tiền" sub="Các giao dịch gần đây sẽ tạo thành biểu đồ tại đây." />;
  }

  return (
    <div className="h-[210px] overflow-hidden rounded-[22px]">
      <svg viewBox="0 0 340 170" className="h-[170px] w-full">
        <defs>
          <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#72D181" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#72D181" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="expenseFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#EF4D56" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#EF4D56" stopOpacity="0.30" />
          </linearGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <line x1="20" x2="320" y1="124" y2="124" stroke="rgba(255,255,255,0.36)" strokeWidth="1" />
        <line x1="20" x2="320" y1="42" y2="42" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <line x1="20" x2="320" y1="158" y2="158" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        <text x="8" y="129" fill="rgba(255,255,255,0.62)" fontSize="10">0</text>
        <polygon points={`20,124 ${incomePoints} 320,124`} fill="url(#incomeFill)" />
        <polygon points={`20,124 ${expensePoints} 320,158 20,158`} fill="url(#expenseFill)" />
        <polyline points={incomePoints} fill="none" stroke="#72D181" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" filter="url(#softGlow)" />
        <polyline points={expensePoints} fill="none" stroke="#EF4D56" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" filter="url(#softGlow)" />
      </svg>
      <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] text-center text-[12px] font-medium text-white/58">
        <span>Ngày</span>
        {rows.map((row) => <span key={row.date}>{shortDate(row.date)}</span>)}
      </div>
    </div>
  );
}

function allocationGradient(items: { label: string; value: number; color: string }[]) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return "#24242C";
  let cursor = 0;
  return `conic-gradient(${items.map((item) => {
    const start = cursor;
    cursor += (item.value / total) * 100;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(", ")})`;
}

function AllocationPanel({ model }: { model: MobileModel }) {
  const total = Math.max(model.allocation.reduce((sum, item) => sum + item.value, 0), 1);

  return (
    <GlassPanel className="rounded-[28px] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[21px] font-semibold text-white">Phân bổ tài sản</h2>
        <ChevronRight className="size-6 text-white" />
      </div>
      <div className="mt-5 flex items-center gap-6">
        <div className="relative flex h-[132px] w-[132px] shrink-0 items-center justify-center rounded-full" style={{ background: allocationGradient(model.allocation) }}>
          <div className="flex h-[82px] w-[82px] flex-col items-center justify-center rounded-full bg-[#171720] text-center">
            <p className="text-[18px] font-black text-white">{money(model.totalAssets)}</p>
            <p className="mt-1 text-[11px] font-medium text-white/70">Tổng tài sản</p>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {model.allocation.length === 0 ? (
            <p className="text-xs font-semibold text-gray-500">Chưa có tài sản để phân bổ.</p>
          ) : (
            model.allocation.map((item) => (
              <div key={item.label} className="grid grid-cols-[1fr_auto_42px] items-center gap-3 text-[14px] font-medium text-white/78">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="size-3 shrink-0 rounded-[4px]" style={{ background: item.color }} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="tabular-nums">{money(item.value)}</span>
                <span className="text-right text-white/58">{Math.round((item.value / total) * 100)}%</span>
              </div>
            ))
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

function FinancialReportPanel({ model }: { model: MobileModel }) {
  const total = Math.max(model.allocation.reduce((sum, item) => sum + item.value, 0), 1);
  const colors = ["#F8BBDD", "#DDEFD2", "#FFF3A7", "#DCDFFF", "#FFFFFF"];
  const bars = model.allocation.slice(0, 5).map((item, index) => ({
    ...item,
    color: colors[index] ?? item.color,
    percent: Math.max(4, Math.round((item.value / total) * 100)),
  }));

  return (
    <GlassPanel className="rounded-[32px] p-6">
      <h2 className="text-[24px] font-black text-white">Báo cáo tài chính</h2>
      {bars.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Chưa có báo cáo" sub="Khi có tài sản, FinHome sẽ hiển thị tỷ trọng tại đây." />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-5 gap-3">
            {bars.map((item) => (
              <div key={item.label} className="flex h-[152px] flex-col items-center justify-end rounded-[22px] bg-black/20 px-2 pb-4">
                <p className="mb-auto pt-4 text-[15px] font-semibold text-white/82">{item.percent}%</p>
                <div className="w-full rounded-t-[18px]" style={{ height: `${Math.max(26, item.percent * 1.55)}px`, background: item.color }} />
              </div>
            ))}
          </div>
          <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-3">
            {bars.map((item) => (
              <div key={item.label} className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-white/66">
                <span className="size-3 shrink-0 rounded-[4px]" style={{ background: item.color }} />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </GlassPanel>
  );
}

function OverviewScreen({ model }: { model: MobileModel }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#10110F] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(177,202,159,0.26),transparent_32%),radial-gradient(circle_at_72%_24%,rgba(119,101,176,0.34),transparent_34%),radial-gradient(circle_at_50%_105%,rgba(101,38,76,0.28),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-black/28" />
      <main className="relative mx-auto max-w-[430px] space-y-7 px-5 pb-32 pt-[max(28px,env(safe-area-inset-top))]">
        <ScreenState model={model} empty={{ when: model.totalAssets === 0 && model.totalDebt === 0, title: "Chưa có dữ liệu tổng quan", sub: "Thêm tài khoản, mục tiêu hoặc khoản vay để xem bức tranh tài chính." }}>
          <header className="grid grid-cols-[1fr_auto] gap-4">
            <button className="flex h-[58px] w-[92px] items-center justify-center rounded-full bg-black/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_38px_rgba(0,0,0,0.28)]">
              <Menu className="size-7 text-white" />
            </button>
            <div className="flex flex-col items-end gap-5">
              <div className="flex h-[54px] w-[86px] items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_40%_35%,#6A4B3B,#171720_70%)] text-lg font-black text-white">
                FH
              </div>
              <button className="flex h-[58px] w-[88px] items-center justify-center rounded-full bg-black/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_38px_rgba(0,0,0,0.28)]">
                <Search className="size-7 text-white" />
              </button>
            </div>
            <div className="pt-12">
              <p className="text-[36px] font-light leading-none tracking-[-0.01em] text-white">Xin chào!</p>
              <h1 className="mt-3 text-[38px] font-black leading-none tracking-[-0.01em] text-white">FinHome</h1>
            </div>
          </header>

          <div className="rounded-[34px] bg-[linear-gradient(135deg,rgba(255,255,255,0.34),rgba(135,112,203,0.46)_70%,rgba(255,255,255,0.10))] p-[1px] shadow-[0_26px_70px_rgba(86,74,142,0.35)]">
            <div className="rounded-[33px] bg-black/78 p-6">
              <p className="text-[17px] font-medium text-white/84">Số dư khả dụng</p>
              <p className="mt-10 text-right text-[36px] font-black tracking-wide text-[#DCD1FF]">{money(model.personalTotal)}</p>
            </div>
          </div>

          <GlassPanel className="rounded-[28px] p-5">
            <div className="divide-y divide-white/[0.08]">
              <div className="flex items-center justify-between pb-3">
                <span className="text-[16px] font-medium text-white/70">Thu nhập gần đây</span>
                <span className="text-[18px] font-black text-white">{money(model.cashIn)}</span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-[16px] font-medium text-white/70">Chi tiêu gần đây</span>
                <span className="text-[18px] font-black text-white">{money(model.cashOut)}</span>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-[32px] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[22px] font-black text-white">Dòng tiền</h2>
              <div className="flex shrink-0 gap-3 text-[12px] font-medium text-white/66">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-[#72D181]" />Thu</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-[#EF4D56]" />Chi</span>
              </div>
            </div>
            <CashFlowLineChart transactions={model.transactions} />
          </GlassPanel>

          <FinancialReportPanel model={model} />
        </ScreenState>
      </main>
    </div>
  );
}

function PersonalScreen({ model }: { model: MobileModel }) {
  return (
    <>
      <AppHeader title="Cá nhân" eyebrow="Ví trung tâm" />
      <main className="px-5 pb-28 pt-5">
        <ScreenState model={model} empty={{ when: model.accounts.length === 0, title: "Chưa có tài khoản cá nhân", sub: "Tạo ví tiền mặt, tài khoản ngân hàng hoặc ví điện tử để theo dõi số dư." }}>
          <MetricCard label="Tổng số dư cá nhân" value={money(model.personalTotal)} dark />
          <Section title="Tài khoản / ví">
            {model.accounts.map((account) => (
              <ListItem key={account.id} icon={account.type === "Ngân hàng" ? Landmark : Wallet} title={account.name} sub={`${account.type}: ${account.currency}`} right={money(account.balance)} />
            ))}
          </Section>
        </ScreenState>
      </main>
    </>
  );
}

function BusinessScreen({ model }: { model: MobileModel }) {
  const profit = model.businesses.reduce((sum, item) => sum + item.profit, 0);

  return (
    <>
      <AppHeader title="Kinh doanh" eyebrow="Không gian độc lập" />
      <main className="px-5 pb-28 pt-5">
        <ScreenState model={model} empty={{ when: model.businesses.length === 0, title: "Chưa có không gian kinh doanh", sub: "Thêm cửa hàng, dự án hoặc nguồn kinh doanh để tách dòng tiền." }}>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Tiền mặt" value={money(model.businessCash)} dark />
            <MetricCard label="Lợi nhuận" value={money(profit)} tone={profit >= 0 ? "green" : "red"} />
          </div>
          <Section title="Không gian kinh doanh">
            {model.businesses.map((item) => (
              <ListItem key={item.id} icon={BriefcaseBusiness} title={item.name} sub={`${item.type}: lợi nhuận ${money(item.profit)}`} right={money(item.cash)} />
            ))}
          </Section>
        </ScreenState>
      </main>
    </>
  );
}

function TransferScreen({ model }: { model: MobileModel }) {
  const source = model.transferSources[0];
  const target = model.transferTargets.find((item) => item.id !== source?.id) ?? model.transferTargets[0];
  const suggestedAmount = Math.min(source?.balance ?? 0, target?.suggestedAmount ?? 0);

  return (
    <>
      <AppHeader title="Chuyển tiền" eyebrow="Bottom sheet flow" />
      <main className="px-5 pb-28 pt-5">
        <ScreenState model={model} empty={{ when: !source || !target, title: "Thiếu dữ liệu chuyển tiền", sub: "Mobile sẽ tự lấy nguồn và nơi nhận khi có tài khoản, không gian kinh doanh hoặc mục tiêu tiết kiệm." }}>
          <div className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_16px_36px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A3A3A3]">Từ</p>
            <button className="mt-2 flex h-16 w-full items-center justify-between rounded-2xl border border-black/[0.08] px-4 text-left">
              <span><b>{source?.name}</b><span className="block text-xs text-[#999]">{source ? `${source.group} · ${source.helper}` : ""}</span></span>
              <ChevronRight className="size-4 text-[#B22222]" />
            </button>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#A3A3A3]">Đến</p>
            <button className="mt-2 flex h-16 w-full items-center justify-between rounded-2xl border border-black/[0.08] px-4 text-left">
              <span><b>{target?.name}</b><span className="block text-xs text-[#999]">{target ? `${target.group} · ${target.helper}` : ""}</span></span>
              <ChevronRight className="size-4 text-[#B22222]" />
            </button>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <input className="h-14 rounded-2xl border border-black/[0.08] px-4 text-base font-bold outline-none focus:border-[#B22222]" defaultValue={suggestedAmount ? String(suggestedAmount) : ""} placeholder="Số tiền" />
              <button className="h-14 rounded-2xl border border-black/[0.08] px-4 text-left text-sm font-bold">{todayLabel()}</button>
            </div>
            <textarea className="mt-5 h-24 w-full rounded-2xl border border-black/[0.08] p-4 font-semibold outline-none focus:border-[#B22222]" placeholder="Ghi chú" />
            <button className="mt-5 h-14 w-full rounded-2xl bg-[#B22222] font-black text-white shadow-[0_14px_32px_rgba(178,34,34,0.24)]">Tiếp tục</button>
          </div>
        </ScreenState>
      </main>
    </>
  );
}

function SavingsScreen({ model }: { model: MobileModel }) {
  return (
    <>
      <AppHeader title="Tiết kiệm" eyebrow="Mục tiêu & sinh lãi" />
      <main className="px-5 pb-28 pt-5">
        <ScreenState model={model} empty={{ when: model.goals.length === 0 && model.interest.length === 0, title: "Chưa có dữ liệu tiết kiệm", sub: "Thêm mục tiêu hoặc sổ tiết kiệm để theo dõi tiến độ tích lũy." }}>
          <MetricCard label="Tổng tiết kiệm" value={money(model.savingsTotal)} dark />
          <Section title="Mục tiêu">
            {model.goals.length === 0 ? (
              <EmptyState title="Chưa có mục tiêu tiết kiệm" sub="Các mục tiêu sẽ xuất hiện ở đây khi được tạo." />
            ) : (
              model.goals.map((goal) => (
                <ListItem key={goal.id} icon={PiggyBank} title={goal.name} sub={`${Math.round((goal.current / goal.target) * 100)}% mục tiêu`} right={money(goal.current)} />
              ))
            )}
          </Section>
          <Section title="Sổ tiết kiệm">
            {model.interest.length === 0 ? (
              <EmptyState title="Chưa có sổ tiết kiệm" sub="Sổ đang sinh lãi sẽ được gom vào tổng tiết kiệm." />
            ) : (
              model.interest.map((item) => (
                <ListItem key={item.id} icon={Landmark} title={item.name} sub={`${item.bank}: ${item.annualRate}%/năm`} right={money(item.principal)} />
              ))
            )}
          </Section>
        </ScreenState>
      </main>
    </>
  );
}

function InvestmentScreen({ model }: { model: MobileModel }) {
  return (
    <>
      <AppHeader title="Đầu tư" eyebrow="Không gian riêng" />
      <main className="px-5 pb-28 pt-5">
        <ScreenState model={model} empty={{ when: model.investmentCash === 0 && model.holdings.length === 0, title: "Chưa có dữ liệu đầu tư", sub: "Thêm tiền mặt đầu tư hoặc khoản nắm giữ để xem danh mục." }}>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Tiền mặt đầu tư" value={money(model.investmentCash)} />
            <MetricCard label="Tổng đầu tư" value={money(model.investmentTotal)} dark />
          </div>
          <Section title="Khoản đầu tư">
            {model.holdings.length === 0 ? (
              <EmptyState title="Chưa có khoản đang nắm giữ" sub="Danh mục cổ phiếu, vàng hoặc crypto sẽ hiển thị tại đây." />
            ) : (
              model.holdings.map((item) => (
                <ListItem key={item.id} icon={ChartNoAxesCombined} title={item.code} sub={`${item.name}: ${item.status}`} right={money(item.remainingCapital)} />
              ))
            )}
          </Section>
        </ScreenState>
      </main>
    </>
  );
}

function LoansScreen({ model }: { model: MobileModel }) {
  return (
    <>
      <AppHeader title="Khoản vay" eyebrow="Nghĩa vụ nợ" />
      <main className="px-5 pb-28 pt-5">
        <ScreenState model={model} empty={{ when: model.loans.length === 0 && model.cards.length === 0, title: "Chưa có khoản nợ", sub: "Khoản vay và thẻ tín dụng đang hoạt động sẽ hiển thị tại đây." }}>
          <MetricCard label="Tổng dư nợ" value={money(model.totalDebt)} dark />
          <Section title="Khoản vay & thẻ">
            {model.loans.length === 0 && model.cards.length === 0 ? (
              <EmptyState title="Không có dư nợ đang theo dõi" sub="Bạn đang không có khoản vay hoặc thẻ tín dụng hoạt động." />
            ) : (
              <>
                {model.loans.map((loan) => (
                  <ListItem key={loan.id} icon={Banknote} title={loan.name} sub={`${loan.type}: ${loan.bank}`} right={money(getLoanBalance(loan))} />
                ))}
                {model.cards.map((card) => (
                  <ListItem key={card.id} icon={CreditCard} title={card.name} sub={`Đã dùng: ${money(getCardBalance(card))} / ${money(card.limit)}`} right={money(getCardBalance(card))} />
                ))}
              </>
            )}
          </Section>
        </ScreenState>
      </main>
    </>
  );
}

function SettingsScreen({ model }: { model: MobileModel }) {
  return (
    <>
      <AppHeader title="Cài đặt" eyebrow="Mobile lab" />
      <main className="px-5 pb-28 pt-5">
        <ScreenState model={model}>
          <Section title="Thiết kế đang thử nghiệm">
            <ListItem icon={Settings} title="Quản lý danh mục" sub="Danh mục cha/con 2 tầng" />
            <ListItem icon={Wallet} title="Tài khoản cá nhân" sub="Thêm, sửa, ẩn, điều chỉnh" />
            <ListItem icon={ArrowRightLeft} title="Luồng chuyển tiền" sub="Bottom sheet từ đâu đến đâu" />
          </Section>
        </ScreenState>
      </main>
    </>
  );
}

function BottomNav({ active, onChange }: { active: MobileTab; onChange: (tab: MobileTab) => void }) {
  const visibleItems = navItems.filter((item) => !["transfer", "settings"].includes(item.id));
  const leftItems = visibleItems.slice(0, 3);
  const rightItems = visibleItems.slice(3);

  const renderItem = (item: typeof navItems[number]) => {
    const Icon = item.icon;
    const selected = active === item.id;
    return (
      <button key={item.id} type="button" onClick={() => onChange(item.id)} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-bold transition ${selected ? "text-black" : "text-black/58"}`}>
        <Icon className="size-6" />
        <span className="max-w-full truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-1 pb-[max(10px,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex h-[84px] max-w-[360px] items-center gap-1 rounded-full border border-white/[0.45] bg-white/88 px-4 shadow-[0_-12px_42px_rgba(255,255,255,0.20),0_18px_50px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        {leftItems.map(renderItem)}
        <button
          type="button"
          onClick={() => onChange("transfer")}
          className={`mx-2 flex size-[72px] shrink-0 items-center justify-center rounded-full bg-[#3B2639] text-white shadow-[0_12px_34px_rgba(59,38,57,0.42)] transition ${active === "transfer" ? "scale-105" : ""}`}
          aria-label="Chuyển tiền"
        >
          <Plus className="size-10" />
        </button>
        {rightItems.map(renderItem)}
      </div>
    </nav>
  );
}

export function MobileShell() {
  const [active, setActive] = useState<MobileTab>("overview");
  const model = useMobileModel();

  const screen = {
    overview: <OverviewScreen model={model} />,
    personal: <PersonalScreen model={model} />,
    business: <BusinessScreen model={model} />,
    transfer: <TransferScreen model={model} />,
    savings: <SavingsScreen model={model} />,
    investment: <InvestmentScreen model={model} />,
    loans: <LoansScreen model={model} />,
    settings: <SettingsScreen model={model} />,
  }[active];

  return (
    <div className="min-h-dvh bg-[#101017] text-[#111111]" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div className="mx-auto min-h-dvh max-w-[430px] bg-[#F7F7F7] shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
        {screen}
        <BottomNav active={active} onChange={setActive} />
      </div>
    </div>
  );
}

export default MobileShell;
