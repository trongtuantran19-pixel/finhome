import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Target, Calendar, TrendingUp, CheckCircle2, ArrowDown, ArrowUp, X, Landmark, PiggyBank, WalletCards, Check, ChevronRight, SlidersHorizontal } from "lucide-react";
import { cn } from "./ui/utils";
import { WorkspaceTimeFilter, createDefaultWorkspaceTimeRange, isDateInWorkspaceRange, type WorkspaceTimeRange } from "./WorkspaceTimeFilter";
import { QuickDateField, todayISO } from "./QuickDateField";
import { formatMoney, interestSavings as initialInterestSavings, metrics, personalAccounts, savingGoals as initialSavingGoals, type CashflowTransaction, type InterestSaving, type PersonalAccount, type SavingGoal } from "../finhomeData";
import { WorkspaceTransactionHistory } from "./WorkspaceTransactionHistory";
import { appendStoredItem, finhomeStorageKeys, readStoredJson, writeStoredJson } from "../finhomeStorage";

const SAVINGS_STORAGE_KEYS = {
  goals: finhomeStorageKeys.savingsGoals,
  interest: finhomeStorageKeys.savingsInterest,
} as const;
type SavingsModal = { type: "deposit" | "withdraw"; goalId: string } | null;
type SavingsHistoryModal = { type: "txEdit"; transactionId: string } | null;
type AddSavingsMode = "goal" | "interest";

type AddGoalPayload = {
  goal: SavingGoal;
  sourceAccountId: string | null;
  initialAmount: number;
  date: string;
  note: string;
};

type AddInterestPayload = {
  saving: InterestSaving;
  initMode: "transfer" | "existing";
  sourceAccountId: string | null;
  principal: number;
  date: string;
  note: string;
};

type SettlementModal = InterestSaving | null;
type TopUpModal = InterestSaving | null;

const inputClass = "w-full rounded-2xl border border-black/[0.12] bg-white px-4 py-3 text-sm font-semibold text-[#111111] outline-none focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)]";
const labelClass = "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737373]";

function parseNumber(value: string) {
  return Number(value.replace(/[^0-9]/g, "")) || 0;
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}


function loadPersonalAccounts() {
  return readStoredJson<PersonalAccount[]>(finhomeStorageKeys.personalAccounts, personalAccounts);
}

function savePersonalAccounts(accounts: PersonalAccount[]) {
  writeStoredJson(finhomeStorageKeys.personalAccounts, accounts);
}

function appendPersonalTransaction(transaction: CashflowTransaction) {
  appendStoredItem(finhomeStorageKeys.personalTransactions, transaction);
}

function calculateExpectedInterest(principal: number, annualRate: number, termMonths: number) {
  return Math.round(principal * annualRate / 100 * termMonths / 12);
}

function SavingsActionModal({ modal, goal, onClose, onConfirm }: { modal: Exclude<SavingsModal, null>; goal: SavingGoal; onClose: () => void; onConfirm: (amount: number, accountId: string, date: string, note: string) => void }) {
  const accounts = useMemo(() => loadPersonalAccounts().filter((account) => account.status === "active"), []);
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("0");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const value = parseNumber(amount);
  const isDeposit = modal.type === "deposit";
  const title = isDeposit ? "N\u1EA1p ti\u1EBFt ki\u1EC7m" : "R\u00FAt ti\u1EBFt ki\u1EC7m";
  const subtitle = isDeposit ? "Chuy\u1EC3n ti\u1EC1n t\u1EEB t\u00E0i kho\u1EA3n c\u00E1 nh\u00E2n v\u00E0o m\u1EE5c ti\u00EAu ti\u1EBFt ki\u1EC7m" : "Chuy\u1EC3n ti\u1EC1n t\u1EEB m\u1EE5c ti\u00EAu ti\u1EBFt ki\u1EC7m v\u1EC1 t\u00E0i kho\u1EA3n c\u00E1 nh\u00E2n";
  const accountLabel = isDeposit ? "N\u1EA1p t\u1EEB t\u00E0i kho\u1EA3n" : "R\u00FAt v\u1EC1 t\u00E0i kho\u1EA3n";
  const sheetTitle = isDeposit ? "Ch\u1ECDn t\u00E0i kho\u1EA3n ngu\u1ED3n" : "Ch\u1ECDn t\u00E0i kho\u1EA3n nh\u1EADn";
  const helper = isDeposit ? "N\u1EA1p ti\u1EBFt ki\u1EC7m l\u00E0 chuy\u1EC3n ti\u1EC1n n\u1ED9i b\u1ED9, kh\u00F4ng t\u00EDnh l\u00E0 chi ti\u00EAu." : "R\u00FAt ti\u1EBFt ki\u1EC7m l\u00E0 chuy\u1EC3n ti\u1EC1n n\u1ED9i b\u1ED9, kh\u00F4ng t\u00EDnh l\u00E0 thu nh\u1EADp.";
  const account = accounts.find((item) => item.id === accountId);
  const insufficient = isDeposit && value > (account?.balance ?? 0);
  const overWithdraw = !isDeposit && value > goal.current;
  const invalid = value <= 0 || !accountId || insufficient || overWithdraw;
  const isToday = date === todayISO();

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
      <div className="flex-shrink-0 px-5 pb-3 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><h2 className="text-xl font-semibold text-[#111111]">{title}</h2><p className="mt-1 text-xs leading-relaxed text-[#737373]">{subtitle}</p><p className="mt-1 truncate text-xs font-semibold text-[#B22222]">{goal.name}</p></div>
          <button onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#A3A3A3] hover:bg-[#EFEFEF]"><X className="size-4" /></button>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-3">
        <div className="rounded-[20px] bg-[#F8F6F3] p-4"><p className="text-xs font-medium text-[#737373]">{"S\u1ED1 ti\u1EC1n hi\u1EC7n c\u00F3"}</p><p className="mt-1 text-2xl font-semibold text-[#111111]">{formatMoney(goal.current)}</p></div>
        <div>
          <label className={labelClass}>{accountLabel}</label>
          <button type="button" onClick={() => setPickerOpen(true)} className="mt-2 flex min-h-[50px] w-full items-center justify-between gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-left transition hover:border-black/[0.16] focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)] focus:outline-none">
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#111111]">{account?.name ?? "Ch\u1ECDn t\u00E0i kho\u1EA3n"}</span>{account && <span className="mt-0.5 block truncate text-xs font-medium text-[#A3A3A3]">{"C\u00E1 nh\u00E2n: "}{formatMoney(account.balance)}</span>}</span>
            <ChevronRight className="size-4 shrink-0 text-[#B22222]" />
          </button>
        </div>
        <div><label className={labelClass}>{"S\u1ED1 ti\u1EC1n"}</label><input className={cn(inputClass, "mt-2 h-[50px]")} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></div>
        <div><label className={labelClass}>Ngày giao dịch</label><div className="mt-2"><QuickDateField label="Ngày giao dịch" value={date} onChange={setDate} variant="chip" /></div></div>
        <div><label className={labelClass}>{"Ghi ch\u00FA"}</label><textarea className={cn(inputClass, "mt-2 min-h-14 py-3")} value={note} onChange={(event) => setNote(event.target.value)} placeholder={"Ghi ch\u00FA"} /></div>
        <div className="rounded-2xl bg-[#F9F6F1] px-4 py-2.5 text-xs leading-relaxed text-[#666666]">{helper}</div>
        {insufficient && <div className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#B22222]">{"T\u00E0i kho\u1EA3n ngu\u1ED3n kh\u00F4ng \u0111\u1EE7 s\u1ED1 d\u01B0 \u0111\u1EC3 n\u1EA1p."}</div>}
        {overWithdraw && <div className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#B22222]">{"Kh\u00F4ng th\u1EC3 r\u00FAt l\u1EDBn h\u01A1n s\u1ED1 ti\u1EC1n \u0111ang c\u00F3 trong m\u1EE5c ti\u00EAu."}</div>}
      </div>
      <div className="grid flex-shrink-0 grid-cols-2 gap-3 border-t border-black/[0.06] bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <button onClick={onClose} className="h-12 rounded-2xl border border-black/[0.1] bg-white text-sm font-semibold text-[#111111]">{"H\u1EE7y"}</button>
        <button disabled={invalid} onClick={() => onConfirm(value, accountId, date, note)} className="h-12 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20 disabled:bg-[#D4D4D4] disabled:shadow-none">{isDeposit ? "N\u1EA1p ti\u1EC1n" : "R\u00FAt ti\u1EC1n"}</button>
      </div>
    </motion.div>
    <AnimatePresence>{pickerOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30" onClick={(event) => { event.stopPropagation(); setPickerOpen(false); }}>
      <motion.div initial={{ y: 360 }} animate={{ y: 0 }} exit={{ y: 360 }} transition={{ type: "spring", bounce: 0.16, duration: 0.34 }} className="w-full max-w-md rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[#D4D4D4]" />
        <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">{"T\u00E0i kho\u1EA3n c\u00E1 nh\u00E2n"}</p><h3 className="mt-1 text-lg font-semibold text-[#111111]">{sheetTitle}</h3></div><button onClick={() => setPickerOpen(false)} className="flex size-10 items-center justify-center rounded-full bg-[#F5F5F5] text-[#666666]"><X className="size-4" /></button></div>
        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">{accounts.map((item) => { const selected = item.id === accountId; return <button key={item.id} type="button" onClick={() => { setAccountId(item.id); setPickerOpen(false); }} className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition", selected ? "border-[#B22222] bg-[#FDECEC] text-[#B22222]" : "border-black/[0.08] bg-white text-[#111111] hover:border-black/[0.16]")}><span><span className="block text-sm font-semibold">{item.name}</span><span className="mt-0.5 block text-xs text-[#A3A3A3]">{"C\u00E1 nh\u00E2n: "}{formatMoney(item.balance)}</span></span>{selected && <Check className="size-4 text-[#B22222]" />}</button>; })}</div>
      </motion.div>
    </motion.div>}</AnimatePresence>
  </motion.div>;
}

function AddSavingsModal({ onClose, onAddGoal, onAddInterest }: { onClose: () => void; onAddGoal: (payload: AddGoalPayload) => void; onAddInterest: (payload: AddInterestPayload) => void }) {
  const accounts = useMemo(() => loadPersonalAccounts().filter((account) => account.status === "active"), []);
  const [mode, setMode] = useState<AddSavingsMode>("goal");
  const [name, setName] = useState("");
  const [bank, setBank] = useState("VPBank");
  const [target, setTarget] = useState("0");
  const [initialDeposit, setInitialDeposit] = useState("0");
  const [goalSourceId, setGoalSourceId] = useState("none");
  const [principal, setPrincipal] = useState("0");
  const [rate, setRate] = useState("5.8");
  const [startDate, setStartDate] = useState(todayISO());
  const [due, setDue] = useState("2026-12-31");
  const [term, setTerm] = useState("6");
  const [initMode, setInitMode] = useState<"transfer" | "existing">("transfer");
  const [interestSourceId, setInterestSourceId] = useState(accounts[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [accountPicker, setAccountPicker] = useState<"goal" | "interest" | null>(null);

  const targetValue = parseNumber(target);
  const initialValue = goalSourceId === "none" ? 0 : parseNumber(initialDeposit);
  const principalValue = parseNumber(principal);
  const termValue = Number(term) || 0;
  const rateValue = Number(rate) || 0;
  const expectedInterest = Math.round(principalValue * rateValue / 100 * termValue / 12);
  const goalSource = accounts.find((account) => account.id === goalSourceId);
  const interestSource = accounts.find((account) => account.id === interestSourceId);
  const goalInvalid = !name.trim() || targetValue <= 0 || !goalSourceId || (goalSourceId === "none" ? initialValue !== 0 : initialValue <= 0 || initialValue > (goalSource?.balance ?? 0));
  const interestInvalid = !name.trim() || principalValue <= 0 || startDate > due || (initMode === "transfer" && (!interestSourceId || principalValue > (interestSource?.balance ?? 0)));
  const canSave = mode === "goal" ? !goalInvalid : !interestInvalid;

  function chooseGoalSource(id: string) {
    setGoalSourceId(id);
    if (id === "none") setInitialDeposit("0");
    setAccountPicker(null);
  }

  function submit() {
    if (!canSave) return;
    if (mode === "goal") {
      const goal: SavingGoal = {
        id: "goal-" + Date.now(),
        name: name.trim(),
        target: targetValue,
        current: initialValue,
        monthly: Math.max(0, Math.round((targetValue - initialValue) / 6)),
        start: startDate,
        due: startDate,
        status: initialValue >= targetValue && targetValue > 0 ? "completed" : "active",
      };
      onAddGoal({
        goal,
        sourceAccountId: goalSourceId === "none" ? null : goalSourceId,
        initialAmount: initialValue,
        date: startDate,
        note,
      });
      return;
    }

    const saving: InterestSaving = {
      id: "saving-" + Date.now(),
      name: name.trim(),
      bank: bank.trim() || "Ngân hàng",
      principal: principalValue,
      annualRate: rateValue,
      start: startDate,
      maturity: due,
      termMonths: termValue,
      expectedInterest,
      allowTopUp: true,
      status: "active",
    };
    onAddInterest({
      saving,
      initMode,
      sourceAccountId: initMode === "transfer" ? interestSourceId : null,
      principal: principalValue,
      date: startDate,
      note,
    });
  }

  const pickerAccounts = accountPicker === "goal" ? accounts : accounts;
  const selectedPickerId = accountPicker === "goal" ? goalSourceId : interestSourceId;
  const pickerTitle = accountPicker === "goal" ? "Chọn nguồn tiền ban đầu" : "Chọn tài khoản nguồn";

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
      <div className="flex-shrink-0 px-5 pb-3 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Không gian tiết kiệm</p><h2 className="mt-1 text-xl font-semibold text-[#111111]">Thêm khoản tiết kiệm</h2></div>
          <button onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#A3A3A3] hover:bg-[#EFEFEF]"><X className="size-4" /></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#F5F5F5] p-1.5">
          <button onClick={() => setMode("goal")} className={cn("rounded-xl px-3 py-2.5 text-sm font-semibold", mode === "goal" ? "bg-white text-[#111111] shadow-sm" : "text-[#737373]")}>Mục tiêu</button>
          <button onClick={() => setMode("interest")} className={cn("rounded-xl px-3 py-2.5 text-sm font-semibold", mode === "interest" ? "bg-white text-[#111111] shadow-sm" : "text-[#737373]")}>Sinh lãi</button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4">
        <div><label className={labelClass}>{mode === "goal" ? "Tên mục tiêu" : "Tên khoản tiết kiệm"}</label><input className={cn(inputClass, "mt-2 h-[50px]")} value={name} onChange={(event) => setName(event.target.value)} placeholder={mode === "goal" ? "Ví dụ: Mua xe" : "Ví dụ: VPBank 6 tháng"} /></div>

        {mode === "goal" ? <>
          <div><label className={labelClass}>Số tiền mục tiêu</label><input className={cn(inputClass, "mt-2 h-[50px]")} inputMode="numeric" value={target} onChange={(event) => setTarget(event.target.value)} /></div>
          <div>
            <label className={labelClass}>Nguồn tiền ban đầu</label>
            <button type="button" onClick={() => setAccountPicker("goal")} className="mt-2 flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-left transition hover:border-black/[0.16] focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)] focus:outline-none">
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#111111]">{goalSourceId === "none" ? "Chưa nạp" : goalSource?.name ?? "Chọn nguồn tiền"}</span><span className="mt-0.5 block truncate text-xs text-[#A3A3A3]">{goalSourceId === "none" ? "Tạo mục tiêu với số dư 0 đ" : "Cá nhân: " + formatMoney(goalSource?.balance ?? 0)}</span></span>
              <ChevronRight className="size-4 shrink-0 text-[#B22222]" />
            </button>
          </div>
          <div><label className={labelClass}>Số tiền nạp ban đầu</label><input className={cn(inputClass, "mt-2 h-[50px]", goalSourceId === "none" && "bg-[#F5F5F5] text-[#A3A3A3]")} disabled={goalSourceId === "none"} inputMode="numeric" value={goalSourceId === "none" ? "0" : initialDeposit} onChange={(event) => setInitialDeposit(event.target.value)} /></div>
          <div><label className={labelClass}>Ngày giao dịch</label><div className="mt-2"><QuickDateField value={startDate} onChange={setStartDate} variant="chip" /></div></div>
        </> : <>
          <div><label className={labelClass}>Ngân hàng</label><input className={cn(inputClass, "mt-2 h-[50px]")} value={bank} onChange={(event) => setBank(event.target.value)} /></div>
          <div><label className={labelClass}>Tiền gốc</label><input className={cn(inputClass, "mt-2 h-[50px]")} inputMode="numeric" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Lãi suất %/năm</label><input className={cn(inputClass, "mt-2 h-[50px]")} inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} /></div><div><label className={labelClass}>Kỳ hạn tháng</label><input className={cn(inputClass, "mt-2 h-[50px]")} inputMode="numeric" value={term} onChange={(event) => setTerm(event.target.value)} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Ngày gửi</label><div className="mt-2"><QuickDateField value={startDate} onChange={setStartDate} variant="chip" /></div></div><div><label className={labelClass}>Ngày đáo hạn</label><div className="mt-2"><QuickDateField value={due} onChange={setDue} variant="chip" /></div></div></div>
          <div>
            <label className={labelClass}>Kiểu khởi tạo</label>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-[#F5F5F5] p-1.5">
              <button type="button" onClick={() => setInitMode("transfer")} className={cn("rounded-xl px-3 py-2.5 text-xs font-semibold", initMode === "transfer" ? "bg-white text-[#111111] shadow-sm" : "text-[#737373]")}>Chuyển từ ví</button>
              <button type="button" onClick={() => setInitMode("existing")} className={cn("rounded-xl px-3 py-2.5 text-xs font-semibold", initMode === "existing" ? "bg-white text-[#111111] shadow-sm" : "text-[#737373]")}>Đã có sẵn</button>
            </div>
          </div>
          {initMode === "transfer" ? <div>
            <label className={labelClass}>Tài khoản nguồn</label>
            <button type="button" onClick={() => setAccountPicker("interest")} className="mt-2 flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-left transition hover:border-black/[0.16] focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)] focus:outline-none">
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#111111]">{interestSource?.name ?? "Chọn tài khoản nguồn"}</span><span className="mt-0.5 block truncate text-xs text-[#A3A3A3]">Cá nhân: {formatMoney(interestSource?.balance ?? 0)}</span></span>
              <ChevronRight className="size-4 shrink-0 text-[#B22222]" />
            </button>
          </div> : <div className="rounded-2xl bg-[#F9F6F1] px-4 py-3 text-xs leading-relaxed text-[#666666]">Khoản này đã tồn tại trước khi dùng FinHome. Hệ thống ghi nhận là số dư khởi tạo và không tạo giao dịch chuyển tiền.</div>}
          <div className="rounded-2xl bg-[#F8F5F0] p-4"><div className="flex items-center justify-between text-sm"><span className="text-[#737373]">Lãi dự kiến</span><strong>{formatMoney(expectedInterest)}</strong></div><div className="mt-2 flex items-center justify-between text-sm"><span className="text-[#737373]">Tổng nhận dự kiến</span><strong className="text-[#166534]">{formatMoney(principalValue + expectedInterest)}</strong></div></div>
        </>}

        <div><label className={labelClass}>Ghi chú</label><textarea className={cn(inputClass, "mt-2 min-h-16 py-3")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú" /></div>
        <div className="rounded-2xl bg-[#F9F6F1] px-4 py-3 text-xs leading-relaxed text-[#666666]">{mode === "goal" ? "Nếu chọn nguồn tiền, hệ thống tự tạo giao dịch nạp tiết kiệm ban đầu. Nếu chưa có tiền, chọn Chưa nạp." : "Gửi tiết kiệm từ ví cá nhân là chuyển tiền nội bộ, không tính chi tiêu. Khoản đã có sẵn chỉ là số dư khởi tạo."}</div>
        {mode === "goal" && goalSourceId !== "none" && initialValue > (goalSource?.balance ?? 0) && <div className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#B22222]">Số tiền nạp vượt quá số dư tài khoản nguồn.</div>}
        {mode === "interest" && initMode === "transfer" && principalValue > (interestSource?.balance ?? 0) && <div className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#B22222]">Tiền gốc vượt quá số dư tài khoản nguồn.</div>}
        {mode === "interest" && startDate > due && <div className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#B22222]">Ngày gửi không được sau ngày đáo hạn.</div>}
      </div>

      <div className="grid flex-shrink-0 grid-cols-2 gap-3 border-t border-black/[0.06] bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <button onClick={onClose} className="h-12 rounded-2xl border border-black/[0.1] bg-white text-sm font-semibold text-[#111111]">Hủy</button>
        <button disabled={!canSave} onClick={submit} className="h-12 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20 disabled:bg-[#D4D4D4] disabled:shadow-none">Lưu</button>
      </div>
    </motion.div>

    <AnimatePresence>{accountPicker && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30" onClick={(event) => { event.stopPropagation(); setAccountPicker(null); }}>
      <motion.div initial={{ y: 360 }} animate={{ y: 0 }} exit={{ y: 360 }} transition={{ type: "spring", bounce: 0.16, duration: 0.34 }} className="w-full max-w-md rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[#D4D4D4]" />
        <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">Tài khoản cá nhân</p><h3 className="mt-1 text-lg font-semibold text-[#111111]">{pickerTitle}</h3></div><button onClick={() => setAccountPicker(null)} className="flex size-10 items-center justify-center rounded-full bg-[#F5F5F5] text-[#666666]"><X className="size-4" /></button></div>
        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {accountPicker === "goal" && <button type="button" onClick={() => chooseGoalSource("none")} className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition", goalSourceId === "none" ? "border-[#B22222] bg-[#FDECEC] text-[#B22222]" : "border-black/[0.08] bg-white text-[#111111] hover:border-black/[0.16]")}><span><span className="block text-sm font-semibold">Chưa nạp</span><span className="mt-0.5 block text-xs text-[#A3A3A3]">Tạo mục tiêu với số dư 0 đ</span></span>{goalSourceId === "none" && <Check className="size-4 text-[#B22222]" />}</button>}
          {pickerAccounts.map((item) => { const selected = item.id === selectedPickerId; return <button key={item.id} type="button" onClick={() => { if (accountPicker === "goal") chooseGoalSource(item.id); else { setInterestSourceId(item.id); setAccountPicker(null); } }} className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition", selected ? "border-[#B22222] bg-[#FDECEC] text-[#B22222]" : "border-black/[0.08] bg-white text-[#111111] hover:border-black/[0.16]")}><span><span className="block text-sm font-semibold">{item.name}</span><span className="mt-0.5 block text-xs text-[#A3A3A3]">Cá nhân: {formatMoney(item.balance)}</span></span>{selected && <Check className="size-4 text-[#B22222]" />}</button>; })}
        </div>
      </motion.div>
    </motion.div>}</AnimatePresence>
  </motion.div>;
}

function InterestTopUpModal({ saving, onClose, onConfirm }: { saving: InterestSaving; onClose: () => void; onConfirm: (savingId: string, amount: number, accountId: string, date: string, note: string) => void }) {
  const accounts = useMemo(() => loadPersonalAccounts().filter((account) => account.status === "active"), []);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("0");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const value = parseNumber(amount);
  const sourceAccount = accounts.find((account) => account.id === accountId);
  const nextPrincipal = saving.principal + value;
  const nextInterest = calculateExpectedInterest(nextPrincipal, saving.annualRate, saving.termMonths);
  const canSave = value > 0 && Boolean(sourceAccount) && value <= (sourceAccount?.balance ?? 0);

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="mb-5 flex items-start justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Tiết kiệm sinh lãi</p><h2 className="mt-1 text-xl font-semibold text-[#111111]">Gửi thêm</h2><p className="mt-1 text-sm text-[#737373]">{saving.name} · {saving.bank}</p></div>
        <button onClick={onClose} className="rounded-2xl p-3 text-[#A3A3A3] hover:bg-[#F5F5F5]"><X className="size-4" /></button>
      </div>
      <div className="space-y-4">
        <div className="rounded-3xl bg-[#111111] p-5 text-white"><p className="text-xs text-white/60">Gốc hiện tại</p><p className="mt-1 text-2xl font-semibold">{formatMoney(saving.principal)}</p><div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><p className="text-xs text-white/60">Gốc sau gửi</p><p className="mt-1 text-sm font-semibold">{formatMoney(nextPrincipal)}</p></div><div><p className="text-xs text-white/60">Lãi dự kiến mới</p><p className="mt-1 text-sm font-semibold text-[#FCA5A5]">{formatMoney(nextInterest)}</p></div></div></div>
        <div><label className={labelClass}>Tài khoản nguồn</label><div className="mt-2 grid gap-2">{accounts.map((account) => <button key={account.id} onClick={() => setAccountId(account.id)} className={cn("flex items-center justify-between rounded-2xl border px-4 py-3 text-left", accountId === account.id ? "border-[#B22222] bg-[#FDECEC] text-[#B22222]" : "border-black/[0.08] bg-white text-[#111111]")}><span><span className="block text-sm font-semibold">{account.name}</span><span className="text-xs text-[#A3A3A3]">{account.type} · {formatMoney(account.balance)}</span></span><span className="text-sm font-semibold">{accountId === account.id ? "✓" : ""}</span></button>)}</div></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className={labelClass}>Số tiền gửi thêm</label><input className={cn(inputClass, "mt-2")} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><div><label className={labelClass}>Ngày giao dịch</label><QuickDateField value={date} onChange={setDate} /></div></div>
        <div><label className={labelClass}>Ghi chú</label><textarea className={cn(inputClass, "mt-2 min-h-20")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú thêm nếu cần" /></div>
        <div className={cn("rounded-2xl px-4 py-3 text-xs leading-relaxed", value > (sourceAccount?.balance ?? 0) ? "bg-[#FEF2F2] text-[#B22222] font-semibold" : "bg-[#F9F6F1] text-[#666666]")}>{value > (sourceAccount?.balance ?? 0) ? "Tài khoản nguồn không đủ số dư." : `Gửi thêm là chuyển tiền nội bộ: ${sourceAccount?.name ?? "Tài khoản"} giảm ${formatMoney(value)}, gốc tiết kiệm tăng ${formatMoney(value)}. Không tính chi tiêu.`}</div>
        <div className="flex gap-3 pt-2"><button onClick={onClose} className="h-12 flex-1 rounded-2xl border border-black/[0.1] text-sm font-semibold text-[#111111]">Hủy</button><button disabled={!canSave} onClick={() => onConfirm(saving.id, value, accountId, date, note)} className="h-12 flex-1 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20 disabled:bg-[#D4D4D4] disabled:shadow-none">Xác nhận</button></div>
      </div>
    </motion.div>
  </motion.div>;
}

function SettlementModalView({ saving, onClose, onConfirm }: { saving: InterestSaving; onClose: () => void; onConfirm: (accountId: string, interestAmount: number, date: string, earlySettlement: boolean) => void }) {
  const activeAccounts = useMemo(() => loadPersonalAccounts().filter((account) => account.status === "active"), []);
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [interestAmount, setInterestAmount] = useState(String(saving.expectedInterest));
  const account = activeAccounts.find((item) => item.id === accountId);
  const interestValue = Math.max(0, parseNumber(interestAmount));
  const total = saving.principal + interestValue;
  const earlySettlement = date < saving.maturity;
  const invalid = !accountId || saving.principal <= 0 || interestValue < 0;

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
      <div className="flex-shrink-0 px-5 pb-3 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">{"T\u1EA5t to\u00E1n ti\u1EBFt ki\u1EC7m"}</p><h2 className="mt-1 truncate text-xl font-semibold text-[#111111]">{saving.name}</h2><p className="mt-1 text-xs text-[#737373]">{saving.bank} - {"\u0111\u00E1o h\u1EA1n"} {displayDate(saving.maturity)}</p></div>
          <button onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#A3A3A3] hover:bg-[#EFEFEF]"><X className="size-4" /></button>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-3">
        <div className="rounded-[22px] bg-[#111111] p-4 text-white">
          <div className="grid grid-cols-2 gap-3"><div><p className="text-[11px] text-white/60">{"G\u1ED1c"}</p><p className="mt-1 text-lg font-semibold">{formatMoney(saving.principal)}</p></div><div><p className="text-[11px] text-white/60">{"L\u00E3i th\u1EF1c nh\u1EADn"}</p><p className="mt-1 text-lg font-semibold text-[#FCA5A5]">{formatMoney(interestValue)}</p></div></div>
          <div className="mt-3 border-t border-white/10 pt-3"><p className="text-[11px] text-white/60">{"T\u1ED5ng nh\u1EADn"}</p><p className="mt-1 text-2xl font-semibold">{formatMoney(total)}</p></div>
        </div>
        <div className={cn("rounded-2xl px-4 py-3 text-xs font-semibold", earlySettlement ? "bg-[#FEF2F2] text-[#B22222]" : "bg-[#F0FDF4] text-[#166534]")}>{earlySettlement ? "T\u1EA5t to\u00E1n tr\u01B0\u1EDBc h\u1EA1n: h\u00E3y nh\u1EADp l\u00E3i th\u1EF1c nh\u1EADn theo ng\u00E2n h\u00E0ng." : "T\u1EA5t to\u00E1n \u0111\u00FAng h\u1EA1n ho\u1EB7c sau h\u1EA1n."}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Ngày tất toán</label><div className="mt-2"><QuickDateField label="Ngày tất toán" value={date} onChange={setDate} variant="chip" /></div></div>
          <div><label className={labelClass}>{"L\u00E3i th\u1EF1c nh\u1EADn"}</label><input className={cn(inputClass, "mt-2 h-[50px]")} inputMode="numeric" value={interestAmount} onChange={(event) => setInterestAmount(event.target.value)} /></div>
        </div>
        <div>
          <label className={labelClass}>{"T\u00E0i kho\u1EA3n nh\u1EADn"}</label>
          <button type="button" onClick={() => setPickerOpen(true)} className="mt-2 flex min-h-[50px] w-full items-center justify-between gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-left transition hover:border-black/[0.16] focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)] focus:outline-none">
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#111111]">{account?.name ?? "Ch\u1ECDn t\u00E0i kho\u1EA3n"}</span>{account && <span className="mt-0.5 block truncate text-xs font-medium text-[#A3A3A3]">{account.type}: {formatMoney(account.balance)}</span>}</span>
            <ChevronRight className="size-4 shrink-0 text-[#B22222]" />
          </button>
        </div>
        <div className="rounded-2xl bg-[#F9F6F1] px-4 py-2.5 text-xs leading-relaxed text-[#666666]">{"Khi t\u1EA5t to\u00E1n: t\u00E0i kho\u1EA3n c\u00E1 nh\u00E2n t\u0103ng theo t\u1ED5ng nh\u1EADn. Ph\u1EA7n g\u1ED1c kh\u00F4ng ph\u1EA3i thu nh\u1EADp; ch\u1EC9 ph\u1EA7n l\u00E3i th\u1EF1c nh\u1EADn m\u1EDBi t\u00EDnh l\u00E0 Thu nh\u1EADp t\u00E0i ch\u00EDnh."}</div>
      </div>
      <div className="grid flex-shrink-0 grid-cols-2 gap-3 border-t border-black/[0.06] bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <button onClick={onClose} className="h-12 rounded-2xl border border-black/[0.1] bg-white text-sm font-semibold text-[#111111]">{"H\u1EE7y"}</button>
        <button disabled={invalid} onClick={() => onConfirm(accountId, interestValue, date, earlySettlement)} className="h-12 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20 disabled:bg-[#D4D4D4] disabled:shadow-none">{"X\u00E1c nh\u1EADn"}</button>
      </div>
    </motion.div>
    <AnimatePresence>{pickerOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30" onClick={(event) => { event.stopPropagation(); setPickerOpen(false); }}>
      <motion.div initial={{ y: 360 }} animate={{ y: 0 }} exit={{ y: 360 }} transition={{ type: "spring", bounce: 0.16, duration: 0.34 }} className="w-full max-w-md rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[#D4D4D4]" />
        <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">{"T\u00E0i kho\u1EA3n c\u00E1 nh\u00E2n"}</p><h3 className="mt-1 text-lg font-semibold text-[#111111]">{"Ch\u1ECDn t\u00E0i kho\u1EA3n nh\u1EADn"}</h3></div><button onClick={() => setPickerOpen(false)} className="flex size-10 items-center justify-center rounded-full bg-[#F5F5F5] text-[#666666]"><X className="size-4" /></button></div>
        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">{activeAccounts.map((item) => { const selected = item.id === accountId; return <button key={item.id} type="button" onClick={() => { setAccountId(item.id); setPickerOpen(false); }} className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition", selected ? "border-[#B22222] bg-[#FDECEC] text-[#B22222]" : "border-black/[0.08] bg-white text-[#111111] hover:border-black/[0.16]")}><span><span className="block text-sm font-semibold">{item.name}</span><span className="mt-0.5 block text-xs text-[#A3A3A3]">{item.type}: {formatMoney(item.balance)}</span></span>{selected && <Check className="size-4 text-[#B22222]" />}</button>; })}</div>
      </motion.div>
    </motion.div>}</AnimatePresence>
  </motion.div>;
}



function EditSavingsTransactionModal({
  transaction,
  onClose,
  onSave,
}: {
  transaction: CashflowTransaction;
  onClose: () => void;
  onSave: (transaction: CashflowTransaction) => void;
}) {
  const [name, setName] = useState(transaction.name);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [date, setDate] = useState(transaction.date);
  const [note, setNote] = useState(transaction.note ?? "");
  const value = parseNumber(amount);
  const action = transactionDetailText(transaction, "savingsAction");
  const isSettlement = action.includes("Tất toán");
  const isInterestIncome = transaction.kind === "savings_interest";
  const amountLabel = isSettlement ? "Tổng nhận" : isInterestIncome ? "Lãi nhận" : "Số tiền";
  const canSave = name.trim().length > 0 && value >= 0;

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
      <div className="flex-shrink-0 px-5 pb-3 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">Lịch sử tiết kiệm</p><h2 className="mt-1 text-xl font-semibold text-[#111111]">Điều chỉnh giao dịch</h2><p className="mt-1 text-xs leading-relaxed text-[#737373]">{action || "Nạp, rút, gửi thêm hoặc tất toán tiết kiệm"}</p></div>
          <button onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#A3A3A3] hover:bg-[#EFEFEF]"><X className="size-4" /></button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4">
        <div><label className={labelClass}>Tên giao dịch</label><input className={cn(inputClass, "mt-2")} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div><label className={labelClass}>{amountLabel}</label><input className={cn(inputClass, "mt-2")} value={amount} inputMode="numeric" onChange={(event) => setAmount(event.target.value)} /></div>
        <QuickDateField label="Ngày giao dịch" value={date} onChange={setDate} variant="chip" />
        <div><label className={labelClass}>Ghi chú</label><textarea className={cn(inputClass, "mt-2 min-h-20")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú" /></div>
        <div className="rounded-2xl bg-[#F9F6F1] px-4 py-3 text-xs leading-relaxed text-[#666666]">Khi lưu, FinHome sẽ đảo giao dịch cũ rồi áp giao dịch mới để ví và tiết kiệm không bị lệch số liệu.</div>
      </div>

      <div className="grid flex-shrink-0 grid-cols-2 gap-3 border-t border-black/[0.06] bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <button onClick={onClose} className="h-12 rounded-2xl border border-black/[0.1] bg-white text-sm font-semibold text-[#111111]">Hủy</button>
        <button disabled={!canSave} onClick={() => {
          const nextDetails = { ...(transaction.details ?? {}) };
          nextDetails.amount = value;
          if (isSettlement) {
            const principal = Number(nextDetails.principal) || 0;
            nextDetails.total = value;
            nextDetails.interest = Math.max(0, value - principal);
          }
          if (isInterestIncome) {
            nextDetails.interest = value;
            nextDetails.total = value;
          }
          onSave({ ...transaction, name: name.trim(), amount: value, date, note: note.trim(), details: nextDetails });
        }} className="h-12 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20 disabled:bg-[#D4D4D4] disabled:shadow-none">Lưu thay đổi</button>
      </div>
    </motion.div>
  </motion.div>;
}

function AdjustSavingsModal({
  goals,
  interestList,
  onClose,
  onConfirm,
}: {
  goals: SavingGoal[];
  interestList: InterestSaving[];
  onClose: () => void;
  onConfirm: (payload:
    | { type: "goal"; id: string; current: number; target: number; monthly: number; date: string; note: string }
    | { type: "interest"; id: string; principal: number; annualRate: number; termMonths: number; expectedInterest: number; maturity: string; date: string; note: string }
  ) => void;
}) {
  const activeGoals = goals.filter((goal) => !["hidden", "closed"].includes(goal.status));
  const activeInterest = interestList.filter((saving) => !["hidden", "closed", "settled"].includes(saving.status));
  const [mode, setMode] = useState<"goal" | "interest">(activeGoals.length ? "goal" : "interest");
  const [goalId, setGoalId] = useState(activeGoals[0]?.id ?? "");
  const [interestId, setInterestId] = useState(activeInterest[0]?.id ?? "");
  const selectedGoal = activeGoals.find((goal) => goal.id === goalId);
  const selectedInterest = activeInterest.find((saving) => saving.id === interestId);
  const [current, setCurrent] = useState(String(selectedGoal?.current ?? 0));
  const [target, setTarget] = useState(String(selectedGoal?.target ?? 0));
  const [monthly, setMonthly] = useState(String(selectedGoal?.monthly ?? 0));
  const [principal, setPrincipal] = useState(String(selectedInterest?.principal ?? 0));
  const [rate, setRate] = useState(String(selectedInterest?.annualRate ?? 0));
  const [term, setTerm] = useState(String(selectedInterest?.termMonths ?? 0));
  const [expectedInterest, setExpectedInterest] = useState(String(selectedInterest?.expectedInterest ?? 0));
  const [maturity, setMaturity] = useState(selectedInterest?.maturity ?? todayISO());
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  function chooseGoal(id: string) {
    const goal = activeGoals.find((item) => item.id === id);
    setGoalId(id);
    setCurrent(String(goal?.current ?? 0));
    setTarget(String(goal?.target ?? 0));
    setMonthly(String(goal?.monthly ?? 0));
  }

  function chooseInterest(id: string) {
    const saving = activeInterest.find((item) => item.id === id);
    setInterestId(id);
    setPrincipal(String(saving?.principal ?? 0));
    setRate(String(saving?.annualRate ?? 0));
    setTerm(String(saving?.termMonths ?? 0));
    setExpectedInterest(String(saving?.expectedInterest ?? 0));
    setMaturity(saving?.maturity ?? todayISO());
  }

  const goalCurrent = parseNumber(current);
  const goalTarget = parseNumber(target);
  const goalMonthly = parseNumber(monthly);
  const interestPrincipal = parseNumber(principal);
  const interestRate = Number(rate) || 0;
  const interestTerm = Number(term) || 0;
  const interestExpected = parseNumber(expectedInterest);
  const canSave = mode === "goal" ? Boolean(selectedGoal) : Boolean(selectedInterest);

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
      <div className="flex-shrink-0 px-5 pb-3 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">Không gian tiết kiệm</p><h2 className="mt-1 text-xl font-semibold text-[#111111]">Điều chỉnh tiết kiệm</h2><p className="mt-1 text-xs leading-relaxed text-[#737373]">Dùng khi nhập sai số dư, mục tiêu hoặc thông tin khoản gửi. Không tính là nạp/rút thật.</p></div>
          <button onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#A3A3A3] hover:bg-[#EFEFEF]"><X className="size-4" /></button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4">
        <div className="grid grid-cols-2 rounded-2xl bg-[#F5F5F5] p-1.5">
          <button type="button" onClick={() => { setMode("goal"); if (!goalId && activeGoals[0]) chooseGoal(activeGoals[0].id); }} className={cn("rounded-xl px-3 py-2.5 text-sm font-semibold transition", mode === "goal" ? "bg-white text-[#111111] shadow-sm" : "text-[#737373]")}>Mục tiêu</button>
          <button type="button" onClick={() => { setMode("interest"); if (!interestId && activeInterest[0]) chooseInterest(activeInterest[0].id); }} className={cn("rounded-xl px-3 py-2.5 text-sm font-semibold transition", mode === "interest" ? "bg-white text-[#111111] shadow-sm" : "text-[#737373]")}>Sinh lãi</button>
        </div>

        {mode === "goal" ? <>
          <div><label className={labelClass}>Chọn mục tiêu</label><div className="mt-2 space-y-2">{activeGoals.map((goal) => <button key={goal.id} type="button" onClick={() => chooseGoal(goal.id)} className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left", goal.id === goalId ? "border-[#B22222] bg-[#FDECEC] text-[#B22222]" : "border-black/[0.08] bg-white text-[#111111]")}><span><span className="block text-sm font-semibold">{goal.name}</span><span className="text-xs text-[#A3A3A3]">{formatMoney(goal.current)} / {formatMoney(goal.target)}</span></span>{goal.id === goalId && <Check className="size-4" />}</button>)}</div></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className={labelClass}>Số tiền hiện có thực tế</label><input className={cn(inputClass, "mt-2")} value={current} inputMode="numeric" onChange={(event) => setCurrent(event.target.value)} /></div><div><label className={labelClass}>Số tiền mục tiêu thực tế</label><input className={cn(inputClass, "mt-2")} value={target} inputMode="numeric" onChange={(event) => setTarget(event.target.value)} /></div></div>
          <div><label className={labelClass}>Cần góp mỗi tháng</label><input className={cn(inputClass, "mt-2")} value={monthly} inputMode="numeric" onChange={(event) => setMonthly(event.target.value)} /></div>
        </> : <>
          <div><label className={labelClass}>Chọn khoản sinh lãi</label><div className="mt-2 space-y-2">{activeInterest.map((saving) => <button key={saving.id} type="button" onClick={() => chooseInterest(saving.id)} className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left", saving.id === interestId ? "border-[#B22222] bg-[#FDECEC] text-[#B22222]" : "border-black/[0.08] bg-white text-[#111111]")}><span><span className="block text-sm font-semibold">{saving.name}</span><span className="text-xs text-[#A3A3A3]">{saving.bank} · {formatMoney(saving.principal)}</span></span>{saving.id === interestId && <Check className="size-4" />}</button>)}</div></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className={labelClass}>Số tiền gốc thực tế</label><input className={cn(inputClass, "mt-2")} value={principal} inputMode="numeric" onChange={(event) => setPrincipal(event.target.value)} /></div><div><label className={labelClass}>Lãi dự kiến thực tế</label><input className={cn(inputClass, "mt-2")} value={expectedInterest} inputMode="numeric" onChange={(event) => setExpectedInterest(event.target.value)} /></div></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className={labelClass}>Lãi suất %/năm</label><input className={cn(inputClass, "mt-2")} value={rate} inputMode="decimal" onChange={(event) => setRate(event.target.value)} /></div><div><label className={labelClass}>Kỳ hạn tháng</label><input className={cn(inputClass, "mt-2")} value={term} inputMode="numeric" onChange={(event) => setTerm(event.target.value)} /></div></div>
          <div><label className={labelClass}>Ngày đáo hạn</label><QuickDateField value={maturity} onChange={setMaturity} /></div>
        </>}

        <QuickDateField label="Ngày điều chỉnh" value={date} onChange={setDate} variant="chip" />
        <div><label className={labelClass}>Ghi chú</label><textarea className={cn(inputClass, "mt-2 min-h-16")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú" /></div>
        <div className="rounded-2xl bg-[#F9F6F1] px-4 py-3 text-xs leading-relaxed text-[#666666]">Điều chỉnh chỉ sửa số liệu tiết kiệm, không làm thay đổi ví cá nhân và không tính là thu nhập hoặc chi tiêu.</div>
      </div>

      <div className="grid flex-shrink-0 grid-cols-2 gap-3 border-t border-black/[0.06] bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <button onClick={onClose} className="h-12 rounded-2xl border border-black/[0.1] bg-white text-sm font-semibold text-[#111111]">Hủy</button>
        <button disabled={!canSave} onClick={() => {
          if (mode === "goal") onConfirm({ type: "goal", id: goalId, current: goalCurrent, target: goalTarget, monthly: goalMonthly, date, note });
          else onConfirm({ type: "interest", id: interestId, principal: interestPrincipal, annualRate: interestRate, termMonths: interestTerm, expectedInterest: interestExpected, maturity, date, note });
        }} className="h-12 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20 disabled:bg-[#D4D4D4] disabled:shadow-none">Lưu điều chỉnh</button>
      </div>
    </motion.div>
  </motion.div>;
}

export function SavingsPage() {
  const [timeRange, setTimeRange] = useState<WorkspaceTimeRange>(createDefaultWorkspaceTimeRange);
  const savingsTransactions = readStoredJson<CashflowTransaction[]>(finhomeStorageKeys.personalTransactions, []).filter((tx) => tx.space === "Tiết kiệm" || tx.id.startsWith("saving-") || tx.kind === "savings_interest");
  const periodSavingsTransactions = savingsTransactions.filter((tx) => isDateInWorkspaceRange(tx.date, timeRange));
  const [goals, setGoals] = useState<SavingGoal[]>(() => readStoredJson(SAVINGS_STORAGE_KEYS.goals, initialSavingGoals));
  const [interestList, setInterestList] = useState<InterestSaving[]>(() => readStoredJson(SAVINGS_STORAGE_KEYS.interest, initialInterestSavings));
  const [modal, setModal] = useState<SavingsModal>(null);
  const [historyModal, setHistoryModal] = useState<SavingsHistoryModal>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [settlement, setSettlement] = useState<SettlementModal>(null);
  const [topUp, setTopUp] = useState<TopUpModal>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  useEffect(() => writeStoredJson(SAVINGS_STORAGE_KEYS.goals, goals), [goals]);
  useEffect(() => writeStoredJson(SAVINGS_STORAGE_KEYS.interest, interestList), [interestList]);

  const activeGoals = goals.filter((goal) => !["hidden", "closed"].includes(goal.status));
  const activeInterest = interestList.filter((saving) => !["hidden", "closed", "settled"].includes(saving.status));
  const selectedGoal = modal ? goals.find((goal) => goal.id === modal.goalId) : undefined;
  const selectedSavingsTransaction = historyModal ? savingsTransactions.find((transaction) => transaction.id === historyModal.transactionId) : undefined;
  void historyVersion;
  const summary = useMemo(() => {
    const targetSaved = activeGoals.reduce((sum, goal) => sum + goal.current, 0);
    const targetTotal = activeGoals.reduce((sum, goal) => sum + goal.target, 0);
    const principal = activeInterest.reduce((sum, saving) => sum + saving.principal, 0);
    const expectedInterest = activeInterest.reduce((sum, saving) => sum + saving.expectedInterest, 0);
    return { targetSaved, targetTotal, principal, expectedInterest, total: targetSaved + principal, overallPct: targetTotal ? Math.round(targetSaved / targetTotal * 100) : 0 };
  }, [activeGoals, activeInterest]);

  function updateGoalAmount(amount: number, accountId: string, date: string, note = "") {
    if (!modal) return;
    const accounts = loadPersonalAccounts();
    const account = accounts.find((item) => item.id === accountId);
    const goal = goals.find((item) => item.id === modal.goalId);
    if (!account || !goal) return;
    if (modal.type === "deposit" && account.balance < amount) return;
    if (modal.type === "withdraw" && goal.current < amount) return;
    const direction = modal.type === "deposit" ? -amount : amount;
    const nextAccounts = accounts.map((item) => item.id === accountId ? { ...item, balance: item.balance + direction } : item);
    const nextGoals = goals.map((item) => {
      if (item.id !== modal.goalId) return item;
      const nextCurrent = modal.type === "deposit" ? item.current + amount : Math.max(0, item.current - amount);
      return { ...item, current: nextCurrent, status: nextCurrent >= item.target ? "completed" : item.status === "completed" ? "active" : item.status };
    });
    savePersonalAccounts(nextAccounts);
    writeStoredJson(SAVINGS_STORAGE_KEYS.goals, nextGoals);
    setGoals(nextGoals);
    appendPersonalTransaction({
      id: `saving-goal-${modal.type}-${Date.now()}`,
      date,
      name: modal.type === "deposit" ? "Nạp tiết kiệm mục tiêu" : "Rút tiết kiệm về Cá nhân",
      space: "Tiết kiệm",
      source: modal.type === "deposit" ? `${account.name} -> ${goal.name}` : `${goal.name} -> ${account.name}`,
      amount,
      kind: "transfer",
      status: "active",
      note: note.trim() || (modal.type === "deposit" ? "Chuyển tiền nội bộ vào tiết kiệm, không tính chi tiêu" : "Chuyển tiền nội bộ từ tiết kiệm về Cá nhân, không tính thu nhập"),
      details: {
        savingsAction: modal.type === "deposit" ? "Nạp mục tiêu" : "Rút về cá nhân",
        goalName: goal.name,
        fromAccount: modal.type === "deposit" ? account.name : undefined,
        toAccount: modal.type === "withdraw" ? account.name : undefined,
        amount,
        before: goal.current,
        after: modal.type === "deposit" ? goal.current + amount : Math.max(0, goal.current - amount),
      },
      countsAsIncome: false,
      countsAsExpense: false,
    });
    setModal(null);
  }



  function addGoalFromModal(payload: AddGoalPayload) {
    const amount = Math.max(0, payload.initialAmount);
    if (payload.sourceAccountId && amount > 0) {
      const accounts = loadPersonalAccounts();
      const source = accounts.find((account) => account.id === payload.sourceAccountId);
      if (!source || source.balance < amount) return;
      savePersonalAccounts(accounts.map((account) => account.id === payload.sourceAccountId ? { ...account, balance: account.balance - amount } : account));
      appendPersonalTransaction({
        id: "saving-initial-goal-" + Date.now(),
        date: payload.date,
        name: "Nạp tiết kiệm ban đầu",
        space: "Tiết kiệm",
        source: source.name + " -> " + payload.goal.name,
        amount,
        kind: "transfer",
        status: "active",
        note: payload.note.trim() || "Nạp tiết kiệm ban đầu là chuyển tiền nội bộ, không tính chi tiêu",
        details: {
          savingsAction: "Nạp tiết kiệm ban đầu",
          goalName: payload.goal.name,
          fromAccount: source.name,
          amount,
          after: amount,
        },
        countsAsIncome: false,
        countsAsExpense: false,
      });
    }
    setGoals((current) => [payload.goal, ...current]);
    setAddOpen(false);
  }

  function addInterestFromModal(payload: AddInterestPayload) {
    if (payload.initMode === "transfer") {
      const accounts = loadPersonalAccounts();
      const source = accounts.find((account) => account.id === payload.sourceAccountId);
      if (!source || source.balance < payload.principal) return;
      savePersonalAccounts(accounts.map((account) => account.id === payload.sourceAccountId ? { ...account, balance: account.balance - payload.principal } : account));
      appendPersonalTransaction({
        id: "saving-initial-interest-" + Date.now(),
        date: payload.date,
        name: "Gửi tiết kiệm",
        space: "Tiết kiệm",
        source: source.name + " -> " + payload.saving.name,
        amount: payload.principal,
        kind: "transfer",
        status: "active",
        note: payload.note.trim() || "Gửi tiết kiệm từ tài khoản cá nhân là chuyển tiền nội bộ, không tính chi tiêu",
        details: {
          savingsAction: "Gửi tiết kiệm",
          savingName: payload.saving.name,
          fromAccount: source.name,
          principal: payload.principal,
          initMode: "transfer",
        },
        countsAsIncome: false,
        countsAsExpense: false,
      });
    }
    setInterestList((current) => [payload.saving, ...current]);
    setAddOpen(false);
  }

  function topUpInterestSaving(savingId: string, amount: number, accountId: string, date: string, note: string) {
    if (amount <= 0) return;
    const accounts = loadPersonalAccounts();
    const source = accounts.find((account) => account.id === accountId);
    if (!source || source.balance < amount) return;
    const nextInterestList = interestList.map((saving) => {
      if (saving.id !== savingId) return saving;
      const nextPrincipal = saving.principal + amount;
      return { ...saving, principal: nextPrincipal, expectedInterest: calculateExpectedInterest(nextPrincipal, saving.annualRate, saving.termMonths) };
    });
    setInterestList(nextInterestList);
    writeStoredJson(SAVINGS_STORAGE_KEYS.interest, nextInterestList);
    savePersonalAccounts(accounts.map((account) => account.id === accountId ? { ...account, balance: account.balance - amount } : account));
    const saving = interestList.find((item) => item.id === savingId);
    appendPersonalTransaction({
      id: `saving-topup-${Date.now()}`,
      date,
      name: "Gửi thêm tiết kiệm sinh lãi",
      space: "Tiết kiệm",
      source: `${source.name} -> ${saving?.name ?? "Tiết kiệm sinh lãi"}`,
      amount,
      kind: "transfer",
      status: "active",
      note: note.trim() || "Chuyển tiền nội bộ vào tiết kiệm sinh lãi, không tính chi tiêu",
      details: {
        savingsAction: "Gửi thêm sinh lãi",
        savingName: saving?.name ?? "Tiết kiệm sinh lãi",
        fromAccount: source.name,
        amount,
        principal: amount,
        before: saving?.principal ?? 0,
        after: (saving?.principal ?? 0) + amount,
      },
      countsAsIncome: false,
      countsAsExpense: false,
    });
    setTopUp(null);
  }


  function adjustSavings(payload:
    | { type: "goal"; id: string; current: number; target: number; monthly: number; date: string; note: string }
    | { type: "interest"; id: string; principal: number; annualRate: number; termMonths: number; expectedInterest: number; maturity: string; date: string; note: string }
  ) {
    if (payload.type === "goal") {
      const nextGoals = goals.map((goal) => {
        if (goal.id !== payload.id) return goal;
        const nextCurrent = Math.max(0, payload.current);
        const nextTarget = Math.max(0, payload.target);
        return {
          ...goal,
          current: nextCurrent,
          target: nextTarget,
          monthly: Math.max(0, payload.monthly),
          status: nextTarget > 0 && nextCurrent >= nextTarget ? "completed" : goal.status === "completed" ? "active" : goal.status,
        };
      });
      setGoals(nextGoals);
      writeStoredJson(SAVINGS_STORAGE_KEYS.goals, nextGoals);
      const goal = goals.find((item) => item.id === payload.id);
      appendPersonalTransaction({
        id: `saving-adjust-${Date.now()}`,
        date: payload.date,
        name: `Điều chỉnh ${goal?.name ?? "mục tiêu tiết kiệm"}`,
        space: "Tiết kiệm",
        source: goal?.name ?? "Tiết kiệm mục tiêu",
        amount: 0,
        kind: "adjustment",
        status: "active",
        note: payload.note.trim() || "Điều chỉnh số liệu tiết kiệm mục tiêu, không tính thu nhập/chi tiêu",
        details: {
          savingsAction: "Điều chỉnh mục tiêu",
          goalName: goal?.name ?? "Tiết kiệm mục tiêu",
          after: Math.max(0, payload.current),
          target: Math.max(0, payload.target),
          monthly: Math.max(0, payload.monthly),
        },
        countsAsIncome: false,
        countsAsExpense: false,
      });
    } else {
      const nextInterestList = interestList.map((saving) => saving.id === payload.id ? {
        ...saving,
        principal: Math.max(0, payload.principal),
        annualRate: Math.max(0, payload.annualRate),
        termMonths: Math.max(0, payload.termMonths),
        expectedInterest: Math.max(0, payload.expectedInterest),
        maturity: payload.maturity,
      } : saving);
      setInterestList(nextInterestList);
      writeStoredJson(SAVINGS_STORAGE_KEYS.interest, nextInterestList);
      const saving = interestList.find((item) => item.id === payload.id);
      appendPersonalTransaction({
        id: `saving-adjust-${Date.now()}`,
        date: payload.date,
        name: `Điều chỉnh ${saving?.name ?? "tiết kiệm sinh lãi"}`,
        space: "Tiết kiệm",
        source: saving?.name ?? "Tiết kiệm sinh lãi",
        amount: 0,
        kind: "adjustment",
        status: "active",
        note: payload.note.trim() || "Điều chỉnh số liệu tiết kiệm sinh lãi, không tính thu nhập/chi tiêu",
        details: {
          savingsAction: "Điều chỉnh sinh lãi",
          savingName: saving?.name ?? "Tiết kiệm sinh lãi",
          principal: Math.max(0, payload.principal),
          annualRate: Math.max(0, payload.annualRate),
          termMonths: Math.max(0, payload.termMonths),
          expectedInterest: Math.max(0, payload.expectedInterest),
          maturity: payload.maturity,
        },
        countsAsIncome: false,
        countsAsExpense: false,
      });
    }
    setAdjustOpen(false);
  }


  function applySavingsHistoryTransaction(transaction: CashflowTransaction, direction: 1 | -1) {
    if (transaction.status === "cancelled") return;
    const amount = Math.max(0, transaction.amount);
    const action = transactionDetailText(transaction, "savingsAction");
    const goalName = transactionDetailText(transaction, "goalName");
    const savingName = transactionDetailText(transaction, "savingName");
    const fromAccount = transactionDetailText(transaction, "fromAccount") || accountNameFromTransferSource(transaction.source, "from");
    const toAccount = transactionDetailText(transaction, "toAccount") || accountNameFromTransferSource(transaction.source, "to");

    if (transaction.kind === "savings_interest") return;
    if (transaction.kind === "adjustment") return;

    if (action.includes("Nạp") && goalName) {
      setGoals((current) => {
        const next = current.map((goal) => goal.name === goalName ? { ...goal, current: Math.max(0, goal.current + direction * amount) } : goal);
        writeStoredJson(SAVINGS_STORAGE_KEYS.goals, next);
        return next;
      });
      const accounts = loadPersonalAccounts();
      savePersonalAccounts(accounts.map((account) => account.name === fromAccount ? { ...account, balance: account.balance - direction * amount } : account));
      return;
    }

    if (action.includes("Rút") && goalName) {
      setGoals((current) => {
        const next = current.map((goal) => goal.name === goalName ? { ...goal, current: Math.max(0, goal.current - direction * amount) } : goal);
        writeStoredJson(SAVINGS_STORAGE_KEYS.goals, next);
        return next;
      });
      const accounts = loadPersonalAccounts();
      savePersonalAccounts(accounts.map((account) => account.name === toAccount ? { ...account, balance: account.balance + direction * amount } : account));
      return;
    }

    if ((action.includes("Gửi tiết kiệm") || action.includes("Gửi thêm")) && savingName) {
      setInterestList((current) => {
        const next = current.map((saving) => {
          if (saving.name !== savingName) return saving;
          const principal = Math.max(0, saving.principal + direction * amount);
          return { ...saving, principal, expectedInterest: calculateExpectedInterest(principal, saving.annualRate, saving.termMonths) };
        });
        writeStoredJson(SAVINGS_STORAGE_KEYS.interest, next);
        return next;
      });
      const accounts = loadPersonalAccounts();
      savePersonalAccounts(accounts.map((account) => account.name === fromAccount ? { ...account, balance: account.balance - direction * amount } : account));
      return;
    }

    if (action.includes("Tất toán") && savingName) {
      const principal = Math.max(0, Number(transaction.details?.principal) || 0);
      const interest = Math.max(0, Number(transaction.details?.interest) || Math.max(0, amount - principal));
      const total = Math.max(0, Number(transaction.details?.total) || amount);
      setInterestList((current) => {
        const next = current.map((saving) => {
          if (saving.name !== savingName) return saving;
          if (direction === 1) return { ...saving, principal: 0, expectedInterest: interest, status: "settled" as const };
          return { ...saving, principal, expectedInterest: interest, status: "active" as const };
        });
        writeStoredJson(SAVINGS_STORAGE_KEYS.interest, next);
        return next;
      });
      const accounts = loadPersonalAccounts();
      savePersonalAccounts(accounts.map((account) => account.name === toAccount ? { ...account, balance: account.balance + direction * total } : account));
    }
  }

  function updateSavingsHistoryTransaction(updated: CashflowTransaction) {
    const transactions = readStoredJson<CashflowTransaction[]>(finhomeStorageKeys.personalTransactions, []);
    const original = transactions.find((transaction) => transaction.id === updated.id);
    if (!original) return;
    applySavingsHistoryTransaction(original, -1);
    applySavingsHistoryTransaction(updated, 1);
    savePersonalTransactions(transactions.map((transaction) => transaction.id === updated.id ? updated : transaction));
    setHistoryVersion((value) => value + 1);
    setHistoryModal(null);
  }

  function settleSaving(accountId: string, interestAmount: number, date: string, earlySettlement: boolean) {
    if (!settlement) return;
    const accounts = loadPersonalAccounts();
    const receivingAccount = accounts.find((account) => account.id === accountId);
    if (!receivingAccount) return;
    const principal = settlement.principal;
    const interest = Math.max(0, interestAmount);
    const total = principal + interest;
    savePersonalAccounts(accounts.map((account) => account.id === accountId ? { ...account, balance: account.balance + total } : account));
    const nextInterestList = interestList.map((saving) => saving.id === settlement.id ? { ...saving, principal: 0, expectedInterest: interest, status: "settled" } : saving);
    setInterestList(nextInterestList);
    writeStoredJson(SAVINGS_STORAGE_KEYS.interest, nextInterestList);
    appendPersonalTransaction({
      id: "saving-settlement-" + Date.now(),
      date,
      name: earlySettlement ? "Tất toán tiết kiệm trước hạn" : "Tất toán tiết kiệm",
      space: "Tiết kiệm",
      source: settlement.name + " -> " + receivingAccount.name,
      amount: total,
      kind: "transfer",
      status: "active",
      note: "Nhận gốc " + formatMoney(principal) + " và lãi " + formatMoney(interest) + ". Gốc không tính thu nhập.",
      details: {
        savingsAction: earlySettlement ? "Tất toán trước hạn" : "Tất toán",
        savingName: settlement.name,
        toAccount: receivingAccount.name,
        principal,
        interest,
        total,
        earlySettlement,
      },
      countsAsIncome: false,
      countsAsExpense: false,
    });
    if (interest > 0) {
      appendPersonalTransaction({
        id: "saving-interest-" + Date.now(),
        date,
        name: earlySettlement ? "Lãi tiết kiệm trước hạn" : "Lãi tiết kiệm",
        space: "Cá nhân",
        source: settlement.name,
        amount: interest,
        kind: "savings_interest",
        status: "active",
        note: "Chỉ phần lãi tiết kiệm được tính là thu nhập tài chính.",
        details: {
          savingsAction: earlySettlement ? "Lãi tất toán trước hạn" : "Lãi tiết kiệm",
          savingName: settlement.name,
          interest,
          total: interest,
        },
        countsAsIncome: true,
        countsAsExpense: false,
      });
    }
    setSettlement(null);
  }

  return <div className="min-h-full bg-[#F9F9F9]"><div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8 lg:px-8">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#A3A3A3]">Không gian tiết kiệm độc lập</p><h1 className="text-[1.75rem] font-semibold text-[#111111]">Tiết kiệm</h1><p className="mt-1 text-sm text-[#737373]">Tách rõ mục tiêu tiết kiệm và khoản gửi ngân hàng sinh lãi.</p></div><div className="flex flex-wrap items-center justify-end gap-2"><WorkspaceTimeFilter onChange={setTimeRange} /><button onClick={() => setAdjustOpen(true)} className="flex items-center gap-2 rounded-2xl border border-black/[0.1] bg-white px-4 py-3 text-sm font-semibold text-[#111111]"><SlidersHorizontal className="size-4" /> Điều chỉnh</button><button onClick={() => setAddOpen(true)} className="flex items-center gap-2 rounded-2xl bg-[#B22222] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20"><Plus className="size-4" /> Thêm tiết kiệm</button></div></div>
    </motion.div>

    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
      <div className="rounded-[28px] border border-black/[0.07] bg-[#111111] p-5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.10)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10"><PiggyBank className="size-5 text-white" /></div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">Tài sản tiết kiệm</span>
        </div>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">Tổng tiết kiệm</p>
        <p className="mt-2 text-3xl font-semibold leading-tight text-white sm:text-4xl">{formatMoney(summary.total)}</p>
        <p className="mt-3 text-sm leading-relaxed text-white/62">Mục tiêu + sinh lãi</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Tiết kiệm mục tiêu", value: formatMoney(summary.targetSaved), icon: Target, color: "text-[#111111]" },
          { label: "Gửi sinh lãi", value: formatMoney(summary.principal), icon: Landmark, color: "text-[#111111]" },
          { label: "Lãi dự kiến", value: formatMoney(summary.expectedInterest), icon: TrendingUp, color: "text-[#166534]" },
          { label: "Tiến độ mục tiêu", value: `${summary.overallPct}%`, icon: CheckCircle2, color: "text-[#B22222]" },
        ].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-[22px] border border-black/[0.07] bg-white p-4 shadow-sm sm:p-5"><div className="mb-3 flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#A3A3A3]">{item.label}</p><Icon className="size-4 text-[#D4D4D4]" /></div><p className={cn("text-lg font-semibold leading-tight sm:text-xl", item.color)}>{item.value}</p></div>; })}
      </div>
    </div>

    <div className="flex items-start gap-3 rounded-[22px] border border-black/[0.06] bg-[#F8F6F3] px-4 py-3 text-xs text-[#666666] shadow-sm">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-[#B22222]"><PiggyBank className="size-3.5" /></div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><p className="font-semibold text-[#111111]">Quy tắc tiết kiệm</p><button type="button" className="font-semibold text-[#B22222]">Xem chi tiết &gt;</button></div>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:gap-4"><span>• Nạp/Rút là chuyển tiền nội bộ</span><span>• Chỉ lãi khi tất toán là thu nhập tài chính</span></div>
      </div>
    </div>

    <section className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Loại 1</p><h2 className="mt-1 text-xl font-semibold text-[#111111]">Tiết kiệm mục tiêu</h2></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{activeGoals.map((goal, index) => { const pct = goal.target ? Math.min(100, Math.round(goal.current / goal.target * 100)) : 0; const done = goal.status === "completed" || pct >= 100; return <motion.div key={goal.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm"><div className="mb-5 flex items-start justify-between"><div><p className="text-base font-semibold text-[#111111]">{goal.name}</p><p className="mt-1 text-xs text-[#A3A3A3]">{displayDate(goal.start)} · mục tiêu {displayDate(goal.due)}</p></div><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", done ? "bg-[#DCFCE7] text-[#166534]" : goal.status === "paused" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#F5F5F5] text-[#666666]")}>{done ? "Đã hoàn thành" : goal.status === "paused" ? "Tạm dừng" : "Đang tiết kiệm"}</span></div><div className="mb-3 flex items-end justify-between"><div><p className="mb-1 text-[10px] font-semibold uppercase text-[#A3A3A3]">Hiện có</p><p className="text-2xl font-semibold text-[#111111]">{formatMoney(goal.current)}</p></div><div className="text-right"><p className="mb-1 text-[10px] font-semibold uppercase text-[#A3A3A3]">Mục tiêu</p><p className="text-sm font-semibold text-[#666666]">{formatMoney(goal.target)}</p></div></div><div className="mb-4"><div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-[#B22222]">{pct}%</span><span className="text-[#A3A3A3]">Còn thiếu {formatMoney(Math.max(0, goal.target - goal.current))}</span></div><div className="h-2 rounded-full bg-[#F5F5F5]"><div className="h-full rounded-full bg-[#B22222]" style={{ width: `${pct}%` }} /></div></div><div className="flex items-center justify-between border-t border-black/[0.05] pt-3"><div><p className="text-[10px] font-semibold uppercase text-[#A3A3A3]">Cần góp mỗi tháng</p><p className="text-xs font-semibold">{formatMoney(goal.monthly)}</p></div><div className="flex gap-1.5"><button onClick={() => setModal({ type: "deposit", goalId: goal.id })} className="flex items-center gap-1 rounded-xl bg-[#F0FDF4] px-3 py-2 text-[11px] font-semibold text-[#166534]"><ArrowDown className="size-3" /> Nạp</button><button onClick={() => setModal({ type: "withdraw", goalId: goal.id })} className="flex items-center gap-1 rounded-xl bg-[#FEF2F2] px-3 py-2 text-[11px] font-semibold text-[#B22222]"><ArrowUp className="size-3" /> Rút</button></div></div></motion.div>; })}</div></section>

    <section className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Loại 2</p><h2 className="mt-1 text-xl font-semibold text-[#111111]">Tiết kiệm sinh lãi</h2></div><div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{activeInterest.map((saving, index) => { const expectedTotal = saving.principal + saving.expectedInterest; return <motion.div key={saving.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm"><div className="mb-5 flex items-start justify-between"><div className="flex gap-3"><div className="flex size-12 items-center justify-center rounded-2xl bg-[#F8F5F0] text-[#B22222]"><Landmark className="size-5" /></div><div><p className="text-base font-semibold text-[#111111]">{saving.name}</p><p className="mt-1 text-xs text-[#A3A3A3]">{saving.bank} · kỳ hạn {saving.termMonths} tháng</p></div></div><span className="rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[10px] font-semibold text-[#166534]">Đang gửi</span></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#F8F5F0] p-4"><p className="text-xs text-[#737373]">Số tiền gốc</p><p className="mt-1 text-lg font-semibold text-[#111111]">{formatMoney(saving.principal)}</p></div><div className="rounded-2xl bg-[#F8F5F0] p-4"><p className="text-xs text-[#737373]">Lãi suất</p><p className="mt-1 text-lg font-semibold text-[#111111]">{saving.annualRate}%/năm</p></div><div className="rounded-2xl bg-[#F8F5F0] p-4"><p className="text-xs text-[#737373]">Ngày đáo hạn</p><p className="mt-1 text-sm font-semibold text-[#111111]">{displayDate(saving.maturity)}</p></div><div className="rounded-2xl bg-[#F8F5F0] p-4"><p className="text-xs text-[#737373]">Lãi dự kiến</p><p className="mt-1 text-sm font-semibold text-[#B22222]">{formatMoney(saving.expectedInterest)}</p></div></div><div className="mt-4 flex items-center justify-between rounded-2xl bg-[#111111] px-4 py-3 text-white"><div><p className="text-xs text-white/60">Tổng nhận dự kiến</p><p className="text-xl font-semibold">{formatMoney(expectedTotal)}</p></div><button onClick={() => setSettlement(saving)} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#111111]">Tất toán</button></div>{saving.allowTopUp && <button onClick={() => setTopUp(saving)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-black/[0.08] py-3 text-sm font-semibold text-[#111111]"><WalletCards className="size-4" /> Gửi thêm</button>}</motion.div>; })}</div></section>
    <WorkspaceTransactionHistory title="Lịch sử giao dịch Tiết kiệm" subtitle="Nạp, rút, gửi thêm, tất toán và nhận lãi tiết kiệm." transactions={periodSavingsTransactions} onAdjustTransaction={(transaction) => setHistoryModal({ type: "txEdit", transactionId: transaction.id })} />
  </div>
  <AnimatePresence>{modal && selectedGoal && <SavingsActionModal modal={modal} goal={selectedGoal} onClose={() => setModal(null)} onConfirm={updateGoalAmount} />}</AnimatePresence>
  <AnimatePresence>{historyModal && selectedSavingsTransaction && <EditSavingsTransactionModal transaction={selectedSavingsTransaction} onClose={() => setHistoryModal(null)} onSave={updateSavingsHistoryTransaction} />}</AnimatePresence>
  <AnimatePresence>{adjustOpen && <AdjustSavingsModal goals={goals} interestList={interestList} onClose={() => setAdjustOpen(false)} onConfirm={adjustSavings} />}</AnimatePresence>
  <AnimatePresence>{addOpen && <AddSavingsModal onClose={() => setAddOpen(false)} onAddGoal={addGoalFromModal} onAddInterest={addInterestFromModal} />}</AnimatePresence>
  <AnimatePresence>{settlement && <SettlementModalView saving={settlement} onClose={() => setSettlement(null)} onConfirm={settleSaving} />}</AnimatePresence>
  <AnimatePresence>{topUp && <InterestTopUpModal saving={topUp} onClose={() => setTopUp(null)} onConfirm={topUpInterestSaving} />}</AnimatePresence>
  </div>;
}
