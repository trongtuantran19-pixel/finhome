export const FINHOME_STORAGE_EVENT = "finhome:data-changed";
export const FINHOME_EMPTY_MODE_KEY = "finhome.emptyMode.v1";

export const finhomeStorageKeys = {
  personalAccounts: "finhome.personal.accounts.v1",
  personalTransactions: "finhome.personal.extraTransactions.v1",
  personalCancelledTransactions: "finhome.personal.cancelledTxIds.v1",
  personalCards: "finhome.personal.cards.v1",
  businessSpaces: "finhome.business.spaces.v1",
  loans: "finhome.loans.items.v1",
  savingsGoals: "finhome.savings.goals.v1",
  savingsInterest: "finhome.savings.interest.v1",
  investmentCash: "finhome.investment.cash.v1",
  investmentHoldings: "finhome.investment.holdings.v1",
} as const;

let notifyQueued = false;

export function isFinhomeEmptyMode() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(FINHOME_EMPTY_MODE_KEY) === "1" || new URLSearchParams(window.location.search).has("empty");
}

export function notifyFinhomeDataChanged() {
  if (typeof window === "undefined") return;
  if (notifyQueued) return;
  notifyQueued = true;

  const dispatch = () => {
    notifyQueued = false;
    window.dispatchEvent(new CustomEvent(FINHOME_STORAGE_EVENT));
  };

  if (typeof window.queueMicrotask === "function") {
    window.queueMicrotask(dispatch);
    return;
  }

  window.setTimeout(dispatch, 0);
}

export function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
    if (isFinhomeEmptyMode() && Array.isArray(fallback)) return [] as T;
    return fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  if (key.startsWith("finhome.")) notifyFinhomeDataChanged();
}

export function readStoredNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return isFinhomeEmptyMode() ? 0 : fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function writeStoredNumber(key: string, value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(value));
  if (key.startsWith("finhome.")) notifyFinhomeDataChanged();
}

export function appendStoredItem<T>(key: string, item: T) {
  const current = readStoredJson<T[]>(key, []);
  writeStoredJson(key, [item, ...current]);
}


export function resetFinhomeTestData() {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(FINHOME_EMPTY_MODE_KEY, "1");
  writeStoredJson(finhomeStorageKeys.personalAccounts, []);
  writeStoredJson(finhomeStorageKeys.personalTransactions, []);
  writeStoredJson(finhomeStorageKeys.personalCancelledTransactions, []);
  writeStoredJson(finhomeStorageKeys.personalCards, []);
  writeStoredJson(finhomeStorageKeys.businessSpaces, []);
  writeStoredJson(finhomeStorageKeys.loans, []);
  writeStoredJson(finhomeStorageKeys.savingsGoals, []);
  writeStoredJson(finhomeStorageKeys.savingsInterest, []);
  writeStoredNumber(finhomeStorageKeys.investmentCash, 0);
  writeStoredJson(finhomeStorageKeys.investmentHoldings, []);
  notifyFinhomeDataChanged();
}
