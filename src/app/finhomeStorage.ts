export const FINHOME_STORAGE_EVENT = "finhome:data-changed";

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
    return raw ? JSON.parse(raw) as T : fallback;
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
  if (raw === null) return fallback;
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
