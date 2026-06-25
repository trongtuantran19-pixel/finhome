import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sidebar, type Page } from "./components/Sidebar";
import { FinHomeStoreProvider, useFinHomeStore } from "./finhomeStore";

type PageComponentProps = {
  dataVersion: number;
};

const OverviewPage = lazy(() => import("./components/OverviewPage").then((module) => ({ default: module.OverviewPage })));
const PersonalPage = lazy(() => import("./components/PersonalPage").then((module) => ({ default: module.PersonalPage })));
const BusinessPage = lazy(() => import("./components/BusinessPage").then((module) => ({ default: module.BusinessPage })));
const InvestmentPage = lazy(() => import("./components/InvestmentPage").then((module) => ({ default: module.InvestmentPage })));
const SavingsPage = lazy(() => import("./components/SavingsPage").then((module) => ({ default: module.SavingsPage })));
const LoansPage = lazy(() => import("./components/LoansPage").then((module) => ({ default: module.LoansPage })));
const SettingsPage = lazy(() => import("./components/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const MobileShell = lazy(() => import("./mobile/MobileShell").then((module) => ({ default: module.MobileShell })));

const pages: Record<Page, React.ComponentType<PageComponentProps>> = {
  overview: OverviewPage,
  personal: PersonalPage,
  business: BusinessPage,
  investment: InvestmentPage,
  savings: SavingsPage,
  loans: LoansPage,
  settings: SettingsPage,
};

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <div className="rounded-[24px] border border-[#EFEFEF] bg-white px-6 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#E8DADA] border-t-[#B22222]" />
        <p className="text-sm font-semibold text-[#111111]">Đang mở màn hình</p>
        <p className="mt-1 text-xs text-[#9A9A9A]">FinHome đang tải dữ liệu mới nhất.</p>
      </div>
    </div>
  );
}

function isMobileRoute() {
  if (typeof window === "undefined") return false;
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  return pathname === "/mobile" || new URLSearchParams(window.location.search).has("mobile");
}

function isBusinessV2Enabled() {
  return true;
}

function WebAppShell() {
  /* MARKER-MAKE-KIT-DISCOVERY-READ */
  const [activePage, setActivePage] = useState<Page>("overview");
  const { dataVersion } = useFinHomeStore();
  const enableBusiness = isBusinessV2Enabled();

  useEffect(() => {
    if (!enableBusiness && activePage === "business") setActivePage("overview");
  }, [activePage, enableBusiness]);

  const navigate = (page: Page) => {
    if (!enableBusiness && page === "business") return;
    if (page === activePage) return;
    setActivePage(page);
  };

  const PageComponent = !enableBusiness && activePage === "business" ? OverviewPage : pages[activePage];

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        background: "#F9F9F9",
      }}
    >
      <Sidebar activePage={activePage} onNavigate={navigate} enableBusiness={enableBusiness} />

      <main className="relative flex-1 overflow-hidden pt-14 pb-[60px] lg:pt-0 lg:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 overflow-y-auto scrollbar-none"
          >
            <Suspense fallback={<PageLoader />}>
              <PageComponent dataVersion={dataVersion} />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function AppShell() {
  return isMobileRoute() ? (
    <Suspense fallback={<PageLoader />}>
      <MobileShell />
    </Suspense>
  ) : (
    <WebAppShell />
  );
}

export default function App() {
  return (
    <FinHomeStoreProvider>
      <AppShell />
    </FinHomeStoreProvider>
  );
}
