import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Briefcase, Building, Calendar, Check, ChevronDown, ChevronUp, CreditCard, MoreHorizontal, Plus, User, X } from "lucide-react";
import { cn } from "./ui/utils";
import { WorkspaceTimeFilter, createDefaultWorkspaceTimeRange, isDateInWorkspaceRange, type WorkspaceTimeRange } from "./WorkspaceTimeFilter";
import { QuickDateField, todayISO } from "./QuickDateField";
import { creditCards, formatMoney, loans, personalAccounts, type CashflowTransaction, type CreditCardDebt, type Loan, type PersonalAccount } from "../finhomeData";
import { WorkspaceTransactionHistory } from "./WorkspaceTransactionHistory";
import { appendStoredItem, finhomeStorageKeys, readStoredJson, writeStoredJson } from "../finhomeStorage";

const PERSONAL_CARDS_STORAGE_KEY = finhomeStorageKeys.personalCards;
const PERSONAL_ACCOUNTS_STORAGE_KEY = finhomeStorageKeys.personalAccounts;
const LOANS_STORAGE_KEY = finhomeStorageKeys.loans;

type DebtGroupFilter = "all" | "loan" | "credit";
type LoanTypeFilter = "all" | LoanKind;
type LoanModal = { type: "add" } | { type: "detail"; loanId: string } | { type: "edit"; loanId: string } | { type: "adjust"; loanId: string } | { type: "pay"; loanId: string } | { type: "disburse"; loanId: string } | { type: "cardDetail"; cardId: string } | { type: "cardEdit"; cardId: string } | { type: "cardAdjust"; cardId: string } | { type: "cardPay"; cardId: string } | { type: "txEdit"; transactionId: string } | null;
type LoanKind = Exclude<Loan["type"], "Thẻ tín dụng">;

const debtGroupFilters: { id: DebtGroupFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "loan", label: "Khoản vay" },
  { id: "credit", label: "Thẻ tín dụng" },
];

const loanTypeOptions: { value: LoanTypeFilter; label: string }[] = [
  { value: "all", label: "Tất cả loại vay" },
  { value: "Vay ngân hàng", label: "Vay ngân hàng" },
  { value: "Vay mua nhà", label: "Vay mua nhà" },
  { value: "Vay mua xe", label: "Vay mua xe" },
  { value: "Vay kinh doanh", label: "Vay kinh doanh" },
  { value: "Vay bạn bè/người thân", label: "Vay bạn bè/người thân" },
  { value: "Vay công ty", label: "Vay công ty" },
  { value: "Vay tiêu dùng", label: "Vay tiêu dùng" },
  { value: "Vay cá nhân", label: "Vay cá nhân" },
  { value: "Khoản vay khác", label: "Khác" },
];


const loanStatusOptions: { value: Loan["status"]; label: string; sub: string }[] = [
  { value: "active", label: "Đang vay", sub: "Khoản vay còn hoạt động" },
  { value: "dueSoon", label: "Sắp đến hạn", sub: "Cần chú ý kỳ thanh toán tới" },
  { value: "overdue", label: "Quá hạn", sub: "Khoản vay đã quá hạn" },
  { value: "settled", label: "Đã tất toán", sub: "Chỉ dùng khi dư nợ bằng 0" },
  { value: "closed", label: "Đã đóng", sub: "Ẩn khỏi danh sách đang hoạt động" },
];

const cardStatusOptions: { value: CreditCardDebt["status"]; label: string; sub: string }[] = [
  { value: "active", label: "Đang hoạt động", sub: "Thẻ còn sử dụng" },
  { value: "hidden", label: "Đã ẩn", sub: "Không hiển thị mặc định" },
  { value: "closed", label: "Đã đóng", sub: "Không còn sử dụng" },
];

function loanHasTransactions(loan: Loan, transactions: CashflowTransaction[]) {
  return loan.history.length > 0 || transactions.some((tx) => tx.id.includes(loan.id) || tx.source.includes(loan.name) || tx.note.includes(loan.name));
}

function statusLabel(status: Loan["status"] | CreditCardDebt["status"]) {
  const found = [...loanStatusOptions, ...cardStatusOptions].find((item) => item.value === status);
  return found?.label ?? "Đang hoạt động";
}

const icons: Record<string, typeof Building> = {
  "Vay ngân hàng": Building,
  "Vay mua nhà": Building,
  "Vay mua xe": Building,
  "Vay kinh doanh": Briefcase,
  "Vay bạn bè/người thân": User,
  "Vay công ty": Briefcase,
  "Vay tiêu dùng": User,
  "Vay cá nhân": User,
  "Khoản vay khác": Building,
  "Thẻ tín dụng": CreditCard,
};

function loadStoredCards() {
  return readStoredJson<typeof creditCards>(PERSONAL_CARDS_STORAGE_KEY, creditCards);
}

function loadStoredAccounts() {
  return readStoredJson<PersonalAccount[]>(PERSONAL_ACCOUNTS_STORAGE_KEY, personalAccounts);
}

function saveStoredAccounts(next: PersonalAccount[]) {
  writeStoredJson(PERSONAL_ACCOUNTS_STORAGE_KEY, next);
}

function saveStoredCards(next: CreditCardDebt[]) {
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
        <Field label="Loại khoản vay"><CustomSelect title="Chọn loại khoản vay" value={type} onChange={(next) => setType(next as LoanKind)} options={loanTypeOptions.filter((item) => item.value !== "all").map((item) => ({ value: item.value, label: item.label }))} /></Field>
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



function LoanDetailModal({ loan, onClose, onPay, onDisburse, onEdit, onAdjust, onSettle, onHide }: { loan: Loan; onClose: () => void; onPay: () => void; onDisburse: () => void; onEdit: () => void; onAdjust: () => void; onSettle: () => void; onHide: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const paidPrincipal = Math.max(0, loan.original - loan.outstanding);
  return <ModalShell title="Chi tiết khoản vay" subtitle={loan.name} onClose={onClose}>
    <div className="space-y-4">
      <div className="rounded-[24px] bg-[#111111] p-5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Dư nợ hiện tại</p>
        <p className="mt-2 text-3xl font-semibold">{formatMoney(loan.outstanding)}</p>
        <p className="mt-2 text-sm text-white/45">{loan.bank} · {loan.rate}%/năm · {statusLabel(loan.status)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[["Số vay ban đầu", formatMoney(loan.original)], ["Đã trả gốc", formatMoney(paidPrincipal)], ["Đã trả lãi/phí", formatMoney(loan.paidInterest)], ["Trả mỗi kỳ", formatMoney(loan.monthly)], ["Ngày vay", loan.startDate ? shortDate(loan.startDate) : "Chưa lưu"], ["Đến hạn", shortDate(loan.nextDue)]].map(([label, value]) => <div key={label} className="rounded-2xl bg-[#F8F5F0] px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">{label}</p><p className="mt-1 text-sm font-semibold text-[#111111]">{value}</p></div>)}
      </div>
      {loan.note && <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-sm text-[#666666]">{loan.note}</div>}
      <div className="sticky bottom-0 grid grid-cols-4 gap-2 border-t border-black/[0.06] bg-white pt-4">
        <button type="button" onClick={onPay} className="h-12 rounded-2xl bg-[#111111] text-xs font-semibold text-white">Thanh toán</button>
        <button type="button" onClick={onDisburse} className="h-12 rounded-2xl border border-black/[0.08] bg-white text-xs font-semibold text-[#111111]">Giải ngân</button>
        <button type="button" onClick={onEdit} className="h-12 rounded-2xl bg-[#B22222] text-xs font-semibold text-white">Sửa</button>
        <div className="relative">
          <button type="button" onClick={() => setMoreOpen((value) => !value)} className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white text-xs font-semibold text-[#111111]"><MoreHorizontal className="mx-auto size-4" /></button>
          {moreOpen && <div className="absolute bottom-14 right-0 z-10 w-48 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-1 shadow-xl">
            <button type="button" onClick={onAdjust} className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-[#F7F7F7]">Điều chỉnh dư nợ</button>
            <button type="button" onClick={onSettle} className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-[#F7F7F7]">Tất toán</button>
            <button type="button" onClick={onHide} className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#B22222] hover:bg-[#FDECEC]">Ẩn khoản vay</button>
          </div>}
        </div>
      </div>
    </div>
  </ModalShell>;
}

function EditLoanModal({ loan, hasTransactions, onClose, onSave }: { loan: Loan; hasTransactions: boolean; onClose: () => void; onSave: (loan: Loan) => void }) {
  const [draft, setDraft] = useState<Loan>({ ...loan, startDate: loan.startDate ?? todayISO(), termMonths: loan.termMonths ?? 0, note: loan.note ?? "" });
  const [originalText, setOriginalText] = useState(String(loan.original));
  const changed = JSON.stringify({ ...draft, original: hasTransactions ? loan.original : parseMoney(originalText) }) !== JSON.stringify(loan);
  const invalidDueDate = Boolean(draft.startDate && draft.nextDue < draft.startDate);
  const canSave = draft.name.trim().length > 0 && draft.rate >= 0 && draft.monthly >= 0 && !invalidDueDate && !(draft.status === "settled" && loan.outstanding > 0) && changed;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    const nextOriginal = hasTransactions ? loan.original : parseMoney(originalText);
    onSave({ ...draft, name: draft.name.trim(), original: nextOriginal, outstanding: hasTransactions ? loan.outstanding : nextOriginal });
  }

  return <ModalShell title="Sửa khoản vay" subtitle="Chỉ sửa thông tin mô tả, không sửa trực tiếp dư nợ" onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <Field label="Tên khoản vay"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Loại khoản vay"><CustomSelect title="Chọn loại khoản vay" value={draft.type} onChange={(next) => setDraft({ ...draft, type: next as LoanKind })} options={loanTypeOptions.filter((item) => item.value !== "all").map((item) => ({ value: item.value, label: item.label }))} /></Field>
        <Field label="Trạng thái"><CustomSelect title="Chọn trạng thái" value={draft.status} onChange={(next) => setDraft({ ...draft, status: next as Loan["status"] })} options={loanStatusOptions.map((item) => ({ value: item.value, label: item.label, sub: item.sub }))} /></Field>
      </div>
      <Field label="Chủ nợ / Ngân hàng / Người cho vay"><input value={draft.bank} onChange={(event) => setDraft({ ...draft, bank: event.target.value })} className={inputClass} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Số tiền vay ban đầu"><input value={originalText} disabled={hasTransactions} onChange={(event) => setOriginalText(event.target.value)} inputMode="numeric" className={cn(inputClass, hasTransactions && "bg-[#F5F5F5] text-[#A3A3A3]")} /></Field>
        <Field label="Dư nợ hiện tại"><input value={formatMoney(loan.outstanding)} disabled className={cn(inputClass, "bg-[#F5F5F5] text-[#A3A3A3]")} /></Field>
      </div>
      {hasTransactions && <p className="rounded-2xl bg-[#F8F5F0] px-4 py-3 text-xs font-semibold text-[#666666]">Khoản vay đã có giao dịch nên số vay ban đầu và dư nợ được khóa. Nếu số dư sai, dùng Điều chỉnh dư nợ.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Lãi suất %/năm"><input value={String(draft.rate)} onChange={(event) => setDraft({ ...draft, rate: Number(event.target.value) || 0 })} inputMode="decimal" className={inputClass} /></Field>
        <Field label="Số tiền trả mỗi kỳ"><input value={String(draft.monthly)} onChange={(event) => setDraft({ ...draft, monthly: parseMoney(event.target.value) })} inputMode="numeric" className={inputClass} /></Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <QuickDateField label="Ngày vay" value={draft.startDate ?? todayISO()} onChange={(next) => setDraft({ ...draft, startDate: next })} />
        <QuickDateField label="Ngày đến hạn" value={draft.nextDue} onChange={(next) => setDraft({ ...draft, nextDue: next })} />
      </div>
      <Field label="Kỳ hạn tháng"><input value={String(draft.termMonths ?? 0)} onChange={(event) => setDraft({ ...draft, termMonths: Number(event.target.value) || 0 })} inputMode="numeric" className={inputClass} /></Field>
      <Field label="Ghi chú"><textarea value={draft.note ?? ""} onChange={(event) => setDraft({ ...draft, note: event.target.value })} className={textareaClass} placeholder="Ghi chú" /></Field>
      {invalidDueDate && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Ngày đến hạn không được trước ngày vay.</p>}
      {draft.status === "settled" && loan.outstanding > 0 && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Chỉ được đặt Đã tất toán khi dư nợ bằng 0.</p>}
      <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-black/[0.06] bg-white pt-4"><button type="button" onClick={onClose} className="h-13 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111111]">Hủy</button><button type="submit" disabled={!canSave} className="h-13 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20 disabled:bg-[#D4D4D4] disabled:shadow-none">Lưu thay đổi</button></div>
    </form>
  </ModalShell>;
}

function AdjustLoanDebtModal({ loan, onClose, onSave }: { loan: Loan; onClose: () => void; onSave: (loanId: string, newOutstanding: number, date: string, note: string) => void }) {
  const [value, setValue] = useState(String(loan.outstanding));
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const nextDebt = parseMoney(value);
  const diff = nextDebt - loan.outstanding;
  const canSave = nextDebt >= 0 && diff !== 0;
  return <ModalShell title="Điều chỉnh dư nợ" subtitle={loan.name} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); if (canSave) onSave(loan.id, nextDebt, date, note); }} className="space-y-4">
      <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3"><p className="text-xs text-[#737373]">Dư nợ hiện tại</p><p className="text-xl font-semibold text-[#111111]">{formatMoney(loan.outstanding)}</p></div>
      <Field label="Dư nợ thực tế mới"><input value={value} onChange={(event) => setValue(event.target.value)} inputMode="numeric" className={inputClass} /></Field>
      <div className="rounded-2xl border border-black/[0.06] px-4 py-3 text-sm text-[#666666]">Chênh lệch: <b className={diff > 0 ? "text-[#B22222]" : "text-[#166534]"}>{diff === 0 ? "0 đ" : formatMoney(Math.abs(diff))}</b>. Điều chỉnh này không tính thu nhập, chi tiêu hay chi phí tài chính.</div>
      <QuickDateField label="Ngày giao dịch" value={date} onChange={setDate} />
      <Field label="Lý do / Ghi chú"><textarea value={note} onChange={(event) => setNote(event.target.value)} className={textareaClass} placeholder="Ghi chú" /></Field>
      <div className="grid grid-cols-2 gap-3 pt-1"><button type="button" onClick={onClose} className="h-13 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111111]">Hủy</button><button type="submit" disabled={!canSave} className="h-13 rounded-2xl bg-[#B22222] text-sm font-semibold text-white disabled:bg-[#D4D4D4]">Xác nhận</button></div>
    </form>
  </ModalShell>;
}

function CardDetailModal({ card, onClose, onPay, onEdit, onAdjust, onHide }: { card: CreditCardDebt; onClose: () => void; onPay: () => void; onEdit: () => void; onAdjust: () => void; onHide: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  return <ModalShell title="Chi tiết thẻ tín dụng" subtitle={card.name} onClose={onClose}>
    <div className="space-y-4">
      <div className="rounded-[24px] p-5 text-white" style={{ background: card.color }}>
        <p className="text-xs text-white/55">{card.bank} · •••• {card.last4}</p>
        <p className="mt-5 text-3xl font-semibold">{formatMoney(card.used)}</p>
        <p className="text-xs text-white/55">Dư nợ hiện tại</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[["Hạn mức", formatMoney(card.limit)], ["Còn lại", formatMoney(Math.max(0, card.limit - card.used))], ["Ngày sao kê", shortDate(card.statementDate)], ["Ngày đến hạn", shortDate(card.dueDate)], ["Trạng thái", statusLabel(card.status)]].map(([label, value]) => <div key={label} className="rounded-2xl bg-[#F8F5F0] px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">{label}</p><p className="mt-1 text-sm font-semibold text-[#111111]">{value}</p></div>)}
      </div>
      {card.note && <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-sm text-[#666666]">{card.note}</div>}
      <div className="sticky bottom-0 grid grid-cols-3 gap-2 border-t border-black/[0.06] bg-white pt-4">
        <button type="button" onClick={onPay} className="h-12 rounded-2xl bg-[#111111] text-xs font-semibold text-white">Thanh toán</button>
        <button type="button" onClick={onEdit} className="h-12 rounded-2xl bg-[#B22222] text-xs font-semibold text-white">Sửa thẻ</button>
        <div className="relative">
          <button type="button" onClick={() => setMoreOpen((value) => !value)} className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white text-xs font-semibold text-[#111111]"><MoreHorizontal className="mx-auto size-4" /></button>
          {moreOpen && <div className="absolute bottom-14 right-0 z-10 w-52 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-1 shadow-xl">
            <button type="button" onClick={onAdjust} className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-[#F7F7F7]">Điều chỉnh dư nợ thẻ</button>
            <button type="button" onClick={onHide} className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#B22222] hover:bg-[#FDECEC]">Ẩn thẻ</button>
          </div>}
        </div>
      </div>
    </div>
  </ModalShell>;
}

function EditCardModal({ card, onClose, onSave }: { card: CreditCardDebt; onClose: () => void; onSave: (card: CreditCardDebt) => void }) {
  const [draft, setDraft] = useState<CreditCardDebt>({ ...card, note: card.note ?? "" });
  const changed = JSON.stringify(draft) !== JSON.stringify(card);
  const canSave = draft.name.trim().length > 0 && draft.bank.trim().length > 0 && draft.limit >= draft.used && changed;
  return <ModalShell title="Sửa thẻ tín dụng" subtitle="Không sửa trực tiếp dư nợ thẻ" onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); if (canSave) onSave({ ...draft, name: draft.name.trim(), bank: draft.bank.trim() }); }} className="space-y-4">
      <Field label="Tên thẻ"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></Field>
      <Field label="Ngân hàng"><input value={draft.bank} onChange={(event) => setDraft({ ...draft, bank: event.target.value })} className={inputClass} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Hạn mức"><input value={String(draft.limit)} onChange={(event) => setDraft({ ...draft, limit: parseMoney(event.target.value) })} inputMode="numeric" className={inputClass} /></Field>
        <Field label="Dư nợ hiện tại"><input value={formatMoney(card.used)} disabled className={cn(inputClass, "bg-[#F5F5F5] text-[#A3A3A3]")} /></Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <QuickDateField label="Ngày sao kê" value={draft.statementDate} onChange={(next) => setDraft({ ...draft, statementDate: next })} />
        <QuickDateField label="Ngày đến hạn thanh toán" value={draft.dueDate} onChange={(next) => setDraft({ ...draft, dueDate: next })} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="4 số cuối thẻ"><input value={draft.last4} onChange={(event) => setDraft({ ...draft, last4: event.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} className={inputClass} /></Field>
        <Field label="Trạng thái"><CustomSelect title="Chọn trạng thái thẻ" value={draft.status} onChange={(next) => setDraft({ ...draft, status: next as CreditCardDebt["status"] })} options={cardStatusOptions.map((item) => ({ value: item.value, label: item.label, sub: item.sub }))} /></Field>
      </div>
      <Field label="Ghi chú"><textarea value={draft.note ?? ""} onChange={(event) => setDraft({ ...draft, note: event.target.value })} className={textareaClass} placeholder="Ghi chú" /></Field>
      {draft.limit < card.used && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Hạn mức không được nhỏ hơn dư nợ hiện tại.</p>}
      <div className="grid grid-cols-2 gap-3 pt-1"><button type="button" onClick={onClose} className="h-13 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111111]">Hủy</button><button type="submit" disabled={!canSave} className="h-13 rounded-2xl bg-[#B22222] text-sm font-semibold text-white disabled:bg-[#D4D4D4]">Lưu thay đổi</button></div>
    </form>
  </ModalShell>;
}

function AdjustCardDebtModal({ card, onClose, onSave }: { card: CreditCardDebt; onClose: () => void; onSave: (cardId: string, newUsed: number, date: string, note: string) => void }) {
  const [value, setValue] = useState(String(card.used));
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const nextUsed = parseMoney(value);
  const diff = nextUsed - card.used;
  const canSave = nextUsed >= 0 && nextUsed <= card.limit && diff !== 0;
  return <ModalShell title="Điều chỉnh dư nợ thẻ" subtitle={card.name} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); if (canSave) onSave(card.id, nextUsed, date, note); }} className="space-y-4">
      <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3"><p className="text-xs text-[#737373]">Dư nợ hiện tại</p><p className="text-xl font-semibold text-[#B22222]">{formatMoney(card.used)}</p></div>
      <Field label="Dư nợ thực tế mới"><input value={value} onChange={(event) => setValue(event.target.value)} inputMode="numeric" className={inputClass} /></Field>
      <div className="rounded-2xl border border-black/[0.06] px-4 py-3 text-sm text-[#666666]">Chênh lệch: <b className={diff > 0 ? "text-[#B22222]" : "text-[#166534]"}>{diff === 0 ? "0 đ" : formatMoney(Math.abs(diff))}</b>. Điều chỉnh không tính chi tiêu hoặc chi phí tài chính.</div>
      <QuickDateField label="Ngày giao dịch" value={date} onChange={setDate} />
      <Field label="Lý do / Ghi chú"><textarea value={note} onChange={(event) => setNote(event.target.value)} className={textareaClass} placeholder="Ghi chú" /></Field>
      {nextUsed > card.limit && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Dư nợ không được lớn hơn hạn mức thẻ.</p>}
      <div className="grid grid-cols-2 gap-3 pt-1"><button type="button" onClick={onClose} className="h-13 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111111]">Hủy</button><button type="submit" disabled={!canSave} className="h-13 rounded-2xl bg-[#B22222] text-sm font-semibold text-white disabled:bg-[#D4D4D4]">Xác nhận</button></div>
    </form>
  </ModalShell>;
}


function EditLoanTransactionModal({ transaction, onClose, onSave }: { transaction: CashflowTransaction; onClose: () => void; onSave: (updated: CashflowTransaction) => void }) {
  const [name, setName] = useState(transaction.name);
  const [date, setDate] = useState(transaction.date);
  const [amount, setAmount] = useState(String(Math.abs(transaction.amount)));
  const [note, setNote] = useState(transaction.note || "");
  const amountValue = parseMoney(amount);
  const canEditAmount = transaction.kind !== "adjustment";
  const canSave = name.trim().length > 0 && (!canEditAmount || amountValue > 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    onSave({ ...transaction, name: name.trim(), date, amount: canEditAmount ? amountValue : transaction.amount, note: note.trim() });
  }

  return <ModalShell title="Điều chỉnh giao dịch" subtitle="Khoản vay · cập nhật giao dịch đã thao tác sai" onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <QuickDateField label="Ngày giao dịch" value={date} onChange={setDate} />
      <Field label="Tên giao dịch"><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></Field>
      <Field label="Số tiền"><input value={amount} disabled={!canEditAmount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" className={cn(inputClass, !canEditAmount && "bg-[#F5F5F5] text-[#A3A3A3]")} /></Field>
      {!canEditAmount && <p className="rounded-2xl bg-[#F8F5F0] px-4 py-3 text-xs font-semibold text-[#666666]">Giao dịch điều chỉnh dư nợ không sửa số tiền trực tiếp. Nếu sai dư nợ, dùng chức năng Điều chỉnh dư nợ của khoản vay/thẻ.</p>}
      <div className="rounded-2xl bg-[#F8F5F0] px-4 py-3 text-xs leading-relaxed text-[#666666]">Khi lưu, FinHome sẽ đảo tác động của giao dịch cũ rồi áp dụng lại giao dịch mới để tránh lệch dư nợ, thẻ hoặc tài khoản cá nhân.</div>
      <Field label="Ghi chú"><textarea value={note} onChange={(event) => setNote(event.target.value)} className={textareaClass} placeholder="Ghi chú" /></Field>
      <div className="grid grid-cols-2 gap-3 pt-1"><button type="button" onClick={onClose} className="h-13 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111111]">Hủy</button><button type="submit" disabled={!canSave} className="h-13 rounded-2xl bg-[#B22222] text-sm font-semibold text-white disabled:bg-[#D4D4D4]">Lưu thay đổi</button></div>
    </form>
  </ModalShell>;
}

export function LoansPage() {
  const [timeRange, setTimeRange] = useState<WorkspaceTimeRange>(createDefaultWorkspaceTimeRange);
  const [historyVersion, setHistoryVersion] = useState(0);
  const loanTransactions = readStoredJson<CashflowTransaction[]>(finhomeStorageKeys.personalTransactions, []).filter((tx) => tx.space === "Khoản vay" || tx.id.startsWith("loan-") || tx.id.startsWith("card-") || tx.kind.startsWith("loan_") || tx.kind.startsWith("credit_card_"));
  const periodLoanTransactions = loanTransactions.filter((tx) => isDateInWorkspaceRange(tx.date, timeRange));
  const [groupFilter, setGroupFilter] = useState<DebtGroupFilter>("all");
  const [loanTypeFilter, setLoanTypeFilter] = useState<LoanTypeFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<LoanModal>(null);
  const [cards, setCards] = useState<CreditCardDebt[]>(() => loadStoredCards());
  const [loanItems, setLoanItems] = useState<Loan[]>(() => loadStoredLoans());

  useEffect(() => {
    saveStoredLoans(loanItems);
  }, [loanItems]);

  const activeLoans = loanItems.filter((loan) => loan.status !== "settled" && loan.status !== "closed");
  const creditCardDebt = cards.reduce((sum, card) => sum + card.used, 0);
  const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0) + creditCardDebt;
  const visibleLoans = activeLoans.filter((loan) => loanTypeFilter === "all" || loan.type === loanTypeFilter);
  const showLoanSection = groupFilter === "all" || groupFilter === "loan";
  const showCreditSection = groupFilter === "all" || groupFilter === "credit";
  const monthlyDue = activeLoans.reduce((sum, loan) => sum + loan.monthly, 0);
  const totalInterest = periodLoanTransactions.filter((tx) => tx.kind === "loan_interest").reduce((sum, tx) => sum + tx.amount, 0);
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





  function findLoanForTransaction(transaction: CashflowTransaction) {
    return loanItems.find((loan) => transaction.id.includes(loan.id) || transaction.note.includes(loan.name) || transaction.source.includes(loan.name));
  }

  function findCardForTransaction(transaction: CashflowTransaction) {
    return cards.find((card) => transaction.id.includes(card.id) || transaction.source.includes(card.name) || transaction.note.includes(card.name));
  }

  function applyLoanHistoryTransaction(transaction: CashflowTransaction, direction: 1 | -1) {
    const amount = Math.abs(transaction.amount);
    if (amount <= 0) return;
    const [from] = transaction.source.split(" -> ");
    const accounts = loadStoredAccounts();

    if (transaction.kind === "loan_disbursement") {
      const loan = findLoanForTransaction(transaction);
      if (loan) {
        const nextLoans = loanItems.map((item) => item.id === loan.id ? { ...item, original: Math.max(0, item.original + amount * direction), outstanding: Math.max(0, item.outstanding + amount * direction), status: "active" as const } : item);
        setLoanItems(nextLoans);
        saveStoredLoans(nextLoans);
      }
      saveStoredAccounts(accounts.map((account) => account.name === transaction.source ? { ...account, balance: account.balance + amount * direction } : account));
      return;
    }

    if (transaction.kind === "loan_principal") {
      const loan = findLoanForTransaction(transaction);
      if (loan) {
        const nextLoans = loanItems.map((item) => item.id === loan.id ? { ...item, outstanding: Math.max(0, item.outstanding - amount * direction), status: item.outstanding - amount * direction <= 0 ? "settled" as const : "active" as const } : item);
        setLoanItems(nextLoans);
        saveStoredLoans(nextLoans);
      }
      saveStoredAccounts(accounts.map((account) => account.name === transaction.source ? { ...account, balance: account.balance - amount * direction } : account));
      return;
    }

    if (transaction.kind === "loan_interest") {
      const loan = findLoanForTransaction(transaction);
      if (loan) {
        const nextLoans = loanItems.map((item) => item.id === loan.id ? { ...item, paidInterest: Math.max(0, item.paidInterest + amount * direction) } : item);
        setLoanItems(nextLoans);
        saveStoredLoans(nextLoans);
      }
      saveStoredAccounts(accounts.map((account) => account.name === transaction.source ? { ...account, balance: account.balance - amount * direction } : account));
      return;
    }

    if (transaction.kind === "credit_card_payment") {
      const card = findCardForTransaction(transaction);
      if (card) {
        const nextCards = cards.map((item) => item.id === card.id ? { ...item, used: Math.max(0, item.used - amount * direction) } : item);
        setCards(nextCards);
        saveStoredCards(nextCards);
      }
      saveStoredAccounts(accounts.map((account) => account.name === from ? { ...account, balance: account.balance - amount * direction } : account));
      return;
    }

    if (transaction.kind === "credit_card_spend") {
      const card = findCardForTransaction(transaction);
      if (!card) return;
      const nextCards = cards.map((item) => item.id === card.id ? { ...item, used: Math.max(0, item.used + amount * direction) } : item);
      setCards(nextCards);
      saveStoredCards(nextCards);
    }
  }

  function updateLoanHistoryTransaction(updated: CashflowTransaction) {
    const original = loanTransactions.find((tx) => tx.id === updated.id);
    if (!original) return;
    applyLoanHistoryTransaction(original, -1);
    const allTransactions = readStoredJson<CashflowTransaction[]>(finhomeStorageKeys.personalTransactions, []);
    writeStoredJson(finhomeStorageKeys.personalTransactions, allTransactions.map((tx) => tx.id === updated.id ? updated : tx));
    applyLoanHistoryTransaction(updated, 1);
    setHistoryVersion((value) => value + 1);
    setModal(null);
    showToast("Đã điều chỉnh giao dịch");
  }

  function saveLoanEdit(nextLoan: Loan) {
    const nextLoans = loanItems.map((item) => item.id === nextLoan.id ? nextLoan : item);
    setLoanItems(nextLoans);
    saveStoredLoans(nextLoans);
    setModal({ type: "detail", loanId: nextLoan.id });
    showToast("Đã cập nhật khoản vay");
  }

  function adjustLoanDebt(loanId: string, newOutstanding: number, date: string, note: string) {
    const loan = loanItems.find((item) => item.id === loanId);
    if (!loan || newOutstanding < 0) return;
    const diff = newOutstanding - loan.outstanding;
    const nextLoans = loanItems.map((item) => item.id === loanId ? { ...item, outstanding: newOutstanding, status: newOutstanding === 0 ? "settled" as const : item.status === "settled" ? "active" as const : item.status } : item);
    setLoanItems(nextLoans);
    saveStoredLoans(nextLoans);
    appendStoredPersonalTransaction({
      id: "loan-adjustment-" + loanId + "-" + Date.now(),
      date,
      name: "Điều chỉnh dư nợ",
      space: "Khoản vay",
      source: loan.name,
      amount: Math.abs(diff),
      kind: "adjustment",
      status: "active",
      note: note || "Điều chỉnh dư nợ thực tế, không tính thu nhập/chi tiêu",
      countsAsIncome: false,
      countsAsExpense: false,
      details: { loanId, before: loan.outstanding, after: newOutstanding, difference: diff },
    });
    setModal({ type: "detail", loanId });
    showToast("Đã điều chỉnh dư nợ");
  }

  function settleLoan(loanId: string) {
    const loan = loanItems.find((item) => item.id === loanId);
    if (!loan) return;
    if (loan.outstanding > 0) {
      setModal({ type: "pay", loanId });
      return;
    }
    saveLoanEdit({ ...loan, status: "settled" });
  }

  function hideLoan(loanId: string) {
    const loan = loanItems.find((item) => item.id === loanId);
    if (!loan) return;
    saveLoanEdit({ ...loan, status: "closed" });
  }

  function saveCardEdit(nextCard: CreditCardDebt) {
    const nextCards = cards.map((item) => item.id === nextCard.id ? nextCard : item);
    setCards(nextCards);
    saveStoredCards(nextCards);
    setModal({ type: "cardDetail", cardId: nextCard.id });
    showToast("Đã cập nhật thẻ tín dụng");
  }

  function adjustCardDebt(cardId: string, newUsed: number, date: string, note: string) {
    const card = cards.find((item) => item.id === cardId);
    if (!card || newUsed < 0 || newUsed > card.limit) return;
    const diff = newUsed - card.used;
    const nextCards = cards.map((item) => item.id === cardId ? { ...item, used: newUsed } : item);
    setCards(nextCards);
    saveStoredCards(nextCards);
    appendStoredPersonalTransaction({
      id: "card-adjustment-" + cardId + "-" + Date.now(),
      date,
      name: "Điều chỉnh dư nợ thẻ",
      space: "Khoản vay",
      source: card.name,
      amount: Math.abs(diff),
      kind: "adjustment",
      status: "active",
      note: note || "Điều chỉnh dư nợ thẻ thực tế, không tính chi tiêu",
      countsAsIncome: false,
      countsAsExpense: false,
      details: { cardId, before: card.used, after: newUsed, difference: diff },
    });
    setModal({ type: "cardDetail", cardId });
    showToast("Đã điều chỉnh dư nợ thẻ");
  }

  function hideCard(cardId: string) {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;
    saveCardEdit({ ...card, status: "hidden" });
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#A3A3A3]">Nghĩa vụ nợ phải trả</p><h1 className="text-[1.75rem] font-semibold text-[#111111]">Khoản vay</h1></div><div className="flex flex-wrap items-center justify-end gap-2"><WorkspaceTimeFilter onChange={setTimeRange} /><button onClick={() => setModal({ type: "add" })} className="flex items-center gap-1.5 rounded-xl bg-[#B22222] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20"><Plus className="size-4" /> <span className="hidden sm:inline">Thêm khoản vay</span><span className="sm:hidden">Khoản vay</span></button></div></div>
    </motion.div>

    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm md:col-span-1">
          <div className="mb-4 flex items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3]">Tổng dư nợ</p><CreditCard className="size-4 text-[#D4D4D4]" /></div>
          <p className="text-3xl font-semibold leading-tight text-[#B22222]">{formatMoney(totalDebt)}</p>
          <p className="mt-3 text-xs text-[#737373]">Vay + thẻ tín dụng</p>
        </div>
        {[
          { label: "Phải trả tháng này", value: formatMoney(monthlyDue), caption: "Kỳ thanh toán dự kiến", color: "text-[#111111]", icon: Calendar },
          { label: "Đang hoạt động", value: `${activeLoans.length} khoản`, caption: "Khoản vay chưa tất toán", color: "text-[#111111]", icon: Briefcase },
        ].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3]">{item.label}</p><Icon className="size-4 text-[#D4D4D4]" /></div><p className={cn("text-2xl font-semibold leading-tight", item.color)}>{item.value}</p><p className="mt-3 text-xs text-[#737373]">{item.caption}</p></div>; })}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          { label: "Sắp đến hạn", value: `${dueSoon} khoản`, color: dueSoon > 0 ? "text-[#B22222]" : "text-[#111111]", icon: AlertCircle },
          { label: "Dư nợ thẻ", value: formatMoney(creditCardDebt), color: "text-[#111111]", icon: CreditCard },
          { label: "Lãi đã trả", value: formatMoney(totalInterest), color: "text-[#111111]", icon: Building },
        ].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-[20px] border border-black/[0.07] bg-[#F8F6F3] p-4"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#A3A3A3]">{item.label}</p><Icon className="size-3.5 text-[#D4D4D4]" /></div><p className={cn("text-lg font-semibold leading-tight", item.color)}>{item.value}</p></div>; })}
      </div>
    </div>

    <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">Khoản vay giải ngân không phải thu nhập. Trả gốc không phải chi tiêu; chỉ lãi/phí/phạt mới là chi phí tài chính. Thanh toán thẻ tín dụng không ghi nhận chi tiêu lần hai.</div>

    <div className="flex flex-col gap-3 rounded-[24px] border border-black/[0.06] bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 gap-1 overflow-x-auto rounded-2xl bg-[#F5F5F5] p-1">
        {debtGroupFilters.map((item) => <button key={item.id} onClick={() => setGroupFilter(item.id)} className={cn("shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition", groupFilter === item.id ? "bg-white text-[#111111] shadow-sm" : "text-[#737373] hover:text-[#111111]")}>{item.label}</button>)}
      </div>
      {groupFilter !== "credit" && <div className="w-full md:w-[260px]"><CustomSelect title="Lọc loại khoản vay" value={loanTypeFilter} onChange={(next) => setLoanTypeFilter(next as LoanTypeFilter)} options={loanTypeOptions.map((item) => ({ value: item.value, label: item.label }))} /></div>}
    </div>

    {showLoanSection && <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Khoản vay</p><h2 className="mt-1 text-xl font-semibold text-[#111111]">Nợ vay thông thường</h2></div>
        <span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-semibold text-[#737373]">{visibleLoans.length} khoản</span>
      </div>
      <div className="space-y-3">{visibleLoans.map((loan, index) => {
      const Icon = icons[loan.type];
      const paidPct = loan.original > 0 ? Math.round(((loan.original - loan.outstanding) / loan.original) * 100) : 0;
      const open = expanded === loan.id;
      return <motion.div key={loan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        <button onClick={() => setModal({ type: "detail", loanId: loan.id })} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[#FAFAFA]"><div className="flex size-10 items-center justify-center rounded-xl bg-[#F5F5F5]"><Icon className="size-4.5 text-[#666666]" /></div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{loan.name}</p>{loan.status === "overdue" && <span className="flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[9px] font-bold text-[#DC2626]"><AlertCircle className="size-2.5" /> Quá hạn</span>}<span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[9px] font-semibold text-[#A3A3A3]">{loan.status === "dueSoon" ? "Sắp đến hạn" : "Đang vay"}</span></div><p className="mt-0.5 text-xs text-[#A3A3A3]">{loan.bank} · {loan.rate}%/năm · đến hạn {shortDate(loan.nextDue)}</p></div><div className="text-right"><p className="text-base font-semibold text-[#B22222]">{formatMoney(loan.outstanding)}</p><p className="text-[10px] text-[#A3A3A3]">dư nợ</p></div><span className="text-xs font-semibold text-[#B22222]">Chi tiết</span></button>
        <AnimatePresence>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-black/[0.05]"><div className="space-y-4 p-5"><div><div className="mb-1 flex justify-between text-xs"><span>Đã trả gốc {formatMoney(loan.original - loan.outstanding)}</span><span className="font-semibold text-[#166534]">{paidPct}%</span></div><div className="h-2 rounded-full bg-[#F5F5F5]"><div className="h-full rounded-full bg-[#166534]" style={{ width: `${Math.min(100, Math.max(0, paidPct))}%` }} /></div></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["Số vay ban đầu", formatMoney(loan.original)], ["Trả mỗi kỳ", formatMoney(loan.monthly)], ["Lãi đã trả", formatMoney(loan.paidInterest)], ["Lãi suất", `${loan.rate}%`]].map(([label, value]) => <div key={label}><p className="mb-1 text-[10px] font-semibold uppercase text-[#A3A3A3]">{label}</p><p className="text-sm font-semibold">{value}</p></div>)}</div><div className="flex flex-wrap gap-2"><button onClick={() => setModal({ type: "disburse", loanId: loan.id })} className="flex items-center gap-1.5 rounded-xl bg-[#B22222] px-3.5 py-2 text-xs font-semibold text-white"><Plus className="size-3.5" /> Giải ngân thêm</button><button onClick={() => setModal({ type: "pay", loanId: loan.id })} className="flex items-center gap-1.5 rounded-xl bg-[#111111] px-3.5 py-2 text-xs font-semibold text-white"><Calendar className="size-3.5" /> Thanh toán khoản vay</button></div></div></motion.div>}</AnimatePresence>
      </motion.div>;
    })}</div></section>}

    {showCreditSection && <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Thẻ tín dụng</p><h2 className="mt-1 text-xl font-semibold text-[#111111]">Dư nợ thẻ</h2></div>
        <span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-semibold text-[#737373]">{cards.length} thẻ</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{cards.map((card) => {
      const pct = card.limit > 0 ? Math.round((card.used / card.limit) * 100) : 0;
      return <div key={card.id} className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm"><button type="button" onClick={() => setModal({ type: "cardDetail", cardId: card.id })} className="mb-4 w-full rounded-2xl p-5 text-left text-white" style={{ background: card.color }}><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-white/50">{card.bank}</p><p className="font-semibold">{card.name}</p></div><p className="text-xs text-white/40">•••• {card.last4}</p></div><p className="mt-6 text-2xl font-semibold">{formatMoney(card.used)}</p><p className="text-xs text-white/45">Dư nợ hiện tại</p><div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3"><div><p className="text-[10px] text-white/45">Hạn mức</p><p className="text-sm font-semibold">{formatMoney(card.limit)}</p></div><div><p className="text-[10px] text-white/45">Còn lại</p><p className="text-sm font-semibold">{formatMoney(Math.max(0, card.limit - card.used))}</p></div></div></button><div className="mb-1 flex justify-between text-xs"><span>Hạn mức đã dùng</span><span>{pct}%</span></div><div className="mb-4 h-1.5 rounded-full bg-[#F5F5F5]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: card.color }} /></div><p className="text-xs text-[#666666]">Sao kê {shortDate(card.statementDate)} · đến hạn {shortDate(card.dueDate)}. Thanh toán thẻ không ghi nhận chi tiêu lần hai.</p><button onClick={() => setModal({ type: "cardPay", cardId: card.id })} className="mt-4 w-full rounded-xl bg-[#111111] px-3.5 py-2.5 text-xs font-semibold text-white">Thanh toán thẻ tín dụng</button></div>;
    })}</div></section>}
    <WorkspaceTransactionHistory title="Lịch sử giao dịch Khoản vay" subtitle="Giải ngân, trả gốc, trả lãi và thanh toán thẻ tín dụng." transactions={periodLoanTransactions} onAdjustTransaction={(transaction) => setModal({ type: "txEdit", transactionId: transaction.id })} />
  </div>

  <AnimatePresence>
    {modal?.type === "add" && <AddLoanModal onClose={() => setModal(null)} onAdd={addLoan} />}
    {modal?.type === "detail" && selectedLoan && <LoanDetailModal loan={selectedLoan} onClose={() => setModal(null)} onPay={() => setModal({ type: "pay", loanId: selectedLoan.id })} onDisburse={() => setModal({ type: "disburse", loanId: selectedLoan.id })} onEdit={() => setModal({ type: "edit", loanId: selectedLoan.id })} onAdjust={() => setModal({ type: "adjust", loanId: selectedLoan.id })} onSettle={() => settleLoan(selectedLoan.id)} onHide={() => hideLoan(selectedLoan.id)} />}
    {modal?.type === "edit" && selectedLoan && <EditLoanModal loan={selectedLoan} hasTransactions={loanHasTransactions(selectedLoan, loanTransactions)} onClose={() => setModal({ type: "detail", loanId: selectedLoan.id })} onSave={saveLoanEdit} />}
    {modal?.type === "adjust" && selectedLoan && <AdjustLoanDebtModal loan={selectedLoan} onClose={() => setModal({ type: "detail", loanId: selectedLoan.id })} onSave={adjustLoanDebt} />}
    {modal?.type === "pay" && selectedLoan && <PayLoanModal loan={selectedLoan} onClose={() => setModal(null)} onPay={payLoan} />}
    {modal?.type === "disburse" && selectedLoan && <DisburseLoanModal loan={selectedLoan} onClose={() => setModal(null)} onDisburse={disburseExistingLoan} />}
    {modal?.type === "cardDetail" && selectedCard && <CardDetailModal card={selectedCard} onClose={() => setModal(null)} onPay={() => setModal({ type: "cardPay", cardId: selectedCard.id })} onEdit={() => setModal({ type: "cardEdit", cardId: selectedCard.id })} onAdjust={() => setModal({ type: "cardAdjust", cardId: selectedCard.id })} onHide={() => hideCard(selectedCard.id)} />}
    {modal?.type === "cardEdit" && selectedCard && <EditCardModal card={selectedCard} onClose={() => setModal({ type: "cardDetail", cardId: selectedCard.id })} onSave={saveCardEdit} />}
    {modal?.type === "cardAdjust" && selectedCard && <AdjustCardDebtModal card={selectedCard} onClose={() => setModal({ type: "cardDetail", cardId: selectedCard.id })} onSave={adjustCardDebt} />}
    {modal?.type === "cardPay" && selectedCard && <CreditCardPaymentModal card={selectedCard} onClose={() => setModal(null)} onPay={payCreditCard} />}
    {modal?.type === "txEdit" && selectedLoanTransaction && <EditLoanTransactionModal transaction={selectedLoanTransaction} onClose={() => setModal(null)} onSave={updateLoanHistoryTransaction} />}
  </AnimatePresence>
  </div>;
}





