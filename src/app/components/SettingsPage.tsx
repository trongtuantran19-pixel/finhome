import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, ChevronDown, ChevronRight, CreditCard, Database, Download, EyeOff, Globe, Layers3, Pencil, Plus, Shield, Trash2, Upload, User } from "lucide-react";
import { cn } from "./ui/utils";
import { FormSelect } from "./FormSelect";
import { transactionCategories, type TransactionCategory, type TransactionType } from "../finhomeData";
import { FINHOME_EMPTY_MODE_KEY, finhomeStorageKeys, notifyFinhomeDataChanged } from "../finhomeStorage";

type Section = "profile" | "categories" | "backup" | "notifications" | "security" | "preferences";
type CategoryModal = { mode: "addParent" | "addChild" | "edit"; category?: TransactionCategory; parent?: TransactionCategory } | null;

const transactionTypes: TransactionType[] = ["Thu nhập", "Chi tiêu", "Kinh doanh", "Đầu tư", "Tiết kiệm", "Khoản vay"];
const sections: { id: Section; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: "profile", label: "Hồ sơ", icon: User },
  { id: "categories", label: "Danh mục", icon: Layers3 },
  { id: "backup", label: "Dữ liệu", icon: Database },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "security", label: "Bảo mật", icon: Shield },
  { id: "preferences", label: "Tùy chọn", icon: Globe },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <button onClick={() => onChange(!checked)} className={cn("relative inline-flex h-[22px] w-10 items-center rounded-full transition-colors", checked ? "bg-[#B22222]" : "bg-[#D4D4D4]")}><motion.span animate={{ x: checked ? 20 : 2 }} transition={{ type: "spring", bounce: 0.3, duration: 0.3 }} className="inline-block h-4 w-4 rounded-full bg-white shadow" /></button>;
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]"><div className="border-b border-black/[0.05] px-6 py-5"><p className="text-base font-semibold text-[#111111]">{title}</p>{sub && <p className="mt-0.5 text-xs text-[#A3A3A3]">{sub}</p>}</div>{children}</div>;
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-4 last:border-0"><div><p className="text-sm font-medium text-[#111111]">{label}</p>{sub && <p className="mt-0.5 text-xs text-[#A3A3A3]">{sub}</p>}</div><div className="ml-6 shrink-0">{children}</div></div>;
}


const backupKeys = Object.values(finhomeStorageKeys);

type BackupFile = {
  appName?: string;
  version?: string;
  exportedAt?: string;
  data?: Record<string, unknown>;
};

function safeParseStorageValue(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function hasMeaningfulBackupData(data: Record<string, unknown>) {
  return Object.values(data).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return value.trim() !== "" && value !== "0" && value !== "[]";
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return false;
  });
}

function BackupPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotice = (type: "success" | "error", text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3200);
  };

  const collectBackupData = () => {
    const data: Record<string, unknown> = {};
    for (const key of backupKeys) {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) data[key] = safeParseStorageValue(raw);
    }
    return data;
  };

  const downloadBackup = () => {
    const data = collectBackupData();
    if (!hasMeaningfulBackupData(data)) {
      showNotice("error", "Chưa có dữ liệu để tải xuống.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      appName: "FinHome",
      version: "ver-1",
      exportedAt: new Date().toISOString(),
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finhome-backup-${today}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showNotice("success", "Đã tải dữ liệu FinHome xuống.");
  };

  const restoreBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile;
      if (parsed.appName !== "FinHome" || parsed.version !== "ver-1" || !parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
        showNotice("error", "File backup không hợp lệ.");
        return;
      }

      const allowedKeys = new Set(backupKeys);
      const entries = Object.entries(parsed.data).filter(([key]) => allowedKeys.has(key));
      if (entries.length === 0 || !hasMeaningfulBackupData(Object.fromEntries(entries))) {
        showNotice("error", "File backup không có dữ liệu FinHome hợp lệ.");
        return;
      }

      const confirmed = window.confirm("Dữ liệu hiện tại sẽ được thay thế bằng dữ liệu trong file backup. Bạn có chắc chắn không?");
      if (!confirmed) return;

      for (const key of backupKeys) window.localStorage.removeItem(key);
      window.localStorage.removeItem(FINHOME_EMPTY_MODE_KEY);

      for (const [key, value] of entries) {
        if (typeof value === "string") {
          window.localStorage.setItem(key, value);
        } else if (typeof value === "number" || typeof value === "boolean") {
          window.localStorage.setItem(key, String(value));
        } else {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      }

      notifyFinhomeDataChanged();
      showNotice("success", "Đã khôi phục dữ liệu FinHome.");
      window.setTimeout(() => window.location.reload(), 700);
    } catch {
      showNotice("error", "Không đọc được file backup.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearAllData = () => {
    const confirmed = window.confirm("Thao tác này sẽ xóa toàn bộ dữ liệu FinHome trên thiết bị này và không thể hoàn tác nếu chưa sao lưu.");
    if (!confirmed) return;

    for (const key of backupKeys) window.localStorage.removeItem(key);
    window.localStorage.setItem(FINHOME_EMPTY_MODE_KEY, "1");
    notifyFinhomeDataChanged();
    showNotice("success", "Đã xóa toàn bộ dữ liệu FinHome.");
    window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("empty", "1");
      window.location.href = url.toString();
    }, 700);
  };

  return <Panel title="Dữ liệu & Sao lưu" sub="Xuất, khôi phục hoặc xóa dữ liệu FinHome đang lưu trên thiết bị này">
    <div className="space-y-4 p-5">
      {notice && <div className={cn("rounded-2xl px-4 py-3 text-sm font-semibold", notice.type === "success" ? "bg-[#ECFDF3] text-[#147A3D]" : "bg-[#FEF2F2] text-[#B22222]")}>{notice.text}</div>}
      <div className="rounded-2xl bg-[#F9F6F1] p-4">
        <p className="text-sm font-semibold text-[#111111]">Backup ver-1</p>
        <p className="mt-1 text-xs leading-5 text-[#666666]">File backup chỉ gom các key FinHome đang có trong localStorage. Tải xuống không làm thay đổi dữ liệu hiện tại.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={downloadBackup} className="flex items-center justify-center gap-2 rounded-2xl bg-[#111111] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)]"><Download className="size-4" />Tải dữ liệu xuống</button>
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-2xl border border-black/[0.1] bg-white px-4 py-3.5 text-sm font-semibold text-[#111111]"><Upload className="size-4" />Nhập dữ liệu từ file</button>
        <button onClick={clearAllData} className="flex items-center justify-center gap-2 rounded-2xl border border-[#B22222]/20 bg-[#FEF2F2] px-4 py-3.5 text-sm font-semibold text-[#B22222]"><Trash2 className="size-4" />Xóa toàn bộ dữ liệu</button>
      </div>
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void restoreBackup(file); }} />
      <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Key đang sao lưu</p>
        <p className="mt-2 break-words text-xs leading-5 text-[#666666]">{backupKeys.join(", ")}</p>
      </div>
    </div>
  </Panel>;
}

function CategoryModalView({ modal, categories, activeType, onClose, onSave }: { modal: CategoryModal; categories: TransactionCategory[]; activeType: TransactionType; onClose: () => void; onSave: (category: TransactionCategory) => void }) {
  const editing = modal?.category;
  const parent = modal?.parent;
  const [name, setName] = useState(editing?.name ?? "");
  const [transactionType, setTransactionType] = useState<TransactionType>(editing?.transactionType ?? parent?.transactionType ?? activeType);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(editing?.parentCategoryId ?? parent?.id ?? null);
  const [icon, setIcon] = useState(editing?.icon ?? "Circle");
  const [color, setColor] = useState(editing?.color ?? "#B22222");
  const [note, setNote] = useState(editing?.note ?? "");
  if (!modal) return null;

  const parentOptions = categories.filter((category) => category.status === "active" && category.transactionType === transactionType && category.parentCategoryId === null && category.id !== editing?.id);
  const isChild = modal.mode === "addChild" || Boolean(parentCategoryId);
  const sameLevelDuplicate = categories.some((category) => category.id !== editing?.id && category.status !== "hidden" && category.transactionType === transactionType && category.parentCategoryId === (isChild ? parentCategoryId : null) && category.name.trim().toLowerCase() === name.trim().toLowerCase());
  const canSave = name.trim().length > 0 && !sameLevelDuplicate && (!isChild || Boolean(parentCategoryId));

  const submit = () => {
    if (!canSave) return;
    onSave({
      id: editing?.id ?? `cat-${Date.now()}`,
      name: name.trim(),
      transactionType,
      parentCategoryId: isChild ? parentCategoryId : null,
      icon,
      color,
      status: editing?.status ?? "active",
      sortOrder: editing?.sortOrder ?? categories.filter((category) => category.transactionType === transactionType && category.parentCategoryId === (isChild ? parentCategoryId : null)).length + 1,
      note: note.trim() || undefined,
      hasTransactions: editing?.hasTransactions,
    });
    onClose();
  };

  return <motion.div className="fixed inset-0 z-[140] flex items-end bg-black/35 backdrop-blur-[1px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div onClick={(event) => event.stopPropagation()} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 260, damping: 28 }} className="w-full rounded-t-[24px] bg-white p-5 shadow-[0_-18px_60px_rgba(0,0,0,0.18)] sm:mx-auto sm:max-w-[520px]">
      <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-black/15" />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A3A3A3]">Danh mục giao dịch</p>
      <h3 className="mt-1 text-xl font-semibold text-[#111111]">{modal.mode === "edit" ? "Sửa danh mục" : modal.mode === "addChild" ? "Thêm danh mục con" : "Thêm danh mục cha"}</h3>
      <div className="mt-5 space-y-3">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">Tên danh mục<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-black/[0.12] px-3 py-3 text-sm font-semibold normal-case tracking-normal text-[#111111] outline-none focus:border-[#B22222]" placeholder="Ví dụ: Cafe" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">Loại giao dịch<div className="mt-1"><FormSelect title="Chọn loại giao dịch" value={transactionType} onChange={(next) => { setTransactionType(next as TransactionType); setParentCategoryId(null); }} disabled={Boolean(parent)} options={transactionTypes.map((type) => ({ value: type, label: type }))} /></div></label>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">Màu sắc<input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="mt-1 h-[46px] w-full rounded-xl border border-black/[0.12] bg-white px-2" /></label>
        </div>
        {(modal.mode === "addChild" || parentCategoryId) && <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">Danh mục cha<div className="mt-1"><FormSelect title="Chọn danh mục cha" value={parentCategoryId ?? ""} onChange={setParentCategoryId} disabled={Boolean(parent)} placeholder="Chọn danh mục cha" options={parentOptions.map((category) => ({ value: category.id, label: category.name }))} /></div></label>}
        <div className="grid grid-cols-2 gap-3"><label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">Icon<input value={icon} onChange={(event) => setIcon(event.target.value)} className="mt-1 w-full rounded-xl border border-black/[0.12] px-3 py-3 text-sm font-semibold normal-case tracking-normal text-[#111111] outline-none focus:border-[#B22222]" /></label><label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#666666]">Ghi chú<input value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full rounded-xl border border-black/[0.12] px-3 py-3 text-sm font-semibold normal-case tracking-normal text-[#111111] outline-none focus:border-[#B22222]" /></label></div>
        {sameLevelDuplicate && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B22222]">Tên danh mục bị trùng trong cùng cấp và cùng loại giao dịch.</p>}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={onClose} className="rounded-2xl bg-[#F7F7F7] py-3.5 text-sm font-semibold text-[#111111]">Hủy</button><button onClick={submit} disabled={!canSave} className="rounded-2xl bg-[#B22222] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(178,34,34,0.25)] disabled:bg-[#D4D4D4]">Lưu</button></div>
    </motion.div>
  </motion.div>;
}

function CategoriesPanel() {
  const [activeType, setActiveType] = useState<TransactionType>("Chi tiêu");
  const [categories, setCategories] = useState<TransactionCategory[]>(transactionCategories);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["expense-food", "income-salary"]));
  const [showHidden, setShowHidden] = useState(false);
  const [modal, setModal] = useState<CategoryModal>(null);

  const visibleParents = categories.filter((category) => category.transactionType === activeType && category.parentCategoryId === null && (showHidden || category.status !== "hidden")).sort((a, b) => a.sortOrder - b.sortOrder);
  const toggleExpand = (id: string) => setExpanded((items) => { const next = new Set(items); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const childrenOf = (id: string) => categories.filter((category) => category.parentCategoryId === id && (showHidden || category.status !== "hidden")).sort((a, b) => a.sortOrder - b.sortOrder);
  const upsert = (category: TransactionCategory) => setCategories((items) => items.some((item) => item.id === category.id) ? items.map((item) => item.id === category.id ? category : item) : [...items, category]);
  const hide = (id: string) => setCategories((items) => items.map((item) => item.id === id ? { ...item, status: "hidden" } : item));
  const remove = (id: string) => setCategories((items) => items.filter((item) => item.id !== id && item.parentCategoryId !== id));

  return <Panel title="Quản lý danh mục" sub="Danh mục 2 tầng: loại giao dịch hệ thống → danh mục cha → danh mục con">
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap gap-2">{transactionTypes.map((type) => <button key={type} onClick={() => setActiveType(type)} className={cn("rounded-full px-4 py-2 text-xs font-semibold transition-colors", activeType === type ? "bg-[#B22222] text-white shadow-[0_8px_18px_rgba(178,34,34,0.18)]" : "bg-[#F5F5F5] text-[#666666]")}>{type}</button>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#666666]">Logic tiền vẫn dựa trên loại giao dịch hệ thống, không dựa trên tên danh mục.</p><div className="flex gap-2"><button onClick={() => setShowHidden((value) => !value)} className="rounded-xl border border-black/[0.1] px-3 py-2 text-xs font-semibold text-[#111111]"><EyeOff className="mr-1 inline size-3.5" />{showHidden ? "Ẩn danh mục đã ẩn" : "Xem danh mục đã ẩn"}</button><button onClick={() => setModal({ mode: "addParent" })} className="rounded-xl bg-[#B22222] px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(178,34,34,0.18)]"><Plus className="mr-1 inline size-3.5" />Thêm danh mục cha</button></div></div>
      <div className="space-y-3">{visibleParents.map((parent) => {
        const children = childrenOf(parent.id);
        const isOpen = expanded.has(parent.id);
        return <div key={parent.id} className={cn("rounded-2xl border p-4", parent.status === "hidden" ? "border-black/[0.04] bg-[#F5F5F5] opacity-60" : "border-black/[0.07] bg-white")}> 
          <div className="flex items-center gap-3"><button onClick={() => toggleExpand(parent.id)} className="flex size-9 items-center justify-center rounded-xl bg-[#F5F5F5]">{isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</button><span className="size-3 rounded-full" style={{ backgroundColor: parent.color }} /><div className="min-w-0 flex-1"><p className="font-semibold text-[#111111]">{parent.name}</p><p className="text-xs text-[#A3A3A3]">{children.length} danh mục con · {parent.status === "hidden" ? "Đã ẩn" : "Đang hoạt động"}</p></div><div className="flex flex-wrap gap-1.5"><button onClick={() => setModal({ mode: "addChild", parent })} className="rounded-lg bg-[#F5F5F5] px-2.5 py-1.5 text-xs font-semibold text-[#111111]">+ Con</button><button onClick={() => setModal({ mode: "edit", category: parent })} className="rounded-lg bg-[#F5F5F5] px-2.5 py-1.5 text-xs font-semibold text-[#111111]"><Pencil className="size-3.5" /></button>{parent.hasTransactions ? <button onClick={() => hide(parent.id)} className="rounded-lg bg-[#F5F5F5] px-2.5 py-1.5 text-xs font-semibold text-[#B22222]">Ẩn</button> : <button onClick={() => remove(parent.id)} className="rounded-lg bg-[#FEF2F2] px-2.5 py-1.5 text-xs font-semibold text-[#B22222]"><Trash2 className="size-3.5" /></button>}</div></div>
          <AnimatePresence>{isOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="mt-3 space-y-2 border-t border-black/[0.05] pt-3">{children.length === 0 ? <p className="rounded-xl bg-[#F9F6F1] px-3 py-2 text-xs text-[#666666]">Danh mục này chưa có danh mục con, có thể chọn trực tiếp khi tạo giao dịch.</p> : children.map((child) => <div key={child.id} className="flex items-center gap-3 rounded-xl bg-[#FAFAFA] px-3 py-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: child.color }} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#111111]">{child.name}</p><p className="text-[11px] text-[#A3A3A3]">{child.status === "hidden" ? "Đã ẩn" : "Đang hoạt động"}</p></div><button onClick={() => setModal({ mode: "edit", category: child })} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#111111]"><Pencil className="size-3.5" /></button>{child.hasTransactions ? <button onClick={() => hide(child.id)} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#B22222]">Ẩn</button> : <button onClick={() => remove(child.id)} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#B22222]"><Trash2 className="size-3.5" /></button>}</div>)}</div></motion.div>}</AnimatePresence>
        </div>;
      })}</div>
      <div className="rounded-2xl bg-[#F9F6F1] p-4"><p className="text-sm font-semibold text-[#111111]">Báo cáo theo danh mục</p><div className="mt-3 space-y-2 text-xs text-[#666666]"><p>Ăn uống: 3.000.000đ</p><p className="pl-4">Ăn chính: 1.500.000đ · Ăn vặt: 600.000đ · Cafe: 900.000đ</p><p>Danh mục đã ẩn không hiển thị mặc định khi nhập giao dịch, nhưng lịch sử vẫn được giữ.</p></div></div>
    </div>
    <AnimatePresence>{modal && <CategoryModalView modal={modal} categories={categories} activeType={activeType} onClose={() => setModal(null)} onSave={upsert} />}</AnimatePresence>
  </Panel>;
}

export function SettingsPage() {
  const [section, setSection] = useState<Section>("categories");
  const [notifs, setNotifs] = useState({ transactions: true, loans: true, savings: false, weekly: true });
  const [prefs, setPrefs] = useState({ darkMode: false, twoFactor: true });

  const content: Record<Section, React.ReactNode> = {
    profile: <Panel title="Hồ sơ cá nhân"><div className="p-6"><div className="flex items-center gap-4"><div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C93535] to-[#8B1A1A] text-xl font-semibold text-white shadow-[0_4px_12px_rgba(178,34,34,0.3)]">AD</div><div><p className="font-semibold text-[#111111]">Người dùng FinHome</p><p className="text-xs text-[#A3A3A3]">Cấu hình hồ sơ sẽ dùng cho đồng bộ cá nhân.</p></div></div></div></Panel>,
    categories: <CategoriesPanel />,
    backup: <BackupPanel />,
    notifications: <Panel title="Thông báo" sub="Chọn những nội dung cần nhắc"><div>{Object.entries({ transactions: "Cảnh báo giao dịch", loans: "Nhắc hạn khoản vay", savings: "Mốc tiết kiệm", weekly: "Tổng kết tuần" }).map(([key, label]) => <Row key={key} label={label}><Toggle checked={notifs[key as keyof typeof notifs]} onChange={(value) => setNotifs((items) => ({ ...items, [key]: value }))} /></Row>)}</div></Panel>,
    security: <Panel title="Bảo mật"><Row label="Xác thực 2 lớp" sub="Bảo vệ dữ liệu tài chính"><Toggle checked={prefs.twoFactor} onChange={(value) => setPrefs((items) => ({ ...items, twoFactor: value }))} /></Row></Panel>,
    preferences: <Panel title="Tùy chọn"><Row label="Ngôn ngữ" sub="Giao diện tiếng Việt"><span className="text-xs font-semibold text-[#111111]">Tiếng Việt</span></Row><Row label="Chế độ tối" sub="Đang chuẩn bị"><Toggle checked={prefs.darkMode} onChange={(value) => setPrefs((items) => ({ ...items, darkMode: value }))} /></Row></Panel>,
  };

  return <div className="min-h-full bg-[#F9F9F9]"><div className="mx-auto max-w-[1100px] space-y-6 px-6 py-8 lg:px-8"><motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#A3A3A3]">Configuration</p><h1 className="text-[1.75rem] font-semibold leading-none tracking-tight text-[#111111]">Cài đặt</h1></motion.div><div className="flex flex-col gap-6 lg:flex-row"><motion.nav initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05, duration: 0.3 }} className="shrink-0 lg:w-48"><div className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5">{sections.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setSection(id)} className={cn("relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all", section === id ? "text-[#111111]" : "text-[#A3A3A3] hover:text-[#666666]")}>{section === id && <motion.div layoutId="settings-nav-bg" className="absolute inset-0 rounded-xl border border-black/[0.07] bg-white shadow-sm" transition={{ type: "spring", bounce: 0.2, duration: 0.35 }} />}<Icon className={cn("relative z-10 size-4 shrink-0", section === id ? "text-[#B22222]" : "text-[#C4C4C4]")} strokeWidth={1.8} /><span className="relative z-10 font-medium">{label}</span></button>)}</div></motion.nav><div className="min-w-0 flex-1"><AnimatePresence mode="wait"><motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>{content[section]}</motion.div></AnimatePresence></div></div></div></div>;
}

