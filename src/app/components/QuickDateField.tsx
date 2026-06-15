import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "./ui/utils";

export function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function parseISODate(value: string) {
  const [year, month, day] = (value || todayISO()).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return day + "/" + month + "/" + year;
}

function monthLabel(month: number, year: number) {
  return "Th\u00E1ng " + (month + 1) + " " + year;
}

function CalendarSheet({ value, label, onChange, onClose }: { value: string; label: string; onChange: (value: string) => void; onClose: () => void }) {
  const selected = parseISODate(value || todayISO());
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [draft, setDraft] = useState(value || todayISO());
  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const cells = Array.from({ length: offset + daysInMonth }, (_, index) => index < offset ? null : index - offset + 1);
  const today = todayISO();

  function moveMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 backdrop-blur-sm" onClick={onClose}>
    <motion.div initial={{ y: 360, opacity: 0.9 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 360, opacity: 0 }} transition={{ type: "spring", bounce: 0.14, duration: 0.36 }} className="w-full max-w-md rounded-t-[28px] bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
      <div className="mx-auto mb-4 h-1 w-14 rounded-full bg-[#D4D4D4]" />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A3A3A3]">{label}</p><h3 className="mt-1 text-xl font-semibold text-[#111111]">{"Ch\u1ECDn ng\u00E0y giao d\u1ECBch"}</h3></div>
        <button type="button" onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#666666]"><X className="size-4" /></button>
      </div>
      <div className="rounded-[24px] border border-black/[0.06] bg-white p-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => moveMonth(-1)} className="flex size-12 items-center justify-center rounded-full bg-[#F7F7F7] text-[#111111] shadow-sm"><ChevronLeft className="size-5" /></button>
          <p className="text-base font-semibold text-[#111111]">{monthLabel(viewMonth, viewYear)}</p>
          <button type="button" onClick={() => moveMonth(1)} className="flex size-12 items-center justify-center rounded-full bg-[#F7F7F7] text-[#111111] shadow-sm"><ChevronRight className="size-5" /></button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#8C8C8C]">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <div key={day} className="py-3">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-2 text-center">
          {cells.map((day, index) => {
            const iso = day ? toISODate(new Date(viewYear, viewMonth, day)) : "";
            const active = iso === draft;
            return <button key={(day ?? "empty") + "-" + index} type="button" disabled={!day} onClick={() => setDraft(iso)} className={cn("mx-auto flex size-11 items-center justify-center rounded-full text-base font-semibold transition", !day && "invisible", active ? "bg-[#B22222] text-white shadow-[0_12px_24px_rgba(178,34,34,0.28)]" : "text-[#111111] hover:bg-[#F7F7F7]")}>{day}</button>;
          })}
        </div>
      </div>
      <button type="button" onClick={() => setDraft(today)} className={cn("mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-black/[0.06] text-sm font-semibold shadow-sm", draft === today ? "bg-[#FDECEC] text-[#B22222]" : "bg-white text-[#111111]")}><CalendarDays className="size-4 text-[#B22222]" /> {"H\u00F4m nay"}</button>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/[0.06] pt-4"><button type="button" onClick={onClose} className="h-12 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111111]">{"H\u1EE7y"}</button><button type="button" onClick={() => { onChange(draft); onClose(); }} className="h-12 rounded-2xl bg-[#B22222] text-sm font-semibold text-white shadow-lg shadow-[#B22222]/20">{"X\u00E1c nh\u1EADn"}</button></div>
    </motion.div>
  </motion.div>;
}

export function QuickDateField({ label = "Ng\u00E0y giao d\u1ECBch", value, onChange, className, variant = "field" }: { label?: string; value: string; onChange: (value: string) => void; className?: string; variant?: "field" | "chip" }) {
  const [open, setOpen] = useState(false);
  const display = value === todayISO() ? "H\u00F4m nay" : formatDate(value);

  return <>
    {variant === "chip" ? <button type="button" onClick={() => setOpen(true)} className={cn("inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 text-sm font-semibold text-[#111111] shadow-sm transition hover:border-black/[0.16] focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)] focus:outline-none", className)}><CalendarDays className="size-4 text-[#B22222]" /> {display}</button> : <button type="button" onClick={() => setOpen(true)} className={cn("flex h-14 w-full items-center justify-between rounded-2xl border border-black/[0.08] bg-white px-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition hover:border-black/[0.16] focus:border-[#B22222] focus:shadow-[0_0_0_4px_rgba(178,34,34,0.08)] focus:outline-none", className)}>
      <span><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#737373]">{label}</span><span className="mt-0.5 block text-sm font-semibold text-[#111111] tabular-nums">{display}</span></span>
      <span className="flex size-10 items-center justify-center rounded-xl bg-[#F8F5F0] text-[#B22222]"><CalendarDays className="size-4" /></span>
    </button>}
    <AnimatePresence>{open && <CalendarSheet value={value} label={label} onChange={onChange} onClose={() => setOpen(false)} />}</AnimatePresence>
  </>;
}
