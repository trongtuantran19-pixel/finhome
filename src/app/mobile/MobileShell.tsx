import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Banknote,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronRight,
  CreditCard,
  Home,
  Landmark,
  PiggyBank,
  Settings,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  businessSpaces,
  creditCards,
  formatMoney,
  interestSavings,
  investmentCash,
  investmentHoldings,
  loans,
  personalAccounts,
  savingGoals,
} from "../finhomeData";
import { finhomeStorageKeys, readStoredJson, readStoredNumber } from "../finhomeStorage";
import { useFinHomeStore } from "../finhomeStore";

type MobileTab = "overview" | "personal" | "business" | "transfer" | "savings" | "investment" | "loans" | "settings";

const navItems: { id: MobileTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Tổng quan", icon: Home },
  { id: "personal", label: "Cá nhân", icon: UserRound },
  { id: "business", label: "Kinh doanh", icon: BriefcaseBusiness },
  { id: "transfer", label: "Chuyển", icon: ArrowRightLeft },
  { id: "savings", label: "Tiết kiệm", icon: PiggyBank },
  { id: "investment", label: "Đầu tư", icon: ChartNoAxesCombined },
  { id: "loans", label: "Khoản vay", icon: CreditCard },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

function money(value: number) {
  return formatMoney(Math.round(value));
}

function useMobileModel() {
  const { dataVersion } = useFinHomeStore();

  return useMemo(() => {
    const accounts = readStoredJson(finhomeStorageKeys.personalAccounts, personalAccounts);
    const businesses = readStoredJson(finhomeStorageKeys.businessSpaces, businessSpaces);
    const storedLoans = readStoredJson(finhomeStorageKeys.loans, loans);
    const cards = readStoredJson(finhomeStorageKeys.personalCards, creditCards);
    const goals = readStoredJson(finhomeStorageKeys.savingsGoals, savingGoals);
    const interest = readStoredJson(finhomeStorageKeys.savingsInterest, interestSavings);
    const cash = readStoredNumber(finhomeStorageKeys.investmentCash, investmentCash);
    const holdings = readStoredJson(finhomeStorageKeys.investmentHoldings, investmentHoldings);

    const personalTotal = accounts.filter((item) => item.status !== "hidden").reduce((sum, item) => sum + item.balance, 0);
    const businessCash = businesses.reduce((sum, item) => sum + item.cash, 0);
    const savingsTotal = goals.reduce((sum, item) => sum + item.current, 0) + interest.filter((item) => item.status !== "Đã tất toán").reduce((sum, item) => sum + item.principal, 0);
    const investmentTotal = cash + holdings.filter((item) => item.status !== "Đã bán").reduce((sum, item) => sum + item.remainingCapital, 0);
    const loanDebt = storedLoans.reduce((sum, item) => sum + item.balance, 0);
    const cardDebt = cards.reduce((sum, item) => sum + item.balance, 0);
    const totalAssets = personalTotal + businessCash + savingsTotal + investmentTotal;
    const totalDebt = loanDebt + cardDebt;

    return {
      accounts,
      businesses,
      loans: storedLoans,
      cards,
      goals,
      interest,
      investmentCash: cash,
      holdings,
      personalTotal,
      businessCash,
      savingsTotal,
      investmentTotal,
      totalAssets,
      totalDebt,
      netWorth: totalAssets - totalDebt,
    };
  }, [dataVersion]);
}

type MobileModel = ReturnType<typeof useMobileModel>;

function AppHeader({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/92 px-5 pb-4 pt-[max(18px,env(safe-area-inset-top))] backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A3A3A3]">{eyebrow}</p>
          <h1 className="mt-1 text-[30px] font-black leading-none tracking-[-0.02em] text-[#111111]">{title}</h1>
        </div>
        <div className="flex size-11 items-center justify-center rounded-full bg-[#B22222] text-base font-black text-white">F</div>
      </div>
    </header>
  );
}

function MetricCard({ label, value, dark = false, tone = "black" }: { label: string; value: string; dark?: boolean; tone?: "black" | "green" | "red" }) {
  const toneClass = tone === "green" ? "text-[#126C3E]" : tone === "red" ? "text-[#B22222]" : dark ? "text-white" : "text-[#111111]";
  return (
    <div className={dark ? "rounded-[24px] bg-[#111111] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.14)]" : "rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_14px_34px_rgba(0,0,0,0.06)]"}>
      <p className={dark ? "text-xs font-semibold text-white/55" : "text-xs font-semibold text-[#8C8C8C]"}>{label}</p>
      <p className={`mt-4 text-[28px] font-black leading-tight tracking-[-0.02em] ${toneClass}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="px-1 text-[15px] font-black text-[#111111]">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function ListItem({ icon: Icon, title, sub, right }: { icon: React.ComponentType<{ className?: string }>; title: string; sub: string; right?: string }) {
  return (
    <button type="button" className="flex w-full items-center gap-3 rounded-[20px] border border-black/[0.06] bg-white p-4 text-left shadow-[0_12px_28px_rgba(0,0,0,0.045)]">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6F6F6] text-[#B22222]">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-black text-[#111111]">{title}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[#9A9A9A]">{sub}</span>
      </span>
      {right && <span className="text-sm font-black text-[#111111]">{right}</span>}
      <ChevronRight className="size-4 text-[#C0C0C0]" />
    </button>
  );
}

function OverviewScreen({ model }: { model: MobileModel }) {
  return (
    <>
      <AppHeader title="Tổng quan" eyebrow="FinHome mobile" />
      <main className="px-5 pb-28 pt-5">
        <div className="grid gap-4">
          <MetricCard label="Tổng tài sản" value={money(model.totalAssets)} dark />
          <MetricCard label="Tổng nợ" value={money(model.totalDebt)} tone="red" />
          <MetricCard label="Tài sản ròng" value={money(model.netWorth)} tone="green" />
        </div>
        <Section title="Tiền đang nằm ở đâu">
          <ListItem icon={Wallet} title="Cá nhân" sub="Ví và tài khoản cá nhân" right={money(model.personalTotal)} />
          <ListItem icon={BriefcaseBusiness} title="Kinh doanh" sub={`${model.businesses.length} không gian`} right={money(model.businessCash)} />
          <ListItem icon={ChartNoAxesCombined} title="Đầu tư" sub="Tiền mặt + vốn còn lại" right={money(model.investmentTotal)} />
          <ListItem icon={PiggyBank} title="Tiết kiệm" sub="Mục tiêu + sinh lãi" right={money(model.savingsTotal)} />
        </Section>
      </main>
    </>
  );
}

function PersonalScreen({ model }: { model: MobileModel }) {
  return (
    <>
      <AppHeader title="Cá nhân" eyebrow="Ví trung tâm" />
      <main className="px-5 pb-28 pt-5">
        <MetricCard label="Tổng số dư cá nhân" value={money(model.personalTotal)} dark />
        <Section title="Tài khoản / ví">
          {model.accounts.map((account) => (
            <ListItem key={account.id} icon={account.type === "Ngân hàng" ? Landmark : Wallet} title={account.name} sub={`${account.type}: ${account.currency}`} right={money(account.balance)} />
          ))}
        </Section>
      </main>
    </>
  );
}

function BusinessScreen({ model }: { model: MobileModel }) {
  const profit = model.businesses.reduce((sum, item) => sum + item.profit, 0);

  return (
    <>
      <AppHeader title="Kinh doanh" eyebrow="Không gian độc lập" />
      <main className="px-5 pb-28 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Tiền mặt" value={money(model.businessCash)} dark />
          <MetricCard label="Lợi nhuận" value={money(profit)} tone={profit >= 0 ? "green" : "red"} />
        </div>
        <Section title="Không gian kinh doanh">
          {model.businesses.map((item) => (
            <ListItem key={item.id} icon={BriefcaseBusiness} title={item.name} sub={`${item.type}: lợi nhuận ${money(item.profit)}`} right={money(item.cash)} />
          ))}
        </Section>
      </main>
    </>
  );
}

function TransferScreen() {
  return (
    <>
      <AppHeader title="Chuyển tiền" eyebrow="Bottom sheet flow" />
      <main className="px-5 pb-28 pt-5">
        <div className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_16px_36px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A3A3A3]">Từ</p>
          <button className="mt-2 flex h-16 w-full items-center justify-between rounded-2xl border border-black/[0.08] px-4 text-left">
            <span><b>VCB</b><span className="block text-xs text-[#999]">Cá nhân</span></span>
            <ChevronRight className="size-4 text-[#B22222]" />
          </button>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#A3A3A3]">Đến</p>
          <button className="mt-2 flex h-16 w-full items-center justify-between rounded-2xl border border-black/[0.08] px-4 text-left">
            <span><b>Quỹ khẩn cấp</b><span className="block text-xs text-[#999]">Tiết kiệm</span></span>
            <ChevronRight className="size-4 text-[#B22222]" />
          </button>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <input className="h-14 rounded-2xl border border-black/[0.08] px-4 text-base font-bold outline-none focus:border-[#B22222]" defaultValue="0" />
            <button className="h-14 rounded-2xl border border-black/[0.08] px-4 text-left text-sm font-bold">Hôm nay</button>
          </div>
          <textarea className="mt-5 h-24 w-full rounded-2xl border border-black/[0.08] p-4 font-semibold outline-none focus:border-[#B22222]" placeholder="Ghi chú" />
          <button className="mt-5 h-14 w-full rounded-2xl bg-[#B22222] font-black text-white shadow-[0_14px_32px_rgba(178,34,34,0.24)]">Tiếp tục</button>
        </div>
      </main>
    </>
  );
}

function SavingsScreen({ model }: { model: MobileModel }) {
  return (
    <>
      <AppHeader title="Tiết kiệm" eyebrow="Mục tiêu & sinh lãi" />
      <main className="px-5 pb-28 pt-5">
        <MetricCard label="Tổng tiết kiệm" value={money(model.savingsTotal)} dark />
        <Section title="Mục tiêu">
          {model.goals.map((goal) => (
            <ListItem key={goal.id} icon={PiggyBank} title={goal.name} sub={`${Math.round((goal.current / goal.target) * 100)}% mục tiêu`} right={money(goal.current)} />
          ))}
        </Section>
      </main>
    </>
  );
}

function InvestmentScreen({ model }: { model: MobileModel }) {
  return (
    <>
      <AppHeader title="Đầu tư" eyebrow="Không gian riêng" />
      <main className="px-5 pb-28 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Tiền mặt đầu tư" value={money(model.investmentCash)} />
          <MetricCard label="Tổng đầu tư" value={money(model.investmentTotal)} dark />
        </div>
        <Section title="Khoản đầu tư">
          {model.holdings.map((item) => (
            <ListItem key={item.id} icon={ChartNoAxesCombined} title={item.code} sub={`${item.name}: ${item.status}`} right={money(item.remainingCapital)} />
          ))}
        </Section>
      </main>
    </>
  );
}

function LoansScreen({ model }: { model: MobileModel }) {
  return (
    <>
      <AppHeader title="Khoản vay" eyebrow="Nghĩa vụ nợ" />
      <main className="px-5 pb-28 pt-5">
        <MetricCard label="Tổng dư nợ" value={money(model.totalDebt)} dark />
        <Section title="Khoản vay & thẻ">
          {model.loans.map((loan) => (
            <ListItem key={loan.id} icon={Banknote} title={loan.name} sub={loan.type} right={money(loan.balance)} />
          ))}
          {model.cards.map((card) => (
            <ListItem key={card.id} icon={CreditCard} title={card.name} sub={`Hạn mức: ${money(card.limit)}`} right={money(card.balance)} />
          ))}
        </Section>
      </main>
    </>
  );
}

function SettingsScreen() {
  return (
    <>
      <AppHeader title="Cài đặt" eyebrow="Mobile lab" />
      <main className="px-5 pb-28 pt-5">
        <Section title="Thiết kế đang thử nghiệm">
          <ListItem icon={Settings} title="Quản lý danh mục" sub="Danh mục cha/con 2 tầng" />
          <ListItem icon={Wallet} title="Tài khoản cá nhân" sub="Thêm, sửa, ẩn, điều chỉnh" />
          <ListItem icon={ArrowRightLeft} title="Luồng chuyển tiền" sub="Bottom sheet từ đâu đến đâu" />
        </Section>
      </main>
    </>
  );
}

function BottomNav({ active, onChange }: { active: MobileTab; onChange: (tab: MobileTab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/95 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto flex max-w-[430px] gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button key={item.id} type="button" onClick={() => onChange(item.id)} className={`flex min-w-[68px] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold transition ${selected ? "bg-[#FDECEC] text-[#B22222]" : "text-[#A3A3A3]"}`}>
              <Icon className="size-5" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileShell() {
  const [active, setActive] = useState<MobileTab>("overview");
  const model = useMobileModel();

  const screen = {
    overview: <OverviewScreen model={model} />,
    personal: <PersonalScreen model={model} />,
    business: <BusinessScreen model={model} />,
    transfer: <TransferScreen />,
    savings: <SavingsScreen model={model} />,
    investment: <InvestmentScreen model={model} />,
    loans: <LoansScreen model={model} />,
    settings: <SettingsScreen />,
  }[active];

  return (
    <div className="min-h-dvh bg-[#F7F7F7] text-[#111111]" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div className="mx-auto min-h-dvh max-w-[430px] bg-[#F7F7F7] shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
        {screen}
        <BottomNav active={active} onChange={setActive} />
      </div>
    </div>
  );
}

export default MobileShell;
