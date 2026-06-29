import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownToLine, BriefcaseBusiness, DollarSign, Package, Plus, TrendingUp, Users, X } from "lucide-react";
import { cn } from "../../ui/utils";
import { WorkspaceTimeFilter, createDefaultWorkspaceTimeRange, isDateInWorkspaceRange, type WorkspaceTimeRange } from "../../WorkspaceTimeFilter";
import { QuickDateField, todayISO } from "../../QuickDateField";
import { WorkspaceTransactionHistory } from "../../WorkspaceTransactionHistory";
import { FormSelect } from "../../FormSelect";
import {
  businessSpaces,
  formatMoney,
  personalAccounts,
  type BusinessSpace,
  type CashflowTransaction,
  type PersonalAccount,
} from "../../../finhomeData";
import { appendStoredItem, finhomeStorageKeys, readStoredJson, writeStoredJson } from "../../../finhomeStorage";

type Business = BusinessSpace;
type ModalKind = "create" | "capital" | "cashTopup" | "revenue" | "expense" | "withdraw" | "receivable" | "payable" | null;
type TabKind = "overview" | "revenue" | "expense" | "receivable" | "payable" | "capital" | "history";

const inputClass = "w-full rounded-2xl border border-black/[0.1] bg-white px-4 py-3 text-sm font-semibold text-[#111111] outline-none focus:border-[#B22222]";

function parseAmount(value: string) {
  return Number(value.replace(/[^0-9]/g, "")) || 0;
}

function normalizeBusiness(item: Partial<Business>): Business {
  return {
    id: item.id ?? `business-${Date.now()}`,
    name: item.name ?? "Không gian kinh doanh",
    type: item.type ?? "Kinh doanh",
    status: item.status ?? "active",
    cash: Number(item.cash ?? 0),
    capital: Number(item.capital ?? 0),
    retainedProfit: Number(item.retainedProfit ?? 0),
    withdrawnToPersonal: Number(item.withdrawnToPersonal ?? 0),
    revenue: Number(item.revenue ?? 0),
    expenses: Number(item.expenses ?? 0),
    receivable: Number(item.receivable ?? 0),
    payable: Number(item.payable ?? 0),
    chart: Array.isArray(item.chart) ? item.chart : [],
    transactions: Array.isArray(item.transactions) ? item.transactions : [],
  };
}

function loadBusinesses() {
  const stored = readStoredJson<unknown>(finhomeStorageKeys.businessSpaces, businessSpaces);
  return (Array.isArray(stored) ? stored : businessSpaces).map((item) => normalizeBusiness(item as Partial<Business>));
}

function saveBusinesses(value: Business[]) {
  writeStoredJson(finhomeStorageKeys.businessSpaces, value);
}

function loadAccounts() {
  const stored = readStoredJson<unknown>(finhomeStorageKeys.personalAccounts, personalAccounts);
  return (Array.isArray(stored) ? stored : personalAccounts) as PersonalAccount[];
}

function saveAccounts(value: PersonalAccount[]) {
  writeStoredJson(finhomeStorageKeys.personalAccounts, value);
}

function appendPersonalTransaction(transaction: CashflowTransaction) {
  appendStoredItem(finhomeStorageKeys.personalTransactions, transaction);
}

function calcProfit(biz: Business) {
  return biz.revenue - biz.expenses;
}

function formatPercent(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(1)}%`;
}

function aggregateBusinesses(items: Business[]): Business {
  const chartMap = new Map<string, { m: string; r: number; e: number }>();
  for (const item of items) {
    for (const point of item.chart ?? []) {
      const current = chartMap.get(point.m) ?? { m: point.m, r: 0, e: 0 };
      current.r += point.r;
      current.e += point.e;
      chartMap.set(point.m, current);
    }
  }
  return {
    id: "all",
    name: "Tất cả không gian",
    type: "Tổng hợp",
    status: "active",
    cash: items.reduce((sum, item) => sum + item.cash, 0),
    capital: items.reduce((sum, item) => sum + item.capital, 0),
    retainedProfit: items.reduce((sum, item) => sum + item.retainedProfit, 0),
    withdrawnToPersonal: items.reduce((sum, item) => sum + item.withdrawnToPersonal, 0),
    revenue: items.reduce((sum, item) => sum + item.revenue, 0),
    expenses: items.reduce((sum, item) => sum + item.expenses, 0),
    receivable: items.reduce((sum, item) => sum + item.receivable, 0),
    payable: items.reduce((sum, item) => sum + item.payable, 0),
    chart: Array.from(chartMap.values()),
    transactions: items.flatMap((item) => (item.transactions ?? []).map((tx) => ({ ...tx, source: `${item.name} · ${tx.source}` }))),
  };
}

function ModalShell({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <motion.div initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">Không gian kinh doanh</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111111]">{title}</h2>
            {sub && <p className="mt-1 text-sm text-[#666666]">{sub}</p>}
          </div>
          <button onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#666666]"><X className="size-4" /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#666666]">{label}</span>
      {children}
    </label>
  );
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0C0C0C] px-3 py-2.5 shadow-xl">
      <p className="mb-1.5 text-[10px] text-white/50">{label}</p>
      {payload.map((point: any) => (
        <p key={point.dataKey} className="mb-0.5 text-xs font-semibold" style={{ color: point.fill }}>
          {point.name}: {point.value} triệu
        </p>
      ))}
    </div>
  );
}

function BusinessSelector({ value, businesses, onChange }: { value: string; businesses: Business[]; onChange: (value: string) => void }) {
  const totalCash = businesses.reduce((sum, item) => sum + item.cash, 0);
  return (
    <div className="min-w-[220px]">
      <FormSelect
        title="Chọn không gian kinh doanh"
        value={value}
        onChange={onChange}
        options={[
          { value: "all", label: "Tất cả không gian", sub: `Tổng hợp · ${formatMoney(totalCash)}` },
          ...businesses.map((item) => ({ value: item.id, label: item.name, sub: item.type, right: formatMoney(item.cash) })),
        ]}
      />
    </div>
  );
}

function CreateBusinessModal({ businesses, onClose, onConfirm }: { businesses: Business[]; onClose: () => void; onConfirm: (payload: { name: string; type: string; amount: number; accountId: string; date: string; note: string }) => void }) {
  const accounts = useMemo(() => loadAccounts().filter((item) => item.status === "active"), []);
  const [name, setName] = useState("");
  const [type, setType] = useState("Dịch vụ");
  const [amount, setAmount] = useState("0");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const value = parseAmount(amount);
  const account = accounts.find((item) => item.id === accountId);
  const duplicate = businesses.some((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
  const invalid = !name.trim() || duplicate || value < 0 || value > (account?.balance ?? 0);

  return (
    <ModalShell title="Thêm không gian kinh doanh" sub="Tạo không gian riêng để theo dõi tiền mặt, vốn góp, doanh thu, chi phí và công nợ." onClose={onClose}>
      <div className="space-y-4">
        <Field label="Tên không gian"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Quán cafe" /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Loại hình"><input className={inputClass} value={type} onChange={(event) => setType(event.target.value)} placeholder="Dịch vụ, bán lẻ..." /></Field>
          <QuickDateField value={date} onChange={setDate} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Vốn ban đầu"><input className={inputClass} value={amount} inputMode="numeric" onChange={(event) => setAmount(event.target.value)} /></Field>
          <Field label="Tài khoản cá nhân nguồn"><FormSelect title="Chọn tài khoản nguồn" value={accountId} onChange={setAccountId} options={accounts.map((item) => ({ value: item.id, label: item.name, sub: `Cá nhân · ${formatMoney(item.balance)}` }))} /></Field>
        </div>
        <Field label="Ghi chú"><textarea className={cn(inputClass, "min-h-20")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú" /></Field>
        <p className="rounded-2xl bg-[#F8F6F3] px-4 py-3 text-sm text-[#666666]">Vốn ban đầu làm tăng tiền mặt kinh doanh và vốn góp, không tính doanh thu hoặc chi phí.</p>
        {duplicate && <p className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#B22222]">Tên không gian đã tồn tại.</p>}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-2xl border border-black/[0.12] py-3 font-semibold">Hủy</button>
          <button disabled={invalid} onClick={() => { onConfirm({ name: name.trim(), type: type.trim() || "Kinh doanh", amount: value, accountId, date, note }); onClose(); }} className="rounded-2xl bg-[#B22222] py-3 font-semibold text-white disabled:bg-[#D4D4D4]">Tạo</button>
        </div>
      </div>
    </ModalShell>
  );
}

function BusinessActionModal({ type, biz, onClose, onConfirm }: { type: Exclude<ModalKind, "create" | "withdraw" | null>; biz: Business; onClose: () => void; onConfirm: (payload: { type: Exclude<ModalKind, "create" | "withdraw" | null>; amount: number; accountId: string; date: string; counterparty: string; note: string }) => void }) {
  const accounts = useMemo(() => loadAccounts().filter((item) => item.status === "active"), []);
  const [amount, setAmount] = useState("0");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [counterparty, setCounterparty] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const value = parseAmount(amount);
  const needsPersonalSource = type === "capital" || type === "cashTopup";
  const titleMap: Record<Exclude<ModalKind, "create" | "withdraw" | null>, string> = {
    capital: "Góp vốn",
    cashTopup: "Bổ sung tiền mặt",
    revenue: "Thu tiền",
    expense: "Chi tiền",
    receivable: "Công nợ phải thu",
    payable: "Công nợ phải trả",
  };
  const noteMap: Record<Exclude<ModalKind, "create" | "withdraw" | null>, string> = {
    capital: "Góp vốn tăng tiền mặt và vốn góp, không phải doanh thu.",
    cashTopup: "Bổ sung tiền mặt chỉ tăng tiền mặt, không tăng vốn góp.",
    revenue: "Thu tiền đã nhận: tiền mặt tăng và doanh thu tăng.",
    expense: "Chi tiền đã trả: tiền mặt giảm và chi phí tăng.",
    receivable: "Ghi nhận phải thu: doanh thu tăng, công nợ tăng, tiền mặt chưa tăng.",
    payable: "Ghi nhận phải trả: chi phí tăng, công nợ tăng, tiền mặt chưa giảm.",
  };
  const account = accounts.find((item) => item.id === accountId);
  const invalid = value <= 0 || (needsPersonalSource && value > (account?.balance ?? 0)) || (type === "expense" && value > biz.cash);

  return (
    <ModalShell title={titleMap[type]} sub={biz.name} onClose={onClose}>
      <div className="space-y-4">
        {needsPersonalSource && <Field label="Tài khoản cá nhân nguồn"><FormSelect title="Chọn tài khoản nguồn" value={accountId} onChange={setAccountId} options={accounts.map((item) => ({ value: item.id, label: item.name, sub: `Cá nhân · ${formatMoney(item.balance)}` }))} /></Field>}
        {(type === "receivable" || type === "payable") && <Field label={type === "receivable" ? "Khách hàng / người nợ" : "Nhà cung cấp / người cần trả"}><input className={inputClass} value={counterparty} onChange={(event) => setCounterparty(event.target.value)} placeholder={type === "receivable" ? "Ví dụ: Khách A" : "Ví dụ: Nhà cung cấp A"} /></Field>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Số tiền"><input className={inputClass} value={amount} inputMode="numeric" onChange={(event) => setAmount(event.target.value)} /></Field>
          <QuickDateField value={date} onChange={setDate} />
        </div>
        <Field label="Ghi chú"><textarea className={cn(inputClass, "min-h-20")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú" /></Field>
        <p className="rounded-2xl bg-[#F8F6F3] px-4 py-3 text-sm text-[#666666]">{noteMap[type]}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-2xl border border-black/[0.12] py-3 font-semibold">Hủy</button>
          <button disabled={invalid} onClick={() => { onConfirm({ type, amount: value, accountId, date, counterparty, note }); onClose(); }} className="rounded-2xl bg-[#111111] py-3 font-semibold text-white disabled:bg-[#D4D4D4]">Lưu</button>
        </div>
      </div>
    </ModalShell>
  );
}

function WithdrawModal({ biz, onClose, onConfirm }: { biz: Business; onClose: () => void; onConfirm: (amount: number, accountId: string, date: string) => void }) {
  const accounts = useMemo(() => loadAccounts().filter((item) => item.status === "active"), []);
  const [amount, setAmount] = useState("0");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const value = parseAmount(amount);
  const fromProfit = Math.min(Math.max(0, biz.retainedProfit), value);
  const fromCapital = Math.min(Math.max(0, biz.capital), Math.max(0, value - fromProfit));
  const invalid = value <= 0 || value > biz.cash || value > Math.max(0, biz.retainedProfit) + Math.max(0, biz.capital);

  return (
    <ModalShell title="Rút tiền về Cá nhân" sub="Ưu tiên rút từ lợi nhuận giữ lại, phần thiếu mới trừ vốn góp." onClose={onClose}>
      <div className="space-y-4">
        <Field label="Tài khoản nhận"><FormSelect title="Chọn tài khoản nhận" value={accountId} onChange={setAccountId} options={accounts.map((item) => ({ value: item.id, label: item.name, sub: `Cá nhân · ${formatMoney(item.balance)}` }))} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Số tiền rút"><input className={inputClass} value={amount} inputMode="numeric" onChange={(event) => setAmount(event.target.value)} /></Field>
          <QuickDateField value={date} onChange={setDate} />
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F8F6F3] p-4 text-sm">
          <div><p className="text-[10px] font-semibold uppercase text-[#666666]">Rút từ lợi nhuận</p><p className="mt-1 font-semibold text-[#166534]">{formatMoney(fromProfit)}</p></div>
          <div><p className="text-[10px] font-semibold uppercase text-[#666666]">Rút từ vốn</p><p className="mt-1 font-semibold text-[#B45309]">{formatMoney(fromCapital)}</p></div>
          <div><p className="text-[10px] font-semibold uppercase text-[#666666]">Lợi nhuận sau rút</p><p className="mt-1 font-semibold">{formatMoney(biz.retainedProfit - fromProfit)}</p></div>
          <div><p className="text-[10px] font-semibold uppercase text-[#666666]">Vốn góp còn lại</p><p className="mt-1 font-semibold">{formatMoney(biz.capital - fromCapital)}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-2xl border border-black/[0.12] py-3 font-semibold">Hủy</button>
          <button disabled={invalid} onClick={() => { onConfirm(value, accountId, date); onClose(); }} className="rounded-2xl bg-[#B22222] py-3 font-semibold text-white disabled:bg-[#D4D4D4]">Xác nhận</button>
        </div>
      </div>
    </ModalShell>
  );
}

function TransactionPanel({ title, subtitle, transactions }: { title: string; subtitle: string; transactions: CashflowTransaction[] }) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white">
      <div className="border-b border-black/[0.05] px-5 py-4">
        <p className="font-semibold text-[#111111]">{title}</p>
        <p className="mt-1 text-xs text-[#A3A3A3]">{subtitle}</p>
      </div>
      <div className="divide-y divide-black/[0.05]">
        {transactions.length ? transactions.slice(0, 10).map((tx) => (
          <div key={tx.id} className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="font-semibold text-[#111111]">{tx.name}</p>
              <p className="mt-0.5 text-xs text-[#A3A3A3]">{tx.date} · {tx.note}</p>
            </div>
            <p className={cn("text-sm font-semibold", tx.countsAsIncome ? "text-[#166534]" : tx.countsAsExpense ? "text-[#B22222]" : "text-[#111111]")}>{formatMoney(tx.amount)}</p>
          </div>
        )) : <p className="px-5 py-6 text-sm text-[#A3A3A3]">Chưa có giao dịch.</p>}
      </div>
    </div>
  );
}

export function BusinessPageV1() {
  const [timeRange, setTimeRange] = useState<WorkspaceTimeRange>(createDefaultWorkspaceTimeRange);
  const [businesses, setBusinesses] = useState(loadBusinesses);
  const activeBusinesses = businesses.filter((item) => item.status === "active");
  const [activeId, setActiveId] = useState("all");
  const [activeTab, setActiveTab] = useState<TabKind>("overview");
  const [modal, setModal] = useState<ModalKind>(null);

  const isAll = activeId === "all";
  const selected = activeBusinesses.find((item) => item.id === activeId);
  const biz = isAll ? aggregateBusinesses(activeBusinesses) : selected ?? activeBusinesses[0] ?? aggregateBusinesses([]);
  const personalBusinessTransactions = readStoredJson<CashflowTransaction[]>(finhomeStorageKeys.personalTransactions, []).filter((tx) => tx.space === "Kinh doanh" && (isAll || tx.source.includes(biz.name)));
  const businessHistoryTransactions = [...(biz.transactions ?? []), ...personalBusinessTransactions].filter((tx, index, items) => items.findIndex((item) => item.id === tx.id) === index);
  const periodBusinessTransactions = businessHistoryTransactions.filter((tx) => isDateInWorkspaceRange(tx.date, timeRange));
  const profit = calcProfit(biz);
  const roi = biz.capital > 0 ? profit / biz.capital * 100 : null;
  const margin = biz.revenue > 0 ? profit / biz.revenue * 100 : null;
  const businessValue = biz.cash + biz.receivable - biz.payable;

  function persist(next: Business[]) {
    setBusinesses(next);
    saveBusinesses(next);
  }

  function updateBusiness(id: string, updater: (item: Business) => Business) {
    persist(businesses.map((item) => item.id === id ? updater(item) : item));
  }

  function changeAccount(accountId: string, delta: number) {
    saveAccounts(loadAccounts().map((account) => account.id === accountId ? { ...account, balance: account.balance + delta } : account));
  }

  function addBusiness(payload: { name: string; type: string; amount: number; accountId: string; date: string; note: string }) {
    const id = `business-${Date.now()}`;
    const tx: CashflowTransaction = {
      id: `business-create-${Date.now()}`,
      date: payload.date,
      name: "Góp vốn ban đầu",
      space: "Kinh doanh",
      source: payload.name,
      amount: payload.amount,
      kind: "transfer",
      status: "active",
      note: payload.note || "Vốn ban đầu, không tênh doanh thu hoặc chi phí",
    };
    const next: Business = {
      id,
      name: payload.name,
      type: payload.type,
      status: "active",
      cash: payload.amount,
      capital: payload.amount,
      retainedProfit: 0,
      withdrawnToPersonal: 0,
      revenue: 0,
      expenses: 0,
      receivable: 0,
      payable: 0,
      chart: [{ m: "T6", r: 0, e: 0 }],
      transactions: payload.amount > 0 ? [tx] : [],
    };
    if (payload.amount > 0) changeAccount(payload.accountId, -payload.amount);
    persist([...businesses, next]);
    setActiveId(id);
  }

  function handleAction(payload: { type: Exclude<ModalKind, "create" | "withdraw" | null>; amount: number; accountId: string; date: string; counterparty: string; note: string }) {
    if (isAll || !selected || payload.amount <= 0) return;
    const titleMap: Record<Exclude<ModalKind, "create" | "withdraw" | null>, string> = {
      capital: "Góp vốn kinh doanh",
      cashTopup: "Bổ sung tiền mặt",
      revenue: "Thu tiền kinh doanh",
      expense: "Chi tiền kinh doanh",
      receivable: "Ghi nhận phải thu",
      payable: "Ghi nhận phải trả",
    };
    const countsAsIncome = payload.type === "revenue" || payload.type === "receivable";
    const countsAsExpense = payload.type === "expense" || payload.type === "payable";
    updateBusiness(selected.id, (item) => {
      const next = { ...item };
      if (payload.type === "capital") {
        next.cash += payload.amount;
        next.capital += payload.amount;
        changeAccount(payload.accountId, -payload.amount);
      }
      if (payload.type === "cashTopup") {
        next.cash += payload.amount;
        changeAccount(payload.accountId, -payload.amount);
      }
      if (payload.type === "revenue") {
        next.cash += payload.amount;
        next.revenue += payload.amount;
        next.retainedProfit += payload.amount;
      }
      if (payload.type === "expense") {
        next.cash -= payload.amount;
        next.expenses += payload.amount;
        next.retainedProfit -= payload.amount;
      }
      if (payload.type === "receivable") {
        next.revenue += payload.amount;
        next.receivable += payload.amount;
        next.retainedProfit += payload.amount;
      }
      if (payload.type === "payable") {
        next.expenses += payload.amount;
        next.payable += payload.amount;
        next.retainedProfit -= payload.amount;
      }
      const tx: CashflowTransaction = {
        id: `business-tx-${Date.now()}`,
        date: payload.date,
        name: titleMap[payload.type],
        space: "Kinh doanh",
        source: payload.counterparty || item.name,
        amount: payload.amount,
        kind: countsAsIncome ? "income" : countsAsExpense ? "expense" : "transfer",
        status: "active",
        note: payload.note || titleMap[payload.type],
        countsAsIncome,
        countsAsExpense,
      };
      next.transactions = [tx, ...next.transactions];
      return next;
    });
  }

  function handleWithdraw(amount: number, accountId: string, date: string) {
    if (isAll || !selected || amount <= 0) return;
    const fromProfit = Math.min(Math.max(0, selected.retainedProfit), amount);
    const fromCapital = Math.min(Math.max(0, selected.capital), Math.max(0, amount - fromProfit));
    updateBusiness(selected.id, (item) => ({
      ...item,
      cash: item.cash - amount,
      retainedProfit: item.retainedProfit - fromProfit,
      capital: item.capital - fromCapital,
      withdrawnToPersonal: item.withdrawnToPersonal + amount,
      transactions: [{
        id: `business-withdraw-${Date.now()}`,
        date,
        name: "Rút tiền về Cá nhân",
        space: "Kinh doanh",
        source: `${item.name} -> Cá nhân`,
        amount,
        kind: "transfer",
        status: "active",
        note: `Rút từ lợi nhuận ${formatMoney(fromProfit)}, rút từ vốn ${formatMoney(fromCapital)}`,
      }, ...item.transactions],
    }));
    changeAccount(accountId, amount);
  }

  const tabs: { id: TabKind; label: string; count?: number }[] = [
    { id: "overview", label: "Tổng quan" },
    { id: "revenue", label: "Doanh thu", count: periodBusinessTransactions.filter((tx) => tx.countsAsIncome).length },
    { id: "expense", label: "Chi phí", count: periodBusinessTransactions.filter((tx) => tx.countsAsExpense).length },
    { id: "receivable", label: "Công nợ phải thu", count: biz.receivable > 0 ? 1 : 0 },
    { id: "payable", label: "Công nợ phải trả", count: biz.payable > 0 ? 1 : 0 },
    { id: "history", label: "Lịch sử giao dịch", count: periodBusinessTransactions.length },
    { id: "capital", label: "Rút/Góp vốn", count: periodBusinessTransactions.filter((tx) => !tx.countsAsIncome && !tx.countsAsExpense).length },
  ];

  const kpis = [
    { label: "Giá trị ròng kinh doanh", value: formatMoney(businessValue), icon: DollarSign, color: "text-[#111111]" },
    { label: "Tiền mặt", value: formatMoney(biz.cash), icon: DollarSign, color: "text-[#111111]" },
    { label: "Vốn góp", value: formatMoney(biz.capital), icon: BriefcaseBusiness, color: "text-[#111111]" },
    { label: "Lợi nhuận giữ lại", value: formatMoney(biz.retainedProfit), icon: ArrowDownToLine, color: biz.retainedProfit >= 0 ? "text-[#166534]" : "text-[#B22222]" },
    { label: "Đã rút về Cá nhân", value: formatMoney(biz.withdrawnToPersonal), icon: ArrowDownToLine, color: "text-[#B45309]" },
    { label: "Phải thu", value: formatMoney(biz.receivable), icon: Users, color: "text-[#B45309]" },
    { label: "Phải trả", value: formatMoney(biz.payable), icon: Package, color: "text-[#B22222]" },
    { label: "ROI / Biên LN", value: `${formatPercent(roi)} / ${formatPercent(margin)}`, icon: TrendingUp, color: "text-[#166534]" },
  ];

  return (
    <div className="min-h-full bg-[#F9F9F9]">
      <div className="mx-auto max-w-[1440px] space-y-6 px-6 py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#A3A3A3]">Không gian kinh doanh độc lập</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <h1 className="text-[1.9rem] font-semibold leading-none text-[#111111]">Kinh doanh</h1>
              <BusinessSelector value={activeId} businesses={activeBusinesses} onChange={(value) => { setActiveId(value); setActiveTab("overview"); }} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <WorkspaceTimeFilter value={timeRange} onChange={setTimeRange} />
            <button onClick={() => setModal("create")} className="rounded-xl bg-[#B22222] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="mr-1 inline size-4" /> Thêm không gian</button>
          </div>
        </div>

        {isAll && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {activeBusinesses.map((item) => {
              const itemProfit = calcProfit(item);
              const itemRoi = item.capital > 0 ? itemProfit / item.capital * 100 : null;
              const itemMargin = item.revenue > 0 ? itemProfit / item.revenue * 100 : null;
              return (
                <div key={item.id} className="rounded-2xl border border-black/[0.08] bg-white p-5">
                  <p className="font-semibold text-[#111111]">{item.name}</p>
                  <p className="mt-1 text-xs text-[#A3A3A3]">{item.type}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <span>Tiền mặt</span><span className="text-right font-semibold">{formatMoney(item.cash)}</span>
                    <span>Vốn góp</span><span className="text-right font-semibold">{formatMoney(item.capital)}</span>
                    <span>Lợi nhuận giữ lại</span><span className="text-right font-semibold">{formatMoney(item.retainedProfit)}</span>
                    <span>Doanh thu</span><span className="text-right font-semibold">{formatMoney(item.revenue)}</span>
                    <span>Chi phí</span><span className="text-right font-semibold">{formatMoney(item.expenses)}</span>
                    <span>Lợi nhuận</span><span className="text-right font-semibold">{formatMoney(itemProfit)}</span>
                    <span>ROI</span><span className="text-right font-semibold">{formatPercent(itemRoi)}</span>
                    <span>Biên LN</span><span className="text-right font-semibold">{formatPercent(itemMargin)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isAll && (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
            {kpis.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-black/[0.07] bg-white p-4">
                  <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase text-[#A3A3A3]">{item.label}</span><Icon className="size-3.5 text-[#D4D4D4]" /></div>
                  <p className={cn("text-lg font-semibold", item.color)}>{item.value}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto rounded-2xl bg-[#F1F1F1] p-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("min-w-max rounded-xl px-4 py-2 text-sm font-semibold transition", activeTab === tab.id ? "bg-white text-[#111111] shadow-sm" : "text-[#A3A3A3] hover:text-[#111111]")}>
              {tab.label} {typeof tab.count === "number" && <span className="ml-1 text-xs opacity-60">{tab.count}</span>}
            </button>
          ))}
        </div>

        {isAll ? (
          <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-sm text-[#666666]">
            Đang xem tổng hợp tất cả không gian. Chọn một workspace cụ thể ở bộ chọn phía trên để ghi nhận giao dịch, công nợ, rút hoặc góp vốn.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setModal("capital")} className="rounded-xl border border-black/[0.1] bg-white px-3.5 py-2 text-xs font-semibold">Góp vốn</button>
            <button onClick={() => setModal("cashTopup")} className="rounded-xl border border-black/[0.1] bg-white px-3.5 py-2 text-xs font-semibold">Bổ sung tiền mặt</button>
            <button onClick={() => setModal("revenue")} className="rounded-xl border border-black/[0.1] bg-white px-3.5 py-2 text-xs font-semibold">Thu tiền</button>
            <button onClick={() => setModal("expense")} className="rounded-xl border border-black/[0.1] bg-white px-3.5 py-2 text-xs font-semibold">Chi tiền</button>
            <button onClick={() => setModal("withdraw")} className="rounded-xl bg-[#B22222] px-3.5 py-2 text-xs font-semibold text-white">Rút tiền về Cá nhân</button>
            <button onClick={() => setModal("receivable")} className="rounded-xl border border-black/[0.1] bg-white px-3.5 py-2 text-xs font-semibold">Công nợ phải thu</button>
            <button onClick={() => setModal("payable")} className="rounded-xl border border-black/[0.1] bg-white px-3.5 py-2 text-xs font-semibold">Công nợ phải trả</button>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-black/[0.07] bg-white p-6 lg:col-span-2">
              <div className="mb-5 flex justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase text-[#A3A3A3]">Báo cáo riêng</p><p className="font-semibold text-[#111111]">{biz.name} - Doanh thu / Chi phí</p></div>
                <div className="text-right"><p className="text-xs text-[#A3A3A3]">Biên lợi nhuận - ROI</p><p className="font-semibold text-[#166534]">{formatPercent(margin)} - {formatPercent(roi)}</p></div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={biz.chart} margin={{ left: -20 }}>
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}M`} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="r" name="Doanh thu" fill="#111111" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="e" name="Chi phí" fill="#B22222" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <TransactionPanel title="Giao dịch riêng" subtitle="Góp vốn/rút tiền không tênh doanh thu/chi phí" transactions={periodBusinessTransactions} />
          </div>
        )}
        {activeTab === "revenue" && <TransactionPanel title="Doanh thu" subtitle="Chỉ gồm khoản thu kinh doanh hoặc phải thu mới." transactions={periodBusinessTransactions.filter((tx) => tx.countsAsIncome)} />}
        {activeTab === "expense" && <TransactionPanel title="Chi phí" subtitle="Chỉ gồm chi phí kinh doanh hoặc phải trả mới." transactions={periodBusinessTransactions.filter((tx) => tx.countsAsExpense)} />}
        {activeTab === "capital" && <TransactionPanel title="Rút/Góp vốn" subtitle="Giao dịch vốn và chuyển tiền nội bộ, không phải doanh thu/chi phí." transactions={periodBusinessTransactions.filter((tx) => !tx.countsAsIncome && !tx.countsAsExpense)} />}
        {activeTab === "receivable" && <TransactionPanel title="Công nợ phải thu" subtitle={`Tổng phải thu còn lại: ${formatMoney(biz.receivable)}`} transactions={periodBusinessTransactions.filter((tx) => tx.name.includes("phải thu") || tx.note.includes("phải thu"))} />}
        {activeTab === "payable" && <TransactionPanel title="Công nợ phải trả" subtitle={`Tổng phải trả còn lại: ${formatMoney(biz.payable)}`} transactions={periodBusinessTransactions.filter((tx) => tx.name.includes("phải trả") || tx.note.includes("phải trả"))} />}
        {activeTab === "history" && <WorkspaceTransactionHistory title={isAll ? "Lịch sử tất cả không gian kinh doanh" : `Lịch sử ${biz.name}`} subtitle="Doanh thu, chi phí, công nợ và luồng góp/rút vốn." transactions={periodBusinessTransactions} />}
      </div>

      <AnimatePresence>
        {modal === "create" && <CreateBusinessModal businesses={businesses} onClose={() => setModal(null)} onConfirm={addBusiness} />}
        {modal === "withdraw" && !isAll && selected && <WithdrawModal biz={selected} onClose={() => setModal(null)} onConfirm={handleWithdraw} />}
        {modal && modal !== "create" && modal !== "withdraw" && !isAll && selected && <BusinessActionModal type={modal} biz={selected} onClose={() => setModal(null)} onConfirm={handleAction} />}
      </AnimatePresence>
    </div>
  );
}

export default BusinessPageV1;
