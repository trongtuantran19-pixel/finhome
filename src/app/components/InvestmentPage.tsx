import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRightLeft, BarChart2, DollarSign, Plus, TrendingUp, X } from "lucide-react";
import { cn } from "./ui/utils";
import { WorkspaceTimeFilter } from "./WorkspaceTimeFilter";
import { QuickDateField, todayISO } from "./QuickDateField";
import { FormSelect } from "./FormSelect";
import {
  formatMoney,
  investmentCash,
  investmentHoldings,
  personalAccounts,
  type CashflowTransaction,
  type InvestmentHolding,
  type PersonalAccount,
} from "../finhomeData";
import {
  appendStoredItem,
  finhomeStorageKeys,
  readStoredJson,
  readStoredNumber,
  writeStoredJson,
  writeStoredNumber,
} from "../finhomeStorage";

type ModalKind = "transfer" | "buy" | "sell" | "proceeds" | null;
type PendingSale = {
  holdingId: string;
  quantity: number;
  price: number;
  fee: number;
  date: string;
  proceeds: number;
  capitalSold: number;
  realizedPL: number;
  note: "B�n một phần" | "B�n to�n bộ";
};

const inputClass = "w-full rounded-2xl border border-black/[0.1] bg-white px-4 py-3 text-sm font-semibold text-[#111111] outline-none focus:border-[#B22222]";

function parseMoney(value: string) {
  const normalized = value.replace(/[^0-9]/g, "");
  return normalized ? Number(normalized) : 0;
}

function loadCash() {
  return readStoredNumber(finhomeStorageKeys.investmentCash, investmentCash);
}

function saveCash(value: number) {
  writeStoredNumber(finhomeStorageKeys.investmentCash, value);
}

function normalizeHolding(item: Partial<InvestmentHolding>): InvestmentHolding {
  return {
    id: item.id ?? `holding-${Date.now()}`,
    code: item.code ?? "NEW",
    name: item.name ?? "Khoản đầu tư",
    type: item.type ?? "Kh�c",
    quantity: Number(item.quantity ?? 0),
    avgCost: Number(item.avgCost ?? 0),
    remainingCapital: Number(item.remainingCapital ?? 0),
    realizedPL: Number(item.realizedPL ?? 0),
    status: item.status ?? "holding",
    buyHistory: Array.isArray(item.buyHistory) ? item.buyHistory : [],
    sellHistory: Array.isArray(item.sellHistory) ? item.sellHistory : [],
  };
}

function loadHoldings() {
  const stored = readStoredJson<unknown>(finhomeStorageKeys.investmentHoldings, investmentHoldings);
  return (Array.isArray(stored) ? stored : investmentHoldings).map((item) => normalizeHolding(item as Partial<InvestmentHolding>));
}

function saveHoldings(value: InvestmentHolding[]) {
  writeStoredJson(finhomeStorageKeys.investmentHoldings, value);
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

function Modal({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <motion.div initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">Kh�ng gian đầu tư</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111111]">{title}</h2>
            {sub && <p className="mt-1 text-sm text-[#666666]">{sub}</p>}
          </div>
          <button onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#666666]">
            <X className="size-4" />
          </button>
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

function TransferModal({ cash, onClose, onConfirm }: { cash: number; onClose: () => void; onConfirm: (amount: number, accountId: string, date: string, note: string) => void }) {
  const accounts = useMemo(() => loadAccounts().filter((item) => item.status === "active"), []);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("0");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const value = parseMoney(amount);
  const target = accounts.find((item) => item.id === accountId);
  const canSave = value > 0 && value <= cash && Boolean(target);

  return (
    <Modal title="Chuyển tiền từ Đầu tư" sub="Chỉ chuyển từ Tiền mặt đầu tư sang t�i khoản c� nh�n." onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#F8F6F3] p-4">
          <p className="text-xs text-[#666666]">Nguồn tiền</p>
          <p className="mt-1 font-semibold text-[#111111]">Tiền mặt đầu tư � {formatMoney(cash)}</p>
        </div>
        <Field label="Đến t�i khoản">
          <FormSelect title="Chọn t�i khoản nhận" value={accountId} onChange={setAccountId} options={accounts.map((account) => ({ value: account.id, label: account.name, sub: `C� nh�n � ${formatMoney(account.balance)}` }))} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Số tiền"><input className={inputClass} value={amount} inputMode="numeric" onChange={(event) => setAmount(event.target.value)} /></Field>
          <QuickDateField value={date} onChange={setDate} />
        </div>
        <Field label="Ghi ch�"><textarea className={cn(inputClass, "min-h-20")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi ch�" /></Field>
        <p className={cn("rounded-2xl px-4 py-3 text-sm", value > cash ? "bg-[#FEF2F2] text-[#B22222]" : "bg-[#F8F6F3] text-[#666666]")}>
          {value > cash ? "Số tiền chuyển kh�ng được lớn hơn tiền mặt đầu tư." : `Tiền mặt đầu tư giảm ${formatMoney(value)}; ${target?.name ?? "t�i khoản nhận"} tăng ${formatMoney(value)}. Kh�ng t�nh thu nhập/chi ti�u.`}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-2xl border border-black/[0.12] py-3 font-semibold">Hủy</button>
          <button disabled={!canSave} onClick={() => { onConfirm(value, accountId, date, note); onClose(); }} className="rounded-2xl bg-[#B22222] py-3 font-semibold text-white disabled:bg-[#D4D4D4]">X�c nhận</button>
        </div>
      </div>
    </Modal>
  );
}

function BuyModal({ cash, onClose, onConfirm }: { cash: number; onClose: () => void; onConfirm: (payload: { code: string; name: string; type: string; quantity: number; price: number; fee: number; date: string }) => void }) {
  const [code, setCode] = useState("FPT");
  const [name, setName] = useState("Cổ phiếu FPT");
  const [assetType, setAssetType] = useState("Cổ phiếu");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("0");
  const [fee, setFee] = useState("0");
  const [date, setDate] = useState(todayISO());
  const qty = Number(quantity) || 0;
  const unitPrice = parseMoney(price);
  const feeValue = parseMoney(fee);
  const total = qty * unitPrice + feeValue;
  const canSave = code.trim().length > 0 && name.trim().length > 0 && qty > 0 && unitPrice > 0 && total <= cash;

  return (
    <Modal title="Mua khoản đầu tư" sub="Mua đầu tư kh�ng phải chi ti�u c� nh�n." onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="M� đầu tư"><input className={inputClass} value={code} onChange={(event) => setCode(event.target.value)} /></Field>
          <Field label="Loại t�i sản"><input className={inputClass} value={assetType} onChange={(event) => setAssetType(event.target.value)} /></Field>
        </div>
        <Field label="T�n khoản đầu tư"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số lượng"><input className={inputClass} value={quantity} inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} /></Field>
          <Field label="Gi� mua / đơn vị"><input className={inputClass} value={price} inputMode="numeric" onChange={(event) => setPrice(event.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Ph� mua"><input className={inputClass} value={fee} inputMode="numeric" onChange={(event) => setFee(event.target.value)} /></Field>
          <QuickDateField value={date} onChange={setDate} />
        </div>
        <p className={cn("rounded-2xl px-4 py-3 text-sm", total > cash ? "bg-[#FEF2F2] text-[#B22222]" : "bg-[#F8F6F3] text-[#666666]")}>
          {total > cash ? "Tiền mặt đầu tư kh�ng đủ để mua." : `Tiền mặt đầu tư giảm ${formatMoney(total)}; vốn đầu tư tăng ${formatMoney(total)}. Kh�ng t�nh chi ti�u c� nh�n.`}
        </p>
        <button disabled={!canSave} onClick={() => { onConfirm({ code: code.trim().toUpperCase(), name: name.trim(), type: assetType.trim() || "Kh�c", quantity: qty, price: unitPrice, fee: feeValue, date }); onClose(); }} className="w-full rounded-2xl bg-[#111111] py-3 font-semibold text-white disabled:bg-[#D4D4D4]">X�c nhận mua</button>
      </div>
    </Modal>
  );
}

function SellModal({ holdings, onClose, onContinue }: { holdings: InvestmentHolding[]; onClose: () => void; onContinue: (sale: PendingSale) => void }) {
  const [holdingId, setHoldingId] = useState(holdings[0]?.id ?? "");
  const holding = holdings.find((item) => item.id === holdingId);
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("0");
  const [fee, setFee] = useState("0");
  const [date, setDate] = useState(todayISO());
  const qty = Number(quantity) || 0;
  const unitPrice = parseMoney(price);
  const feeValue = parseMoney(fee);
  const proceeds = qty * unitPrice - feeValue;
  const capitalSold = (holding?.avgCost ?? 0) * qty;
  const realizedPL = proceeds - capitalSold;
  const canContinue = Boolean(holding) && qty > 0 && qty <= (holding?.quantity ?? 0) && unitPrice > 0 && proceeds >= 0;

  return (
    <Modal title="B�n khoản đầu tư" sub="Chỉ l�c b�n mới ghi nhận l�i/lỗ đ� chốt." onClose={onClose}>
      <div className="space-y-4">
        <Field label="Khoản đầu tư">
          <FormSelect title="Chọn khoản đầu tư" value={holdingId} onChange={setHoldingId} options={holdings.map((item) => ({ value: item.id, label: `${item.code} � ${item.name}`, sub: `C�n ${item.quantity}`, right: formatMoney(item.remainingCapital) }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số lượng b�n"><input className={inputClass} value={quantity} inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} /></Field>
          <Field label="Gi� b�n / đơn vị"><input className={inputClass} value={price} inputMode="numeric" onChange={(event) => setPrice(event.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Ph� b�n"><input className={inputClass} value={fee} inputMode="numeric" onChange={(event) => setFee(event.target.value)} /></Field>
          <QuickDateField value={date} onChange={setDate} />
        </div>
        <div className="rounded-2xl bg-[#F8F6F3] p-4 text-sm text-[#666666]">
          <p>Tiền b�n: <b>{formatMoney(proceeds)}</b></p>
          <p>Vốn b�n ra: <b>{formatMoney(capitalSold)}</b></p>
          <p>L�i/lỗ đ� chốt: <b className={realizedPL >= 0 ? "text-[#166534]" : "text-[#B22222]"}>{formatMoney(realizedPL)}</b></p>
        </div>
        <button disabled={!canContinue} onClick={() => { if (!holding) return; onContinue({ holdingId, quantity: qty, price: unitPrice, fee: feeValue, date, proceeds, capitalSold, realizedPL, note: qty === holding.quantity ? "B�n to�n bộ" : "B�n một phần" }); }} className="w-full rounded-2xl bg-[#B22222] py-3 font-semibold text-white disabled:bg-[#D4D4D4]">Tiếp tục</button>
      </div>
    </Modal>
  );
}

function ProceedsModal({ sale, onClose, onConfirm }: { sale: PendingSale; onClose: () => void; onConfirm: (transferToPersonal: number, accountId: string) => void }) {
  const accounts = useMemo(() => loadAccounts().filter((item) => item.status === "active"), []);
  const [mode, setMode] = useState<"keep" | "transfer">("keep");
  const [amount, setAmount] = useState("0");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const transferValue = mode === "keep" ? 0 : parseMoney(amount);
  const remaining = sale.proceeds - transferValue;
  const canSave = transferValue >= 0 && transferValue <= sale.proceeds && (mode === "keep" || Boolean(accountId));

  return (
    <Modal title="Xử l� tiền b�n" sub="Chuyển về c� nh�n kh�ng ghi nhận thu nhập lần hai." onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#111111] p-5 text-white">
          <div className="flex justify-between text-sm"><span>Số tiền b�n</span><b>{formatMoney(sale.proceeds)}</b></div>
          <div className="mt-2 flex justify-between text-sm"><span>Vốn mua đ� b�n</span><b>{formatMoney(sale.capitalSold)}</b></div>
          <div className="mt-2 flex justify-between text-sm"><span>L�i/lỗ đ� chốt</span><b className={sale.realizedPL >= 0 ? "text-[#86EFAC]" : "text-[#FCA5A5]"}>{formatMoney(sale.realizedPL)}</b></div>
        </div>
        <button onClick={() => setMode("keep")} className={cn("w-full rounded-2xl border p-4 text-left", mode === "keep" ? "border-[#B22222] bg-[#FDECEC]" : "border-black/[0.1]")}>
          <p className="font-semibold text-[#111111]">Giữ lại trong Đầu tư</p>
          <p className="mt-1 text-xs text-[#666666]">To�n bộ tiền b�n cộng v�o tiền mặt đầu tư.</p>
        </button>
        <button onClick={() => setMode("transfer")} className={cn("w-full rounded-2xl border p-4 text-left", mode === "transfer" ? "border-[#B22222] bg-[#FDECEC]" : "border-black/[0.1]")}>
          <p className="font-semibold text-[#111111]">Chuyển một phần về C� nh�n</p>
          <p className="mt-1 text-xs text-[#666666]">Phần c�n lại tự động giữ trong Đầu tư.</p>
        </button>
        {mode === "transfer" && (
          <>
            <Field label="T�i khoản c� nh�n nhận tiền">
              <FormSelect title="Chọn t�i khoản nhận" value={accountId} onChange={setAccountId} options={accounts.map((account) => ({ value: account.id, label: account.name, sub: `C� nh�n � ${formatMoney(account.balance)}` }))} />
            </Field>
            <Field label="Số tiền chuyển về C� nh�n"><input className={inputClass} value={amount} inputMode="numeric" onChange={(event) => setAmount(event.target.value)} /></Field>
          </>
        )}
        <p className={cn("rounded-2xl px-4 py-3 text-sm", transferValue > sale.proceeds ? "bg-[#FEF2F2] text-[#B22222]" : "bg-[#F8F6F3] text-[#666666]")}>
          {transferValue > sale.proceeds ? "Số tiền chuyển về c� nh�n kh�ng được lớn hơn tiền b�n." : `C� nh�n tăng ${formatMoney(transferValue)}; tiền mặt đầu tư tăng ${formatMoney(remaining)}.`}
        </p>
        <button disabled={!canSave} onClick={() => { onConfirm(transferValue, accountId); onClose(); }} className="w-full rounded-2xl bg-[#B22222] py-3 font-semibold text-white disabled:bg-[#D4D4D4]">X�c nhận</button>
      </div>
    </Modal>
  );
}

export function InvestmentPage() {
  const [cash, setCash] = useState(loadCash);
  const [holdings, setHoldings] = useState(loadHoldings);
  const [modal, setModal] = useState<ModalKind>(null);
  const [pendingSale, setPendingSale] = useState<PendingSale | null>(null);
  const [selectedId, setSelectedId] = useState(() => loadHoldings()[0]?.id ?? "");

  const active = holdings.filter((item) => item.status === "holding" && item.quantity > 0);
  const sold = holdings.filter((item) => item.status !== "holding" || item.quantity <= 0);
  const current = holdings.find((item) => item.id === selectedId) ?? active[0] ?? holdings[0];
  const investedCapital = active.reduce((sum, item) => sum + item.remainingCapital, 0);
  const realizedPL = holdings.reduce((sum, item) => sum + item.realizedPL, 0);
  const financialIncome = holdings.reduce((sum, item) => sum + Math.max(0, item.realizedPL), 0);

  function persist(nextCash: number, nextHoldings = holdings) {
    setCash(nextCash);
    setHoldings(nextHoldings);
    saveCash(nextCash);
    saveHoldings(nextHoldings);
  }

  function transferOut(amount: number, accountId: string, date: string, note: string) {
    const target = loadAccounts().find((item) => item.id === accountId);
    if (!target || amount <= 0 || amount > cash) return;
    persist(cash - amount);
    saveAccounts(loadAccounts().map((account) => account.id === accountId ? { ...account, balance: account.balance + amount } : account));
    appendPersonalTransaction({
      id: `invest-transfer-${Date.now()}`,
      date,
      name: "Chuyển tiền từ Đầu tư",
      space: "Đầu tư",
      source: `Tiền mặt đầu tư -> ${target.name}`,
      amount,
      kind: "transfer",
      status: "active",
      note: note.trim() || "Chuyển tiền nội bộ, kh�ng t�nh thu nhập hoặc chi ti�u",
    });
  }

  function buyInvestment(payload: { code: string; name: string; type: string; quantity: number; price: number; fee: number; date: string }) {
    const total = payload.quantity * payload.price + payload.fee;
    if (total <= 0 || total > cash) return;
    const existing = holdings.find((item) => item.code === payload.code && item.status === "holding");
    let nextHoldings: InvestmentHolding[];
    if (existing) {
      nextHoldings = holdings.map((item) => {
        if (item.id !== existing.id) return item;
        const nextQty = item.quantity + payload.quantity;
        const nextCapital = item.remainingCapital + total;
        return {
          ...item,
          name: payload.name,
          type: payload.type,
          quantity: nextQty,
          remainingCapital: nextCapital,
          avgCost: nextQty > 0 ? nextCapital / nextQty : 0,
          buyHistory: [...item.buyHistory, { date: payload.date, quantity: payload.quantity, price: payload.price, fee: payload.fee }],
        };
      });
      setSelectedId(existing.id);
    } else {
      const id = `holding-${Date.now()}`;
      nextHoldings = [
        ...holdings,
        {
          id,
          code: payload.code,
          name: payload.name,
          type: payload.type,
          quantity: payload.quantity,
          avgCost: total / payload.quantity,
          remainingCapital: total,
          realizedPL: 0,
          status: "holding",
          buyHistory: [{ date: payload.date, quantity: payload.quantity, price: payload.price, fee: payload.fee }],
          sellHistory: [],
        },
      ];
      setSelectedId(id);
    }
    persist(cash - total, nextHoldings);
    appendPersonalTransaction({
      id: `invest-buy-${Date.now()}`,
      date: payload.date,
      name: `Mua ${payload.code}`,
      space: "Đầu tư",
      source: "Tiền mặt đầu tư",
      amount: total,
      kind: "investment_buy",
      status: "active",
      note: "Mua đầu tư, kh�ng t�nh chi ti�u c� nh�n",
    });
  }

  function confirmSale(transferToPersonal: number, accountId: string) {
    if (!pendingSale) return;
    const holding = holdings.find((item) => item.id === pendingSale.holdingId);
    if (!holding) return;
    const nextQty = holding.quantity - pendingSale.quantity;
    const nextCapital = Math.max(0, holding.remainingCapital - pendingSale.capitalSold);
    const nextHoldings = holdings.map((item) => {
      if (item.id !== holding.id) return item;
      return {
        ...item,
        quantity: nextQty,
        remainingCapital: nextCapital,
        avgCost: nextQty > 0 ? nextCapital / nextQty : 0,
        realizedPL: item.realizedPL + pendingSale.realizedPL,
        status: nextQty > 0 ? "holding" : "sold",
        sellHistory: [...item.sellHistory, { date: pendingSale.date, quantity: pendingSale.quantity, price: pendingSale.price, fee: pendingSale.fee, realizedPL: pendingSale.realizedPL, note: pendingSale.note }],
      };
    });
    const kept = pendingSale.proceeds - transferToPersonal;
    persist(cash + kept, nextHoldings);
    if (transferToPersonal > 0) {
      saveAccounts(loadAccounts().map((account) => account.id === accountId ? { ...account, balance: account.balance + transferToPersonal } : account));
    }
    appendPersonalTransaction({
      id: `invest-sell-${Date.now()}`,
      date: pendingSale.date,
      name: `B�n ${holding.code}`,
      space: "Đầu tư",
      source: holding.name,
      amount: pendingSale.proceeds,
      kind: "investment_sell",
      status: "active",
      note: `${pendingSale.note}. L�i/lỗ đ� chốt ${formatMoney(pendingSale.realizedPL)}`,
      countsAsIncome: pendingSale.realizedPL > 0,
    });
    setPendingSale(null);
    setModal(null);
  }

  const kpis = [
    { label: "Tiền mặt đầu tư", value: formatMoney(cash), sub: "Tiền ri�ng của kh�ng gian Đầu tư", icon: DollarSign, color: "text-[#111111]" },
    { label: "Tổng vốn đang đầu tư", value: formatMoney(investedCapital), sub: "Chỉ vốn c�n nắm giữ", icon: BarChart2, color: "text-[#111111]" },
    { label: "Số khoản đang nắm giữ", value: String(active.length), sub: "Kh�ng gồm m� đ� b�n hết", icon: TrendingUp, color: "text-[#111111]" },
    { label: "L�i/lỗ đ� chốt", value: formatMoney(realizedPL), sub: "Chỉ ghi nhận khi b�n", icon: TrendingUp, color: realizedPL >= 0 ? "text-[#166534]" : "text-[#B22222]" },
    { label: "Thu nhập t�i ch�nh", value: formatMoney(financialIncome), sub: "L�i đầu tư đ� chốt", icon: DollarSign, color: "text-[#166534]" },
  ];

  return (
    <div className="min-h-full bg-[#F9F9F9]">
      <div className="mx-auto max-w-[1440px] space-y-6 px-6 py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#A3A3A3]">Kh�ng gian t�i ch�nh độc lập</p>
            <h1 className="text-[1.9rem] font-semibold text-[#111111]">Đầu tư</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <WorkspaceTimeFilter />
            <button onClick={() => setModal("transfer")} className="rounded-xl border border-black/[0.12] bg-white px-3.5 py-2 text-xs font-semibold text-[#111111]"><ArrowRightLeft className="mr-1 inline size-3.5" /> Chuyển tiền</button>
            <button onClick={() => setModal("buy")} className="rounded-xl bg-[#111111] px-3.5 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline size-3.5" /> Mua</button>
            <button onClick={() => setModal("sell")} className="rounded-xl bg-[#B22222] px-3.5 py-2 text-xs font-semibold text-white">B�n</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-black/[0.07] bg-white p-4">
                <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase text-[#A3A3A3]">{item.label}</span><Icon className="size-3.5 text-[#D4D4D4]" /></div>
                <p className={cn("text-lg font-semibold", item.color)}>{item.value}</p>
                <p className="mt-1 text-[10px] text-[#A3A3A3]">{item.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white xl:col-span-2">
            <div className="border-b border-black/[0.05] px-6 py-4">
              <p className="text-xs font-semibold uppercase text-[#A3A3A3]">Đang nắm giữ</p>
              <p className="font-semibold text-[#111111]">Danh s�ch khoản đầu tư</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/[0.05] bg-[#FAFAFA]">
                    {["M�", "T�n", "Loại", "Số lượng", "Vốn c�n lại", "Gi� vốn b�nh qu�n", "L�i/lỗ đ� chốt", "Trạng th�i"].map((header) => <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase text-[#A3A3A3]">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {active.map((holding) => (
                    <tr key={holding.id} onClick={() => setSelectedId(holding.id)} className="cursor-pointer border-b border-black/[0.04] hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-semibold">{holding.code}</td>
                      <td className="px-4 py-3 text-sm">{holding.name}</td>
                      <td className="px-4 py-3 text-sm">{holding.type}</td>
                      <td className="px-4 py-3 text-sm">{holding.quantity}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatMoney(holding.remainingCapital)}</td>
                      <td className="px-4 py-3 text-sm">{formatMoney(holding.avgCost)}</td>
                      <td className={cn("px-4 py-3 text-sm font-semibold", holding.realizedPL >= 0 ? "text-[#166534]" : "text-[#B22222]")}>{holding.sellHistory.length ? formatMoney(holding.realizedPL) : "Chưa b�n"}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-[#DCFCE7] px-2 py-1 text-[10px] font-semibold text-[#166534]">Đang nắm giữ</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {current && (
            <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
              <p className="text-xs font-semibold uppercase text-[#A3A3A3]">Chi tiết m� đầu tư</p>
              <h2 className="mt-1 text-xl font-semibold text-[#111111]">{current.code} � {current.name}</h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[["Số lượng", current.quantity.toLocaleString("vi-VN")], ["Tổng vốn c�n lại", formatMoney(current.remainingCapital)], ["Gi� vốn b�nh qu�n", formatMoney(current.avgCost)], ["L�i/lỗ đ� chốt", formatMoney(current.realizedPL)]].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#F8F6F3] p-3">
                    <p className="text-[10px] font-semibold uppercase text-[#666666]">{label}</p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mb-2 mt-5 text-sm font-semibold text-[#111111]">Lịch sử b�n</p>
              {current.sellHistory.length ? current.sellHistory.map((sale, index) => (
                <div key={`${sale.date}-${index}`} className="mb-2 rounded-xl bg-[#F8F6F3] p-3">
                  <div className="flex justify-between gap-3"><p className="font-semibold">{sale.quantity} � {formatMoney(sale.price)}</p><span className="rounded-full bg-white px-2 py-1 text-xs">{sale.note}</span></div>
                  <p className="mt-1 text-xs text-[#666666]">{sale.date} � L�i/lỗ {formatMoney(sale.realizedPL)}</p>
                </div>
              )) : <p className="text-xs text-[#A3A3A3]">Chưa c� lịch sử b�n.</p>}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
          <p className="text-xs font-semibold uppercase text-[#A3A3A3]">Đ� b�n</p>
          <p className="mb-3 font-semibold text-[#111111]">Lịch sử khoản đầu tư đ� b�n</p>
          {sold.length ? sold.map((holding) => (
            <div key={holding.id} className="mb-2 rounded-xl bg-[#F5F5F5] p-3 opacity-70">
              <div className="flex justify-between gap-3"><p className="font-semibold">{holding.code} � {holding.name}</p><p className={cn("font-semibold", holding.realizedPL >= 0 ? "text-[#166534]" : "text-[#B22222]")}>{formatMoney(holding.realizedPL)}</p></div>
              <p className="mt-1 text-xs text-[#666666]">{holding.sellHistory.map((sale) => sale.note).join(", ") || "Đ� b�n"}</p>
            </div>
          )) : <p className="text-xs text-[#A3A3A3]">Chưa c� khoản đ� b�n.</p>}
        </div>
      </div>

      <AnimatePresence>
        {modal === "transfer" && <TransferModal cash={cash} onClose={() => setModal(null)} onConfirm={transferOut} />}
        {modal === "buy" && <BuyModal cash={cash} onClose={() => setModal(null)} onConfirm={buyInvestment} />}
        {modal === "sell" && <SellModal holdings={active} onClose={() => setModal(null)} onContinue={(sale) => { setPendingSale(sale); setModal("proceeds"); }} />}
        {modal === "proceeds" && pendingSale && <ProceedsModal sale={pendingSale} onClose={() => { setPendingSale(null); setModal(null); }} onConfirm={confirmSale} />}
      </AnimatePresence>
    </div>
  );
}

export default InvestmentPage;
