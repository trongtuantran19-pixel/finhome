import { ArrowRightLeft, FileText } from "lucide-react";
import { formatMoney, type CashflowTransaction } from "../finhomeData";

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function WorkspaceTransactionHistory({ title, subtitle, transactions }: { title: string; subtitle: string; transactions: CashflowTransaction[] }) {
  const items = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  return <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
    <div className="flex items-center justify-between gap-4 border-b border-black/[0.05] px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Lịch sử</p><h2 className="text-base font-semibold text-[#111111]">{title}</h2><p className="mt-0.5 text-xs text-[#737373]">{subtitle}</p></div><span className="shrink-0 rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-semibold text-[#666666]">{items.length} giao dịch</span></div>
    {items.length ? <div className="max-h-[520px] divide-y divide-black/[0.04] overflow-y-auto">{items.map((tx) => <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5]"><ArrowRightLeft className="size-4 text-[#666666]" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#111111]">{tx.name}</p><p className="mt-0.5 truncate text-xs text-[#A3A3A3]">{displayDate(tx.date)} · {tx.source}</p>{tx.note && <p className="mt-1 truncate text-xs text-[#666666]">{tx.note}</p>}</div><p className="shrink-0 text-sm font-semibold tabular-nums text-[#111111]">{formatMoney(Math.abs(tx.amount))}</p></div>)}</div> : <div className="px-6 py-10 text-center"><FileText className="mx-auto size-8 text-[#D4D4D4]" /><p className="mt-2 text-sm font-semibold">Chưa có giao dịch</p></div>}
  </section>;
}
