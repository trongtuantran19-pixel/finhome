import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Briefcase, Building, Calendar, Check, ChevronDown, ChevronUp, CreditCard, Plus, User, X } from "lucide-react";
import { cn } from "./ui/utils";
import { WorkspaceTimeFilter } from "./WorkspaceTimeFilter";
import { QuickDateField, todayISO } from "./QuickDateField";
import { creditCards, formatMoney, loans, personalAccounts, type CashflowTransaction, type Loan, type PersonalAccount } from "../finhomeData";
import { appendStoredItem, finhomeStorageKeys, readStoredJson, writeStoredJson } from "../finhomeStorage";

const PERSONAL_CARDS_STORAGE_KEY = finhomeStorageKeys.personalCards;
const PERSONAL_ACCOUNTS_STORAGE_KEY = finhomeStorageKeys.personalAccounts;
const LOANS_STORAGE_KEY = finhomeStorageKeys.loans;

type Filter = "all" | "bank" | "business" | "personal" | "credit";
type LoanModal = { type: "add" } | { type: "pay"; loanId: string } | { type: "disburse"; loanId: string } | { type: "cardPay"; cardId: string } | null;
type LoanKind = Loan["type"];

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "bank", label: "Vay ngân hàng" },
  { id: "business", label: "Vay kinh doanh" },
  { id: "personal", label: "Vay cá nhân" },
  { id: "credit", label: "Thẻ tín dụng" },
];

const icons = {
  "Vay ngân hàng": Building,
  "Vay kinh doanh": Briefcase,
  "Vay cá nhân": User,
  "Thẻ tín dụng": CreditCard,
} as const;

function loadStoredCards() {
  return readStoredJson<typeof creditCards>(PERSONAL_CARDS_STORAGE_KEY, creditCards);
}

function loadStoredAccounts() {
  return readStoredJson<PersonalAccount[]>(PERSONAL_ACCOUNTS_STORAGE_KEY, personalAccounts);
}

function saveStoredAccounts(next: PersonalAccount[]) {
  writeStoredJson(PERSONAL_ACCOUNTS_STORAGE_KEY, next);
}

function saveStoredCards(next: typeof creditCards) {
  writeStoredJson(PERSONAL_CARDS_STORAGE_KEY, next);
}

function loadStoredLoans() {
  return readStoredJson<Loan[]>(LOANS_STORAGE_KEY, loans);
}

function saveStoredLoans(next: Loan[]) {
  writeStoredJson(LOANS_STORAGE_KEY, next);
}

function appendStoredPersonalTransaction(transaction: CashflowTransaction) {
  appendStoredItem(finhomeStorageKeys.personalTransactions, transaction);
}

function parseMoney(value: string) {
  const normalized = value.replace(/[^0-9]/g, "");
  return normalized ? Number(normalized) : 0;
}

function shortDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 backdrop-blur-sm md:items-center" onClick={onClose}>
    <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.2 }} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-2xl md:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#111111]">{title}</h2>
          <p className="mt-1 text-sm text-[#A3A3A3]">{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#737373]"><X className="size-4" /></button>
      </div>
      {children}
    </motion.div>
  </motion.div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2">
    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737373]">{label}</span>
    {children}
  </label>;
}

const inputClass = "h-13 w-full rounded-2xl border border-black/[0.08] bg-white px-4 text-sm font-semibold text-[#111111] outline-none transition focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)]";

type SelectOption = { value: string; label: string; sub?: string; right?: string; icon?: ReactNode };

function CustomSelect({ title, value, options, onChange, placeholder = "Chọn" }: { title: string; value: string; options: SelectOption[]; onChange: (value: string) => void; placeholder?: string }) {
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

  return <div ref={wrapperRef} className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} className={cn("flex min-h-13 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-2.5 text-left transition", open ? "border-[#B22222] shadow-[0_0_0_4px_rgba(178,34,34,0.08)]" : "border-black/[0.08] hover:border-black/[0.16]")}>
      <span className="flex min-w-0 items-center gap-3">
        {selected?.icon && <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#B22222]">{selected.icon}</span>}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[#111111]">{selected?.label ?? placeholder}</span>
          {selected?.sub && <span className="mt-0.5 block truncate text-xs font-medium text-[#A3A3A3]">{selected.sub}</span>}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {selected?.right && <span className="hidden text-xs font-semibold text-[#111111] sm:inline">{selected.right}</span>}
        <ChevronDown className={cn("size-4 text-[#666666] transition", open && "rotate-180 text-[#B22222]")} />
      </span>
    </button>

    <AnimatePresence>
      {open && <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/25 sm:hidden" onClick={() => setOpen(false)} />
        <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: 0.16 }} className="fixed inset-x-0 bottom-0 z-[90] max-h-[72vh] overflow-hidden rounded-t-[28px] border border-[#EFEFEF] bg-white p-5 shadow-2xl sm:absolute sm:bottom-auto sm:left-0 sm:right-auto sm:top-[calc(100%+8px)] sm:z-50 sm:w-full sm:min-w-[320px] sm:rounded-2xl sm:p-2">
          <div className="mb-4 flex items-center justify-between sm:hidden">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">FinHome</p><h3 className="mt-1 text-lg font-semibold text-[#111111]">{title}</h3></div>
            <button type="button" onClick={() => setOpen(false)} className="flex size-10 items-center justify-center rounded-full bg-[#F5F5F5] text-[#666666]"><X className="size-4" /></button>
          </div>
          <div className="max-h-[52vh] space-y-1 overflow-y-auto pr-1">
            {options.map((option) => {
              const active = option.value === value;
              return <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false); }} className={cn("flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#F7F7F7]", active && "bg-[#FDECEC] text-[#B22222]")}>
                <span className="flex min-w-0 items-center gap-3">
                  {option.icon && <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5]", active ? "text-[#B22222]" : "text-[#666666]")}>{option.icon}</span>}
                  <span className="min-w-0"><span className={cn("block truncate text-sm font-semibold", active ? "text-[#B22222]" : "text-[#111111]")}>{option.label}</span>{option.sub && <span className="mt-0.5 block truncate text-xs font-medium text-[#A3A3A3]">{option.sub}</span>}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">{option.right && <span className={cn("text-xs font-semibold", active ? "text-[#B22222]" : "text-[#111111]")}>{option.right}</span>}{active && <Check className="size-4 text-[#B22222]" />}</span>
              </button>;
            })}
          </div>
        </motion.div>
      </>}
    </AnimatePresence>
  </div>;
}

const textareaClass = "min-h-24 w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm font-semibold text-[#111111] outline-none transition focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)]";

function AddLoanModal({ onClose, onAdd }: { onClose: () => void; onAdd: (loan: Loan, accountId: string, disburse: boolean, date: string) => void }) {
  const accounts = useMemo(() => loadStoredAccounts().filter((account) => account.status === "active"), []);
  const [name, setName] = useState("Vay mới");
  const [type, setType] = useState<LoanKind>("Vay ngân hàng");
  const [original, setOriginal] = useState("0");
  const [outstanding, setOutstanding] = useState("0");
  const [rate, setRate] = useState("0");
  const [monthly, setMonthly] = useState("0");
  const [loanDate, setLoanDate] = useState(todayISO());
  const [nextDue, setNextDue] = useState(todayISO());
  const [receiveAccountId, setReceiveAccountId] = useState(accounts[0]?.id ?? "");
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id ?? "");
  const [disburse, setDisburse] = useState(true);
  const [note, setNote] = useState("");
  const principal = parseMoney(original);
  const currentDebt = parseMoney(outstanding) || principal;
  const canSave = name.trim() && principal > 0 && currentDebt >= 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    const receiveAccount = accounts.find((account) => account.id === receiveAccountId);
    const loan: Loan = {
      id: `loan-${Date.now()}`,
      name: name.trim(),
      type,
      original: principal,
      outstanding: currentDebt,
      rate: Number(rate) || 0,
      monthly: parseMoney(monthly),
      nextDue,
      bank: receiveAccount?.name ?? "Chưa chọn",
      status: currentDebt <= 0 ? "settled" : "active",
      paidInterest: 0,
      history: [],
    };
    onAdd(loan, receiveAccountId, disburse, loanDate);
    onClose();
  }

  return <ModalShell title="Thêm khoản vay" subtitle="Ghi nhận nghĩa vụ nợ, không tính là thu nhập" onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <Field label="Tên khoản vay"><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Ví dụ: Vay mua xe" /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Loại khoản vay"><CustomSelect title="Chọn loại khoản vay" value={type} onChange={(next) => setType(next as LoanKind)} options={["Vay ngân hàng", "Vay kinh doanh", "Vay cá nhân"].map((item) => ({ value: item, label: item }))} /></Field>
        <Field label="Lãi suất %/năm"><input value={rate} onChange={(event) => setRate(event.target.value)} inputMode="decimal" className={inputClass} /></Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Số tiền vay ban đầu"><input value={original} onChange={(event) => { setOriginal(event.target.value); if (outstanding === "0") setOutstanding(event.target.value); }} inputMode="numeric" className={inputClass} /></Field>
        <Field label="Dư nợ hiện tại"><input value={outstanding} onChange={(event) => setOutstanding(event.target.value)} inputMode="numeric" className={inputClass} /></Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <QuickDateField label="Ngày vay" value={loanDate} onChange={setLoanDate} />
        <QuickDateField label="Ngày đến hạn" value={nextDue} onChange={setNextDue} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Trả mỗi kỳ"><input value={monthly} onChange={(event) => setMonthly(event.target.value)} inputMode="numeric" className={inputClass} /></Field>
        <Field label="Tài khoản trả nợ"><CustomSelect title="Chọn tài khoản trả nợ" value={payAccountId} onChange={setPayAccountId} options={accounts.map((account) => ({ value: account.id, label: account.name, sub: `Cá nhân · ${formatMoney(account.balance)}` }))} /></Field>
      </div>
      <Field label="Tài khoản nhận giải ngân"><CustomSelect title="Chọn tài khoản nhận giải ngân" value={receiveAccountId} onChange={setReceiveAccountId} options={accounts.map((account) => ({ value: account.id, label: account.name, sub: `Cá nhân · ${formatMoney(account.balance)}` }))} /></Field>
      <button type="button" onClick={() => setDisburse((value) => !value)} className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold", disburse ? "border-[#B22222]/25 bg-[#FDECEC] text-[#B22222]" : "border-black/[0.08] bg-white text-[#737373]")}>
        <span>Ghi nhận giải ngân vào tài khoản cá nhân</span><span>{disburse ? "Có" : "Không"}</span>
      </button>
      <Field label="Ghi chú"><textarea value={note} onChange={(event) => setNote(event.target.value)} className={textareaClass} placeholder="Ghi chú thêm nếu cần" /></Field>
      <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3 text-sm text-[#666666]">Giải ngân vay làm tăng tài khoản nhận và tăng dư nợ cùng lúc, không ghi nhận là thu nhập và không làm tăng tài sản ròng.</div>
      <div className="grid grid-cols-2 gap-3 pt-1"><button type="button" onClick={onClose} className="h-13 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111111]">Hủy</button><button type="submit" disabled={!canSave} className="h-13 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20 disabled:bg-[#D4D4D4] disabled:shadow-none">Lưu khoản vay</button></div>
    </form>
  </ModalShell>;
}

function DisburseLoanModal({ loan, onClose, onDisburse }: { loan: Loan; onClose: () => void; onDisburse: (loanId: string, amount: number, accountId: string, date: string) => void }) {
  const accounts = useMemo(() => loadStoredAccounts().filter((account) => account.status === "active"), []);
  const [amount, setAmount] = useState("0");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const value = parseMoney(amount);
  const account = accounts.find((item) => item.id === accountId);
  const canSave = value > 0 && Boolean(accountId);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    onDisburse(loan.id, value, accountId, date);
    onClose();
  }

  return <ModalShell title="Giải ngân thêm" subtitle={`${loan.name} · không tính là thu nhập`} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3"><p className="text-xs text-[#737373]">Dư nợ hiện tại</p><p className="text-lg font-semibold text-[#B22222]">{formatMoney(loan.outstanding)}</p></div>
        <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3"><p className="text-xs text-[#737373]">Sau giải ngân</p><p className="text-lg font-semibold text-[#111111]">{formatMoney(loan.outstanding + value)}</p></div>
      </div>
      <QuickDateField label="Ngày giải ngân" value={date} onChange={setDate} />
      <Field label="Số tiền giải ngân thêm"><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" className={inputClass} /></Field>
      <Field label="Tài khoản nhận tiền"><CustomSelect title="Chọn tài khoản nhận tiền" value={accountId} onChange={setAccountId} options={accounts.map((item) => ({ value: item.id, label: item.name, sub: `Cá nhân · ${formatMoney(item.balance)}` }))} /></Field>
      <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3 text-sm text-[#666666]">{account?.name ?? "Tài khoản nhận"} tăng {formatMoney(value)} và dư nợ khoản vay tăng cùng số tiền. Đây là giải ngân vay, không phải thu nhập.</div>
      <div className="grid grid-cols-2 gap-3 pt-1"><button type="button" onClick={onClose} className="h-13 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111111]">Hủy</button><button type="submit" disabled={!canSave} className="h-13 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20 disabled:bg-[#D4D4D4] disabled:shadow-none">Xác nhận</button></div>
    </form>
  </ModalShell>;
}
function PayLoanModal({ loan, onClose, onPay }: { loan: Loan; onClose: () => void; onPay: (loanId: string, principal: number, interest: number, accountId: string, date: string) => void }) {
  const accounts = useMemo(() => loadStoredAccounts().filter((account) => account.status === "active"), []);
  const [principal, setPrincipal] = useState("0");
  const [interest, setInterest] = useState("0");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const principalAmount = parseMoney(principal);
  const interestAmount = parseMoney(interest);
  const total = principalAmount + interestAmount;
  const account = accounts.find((item) => item.id === accountId);
  const canSave = total > 0 && principalAmount <= loan.outstanding && total <= (account?.balance ?? 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    onPay(loan.id, principalAmount, interestAmount, accountId, date);
    onClose();
  }

  return <ModalShell title="Thanh toán khoản vay" subtitle={loan.name} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3"><p className="text-xs text-[#737373]">Dư nợ hiện tại</p><p className="text-xl font-semibold text-[#B22222]">{formatMoney(loan.outstanding)}</p></div>
      <QuickDateField label="Ngày thanh toán" value={date} onChange={setDate} />
      <Field label="Tài khoản trả tiền"><CustomSelect title="Chọn tài khoản trả tiền" value={accountId} onChange={setAccountId} options={accounts.map((item) => ({ value: item.id, label: item.name, sub: `Cá nhân · ${formatMoney(item.balance)}` }))} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Gốc vay"><input value={principal} onChange={(event) => setPrincipal(event.target.value)} inputMode="numeric" className={inputClass} /></Field>
        <Field label="Lãi/phí"><input value={interest} onChange={(event) => setInterest(event.target.value)} inputMode="numeric" className={inputClass} /></Field>
      </div>
      <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3 text-sm text-[#666666]">Tổng tiền rời tài khoản: <b>{formatMoney(total)}</b>. Gốc vay chỉ giảm dư nợ. Chỉ phần lãi/phí <b>{formatMoney(interestAmount)}</b> mới là chi phí tài chính.</div>
      {principalAmount > loan.outstanding && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Gốc thanh toán không được lớn hơn dư nợ khoản vay.</p>}
      {total > (account?.balance ?? 0) && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Tài khoản trả tiền không đủ số dư.</p>}
      <div className="grid grid-cols-2 gap-3 pt-1"><button type="button" onClick={onClose} className="h-13 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111111]">Hủy</button><button type="submit" disabled={!canSave} className="h-13 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20 disabled:bg-[#D4D4D4] disabled:shadow-none">Xác nhận</button></div>
    </form>
  </ModalShell>;
}

function CreditCardPaymentModal({ card, onClose, onPay }: { card: typeof creditCards[number]; onClose: () => void; onPay: (cardId: string, accountId: string, principal: number, fee: number, date: string) => void }) {
  const accounts = useMemo(() => loadStoredAccounts().filter((account) => account.status === "active"), []);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [principal, setPrincipal] = useState("0");
  const [fee, setFee] = useState("0");
  const [date, setDate] = useState(todayISO());
  const account = accounts.find((item) => item.id === accountId);
  const principalAmount = parseMoney(principal);
  const feeAmount = parseMoney(fee);
  const total = principalAmount + feeAmount;
  const canSave = total > 0 && principalAmount <= card.used && total <= (account?.balance ?? 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    onPay(card.id, accountId, principalAmount, feeAmount, date);
    onClose();
  }

  return <ModalShell title="Thanh toán thẻ tín dụng" subtitle={card.name} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3"><p className="text-xs text-[#737373]">Dư nợ thẻ</p><p className="text-lg font-semibold text-[#B22222]">{formatMoney(card.used)}</p></div>
        <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3"><p className="text-xs text-[#737373]">Hạn mức còn</p><p className="text-lg font-semibold text-[#166534]">{formatMoney(Math.max(0, card.limit - card.used))}</p></div>
      </div>
      <QuickDateField label="Ngày thanh toán" value={date} onChange={setDate} />
      <Field label="Tài khoản trả tiền"><CustomSelect title="Chọn tài khoản trả tiền" value={accountId} onChange={setAccountId} options={accounts.map((item) => ({ value: item.id, label: item.name, sub: `Cá nhân · ${formatMoney(item.balance)}` }))} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Gốc thẻ"><input value={principal} onChange={(event) => setPrincipal(event.target.value)} inputMode="numeric" className={inputClass} /></Field>
        <Field label="Phí/lãi/phạt"><input value={fee} onChange={(event) => setFee(event.target.value)} inputMode="numeric" className={inputClass} /></Field>
      </div>
      <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3 text-sm text-[#666666]">Gốc thẻ chỉ giảm dư nợ, không ghi chi tiêu lần hai. Chỉ phí/lãi/phạt <b>{formatMoney(feeAmount)}</b> là chi phí tài chính.</div>
      {principalAmount > card.used && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Gốc thanh toán không được lớn hơn dư nợ thẻ.</p>}
      {total > (account?.balance ?? 0) && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Tài khoản trả tiền không đủ số dư.</p>}
      <div className="grid grid-cols-2 gap-3 pt-1"><button type="button" onClick={onClose} className="h-13 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111111]">Hủy</button><button type="submit" disabled={!canSave} className="h-13 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20 disabled:bg-[#D4D4D4] disabled:shadow-none">Xác nhận</button></div>
    </form>
  </ModalShell>;
}

export function LoansPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<LoanModal>(null);
  const [cards, setCards] = useState<typeof creditCards>(() => loadStoredCards());
  const [loanItems, setLoanItems] = useState<Loan[]>(() => loadStoredLoans());

  useEffect(() => {
    saveStoredLoans(loanItems);
  }, [loanItems]);

  const activeLoans = loanItems.filter((loan) => loan.status !== "settled" && loan.status !== "closed");
  const creditCardDebt = cards.reduce((sum, card) => sum + card.used, 0);
  const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0) + creditCardDebt;
  const visibleLoans = activeLoans.filter((loan) => filter === "all" || (filter === "bank" && loan.type === "Vay ngân hàng") || (filter === "business" && loan.type === "Vay kinh doanh") || (filter === "personal" && loan.type === "Vay cá nhân"));
  const monthlyDue = activeLoans.reduce((sum, loan) => sum + loan.monthly, 0);
  const totalInterest = loanItems.reduce((sum, loan) => sum + loan.paidInterest, 0);
  const dueSoon = activeLoans.filter((loan) => ["dueSoon", "overdue"].includes(loan.status)).length;
  const selectedLoan = modal?.type === "pay" || modal?.type === "disburse" ? loanItems.find((loan) => loan.id === modal.loanId) : undefined;
  const selectedCard = modal?.type === "cardPay" ? cards.find((card) => card.id === modal.cardId) : undefined;

  function addLoan(loan: Loan, accountId: string, disburse: boolean, date: string) {
    const nextLoans = [loan, ...loanItems];
    setLoanItems(nextLoans);
    saveStoredLoans(nextLoans);
    setExpanded(loan.id);
    if (!disburse || !accountId || loan.outstanding <= 0) return;
    const accounts = loadStoredAccounts();
    const receiveAccount = accounts.find((account) => account.id === accountId);
    saveStoredAccounts(accounts.map((account) => account.id === accountId ? { ...account, balance: account.balance + loan.outstanding } : account));
    appendStoredPersonalTransaction({
      id: `loan-disbursement-${loan.id}`,
      date,
      name: "Giải ngân khoản vay",
      space: "Khoản vay",
      source: receiveAccount?.name ?? loan.bank,
      amount: loan.outstanding,
      kind: "loan_disbursement",
      status: "active",
      note: `${loan.name}: tăng tài khoản và tăng dư nợ, không phải thu nhập`,
      countsAsIncome: false,
      countsAsExpense: false,
    });
  }

  function disburseExistingLoan(loanId: string, amount: number, accountId: string, date: string) {
    const loan = loanItems.find((item) => item.id === loanId);
    if (!loan || amount <= 0 || !accountId) return;
    const nextLoans = loanItems.map((item) => item.id === loanId ? { ...item, original: item.original + amount, outstanding: item.outstanding + amount, status: "active" as const } : item);
    setLoanItems(nextLoans);
    saveStoredLoans(nextLoans);
    setExpanded(loanId);
    const accounts = loadStoredAccounts();
    const receiveAccount = accounts.find((account) => account.id === accountId);
    saveStoredAccounts(accounts.map((account) => account.id === accountId ? { ...account, balance: account.balance + amount } : account));
    appendStoredPersonalTransaction({
      id: `loan-disbursement-${loanId}-${Date.now()}`,
      date,
      name: "Giải ngân thêm khoản vay",
      space: "Khoản vay",
      source: receiveAccount?.name ?? loan.bank,
      amount,
      kind: "loan_disbursement",
      status: "active",
      note: `${loan.name}: vay thêm vào khoản vay hiện có, không phải thu nhập`,
      countsAsIncome: false,
      countsAsExpense: false,
    });
  }
  function payLoan(loanId: string, principal: number, interest: number, accountId: string, date: string) {
    const loan = loanItems.find((item) => item.id === loanId);
    const accounts = loadStoredAccounts();
    const account = accounts.find((item) => item.id === accountId);
    const total = principal + interest;
    if (!loan || !account || total <= 0 || total > account.balance || principal > loan.outstanding) return;
    setLoanItems((items) => items.map((item) => {
      if (item.id !== loanId) return item;
      const nextOutstanding = Math.max(0, item.outstanding - principal);
      return {
        ...item,
        outstanding: nextOutstanding,
        paidInterest: item.paidInterest + interest,
        status: nextOutstanding === 0 ? "settled" : item.status,
        history: [{ date, total, principal, interest }, ...item.history],
      };
    }));
    saveStoredAccounts(accounts.map((item) => item.id === accountId ? { ...item, balance: item.balance - total } : item));
    if (principal > 0) appendStoredPersonalTransaction({
      id: "loan-principal-" + loanId + "-" + Date.now(),
      date,
      name: "Thanh toán gốc khoản vay",
      space: "Khoản vay",
      source: account.name,
      amount: principal,
      kind: "loan_principal",
      status: "active",
      note: loan.name + ": gốc vay giảm dư nợ, không tính chi tiêu",
      countsAsIncome: false,
      countsAsExpense: false,
    });
    if (interest > 0) appendStoredPersonalTransaction({
      id: "loan-interest-" + loanId + "-" + Date.now(),
      date,
      name: "Trả lãi/phí khoản vay",
      space: "Khoản vay",
      source: account.name,
      amount: interest,
      kind: "loan_interest",
      status: "active",
      note: loan.name + ": lãi/phí là chi phí tài chính",
      countsAsIncome: false,
      countsAsExpense: true,
    });
  }

  function payCreditCard(cardId: string, accountId: string, principal: number, fee: number, date: string) {
    const card = cards.find((item) => item.id === cardId);
    const accounts = loadStoredAccounts();
    const account = accounts.find((item) => item.id === accountId);
    const total = principal + fee;
    if (!card || !account || total <= 0 || total > account.balance || principal > card.used) return;
    const nextCards = cards.map((item) => item.id === cardId ? { ...item, used: Math.max(0, item.used - principal) } : item);
    setCards(nextCards);
    saveStoredCards(nextCards);
    saveStoredAccounts(accounts.map((item) => item.id === accountId ? { ...item, balance: item.balance - total } : item));
    if (principal > 0) appendStoredPersonalTransaction({
      id: "card-payment-" + cardId + "-" + Date.now(),
      date,
      name: "Thanh toán nợ thẻ tín dụng",
      space: "Khoản vay",
      source: account.name + " -> " + card.name,
      amount: principal,
      kind: "credit_card_payment",
      status: "active",
      note: "Thanh toán gốc thẻ, không tính chi tiêu lần hai",
      countsAsIncome: false,
      countsAsExpense: false,
    });
    if (fee > 0) appendStoredPersonalTransaction({
      id: "card-fee-" + cardId + "-" + Date.now(),
      date,
      name: "Phí/lãi thẻ tín dụng",
      space: "Khoản vay",
      source: account.name,
      amount: fee,
      kind: "loan_interest",
      status: "active",
      note: "Phí/lãi/phạt thẻ là chi phí tài chính",
      countsAsIncome: false,
      countsAsExpense: true,
    });
  }

  return <div className="min-h-full bg-[#F9F9F9]"><div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8 lg:px-8">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#A3A3A3]">Nghĩa vụ nợ phải trả</p><h1 className="text-[1.75rem] font-semibold text-[#111111]">Khoản vay</h1></div><div className="flex flex-wrap items-center justify-end gap-2"><WorkspaceTimeFilter /><button onClick={() => setModal({ type: "add" })} className="flex items-center gap-1.5 rounded-xl bg-[#B22222] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20"><Plus className="size-4" /> Thêm khoản vay</button></div></div>
    </motion.div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{[["Tổng dư nợ", formatMoney(totalDebt), "text-[#B22222]"], ["Đang hoạt động", `${activeLoans.length}`, "text-[#111111]"], ["Phải trả tháng này", formatMoney(monthlyDue), "text-[#B45309]"], ["Tổng lãi đã trả", formatMoney(totalInterest), "text-[#B45309]"], ["Sắp đến hạn", `${dueSoon}`, "text-[#DC2626]"], ["Dư nợ thẻ", formatMoney(creditCardDebt), "text-[#DC2626]"]].map(([label, value, color]) => <div key={label} className="rounded-2xl border border-black/[0.07] bg-white p-4"><p className="mb-2 text-[10px] font-semibold uppercase text-[#A3A3A3]">{label}</p><p className={cn("text-lg font-semibold", color)}>{value}</p></div>)}</div>

    <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">Khoản vay giải ngân không phải thu nhập. Trả gốc không phải chi tiêu; chỉ lãi/phí/phạt mới là chi phí tài chính. Thanh toán thẻ tín dụng không ghi nhận chi tiêu lần hai.</div>

    <div className="flex flex-wrap gap-1">{filters.map((item) => <button key={item.id} onClick={() => setFilter(item.id)} className={cn("rounded-xl border px-3.5 py-1.5 text-xs font-semibold", filter === item.id ? "border-[#111111] bg-[#111111] text-white" : "border-black/[0.1] bg-white text-[#666666]")}>{item.label}</button>)}</div>

    {filter !== "credit" && <div className="space-y-3">{visibleLoans.map((loan, index) => {
      const Icon = icons[loan.type];
      const paidPct = loan.original > 0 ? Math.round(((loan.original - loan.outstanding) / loan.original) * 100) : 0;
      const open = expanded === loan.id;
      return <motion.div key={loan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        <button onClick={() => setExpanded(open ? null : loan.id)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[#FAFAFA]"><div className="flex size-10 items-center justify-center rounded-xl bg-[#F5F5F5]"><Icon className="size-4.5 text-[#666666]" /></div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{loan.name}</p>{loan.status === "overdue" && <span className="flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[9px] font-bold text-[#DC2626]"><AlertCircle className="size-2.5" /> Quá hạn</span>}<span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[9px] font-semibold text-[#A3A3A3]">{loan.status === "dueSoon" ? "Sắp đến hạn" : "Đang vay"}</span></div><p className="mt-0.5 text-xs text-[#A3A3A3]">{loan.bank} · {loan.rate}%/năm · đến hạn {shortDate(loan.nextDue)}</p></div><div className="text-right"><p className="text-base font-semibold text-[#B22222]">{formatMoney(loan.outstanding)}</p><p className="text-[10px] text-[#A3A3A3]">dư nợ</p></div>{open ? <ChevronUp className="size-4 text-[#A3A3A3]" /> : <ChevronDown className="size-4 text-[#A3A3A3]" />}</button>
        <AnimatePresence>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-black/[0.05]"><div className="space-y-4 p-5"><div><div className="mb-1 flex justify-between text-xs"><span>Đã trả gốc {formatMoney(loan.original - loan.outstanding)}</span><span className="font-semibold text-[#166534]">{paidPct}%</span></div><div className="h-2 rounded-full bg-[#F5F5F5]"><div className="h-full rounded-full bg-[#166534]" style={{ width: `${Math.min(100, Math.max(0, paidPct))}%` }} /></div></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["Số vay ban đầu", formatMoney(loan.original)], ["Trả mỗi kỳ", formatMoney(loan.monthly)], ["Lãi đã trả", formatMoney(loan.paidInterest)], ["Lãi suất", `${loan.rate}%`]].map(([label, value]) => <div key={label}><p className="mb-1 text-[10px] font-semibold uppercase text-[#A3A3A3]">{label}</p><p className="text-sm font-semibold">{value}</p></div>)}</div><div className="flex flex-wrap gap-2"><button onClick={() => setModal({ type: "disburse", loanId: loan.id })} className="flex items-center gap-1.5 rounded-xl bg-[#B22222] px-3.5 py-2 text-xs font-semibold text-white"><Plus className="size-3.5" /> Giải ngân thêm</button><button onClick={() => setModal({ type: "pay", loanId: loan.id })} className="flex items-center gap-1.5 rounded-xl bg-[#111111] px-3.5 py-2 text-xs font-semibold text-white"><Calendar className="size-3.5" /> Thanh toán khoản vay</button></div></div></motion.div>}</AnimatePresence>
      </motion.div>;
    })}</div>}

    {(filter === "all" || filter === "credit") && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{cards.map((card) => {
      const pct = card.limit > 0 ? Math.round((card.used / card.limit) * 100) : 0;
      return <div key={card.id} className="rounded-2xl border border-black/[0.07] bg-white p-5"><div className="mb-4 rounded-2xl p-5 text-white" style={{ background: card.color }}><p className="text-xs text-white/50">Thẻ tín dụng</p><p className="font-semibold">{card.name}</p><p className="mt-6 text-xl font-semibold">{formatMoney(card.used)}</p><p className="text-xs text-white/45">Hạn mức {formatMoney(card.limit)} · còn {formatMoney(Math.max(0, card.limit - card.used))}</p><p className="text-xs text-white/40">•••• {card.last4}</p></div><div className="mb-1 flex justify-between text-xs"><span>Hạn mức đã dùng</span><span>{pct}%</span></div><div className="mb-4 h-1.5 rounded-full bg-[#F5F5F5]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: card.color }} /></div><p className="text-xs text-[#666666]">Đến hạn {shortDate(card.dueDate)}. Khi thanh toán chỉ giảm dư nợ thẻ, không ghi nhận chi tiêu lần hai.</p><button onClick={() => setModal({ type: "cardPay", cardId: card.id })} className="mt-4 w-full rounded-xl bg-[#111111] px-3.5 py-2.5 text-xs font-semibold text-white">Thanh toán thẻ tín dụng</button></div>;
    })}</div>}
  </div>

  <AnimatePresence>
    {modal?.type === "add" && <AddLoanModal onClose={() => setModal(null)} onAdd={addLoan} />}
    {modal?.type === "pay" && selectedLoan && <PayLoanModal loan={selectedLoan} onClose={() => setModal(null)} onPay={payLoan} />}
    {modal?.type === "disburse" && selectedLoan && <DisburseLoanModal loan={selectedLoan} onClose={() => setModal(null)} onDisburse={disburseExistingLoan} />}
    {modal?.type === "cardPay" && selectedCard && <CreditCardPaymentModal card={selectedCard} onClose={() => setModal(null)} onPay={payCreditCard} />}
  </AnimatePresence>
  </div>;
}





