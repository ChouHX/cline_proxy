import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface RefreshContextValue {
  /** 每次全局刷新递增；页面把它放进依赖数组即可被动重载 */
  token: number;
  refresh: () => void;
}

const RefreshContext = createContext<RefreshContextValue>({ token: 0, refresh: () => {} });

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(0);
  const refresh = useCallback(() => setToken((t) => t + 1), []);
  const value = useMemo(() => ({ token, refresh }), [token, refresh]);
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

export const useRefresh = () => useContext(RefreshContext);
