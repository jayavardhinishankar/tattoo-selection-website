import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fetches data when mounted / when deps change, then keeps it fresh:
 *  - polls every `interval` ms while the tab is visible
 *  - refetches when the tab becomes visible again
 *  - exposes refresh() for an immediate reload
 * A failed background poll keeps the last good data instead of blanking the page.
 */
export default function usePolling(fetcher, deps = [], interval = 15000) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const loadRef = useRef(() => {});

  useEffect(() => {
    let cancelled = false;

    const load = async (initial) => {
      try {
        const data = await fetcherRef.current();
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        if (initial) setState({ data: null, loading: false, error });
        // background failure: keep what we already show
      }
    };

    loadRef.current = () => load(false);
    setState({ data: null, loading: true, error: null });
    load(true);

    const timer = setInterval(() => {
      if (!document.hidden) load(false);
    }, interval);
    const onVisible = () => {
      if (!document.hidden) load(false);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refresh = useCallback(() => loadRef.current(), []);
  return { ...state, refresh };
}
