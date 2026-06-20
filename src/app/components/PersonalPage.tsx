import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, ArrowRightLeft, Eye, EyeOff, Edit3, MoreHorizontal, Wallet, Building, Smartphone, CreditCard, ArrowUpRight, ArrowDownRight, X, SlidersHorizontal, FileText, Archive, Search, ChevronRight, ChevronDown, Check, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "./ui/utils";
import { WorkspaceTimeFilter } from "./WorkspaceTimeFilter";
import { QuickDateField, todayISO } from "./QuickDateField";
import { businessSpaces, creditCards, formatMoney, investmentCash, metrics, personalAccounts, personalTransactions, savingGoals, transactionCategories, loans, type CashflowTransaction, type TransactionCategory, type TransactionType, type Loan } from "../finhomeData";
import { finhomeStorageKeys, readStoredJson, writeStoredJson } from "../finhomeStorage";

const iconMap = { "Tiền mặt": Wallet, "Ngân hàng": Building, "Ví điện tử": Smartphone, "Ví khác": CreditCard } as const;
type Account = typeof personalAccounts[0];
type Tab = "accounts" | "income" | "expenses" | "transfers" | "cards" | "history";
type AccountModal = "detail" | "edit" | "adjust" | "actions" | "statement" | null;

const tabs: { id: Tab; label: string; count: number }[] = [
  { id: "accounts", label: "Tài khoản", count: personalAccounts.filter(a => a.status !== "hidden").length },
  { id: "income", label: "Thu nhập", count: personalTransactions.filter(t => t.status !== "cancelled" && t.countsAsIncome).length },
  { id: "expenses", label: "Chi tiêu", count: personalTransactions.filter(t => t.status !== "cancelled" && t.countsAsExpense).length },
  { id: "transfers", label: "Chuyển tiền", count: personalTransactions.filter(t => t.status !== "cancelled" && t.kind === "transfer").length },
  { id: "cards", label: "Thẻ tín dụng", count: creditCards.length },
  { id: "history", label: "Lịch sử giao dịch", count: personalTransactions.length },
];

function accountTx(acc: Account, transactions: CashflowTransaction[]) {
  return transactions.filter(t => t.status !== "cancelled" && (t.source.includes(acc.name) || t.name.includes(acc.name))).slice(0, 12);
}

function AccountCard({ acc, hidden, onOpen }: { acc: Account; hidden: boolean; onOpen: () => void }) {
  const Icon = iconMap[acc.type];
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: acc.status === "hidden" ? 0.58 : 1, y: 0 }} className="group relative">
      <button onClick={onOpen} className="flex min-h-[82px] w-full items-center gap-3 rounded-2xl border border-[#EFEFEF] bg-white px-4 py-3 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:border-black/[0.12] hover:shadow-[0_8px_22px_rgba(0,0,0,0.07)]">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F7]"><Icon className="size-5" style={{ color: acc.color }} strokeWidth={1.8} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#111111]">{acc.name}</p>
              <p className="mt-0.5 truncate text-xs text-[#A3A3A3]">{acc.type} · {acc.currency}</p>
            </div>
            <p className="shrink-0 text-right text-base font-semibold tabular-nums text-[#111111]">{hidden ? "••••••••" : formatMoney(acc.balance)}</p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", acc.status === "hidden" ? "bg-[#F5F5F5] text-[#737373]" : "bg-[#DCFCE7] text-[#166534]")}>{acc.status === "hidden" ? "Đã ẩn" : "Đang sử dụng"}</span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-[#A3A3A3]">Chi tiết <ChevronRight className="size-3.5" /></span>
          </div>
        </div>
      </button>
    </motion.div>
  );
}
function BaseModal({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", bounce: 0.2, duration: 0.35 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5"><div><h2 className="text-base font-semibold text-[#111111]">{title}</h2>{sub && <p className="text-xs text-[#A3A3A3] mt-0.5">{sub}</p>}</div><button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F5F5] text-[#A3A3A3]"><X className="size-4" /></button></div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">{label}<div className="mt-1.5">{children}</div></label>;
}
const inputClass = "w-full rounded-xl border border-black/[0.12] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none focus:border-[#B22222]";

function AccountEditForm({ acc, onClose, onUpdateAccount }: { acc: Account; onClose: () => void; onUpdateAccount: (id: string, patch: Partial<Account>) => void }) {
  const [name, setName] = useState(acc.name);
  const [type, setType] = useState<Account["type"]>(acc.type);
  const [currency, setCurrency] = useState<Account["currency"]>(acc.currency);
  const [color, setColor] = useState(acc.color);
  const [status, setStatus] = useState<Account["status"]>(acc.status);
  const canSave = name.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    onUpdateAccount(acc.id, { name: name.trim(), type, currency, color, status });
    onClose();
  };
  return <BaseModal title={`Sửa ${acc.name}`} sub="Không cho sửa trực tiếp số dư trong form này" onClose={onClose}><div className="space-y-4">
    <Field label="Tên ví/tài khoản"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
    <Field label="Loại ví"><CustomSelect title="Chọn loại ví" value={type} onChange={(next) => setType(next as Account["type"])} options={["Tiền mặt", "Ngân hàng", "Ví điện tử", "Ví khác"].map((item) => ({ value: item, label: item }))} /></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Đơn vị"><CustomSelect title="Chọn đơn vị" value={currency} onChange={(next) => setCurrency(next as Account["currency"])} options={[{ value: "VND", label: "VND" }]} /></Field><Field label="Màu nhận diện"><input className={inputClass} type="color" value={color} onChange={(event) => setColor(event.target.value)} /></Field></div>
    <Field label="Trạng thái"><CustomSelect title="Chọn trạng thái" value={status} onChange={(next) => setStatus(next as Account["status"])} options={[{ value: "active", label: "Đang sử dụng" }, { value: "hidden", label: "Đã ẩn" }, { value: "closed", label: "Đã đóng" }]} /></Field>
    <Field label="Ghi chú"><textarea className={cn(inputClass, "min-h-[86px]")} placeholder="Ghi chú thêm nếu cần" /></Field>
    <div className="rounded-xl bg-[#F9F6F1] px-3 py-2 text-xs text-[#666666]">Số dư hiện tại: <b>{formatMoney(acc.balance)}</b>. Muốn thay đổi số dư hãy dùng “Điều chỉnh số dư”.</div>
    <div className="flex gap-2.5"><button onClick={onClose} className="flex-1 rounded-xl border border-black/[0.12] py-2.5 text-sm font-medium">Hủy</button><button disabled={!canSave} onClick={save} className={cn("flex-1 rounded-xl py-2.5 text-sm font-semibold text-white", canSave ? "bg-[#B22222]" : "bg-[#D4D4D4]")}>Lưu thông tin</button></div>
  </div></BaseModal>;
}


function AccountAdjustForm({ acc, onClose, onAdjustBalance }: { acc: Account; onClose: () => void; onAdjustBalance: (account: Account, actual: number, note: string) => void }) {
  const [actual, setActual] = useState(String(acc.balance));
  const [note, setNote] = useState("");
  const actualValue = Number(actual) || 0;
  const diff = actualValue - acc.balance;
  const save = () => {
    onAdjustBalance(acc, actualValue, note);
    onClose();
  };
  return <BaseModal title={`Điều chỉnh số dư ${acc.name}`} sub="Không tự động tính là thu nhập hoặc chi tiêu" onClose={onClose}><div className="space-y-4">
    <div className="rounded-xl bg-[#F9F6F1] px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">Số dư hiện tại</p><p className="mt-1 text-xl font-semibold text-[#111111]">{formatMoney(acc.balance)}</p></div>
    <Field label="Số dư thực tế mới"><input className={inputClass} type="number" value={actual} onChange={(event) => setActual(event.target.value)} /></Field>
    <div className="rounded-xl border border-dashed border-black/[0.12] px-4 py-3"><p className="text-xs text-[#666666]">Chênh lệch: <b className={diff >= 0 ? "text-[#166534]" : "text-[#B22222]"}>{formatMoney(diff)}</b>. Giao dịch điều chỉnh không tính vào thu nhập, chi tiêu hoặc chuyển tiền nội bộ.</p></div>
    <Field label="Ghi chú"><textarea className={cn(inputClass, "min-h-[76px]")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: đối soát lại số dư ngân hàng" /></Field>
    <div className="flex gap-2.5"><button onClick={onClose} className="flex-1 rounded-xl border border-black/[0.12] py-2.5 text-sm font-medium">Hủy</button><button onClick={save} className="flex-1 rounded-xl bg-[#B22222] py-2.5 text-sm font-semibold text-white">Xác nhận điều chỉnh</button></div>
  </div></BaseModal>;
}

function AccountModalView({ modal, acc, transactions, onClose, onSwitch, onToggleHidden, onAddTransaction, onTransfer, onUpdateAccount, onAdjustBalance }: { modal: AccountModal; acc: Account; transactions: CashflowTransaction[]; onClose: () => void; onSwitch: (m: AccountModal) => void; onToggleHidden: () => void; onAddTransaction: () => void; onTransfer: () => void; onUpdateAccount: (id: string, patch: Partial<Account>) => void; onAdjustBalance: (account: Account, actual: number, note: string) => void }) {
  if (!modal) return null;
  const txs = accountTx(acc, transactions);
  const allAccountTxs = transactions.filter(t => t.status !== "cancelled" && (t.source.includes(acc.name) || t.name.includes(acc.name)));
  const isMoneyIn = (tx: CashflowTransaction) => {
    if (tx.status === "cancelled") return false;
    if (tx.countsAsIncome && tx.source.includes(acc.name)) return true;
    if (tx.kind === "loan_disbursement" && tx.source.includes(acc.name)) return true;
    if (tx.kind === "transfer") {
      const [, to] = tx.source.split(" -> ");
      return Boolean(to?.includes(acc.name));
    }
    return false;
  };
  const isMoneyOut = (tx: CashflowTransaction) => {
    if (tx.status === "cancelled") return false;
    if (tx.countsAsExpense && tx.source.includes(acc.name)) return true;
    if (["loan_principal", "credit_card_payment"].includes(tx.kind) && tx.source.includes(acc.name)) return true;
    if (tx.kind === "transfer") {
      const [from] = tx.source.split(" -> ");
      return from.includes(acc.name);
    }
    return false;
  };
  const moneyIn = transactions.filter(isMoneyIn).reduce((s, t) => s + t.amount, 0);
  const moneyOut = transactions.filter(isMoneyOut).reduce((s, t) => s + t.amount, 0);

  if (modal === "actions") {
    return <BaseModal title={`Thao tác với ${acc.name}`} sub="Chọn chức năng cần dùng" onClose={onClose}><div className="space-y-2">
      <button onClick={() => onSwitch("detail")} className="w-full flex items-center gap-3 rounded-xl border border-black/[0.08] px-4 py-3 text-left hover:bg-[#F9F6F1]"><FileText className="size-4 text-[#B22222]" /><div><p className="text-sm font-semibold">Xem chi tiết ví</p><p className="text-xs text-[#A3A3A3]">Số dư, tiền vào/ra, lịch sử giao dịch</p></div></button>
      <button onClick={() => onSwitch("adjust")} className="w-full flex items-center gap-3 rounded-xl border border-black/[0.08] px-4 py-3 text-left hover:bg-[#F9F6F1]"><SlidersHorizontal className="size-4 text-[#B22222]" /><div><p className="text-sm font-semibold">Điều chỉnh số dư</p><p className="text-xs text-[#A3A3A3]">Tạo giao dịch điều chỉnh, không tính thu/chi</p></div></button>
      <button onClick={onToggleHidden} className="w-full flex items-center gap-3 rounded-xl border border-black/[0.08] px-4 py-3 text-left hover:bg-[#F9F6F1]"><Archive className="size-4 text-[#B22222]" /><div><p className="text-sm font-semibold">{acc.status === "hidden" ? "Hiện ví" : "Ẩn ví"}</p><p className="text-xs text-[#A3A3A3]">Giữ lịch sử, chỉ đổi trạng thái hiển thị</p></div></button>
    </div></BaseModal>;
  }

  if (modal === "edit") return <AccountEditForm acc={acc} onClose={onClose} onUpdateAccount={onUpdateAccount} />;

  if (modal === "adjust") return <AccountAdjustForm acc={acc} onClose={onClose} onAdjustBalance={onAdjustBalance} />;

  if (modal === "statement") {
    return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="flex h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:h-[86vh] sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex-shrink-0 border-b border-black/[0.06] bg-white px-5 pb-4 pt-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <button onClick={() => onSwitch("detail")} className="mb-3 text-xs font-semibold text-[#B22222]">← Quay lại ví</button>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Sao kê ví</p>
              <h2 className="mt-1 truncate text-xl font-semibold text-[#111111]">{acc.name}</h2>
              <p className="mt-0.5 text-xs text-[#A3A3A3]">{acc.type} · {acc.currency} · {acc.status === "hidden" ? "Đã ẩn" : "Đang sử dụng"}</p>
            </div>
            <button onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#A3A3A3]"><X className="size-4" /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#111111]">Toàn bộ giao dịch</h3>
            <span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-semibold text-[#666666]">{allAccountTxs.length} giao dịch</span>
          </div>
          <div className="space-y-2 pb-6">
            {allAccountTxs.length === 0 && <div className="rounded-2xl bg-[#F9F6F1] p-4 text-sm text-[#666666]">Chưa có giao dịch nào liên quan đến ví này.</div>}
            {allAccountTxs.map((tx) => {
              const incoming = isMoneyIn(tx);
              const outgoing = isMoneyOut(tx);
              const signed = incoming ? `+${formatMoney(tx.amount)}` : outgoing ? `-${formatMoney(tx.amount)}` : formatMoney(tx.amount);
              return <div key={tx.id} className="rounded-2xl border border-black/[0.06] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111111]">{tx.name}</p>
                    <p className="mt-1 text-xs text-[#A3A3A3]">{tx.date} · {tx.source}</p>
                    {tx.note && <p className="mt-2 text-xs leading-relaxed text-[#666666]">{tx.note}</p>}
                  </div>
                  <p className={cn("shrink-0 text-sm font-semibold tabular-nums", incoming ? "text-[#166534]" : outgoing ? "text-[#B22222]" : "text-[#111111]")}>{signed}</p>
                </div>
              </div>;
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>;
  }

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="flex h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:h-[86vh] sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
      <div className="flex-shrink-0 border-b border-black/[0.06] bg-white px-5 pb-4 pt-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Chi tiết ví</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-[#111111]">{acc.name}</h2>
            <p className="mt-0.5 text-xs text-[#A3A3A3]">{acc.type} · {acc.currency}</p>
          </div>
          <button onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#A3A3A3]"><X className="size-4" /></button>
        </div>
        <div className="rounded-2xl bg-[#111111] p-4 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Số dư hiện tại</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(acc.balance)}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#F0FDF4] p-3"><p className="text-[10px] font-semibold uppercase text-[#166534]">Tiền vào</p><p className="mt-1 text-sm font-semibold text-[#166534]">{formatMoney(moneyIn)}</p></div>
          <div className="rounded-2xl bg-[#FEF2F2] p-3"><p className="text-[10px] font-semibold uppercase text-[#B22222]">Tiền ra</p><p className="mt-1 text-sm font-semibold text-[#B22222]">{formatMoney(moneyOut)}</p></div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-28 [overscroll-behavior:contain]">
        <p className="mb-3 text-sm font-semibold text-[#111111]">Lịch sử giao dịch</p>
        <div className="space-y-2">
          {txs.length ? txs.map(t => <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.05] bg-white px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-[#111111]">{t.name}</p><p className="mt-0.5 truncate text-[10px] text-[#A3A3A3]">{t.date} · {t.note}</p></div><p className={cn("shrink-0 text-xs font-semibold tabular-nums", t.countsAsIncome ? "text-[#166534]" : t.countsAsExpense ? "text-[#B22222]" : "text-[#111111]")}>{t.countsAsIncome ? "+" : t.countsAsExpense ? "-" : ""}{formatMoney(t.amount)}</p></div>) : <p className="rounded-2xl bg-[#F9F6F1] px-4 py-4 text-sm text-[#666666]">Chưa có giao dịch riêng cho ví này.</p>}
        </div>
      </div>
      <div className="flex-shrink-0 border-t border-[#EFEFEF] bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <button onClick={onTransfer} className="rounded-2xl border border-black/[0.12] py-3 text-sm font-semibold text-[#111111]">Chuyển tiền</button>
          <button onClick={onAddTransaction} className="rounded-2xl bg-[#B22222] py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(178,34,34,0.2)]">+ Giao dịch</button>
          <button onClick={onToggleHidden} className="rounded-2xl border border-black/[0.12] py-3 text-sm font-semibold text-[#111111]">{acc.status === "hidden" ? "Hiện ví" : "Ẩn ví"}</button>
          <button onClick={() => onSwitch("adjust")} className="rounded-2xl border border-black/[0.12] py-3 text-sm font-semibold text-[#111111]">Điều chỉnh</button>
          <button onClick={() => onSwitch("statement")} className="col-span-2 rounded-2xl bg-[#111111] py-3 text-sm font-semibold text-white sm:col-span-4">Xem chi tiết</button>
        </div>
      </div>
    </motion.div>
  </motion.div>;
}


function AddAccountModal({ onClose, onAdd }: { onClose: () => void; onAdd: (account: Account) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Account["type"]>("Ngân hàng");
  const [balance, setBalance] = useState("0");
  const [currency, setCurrency] = useState<Account["currency"]>("VND");
  const [color, setColor] = useState("#B22222");
  const [note, setNote] = useState("");

  const submit = () => {
    const cleanName = name.trim() || "Ví mới";
    onAdd({
      id: `wallet-${Date.now()}`,
      name: cleanName,
      type,
      balance: Number(balance) || 0,
      currency,
      color,
      status: "active",
    });
    onClose();
  };

  return (
    <BaseModal title="Thêm ví / tài khoản" sub="Số dư ban đầu là điều chỉnh số dư, không tính là thu nhập" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Tên ví/tài khoản"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: VCB, Tiền mặt, Momo" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loại ví"><CustomSelect title="Chọn loại ví" value={type} onChange={(next) => setType(next as Account["type"])} options={["Tiền mặt", "Ngân hàng", "Ví điện tử", "Ví khác"].map((item) => ({ value: item, label: item }))} /></Field>
          <Field label="Đơn vị tiền tệ"><CustomSelect title="Chọn đơn vị tiền tệ" value={currency} onChange={(next) => setCurrency(next as Account["currency"])} options={[{ value: "VND", label: "VND" }]} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số dư ban đầu"><input className={inputClass} type="number" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0" /></Field>
          <Field label="Màu nhận diện"><input className={inputClass} type="color" value={color} onChange={(event) => setColor(event.target.value)} /></Field>
        </div>
        <Field label="Ghi chú"><textarea className={cn(inputClass, "min-h-[76px]")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú thêm nếu cần" /></Field>
        <div className="rounded-xl bg-[#F9F6F1] px-3 py-2 text-xs text-[#666666]">
          Khi lưu, hệ thống tạo ví mới và ghi nhận số dư ban đầu như một giao dịch điều chỉnh. Khoản này không tính vào thu nhập, chi tiêu hoặc dòng tiền tháng.
        </div>
        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 rounded-xl border border-black/[0.12] py-2.5 text-sm font-medium">Hủy</button>
          <button onClick={submit} className="flex-1 rounded-xl bg-[#B22222] py-2.5 text-sm font-semibold text-white">Lưu ví</button>
        </div>
      </div>
    </BaseModal>
  );
}
const categoryIconMap: Record<string, string> = {
  "Ăn uống": "🍜",
  "Mua sắm": "🛍️",
  "Di chuyển": "🚗",
  "Lương": "💼",
  "Đầu tư": "📈",
  "Doanh thu bán hàng": "🏪",
  "Chi phí kinh doanh": "🧾",
  "Mua tài sản": "📊",
  "Mục tiêu tiết kiệm": "🏦",
  "Trả nợ vay": "💳",
  "Utensils": "🍽️",
  "ShoppingBag": "🛍️",
  "Car": "🚗",
  "Home": "🏠",
  "Users": "👨‍👩‍👧",
  "HeartPulse": "❤️",
  "GraduationCap": "🎓",
  "Plane": "✈️",
  "CreditCard": "💳",
  "Heart": "🎁",
  "Package": "📦",
};

function categoryIcon(category?: TransactionCategory) {
  if (!category) return "•";
  return categoryIconMap[category.name] ?? categoryIconMap[category.icon] ?? "•";
}

type SelectOption = {
  value: string;
  label: string;
  sub?: string;
  right?: string;
  icon?: React.ReactNode;
};

function CustomSelect({ title, value, options, onChange, placeholder = "Chọn", disabled = false }: { title: string; value: string; options: SelectOption[]; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const list = <div className="space-y-1 p-2">
    {options.map((option) => {
      const active = option.value === value;
      return <button key={option.value} type="button" onClick={() => choose(option.value)} className={cn("flex min-h-[54px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", active ? "bg-[#FDECEC] text-[#B22222]" : "text-[#111111] hover:bg-[#F7F7F7]")}> 
        {option.icon && <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5]", active && "bg-white text-[#B22222]")}>{option.icon}</span>}
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{option.label}</span>{option.sub && <span className={cn("mt-0.5 block truncate text-xs", active ? "text-[#B22222]/75" : "text-[#A3A3A3]")}>{option.sub}</span>}</span>
        {option.right && <span className={cn("shrink-0 text-xs font-semibold tabular-nums", active ? "text-[#B22222]" : "text-[#666666]")}>{option.right}</span>}
        {active && <Check className="size-4 shrink-0 text-[#B22222]" />}
      </button>;
    })}
  </div>;

  return <div ref={wrapperRef} className="relative">
    <button type="button" disabled={disabled} onClick={() => setOpen((value) => !value)} className={cn("flex h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-[#E5E5E5] bg-white px-4 text-left text-sm font-semibold text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)] focus:outline-none", disabled && "cursor-not-allowed opacity-60", open && "border-[#B22222] shadow-[0_0_0_4px_rgba(178,34,34,0.08)]")}>
      <span className="flex min-w-0 items-center gap-2.5">{selected?.icon && <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5]">{selected.icon}</span>}<span className="min-w-0"><span className="block truncate">{selected?.label ?? placeholder}</span>{selected?.sub && <span className="mt-0.5 block truncate text-xs font-medium text-[#A3A3A3]">{selected.sub}</span>}</span></span>
      <ChevronDown className={cn("size-4 shrink-0 text-[#666666] transition-transform", open && "rotate-180 text-[#B22222]")} />
    </button>
    <AnimatePresence>
      {open && <>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.16 }} className="absolute left-0 top-[calc(100%+8px)] z-[95] hidden max-h-[280px] w-full overflow-y-auto rounded-2xl border border-[#EFEFEF] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.14)] sm:block">
          {list}
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] flex items-end bg-black/35 sm:hidden" onClick={() => setOpen(false)}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 260, damping: 28 }} onClick={(event) => event.stopPropagation()} className="max-h-[78vh] w-full overflow-hidden rounded-t-[24px] bg-white shadow-[0_-18px_60px_rgba(0,0,0,0.18)]">
            <div className="sticky top-0 border-b border-black/[0.06] bg-white px-5 pb-4 pt-3"><div className="mx-auto mb-3 h-1 w-12 rounded-full bg-black/15" /><div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-[#111111]">{title}</h3><button type="button" onClick={() => setOpen(false)} className="flex size-10 items-center justify-center rounded-full bg-[#F5F5F5] text-[#666666]"><X className="size-4" /></button></div></div>
            <div className="max-h-[58vh] overflow-y-auto">{list}</div>
            <div className="border-t border-black/[0.06] p-4"><button type="button" onClick={() => setOpen(false)} className="h-[52px] w-full rounded-2xl bg-[#F7F7F7] text-sm font-semibold text-[#111111]">Hủy</button></div>
          </motion.div>
        </motion.div>
      </>}
    </AnimatePresence>
  </div>;
}

function SortPillSelect({ title, value, options, onChange }: { title: string; value: string; options: SelectOption[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return <div ref={wrapperRef} className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} className={cn("flex h-10 items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 text-xs font-semibold text-[#111111] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all hover:bg-[#F9F6F1] focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)] focus:outline-none", open && "border-[#B22222] shadow-[0_0_0_4px_rgba(178,34,34,0.08)]")}>
      <SlidersHorizontal className="size-3.5 text-[#B22222]" />
      <span>{selected?.label ?? title}</span>
      <ChevronDown className={cn("size-3.5 text-[#666666] transition-transform", open && "rotate-180 text-[#B22222]")} />
    </button>
    <AnimatePresence>
      {open && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.16 }} className="absolute right-0 top-[calc(100%+8px)] z-[90] w-[220px] overflow-hidden rounded-2xl border border-[#EFEFEF] bg-white p-2 shadow-[0_18px_45px_rgba(0,0,0,0.14)]">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">{title}</p>
        {options.map((option) => {
          const active = option.value === value;
          return <button key={option.value} type="button" onClick={() => choose(option.value)} className={cn("flex h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors", active ? "bg-[#FDECEC] text-[#B22222]" : "text-[#111111] hover:bg-[#F7F7F7]")}>
            <span>{option.label}</span>
            {active && <Check className="size-4 text-[#B22222]" />}
          </button>;
        })}
      </motion.div>}
    </AnimatePresence>
  </div>;
}

function CategorySelectorSheet({ transactionType, parentId, subcategoryId, onSelect, onClose }: { transactionType: TransactionType; parentId: string; subcategoryId: string; onSelect: (parentId: string, subcategoryId: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const activeParent = transactionCategories.find((category) => category.id === activeParentId);
  const parentList = transactionCategories
    .filter((category) => category.transactionType === transactionType && category.parentCategoryId === null && (showHidden || category.status !== "hidden"))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const childrenOf = (id: string) => transactionCategories
    .filter((category) => category.parentCategoryId === id && (showHidden || category.status !== "hidden"))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const visibleParents = parentList.filter((parent) => !normalizedQuery || parent.name.toLowerCase().includes(normalizedQuery));
  const childList = activeParent ? childrenOf(activeParent.id) : [];
  const visibleChildren = childList.filter((child) => !normalizedQuery || child.name.toLowerCase().includes(normalizedQuery));

  const chooseParent = (parent: TransactionCategory) => {
    const children = childrenOf(parent.id);
    if (children.length === 0) {
      onSelect(parent.id, "");
      onClose();
      return;
    }
    setActiveParentId(parent.id);
    setQuery("");
  };

  const chooseChild = (child: TransactionCategory) => {
    if (!activeParent) return;
    onSelect(activeParent.id, child.id);
    onClose();
  };

  const backToParents = () => {
    setActiveParentId(null);
    setQuery("");
  };

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
    <motion.div initial={{ y: 420, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 420, opacity: 0 }} transition={{ type: "spring", bounce: 0.16, duration: 0.36 }} onClick={(event) => event.stopPropagation()} className="max-h-[86vh] w-full overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:max-w-md sm:rounded-[24px]">
      <div className="sticky top-0 z-10 border-b border-black/[0.06] bg-white px-5 pb-4 pt-3">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-black/15" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {activeParent && <button type="button" onClick={backToParents} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#111111]"><ChevronRight className="size-4 rotate-180" /></button>}
            <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">{transactionType}</p><h3 className="truncate text-lg font-semibold text-[#111111]">{activeParent ? activeParent.name : "Chọn danh mục"}</h3></div>
          </div>
          <button type="button" onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#666666]"><X className="size-4" /></button>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-[#FAFAFA] px-3 py-3">
          <Search className="size-4 text-[#A3A3A3]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={activeParent ? "Tìm danh mục con..." : "Tìm danh mục cha..."} className="w-full bg-transparent text-sm font-medium text-[#111111] outline-none placeholder:text-[#A3A3A3]" autoFocus />
        </div>
        <button type="button" onClick={() => setShowHidden((value) => !value)} className="mt-3 text-xs font-semibold text-[#B22222]">{showHidden ? "Ẩn danh mục đã ẩn" : "Hiển thị danh mục đã ẩn"}</button>
      </div>
      <div className="max-h-[58vh] overflow-y-auto px-5 py-4">
        {!activeParent && <div className="space-y-2">
          {visibleParents.length === 0 && <div className="rounded-2xl bg-[#F9F6F1] px-4 py-5 text-center text-sm font-medium text-[#666666]">Không tìm thấy danh mục cha phù hợp.</div>}
          {visibleParents.map((parent) => {
            const children = childrenOf(parent.id);
            const selected = parentId === parent.id && !subcategoryId;
            return <button key={parent.id} type="button" onClick={() => chooseParent(parent)} className={cn("flex min-h-[58px] w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors", selected ? "border-[#F8D5D5] bg-[#FDECEC] text-[#B22222]" : "border-transparent bg-white text-[#111111] hover:bg-[#F7F7F7]", parent.status === "hidden" && "opacity-55")}> 
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-lg", selected ? "bg-white" : "bg-[#F5F5F5]")}>{categoryIcon(parent)}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-current">{parent.name}</span><span className={cn("mt-0.5 block text-xs", selected ? "text-[#B22222]/75" : "text-[#666666]")}>{children.length} mục con</span></span>
              {selected ? <Check className="size-4 shrink-0 text-[#B22222]" /> : <ChevronRight className="size-4 shrink-0 text-[#C4C4C4]" />}
            </button>;
          })}
        </div>}
        {activeParent && <div className="space-y-2">
          {visibleChildren.length === 0 && <div className="rounded-2xl bg-[#F9F6F1] px-4 py-5 text-center text-sm font-medium text-[#666666]">Không tìm thấy danh mục con phù hợp.</div>}
          {visibleChildren.map((child) => {
            const selected = parentId === activeParent.id && subcategoryId === child.id;
            return <button key={child.id} type="button" onClick={() => chooseChild(child)} className={cn("flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors", selected ? "border-[#F8D5D5] bg-[#FDECEC] text-[#B22222]" : "border-transparent bg-white text-[#111111] hover:bg-[#F7F7F7]", child.status === "hidden" && "opacity-55")}> 
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: child.color }} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-current">{child.name}</span><span className={cn("mt-0.5 block text-xs", selected ? "text-[#B22222]/75" : "text-[#666666]")}>{activeParent.name} / {child.name}</span></span>
              {selected && <Check className="size-4 shrink-0 text-[#B22222]" />}
            </button>;
          })}
        </div>}
      </div>
    </motion.div>
  </motion.div>;
}

function CategorySelectButton({ parent, child, onClick }: { parent?: TransactionCategory; child?: TransactionCategory; onClick: () => void }) {
  const label = parent ? `${categoryIcon(parent)} ${parent.name}${child ? ` / ${child.name}` : ""}` : "Chọn danh mục";
  return <button type="button" onClick={onClick} className="flex h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-[#E5E5E5] bg-white px-4 text-left text-sm font-semibold text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:bg-[#FAFAFA] focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)] focus:outline-none">
    <span>{label}</span>
    <ChevronRight className="size-4 text-[#B22222]" />
  </button>;
}
const LOANS_STORAGE_KEY = finhomeStorageKeys.loans;

function AddTransactionModal({ onClose, onAdd, accounts, cards }: { onClose: () => void; onAdd: (transaction: CashflowTransaction) => void; accounts: Account[]; cards: typeof creditCards }) {
  const activeAccounts = accounts.filter((account) => account.status !== "hidden");
  const loanItems = readStoredJson<Loan[]>(LOANS_STORAGE_KEY, loans).filter((loan) => loan.status !== "settled" && loan.status !== "closed" && loan.outstanding > 0);
  const activeDebtCards = cards.filter((card) => card.status === "active" && card.used > 0);
  const [type, setType] = useState<"income" | "expense" | "loan_payment">("expense");
  const [amount, setAmount] = useState("0");
  const [source, setSource] = useState(activeAccounts[0]?.name ?? "Tiền mặt");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [loanId, setLoanId] = useState(loanItems[0] ? `loan-${loanItems[0].id}` : activeDebtCards[0] ? `card-${activeDebtCards[0].id}` : "");
  const [loanPrincipal, setLoanPrincipal] = useState("0");
  const [loanInterest, setLoanInterest] = useState("0");

  const transactionTypeLabel = type === "income" ? "Thu nhập" : "Chi tiêu";
  const parentCategories = transactionCategories
    .filter((category) => category.status === "active" && category.transactionType === transactionTypeLabel && category.parentCategoryId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const currentParentId = parentCategories.some((category) => category.id === parentCategoryId) ? parentCategoryId : parentCategories[0]?.id ?? "";
  const childCategories = transactionCategories
    .filter((category) => category.status === "active" && category.parentCategoryId === currentParentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedSubcategoryId = childCategories.some((category) => category.id === subcategoryId) ? subcategoryId : "";
  const selectedParent = parentCategories.find((category) => category.id === currentParentId);
  const selectedChild = childCategories.find((category) => category.id === selectedSubcategoryId);
  const selectedLoan = loanId.startsWith("loan-") ? loanItems.find((loan) => loan.id === loanId.replace("loan-", "")) : undefined;
  const selectedPaymentCard = loanId.startsWith("card-") ? activeDebtCards.find((card) => card.id === loanId.replace("card-", "")) : undefined;
  const selectedDebtName = selectedLoan?.name ?? selectedPaymentCard?.name ?? "khoản nợ";
  const selectedDebtOutstanding = selectedLoan?.outstanding ?? selectedPaymentCard?.used ?? 0;

  const transactionTypeOptions: SelectOption[] = [
    { value: "income", label: "Thu nhập", sub: "Tăng số dư và tính vào thu nhập", icon: <ArrowUpRight className="size-4 text-[#166534]" /> },
    { value: "expense", label: "Chi tiêu", sub: "Giảm số dư và tính vào chi tiêu", icon: <ArrowDownRight className="size-4 text-[#B22222]" /> },
    { value: "loan_payment", label: "Thanh toán khoản vay", sub: "Gốc giảm dư nợ, chỉ lãi/phí là chi phí tài chính", icon: <CreditCard className="size-4 text-[#B45309]" /> },
  ];
  const walletOptions: SelectOption[] = activeAccounts.map((account) => {
    const Icon = iconMap[account.type];
    return { value: account.name, label: account.name, sub: "Cá nhân · " + formatMoney(account.balance), icon: <Icon className="size-4" style={{ color: account.color }} /> };
  });
  const creditCardOptions: SelectOption[] = cards
    .filter((card) => card.status === "active")
    .map((card) => ({ value: card.name, label: card.name, sub: "Thẻ tín dụng · dư nợ " + formatMoney(card.used), icon: <CreditCard className="size-4" style={{ color: card.color }} /> }));
  const loanOptions: SelectOption[] = [
    ...loanItems.map((loan) => ({ value: `loan-${loan.id}`, label: loan.name, sub: "Khoản vay · dư nợ " + formatMoney(loan.outstanding) + " · " + loan.bank, icon: <CreditCard className="size-4 text-[#B45309]" /> })),
    ...activeDebtCards.map((card) => ({ value: `card-${card.id}`, label: card.name, sub: "Thẻ tín dụng · dư nợ " + formatMoney(card.used) + " · hạn mức " + formatMoney(card.limit), icon: <CreditCard className="size-4" style={{ color: card.color }} /> })),
  ];
  const accountOptions: SelectOption[] = type === "expense" ? [...walletOptions, ...creditCardOptions] : walletOptions;
  const selectedCreditCard = type === "expense" ? cards.find((card) => card.name === source) : undefined;

  const amountValue = Math.max(0, Number(amount) || 0);
  const principalValue = Math.max(0, Number(loanPrincipal) || 0);
  const interestValue = Math.max(0, Number(loanInterest) || 0);
  const loanTotal = principalValue + interestValue;
  const sourceAccount = activeAccounts.find((account) => account.name === source);
  const invalidLoanPayment = type === "loan_payment" && ((!selectedLoan && !selectedPaymentCard) || loanTotal <= 0 || principalValue > selectedDebtOutstanding || loanTotal > (sourceAccount?.balance ?? 0));

  const submit = () => {
    if (type === "loan_payment") {
      if (invalidLoanPayment) return;
      if (selectedLoan) {
        const storedLoans = readStoredJson<Loan[]>(LOANS_STORAGE_KEY, loans);
        const updatedLoans = storedLoans.map((loan) => {
          if (loan.id !== selectedLoan.id) return loan;
          const nextOutstanding = Math.max(0, loan.outstanding - principalValue);
          return {
            ...loan,
            outstanding: nextOutstanding,
            paidInterest: loan.paidInterest + interestValue,
            status: nextOutstanding === 0 ? "settled" as const : loan.status,
            history: [{ date, total: loanTotal, principal: principalValue, interest: interestValue }, ...loan.history],
          };
        });
        writeStoredJson(LOANS_STORAGE_KEY, updatedLoans);
      }
      if (principalValue > 0) onAdd({
        id: (selectedPaymentCard ? "card-payment-" : "loan-principal-") + Date.now(),
        date,
        name: selectedPaymentCard ? "Thanh toán nợ thẻ tín dụng" : "Thanh toán gốc khoản vay",
        space: "Khoản vay",
        source: selectedPaymentCard ? `${source} -> ${selectedPaymentCard.name}` : source,
        amount: principalValue,
        kind: selectedPaymentCard ? "credit_card_payment" : "loan_principal",
        status: "active",
        note: note.trim() || selectedDebtName + ": gốc nợ giảm dư nợ, không tính chi tiêu",
        countsAsIncome: false,
        countsAsExpense: false,
      });
      if (interestValue > 0) onAdd({
        id: (selectedPaymentCard ? "card-fee-" : "loan-interest-") + Date.now(),
        date,
        name: selectedPaymentCard ? "Phí/lãi thẻ tín dụng" : "Trả lãi/phí khoản vay",
        space: "Khoản vay",
        source,
        amount: interestValue,
        kind: "loan_interest",
        status: "active",
        note: note.trim() || selectedDebtName + ": lãi/phí là chi phí tài chính",
        countsAsIncome: false,
        countsAsExpense: true,
      });
      onClose();
      return;
    }

    const label = selectedChild?.name || selectedParent?.name || (type === "income" ? "Thu nhập cá nhân" : "Chi tiêu cá nhân");
    const transactionKind: CashflowTransaction["kind"] = selectedCreditCard ? "credit_card_spend" : type;
    onAdd({
      id: "personal-tx-" + Date.now(),
      date,
      name: label,
      space: "Cá nhân",
      source,
      amount: amountValue,
      kind: transactionKind,
      status: "active",
      categoryId: currentParentId || undefined,
      subcategoryId: selectedSubcategoryId || undefined,
      note: note.trim() || (selectedCreditCard ? "Chi tiêu bằng thẻ tín dụng, tăng dư nợ thẻ" : (selectedParent?.name ?? transactionTypeLabel) + (selectedChild ? " / " + selectedChild.name : "")),
      countsAsIncome: type === "income",
      countsAsExpense: type === "expense",
    });
    onClose();
  };

  return (
    <BaseModal title="Thêm giao dịch" sub={type === "loan_payment" ? "Thanh toán khoản vay từ ví cá nhân" : "Ghi nhận thu nhập hoặc chi tiêu"} onClose={onClose}>
      <div className="space-y-3.5">
        <QuickDateField label="Ngày giao dịch" value={date} onChange={setDate} variant="chip" />
        <Field label="Loại giao dịch"><CustomSelect title="Chọn loại giao dịch" value={type} options={transactionTypeOptions} onChange={(nextValue) => { setType(nextValue as "income" | "expense" | "loan_payment"); setParentCategoryId(""); setSubcategoryId(""); }} /></Field>
        {type === "loan_payment" ? <>
          <Field label="Khoản vay / Thẻ tín dụng"><CustomSelect title="Chọn khoản vay hoặc thẻ tín dụng" value={loanId} options={loanOptions} onChange={setLoanId} /></Field>
          <Field label="Tài khoản trả tiền"><CustomSelect title="Chọn tài khoản trả tiền" value={source} options={walletOptions} onChange={setSource} /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Gốc nợ"><input className={inputClass} type="number" min="0" value={loanPrincipal} onChange={(event) => setLoanPrincipal(event.target.value)} /></Field>
            <Field label="Lãi / phí"><input className={inputClass} type="number" min="0" value={loanInterest} onChange={(event) => setLoanInterest(event.target.value)} /></Field>
          </div>
          <div className="rounded-2xl bg-[#F9F6F1] px-4 py-3 text-xs leading-relaxed text-[#666666]">Tổng tiền rời tài khoản: <b>{formatMoney(loanTotal)}</b>. Gốc nợ <b>{formatMoney(principalValue)}</b> chỉ giảm dư nợ; lãi/phí <b>{formatMoney(interestValue)}</b> mới tính chi phí tài chính.</div>
          {principalValue > selectedDebtOutstanding && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Gốc thanh toán không được lớn hơn dư nợ hiện tại.</p>}
          {loanTotal > (sourceAccount?.balance ?? 0) && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Tài khoản trả tiền không đủ số dư.</p>}
        </> : <>
          <Field label="Danh mục">
            <CategorySelectButton parent={selectedParent} child={selectedChild} onClick={() => setCategoryPickerOpen(true)} />
          </Field>
          <Field label={type === "expense" ? "Tài khoản / Thẻ tín dụng" : "Tài khoản"}><CustomSelect title={type === "expense" ? "Chọn tài khoản hoặc thẻ" : "Chọn tài khoản"} value={source} options={accountOptions} onChange={setSource} /></Field>
          <Field label="Số tiền"><input className={inputClass} type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="150.000" /></Field>
        </>}
        <Field label="Ghi chú"><textarea className={cn(inputClass, "min-h-[64px] resize-none")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú thêm nếu cần" /></Field>
        <div className="flex gap-2.5 pt-1">
          <button onClick={onClose} className="flex-1 rounded-xl border border-black/[0.12] bg-white py-3 text-sm font-semibold text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">Hủy</button>
          <button onClick={submit} disabled={type === "loan_payment" ? invalidLoanPayment : amountValue <= 0} className={cn("flex-1 rounded-xl py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(178,34,34,0.22)]", (type === "loan_payment" ? invalidLoanPayment : amountValue <= 0) ? "bg-[#D4D4D4]" : "bg-[#B22222]")}>Lưu giao dịch</button>
        </div>
        <AnimatePresence>{categoryPickerOpen && <CategorySelectorSheet transactionType={transactionTypeLabel} parentId={currentParentId} subcategoryId={selectedSubcategoryId} onSelect={(nextParentId, nextSubcategoryId) => { setParentCategoryId(nextParentId); setSubcategoryId(nextSubcategoryId); }} onClose={() => setCategoryPickerOpen(false)} />}</AnimatePresence>
      </div>
    </BaseModal>
  );
}
type TransferTarget = {
  id: string;
  name: string;
  group: "Cá nhân" | "Kinh doanh" | "Đầu tư" | "Tiết kiệm";
  balance?: number;
  icon: typeof Wallet;
  color: string;
};

function TransferPickerSheet({ mode, targets, selectedId, onSelect, onClose }: { mode: "from" | "to"; targets: TransferTarget[]; selectedId?: string; onSelect: (target: TransferTarget) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = targets.filter((target) => `${target.name} ${target.group}`.toLowerCase().includes(query.trim().toLowerCase()));
  const groups: TransferTarget["group"][] = ["Cá nhân", "Kinh doanh", "Đầu tư", "Tiết kiệm"];
  const groupIcon: Record<TransferTarget["group"], string> = { "Cá nhân": "👤", "Kinh doanh": "🏢", "Đầu tư": "📈", "Tiết kiệm": "🏦" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div initial={{ y: 420 }} animate={{ y: 0 }} exit={{ y: 420 }} transition={{ type: "spring", bounce: 0.18, duration: 0.36 }} className="w-full sm:max-w-md max-h-[86vh] bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-5 pt-3 pb-4 border-b border-black/[0.06]">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-black/15" />
          <div className="flex items-center justify-between mb-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">{mode === "from" ? "Chọn nguồn tiền" : "Chọn nơi nhận"}</p><h3 className="text-lg font-semibold text-[#111111]">{mode === "from" ? "Từ đâu?" : "Đến đâu?"}</h3></div>
            <button onClick={onClose} className="size-10 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[#666666]"><X className="size-4" /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A3A3A3]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tài khoản, ví, mục tiêu…" className="w-full rounded-2xl border border-black/[0.08] bg-[#F9F9F9] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#B22222]" autoFocus />
          </div>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-5 max-h-[62vh]">
          {groups.map((group) => {
            const items = filtered.filter((target) => target.group === group);
            if (!items.length) return null;
            return <section key={group}><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#A3A3A3]">{groupIcon[group]} {group}</p><div className="space-y-2">{items.map((target) => { const Icon = target.icon; const active = selectedId === target.id; return <button key={target.id} onClick={() => onSelect(target)} className={cn("w-full flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors", active ? "border-[#B22222] bg-[#FFF5F5]" : "border-black/[0.07] bg-white hover:bg-[#F9F6F1]")}><div className="size-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0"><Icon className="size-4" style={{ color: target.color }} /></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[#111111] truncate">{target.name}</p><p className="text-xs text-[#A3A3A3]">{target.group}</p></div>{target.balance !== undefined && <p className="text-xs font-semibold tabular-nums text-[#111111]">{formatMoney(target.balance)}</p>}<ChevronRight className="size-4 text-[#C4C4C4]" /></button>; })}</div></section>;
          })}
          {!filtered.length && <div className="rounded-2xl bg-[#F9F6F1] px-4 py-6 text-center text-sm text-[#666666]">Không tìm thấy tài khoản phù hợp.</div>}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TransferSelectBox({ label, value, onClick }: { label: string; value?: TransferTarget; onClick: () => void }) {
  return <button onClick={onClick} className="w-full rounded-2xl border border-black/[0.1] bg-white px-4 py-3 text-left hover:bg-[#F9F6F1] transition-colors"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#666666]">{label}</p><div className="flex items-center justify-between gap-3"><div>{value ? <><p className="text-base font-semibold text-[#111111]">{value.name}</p><p className="text-xs text-[#A3A3A3]">{value.group}</p></> : <p className="text-base font-semibold text-[#A3A3A3]">Chọn {label.toLowerCase()}</p>}</div><ChevronRight className="size-5 text-[#B22222]" /></div></button>;
}

function TransferModal({ onClose, accounts, onConfirm }: { onClose: () => void; accounts: Account[]; onConfirm: (transaction: CashflowTransaction) => void }) {
  const activeAccounts = accounts.filter((account) => account.status !== "hidden" && account.status !== "closed");
  const targets: TransferTarget[] = [
    ...activeAccounts.map((account) => ({ id: `personal-${account.id}`, name: account.name, group: "Cá nhân" as const, balance: account.balance, icon: iconMap[account.type], color: account.color })),
    ...businessSpaces.filter((space) => space.status === "active").map((space) => ({ id: `business-${space.id}`, name: space.name, group: "Kinh doanh" as const, balance: space.cash, icon: Building, color: "#8B2F13" })),
    { id: "investment-cash", name: "Tiền mặt đầu tư", group: "Đầu tư", balance: investmentCash, icon: ArrowUpRight, color: "#166534" },
    { id: "investment-tcbs", name: "TCBS", group: "Đầu tư", balance: investmentCash, icon: Building, color: "#B22222" },
    { id: "investment-crypto", name: "Crypto", group: "Đầu tư", icon: ArrowUpRight, color: "#111111" },
    ...savingGoals.filter((goal) => !["hidden", "closed", "paused"].includes(goal.status)).map((goal) => ({ id: `saving-${goal.id}`, name: goal.name, group: "Tiết kiệm" as const, balance: goal.current, icon: Wallet, color: "#0F766E" })),
  ];
  const [from, setFrom] = useState<TransferTarget | undefined>(targets.find((target) => target.group === "Cá nhân"));
  const [to, setTo] = useState<TransferTarget | undefined>(targets.find((target) => target.group === "Tiết kiệm"));
  const [amount, setAmount] = useState("0");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [businessTransferType, setBusinessTransferType] = useState<"capital" | "cashTopup">("capital");

  const amountValue = Number(amount) || 0;
  const sameTarget = Boolean(from && to && from.id === to.id);
  const invalidAmount = amountValue <= 0;
  const insufficient = Boolean(from?.balance !== undefined && amountValue > from.balance);
  const isPersonalToBusiness = from?.group === "Cá nhân" && to?.group === "Kinh doanh";
  const canSubmit = Boolean(from && to && !sameTarget && !invalidAmount && !insufficient);

  const chooseTarget = (target: TransferTarget) => {
    if (picker === "from") setFrom(target);
    if (picker === "to") setTo(target);
    setPicker(null);
  };

  const submit = () => {
    if (!from || !to || !canSubmit) return;
    const label = isPersonalToBusiness ? (businessTransferType === "capital" ? "Góp vốn kinh doanh" : "Bổ sung tiền mặt kinh doanh") : "Chuyển tiền nội bộ";
    onConfirm({
      id: `transfer-${Date.now()}`,
      date,
      name: label,
      space: from.group === "Cá nhân" ? to.group : from.group,
      source: `${from.name} -> ${to.name}`,
      amount: amountValue,
      kind: "transfer",
      status: "active",
      note: note.trim() || (isPersonalToBusiness ? (businessTransferType === "capital" ? "Góp vốn, không phải doanh thu" : "Bổ sung tiền mặt, không tăng vốn góp") : "Chuyển tiền nội bộ, không tính thu nhập hoặc chi tiêu"),
      countsAsIncome: false,
      countsAsExpense: false,
    });
    onClose();
  };
  return (
    <BaseModal title="Chuyển tiền nội bộ" sub="Chọn Từ đâu → Đến đâu bằng Bottom Sheet" onClose={onClose}>
      <div className="space-y-4">
        <TransferSelectBox label="Từ" value={from} onClick={() => setPicker("from")} />
        <TransferSelectBox label="Đến" value={to} onClick={() => setPicker("to")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Số tiền"><input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" className={inputClass} /></Field><div><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">Ngày giao dịch</p><QuickDateField label="Ngày giao dịch" value={date} onChange={setDate} variant="chip" /></div></div>
        {isPersonalToBusiness && <div className="rounded-2xl border border-black/[0.08] bg-[#F9F6F1] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">Loại chuyển vào Kinh doanh</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setBusinessTransferType("capital")} className={cn("rounded-xl px-3 py-2 text-xs font-semibold border transition-colors", businessTransferType === "capital" ? "bg-[#111111] text-white border-[#111111]" : "bg-white text-[#111111] border-black/[0.1]")}>Góp vốn</button>
            <button type="button" onClick={() => setBusinessTransferType("cashTopup")} className={cn("rounded-xl px-3 py-2 text-xs font-semibold border transition-colors", businessTransferType === "cashTopup" ? "bg-[#111111] text-white border-[#111111]" : "bg-white text-[#111111] border-black/[0.1]")}>Bổ sung tiền mặt</button>
          </div>
          <p className="mt-2 text-xs text-[#666666]">{businessTransferType === "capital" ? "Tăng tiền mặt kinh doanh và tăng vốn góp. Không tính doanh thu." : "Chỉ tăng tiền mặt kinh doanh, không tăng vốn góp. Không tính doanh thu."}</p>
        </div>}
        <Field label="Ghi chú"><textarea className={cn(inputClass, "min-h-[76px]")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú thêm nếu cần" /></Field>

        <div className="flex gap-2.5"><button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-black/[0.12] text-sm font-medium">Hủy</button><button disabled={!canSubmit} onClick={submit} className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold text-white", canSubmit ? "bg-[#B22222]" : "bg-[#D4D4D4]")}>Xác nhận</button></div>
      </div>
      <AnimatePresence>{picker && <TransferPickerSheet mode={picker} targets={targets.filter((target) => picker === "from" || target.id !== from?.id)} selectedId={picker === "from" ? from?.id : to?.id} onSelect={chooseTarget} onClose={() => setPicker(null)} />}</AnimatePresence>
    </BaseModal>
  );
}


function CreditCardPaymentModal({ onClose, accounts, cards, onPay }: { onClose: () => void; accounts: Account[]; cards: typeof creditCards; onPay: (payload: { cardId: string; accountName: string; principal: number; fee: number; date: string; note: string }) => void }) {
  const activeCards = cards.filter((card) => card.status === "active");
  const activeAccounts = accounts.filter((account) => account.status !== "hidden" && account.status !== "closed");
  const [cardId, setCardId] = useState(activeCards[0]?.id ?? "");
  const [accountName, setAccountName] = useState(activeAccounts[0]?.name ?? "");
  const [principal, setPrincipal] = useState("0");
  const [fee, setFee] = useState("0");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const card = activeCards.find((item) => item.id === cardId);
  const account = activeAccounts.find((item) => item.name === accountName);
  const principalValue = Math.max(0, Number(principal) || 0);
  const feeValue = Math.max(0, Number(fee) || 0);
  const total = principalValue + feeValue;
  const invalid = total <= 0 || principalValue > (card?.used ?? 0) || total > (account?.balance ?? 0);
  const cardOptions: SelectOption[] = activeCards.map((item) => ({ value: item.id, label: item.name, sub: `Dư nợ ${formatMoney(item.used)} · hạn mức ${formatMoney(item.limit)}`, icon: <CreditCard className="size-4" style={{ color: item.color }} /> }));
  const accountOptions: SelectOption[] = activeAccounts.map((item) => ({ value: item.name, label: item.name, sub: `Cá nhân · ${formatMoney(item.balance)}`, icon: <Wallet className="size-4" style={{ color: item.color }} /> }));

  const submit = () => {
    if (invalid || !card) return;
    onPay({ cardId, accountName, principal: principalValue, fee: feeValue, date, note });
    onClose();
  };

  return <BaseModal title="Thanh toán thẻ tín dụng" sub="Gốc thẻ không tính chi tiêu lần hai, chỉ phí/lãi/phạt là chi phí tài chính" onClose={onClose}>
    <div className="space-y-4">
      <Field label="Thẻ tín dụng"><CustomSelect title="Chọn thẻ tín dụng" value={cardId} options={cardOptions} onChange={setCardId} /></Field>
      <Field label="Tài khoản trả tiền"><CustomSelect title="Chọn tài khoản trả tiền" value={accountName} options={accountOptions} onChange={setAccountName} /></Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Gốc thẻ"><input className={inputClass} type="number" min="0" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></Field><Field label="Phí / lãi / phạt"><input className={inputClass} type="number" min="0" value={fee} onChange={(event) => setFee(event.target.value)} /></Field></div>
      <div><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">Ngày thanh toán</p><QuickDateField label="Ngày thanh toán" value={date} onChange={setDate} variant="chip" /></div>
      <Field label="Ghi chú"><textarea className={cn(inputClass, "min-h-[76px]")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú thêm nếu cần" /></Field>
      <div className="rounded-2xl bg-[#F9F6F1] px-4 py-3 text-xs leading-relaxed text-[#666666]">Tổng tiền rời tài khoản: <b>{formatMoney(total)}</b>. Gốc thẻ <b>{formatMoney(principalValue)}</b> chỉ giảm dư nợ; phí/lãi/phạt <b>{formatMoney(feeValue)}</b> mới tính vào chi phí tài chính.</div>
      {principalValue > (card?.used ?? 0) && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Gốc thanh toán không được lớn hơn dư nợ thẻ.</p>}
      {total > (account?.balance ?? 0) && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Tài khoản trả tiền không đủ số dư.</p>}
      <div className="flex gap-2.5"><button onClick={onClose} className="flex-1 rounded-xl border border-black/[0.12] py-3 text-sm font-semibold text-[#111111]">Hủy</button><button disabled={invalid} onClick={submit} className={cn("flex-1 rounded-xl py-3 text-sm font-semibold text-white", invalid ? "bg-[#D4D4D4]" : "bg-[#B22222]")}>Xác nhận</button></div>
    </div>
  </BaseModal>;
}

const PERSONAL_STORAGE_KEYS = {
  accounts: finhomeStorageKeys.personalAccounts,
  cards: finhomeStorageKeys.personalCards,
  transactions: finhomeStorageKeys.personalTransactions,
  cancelled: finhomeStorageKeys.personalCancelledTransactions,
} as const;
export function PersonalPage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [showHidden, setShowHidden] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set(personalAccounts.filter(a => a.status === "hidden").map(a => a.id)));
  const [showTransfer, setShowTransfer] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>(() => readStoredJson(PERSONAL_STORAGE_KEYS.accounts, personalAccounts));
  const [cards, setCards] = useState<typeof creditCards>(() => readStoredJson(PERSONAL_STORAGE_KEYS.cards, creditCards));
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountQuery, setAccountQuery] = useState("");
  const [accountSort, setAccountSort] = useState<"balance" | "name" | "type" | "newest">("balance");
  const [extraTransactions, setExtraTransactions] = useState<CashflowTransaction[]>(() => readStoredJson(PERSONAL_STORAGE_KEYS.transactions, []));
  const [cancelledTxIds, setCancelledTxIds] = useState<Set<string>>(() => new Set(readStoredJson<string[]>(PERSONAL_STORAGE_KEYS.cancelled, [])));
  const [deleteTarget, setDeleteTarget] = useState<CashflowTransaction | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountModal, setAccountModal] = useState<AccountModal>(null);
  useEffect(() => writeStoredJson(PERSONAL_STORAGE_KEYS.accounts, accounts), [accounts]);
  useEffect(() => writeStoredJson(PERSONAL_STORAGE_KEYS.cards, cards), [cards]);
  useEffect(() => writeStoredJson(PERSONAL_STORAGE_KEYS.transactions, extraTransactions), [extraTransactions]);
  useEffect(() => writeStoredJson(PERSONAL_STORAGE_KEYS.cancelled, Array.from(cancelledTxIds)), [cancelledTxIds]);
  const toggle = (id: string) => setHidden(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const updateCards = (updater: (items: typeof creditCards) => typeof creditCards) => {
    setCards((items) => {
      const next = updater(items);
      writeStoredJson(PERSONAL_STORAGE_KEYS.cards, next);
      return next;
    });
  };
  const updateAccounts = (updater: (items: Account[]) => Account[]) => {
    setAccounts((items) => {
      const next = updater(items);
      writeStoredJson(PERSONAL_STORAGE_KEYS.accounts, next);
      return next;
    });
  };
  const openAccount = (acc: Account, modal: AccountModal) => { setSelectedAccount(acc); setAccountModal(modal); };
  const visibleAccounts = accounts
    .filter(a => showHidden || a.status !== "hidden")
    .filter(a => `${a.name} ${a.type} ${a.currency}`.toLowerCase().includes(accountQuery.trim().toLowerCase()))
    .sort((a, b) => {
      if (accountSort === "balance") return b.balance - a.balance;
      if (accountSort === "name") return a.name.localeCompare(b.name, "vi");
      if (accountSort === "type") return a.type.localeCompare(b.type, "vi") || a.name.localeCompare(b.name, "vi");
      return accounts.indexOf(b) - accounts.indexOf(a);
    });
  const allTransactions = [...extraTransactions, ...personalTransactions].map((tx) => cancelledTxIds.has(tx.id) ? { ...tx, status: "cancelled" as const } : tx);
  const currentPersonalBalance = accounts.filter(a => a.status !== "hidden").reduce((s, a) => s + a.balance, 0);
  const isReportExpense = (transaction: CashflowTransaction) => transaction.status !== "cancelled" && Boolean(transaction.countsAsExpense) && !["credit_card_payment", "loan_principal"].includes(transaction.kind);
  const isReportIncome = (transaction: CashflowTransaction) => transaction.status !== "cancelled" && Boolean(transaction.countsAsIncome) && transaction.kind !== "loan_disbursement";
  const incomeItems = allTransactions.filter(isReportIncome);
  const expenseItems = allTransactions.filter(isReportExpense);
  const transferItems = allTransactions.filter(t => t.status !== "cancelled" && ["transfer", "loan_disbursement", "loan_principal", "credit_card_payment"].includes(t.kind));
  const currentIncome = incomeItems.reduce((sum, tx) => sum + tx.amount, 0);
  const currentExpenses = expenseItems.reduce((sum, tx) => sum + tx.amount, 0);
  const currentFinancialCosts = allTransactions.filter(t => t.status !== "cancelled" && t.kind === "loan_interest" && t.countsAsExpense).reduce((sum, tx) => sum + tx.amount, 0);
  const displayedTabs = [
    { id: "accounts" as const, label: "Tài khoản", count: accounts.filter(a => a.status !== "hidden").length },
    { id: "income" as const, label: "Thu nhập", count: incomeItems.length },
    { id: "expenses" as const, label: "Chi tiêu", count: expenseItems.length },
    { id: "transfers" as const, label: "Chuyển tiền", count: transferItems.length },
    { id: "cards" as const, label: "Thẻ tín dụng", count: cards.length },
    { id: "history" as const, label: "Lịch sử giao dịch", count: allTransactions.length },
  ];
  const applyTransactionToAccounts = (transaction: CashflowTransaction, direction: 1 | -1) => {
    const [from, to] = transaction.source.split(" -> ");
    if (transaction.kind === "credit_card_spend") {
      updateCards((items) => items.map((card) => card.name === transaction.source ? { ...card, used: Math.max(0, card.used + transaction.amount * direction) } : card));
      return;
    }
    if (transaction.kind === "credit_card_payment") {
      updateCards((items) => items.map((card) => card.name === to ? { ...card, used: Math.max(0, card.used - transaction.amount * direction) } : card));
    }
    if (!["income", "expense", "transfer", "loan_disbursement", "loan_principal", "loan_interest", "credit_card_payment", "adjustment"].includes(transaction.kind)) return;
    updateAccounts((items) => items.map((account) => {
      if ((transaction.kind === "income" || transaction.kind === "loan_disbursement") && account.name === transaction.source) return { ...account, balance: account.balance + transaction.amount * direction };
      if ((transaction.kind === "expense" || transaction.kind === "loan_principal" || transaction.kind === "loan_interest") && account.name === transaction.source) return { ...account, balance: account.balance - transaction.amount * direction };
      if (transaction.kind === "credit_card_payment" && account.name === from) return { ...account, balance: account.balance - transaction.amount * direction };
      if (transaction.kind === "adjustment" && account.name === transaction.source) return { ...account, balance: account.balance + transaction.amount * direction };
      if (transaction.kind === "transfer" && account.name === from) return { ...account, balance: account.balance - transaction.amount * direction };
      if (transaction.kind === "transfer" && account.name === to) return { ...account, balance: account.balance + transaction.amount * direction };
      return account;
    }));
  };
  const addTransaction = (transaction: CashflowTransaction) => {
    setExtraTransactions((items) => [transaction, ...items]);
    applyTransactionToAccounts(transaction, 1);
  };
  const updateAccount = (id: string, patch: Partial<Account>) => {
    setAccounts((items) => items.map((account) => account.id === id ? { ...account, ...patch } : account));
    setSelectedAccount((current) => current?.id === id ? { ...current, ...patch } : current);
  };
  const adjustAccountBalance = (account: Account, actual: number, note: string) => {
    const diff = actual - account.balance;
    if (diff === 0) return;
    addTransaction({
      id: `adjust-${Date.now()}`,
      date: todayISO(),
      name: "Điều chỉnh số dư",
      space: "Cá nhân",
      source: account.name,
      amount: diff,
      kind: "adjustment",
      status: "active",
      note: note || `Điều chỉnh số dư từ ${formatMoney(account.balance)} thành ${formatMoney(actual)}`,
      countsAsIncome: false,
      countsAsExpense: false,
    });
    setSelectedAccount((current) => current?.id === account.id ? { ...current, balance: actual } : current);
  };
  const payCreditCard = ({ cardId, accountName, principal, fee, date, note }: { cardId: string; accountName: string; principal: number; fee: number; date: string; note: string }) => {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;
    const paymentTx: CashflowTransaction = {
      id: `card-payment-${Date.now()}`,
      date,
      name: "Thanh toán nợ thẻ tín dụng",
      space: "Khoản vay",
      source: `${accountName} -> ${card.name}`,
      amount: principal,
      kind: "credit_card_payment",
      status: "active",
      note: note || "Thanh toán gốc thẻ, không tính chi tiêu lần hai",
      countsAsIncome: false,
      countsAsExpense: false,
    };
    addTransaction(paymentTx);
    if (fee > 0) {
      addTransaction({
        id: `card-fee-${Date.now()}`,
        date,
        name: "Phí/lãi thẻ tín dụng",
        space: "Khoản vay",
        source: accountName,
        amount: fee,
        kind: "loan_interest",
        status: "active",
        note: "Phí/lãi/phạt thẻ là chi phí tài chính",
        countsAsExpense: true,
      });
    }
    setTab("cards");
  };
  const cancelTransaction = (transaction: CashflowTransaction) => {
    setCancelledTxIds((ids) => new Set(ids).add(transaction.id));
    setExtraTransactions((items) => items.map((item) => item.id === transaction.id ? { ...item, status: "cancelled" } : item));
    if (extraTransactions.some((item) => item.id === transaction.id)) applyTransactionToAccounts(transaction, -1);
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-full bg-[#F9F9F9]"><div className="px-6 lg:px-8 py-8 max-w-[1200px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-[0.1em] mb-1">Ví trung tâm</p><h1 className="text-[1.75rem] font-semibold text-[#111111] tracking-tight leading-none">Cá nhân</h1></div><div className="flex flex-wrap items-center justify-end gap-2"><WorkspaceTimeFilter /><button onClick={() => setShowTransfer(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/[0.12] bg-white text-xs font-semibold text-[#111111] shadow-sm hover:bg-[#F9F6F1]"><ArrowRightLeft className="size-3.5 text-[#111111]" /> Chuyển tiền</button><button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#B22222] text-xs font-semibold text-white" onClick={() => setShowTransaction(true)}><Plus className="size-3.5" /> Giao dịch</button></div></div></motion.div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
        ["Tổng số dư cá nhân", formatMoney(currentPersonalBalance), "Tổng ví đang sử dụng", "text-[#111111]"],
        ["Thu nhập tháng này", `+${formatMoney(currentIncome)}`, "Chỉ thu nhập thực tế", "text-[#166534]"],
        ["Chi tiêu tháng này", `-${formatMoney(currentExpenses)}`, "Gồm chi tiêu tiền mặt và bằng thẻ", "text-[#B22222]"],
        ["Chi phí tài chính", `-${formatMoney(currentFinancialCosts)}`, "Lãi vay, phí vay, phí thẻ", "text-[#B45309]"],
      ].map(([label, value, sub, color]) => <div key={label} className="rounded-2xl bg-white border border-black/[0.07] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"><p className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-[0.1em] mb-2">{label}</p><p className={cn("text-xl font-semibold tabular-nums", color)}>{value}</p><p className="text-xs text-[#666666] mt-2">{sub}</p></div>)}</div>
      <div className="flex gap-1 bg-black/[0.04] p-1 rounded-xl w-fit flex-wrap">{displayedTabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={cn("relative px-4 py-2 rounded-lg text-xs font-semibold", tab === t.id ? "bg-white text-[#111111] shadow-sm" : "text-[#A3A3A3]")}>{t.label}<span className="ml-1.5 text-[9px]">{t.count}</span></button>)}</div>
      <AnimatePresence mode="wait">
        {tab === "accounts" && <motion.div key="accounts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A3A3A3]" />
              <input value={accountQuery} onChange={(event) => setAccountQuery(event.target.value)} placeholder="Tìm ví, ngân hàng, loại ví..." className="h-11 w-full rounded-2xl border border-[#EFEFEF] bg-white pl-10 pr-4 text-sm font-medium text-[#111111] outline-none shadow-[0_1px_4px_rgba(0,0,0,0.03)] focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)]" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <SortPillSelect title="Sắp xếp ví" value={accountSort} onChange={(next) => setAccountSort(next as typeof accountSort)} options={[{ value: "balance", label: "Số dư cao nhất" }, { value: "name", label: "Tên A-Z" }, { value: "type", label: "Loại ví" }, { value: "newest", label: "Mới thêm gần đây" }]} />
              <button title={showHidden ? "Ẩn ví đã ẩn" : "Xem ví đã ẩn"} aria-label={showHidden ? "Ẩn ví đã ẩn" : "Xem ví đã ẩn"} onClick={() => setShowHidden(!showHidden)} className={cn("flex size-10 items-center justify-center rounded-xl border text-[#B22222] transition-colors", showHidden ? "border-[#B22222] bg-[#FFF5F5]" : "border-black/[0.12] bg-white hover:bg-[#F9F6F1]")}>{showHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              <button onClick={() => setShowAddAccount(true)} className="flex items-center gap-1.5 rounded-xl bg-[#B22222] px-3.5 py-2.5 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(178,34,34,0.18)] hover:bg-[#C93535]"><Plus className="size-3.5" /> Thêm ví</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {visibleAccounts.map(acc => <AccountCard key={acc.id} acc={acc} hidden={hidden.has(acc.id)} onOpen={() => openAccount(acc, "detail")} />)}
          </div>
          {!visibleAccounts.length && <div className="rounded-2xl border border-dashed border-black/[0.12] bg-white px-4 py-8 text-center text-sm text-[#666666]">Không tìm thấy ví phù hợp.</div>}
        </motion.div>}
        {tab === "income" && <List title="Thu nhập thực tế" total={`+${formatMoney(currentIncome)}`} items={incomeItems} mode="income" onDelete={setDeleteTarget} />}
        {tab === "expenses" && <List title="Chi tiêu cá nhân" total={`-${formatMoney(currentExpenses)}`} items={expenseItems} mode="expense" onDelete={setDeleteTarget} />}
        {tab === "transfers" && <List title="Luồng tiền không tính thu/chi" total="Không đổi tài sản ròng" items={transferItems} mode="neutral" onDelete={setDeleteTarget} />}
        {tab === "cards" && <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">{cards.map(card => { const available = Math.max(0, card.limit - card.used); const usagePct = card.limit ? Math.min(100, Math.round(card.used / card.limit * 100)) : 0; return <div key={card.id} className="rounded-2xl bg-white border border-black/[0.07] p-5"><div className="rounded-2xl p-5 text-white mb-4" style={{ background: card.color }}><div className="flex items-start justify-between gap-3"><div><p className="text-white/60 text-xs">{card.bank}</p><p className="font-semibold">{card.name}</p></div><div className="text-right"><p className="text-white/60 text-[10px] uppercase font-semibold tracking-[0.1em]">Hạn mức</p><p className="text-sm font-semibold">{formatMoney(card.limit)}</p></div></div><p className="text-2xl font-semibold mt-6">{formatMoney(card.used)}</p><p className="text-white/50 text-xs">Dư nợ thẻ · •••• {card.last4}</p><div className="mt-4 h-2 rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${usagePct}%` }} /></div><div className="mt-2 flex items-center justify-between text-[11px] text-white/70"><span>Đã dùng {usagePct}%</span><span>Còn {formatMoney(available)}</span></div></div><p className="text-xs text-[#666666]">Chi tiêu bằng thẻ tạo chi tiêu và tăng nợ thẻ. Thanh toán thẻ không tính chi tiêu lần hai.</p></div>; })}</motion.div>}
        {tab === "history" && <PersonalTransactionHistory items={allTransactions} onDelete={setDeleteTarget} />}
      </AnimatePresence>
    </div><AnimatePresence>{showTransfer && <TransferModal onClose={() => setShowTransfer(false)} accounts={accounts} onConfirm={addTransaction} />}
      {showCardPayment && <CreditCardPaymentModal onClose={() => setShowCardPayment(false)} accounts={accounts} cards={cards} onPay={payCreditCard} />}{showTransaction && <AddTransactionModal onClose={() => setShowTransaction(false)} onAdd={addTransaction} accounts={accounts} cards={cards} />}{deleteTarget && <DeleteTransactionModal transaction={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => cancelTransaction(deleteTarget)} />}{showAddAccount && <AddAccountModal onClose={() => setShowAddAccount(false)} onAdd={(account) => setAccounts((items) => [...items, account])} />}{selectedAccount && accountModal && <AccountModalView modal={accountModal} acc={selectedAccount} transactions={allTransactions} onClose={() => setAccountModal(null)} onSwitch={setAccountModal} onAddTransaction={() => { setAccountModal(null); setShowTransaction(true); }} onTransfer={() => { setAccountModal(null); setShowTransfer(true); }} onToggleHidden={() => { toggle(selectedAccount.id); setAccountModal(null); }} onUpdateAccount={updateAccount} onAdjustBalance={adjustAccountBalance} />}</AnimatePresence></div>
  );
}

function DeleteTransactionModal({ transaction, onClose, onConfirm }: { transaction: CashflowTransaction; onClose: () => void; onConfirm: () => void }) {
  return <BaseModal title="Xóa giao dịch?" sub="Giao dịch sẽ chuyển sang trạng thái Đã hủy, không xóa cứng khỏi lịch sử." onClose={onClose}>
    <div className="space-y-4">
      <div className="flex gap-3 rounded-2xl bg-[#FEF2F2] p-4 text-[#B22222]"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><div><p className="text-sm font-semibold">{transaction.name}</p><p className="mt-1 text-xs text-[#7F1D1D]">{transaction.source} · {formatMoney(transaction.amount)}</p></div></div>
      <p className="text-xs leading-relaxed text-[#666666]">Sau khi xóa, giao dịch này không còn tính vào thu nhập, chi tiêu, chuyển tiền và báo cáo. Dữ liệu vẫn được giữ để kiểm tra lịch sử sau này.</p>
      <div className="flex gap-2.5"><button onClick={onClose} className="flex-1 rounded-xl border border-black/[0.12] py-3 text-sm font-semibold text-[#111111]">Hủy</button><button onClick={onConfirm} className="flex-1 rounded-xl bg-[#B22222] py-3 text-sm font-semibold text-white">Xóa giao dịch</button></div>
    </div>
  </BaseModal>;
}

function List({ title, total, items, mode, onDelete }: { title: string; total: string; items: typeof personalTransactions; mode: "income" | "expense" | "neutral"; onDelete: (transaction: CashflowTransaction) => void }) {
  return <motion.div key={title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-2xl border border-black/[0.07] shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden"><div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.05]"><p className="text-base font-semibold text-[#111111]">{title}</p><span className="text-sm font-semibold text-[#111111]">{total}</span></div><div className="divide-y divide-black/[0.04]">{items.map(item => <div key={item.id} className="flex items-center gap-4 px-6 py-4"><div className={cn("size-9 rounded-xl flex items-center justify-center", mode === "income" ? "bg-[#DCFCE7]" : mode === "expense" ? "bg-[#FEF2F2]" : "bg-[#F5F5F5]")}>{mode === "income" ? <ArrowUpRight className="size-4 text-[#166534]" /> : mode === "expense" ? <ArrowDownRight className="size-4 text-[#B22222]" /> : <ArrowRightLeft className="size-4 text-[#666666]" />}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-[#111111]">{item.name}</p><p className="mt-0.5 truncate text-xs text-[#A3A3A3]">{item.source} · {item.note}</p></div><p className={cn("text-sm font-semibold tabular-nums", mode === "income" ? "text-[#166534]" : mode === "expense" ? "text-[#B22222]" : "text-[#111111]")}>{mode === "income" ? "+" : mode === "expense" ? "-" : ""}{formatMoney(item.amount)}</p><button title="Xóa giao dịch" aria-label="Xóa giao dịch" onClick={() => onDelete(item)} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[#A3A3A3] transition-colors hover:bg-[#FEF2F2] hover:text-[#B22222]"><Trash2 className="size-4" /></button></div>)}</div></motion.div>;
}

function PersonalTransactionHistory({ items, onDelete }: { items: CashflowTransaction[]; onDelete: (transaction: CashflowTransaction) => void }) {
  const sortedItems = [...items].sort((a, b) => b.date.localeCompare(a.date));
  const formatDate = (value: string) => {
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
  };

  const toneOf = (item: CashflowTransaction) => {
    if (item.status === "cancelled") return "cancelled";
    if (item.countsAsIncome || (item.kind === "adjustment" && item.amount > 0)) return "income";
    if (item.countsAsExpense || item.kind === "credit_card_spend" || (item.kind === "adjustment" && item.amount < 0)) return "expense";
    return "neutral";
  };

  return <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
    <div className="flex items-center justify-between gap-4 border-b border-black/[0.05] px-5 py-4 sm:px-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Cá nhân</p>
        <p className="text-base font-semibold text-[#111111]">Lịch sử giao dịch</p>
      </div>
      <span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-semibold text-[#666666]">{sortedItems.length} giao dịch</span>
    </div>
    {sortedItems.length ? <div className="divide-y divide-black/[0.04]">{sortedItems.map((item) => {
      const tone = toneOf(item);
      const isIncome = tone === "income";
      const isExpense = tone === "expense";
      return <div key={item.id} className={cn("flex items-center gap-3 px-4 py-3.5 sm:px-6 sm:py-4", tone === "cancelled" && "bg-[#FAFAFA] opacity-60")}>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", isIncome ? "bg-[#DCFCE7]" : isExpense ? "bg-[#FEF2F2]" : "bg-[#F5F5F5]")}>
          {isIncome ? <ArrowUpRight className="size-4 text-[#166534]" /> : isExpense ? <ArrowDownRight className="size-4 text-[#B22222]" /> : <ArrowRightLeft className="size-4 text-[#666666]" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn("truncate text-sm font-semibold text-[#111111]", tone === "cancelled" && "line-through")}>{item.name}</p>
            {tone === "cancelled" && <span className="shrink-0 rounded-full bg-[#EFEFEF] px-2 py-0.5 text-[9px] font-semibold text-[#737373]">Đã hủy</span>}
          </div>
          <p className="mt-0.5 truncate text-xs text-[#A3A3A3]">{formatDate(item.date)} · {item.source}</p>
          {item.note && <p className="mt-1 truncate text-xs text-[#666666]">{item.note}</p>}
        </div>
        <p className={cn("shrink-0 text-sm font-semibold tabular-nums", isIncome ? "text-[#166534]" : isExpense ? "text-[#B22222]" : "text-[#111111]", tone === "cancelled" && "line-through text-[#737373]")}>{isIncome ? "+" : isExpense && item.amount >= 0 ? "-" : ""}{formatMoney(Math.abs(item.amount))}</p>
        {tone !== "cancelled" && <button title="Xóa giao dịch" aria-label="Xóa giao dịch" onClick={() => onDelete(item)} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[#A3A3A3] transition-colors hover:bg-[#FEF2F2] hover:text-[#B22222]"><Trash2 className="size-4" /></button>}
      </div>;
    })}</div> : <div className="px-6 py-12 text-center"><FileText className="mx-auto size-8 text-[#D4D4D4]" /><p className="mt-3 text-sm font-semibold text-[#111111]">Chưa có giao dịch Cá nhân</p><p className="mt-1 text-xs text-[#A3A3A3]">Các giao dịch thu, chi và chuyển tiền sẽ xuất hiện tại đây.</p></div>}
  </motion.div>;
}






























































