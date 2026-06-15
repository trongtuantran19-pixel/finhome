import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Check, ChevronDown, X } from "lucide-react";
import { cn } from "./ui/utils";
import { QuickDateField } from "./QuickDateField";

type PeriodValue = "week" | "month" | "year" | "custom";

type WorkspaceTimeFilterProps = {
  className?: string;
  onChange?: (range: { period: PeriodValue; from: string; to: string }) => void;
};

const options: { value: PeriodValue; label: string }[] = [
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chỉnh" },
];

function toISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return toISO(new Date());
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function rangeFor(period: PeriodValue, customFrom: string, customTo: string) {
  const now = new Date();
  if (period === "week") return { from: toISO(startOfWeek(now)), to: todayISO() };
  if (period === "month") return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: todayISO() };
  if (period === "year") return { from: toISO(new Date(now.getFullYear(), 0, 1)), to: todayISO() };
  return { from: customFrom, to: customTo };
}

function displayDate(value: string) {
  if (!value) return "--/--/----";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function WorkspaceTimeFilter({ className, onChange }: WorkspaceTimeFilterProps) {
  const [period, setPeriod] = useState<PeriodValue>("month");
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [customFrom, setCustomFrom] = useState(toISO(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [customTo, setCustomTo] = useState(todayISO());
  const [draftFrom, setDraftFrom] = useState(customFrom);
  const [draftTo, setDraftTo] = useState(customTo);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((item) => item.value === period)?.label ?? "Tháng này";
  const range = useMemo(() => rangeFor(period, customFrom, customTo), [period, customFrom, customTo]);

  useEffect(() => {
    onChange?.({ period, ...range });
  }, [onChange, period, range.from, range.to]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const choose = (next: PeriodValue) => {
    if (next === "custom") {
      setDraftFrom(customFrom);
      setDraftTo(customTo);
      setPeriod("custom");
      return;
    }
    setPeriod(next);
    setOpen(false);
  };

  const applyCustom = () => {
    const from = draftFrom <= draftTo ? draftFrom : draftTo;
    const to = draftFrom <= draftTo ? draftTo : draftFrom;
    setCustomFrom(from);
    setCustomTo(to);
    setPeriod("custom");
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 min-w-[150px] items-center justify-between gap-3 rounded-full border border-[#E5E5E5] bg-white px-[18px] text-sm font-semibold text-[#111111] shadow-sm transition hover:bg-[#FAFAFA] focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)] focus:outline-none"
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={cn("size-4 text-[#666666] transition", open && "rotate-180 text-[#B22222]")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/20 sm:hidden" />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border border-[#EFEFEF] bg-white p-5 shadow-2xl sm:absolute sm:bottom-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[280px] sm:rounded-2xl sm:p-2"
            >
              <div className="mb-4 flex items-center justify-between sm:hidden">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">Khoảng thời gian</p>
                  <h3 className="mt-1 text-lg font-semibold text-[#111111]">Chọn phạm vi xem</h3>
                </div>
                <button onClick={() => setOpen(false)} className="flex size-10 items-center justify-center rounded-full bg-[#F5F5F5] text-[#666666]"><X className="size-4" /></button>
              </div>

              <div className="space-y-1">
                {options.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => choose(item.value)}
                    className={cn(
                      "flex h-12 w-full items-center justify-between rounded-xl px-4 text-left text-sm font-semibold transition hover:bg-[#F7F7F7] sm:h-11",
                      period === item.value ? "bg-[#FDECEC] text-[#B22222]" : "text-[#111111]"
                    )}
                  >
                    <span>{item.label}</span>
                    {period === item.value && <Check className="size-4" />}
                  </button>
                ))}
              </div>

              {period === "custom" && (
                <div className="mt-3 rounded-2xl bg-[#FAFAFA] p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <QuickDateField label="Từ ngày" value={draftFrom} onChange={setDraftFrom} />
                    <QuickDateField label="Đến ngày" value={draftTo} onChange={setDraftTo} />
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#737373]"><CalendarDays className="size-3.5 text-[#B22222]" /> {displayDate(draftFrom)} -&gt; {displayDate(draftTo)}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl border border-black/[0.1] text-sm font-semibold text-[#111111]">Hủy</button>
                    <button type="button" onClick={applyCustom} className="h-10 rounded-xl bg-[#B22222] text-sm font-semibold text-white">Áp dụng</button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
