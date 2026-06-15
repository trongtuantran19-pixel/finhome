export type Status = "active" | "hidden" | "closed" | "settled" | "cancelled" | "completed" | "paused";

export type PersonalAccount = {
  id: string;
  name: string;
  type: "Tiền mặt" | "Ngân hàng" | "Ví điện tử" | "Ví khác";
  balance: number;
  currency: "VND";
  color: string;
  status: Status;
};

export type TransactionType = "Thu nhập" | "Chi tiêu" | "Kinh doanh" | "Đầu tư" | "Tiết kiệm" | "Khoản vay";

export type TransactionCategory = {
  id: string;
  name: string;
  transactionType: TransactionType;
  parentCategoryId: string | null;
  icon: string;
  color: string;
  status: "active" | "hidden";
  sortOrder: number;
  note?: string;
  hasTransactions?: boolean;
};

export type CashflowTransaction = {
  id: string;
  date: string;
  name: string;
  space: "Cá nhân" | "Kinh doanh" | "Đầu tư" | "Tiết kiệm" | "Khoản vay";
  source: string;
  amount: number;
  kind: "income" | "expense" | "transfer" | "loan_disbursement" | "loan_principal" | "loan_interest" | "credit_card_spend" | "credit_card_payment" | "adjustment" | "investment_buy" | "investment_sell" | "savings_interest";
  status: Status;
  note: string;
  countsAsIncome?: boolean;
  countsAsExpense?: boolean;
};

export type BusinessSpace = {
  id: string;
  name: string;
  type: string;
  status: Status;
  cash: number;
  capital: number;
  retainedProfit: number;
  withdrawnToPersonal: number;
  revenue: number;
  expenses: number;
  receivable: number;
  payable: number;
  transactions: CashflowTransaction[];
  chart: { m: string; r: number; e: number }[];
};

export type InvestmentHolding = {
  id: string;
  code: string;
  name: string;
  type: string;
  quantity: number;
  avgCost: number;
  remainingCapital: number;
  realizedPL: number;
  status: "holding" | "sold" | "closed";
  buyHistory: { date: string; quantity: number; price: number; fee: number }[];
  sellHistory: { date: string; quantity: number; price: number; fee: number; realizedPL: number; note: "Bán một phần" | "Bán toàn bộ" }[];
};

export type SavingGoal = {
  id: string;
  name: string;
  target: number;
  current: number;
  monthly: number;
  start: string;
  due: string;
  status: "active" | "completed" | "paused" | "closed" | "hidden";
};

export type InterestSaving = {
  id: string;
  name: string;
  bank: string;
  principal: number;
  annualRate: number;
  start: string;
  maturity: string;
  termMonths: number;
  expectedInterest: number;
  allowTopUp: boolean;
  status: "active" | "settled" | "closed" | "hidden";
};

export type Loan = {
  id: string;
  name: string;
  type: "Vay ngân hàng" | "Vay kinh doanh" | "Vay cá nhân" | "Thẻ tín dụng";
  original: number;
  outstanding: number;
  rate: number;
  monthly: number;
  nextDue: string;
  bank: string;
  status: "active" | "dueSoon" | "overdue" | "settled" | "closed";
  paidInterest: number;
  history: { date: string; total: number; principal: number; interest: number }[];
};

export type CreditCardDebt = {
  id: string;
  name: string;
  bank: string;
  limit: number;
  used: number;
  statementDate: string;
  dueDate: string;
  color: string;
  last4: string;
  status: Status;
};

export const personalAccounts: PersonalAccount[] = [
  { id: "cash", name: "Tiền mặt", type: "Tiền mặt", balance: 5_000_000, currency: "VND", color: "#111111", status: "active" },
  { id: "vcb", name: "VCB", type: "Ngân hàng", balance: 99_500_000, currency: "VND", color: "#006E33", status: "active" },
  { id: "tcb", name: "Techcombank", type: "Ngân hàng", balance: 30_000_000, currency: "VND", color: "#B22222", status: "active" },
  { id: "momo", name: "Momo", type: "Ví điện tử", balance: 3_000_000, currency: "VND", color: "#A50064", status: "active" },
  { id: "zalo", name: "ZaloPay", type: "Ví điện tử", balance: 2_000_000, currency: "VND", color: "#0068FF", status: "active" },
  { id: "other", name: "Ví khác", type: "Ví khác", balance: 0, currency: "VND", color: "#6B7280", status: "hidden" },
];


export const transactionCategories: TransactionCategory[] = [
  { id: "expense-food", name: "Ăn uống", transactionType: "Chi tiêu", parentCategoryId: null, icon: "Utensils", color: "#B22222", status: "active", sortOrder: 1, hasTransactions: true },
  { id: "expense-food-breakfast", name: "Ăn sáng", transactionType: "Chi tiêu", parentCategoryId: "expense-food", icon: "Utensils", color: "#B22222", status: "active", sortOrder: 1 },
  { id: "expense-food-lunch", name: "Ăn trưa", transactionType: "Chi tiêu", parentCategoryId: "expense-food", icon: "Utensils", color: "#B22222", status: "active", sortOrder: 2 },
  { id: "expense-food-dinner", name: "Ăn tối", transactionType: "Chi tiêu", parentCategoryId: "expense-food", icon: "Utensils", color: "#B22222", status: "active", sortOrder: 3 },
  { id: "expense-food-snack", name: "Ăn vặt", transactionType: "Chi tiêu", parentCategoryId: "expense-food", icon: "Cookie", color: "#B22222", status: "active", sortOrder: 4 },
  { id: "expense-food-restaurant", name: "Nhà hàng", transactionType: "Chi tiêu", parentCategoryId: "expense-food", icon: "Store", color: "#8B2F13", status: "active", sortOrder: 5 },
  { id: "expense-food-drinks", name: "Đồ uống", transactionType: "Chi tiêu", parentCategoryId: "expense-food", icon: "Coffee", color: "#8B2F13", status: "active", sortOrder: 6, hasTransactions: true },
  { id: "expense-food-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-food", icon: "Package", color: "#737373", status: "active", sortOrder: 7 },
  { id: "expense-shopping", name: "Mua sắm", transactionType: "Chi tiêu", parentCategoryId: null, icon: "ShoppingBag", color: "#111111", status: "active", sortOrder: 2 },
  { id: "expense-shopping-clothes", name: "Quần áo", transactionType: "Chi tiêu", parentCategoryId: "expense-shopping", icon: "Shirt", color: "#111111", status: "active", sortOrder: 1 },
  { id: "expense-shopping-shoes", name: "Giày dép", transactionType: "Chi tiêu", parentCategoryId: "expense-shopping", icon: "ShoppingBag", color: "#111111", status: "active", sortOrder: 2 },
  { id: "expense-shopping-cosmetics", name: "Mỹ phẩm", transactionType: "Chi tiêu", parentCategoryId: "expense-shopping", icon: "ShoppingBag", color: "#B22222", status: "active", sortOrder: 3 },
  { id: "expense-shopping-tech", name: "Đồ công nghệ", transactionType: "Chi tiêu", parentCategoryId: "expense-shopping", icon: "Laptop", color: "#111111", status: "active", sortOrder: 4 },
  { id: "expense-shopping-accessories", name: "Phụ kiện", transactionType: "Chi tiêu", parentCategoryId: "expense-shopping", icon: "ShoppingBag", color: "#111111", status: "active", sortOrder: 5 },
  { id: "expense-shopping-supermarket", name: "Siêu thị", transactionType: "Chi tiêu", parentCategoryId: "expense-shopping", icon: "Store", color: "#111111", status: "active", sortOrder: 6 },
  { id: "expense-shopping-misc", name: "Linh tinh", transactionType: "Chi tiêu", parentCategoryId: "expense-shopping", icon: "Package", color: "#737373", status: "active", sortOrder: 7 },
  { id: "expense-shopping-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-shopping", icon: "Package", color: "#737373", status: "active", sortOrder: 8 },
  { id: "expense-transport", name: "Di chuyển", transactionType: "Chi tiêu", parentCategoryId: null, icon: "Car", color: "#B22222", status: "active", sortOrder: 3, hasTransactions: true },
  { id: "expense-transport-fuel", name: "Xăng xe", transactionType: "Chi tiêu", parentCategoryId: "expense-transport", icon: "Car", color: "#B22222", status: "active", sortOrder: 1 },
  { id: "expense-transport-taxi", name: "Grab / Be / Taxi", transactionType: "Chi tiêu", parentCategoryId: "expense-transport", icon: "Car", color: "#B22222", status: "active", sortOrder: 2 },
  { id: "expense-transport-parking", name: "Gửi xe", transactionType: "Chi tiêu", parentCategoryId: "expense-transport", icon: "Car", color: "#B22222", status: "active", sortOrder: 3 },
  { id: "expense-transport-maintenance", name: "Sửa chữa/Bảo dưỡng", transactionType: "Chi tiêu", parentCategoryId: "expense-transport", icon: "Car", color: "#B22222", status: "active", sortOrder: 4 },
  { id: "expense-transport-toll", name: "Cầu đường", transactionType: "Chi tiêu", parentCategoryId: "expense-transport", icon: "Car", color: "#B22222", status: "active", sortOrder: 5 },
  { id: "expense-transport-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-transport", icon: "Package", color: "#737373", status: "active", sortOrder: 6 },
  { id: "expense-housing", name: "Nhà ở", transactionType: "Chi tiêu", parentCategoryId: null, icon: "Home", color: "#7C2D12", status: "active", sortOrder: 4 },
  { id: "expense-housing-rent", name: "Tiền thuê nhà", transactionType: "Chi tiêu", parentCategoryId: "expense-housing", icon: "Home", color: "#7C2D12", status: "active", sortOrder: 1 },
  { id: "expense-housing-appliances", name: "Đồ gia dụng", transactionType: "Chi tiêu", parentCategoryId: "expense-housing", icon: "Home", color: "#7C2D12", status: "active", sortOrder: 2 },
  { id: "expense-housing-furniture", name: "Nội thất", transactionType: "Chi tiêu", parentCategoryId: "expense-housing", icon: "Home", color: "#7C2D12", status: "active", sortOrder: 3 },
  { id: "expense-housing-internet", name: "Internet", transactionType: "Chi tiêu", parentCategoryId: "expense-housing", icon: "Home", color: "#7C2D12", status: "active", sortOrder: 4 },
  { id: "expense-housing-phone", name: "Điện thoại", transactionType: "Chi tiêu", parentCategoryId: "expense-housing", icon: "Home", color: "#7C2D12", status: "active", sortOrder: 5 },
  { id: "expense-housing-management", name: "Phí quản lý", transactionType: "Chi tiêu", parentCategoryId: "expense-housing", icon: "Home", color: "#7C2D12", status: "active", sortOrder: 6 },
  { id: "expense-housing-repair", name: "Sửa chữa nhà", transactionType: "Chi tiêu", parentCategoryId: "expense-housing", icon: "Home", color: "#7C2D12", status: "active", sortOrder: 7 },
  { id: "expense-housing-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-housing", icon: "Package", color: "#737373", status: "active", sortOrder: 8 },
  { id: "expense-family", name: "Gia đình", transactionType: "Chi tiêu", parentCategoryId: null, icon: "Users", color: "#B22222", status: "active", sortOrder: 5 },
  { id: "expense-family-gifts", name: "Quà cho gia đình", transactionType: "Chi tiêu", parentCategoryId: "expense-family", icon: "Users", color: "#B22222", status: "active", sortOrder: 1 },
  { id: "expense-family-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-family", icon: "Package", color: "#737373", status: "active", sortOrder: 2 },
  { id: "expense-health", name: "Sức khỏe", transactionType: "Chi tiêu", parentCategoryId: null, icon: "HeartPulse", color: "#B22222", status: "active", sortOrder: 6 },
  { id: "expense-health-medical", name: "Y tế", transactionType: "Chi tiêu", parentCategoryId: "expense-health", icon: "HeartPulse", color: "#B22222", status: "active", sortOrder: 1 },
  { id: "expense-health-sports", name: "Thể thao", transactionType: "Chi tiêu", parentCategoryId: "expense-health", icon: "HeartPulse", color: "#B22222", status: "active", sortOrder: 2 },
  { id: "expense-health-insurance", name: "Bảo hiểm", transactionType: "Chi tiêu", parentCategoryId: "expense-health", icon: "HeartPulse", color: "#B22222", status: "active", sortOrder: 3 },
  { id: "expense-health-hygiene", name: "Đồ dùng vệ sinh", transactionType: "Chi tiêu", parentCategoryId: "expense-health", icon: "HeartPulse", color: "#B22222", status: "active", sortOrder: 4 },
  { id: "expense-health-spa", name: "Spa", transactionType: "Chi tiêu", parentCategoryId: "expense-health", icon: "HeartPulse", color: "#B22222", status: "active", sortOrder: 5 },
  { id: "expense-health-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-health", icon: "Package", color: "#737373", status: "active", sortOrder: 6 },
  { id: "expense-education", name: "Học tập", transactionType: "Chi tiêu", parentCategoryId: null, icon: "GraduationCap", color: "#111111", status: "active", sortOrder: 7 },
  { id: "expense-education-tuition", name: "Học phí", transactionType: "Chi tiêu", parentCategoryId: "expense-education", icon: "GraduationCap", color: "#111111", status: "active", sortOrder: 1 },
  { id: "expense-education-books", name: "Sách", transactionType: "Chi tiêu", parentCategoryId: "expense-education", icon: "GraduationCap", color: "#111111", status: "active", sortOrder: 2 },
  { id: "expense-education-online", name: "Khóa học online", transactionType: "Chi tiêu", parentCategoryId: "expense-education", icon: "GraduationCap", color: "#111111", status: "active", sortOrder: 3 },
  { id: "expense-education-stationery", name: "Văn phòng phẩm", transactionType: "Chi tiêu", parentCategoryId: "expense-education", icon: "GraduationCap", color: "#111111", status: "active", sortOrder: 4 },
  { id: "expense-education-exam", name: "Thi cử", transactionType: "Chi tiêu", parentCategoryId: "expense-education", icon: "GraduationCap", color: "#111111", status: "active", sortOrder: 5 },
  { id: "expense-education-software", name: "Phần mềm học tập", transactionType: "Chi tiêu", parentCategoryId: "expense-education", icon: "GraduationCap", color: "#111111", status: "active", sortOrder: 6 },
  { id: "expense-education-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-education", icon: "Package", color: "#737373", status: "active", sortOrder: 7 },
  { id: "expense-travel-entertainment", name: "Du lịch & Giải trí", transactionType: "Chi tiêu", parentCategoryId: null, icon: "Plane", color: "#7C2D12", status: "active", sortOrder: 8 },
  { id: "expense-travel-hotel", name: "Khách sạn", transactionType: "Chi tiêu", parentCategoryId: "expense-travel-entertainment", icon: "Plane", color: "#7C2D12", status: "active", sortOrder: 1 },
  { id: "expense-travel-ticket", name: "Vé máy bay/tàu", transactionType: "Chi tiêu", parentCategoryId: "expense-travel-entertainment", icon: "Plane", color: "#7C2D12", status: "active", sortOrder: 2 },
  { id: "expense-travel-tour", name: "Tour", transactionType: "Chi tiêu", parentCategoryId: "expense-travel-entertainment", icon: "Plane", color: "#7C2D12", status: "active", sortOrder: 3 },
  { id: "expense-travel-spending", name: "Chi tiêu du lịch", transactionType: "Chi tiêu", parentCategoryId: "expense-travel-entertainment", icon: "Plane", color: "#7C2D12", status: "active", sortOrder: 4 },
  { id: "expense-travel-game", name: "Game", transactionType: "Chi tiêu", parentCategoryId: "expense-travel-entertainment", icon: "Plane", color: "#7C2D12", status: "active", sortOrder: 5 },
  { id: "expense-travel-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-travel-entertainment", icon: "Package", color: "#737373", status: "active", sortOrder: 6 },
  { id: "expense-bank", name: "Ngân hàng", transactionType: "Chi tiêu", parentCategoryId: null, icon: "CreditCard", color: "#B22222", status: "active", sortOrder: 9 },
  { id: "expense-bank-fee", name: "Phí tài chính", transactionType: "Chi tiêu", parentCategoryId: "expense-bank", icon: "CreditCard", color: "#B22222", status: "active", sortOrder: 1 },
  { id: "expense-bank-maturity", name: "Đáo hạn", transactionType: "Chi tiêu", parentCategoryId: "expense-bank", icon: "CreditCard", color: "#B22222", status: "active", sortOrder: 2 },
  { id: "expense-bank-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-bank", icon: "Package", color: "#737373", status: "active", sortOrder: 3 },
  { id: "expense-social", name: "Xã hội", transactionType: "Chi tiêu", parentCategoryId: null, icon: "Users", color: "#111111", status: "active", sortOrder: 10 },
  { id: "expense-social-charity", name: "Từ thiện", transactionType: "Chi tiêu", parentCategoryId: "expense-social", icon: "Users", color: "#111111", status: "active", sortOrder: 1 },
  { id: "expense-social-party", name: "Tiệc / Liên hoan", transactionType: "Chi tiêu", parentCategoryId: "expense-social", icon: "Users", color: "#111111", status: "active", sortOrder: 2 },
  { id: "expense-social-ceremony", name: "Hiếu hỷ", transactionType: "Chi tiêu", parentCategoryId: "expense-social", icon: "Users", color: "#111111", status: "active", sortOrder: 3 },
  { id: "expense-social-gift", name: "Quà tặng", transactionType: "Chi tiêu", parentCategoryId: "expense-social", icon: "Users", color: "#111111", status: "active", sortOrder: 4 },
  { id: "expense-social-networking", name: "Networking", transactionType: "Chi tiêu", parentCategoryId: "expense-social", icon: "Users", color: "#111111", status: "active", sortOrder: 5 },
  { id: "expense-social-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-social", icon: "Package", color: "#737373", status: "active", sortOrder: 6 },
  { id: "expense-love", name: "Tình yêu", transactionType: "Chi tiêu", parentCategoryId: null, icon: "Heart", color: "#B22222", status: "active", sortOrder: 11 },
  { id: "expense-love-date", name: "Hẹn hò", transactionType: "Chi tiêu", parentCategoryId: "expense-love", icon: "Heart", color: "#B22222", status: "active", sortOrder: 1 },
  { id: "expense-love-gift", name: "Quà tặng", transactionType: "Chi tiêu", parentCategoryId: "expense-love", icon: "Heart", color: "#B22222", status: "active", sortOrder: 2 },
  { id: "expense-love-food", name: "Ăn uống", transactionType: "Chi tiêu", parentCategoryId: "expense-love", icon: "Heart", color: "#B22222", status: "active", sortOrder: 3 },
  { id: "expense-love-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-love", icon: "Package", color: "#737373", status: "active", sortOrder: 4 },
  { id: "expense-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: null, icon: "Package", color: "#737373", status: "active", sortOrder: 12 },
  { id: "expense-other-unexpected", name: "Chi phí phát sinh", transactionType: "Chi tiêu", parentCategoryId: "expense-other", icon: "Package", color: "#737373", status: "active", sortOrder: 1 },
  { id: "expense-other-misc", name: "Linh tinh", transactionType: "Chi tiêu", parentCategoryId: "expense-other", icon: "Package", color: "#737373", status: "active", sortOrder: 2 },
  { id: "expense-other-uncategorized", name: "Không phân loại", transactionType: "Chi tiêu", parentCategoryId: "expense-other", icon: "Package", color: "#737373", status: "active", sortOrder: 3 },
  { id: "expense-other-other", name: "Khác", transactionType: "Chi tiêu", parentCategoryId: "expense-other", icon: "Package", color: "#737373", status: "active", sortOrder: 4 },  { id: "income-salary", name: "Lương", transactionType: "Thu nhập", parentCategoryId: null, icon: "Briefcase", color: "#166534", status: "active", sortOrder: 1, hasTransactions: true },
  { id: "income-salary-main", name: "Lương chính", transactionType: "Thu nhập", parentCategoryId: "income-salary", icon: "Wallet", color: "#166534", status: "active", sortOrder: 1, hasTransactions: true },
  { id: "income-salary-bonus", name: "Thưởng", transactionType: "Thu nhập", parentCategoryId: "income-salary", icon: "Sparkles", color: "#166534", status: "active", sortOrder: 2 },
  { id: "income-salary-commission", name: "Hoa hồng", transactionType: "Thu nhập", parentCategoryId: "income-salary", icon: "Percent", color: "#166534", status: "active", sortOrder: 3, hasTransactions: true },
  { id: "business-sales", name: "Doanh thu bán hàng", transactionType: "Kinh doanh", parentCategoryId: null, icon: "Store", color: "#B22222", status: "active", sortOrder: 1 },
  { id: "business-cost", name: "Chi phí kinh doanh", transactionType: "Kinh doanh", parentCategoryId: null, icon: "Receipt", color: "#8B2F13", status: "active", sortOrder: 2 },
  { id: "investment-buy", name: "Mua tài sản", transactionType: "Đầu tư", parentCategoryId: null, icon: "TrendingUp", color: "#166534", status: "active", sortOrder: 1 },
  { id: "savings-goal", name: "Mục tiêu tiết kiệm", transactionType: "Tiết kiệm", parentCategoryId: null, icon: "PiggyBank", color: "#0F766E", status: "active", sortOrder: 1 },
  { id: "loan-payment", name: "Trả nợ vay", transactionType: "Khoản vay", parentCategoryId: null, icon: "CreditCard", color: "#B22222", status: "active", sortOrder: 1 },
];
export const personalTransactions: CashflowTransaction[] = [
  { id: "p1", date: "2026-06-05", name: "Lương tháng", space: "Cá nhân", source: "VCB", amount: 35_000_000, kind: "income", status: "active", categoryId: "income-salary", subcategoryId: "income-salary-main", note: "Thu nhập thực tế", countsAsIncome: true },
  { id: "p2", date: "2026-06-04", name: "Hoa hồng", space: "Cá nhân", source: "VCB", amount: 7_000_000, kind: "income", status: "active", categoryId: "income-salary", subcategoryId: "income-salary-commission", note: "Thu nhập thực tế", countsAsIncome: true },
  { id: "p3", date: "2026-06-03", name: "Ăn uống", space: "Cá nhân", source: "Momo", amount: 4_500_000, kind: "expense", status: "active", categoryId: "expense-food", subcategoryId: "expense-food-drinks", note: "Chi tiêu sinh hoạt", countsAsExpense: true },
  { id: "p4", date: "2026-06-02", name: "Di chuyển", space: "Cá nhân", source: "Momo", amount: 1_200_000, kind: "expense", status: "active", categoryId: "expense-transport", note: "Chi tiêu sinh hoạt", countsAsExpense: true },
  { id: "p5", date: "2026-06-01", name: "Cá nhân chuyển vào đầu tư", space: "Đầu tư", source: "VCB -> Đầu tư", amount: 50_000_000, kind: "transfer", status: "active", note: "Chuyển tiền nội bộ, không tính thu/chi" },
  { id: "p6", date: "2026-06-01", name: "Cá nhân chuyển vào tiết kiệm", space: "Tiết kiệm", source: "VCB -> Tiết kiệm", amount: 20_000_000, kind: "transfer", status: "active", note: "Chuyển tiền nội bộ, không tính thu/chi" },
  { id: "p7", date: "2026-06-01", name: "Góp vốn Quán cafe", space: "Kinh doanh", source: "VCB -> Quán cafe", amount: 30_000_000, kind: "transfer", status: "active", note: "Góp vốn, không phải doanh thu" },
  { id: "p8", date: "2026-06-06", name: "Nhận giải ngân vay", space: "Khoản vay", source: "VCB", amount: 100_000_000, kind: "loan_disbursement", status: "active", note: "Tăng tiền mặt và tăng dư nợ, không phải thu nhập" },
  { id: "p9", date: "2026-06-06", name: "Trả lãi vay", space: "Khoản vay", source: "VCB", amount: 2_300_000, kind: "loan_interest", status: "active", note: "Chỉ phần lãi/phí là chi phí tài chính", countsAsExpense: true },
  { id: "p10", date: "2026-06-06", name: "Trả gốc vay", space: "Khoản vay", source: "VCB", amount: 8_000_000, kind: "loan_principal", status: "active", note: "Giảm dư nợ, không phải chi tiêu sinh hoạt" },
  { id: "p11", date: "2026-06-07", name: "Mua laptop bằng thẻ tín dụng", space: "Cá nhân", source: "Thẻ VCB", amount: 20_000_000, kind: "credit_card_spend", status: "active", note: "Tăng chi tiêu và tăng nợ thẻ", countsAsExpense: true },
  { id: "p12", date: "2026-06-07", name: "Thanh toán nợ thẻ", space: "Khoản vay", source: "VCB -> Thẻ VCB", amount: 20_000_000, kind: "credit_card_payment", status: "active", note: "Giảm tiền mặt và giảm nợ thẻ, không tính chi tiêu lần hai" },
  { id: "p13", date: "2026-06-07", name: "Phí thẻ tín dụng", space: "Khoản vay", source: "VCB", amount: 500_000, kind: "loan_interest", status: "active", note: "Phí/lãi/phạt thẻ là chi phí tài chính", countsAsExpense: true },
  { id: "p14", date: "2026-06-07", name: "Lãi tiết kiệm nhận về cá nhân", space: "Tiết kiệm", source: "Ngân hàng -> VCB", amount: 1_200_000, kind: "savings_interest", status: "active", note: "Lãi tiết kiệm là thu nhập tài chính", countsAsIncome: true },
  { id: "p15", date: "2026-06-07", name: "Giao dịch nhập sai đã hủy", space: "Cá nhân", source: "VCB", amount: 99_000_000, kind: "income", status: "cancelled", note: "Đã hủy nên không tính vào báo cáo", countsAsIncome: true },
];

export const businessSpaces: BusinessSpace[] = [
  {
    id: "coffee", name: "Quán cafe", type: "Ăn uống", status: "active", cash: 48_500_000, capital: 30_000_000, retainedProfit: 10_000_000, withdrawnToPersonal: 10_000_000, revenue: 80_000_000, expenses: 60_000_000, receivable: 12_000_000, payable: 7_000_000,
    chart: [{ m: "T1", r: 52, e: 39 }, { m: "T2", r: 56, e: 42 }, { m: "T3", r: 60, e: 46 }, { m: "T4", r: 66, e: 49 }, { m: "T5", r: 74, e: 55 }, { m: "T6", r: 80, e: 60 }],
    transactions: [
      { id: "b1", date: "2026-06-01", name: "Góp vốn từ cá nhân", space: "Kinh doanh", source: "VCB", amount: 30_000_000, kind: "transfer", status: "active", note: "Không phải doanh thu" },
      { id: "b2", date: "2026-06-05", name: "Doanh thu bán hàng", space: "Kinh doanh", source: "Quán cafe", amount: 80_000_000, kind: "income", status: "active", note: "Doanh thu thực tế", countsAsIncome: true },
      { id: "b3", date: "2026-06-06", name: "Chi phí nguyên liệu", space: "Kinh doanh", source: "Quán cafe", amount: 30_000_000, kind: "expense", status: "active", note: "Chi phí kinh doanh", countsAsExpense: true },
      { id: "b4", date: "2026-06-07", name: "Rút lợi nhuận về cá nhân", space: "Kinh doanh", source: "Quán cafe -> VCB", amount: 10_000_000, kind: "transfer", status: "active", note: "Không phải chi phí kinh doanh" },
    ],
  },
  { id: "store1", name: "Cửa hàng 1", type: "Bán lẻ", status: "active", cash: 34_200_000, capital: 14_700_000, retainedProfit: 19_500_000, withdrawnToPersonal: 0, revenue: 82_000_000, expenses: 62_500_000, receivable: 8_500_000, payable: 12_000_000, chart: [{ m: "T1", r: 72, e: 54 }, { m: "T2", r: 75, e: 57 }, { m: "T3", r: 78, e: 59 }, { m: "T4", r: 80, e: 61 }, { m: "T5", r: 85, e: 64 }, { m: "T6", r: 82, e: 62.5 }], transactions: [] },
  { id: "project", name: "Dự án riêng", type: "Dịch vụ", status: "active", cash: 16_700_000, capital: 0, retainedProfit: 17_000_000, withdrawnToPersonal: 0, revenue: 38_000_000, expenses: 21_000_000, receivable: 5_000_000, payable: 3_500_000, chart: [{ m: "T1", r: 22, e: 15 }, { m: "T2", r: 25, e: 17 }, { m: "T3", r: 28, e: 18 }, { m: "T4", r: 32, e: 20 }, { m: "T5", r: 35, e: 20 }, { m: "T6", r: 38, e: 21 }], transactions: [] },
];

export const investmentCash = 35_000_000;
export const investmentHoldings: InvestmentHolding[] = [
  { id: "fpt", code: "FPT", name: "Cổ phiếu FPT", type: "Cổ phiếu", quantity: 70, avgCost: 123_567, remainingCapital: 8_649_666, realizedPL: 1_294_667, status: "holding", buyHistory: [{ date: "2026-06-01", quantity: 100, price: 120_000, fee: 20_000 }, { date: "2026-06-04", quantity: 50, price: 130_000, fee: 15_000 }], sellHistory: [{ date: "2026-06-06", quantity: 80, price: 140_000, fee: 20_000, realizedPL: 1_294_667, note: "Bán một phần" }] },
  { id: "sjc", code: "SJC", name: "Vàng SJC", type: "Vàng", quantity: 2, avgCost: 90_000_000, remainingCapital: 180_000_000, realizedPL: 0, status: "holding", buyHistory: [{ date: "2026-05-15", quantity: 2, price: 90_000_000, fee: 0 }], sellHistory: [] },
  { id: "btc", code: "BTC", name: "Bitcoin", type: "Crypto", quantity: 0, avgCost: 0, remainingCapital: 0, realizedPL: 12_000_000, status: "sold", buyHistory: [{ date: "2026-04-01", quantity: 1, price: 100_000_000, fee: 0 }], sellHistory: [{ date: "2026-05-10", quantity: 1, price: 112_000_000, fee: 0, realizedPL: 12_000_000, note: "Bán toàn bộ" }] },
];

export const savingGoals: SavingGoal[] = [
  { id: "emergency", name: "Quỹ khẩn cấp", target: 60_000_000, current: 45_000_000, monthly: 2_500_000, start: "2026-01-01", due: "2026-12-31", status: "active" },
  { id: "car", name: "Mua xe", target: 80_000_000, current: 38_000_000, monthly: 5_000_000, start: "2026-02-01", due: "2026-09-30", status: "active" },
  { id: "travel", name: "Du lịch", target: 60_000_000, current: 60_000_000, monthly: 0, start: "2026-03-01", due: "2026-08-31", status: "completed" },
];
export const unallocatedSavings = 0;

export const interestSavings: InterestSaving[] = [
  { id: "vpbank-6m", name: "VPBank 6 tháng", bank: "VPBank", principal: 80_000_000, annualRate: 5.9, start: "2026-03-01", maturity: "2026-09-01", termMonths: 6, expectedInterest: 2_350_000, allowTopUp: false, status: "active" },
  { id: "tcb-12m", name: "Techcombank 12 tháng", bank: "Techcombank", principal: 100_000_000, annualRate: 6.2, start: "2026-01-15", maturity: "2027-01-15", termMonths: 12, expectedInterest: 6_200_000, allowTopUp: true, status: "active" },
  { id: "old-saving", name: "Sổ tiết kiệm đã tất toán", bank: "VCB", principal: 0, annualRate: 5.4, start: "2025-07-01", maturity: "2026-01-01", termMonths: 6, expectedInterest: 1_200_000, allowTopUp: false, status: "settled" },
];

export const loans: Loan[] = [
  { id: "home", name: "Vay mua nhà", type: "Vay ngân hàng", original: 800_000_000, outstanding: 220_000_000, rate: 8.5, monthly: 8_500_000, nextDue: "2026-06-15", bank: "VCB", status: "active", paidInterest: 24_000_000, history: [{ date: "2026-05-15", total: 8_500_000, principal: 6_000_000, interest: 2_500_000 }] },
  { id: "bizloan", name: "Vay kinh doanh", type: "Vay kinh doanh", original: 100_000_000, outstanding: 80_000_000, rate: 9.5, monthly: 5_000_000, nextDue: "2026-06-08", bank: "VCB", status: "dueSoon", paidInterest: 7_500_000, history: [{ date: "2026-05-08", total: 5_000_000, principal: 2_400_000, interest: 2_600_000 }] },
  { id: "settled", name: "Vay mua xe đã tất toán", type: "Vay ngân hàng", original: 350_000_000, outstanding: 0, rate: 7.2, monthly: 0, nextDue: "2026-01-01", bank: "Techcombank", status: "settled", paidInterest: 36_000_000, history: [] },
];

export const creditCards: CreditCardDebt[] = [
  { id: "vcb-card", name: "Thẻ tín dụng VCB", bank: "VCB", limit: 50_000_000, used: 8_500_000, statementDate: "2026-06-25", dueDate: "2026-07-10", color: "#006E33", last4: "4829", status: "active" },
  { id: "tcb-card", name: "Thẻ tín dụng Techcombank", bank: "Techcombank", limit: 80_000_000, used: 0, statementDate: "2026-06-28", dueDate: "2026-07-15", color: "#B22222", last4: "7741", status: "active" },
];

const validTx = (tx: CashflowTransaction) => tx.status !== "cancelled";
const activeObject = (status: Status | string) => !["hidden", "closed", "settled", "cancelled"].includes(status);

export function sum(list: number[]) {
  return list.reduce((s, n) => s + n, 0);
}

export function formatVnd(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)} tỷ`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} triệu`;
  return `${sign}${abs.toLocaleString("vi-VN")} đ`;
}

export function formatMoney(n: number) {
  return `${n.toLocaleString("vi-VN")} đ`;
}

export const metrics = (() => {
  const validPersonal = personalTransactions.filter(validTx);
  const activeAccounts = personalAccounts.filter((a) => activeObject(a.status));
  const activeBusinesses = businessSpaces.filter((b) => activeObject(b.status));
  const activeLoans = loans.filter((l) => l.status !== "settled" && l.status !== "closed");
  const activeCards = creditCards.filter((c) => activeObject(c.status));
  const activeGoals = savingGoals.filter((g) => g.status !== "hidden" && g.status !== "closed");
  const activeInterestSavings = interestSavings.filter((s) => activeObject(s.status));
  const activeInvestments = investmentHoldings.filter((h) => h.status === "holding");

  const personalBalance = sum(activeAccounts.map((a) => a.balance));
  const personalIncome = sum(validPersonal.filter((t) => t.countsAsIncome).map((t) => t.amount));
  const personalExpenses = sum(validPersonal.filter((t) => t.countsAsExpense).map((t) => t.amount));
  const financialCosts = sum(validPersonal.filter((t) => t.kind === "loan_interest").map((t) => t.amount));
  const businessCash = sum(activeBusinesses.map((b) => b.cash));
  const businessReceivable = sum(activeBusinesses.map((b) => b.receivable));
  const businessPayable = sum(activeBusinesses.map((b) => b.payable));
  const businessCapital = sum(activeBusinesses.map((b) => b.capital));
  const businessRetainedProfit = sum(activeBusinesses.map((b) => b.retainedProfit));
  const businessWithdrawnToPersonal = sum(activeBusinesses.map((b) => b.withdrawnToPersonal));
  const businessValue = businessCash + businessReceivable - businessPayable;
  const businessRevenue = sum(activeBusinesses.map((b) => b.revenue));
  const businessExpenses = sum(activeBusinesses.map((b) => b.expenses));
  const businessProfit = businessRevenue - businessExpenses;
  const investedCapital = sum(activeInvestments.map((h) => h.remainingCapital));
  const realizedPL = sum(investmentHoldings.map((h) => h.realizedPL));
  const investmentTotal = investmentCash + investedCapital;
  const savingsTargetTotal = sum(activeGoals.map((g) => g.current));
  const interestSavingsPrincipal = sum(activeInterestSavings.map((s) => s.principal));
  const interestSavingsExpectedInterest = sum(activeInterestSavings.map((s) => s.expectedInterest));
  const savingsTotal = savingsTargetTotal + interestSavingsPrincipal + unallocatedSavings;
  const loanDebt = sum(activeLoans.map((l) => l.outstanding));
  const creditCardDebt = sum(activeCards.map((c) => c.used));
  const totalAssets = personalBalance + businessValue + investmentTotal + savingsTotal;
  const totalDebt = loanDebt + creditCardDebt;
  const netWorth = totalAssets - totalDebt;
  const monthlyCashflow = personalIncome - personalExpenses;

  return {
    personalBalance,
    personalIncome,
    personalExpenses,
    financialCosts,
    activeAccountCount: activeAccounts.length,
    businessCash,
    businessReceivable,
    businessPayable,
    businessCapital,
    businessRetainedProfit,
    businessWithdrawnToPersonal,
    businessValue,
    businessRevenue,
    businessExpenses,
    businessProfit,
    investmentCash,
    investedCapital,
    activeHoldingCount: activeInvestments.length,
    realizedPL,
    investmentFinancialIncome: Math.max(0, realizedPL),
    investmentTotal,
    savingsTotal,
    savingsTargetTotal,
    interestSavingsPrincipal,
    interestSavingsExpectedInterest,
    savingsActiveGoals: activeGoals.filter((g) => g.status === "active").length,
    savingsCompletedGoals: activeGoals.filter((g) => g.status === "completed").length,
    unallocatedSavings,
    loanDebt,
    creditCardDebt,
    totalAssets,
    totalDebt,
    netWorth,
    monthlyCashflow,
  };
})();

export const assetAllocation = [
  { name: "Cá nhân", value: metrics.personalBalance, color: "#111111" },
  { name: "Kinh doanh", value: metrics.businessValue, color: "#B22222" },
  { name: "Đầu tư", value: metrics.investmentTotal, color: "#7C2D12" },
  { name: "Tiết kiệm", value: metrics.savingsTotal, color: "#166534" },
];

export const ruleCards = [
  "Chuyển tiền nội bộ không tính thu nhập/chi tiêu và không đổi tài sản ròng.",
  "Giải ngân vay tăng tiền mặt và tăng dư nợ, không phải thu nhập.",
  "Trả gốc vay chỉ giảm dư nợ; lãi/phí/phạt mới là chi phí tài chính.",
  "Mua đầu tư không phải chi tiêu; chỉ khi bán mới ghi nhận lãi/lỗ đã chốt.",
  "Giao dịch đã hủy không được tính vào dashboard và báo cáo.",
];

export const recentTransactions = [...personalTransactions, ...businessSpaces.flatMap((b) => b.transactions)]
  .filter(validTx)
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 10);








