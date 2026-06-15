import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { FINHOME_STORAGE_EVENT, notifyFinhomeDataChanged } from "./finhomeStorage";

type FinHomeStoreContextValue = {
  dataVersion: number;
  notifyDataChanged: () => void;
};

const FinHomeStoreContext = createContext<FinHomeStoreContextValue | null>(null);

function patchLocalStorage() {
  if (typeof window === "undefined") return () => {};

  const storage = window.localStorage;
  const current = storage as Storage & { __finhomePatched?: boolean };
  if (current.__finhomePatched) return () => {};

  const originalSetItem = storage.setItem.bind(storage);
  const originalRemoveItem = storage.removeItem.bind(storage);
  const originalClear = storage.clear.bind(storage);

  current.__finhomePatched = true;

  storage.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if (key.startsWith("finhome.")) notifyFinhomeDataChanged();
  };

  storage.removeItem = (key: string) => {
    originalRemoveItem(key);
    if (key.startsWith("finhome.")) notifyFinhomeDataChanged();
  };

  storage.clear = () => {
    originalClear();
    notifyFinhomeDataChanged();
  };

  return () => {
    storage.setItem = originalSetItem;
    storage.removeItem = originalRemoveItem;
    storage.clear = originalClear;
    delete current.__finhomePatched;
  };
}

export function FinHomeStoreProvider({ children }: { children: ReactNode }) {
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const unpatch = patchLocalStorage();
    const refresh = () => setDataVersion((version) => version + 1);
    const refreshFromStorageEvent = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith("finhome.")) refresh();
    };

    window.addEventListener(FINHOME_STORAGE_EVENT, refresh);
    window.addEventListener("storage", refreshFromStorageEvent);

    return () => {
      window.removeEventListener(FINHOME_STORAGE_EVENT, refresh);
      window.removeEventListener("storage", refreshFromStorageEvent);
      unpatch();
    };
  }, []);

  const value = useMemo(
    () => ({
      dataVersion,
      notifyDataChanged: notifyFinhomeDataChanged,
    }),
    [dataVersion],
  );

  return <FinHomeStoreContext.Provider value={value}>{children}</FinHomeStoreContext.Provider>;
}

export function useFinHomeStore() {
  const context = useContext(FinHomeStoreContext);
  if (!context) {
    throw new Error("useFinHomeStore must be used inside FinHomeStoreProvider");
  }
  return context;
}
