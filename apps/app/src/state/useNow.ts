import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Current time as React state, refreshed every `tickMs` and when the app
 * returns to the foreground. Screens pass it to the pure selectors from
 * @itera/core so renders stay pure (no Date.now() during render).
 */
export function useNow(tickMs = 30_000): [number, () => void] {
  const [now, setNow] = useState(() => Date.now());
  const refresh = useCallback(() => setNow(Date.now()), []);
  useEffect(() => {
    const id = setInterval(refresh, tickMs);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [tickMs, refresh]);
  return [now, refresh];
}
