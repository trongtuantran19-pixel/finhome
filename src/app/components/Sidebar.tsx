import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, User, Building2, TrendingUp, PiggyBank,
  CreditCard, Settings, ChevronLeft, ChevronRight, Menu, X
} from "lucide-react";
import { cn } from "./ui/utils";

export type Page = "overview" | "personal" | "business" | "investment" | "savings" | "loans" | "settings";

const navItems: {
  id: Page;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
}[] = [
  { id: "overview",    label: "Tổng quan",    icon: Home },
  { id: "personal",    label: "Cá nhân",    icon: User },
  { id: "business",    label: "Kinh doanh",    icon: Building2 },
  { id: "investment",  label: "Đầu tư",  icon: TrendingUp },
  { id: "savings",     label: "Tiết kiệm",     icon: PiggyBank },
  { id: "loans",       label: "Khoản vay",       icon: CreditCard, badge: "1" },
  { id: "settings",    label: "Cài đặt",    icon: Settings },
];

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 select-none", collapsed && "justify-center")}>
      <div className="size-7 rounded-lg bg-[#B22222] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(178,34,34,0.4)]">
        <span className="text-white font-bold text-sm tracking-tight">F</span>
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap"
          >
            <span className="text-white font-semibold tracking-tight">
              Fin<span className="text-white/40">Home</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: (typeof navItems)[0];
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center w-full rounded-lg transition-all duration-150 group outline-none",
        collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
        active
          ? "bg-white/[0.08] text-white"
          : "text-white/40 hover:text-white/80 hover:bg-white/[0.05]"
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg bg-white/[0.08]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        />
      )}
      <div className="relative z-10 flex items-center gap-3 w-full">
        <Icon
          className={cn("size-[17px] shrink-0 transition-colors", active ? "text-[#E05555]" : "")}
          strokeWidth={active ? 2 : 1.7}
        />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-auto flex-1 min-w-0"
            >
              <span className={cn("text-sm flex-1 text-left", active ? "font-medium text-white" : "font-normal")}>
                {item.label}
              </span>
              {item.badge && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-[#B22222] text-white text-[9px] font-bold leading-none">
                  {item.badge}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </button>
  );
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ─── Mobile top bar ─────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-4 bg-white/90 backdrop-blur-md border-b border-black/[0.07]">
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-black/[0.05] transition-colors">
          <Menu className="size-5 text-[#111111]" strokeWidth={1.8} />
        </button>
        <div className="flex items-center gap-1.5">
          <div className="size-6 rounded-md bg-[#B22222] flex items-center justify-center">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="font-semibold text-[#111111] tracking-tight">FinHome</span>
        </div>
        <div className="w-9" />
      </div>

      {/* ─── Mobile drawer ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="fixed top-0 left-0 h-full w-64 z-50 flex flex-col lg:hidden"
              style={{ background: "#0C0C0C" }}
            >
              <div className="flex items-center justify-between h-14 px-5 border-b border-white/[0.06] shrink-0">
                <Logo collapsed={false} />
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors">
                  <X className="size-4" />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-none">
                {navItems.map(item => (
                  <NavItem
                    key={item.id}
                    item={item}
                    active={activePage === item.id}
                    collapsed={false}
                    onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                  />
                ))}
              </nav>

              <div className="px-3 pb-5 pt-3 border-t border-white/[0.05]">
                <UserProfile collapsed={false} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── Desktop sidebar ────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
        className="hidden lg:flex flex-col h-full shrink-0 relative border-r border-white/[0.05]"
        style={{ background: "#0C0C0C" }}
      >
        {/* Logo */}
        <div className={cn("flex items-center h-14 border-b border-white/[0.06] shrink-0 px-4")}>
          <Logo collapsed={collapsed} />
        </div>

        {/* Section label */}
        <AnimatePresence>
          {!collapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 pt-5 pb-1.5 text-[9px] font-semibold text-white/20 uppercase tracking-[0.12em]"
            >
              Điều hướng
            </motion.p>
          )}
        </AnimatePresence>

        {/* Nav */}
        <nav className={cn("flex-1 px-2.5 space-y-0.5 overflow-y-auto scrollbar-none", collapsed ? "pt-4" : "pt-1")}>
          {navItems.map(item => (
            <NavItem
              key={item.id}
              item={item}
              active={activePage === item.id}
              collapsed={collapsed}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </nav>

        {/* User */}
        <div className="px-2.5 pb-4 pt-3 border-t border-white/[0.05]">
          <UserProfile collapsed={collapsed} />
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3.5 top-14 mt-8 z-10 size-7 rounded-full bg-[#1C1C1C] border border-white/[0.1] shadow-md flex items-center justify-center hover:bg-[#2A2A2A] transition-colors group"
        >
          {collapsed
            ? <ChevronRight className="size-3 text-white/40 group-hover:text-white/70 transition-colors" />
            : <ChevronLeft className="size-3 text-white/40 group-hover:text-white/70 transition-colors" />}
        </button>
      </motion.aside>

      {/* ─── Mobile bottom navigation ───────────────────────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-black/[0.07] safe-area-bottom">
        <div className="flex items-stretch justify-around px-1 h-[60px]">
          {navItems.slice(0, 6).map(item => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  active ? "text-[#B22222]" : "text-[#A3A3A3]"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-tab-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-[#B22222]"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                  />
                )}
                <Icon className="size-[19px]" strokeWidth={active ? 2 : 1.6} />
                <span className={cn("text-[9px] font-medium leading-none", active ? "text-[#B22222]" : "text-[#A3A3A3]")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function UserProfile({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-lg py-2 cursor-pointer hover:bg-white/[0.05] transition-colors",
      collapsed ? "justify-center px-0" : "px-2"
    )}>
      <div className="size-7 rounded-full bg-gradient-to-br from-[#C93535] to-[#8B1A1A] flex items-center justify-center shrink-0">
        <span className="text-white text-[11px] font-semibold">AD</span>
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-w-0 flex-1"
          >
            <p className="text-white text-xs font-medium truncate leading-none mb-0.5">Alex Doe</p>
            <div className="flex items-center gap-1">
              <div className="size-1.5 rounded-full bg-[#22C55E]" />
              <p className="text-white/30 text-[10px] truncate">Premium Plan</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



