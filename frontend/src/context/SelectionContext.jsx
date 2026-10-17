import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'tattoo-selection-v1';
const SelectionContext = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const snapshot = (t) => ({
  _id: t._id,
  tattooNumber: t.tattooNumber,
  name: t.name,
  price: t.price,
  imageUrl: t.imageUrl,
  categoryName: t.categoryId?.name || t.categoryName || '',
  unavailable: false,
});

export function SelectionProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage full or blocked - selection still works for this session */
    }
  }, [items]);

  // keep several open tabs in sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setItems(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const has = useCallback((id) => items.some((i) => i._id === id), [items]);

  const add = useCallback((t) => {
    setItems((prev) => (prev.some((i) => i._id === t._id) ? prev : [...prev, snapshot(t)]));
  }, []);

  const remove = useCallback((id) => setItems((prev) => prev.filter((i) => i._id !== id)), []);

  const toggle = useCallback((t) => {
    setItems((prev) =>
      prev.some((i) => i._id === t._id) ? prev.filter((i) => i._id !== t._id) : [...prev, snapshot(t)]
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  /**
   * results: array aligned with `ids`; each entry is a fresh tattoo, null (no longer
   * available - deleted/deactivated) or undefined (could not check, leave untouched).
   * Keeps the saved selection accurate when the admin changes prices or removes a tattoo.
   */
  const applySync = useCallback((ids, results) => {
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const idx = ids.indexOf(item._id);
        if (idx === -1) return item;
        const fresh = results[idx];
        if (fresh === undefined) return item;
        if (fresh === null) {
          if (item.unavailable) return item;
          changed = true;
          return { ...item, unavailable: true };
        }
        const updated = snapshot(fresh);
        if (JSON.stringify(updated) !== JSON.stringify(item)) changed = true;
        return updated;
      });
      return changed ? next : prev;
    });
  }, []);

  const value = useMemo(() => {
    const available = items.filter((i) => !i.unavailable);
    return {
      items,
      count: available.length,
      total: available.reduce((sum, i) => sum + Number(i.price || 0), 0),
      has,
      add,
      remove,
      toggle,
      clear,
      applySync,
    };
  }, [items, has, add, remove, toggle, clear, applySync]);

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export const useSelection = () => useContext(SelectionContext);
