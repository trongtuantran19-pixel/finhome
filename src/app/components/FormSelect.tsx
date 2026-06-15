import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "./ui/utils";

export type FormSelectOption = {
  value: string;
  label: string;
  sub?: string;
  right?: string;
  icon?: ReactNode;
};

export function FormSelect({
  title,
  value,
  options,
  onChange,
  placeholder = "Chọn",
  disabled = false,
}: {
  title: string;
  value: string;
  options: FormSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
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

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-2.5 text-left transition",
          open ? "border-[#B22222] shadow-[0_0_0_4px_rgba(178,34,34,0.08)]" : "border-black/[0.08] hover:border-black/[0.16]",
          disabled && "cursor-not-allowed bg-[#F7F7F7] opacity-70",
        )}
      >
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
        {open && !disabled && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/25 sm:hidden" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-x-0 bottom-0 z-[90] max-h-[72vh] overflow-hidden rounded-t-[28px] border border-[#EFEFEF] bg-white p-5 shadow-2xl sm:absolute sm:bottom-auto sm:left-0 sm:right-auto sm:top-[calc(100%+8px)] sm:z-50 sm:w-full sm:min-w-[320px] sm:rounded-2xl sm:p-2"
            >
              <div className="mb-4 flex items-center justify-between sm:hidden">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">FinHome</p>
                  <h3 className="mt-1 text-lg font-semibold text-[#111111]">{title}</h3>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="flex size-10 items-center justify-center rounded-full bg-[#F5F5F5] text-[#666666]">
                  <X className="size-4" />
                </button>
              </div>
              <div className="max-h-[52vh] space-y-1 overflow-y-auto pr-1">
                {options.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={cn("flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#F7F7F7]", active && "bg-[#FDECEC]")}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {option.icon && <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5]", active ? "text-[#B22222]" : "text-[#666666]")}>{option.icon}</span>}
                        <span className="min-w-0">
                          <span className={cn("block truncate text-sm font-semibold", active ? "text-[#B22222]" : "text-[#111111]")}>{option.label}</span>
                          {option.sub && <span className="mt-0.5 block truncate text-xs font-medium text-[#A3A3A3]">{option.sub}</span>}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {option.right && <span className={cn("text-xs font-semibold", active ? "text-[#B22222]" : "text-[#111111]")}>{option.right}</span>}
                        {active && <Check className="size-4 text-[#B22222]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
