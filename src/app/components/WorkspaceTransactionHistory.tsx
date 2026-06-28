import { useState } from "react";
import { ArrowRightLeft, FileText, MoreHorizontal } from "lucide-react";
import { formatMoney, type CashflowTransaction } from "../finhomeData";

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return String(value);
}

function asMoney(value: unknown) {
  return typeof value === "number" ? formatMoney(value) : asText(value);
}

function detailRows(tx: CashflowTransaction): Array<[string, string]> {
  const d = tx.details ?? {};
  const row = (label: string, value: unknown): [string, string] | null => {
    const text = asText(value);
    return text ? [label, text] : null;
  };
  const money = (label: string, value: unknown): [string, string] | null => {
    const text = asMoney(value);
    return text ? [label, text] : null;
  };

  if (tx.kind === "investment_buy") {
    return [
      row("Mã", d.code),
      row("Số lượng", d.quantity),
      money("Giá mua", d.price),
      money("Giá trị mua", d.gross),
      money("Phí mua", d.fee),
      money("Tổng trừ tiền mặt", d.total ?? tx.amount),
    ].filter(Boolean) as Array<[string, string]>;
  }

  if (tx.kind === "investment_sell") {
    return [
      row("Mã", d.code),
      row("Loại bán", d.saleNote),
      row("Số lượng bán", d.quantity),
      money("Giá bán", d.price),
      money("Tiền bán trước phí", d.gross),
      money("Phí bán", d.fee),
      money("Tiền nhận ròng", d.proceeds ?? tx.amount),
      money("Giá vốn phần bán", d.capitalSold),
      money("Lãi/lỗ đã chốt", d.realizedPL),
      money("Chuyển về cá nhân", d.transferToPersonal),
      money("Giữ lại đầu tư", d.keptInInvestment),
    ].filter(Boolean) as Array<[string, string]>;
  }

  if (tx.space === "Tiết kiệm" || tx.kind === "savings_interest") {
    return [
      row("Loại", d.savingsAction),
      row("Mục tiêu/Khoản gửi", d.savingName ?? d.goalName),
      row("Tài khoản nguồn", d.fromAccount),
      row("Tài khoản nhận", d.toAccount),
      money("Số tiền", d.amount ?? tx.amount),
      money("Số dư trước", d.before),
      money("Số dư sau", d.after),
      money("Gốc", d.principal),
      money("Lãi", d.interest),
      money("Tổng nhận", d.total),
      money("Mục tiêu", d.target),
      money("Cần góp/tháng", d.monthly),
      row("Lãi suất", d.annualRate ? `${d.annualRate}%/năm` : null),
      row("Kỳ hạn", d.termMonths ? `${d.termMonths} tháng` : null),
      money("Lãi dự kiến", d.expectedInterest),
      row("Ngày đáo hạn", d.maturity ? displayDate(String(d.maturity)) : null),
      row("Tất toán trước hạn", d.earlySettlement),
    ].filter(Boolean) as Array<[string, string]>;
  }

  if (tx.kind === "adjustment" && tx.space === "Đầu tư") {
    return [
      row("Mã", d.code),
      row("Số lượng sau chỉnh", d.quantity),
      money("Vốn còn lại sau chỉnh", d.remainingCapital),
      money("Lãi/lỗ đã chốt sau chỉnh", d.realizedPL),
    ].filter(Boolean) as Array<[string, string]>;
  }

  return [];
}

function amountColor(tx: CashflowTransaction) {
  if (tx.kind === "investment_buy" || tx.kind === "expense" || tx.countsAsExpense) return "text-[#B22222]";
  if (tx.kind === "investment_sell" || tx.countsAsIncome || tx.kind === "savings_interest") return "text-[#166534]";
  return "text-[#111111]";
}

export function WorkspaceTransactionHistory({ title, subtitle, transactions, onAdjustTransaction }: { title: string; subtitle: string; transactions: CashflowTransaction[]; onAdjustTransaction?: (transaction: CashflowTransaction) => void }) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const items = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  return <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
    <div className="flex items-center justify-between gap-4 border-b border-black/[0.05] px-5 py-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Lịch sử</p>
        <h2 className="text-base font-semibold text-[#111111]">{title}</h2>
        <p className="mt-0.5 text-xs text-[#737373]">{subtitle}</p>
      </div>
      <span className="shrink-0 rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-semibold text-[#666666]">{items.length} giao dịch</span>
    </div>
    {items.length ? <div className="max-h-[560px] divide-y divide-black/[0.04] overflow-y-auto">
      {items.map((tx) => {
        const rows = detailRows(tx);
        return <div key={tx.id} className="flex items-start gap-3 px-5 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5]"><ArrowRightLeft className="size-4 text-[#666666]" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111111]">{tx.name}</p>
                <p className="mt-0.5 truncate text-xs text-[#A3A3A3]">{displayDate(tx.date)} · {tx.source}</p>
              </div>
              <div className="relative flex shrink-0 items-start gap-2">
                <p className={`text-sm font-semibold tabular-nums ${amountColor(tx)}`}>{formatMoney(Math.abs(tx.amount))}</p>
                {onAdjustTransaction && <button type="button" aria-label={"T\u00f9y ch\u1ecdn giao d\u1ecbch"} onClick={() => setOpenMenuId(openMenuId === tx.id ? null : tx.id)} className="flex size-8 items-center justify-center rounded-full text-[#A3A3A3] transition-colors hover:bg-[#F5F5F5] hover:text-[#111111]"><MoreHorizontal className="size-4" /></button>}
                {onAdjustTransaction && openMenuId === tx.id && <div className="absolute right-0 top-8 z-20 w-48 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-1 shadow-[0_18px_45px_rgba(0,0,0,0.14)]">
                  <button type="button" onClick={() => { setOpenMenuId(null); onAdjustTransaction(tx); }} className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#111111] hover:bg-[#F9F6F1]">{"\u0110i\u1ec1u ch\u1ec9nh giao d\u1ecbch"}</button>
                </div>}
              </div>
            </div>
            {rows.length > 0 && <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map(([label, value]) => <div key={label} className="rounded-xl bg-[#F8F6F3] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">{label}</p>
                <p className="mt-0.5 text-xs font-semibold text-[#111111]">{value}</p>
              </div>)}
            </div>}
            {tx.note && <p className="mt-2 text-xs leading-relaxed text-[#666666]">{tx.note}</p>}
          </div>
        </div>;
      })}
    </div> : <div className="px-6 py-10 text-center"><FileText className="mx-auto size-8 text-[#D4D4D4]" /><p className="mt-2 text-sm font-semibold">Chưa có giao dịch</p></div>}
  </section>;
}
