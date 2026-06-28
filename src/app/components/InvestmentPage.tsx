import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRightLeft, BarChart2, DollarSign, Plus, SlidersHorizontal, TrendingUp, X } from "lucide-react";
import { cn } from "./ui/utils";
import { WorkspaceTimeFilter, createDefaultWorkspaceTimeRange, isDateInWorkspaceRange, type WorkspaceTimeRange } from "./WorkspaceTimeFilter";
import { QuickDateField, todayISO } from "./QuickDateField";
import { WorkspaceTransactionHistory } from "./WorkspaceTransactionHistory";
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

type ModalKind = "transfer" | "buy" | "sell" | "adjust" | "proceeds" | null;
type PendingSale = {
  holdingId: string;
  quantity: number;
  price: number;
  fee: number;
  date: string;
  proceeds: number;
  capitalSold: number;
  realizedPL: number;
  note: "Bán một phần" | "Bán toàn bộ";
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
    type: item.type ?? "Khác",
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">Không gian đầu tư</p>
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
    <Modal title="Chuyển tiền từ Đầu tư" sub="Chỉ chuyển từ Tiền mặt đầu tư sang tài khoản cá nhân." onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#F8F6F3] p-4">
          <p className="text-xs text-[#666666]">Nguồn tiền</p>
          <p className="mt-1 font-semibold text-[#111111]">Tiền mặt đầu tư · {formatMoney(cash)}</p>
        </div>
        <Field label="Đến tài khoản">
          <FormSelect title="Chọn tài khoản nhận" value={accountId} onChange={setAccountId} options={accounts.map((account) => ({ value: account.id, label: account.name, sub: `Cá nhân · ${formatMoney(account.balance)}` }))} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Số tiền"><input className={inputClass} value={amount} inputMode="numeric" onChange={(event) => setAmount(event.target.value)} /></Field>
          <QuickDateField value={date} onChange={setDate} />
        </div>
        <Field label="Ghi chú"><textarea className={cn(inputClass, "min-h-20")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú" /></Field>
        <p className={cn("rounded-2xl px-4 py-3 text-sm", value > cash ? "bg-[#FEF2F2] text-[#B22222]" : "bg-[#F8F6F3] text-[#666666]")}>
          {value > cash ? "Số tiền chuyển không được lớn hơn tiền mặt đầu tư." : `Tiền mặt đầu tư giảm ${formatMoney(value)}; ${target?.name ?? "tài khoản nhận"} tăng ${formatMoney(value)}. Không tênh thu nhập/chi tiêu.`}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-2xl border border-black/[0.12] py-3 font-semibold">Hủy</button>
          <button disabled={!canSave} onClick={() => { onConfirm(value, accountId, date, note); onClose(); }} className="rounded-2xl bg-[#B22222] py-3 font-semibold text-white disabled:bg-[#D4D4D4]">Xác nhận</button>
        </div>
      </div>
    </Modal>
  );
}

function BuyModal({ cash, holdings, onClose, onConfirm }: { cash: number; holdings: InvestmentHolding[]; onClose: () => void; onConfirm: (payload: { mode: "new" | "add"; holdingId?: string; code: string; name: string; type: string; quantity: number; price: number; fee: number; date: string }) => void }) {
  const [mode, setMode] = useState<"new" | "add">("new");
  const [holdingId, setHoldingId] = useState(holdings[0]?.id ?? "");
  const selectedHolding = holdings.find((item) => item.id === holdingId);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("Cổ phiếu");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("0");
  const [fee, setFee] = useState("0");
  const [date, setDate] = useState(todayISO());
  const qty = Number(quantity) || 0;
  const unitPrice = parseMoney(price);
  const feeValue = parseMoney(fee);
  const total = qty * unitPrice + feeValue;
  const normalizedCode = (mode === "add" ? selectedHolding?.code : code).trim().toUpperCase();
  const duplicate = mode === "new" && holdings.some((item) => item.status === "holding" && item.code.toUpperCase() === normalizedCode);
  const hasProduct = mode === "add" ? Boolean(selectedHolding) : normalizedCode.length > 0 && name.trim().length > 0;
  const canSave = hasProduct && !duplicate && qty > 0 && unitPrice > 0 && total <= cash;

  return (
    <Modal title="Mua khoản đầu tư" sub="Mua tài sản không được tính là chi tiêu cá nhân." onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 rounded-2xl bg-[#F5F5F5] p-1">
          <button type="button" onClick={() => setMode("new")} className={cn("rounded-xl px-4 py-2.5 text-sm font-semibold transition", mode === "new" ? "bg-white text-[#111111] shadow-sm" : "text-[#737373]")}>Mua mới</button>
          <button type="button" onClick={() => setMode("add")} className={cn("rounded-xl px-4 py-2.5 text-sm font-semibold transition", mode === "add" ? "bg-white text-[#111111] shadow-sm" : "text-[#737373]")}>Mua thêm</button>
        </div>

        {mode === "add" ? <>
          <Field label="Khoản đầu tư đang nắm giữ"><FormSelect title="Chọn khoản đầu tư" value={holdingId} onChange={setHoldingId} options={holdings.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}`, sub: `${item.quantity} đơn vị · giá vốn ${formatMoney(item.avgCost)}` }))} /></Field>
          {selectedHolding && <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F8F6F3] p-4"><div><p className="text-[10px] font-semibold uppercase text-[#A3A3A3]">Số lượng hiện có</p><p className="mt-1 font-semibold">{selectedHolding.quantity}</p></div><div><p className="text-[10px] font-semibold uppercase text-[#A3A3A3]">Vốn hiện tại</p><p className="mt-1 font-semibold">{formatMoney(selectedHolding.remainingCapital)}</p></div></div>}
        </> : <>
          <div className="grid grid-cols-2 gap-3"><Field label="Mã đầu tư"><input className={inputClass} value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ví dụ: FPT" /></Field><Field label="Loại tài sản"><input className={inputClass} value={assetType} onChange={(event) => setAssetType(event.target.value)} /></Field></div>
          <Field label="Tên khoản đầu tư"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Cổ phiếu FPT" /></Field>
          {duplicate && <p className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B22222]">Mã này đang tồn tại. Hãy chọn “Mua thêm” để cập nhật khoản đang nắm giữ.</p>}
        </>}

        <div className="grid grid-cols-2 gap-3"><Field label="Số lượng"><input className={inputClass} value={quantity} inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} /></Field><Field label="Giá mua / đơn vị"><input className={inputClass} value={price} inputMode="numeric" onChange={(event) => setPrice(event.target.value)} /></Field></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Phí mua"><input className={inputClass} value={fee} inputMode="numeric" onChange={(event) => setFee(event.target.value)} /></Field><QuickDateField value={date} onChange={setDate} /></div>
        <p className={cn("rounded-2xl px-4 py-3 text-sm", total > cash ? "bg-[#FEF2F2] text-[#B22222]" : "bg-[#F8F6F3] text-[#666666]")}>{total > cash ? "Tiền mặt đầu tư không đủ để mua." : `Tiền mặt đầu tư giảm ${formatMoney(total)}. ${mode === "add" ? "Số lượng và giá vốn bình quân sẽ được cập nhật." : "Một khoản đầu tư mới sẽ được tạo."}`}</p>
        <button disabled={!canSave} onClick={() => { const item = selectedHolding; onConfirm({ mode, holdingId: mode === "add" ? holdingId : undefined, code: mode === "add" ? item?.code ?? "" : normalizedCode, name: mode === "add" ? item?.name ?? "" : name.trim(), type: mode === "add" ? item?.type ?? "Khác" : assetType.trim() || "Khác", quantity: qty, price: unitPrice, fee: feeValue, date }); onClose(); }} className="w-full rounded-2xl bg-[#111111] py-3 font-semibold text-white disabled:bg-[#D4D4D4]">{mode === "add" ? "Xác nhận mua thêm" : "Xác nhận mua mới"}</button>
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
    <Modal title="Bán khoản đầu tư" sub="Chỉ lúc bán mới ghi nhận lãi/lỗ đã chốt." onClose={onClose}>
      <div className="space-y-4">
        <Field label="Khoản đầu tư">
          <FormSelect title="Chọn khoản đầu tư" value={holdingId} onChange={setHoldingId} options={holdings.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}`, sub: `Còn ${item.quantity}`, right: formatMoney(item.remainingCapital) }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số lượng bán"><input className={inputClass} value={quantity} inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} /></Field>
          <Field label="Giá bán / đơn vị"><input className={inputClass} value={price} inputMode="numeric" onChange={(event) => setPrice(event.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Phí bán"><input className={inputClass} value={fee} inputMode="numeric" onChange={(event) => setFee(event.target.value)} /></Field>
          <QuickDateField value={date} onChange={setDate} />
        </div>
        <div className="rounded-2xl bg-[#F8F6F3] p-4 text-sm text-[#666666]">
          <p>Tiền bán: <b>{formatMoney(proceeds)}</b></p>
          <p>Vốn bán ra: <b>{formatMoney(capitalSold)}</b></p>
          <p>Lãi/lỗ đã chốt: <b className={realizedPL >= 0 ? "text-[#166534]" : "text-[#B22222]"}>{formatMoney(realizedPL)}</b></p>
        </div>
        <button disabled={!canContinue} onClick={() => { if (!holding) return; onContinue({ holdingId, quantity: qty, price: unitPrice, fee: feeValue, date, proceeds, capitalSold, realizedPL, note: qty === holding.quantity ? "Bán toàn bộ" : "Bán một phần" }); }} className="w-full rounded-2xl bg-[#B22222] py-3 font-semibold text-white disabled:bg-[#D4D4D4]">Tiếp tục</button>
      </div>
    </Modal>
  );
}


function AdjustInvestmentModal({
  holdings,
  current,
  onClose,
  onConfirm,
}: {
  holdings: InvestmentHolding[];
  current?: InvestmentHolding;
  onClose: () => void;
  onConfirm: (payload: { holdingId: string; quantity: number; remainingCapital: number; realizedPL: number; date: string; note: string }) => void;
}) {
  const [holdingId, setHoldingId] = useState(current?.id ?? holdings[0]?.id ?? "");
  const selected = holdings.find((item) => item.id === holdingId);
  const [quantity, setQuantity] = useState(String(selected?.quantity ?? 0));
  const [remainingCapital, setRemainingCapital] = useState(String(Math.round(selected?.remainingCapital ?? 0)));
  const [realizedPL, setRealizedPL] = useState(String(Math.round(selected?.realizedPL ?? 0)));
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  function selectHolding(nextId: string) {
    const next = holdings.find((item) => item.id === nextId);
    setHoldingId(nextId);
    setQuantity(String(next?.quantity ?? 0));
    setRemainingCapital(String(Math.round(next?.remainingCapital ?? 0)));
    setRealizedPL(String(Math.round(next?.realizedPL ?? 0)));
  }

  const qty = Number(quantity) || 0;
  const capital = parseMoney(remainingCapital);
  const realized = Number(realizedPL.replace(/[^0-9-]/g, "")) || 0;
  const avgCost = qty > 0 ? capital / qty : 0;
  const canSave = Boolean(selected) && qty >= 0 && capital >= 0;

  return (
    <Modal title="Điều chỉnh khoản đầu tư" sub="Dùng khi nhập sai số lượng, vốn còn lại hoặc lãi/lỗ đã chốt. Không làm thay đổi tiền mặt đầu tư." onClose={onClose}>
      <div className="space-y-4">
        <Field label="Khoản đầu tư">
          <FormSelect
            title="Chọn khoản đầu tư cần điều chỉnh"
            value={holdingId}
            onChange={selectHolding}
            options={holdings.map((item) => ({
              value: item.id,
              label: `${item.code} · ${item.name}`,
              sub: `${item.status === "holding" ? "Đang nắm giữ" : "Đã bán/đã đóng"} · ${formatMoney(item.remainingCapital)}`,
            }))}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Số lượng thực tế">
            <input className={inputClass} value={quantity} inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} />
          </Field>
          <Field label="Tổng vốn còn lại thực tế">
            <input className={inputClass} value={remainingCapital} inputMode="numeric" onChange={(event) => setRemainingCapital(event.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Lãi/lỗ đã chốt thực tế">
            <input className={inputClass} value={realizedPL} inputMode="numeric" onChange={(event) => setRealizedPL(event.target.value)} />
          </Field>
          <QuickDateField value={date} onChange={setDate} />
        </div>

        <div className="rounded-2xl bg-[#F8F6F3] p-4 text-sm text-[#666666]">
          <div className="flex justify-between gap-3"><span>Giá vốn bình quân sau điều chỉnh</span><b className="text-[#111111]">{formatMoney(avgCost)}</b></div>
          <p className="mt-2">Điều chỉnh chỉ sửa số liệu khoản đầu tư. Nếu cần sửa tiền mặt đầu tư, hãy dùng luồng chuyển tiền hoặc giao dịch tương ứng.</p>
        </div>

        <Field label="Ghi chú">
          <textarea className={cn(inputClass, "min-h-20")} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-2xl border border-black/[0.12] py-3 font-semibold">Hủy</button>
          <button
            disabled={!canSave}
            onClick={() => { onConfirm({ holdingId, quantity: qty, remainingCapital: capital, realizedPL: realized, date, note }); onClose(); }}
            className="rounded-2xl bg-[#B22222] py-3 font-semibold text-white disabled:bg-[#D4D4D4]"
          >
            Lưu điều chỉnh
          </button>
        </div>
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
    <Modal title="Xử lý tiền bán" sub="Chuyển về cá nhân không ghi nhận thu nhập lần hai." onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#111111] p-5 text-white">
          <div className="flex justify-between text-sm"><span>Số tiền bán</span><b>{formatMoney(sale.proceeds)}</b></div>
          <div className="mt-2 flex justify-between text-sm"><span>Vốn mua đã bán</span><b>{formatMoney(sale.capitalSold)}</b></div>
          <div className="mt-2 flex justify-between text-sm"><span>Lãi/lỗ đã chốt</span><b className={sale.realizedPL >= 0 ? "text-[#86EFAC]" : "text-[#FCA5A5]"}>{formatMoney(sale.realizedPL)}</b></div>
        </div>
        <button onClick={() => setMode("keep")} className={cn("w-full rounded-2xl border p-4 text-left", mode === "keep" ? "border-[#B22222] bg-[#FDECEC]" : "border-black/[0.1]")}>
          <p className="font-semibold text-[#111111]">Giữ lại trong Đầu tư</p>
          <p className="mt-1 text-xs text-[#666666]">Toàn bộ tiền bán cộng vào tiền mặt đầu tư.</p>
        </button>
        <button onClick={() => setMode("transfer")} className={cn("w-full rounded-2xl border p-4 text-left", mode === "transfer" ? "border-[#B22222] bg-[#FDECEC]" : "border-black/[0.1]")}>
          <p className="font-semibold text-[#111111]">Chuyển một phần về Cá nhân</p>
          <p className="mt-1 text-xs text-[#666666]">Phần còn lại tự động giữ trong Đầu tư.</p>
        </button>
        {mode === "transfer" && (
          <>
            <Field label="Tài khoản cá nhân nhận tiền">
              <FormSelect title="Chọn tài khoản nhận" value={accountId} onChange={setAccountId} options={accounts.map((account) => ({ value: account.id, label: account.name, sub: `Cá nhân · ${formatMoney(account.balance)}` }))} />
            </Field>
            <Field label="Số tiền chuyển về Cá nhân"><input className={inputClass} value={amount} inputMode="numeric" onChange={(event) => setAmount(event.target.value)} /></Field>
          </>
        )}
        <p className={cn("rounded-2xl px-4 py-3 text-sm", transferValue > sale.proceeds ? "bg-[#FEF2F2] text-[#B22222]" : "bg-[#F8F6F3] text-[#666666]")}>
          {transferValue > sale.proceeds ? "Số tiền chuyển về cá nhân không được lớn hơn tiền bán." : `Cá nhân tăng ${formatMoney(transferValue)}; tiền mặt đầu tư tăng ${formatMoney(remaining)}.`}
        </p>
        <button disabled={!canSave} onClick={() => { onConfirm(transferValue, accountId); onClose(); }} className="w-full rounded-2xl bg-[#B22222] py-3 font-semibold text-white disabled:bg-[#D4D4D4]">Xác nhận</button>
      </div>
    </Modal>
  );
}

export function InvestmentPage() {
  const [timeRange, setTimeRange] = useState<WorkspaceTimeRange>(createDefaultWorkspaceTimeRange);
  const storedInvestmentTransactions = readStoredJson<CashflowTransaction[]>(finhomeStorageKeys.personalTransactions, []).filter((tx) => tx.space === "Đầu tư" || tx.id.startsWith("invest-") || ["investment_buy", "investment_sell"].includes(tx.kind));
  const [cash, setCash] = useState(loadCash);
  const [holdings, setHoldings] = useState(loadHoldings);
  const holdingTransactions: CashflowTransaction[] = holdings.flatMap((holding) => [
    ...holding.buyHistory.map((buy, index) => ({
      id: `holding-${holding.id}-buy-${index}`,
      date: buy.date,
      name: `Mua ${holding.code}`,
      space: "Đầu tư",
      source: "Tiền mặt đầu tư",
      amount: buy.quantity * buy.price + buy.fee,
      kind: "investment_buy" as const,
      status: "active" as const,
      note: `${buy.quantity} × ${formatMoney(buy.price)} · phí ${formatMoney(buy.fee)}`,
      details: {
        code: holding.code,
        holdingName: holding.name,
        quantity: buy.quantity,
        price: buy.price,
        gross: buy.quantity * buy.price,
        fee: buy.fee,
        total: buy.quantity * buy.price + buy.fee,
      },
      countsAsIncome: false,
      countsAsExpense: false,
    })),
    ...holding.sellHistory.map((sale, index) => ({
      id: `holding-${holding.id}-sell-${index}`,
      date: sale.date,
      name: `Bán ${holding.code}`,
      space: "Đầu tư",
      source: holding.name,
      amount: sale.quantity * sale.price - sale.fee,
      kind: "investment_sell" as const,
      status: "active" as const,
      note: `${sale.note} · lãi/lỗ đã chốt ${formatMoney(sale.realizedPL)}`,
      details: {
        code: holding.code,
        holdingName: holding.name,
        saleNote: sale.note,
        quantity: sale.quantity,
        price: sale.price,
        gross: sale.quantity * sale.price,
        fee: sale.fee,
        proceeds: sale.quantity * sale.price - sale.fee,
        realizedPL: sale.realizedPL,
      },
      countsAsIncome: sale.realizedPL > 0,
      countsAsExpense: false,
    })),
  ]);
  function investmentTransactionCode(tx: CashflowTransaction) {
    const detailCode = typeof tx.details?.code === "string" ? tx.details.code : "";
    if (detailCode) return detailCode.trim().toUpperCase();
    return tx.name.replace(/^Mua mới\s+|^Mua thêm\s+|^Mua\s+|^Bán\s+/i, "").trim().toUpperCase();
  }

  function investmentTransactionSignature(tx: CashflowTransaction) {
    return [tx.kind, tx.date, investmentTransactionCode(tx), Math.round(tx.amount)].join("|");
  }

  const holdingTransactionBySignature = new Map(holdingTransactions.map((tx) => [investmentTransactionSignature(tx), tx]));
  const storedInvestmentSignatures = new Set(storedInvestmentTransactions.map(investmentTransactionSignature));
  const normalizedStoredInvestmentTransactions = storedInvestmentTransactions.map((tx) => {
    const holdingTx = holdingTransactionBySignature.get(investmentTransactionSignature(tx));
    if (!holdingTx) return tx;
    return {
      ...holdingTx,
      ...tx,
      note: tx.note || holdingTx.note,
      details: { ...(holdingTx.details ?? {}), ...(tx.details ?? {}) },
    };
  });
  const syntheticOnlyHoldingTransactions = holdingTransactions.filter((tx) => !storedInvestmentSignatures.has(investmentTransactionSignature(tx)));
  const investmentTransactions = [...normalizedStoredInvestmentTransactions, ...syntheticOnlyHoldingTransactions].filter((tx, index, items) => items.findIndex((item) => item.id === tx.id) === index);
  const periodInvestmentTransactions = investmentTransactions.filter((tx) => isDateInWorkspaceRange(tx.date, timeRange));
  const [modal, setModal] = useState<ModalKind>(null);
  const [pendingSale, setPendingSale] = useState<PendingSale | null>(null);
  const [selectedId, setSelectedId] = useState(() => loadHoldings()[0]?.id ?? "");

  const active = holdings.filter((item) => item.status === "holding" && item.quantity > 0);
  const sold = holdings.filter((item) => item.status !== "holding" || item.quantity <= 0);
  const current = holdings.find((item) => item.id === selectedId) ?? active[0] ?? holdings[0];
  const investedCapital = active.reduce((sum, item) => sum + item.remainingCapital, 0);
  const periodSales = holdings.flatMap((item) => item.sellHistory).filter((sale) => isDateInWorkspaceRange(sale.date, timeRange));
  const realizedPL = periodSales.reduce((sum, sale) => sum + sale.realizedPL, 0);
  const financialIncome = periodSales.reduce((sum, sale) => sum + Math.max(0, sale.realizedPL), 0);

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
      note: note.trim() || "Chuyển tiền nội bộ, không tênh thu nhập hoặc chi tiêu",
    });
  }

  function buyInvestment(payload: { mode: "new" | "add"; holdingId?: string; code: string; name: string; type: string; quantity: number; price: number; fee: number; date: string }) {
    const total = payload.quantity * payload.price + payload.fee;
    if (total <= 0 || total > cash) return;
    const existing = payload.mode === "add" ? holdings.find((item) => item.id === payload.holdingId && item.status === "holding") : undefined;
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
      name: `${payload.mode === "add" ? "Mua thêm" : "Mua mới"} ${payload.code}`,
      space: "Đầu tư",
      source: "Tiền mặt đầu tư",
      amount: total,
      kind: "investment_buy",
      status: "active",
      note: "Mua đầu tư, không tính chi tiêu cá nhân",
      details: {
        action: payload.mode === "add" ? "Mua thêm" : "Mua mới",
        code: payload.code,
        holdingName: payload.name,
        assetType: payload.type,
        quantity: payload.quantity,
        price: payload.price,
        gross: payload.quantity * payload.price,
        fee: payload.fee,
        total,
      },
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
      name: `Bán ${holding.code}`,
      space: "Đầu tư",
      source: holding.name,
      amount: pendingSale.proceeds,
      kind: "investment_sell",
      status: "active",
      note: `${pendingSale.note}. Lãi/lỗ đã chốt ${formatMoney(pendingSale.realizedPL)}`,
      details: {
        code: holding.code,
        holdingName: holding.name,
        saleNote: pendingSale.note,
        quantity: pendingSale.quantity,
        price: pendingSale.price,
        gross: pendingSale.quantity * pendingSale.price,
        fee: pendingSale.fee,
        proceeds: pendingSale.proceeds,
        capitalSold: pendingSale.capitalSold,
        realizedPL: pendingSale.realizedPL,
        transferToPersonal,
        keptInInvestment: kept,
      },
      countsAsIncome: pendingSale.realizedPL > 0,
    });
    setPendingSale(null);
    setModal(null);
  }


  function openAdjustFromTransaction(transaction: CashflowTransaction) {
    const code = typeof transaction.details?.code === "string"
      ? transaction.details.code
      : transaction.name.replace(/^Mua mới\s+|^Mua thêm\s+|^Mua\s+|^Bán\s+/i, "").trim();
    const target = holdings.find((item) => item.code.toLowerCase() === code.toLowerCase() || item.name.toLowerCase() === String(transaction.details?.holdingName ?? "").toLowerCase());
    if (!target) return;
    setSelectedId(target.id);
    setModal("adjust");
  }

  function adjustInvestment(payload: { holdingId: string; quantity: number; remainingCapital: number; realizedPL: number; date: string; note: string }) {
    const holding = holdings.find((item) => item.id === payload.holdingId);
    if (!holding) return;
    const nextQuantity = Math.max(0, payload.quantity);
    const nextCapital = Math.max(0, payload.remainingCapital);
    const nextHoldings = holdings.map((item) => item.id === payload.holdingId ? {
      ...item,
      quantity: nextQuantity,
      remainingCapital: nextCapital,
      avgCost: nextQuantity > 0 ? nextCapital / nextQuantity : 0,
      realizedPL: payload.realizedPL,
      status: nextQuantity > 0 ? "holding" : "sold",
    } : item);
    persist(cash, nextHoldings);
    setSelectedId(payload.holdingId);
    appendPersonalTransaction({
      id: `invest-adjust-${Date.now()}`,
      date: payload.date,
      name: `Điều chỉnh ${holding.code}`,
      space: "Đầu tư",
      source: holding.name,
      amount: 0,
      kind: "adjustment",
      status: "active",
      note: payload.note.trim() || "Điều chỉnh số liệu khoản đầu tư, không làm thay đổi tiền mặt",
      details: {
        code: holding.code,
        holdingName: holding.name,
        quantity: nextQuantity,
        remainingCapital: nextCapital,
        realizedPL: payload.realizedPL,
      },
      countsAsIncome: false,
      countsAsExpense: false,
    });
  }

  const kpis = [
    { label: "Tiền mặt đầu tư", value: formatMoney(cash), sub: "Tiền riêng của không gian Đầu tư", icon: DollarSign, color: "text-[#111111]" },
    { label: "Tổng vốn đang đầu tư", value: formatMoney(investedCapital), sub: "Chỉ vốn còn nắm giữ", icon: BarChart2, color: "text-[#111111]" },
    { label: "Số khoản đang nắm giữ", value: String(active.length), sub: "Không gồm mã đã bán hết", icon: TrendingUp, color: "text-[#111111]" },
    { label: "Lãi/lỗ đã chốt", value: formatMoney(realizedPL), sub: "Chỉ ghi nhận khi bán", icon: TrendingUp, color: realizedPL >= 0 ? "text-[#166534]" : "text-[#B22222]" },
    { label: "Thu nhập tài chính", value: formatMoney(financialIncome), sub: "Lãi đầu tư đã chốt", icon: DollarSign, color: "text-[#166534]" },
  ];

  return (
    <div className="min-h-full bg-[#F9F9F9]">
      <div className="mx-auto max-w-[1440px] space-y-6 px-6 py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#A3A3A3]">Không gian tài chình độc lập</p>
            <h1 className="text-[1.9rem] font-semibold text-[#111111]">Đầu tư</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <WorkspaceTimeFilter onChange={setTimeRange} />
            <button onClick={() => setModal("transfer")} className="rounded-xl border border-black/[0.12] bg-white px-3.5 py-2 text-xs font-semibold text-[#111111]"><ArrowRightLeft className="mr-1 inline size-3.5" /> Chuyển tiền</button>
            <button onClick={() => setModal("buy")} className="rounded-xl bg-[#111111] px-3.5 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline size-3.5" /> Mua</button>
            <button onClick={() => setModal("sell")} className="rounded-xl bg-[#B22222] px-3.5 py-2 text-xs font-semibold text-white">Bán</button>
            <button onClick={() => setModal("adjust")} disabled={!holdings.length} className="rounded-xl border border-black/[0.12] bg-white px-3.5 py-2 text-xs font-semibold text-[#111111] disabled:opacity-50"><SlidersHorizontal className="mr-1 inline size-3.5" /> Điều chỉnh</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,0.56fr)_minmax(0,0.44fr)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {kpis.slice(0, 2).map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={cn("rounded-[28px] border border-black/[0.07] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.045)]", index === 0 ? "bg-[#111111] text-white" : "bg-white text-[#111111]")}>
                  <div className="mb-5 flex items-center justify-between"><span className={cn("text-[10px] font-semibold uppercase tracking-[0.1em]", index === 0 ? "text-white/55" : "text-[#A3A3A3]")}>{item.label}</span><Icon className={cn("size-4", index === 0 ? "text-white/30" : "text-[#D4D4D4]")} /></div>
                  <p className={cn("text-2xl font-semibold leading-tight sm:text-3xl", index === 0 ? "text-white" : item.color)}>{item.value}</p>
                  <p className={cn("mt-3 text-xs", index === 0 ? "text-white/58" : "text-[#737373]")}>{item.sub}</p>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {kpis.slice(2).map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-[22px] border border-black/[0.07] bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">{item.label}</span><Icon className="size-3.5 text-[#D4D4D4]" /></div>
                  <p className={cn("text-lg font-semibold leading-tight", item.color)}>{item.value}</p>
                  <p className="mt-2 hidden text-[10px] text-[#A3A3A3] sm:block">{item.sub}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.045)] xl:col-span-2">
            <div className="border-b border-black/[0.05] px-6 py-4">
              <p className="text-xs font-semibold uppercase text-[#A3A3A3]">Đang nắm giữ</p>
              <p className="font-semibold text-[#111111]">Danh sách khoản đầu tư</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/[0.05] bg-[#FAFAFA]">
                    {["Mã", "Tên", "Loại", "Số lượng", "Vốn còn lại", "Giá vốn bánh quân", "Lãi/lỗ đã chốt", "Trạng thái"].map((header) => <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase text-[#A3A3A3]">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {active.map((holding) => (
                    <tr key={holding.id} onClick={() => setSelectedId(holding.id)} className="h-16 cursor-pointer border-b border-black/[0.04] transition hover:bg-[#F8F6F3]">
                      <td className="px-4 py-3 font-semibold">{holding.code}</td>
                      <td className="px-4 py-3 text-sm">{holding.name}</td>
                      <td className="px-4 py-3 text-sm">{holding.type}</td>
                      <td className="px-4 py-3 text-sm">{holding.quantity}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatMoney(holding.remainingCapital)}</td>
                      <td className="px-4 py-3 text-sm">{formatMoney(holding.avgCost)}</td>
                      <td className={cn("px-4 py-3 text-sm font-semibold", holding.realizedPL >= 0 ? "text-[#166534]" : "text-[#B22222]")}>{holding.sellHistory.length ? formatMoney(holding.realizedPL) : "Chưa bán"}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-[#DCFCE7] px-2 py-1 text-[10px] font-semibold text-[#166534]">Đang nắm giữ</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {current && (
            <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
              <p className="text-xs font-semibold uppercase text-[#A3A3A3]">Chi tiết mã đầu tư</p>
              <h2 className="mt-1 text-xl font-semibold text-[#111111]">{current.code} · {current.name}</h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[["Số lượng", current.quantity.toLocaleString("vi-VN")], ["Tổng vốn còn lại", formatMoney(current.remainingCapital)], ["Giá vốn bánh quân", formatMoney(current.avgCost)], ["Lãi/lỗ đã chốt", formatMoney(current.realizedPL)]].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#F8F6F3] p-3">
                    <p className="text-[10px] font-semibold uppercase text-[#666666]">{label}</p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mb-2 mt-5 text-sm font-semibold text-[#111111]">Lịch sử bán</p>
              {current.sellHistory.length ? current.sellHistory.map((sale, index) => (
                <div key={`${sale.date}-${index}`} className="mb-2 rounded-xl bg-[#F8F6F3] p-3">
                  <div className="flex justify-between gap-3"><p className="font-semibold">{sale.quantity} · {formatMoney(sale.price)}</p><span className="rounded-full bg-white px-2 py-1 text-xs">{sale.note}</span></div>
                  <p className="mt-1 text-xs text-[#666666]">{sale.date} · Lãi/lỗ {formatMoney(sale.realizedPL)}</p>
                </div>
              )) : <p className="text-xs text-[#A3A3A3]">Chưa có lịch sử bán.</p>}
            </div>
          )}
        </div>

      </div>

      <WorkspaceTransactionHistory title="Lịch sử giao dịch Đầu tư" subtitle="Chuyển tiền, mua và bán tài sản đầu tư." transactions={periodInvestmentTransactions} onAdjustTransaction={openAdjustFromTransaction} />

      <AnimatePresence>
        {modal === "transfer" && <TransferModal cash={cash} onClose={() => setModal(null)} onConfirm={transferOut} />}
        {modal === "buy" && <BuyModal cash={cash} holdings={active} onClose={() => setModal(null)} onConfirm={buyInvestment} />}
        {modal === "sell" && <SellModal holdings={active} onClose={() => setModal(null)} onContinue={(sale) => { setPendingSale(sale); setModal("proceeds"); }} />}
        {modal === "adjust" && <AdjustInvestmentModal holdings={holdings} current={current} onClose={() => setModal(null)} onConfirm={adjustInvestment} />}
        {modal === "proceeds" && pendingSale && <ProceedsModal sale={pendingSale} onClose={() => { setPendingSale(null); setModal(null); }} onConfirm={confirmSale} />}
      </AnimatePresence>
    </div>
  );
}

export default InvestmentPage;
